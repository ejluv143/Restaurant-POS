import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  foreignKey,
  index,
  integer,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Normalized (3NF) schema for QR table ordering across restaurants and branches.
// Money is stored as integer cents. Order lines snapshot the price paid, so menu price
// changes never rewrite history; everything else (totals, table occupancy) is derived.

// Everything lives in its own "pos" schema so it can share a database (e.g. Supabase) with the
// Laravel backend's tables in "public" without name clashes (both have a "users" table).
export const pos = pgSchema("pos");

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ─── Enums ──────────────────────────────────────────────────────────────────

// Customers are anonymous: they're identified by the table QR they scanned (table_sessions), not an account.
export const staffRole = pos.enum("staff_role", ["cashier", "kitchen", "branch_manager", "restaurant_admin", "system_admin"]);
// submitted (pending) → confirmed (kitchen accepted) → preparing → ready → served → completed (bill settled)
export const orderStatus = pos.enum("order_status", ["submitted", "preparing", "ready", "served", "cancelled", "confirmed", "completed"]);
export const serviceRequestType = pos.enum("service_request_type", ["call_server", "water_cutlery", "request_bill", "sommelier", "napkins"]);
export const serviceRequestStatus = pos.enum("service_request_status", ["open", "acknowledged", "resolved"]);
export const paymentMethod = pos.enum("payment_method", ["cash", "card", "e_wallet", "online"]);
export const paymentStatus = pos.enum("payment_status", ["pending", "paid", "failed", "expired", "refunded", "cancelled"]);
// Manual table states on top of the ones derived from orders (available / ordering / preparing / ready / serving)
export const tableHold = pos.enum("table_hold", ["cleaning", "reserved"]);

// ─── Organization ───────────────────────────────────────────────────────────

export const restaurants = pos.table("restaurants", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // Suspended by a system admin: its staff can't sign in and its QR codes stop working
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

export const branches = pos.table(
  "branches",
  {
    id: id(),
    restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    currency: char("currency", { length: 3 }).notNull().default("USD"),
    // Service charge + tax in basis points (1000 = 10%)
    taxRateBp: integer("tax_rate_bp").notNull().default(0),
    wifiSsid: text("wifi_ssid"),
    wifiPassword: text("wifi_password"),
    // Payment methods guests may choose; online also needs the platform's PayMongo keys
    cashPaymentsEnabled: boolean("cash_payments_enabled").notNull().default(true),
    onlinePaymentsEnabled: boolean("online_payments_enabled").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.restaurantId, t.code), check("tax_rate_range", sql`${t.taxRateBp} between 0 and 10000`)],
);

// ─── Staff & access ─────────────────────────────────────────────────────────

