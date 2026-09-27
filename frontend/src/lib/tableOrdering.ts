import "server-only";
import { and, asc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { connection } from "next/server";
import { cache } from "react";
import { getDb, schema as s } from "@/db";
import { createOnlineCheckout, onlinePaymentsConfigured, verifyPendingOnlinePayments } from "@/lib/payments";
import {
  LIMITS,
  billFor,
  totals,
  unitPrice,
  type MenuItemDto,
  type ModifierGroupDto,
  type PaymentDto,
  type PlaceOrderRequest,
  type PlacedOrderDto,
  type ServiceRequestType,
  type TableInfoDto,
  type TableMenuDto,
  type TableStatusDto,
} from "./tableOrder";

// Server-only: QR table ordering backed by PostgreSQL. A table's QR token is the guest's only
// credential, and it only ever reaches the table's *current* open session.

export class OrderError extends Error {}

const TOKEN_RE = /^[A-Za-z0-9_-]{8,64}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_BURST = { max: 5, windowSeconds: 120 };

const tableColumns = {
  id: s.diningTables.id,
  number: s.diningTables.number,
  seats: s.diningTables.seats,
  zone: s.zones.name,
  zoneDescription: s.zones.description,
  branchId: s.branches.id,
  branch: s.branches.name,
  restaurantId: s.restaurants.id,
  restaurant: s.restaurants.name,
  currency: s.branches.currency,
  taxRateBp: s.branches.taxRateBp,
  wifiSsid: s.branches.wifiSsid,
  wifiPassword: s.branches.wifiPassword,
  cashPaymentsEnabled: s.branches.cashPaymentsEnabled,
  onlinePaymentsEnabled: s.branches.onlinePaymentsEnabled,
};

function tableQuery() {
  return getDb()
    .select(tableColumns)
    .from(s.diningTables)
    .innerJoin(s.zones, eq(s.zones.id, s.diningTables.zoneId))
    .innerJoin(s.branches, eq(s.branches.id, s.diningTables.branchId))
    .innerJoin(s.restaurants, eq(s.restaurants.id, s.branches.restaurantId));
}

const liveTable = and(eq(s.diningTables.isActive, true), eq(s.branches.isActive, true), eq(s.restaurants.isActive, true));

export async function findTable(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  const [row] = await tableQuery().where(and(eq(s.diningTables.qrToken, token), liveTable));
  return row ?? null;
}

/** A table by id, for staff placing orders (the caller checks branch access). */
export async function findTableById(id: string) {
  if (!UUID_RE.test(id)) return null;
  const [row] = await tableQuery().where(and(eq(s.diningTables.id, id), liveTable));
  return row ?? null;
}

export type Table = NonNullable<Awaited<ReturnType<typeof findTable>>>;

async function requireTable(token: string): Promise<Table> {
  const table = await findTable(token);
  if (!table) throw new OrderError("This table's QR code is no longer valid. Please ask your server for help.");
  return table;
}

/** Active menu items for a branch, with this branch's sold-out flag. */
export async function loadMenuItems(branch: { branchId: string; restaurantId: string }, onlyIds?: string[]) {
  const db = getDb();
  const rows = await db
    .select({
      id: s.menuItems.id,
      categorySlug: s.menuCategories.slug,
      name: s.menuItems.name,
      description: s.menuItems.description,
      priceCents: s.menuItems.priceCents,
      imageUrl: s.menuItems.imageUrl,
      prepMinutes: s.menuItems.prepMinutes,
      highlightLabel: s.menuItems.highlightLabel,
      isSignature: s.menuItems.isSignature,
      station: s.kitchenStations.name,
      available: sql<boolean>`coalesce(${s.branchMenuAvailability.isAvailable}, true)`,
    })
    .from(s.menuItems)
    .innerJoin(s.menuCategories, eq(s.menuCategories.id, s.menuItems.categoryId))
    .leftJoin(s.kitchenStations, eq(s.kitchenStations.id, s.menuItems.stationId))
    .leftJoin(s.branchMenuAvailability, and(eq(s.branchMenuAvailability.menuItemId, s.menuItems.id), eq(s.branchMenuAvailability.branchId, branch.branchId)))
    .where(and(eq(s.menuCategories.restaurantId, branch.restaurantId), eq(s.menuItems.isActive, true), onlyIds ? inArray(s.menuItems.id, onlyIds) : undefined))
    .orderBy(asc(s.menuCategories.sortOrder), asc(s.menuItems.sortOrder));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const [tagRows, groupRows] = await Promise.all([
    db
      .select({ itemId: s.menuItemDietaryTags.menuItemId, code: s.dietaryTags.code })
      .from(s.menuItemDietaryTags)
      .innerJoin(s.dietaryTags, eq(s.dietaryTags.id, s.menuItemDietaryTags.tagId))
      .where(inArray(s.menuItemDietaryTags.menuItemId, ids)),
    db
      .select({
        itemId: s.menuItemModifierGroups.menuItemId,
        groupId: s.modifierGroups.id,
        groupName: s.modifierGroups.name,
        minSelect: s.modifierGroups.minSelect,
        maxSelect: s.modifierGroups.maxSelect,
        optionId: s.modifierOptions.id,
        optionName: s.modifierOptions.name,
        priceDeltaCents: s.modifierOptions.priceDeltaCents,
        isDefault: s.modifierOptions.isDefault,
      })
      .from(s.menuItemModifierGroups)
      .innerJoin(s.modifierGroups, eq(s.modifierGroups.id, s.menuItemModifierGroups.groupId))
      .innerJoin(s.modifierOptions, eq(s.modifierOptions.groupId, s.modifierGroups.id))
      .where(inArray(s.menuItemModifierGroups.menuItemId, ids))
      .orderBy(asc(s.menuItemModifierGroups.sortOrder), asc(s.modifierOptions.sortOrder)),
  ]);

  return rows.map((r): MenuItemDto => {
    const groups = new Map<string, ModifierGroupDto>();
    for (const g of groupRows) {
      if (g.itemId !== r.id) continue;
      let group = groups.get(g.groupId);
      if (!group) groups.set(g.groupId, (group = { id: g.groupId, name: g.groupName, minSelect: g.minSelect, maxSelect: g.maxSelect, options: [] }));
      group.options.push({ id: g.optionId, name: g.optionName, priceDeltaCents: g.priceDeltaCents, isDefault: g.isDefault });
    }
    return { ...r, tags: tagRows.filter((t) => t.itemId === r.id).map((t) => t.code), modifierGroups: [...groups.values()] };
  });
}

/** Everything a menu screen needs for one branch (guest QR menu and the staff POS). */
export async function branchMenu(table: Pick<Table, "branchId" | "restaurantId">) {
  const db = getDb();
  const [items, categories, dietaryTags] = await Promise.all([
    loadMenuItems(table),
    db
      .select({ slug: s.menuCategories.slug, name: s.menuCategories.name })
      .from(s.menuCategories)
      .where(eq(s.menuCategories.restaurantId, table.restaurantId))
      .orderBy(asc(s.menuCategories.sortOrder)),
    db.select({ code: s.dietaryTags.code, label: s.dietaryTags.label }).from(s.dietaryTags).orderBy(asc(s.dietaryTags.id)),
  ]);
  return { items, categories: categories.filter((c) => items.some((i) => i.categorySlug === c.slug)), dietaryTags };
}

// cache(): generateMetadata and the page share one lookup per request
export const getTableMenu = cache(async (token: string): Promise<TableMenuDto | null> => {
  await connection();
  const table = await findTable(token);
  if (!table) return null;
  return {
    restaurant: table.restaurant,
    branch: { name: table.branch, currency: table.currency, taxRateBp: table.taxRateBp, wifiSsid: table.wifiSsid, wifiPassword: table.wifiPassword },
    table: { number: table.number, seats: table.seats, zone: table.zone, zoneDescription: table.zoneDescription },
    ...(await branchMenu(table)),
  };
});

/** Just the table and branch facts (no menu) for the live tracker page. */
export const getTableInfo = cache(async (token: string): Promise<TableInfoDto | null> => {
  await connection();
  const table = await findTable(token);
  if (!table) return null;
  return {
    restaurant: table.restaurant,
    branch: table.branch,
    currency: table.currency,
    taxRateBp: table.taxRateBp,
    table: { number: table.number, seats: table.seats, zone: table.zone },
  };
});

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/** The table's open session, opening one if the table is free. Safe under concurrent scans. */
async function openSession(tx: Tx, tableId: string) {
  await tx
    .insert(s.tableSessions)
    .values({ tableId })
    .onConflictDoNothing({ target: s.tableSessions.tableId, where: isNull(s.tableSessions.closedAt) });
  const [session] = await tx
    .select({ id: s.tableSessions.id })
    .from(s.tableSessions)
    .where(and(eq(s.tableSessions.tableId, tableId), isNull(s.tableSessions.closedAt)));
  // A table that was being cleaned/reserved is clearly occupied again
  await tx.update(s.diningTables).set({ hold: null }).where(eq(s.diningTables.id, tableId));
  return session.id;
}

/** The table's open session id, or null if nobody is seated. */
export async function currentSessionId(tableId: string) {
  const [session] = await getDb()
    .select({ id: s.tableSessions.id })
    .from(s.tableSessions)
    .where(and(eq(s.tableSessions.tableId, tableId), isNull(s.tableSessions.closedAt)));
  return session?.id ?? null;
}

function parseRequest(body: unknown): PlaceOrderRequest {
  const b = body as Partial<PlaceOrderRequest> | null;
  if (!b || !Array.isArray(b.lines) || b.lines.length === 0) throw new OrderError("Your order is empty.");
  if (b.lines.length > LIMITS.maxLines) throw new OrderError(`Please send at most ${LIMITS.maxLines} dishes per order.`);
  const lines = b.lines.map((l) => {
    const { menuItemId, quantity, optionIds, note } = (l ?? {}) as PlaceOrderRequest["lines"][number];
    if (typeof menuItemId !== "string" || !UUID_RE.test(menuItemId)) throw new OrderError("An item in your order is no longer on the menu.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > LIMITS.maxQty) throw new OrderError(`Quantities must be between 1 and ${LIMITS.maxQty}.`);
    if (!Array.isArray(optionIds) || optionIds.length > LIMITS.maxOptions || !optionIds.every((o) => typeof o === "string" && UUID_RE.test(o)))
      throw new OrderError("One of your dish options is invalid.");
    return { menuItemId, quantity, optionIds: [...new Set(optionIds)], note: typeof note === "string" ? note.trim().slice(0, LIMITS.lineNote) : "" };
  });
  return { lines, note: typeof b.note === "string" ? b.note.trim().slice(0, LIMITS.orderNote) : "" };
}

/** Prices and validates an order against the database (never the request), then files it for the table. */
export async function placeOrder(table: Table, body: unknown, placedBy: string | null = null): Promise<PlacedOrderDto> {
  const req = parseRequest(body);

  const menu = new Map((await loadMenuItems(table, [...new Set(req.lines.map((l) => l.menuItemId))])).map((m) => [m.id, m]));
  const priced = req.lines.map((line) => {
    const item = menu.get(line.menuItemId);
    if (!item) throw new OrderError("An item in your order is no longer available. Please refresh the menu.");
    if (!item.available) throw new OrderError(`${item.name} is currently unavailable. Please remove it from your order.`);
    const chosen = line.optionIds.map((id) => {
      const group = item.modifierGroups.find((g) => g.options.some((o) => o.id === id));
      if (!group) throw new OrderError(`An option for ${item.name} is no longer available.`);
      return { group, option: group.options.find((o) => o.id === id)! };
    });
    for (const g of item.modifierGroups) {
      const n = chosen.filter((c) => c.group.id === g.id).length;
      if (n < g.minSelect || n > g.maxSelect) throw new OrderError(`Please choose ${g.name} for ${item.name}.`);
    }
    return { line, item, chosen, unitPriceCents: unitPrice(item.priceCents, chosen.map((c) => c.option.priceDeltaCents)) };
  });

  const orderId = await getDb().transaction(async (tx) => {
    const sessionId = await openSession(tx, table.id);

    // Guests only: stops a stuck button (or a prank) from flooding the kitchen
    if (!placedBy) {
      const [{ recent }] = await tx
        .select({ recent: sql<number>`count(*)::int` })
        .from(s.orders)
        .where(and(eq(s.orders.sessionId, sessionId), gt(s.orders.placedAt, new Date(Date.now() - ORDER_BURST.windowSeconds * 1000))));
      if (recent >= ORDER_BURST.max) throw new OrderError("You've sent several orders just now. Please wait a moment or call your server.");
    }

    const [order] = await tx
      .insert(s.orders)
      .values({ sessionId, taxRateBp: table.taxRateBp, note: req.note || null, placedBy })
      .returning({ id: s.orders.id });
    const items = await tx
      .insert(s.orderItems)
      .values(priced.map((p, i) => ({ orderId: order.id, lineNo: i + 1, menuItemId: p.item.id, quantity: p.line.quantity, unitPriceCents: p.unitPriceCents, note: p.line.note || null })))
      .returning({ id: s.orderItems.id });
    const mods = priced.flatMap((p, i) => p.chosen.map((c) => ({ orderItemId: items[i].id, modifierOptionId: c.option.id, priceDeltaCents: c.option.priceDeltaCents })));
    if (mods.length) await tx.insert(s.orderItemModifiers).values(mods);
    await tx.insert(s.orderStatusEvents).values({ orderId: order.id, status: "submitted", changedBy: placedBy });
    return order.id;
  });

  const placed = (await listSessionOrders(table.id, orderId)).at(0);
  if (!placed) throw new Error(`Order ${orderId} vanished after insert`);
  return placed;
}

export async function placeTableOrder(token: string, body: unknown) {
  return placeOrder(await requireTable(token), body);
}

/** The open session's tickets (including cancelled ones, which show the guest why). */
async function listSessionOrders(tableId: string, onlyOrderId?: string): Promise<PlacedOrderDto[]> {
  const orders = await getDb()
    .select({
      id: s.orders.id,
      ticketNumber: s.orders.ticketNumber,
      status: s.orders.status,
      placedAt: s.orders.placedAt,
      note: s.orders.note,
      cancelReason: s.orders.cancelReason,
      taxRateBp: s.orders.taxRateBp,
    })
    .from(s.orders)
    .innerJoin(s.tableSessions, eq(s.tableSessions.id, s.orders.sessionId))
    .where(and(eq(s.tableSessions.tableId, tableId), isNull(s.tableSessions.closedAt), onlyOrderId ? eq(s.orders.id, onlyOrderId) : undefined))
    .orderBy(asc(s.orders.placedAt));
  return describeOrders(orders);
}

type OrderRow = { id: string; ticketNumber: number; status: PlacedOrderDto["status"]; placedAt: Date; note: string | null; cancelReason: string | null; taxRateBp: number };

/**
 * Lines, modifiers and status history for a set of orders. Shared by the guest tracker and the staff
 * screens; any extra columns on the rows (e.g. the table number for staff) are passed through as-is.
 */
export async function describeOrders<X extends object = Record<never, never>>(orders: (OrderRow & X)[]): Promise<(PlacedOrderDto & X)[]> {
  if (orders.length === 0) return [];
  const db = getDb();
  const ids = orders.map((o) => o.id);
  const [lines, events] = await Promise.all([
    db
      .select({
        id: s.orderItems.id,
        orderId: s.orderItems.orderId,
        menuItemId: s.orderItems.menuItemId,
        name: s.menuItems.name,
        category: s.menuCategories.name,
        station: s.kitchenStations.name,
        prepMinutes: s.menuItems.prepMinutes,
        quantity: s.orderItems.quantity,
        unitPriceCents: s.orderItems.unitPriceCents,
        note: s.orderItems.note,
        // Modifiers in the order the dish presents its groups (e.g. Rice before Add-ons)
        modifiers: sql<string[]>`coalesce(array_agg(${s.modifierOptions.name} order by ${s.menuItemModifierGroups.sortOrder}, ${s.modifierOptions.sortOrder}) filter (where ${s.modifierOptions.id} is not null), '{}')`,
        optionIds: sql<string[]>`coalesce(array_agg(${s.modifierOptions.id}) filter (where ${s.modifierOptions.id} is not null), '{}')`,
      })
      .from(s.orderItems)
      .innerJoin(s.menuItems, eq(s.menuItems.id, s.orderItems.menuItemId))
      .innerJoin(s.menuCategories, eq(s.menuCategories.id, s.menuItems.categoryId))
      .leftJoin(s.kitchenStations, eq(s.kitchenStations.id, s.menuItems.stationId))
      .leftJoin(s.orderItemModifiers, eq(s.orderItemModifiers.orderItemId, s.orderItems.id))
      .leftJoin(s.modifierOptions, eq(s.modifierOptions.id, s.orderItemModifiers.modifierOptionId))
      .leftJoin(s.menuItemModifierGroups, and(eq(s.menuItemModifierGroups.menuItemId, s.orderItems.menuItemId), eq(s.menuItemModifierGroups.groupId, s.modifierOptions.groupId)))
      .where(inArray(s.orderItems.orderId, ids))
      .groupBy(s.orderItems.id, s.menuItems.id, s.menuCategories.id, s.kitchenStations.id)
      .orderBy(asc(s.orderItems.orderId), asc(s.orderItems.lineNo)),
    db
      .select({ orderId: s.orderStatusEvents.orderId, status: s.orderStatusEvents.status, at: s.orderStatusEvents.changedAt })
      .from(s.orderStatusEvents)
      .where(inArray(s.orderStatusEvents.orderId, ids))
      .orderBy(asc(s.orderStatusEvents.changedAt)),
  ]);

  return orders.map(({ id, ticketNumber, status, placedAt, note, cancelReason, taxRateBp, ...extra }) => {
    const own = lines
      .filter((l) => l.orderId === id)
      .map((l) => ({
        menuItemId: l.menuItemId,
        optionIds: l.optionIds,
        name: l.name,
        category: l.category,
        station: l.station,
        prepMinutes: l.prepMinutes,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        modifiers: l.modifiers,
        note: l.note,
      }));
    const subtotal = own.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
    const dto: PlacedOrderDto = {
      id,
      ticketNumber,
      status,
      placedAt: placedAt.toISOString(),
      events: events.filter((e) => e.orderId === id).map((e) => ({ status: e.status, at: e.at.toISOString() })),
      note,
      cancelReason,
      lines: own,
      ...totals(subtotal, taxRateBp),
    };
    return { ...(extra as X), ...dto };
  });
}

export async function getTableOrders(token: string) {
  return listSessionOrders((await requireTable(token)).id);
}

/** Payments recorded against a session (any status). */
export async function sessionPayments(sessionId: string): Promise<PaymentDto[]> {
  const rows = await getDb()
    .select({
      id: s.payments.id,
      method: s.payments.method,
      status: s.payments.status,
      amountCents: s.payments.amountCents,
      tenderedCents: s.payments.tenderedCents,
      channel: s.payments.channel,
      referenceNumber: s.payments.referenceNumber,
      createdAt: s.payments.createdAt,
      paidAt: s.payments.paidAt,
    })
    .from(s.payments)
    .where(eq(s.payments.sessionId, sessionId))
    .orderBy(asc(s.payments.createdAt));
  return rows.map((p) => ({ ...p, createdAt: p.createdAt.toISOString(), paidAt: p.paidAt?.toISOString() ?? null }));
}

/** Live tracker poll: tickets, service calls, bill and payment options for the table's open session. */
export async function getTableStatus(token: string): Promise<TableStatusDto> {
  const table = await requireTable(token);
  const sessionId = await currentSessionId(table.id);
  const paymentOptions = { cash: table.cashPaymentsEnabled, online: table.onlinePaymentsEnabled && onlinePaymentsConfigured() };
  if (!sessionId) return { orders: [], requests: [], bill: billFor([], []), paymentOptions, feedbackGiven: false };

  // Guests coming back from the payment page see "paid" without waiting for the webhook
  await verifyPendingOnlinePayments(sessionId);
  const db = getDb();
  const [orders, requests, payments, [feedback]] = await Promise.all([
    listSessionOrders(table.id),
    db
      .select({ id: s.serviceRequests.id, type: s.serviceRequests.type, status: s.serviceRequests.status, createdAt: s.serviceRequests.createdAt })
      .from(s.serviceRequests)
      .where(eq(s.serviceRequests.sessionId, sessionId))
      .orderBy(asc(s.serviceRequests.createdAt)),
    sessionPayments(sessionId),
    db.select({ id: s.feedback.id }).from(s.feedback).where(eq(s.feedback.sessionId, sessionId)),
  ]);
  return {
    orders,
    requests: requests.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    bill: billFor(orders, payments),
    paymentOptions,
    feedbackGiven: !!feedback,
  };
}

const REQUEST_TYPES: ServiceRequestType[] = ["call_server", "water_cutlery", "request_bill", "sommelier", "napkins"];

export async function requestService(token: string, type: unknown) {
  if (!REQUEST_TYPES.includes(type as ServiceRequestType)) throw new OrderError("Unknown request.");
  const table = await requireTable(token);
  return getDb().transaction(async (tx) => {
    const sessionId = await openSession(tx, table.id);
    // The partial unique index means repeated taps while staff haven't responded don't create duplicates
    const [created] = await tx
      .insert(s.serviceRequests)
      .values({ sessionId, type: type as ServiceRequestType })
      .onConflictDoNothing()
      .returning({ id: s.serviceRequests.id, createdAt: s.serviceRequests.createdAt });
    if (created) return { id: created.id, type, createdAt: created.createdAt.toISOString(), duplicate: false };
    const [pending] = await tx
      .select({ id: s.serviceRequests.id, createdAt: s.serviceRequests.createdAt })
      .from(s.serviceRequests)
      .where(and(eq(s.serviceRequests.sessionId, sessionId), eq(s.serviceRequests.type, type as ServiceRequestType), ne(s.serviceRequests.status, "resolved")));
    return { id: pending.id, type, createdAt: pending.createdAt.toISOString(), duplicate: true };
  });
}

/** One rating per visit, once something has been served or paid. */
export async function submitFeedback(token: string, body: unknown) {
  const { rating, comment } = (body ?? {}) as { rating?: unknown; comment?: unknown };
  if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5) throw new OrderError("Please choose a rating from 1 to 5 stars.");
  const text = typeof comment === "string" ? comment.trim().slice(0, LIMITS.feedback) : "";
  const table = await requireTable(token);
  const sessionId = await currentSessionId(table.id);
  if (!sessionId) throw new OrderError("There's no visit to rate yet.");
  const db = getDb();
  const [eligible] = await db
    .select({ id: s.orders.id })
    .from(s.orders)
    .where(and(eq(s.orders.sessionId, sessionId), or(eq(s.orders.status, "served"), eq(s.orders.status, "completed"))))
    .limit(1);
  if (!eligible) throw new OrderError("You can rate your visit once your food has been served.");
  const [saved] = await db
    .insert(s.feedback)
    .values({ sessionId, rating: rating as number, comment: text || null })
    .onConflictDoNothing()
    .returning({ id: s.feedback.id });
  if (!saved) throw new OrderError("Thanks! You've already rated this visit.");
}

/** Starts a PayMongo checkout for the table's outstanding balance (amount computed here, never sent by the guest). */
export async function startTableCheckout(token: string, origin: string) {
  const table = await requireTable(token);
  if (!table.onlinePaymentsEnabled || !onlinePaymentsConfigured()) throw new OrderError("Online payment isn't available here. Please pay with cash.");
  const sessionId = await currentSessionId(table.id);
  if (!sessionId) throw new OrderError("There's nothing to pay yet.");
  const [orders, payments] = await Promise.all([listSessionOrders(table.id), sessionPayments(sessionId)]);
  const bill = billFor(orders, payments);
  if (bill.balanceCents <= 0) throw new OrderError("Your bill is already paid. Thank you!");
  const track = `${origin}/order/table/${token}/track`;
  return createOnlineCheckout({
    sessionId,
    balanceCents: bill.balanceCents,
    description: `${table.restaurant} ${table.branch} • Table ${table.number} bill`,
    reference: `SH-T${table.number}-${Date.now().toString(36).toUpperCase()}`,
    successUrl: `${track}?payment=success`,
    cancelUrl: `${track}?payment=cancelled`,
  });
}

/** Every active table with its QR token, for the printable QR cards (the caller checks access). */
export async function listTablesForQr(branchId: string) {
  await connection();
  return getDb()
    .select({
      id: s.diningTables.id,
      number: s.diningTables.number,
      seats: s.diningTables.seats,
      qrToken: s.diningTables.qrToken,
      zone: s.zones.name,
      zoneDescription: s.zones.description,
      restaurant: s.restaurants.name,
      branchCode: s.branches.code,
      wifiSsid: s.branches.wifiSsid,
      wifiPassword: s.branches.wifiPassword,
    })
    .from(s.diningTables)
    .innerJoin(s.zones, eq(s.zones.id, s.diningTables.zoneId))
    .innerJoin(s.branches, eq(s.branches.id, s.diningTables.branchId))
    .innerJoin(s.restaurants, eq(s.restaurants.id, s.branches.restaurantId))
    .where(and(eq(s.diningTables.isActive, true), eq(s.diningTables.branchId, branchId)))
    .orderBy(asc(s.zones.sortOrder), sql`length(${s.diningTables.number})`, asc(s.diningTables.number));
}