export const users = pos.table(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    role: staffRole("role").notNull(),
    // Null only for system admins, who operate across every restaurant
    restaurantId: uuid("restaurant_id").references(() => restaurants.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    // Set when an admin issues a temporary password; the user must choose a new one after signing in
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`),
    check("restaurant_scope", sql`(${t.role} = 'system_admin') = (${t.restaurantId} is null)`),
  ],
);

// Which branches a cashier / kitchen / branch manager works at (restaurant admins see all branches)
export const branchStaff = pos.table(
  "branch_staff",
  {
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.userId] })],
);

// Signed-in staff devices. The browser cookie holds a random token; only its SHA-256 is stored,
// so a leaked table dump can't be replayed as a live session.
export const authSessions = pos.table(
  "auth_sessions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("auth_sessions_user_idx").on(t.userId)],
);

// Every sign-in attempt, keyed by the email typed (not the user id) so throttling works the same
// for unknown accounts and never reveals which emails exist
export const loginAttempts = pos.table(
  "login_attempts",
  {
    id: id(),
    email: text("email").notNull(),
    ipAddress: text("ip_address"),
    succeeded: boolean("succeeded").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("login_attempts_email_idx").on(t.email, t.createdAt), index("login_attempts_ip_idx").on(t.ipAddress, t.createdAt)],
);

// ─── Floor ──────────────────────────────────────────────────────────────────

export const zones = pos.table(
  "zones",
  {
    id: id(),
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [unique().on(t.branchId, t.name), unique("zones_branch_id_id_key").on(t.branchId, t.id)],
);

export const diningTables = pos.table(
  "dining_tables",
  {
    id: id(),
    branchId: uuid("branch_id").notNull(),
    zoneId: uuid("zone_id").notNull(),
    number: text("number").notNull(),
    seats: smallint("seats").notNull().default(2),
    // Opaque token printed in the table's QR code; unguessable so guests can't order to other tables.
    // Regenerating it invalidates printed stands immediately.
    qrToken: text("qr_token").notNull().unique(),
    hold: tableHold("hold"),
    // Inactive = out of service: hidden from the floor and its QR code stops working
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    unique().on(t.branchId, t.number),
    // Composite FK guarantees the zone belongs to the same branch as the table
    foreignKey({ columns: [t.branchId, t.zoneId], foreignColumns: [zones.branchId, zones.id] }).onDelete("restrict"),
    check("seats_positive", sql`${t.seats} > 0`),
  ],
);

// ─── Menu ───────────────────────────────────────────────────────────────────

export const menuCategories = pos.table(
  "menu_categories",
  {
    id: id(),
    restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [unique().on(t.restaurantId, t.slug)],
);

export const kitchenStations = pos.table(
  "kitchen_stations",
  {
    id: id(),
    restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (t) => [unique().on(t.restaurantId, t.name)],
);

export const menuItems = pos.table(
  "menu_items",
  {
    id: id(),
    categoryId: uuid("category_id").notNull().references(() => menuCategories.id, { onDelete: "restrict" }),
    stationId: uuid("station_id").references(() => kitchenStations.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    imageUrl: text("image_url"),
    prepMinutes: smallint("prep_minutes"),
    // Short merchandising label shown on the photo, e.g. "Popular", "Raw Bar"
    highlightLabel: text("highlight_label"),
    isSignature: boolean("is_signature").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [unique().on(t.categoryId, t.name), check("price_non_negative", sql`${t.priceCents} >= 0`)],
);

export const dietaryTags = pos.table("dietary_tags", {
  id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
});

export const menuItemDietaryTags = pos.table(
  "menu_item_dietary_tags",
  {
    menuItemId: uuid("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
    tagId: smallint("tag_id").notNull().references(() => dietaryTags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.menuItemId, t.tagId] })],
);

// Per-branch "86" list: an item is available unless its branch has marked it otherwise
export const branchMenuAvailability = pos.table(
  "branch_menu_availability",
  {
    branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
    isAvailable: boolean("is_available").notNull(),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.menuItemId] })],
);

export const modifierGroups = pos.table(
  "modifier_groups",
  {
    id: id(),
    restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    minSelect: smallint("min_select").notNull().default(0),
    maxSelect: smallint("max_select").notNull().default(1),
  },
  (t) => [unique().on(t.restaurantId, t.name), check("select_range", sql`${t.minSelect} >= 0 and ${t.maxSelect} >= greatest(${t.minSelect}, 1)`)],
);

export const modifierOptions = pos.table(
  "modifier_options",
  {
    id: id(),
    groupId: uuid("group_id").notNull().references(() => modifierGroups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceDeltaCents: integer("price_delta_cents").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [unique().on(t.groupId, t.name)],
);

export const menuItemModifierGroups = pos.table(
  "menu_item_modifier_groups",
  {
    menuItemId: uuid("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").notNull().references(() => modifierGroups.id, { onDelete: "cascade" }),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.menuItemId, t.groupId] })],
);

// ─── Dining & orders ────────────────────────────────────────────────────────

// One seating of customers at a table, from first order until the cashier closes the bill
export const tableSessions = pos.table(
  "table_sessions",
  {
    id: id(),
    tableId: uuid("table_id").notNull().references(() => diningTables.id, { onDelete: "restrict" }),
    guestCount: smallint("guest_count").notNull().default(1),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    // At most one open session per table; a table is "occupied" exactly when this row exists
    uniqueIndex("table_sessions_one_open_idx").on(t.tableId).where(sql`${t.closedAt} is null`),
    check("guest_count_positive", sql`${t.guestCount} > 0`),
  ],
);

export const orders = pos.table(
  "orders",
  {
    id: id(),
    ticketNumber: integer("ticket_number").notNull().generatedAlwaysAsIdentity({ startWith: 1001 }),
    sessionId: uuid("session_id").notNull().references(() => tableSessions.id, { onDelete: "restrict" }),
    status: orderStatus("status").notNull().default("submitted"),
    note: text("note"),
    // Why the kitchen rejected / a manager cancelled it; shown to the guest
    cancelReason: text("cancel_reason"),
    // Snapshot of the branch rate when the order was placed
    taxRateBp: integer("tax_rate_bp").notNull(),
    // Null when the customer placed it via QR; set when staff key it in
    placedBy: uuid("placed_by").references(() => users.id, { onDelete: "set null" }),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.ticketNumber), index("orders_session_idx").on(t.sessionId), index("orders_status_idx").on(t.status)],
);

export const orderItems = pos.table(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    // Position on the ticket, in the order the guest added the dishes
    lineNo: smallint("line_no").notNull(),
    menuItemId: uuid("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "restrict" }),
    quantity: smallint("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    note: text("note"),
  },
  (t) => [unique().on(t.orderId, t.lineNo), check("quantity_range", sql`${t.quantity} between 1 and 50`)],
);

export const orderItemModifiers = pos.table(
  "order_item_modifiers",
  {
    orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
    modifierOptionId: uuid("modifier_option_id").notNull().references(() => modifierOptions.id, { onDelete: "restrict" }),
    priceDeltaCents: integer("price_delta_cents").notNull(),
  },
  (t) => [primaryKey({ columns: [t.orderItemId, t.modifierOptionId] })],
);

// Kitchen / floor audit trail: who moved an order to which status, and when
export const orderStatusEvents = pos.table(
  "order_status_events",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatus("status").notNull(),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_status_events_order_idx").on(t.orderId)],
);

export const serviceRequests = pos.table(
  "service_requests",
  {
    id: id(),
    sessionId: uuid("session_id").notNull().references(() => tableSessions.id, { onDelete: "cascade" }),
    type: serviceRequestType("type").notNull(),
    status: serviceRequestStatus("status").notNull().default("open"),
    createdAt: createdAt(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    index("service_requests_open_idx").on(t.status).where(sql`${t.status} <> 'resolved'`),
    // Rapid double taps can't raise the same call twice
    uniqueIndex("service_requests_one_open_idx").on(t.sessionId, t.type).where(sql`${t.status} <> 'resolved'`),
  ],
);

// A payment against a table's bill. Online payments start "pending" with the gateway's checkout id and
// become "paid" only after the server re-checks the gateway. Card numbers never touch this system.
export const payments = pos.table(
  "payments",
  {
    id: id(),
    sessionId: uuid("session_id").notNull().references(() => tableSessions.id, { onDelete: "restrict" }),
    method: paymentMethod("method").notNull(),
    status: paymentStatus("status").notNull().default("paid"),
    amountCents: integer("amount_cents").notNull(),
    tipCents: integer("tip_cents").notNull().default(0),
    // Cash: what the guest handed over (change = tendered - amount)
    tenderedCents: integer("tendered_cents"),
    provider: text("provider"),
    // Gateway checkout/session id, unique so a replayed webhook can't double-count
    providerRef: text("provider_ref").unique(),
    // e.g. gcash, paymaya, card
    channel: text("channel"),
    referenceNumber: text("reference_number"),
    receivedBy: uuid("received_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    index("payments_session_idx").on(t.sessionId),
    index("payments_paid_at_idx").on(t.paidAt),
    check("amounts_non_negative", sql`${t.amountCents} > 0 and ${t.tipCents} >= 0`),
  ],
);

// One rating per table visit, left by the guest after eating
export const feedback = pos.table(
  "feedback",
  {
    id: id(),
    sessionId: uuid("session_id").notNull().unique().references(() => tableSessions.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    comment: text("comment"),
    createdAt: createdAt(),
  },
  (t) => [check("rating_range", sql`${t.rating} between 1 and 5`)],
);

// Who did what, for accountability. Written by staff actions; never updated or deleted by the app.
export const auditLogs = pos.table(
  "audit_logs",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    // Denormalized so the trail survives user renames/deletes
    actorName: text("actor_name"),
    actorRole: staffRole("actor_role"),
    restaurantId: uuid("restaurant_id").references(() => restaurants.id, { onDelete: "set null" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    details: text("details"),
    ipAddress: text("ip_address"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_restaurant_idx").on(t.restaurantId, t.createdAt)],
);
