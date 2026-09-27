// Dev seed: `npm run db:seed`. Wipes and recreates demo data for Sync Hub Resto (prices in PHP).
import { randomBytes, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "../lib/password";
import { connectionOptions } from "./connection";
import * as s from "./schema";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed a production database.");

const client = postgres(process.env.DATABASE_URL!, { ...connectionOptions(process.env.DATABASE_URL!, 1), connect_timeout: 90 });
const db = drizzle({ client, schema: s });

const token = () => randomBytes(12).toString("base64url");
const peso = (n: number) => Math.round(n * 100);

// Deterministic pseudo-random so every seed produces the same history
let rngState = 20260926;
const rand = () => ((rngState = (rngState * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

type ItemSeed = { cat: string; station: string; name: string; description: string; price: number; prep: number; label?: string; signature?: boolean; tags?: string[]; groups?: string[] };

const ITEMS: ItemSeed[] = [
  { cat: "rice-meals", station: "Hot Line", name: "Pork Sisig Rice Meal", description: "Sizzling chopped pork, calamansi, chili and egg, served with rice.", price: 179, prep: 12, label: "Bestseller", signature: true, tags: ["spicy"], groups: ["Rice", "Add-ons"] },
  { cat: "rice-meals", station: "Hot Line", name: "Chicken Adobo Rice Meal", description: "Soy-vinegar braised chicken, garlic and bay leaf, with rice.", price: 159, prep: 10, groups: ["Rice", "Add-ons"] },
  { cat: "rice-meals", station: "Grill", name: "Beef Tapa Silog", description: "Cured beef tapa, garlic fried rice and sunny-side-up egg.", price: 169, prep: 10, groups: ["Add-ons"] },
  { cat: "burgers", station: "Grill", name: "Chicken Burger", description: "Crispy chicken fillet, lettuce, tomato and house mayo.", price: 149, prep: 9, groups: ["Burger Add-ons"] },
  { cat: "burgers", station: "Grill", name: "Classic Cheeseburger", description: "Quarter-pound beef patty, cheddar, pickles and special sauce.", price: 159, prep: 9, label: "Popular", groups: ["Burger Add-ons"] },
  { cat: "burgers", station: "Grill", name: "Double Bacon Burger", description: "Two beef patties, smoked bacon and caramelized onions.", price: 229, prep: 11, groups: ["Burger Add-ons"] },
  { cat: "pizza", station: "Pizza Oven", name: "Hawaiian Pizza (12\")", description: "Ham, pineapple and mozzarella on a tomato base.", price: 389, prep: 15 },
  { cat: "pizza", station: "Pizza Oven", name: "Pepperoni Pizza (12\")", description: "Loaded pepperoni and mozzarella.", price: 399, prep: 15, label: "Popular" },
  { cat: "pasta", station: "Hot Line", name: "Filipino-Style Spaghetti", description: "Sweet-style tomato sauce with hotdog slices and cheese.", price: 129, prep: 8 },
  { cat: "pasta", station: "Hot Line", name: "Creamy Carbonara", description: "Bacon, mushrooms and parmesan cream sauce.", price: 169, prep: 9 },
  { cat: "chicken", station: "Fryer", name: "Fried Chicken (2 pcs)", description: "Crispy golden fried chicken with gravy and rice.", price: 189, prep: 14, groups: ["Rice"] },
  { cat: "chicken", station: "Fryer", name: "Buffalo Wings (6 pcs)", description: "Tossed in buffalo sauce, with ranch dip.", price: 199, prep: 12, tags: ["spicy"], groups: ["Spice Level"] },
  { cat: "seafood", station: "Hot Line", name: "Garlic Butter Shrimp", description: "Shrimp sautéed in garlic butter, served with rice.", price: 289, prep: 12, tags: ["seafood", "gluten-free"], groups: ["Rice"] },
  { cat: "seafood", station: "Grill", name: "Grilled Boneless Bangus", description: "Marinated milkfish grilled over charcoal, with atchara.", price: 249, prep: 14, tags: ["seafood", "gluten-free"], groups: ["Rice"] },
  { cat: "desserts", station: "Pastry", name: "Halo-Halo Special", description: "Shaved ice, sweet beans, leche flan, ube and ice cream.", price: 129, prep: 5, label: "Local Favorite", tags: ["vegetarian"] },
  { cat: "desserts", station: "Pastry", name: "Leche Flan", description: "Silky caramel custard.", price: 79, prep: 2, tags: ["vegetarian", "gluten-free"] },
  { cat: "beverages", station: "Bar", name: "House Iced Tea", description: "Freshly brewed, lightly sweetened.", price: 50, prep: 2, tags: ["vegetarian", "gluten-free"], groups: ["Sugar Level"] },
  { cat: "beverages", station: "Bar", name: "Fresh Calamansi Juice", description: "Squeezed to order.", price: 65, prep: 3, tags: ["vegetarian", "gluten-free"], groups: ["Sugar Level"] },
  { cat: "beverages", station: "Bar", name: "Bottled Water", description: "500 ml.", price: 30, prep: 1, tags: ["vegetarian", "gluten-free"] },
  { cat: "coffee", station: "Bar", name: "Iced Coffee", description: "Espresso, milk and ice.", price: 99, prep: 4, label: "Popular", tags: ["vegetarian"], groups: ["Coffee Size", "Sugar Level"] },
  { cat: "coffee", station: "Bar", name: "Café Latte", description: "Hot espresso with steamed milk.", price: 120, prep: 4, tags: ["vegetarian"], groups: ["Coffee Size"] },
  { cat: "coffee", station: "Bar", name: "Americano", description: "Espresso and hot water.", price: 95, prep: 3, tags: ["vegetarian", "gluten-free"], groups: ["Coffee Size"] },
  { cat: "snacks", station: "Fryer", name: "French Fries", description: "Crispy fries with your choice of seasoning.", price: 79, prep: 6, tags: ["vegetarian"], groups: ["Fries Size"] },
  { cat: "snacks", station: "Fryer", name: "Lumpiang Shanghai (10 pcs)", description: "Pork spring rolls with sweet chili sauce.", price: 99, prep: 8 },
];

const GROUPS: Record<string, { min: number; max: number; options: { name: string; delta?: number; isDefault?: boolean }[] }> = {
  Rice: { min: 1, max: 1, options: [{ name: "Plain Rice", isDefault: true }, { name: "Garlic Rice", delta: 15 }] },
  "Add-ons": { min: 0, max: 2, options: [{ name: "Extra Rice", delta: 25 }, { name: "Fried Egg", delta: 20 }] },
  "Burger Add-ons": { min: 0, max: 2, options: [{ name: "Extra Cheese", delta: 20 }, { name: "Bacon", delta: 35 }, { name: "No Onions" }] },
  "Spice Level": { min: 1, max: 1, options: [{ name: "Mild", isDefault: true }, { name: "Hot" }, { name: "Extra Hot" }] },
  "Coffee Size": { min: 1, max: 1, options: [{ name: "Regular (12 oz)", isDefault: true }, { name: "Large (16 oz)", delta: 30 }] },
  "Sugar Level": { min: 1, max: 1, options: [{ name: "Regular Sweet", isDefault: true }, { name: "Less Sweet" }, { name: "No Sugar" }] },
  "Fries Size": { min: 1, max: 1, options: [{ name: "Regular", isDefault: true }, { name: "Large", delta: 30 }] },
};

async function main() {
  // Schema-qualified on purpose: only the "pos" tables are wiped, never Laravel's public.* tables
  const posTables = `audit_logs, feedback, login_attempts, auth_sessions, payments, service_requests, order_status_events, order_item_modifiers, order_items, orders, table_sessions,
    menu_item_modifier_groups, modifier_options, modifier_groups, branch_menu_availability, menu_item_dietary_tags,
    dietary_tags, menu_items, kitchen_stations, menu_categories, dining_tables, zones, branch_staff, users, branches, restaurants`
    .split(",")
    .map((t) => `pos.${t.trim()}`)
    .join(", ");
  await db.execute(sql.raw(`truncate ${posTables} restart identity cascade`));

  const [resto] = await db.insert(s.restaurants).values({ name: "Sync Hub Resto", slug: "sync-hub-resto" }).returning();
  const [mly, val] = await db
    .insert(s.branches)
    .values([
      { restaurantId: resto.id, code: "MLY", name: "Malaybalay Branch", address: "Fortich St., Malaybalay City, Bukidnon", currency: "PHP", taxRateBp: 1200, wifiSsid: "SyncHub-Guest", wifiPassword: "masarap2026", onlinePaymentsEnabled: true },
      { restaurantId: resto.id, code: "VAL", name: "Valencia Branch", address: "Sayre Hwy, Valencia City, Bukidnon", currency: "PHP", taxRateBp: 1200, wifiSsid: "SyncHub-Valencia", wifiPassword: "masarap2026", onlinePaymentsEnabled: true },
    ])
    .returning();

  // Staff: one demo account per role (password: ChangeMe!2026)
  const pw = await hashPassword("ChangeMe!2026");
  const staff = await db
    .insert(s.users)
    .values([
      { email: "sysadmin@synchub.dev", fullName: "System Admin", role: "system_admin", passwordHash: pw, restaurantId: null },
      { email: "admin@synchub.dev", fullName: "Rita Santos", role: "restaurant_admin", passwordHash: pw, restaurantId: resto.id },
      { email: "manager@synchub.dev", fullName: "Andrea Reyes", role: "branch_manager", passwordHash: pw, restaurantId: resto.id },
      { email: "cashier@synchub.dev", fullName: "Carlo Mendoza", role: "cashier", passwordHash: pw, restaurantId: resto.id },
      { email: "kitchen@synchub.dev", fullName: "Kim Dela Cruz", role: "kitchen", passwordHash: pw, restaurantId: resto.id },
      { email: "manager.valencia@synchub.dev", fullName: "Paolo Villanueva", role: "branch_manager", passwordHash: pw, restaurantId: resto.id },
      { email: "cashier.valencia@synchub.dev", fullName: "Jen Bautista", role: "cashier", passwordHash: pw, restaurantId: resto.id },
      { email: "kitchen.valencia@synchub.dev", fullName: "Mark Ramos", role: "kitchen", passwordHash: pw, restaurantId: resto.id },
    ])
    .returning();
  const byEmail = Object.fromEntries(staff.map((u) => [u.email, u]));
  await db.insert(s.branchStaff).values([
    ...["manager", "cashier", "kitchen"].map((r) => ({ branchId: mly.id, userId: byEmail[`${r}@synchub.dev`].id })),
    ...["manager", "cashier", "kitchen"].map((r) => ({ branchId: val.id, userId: byEmail[`${r}.valencia@synchub.dev`].id })),
  ]);

  // Floor: zones and tables, each with its own QR token
  const [mlyMain, mlyAlFresco, valMain] = await db
    .insert(s.zones)
    .values([
      { branchId: mly.id, name: "Main Dining", description: "Air-conditioned indoor dining", sortOrder: 0 },
      { branchId: mly.id, name: "Al Fresco", description: "Garden patio", sortOrder: 1 },
      { branchId: val.id, name: "Main Dining", description: "Indoor dining", sortOrder: 0 },
    ])
    .returning();
  const tables = await db
    .insert(s.diningTables)
    .values([
      ...Array.from({ length: 10 }, (_, i) => ({ branchId: mly.id, zoneId: mlyMain.id, number: String(i + 1), seats: i % 3 === 0 ? 6 : 4, qrToken: token() })),
      ...Array.from({ length: 6 }, (_, i) => ({ branchId: mly.id, zoneId: mlyAlFresco.id, number: String(i + 11), seats: 2, qrToken: token() })),
      ...Array.from({ length: 8 }, (_, i) => ({ branchId: val.id, zoneId: valMain.id, number: String(i + 1), seats: 4, qrToken: token() })),
    ])
    .returning();

  // Menu
  const CATEGORIES = [
    ["rice-meals", "Rice Meals"],
    ["burgers", "Burgers"],
    ["pizza", "Pizza"],
    ["pasta", "Pasta"],
    ["chicken", "Chicken"],
    ["seafood", "Seafood"],
    ["desserts", "Desserts"],
    ["beverages", "Beverages"],
    ["coffee", "Coffee"],
    ["snacks", "Snacks"],
  ];
  const cats = await db
    .insert(s.menuCategories)
    .values(CATEGORIES.map(([slug, name], i) => ({ restaurantId: resto.id, slug, name, sortOrder: i })))
    .returning();
  const cat = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  const stations = await db
    .insert(s.kitchenStations)
    .values(["Hot Line", "Grill", "Fryer", "Pizza Oven", "Pastry", "Bar"].map((name) => ({ restaurantId: resto.id, name })))
    .returning();
  const st = Object.fromEntries(stations.map((x) => [x.name, x.id]));

  const tags = await db
    .insert(s.dietaryTags)
    .values([
      { code: "vegetarian", label: "Vegetarian" },
      { code: "gluten-free", label: "Gluten-Free" },
      { code: "spicy", label: "Spicy" },
      { code: "seafood", label: "Contains Seafood" },
    ])
    .returning();
  const tag = Object.fromEntries(tags.map((t) => [t.code, t.id]));

  const sortInCat = new Map<string, number>();
  const items = await db
    .insert(s.menuItems)
    .values(
      ITEMS.map((i) => {
        const n = sortInCat.get(i.cat) ?? 0;
        sortInCat.set(i.cat, n + 1);
        return { categoryId: cat[i.cat], stationId: st[i.station], name: i.name, description: i.description, priceCents: peso(i.price), prepMinutes: i.prep, highlightLabel: i.label, isSignature: !!i.signature, sortOrder: n };
      }),
    )
    .returning();
  const item = Object.fromEntries(items.map((i) => [i.name, i]));

  await db.insert(s.menuItemDietaryTags).values(ITEMS.flatMap((i) => (i.tags ?? []).map((c) => ({ menuItemId: item[i.name].id, tagId: tag[c] }))));

  const groups = await db
    .insert(s.modifierGroups)
    .values(Object.entries(GROUPS).map(([name, g]) => ({ restaurantId: resto.id, name, minSelect: g.min, maxSelect: g.max })))
    .returning();
  const group = Object.fromEntries(groups.map((g) => [g.name, g.id]));
  await db.insert(s.modifierOptions).values(
    Object.entries(GROUPS).flatMap(([name, g]) => g.options.map((o, i) => ({ groupId: group[name], name: o.name, priceDeltaCents: peso(o.delta ?? 0), isDefault: !!o.isDefault, sortOrder: i }))),
  );
  await db.insert(s.menuItemModifierGroups).values(ITEMS.flatMap((i) => (i.groups ?? []).map((g, n) => ({ menuItemId: item[i.name].id, groupId: group[g], sortOrder: n }))));

  // Each branch has something sold out, to show "Currently Unavailable" on the guest menu
  await db.insert(s.branchMenuAvailability).values([
    { branchId: mly.id, menuItemId: item["Halo-Halo Special"].id, isAvailable: false },
    { branchId: val.id, menuItemId: item["Pepperoni Pizza (12\")"].id, isAvailable: false },
  ]);

  // A week of settled visits so the dashboard and reports have history
  const simple = ITEMS.filter((i) => !(i.groups ?? []).some((g) => GROUPS[g].min > 0));
  const comments = ["Great food and fast service.", "Sisig was perfect!", "Loved the halo-halo.", "A bit slow tonight but tasty.", "Friendly staff.", null, null];
  // Ids are generated here so the whole history goes in as a handful of bulk inserts
  const history = {
    sessions: [] as (typeof s.tableSessions.$inferInsert)[],
    orders: [] as (typeof s.orders.$inferInsert)[],
    lines: [] as (typeof s.orderItems.$inferInsert)[],
    events: [] as (typeof s.orderStatusEvents.$inferInsert)[],
    payments: [] as (typeof s.payments.$inferInsert)[],
    feedback: [] as (typeof s.feedback.$inferInsert)[],
  };
  for (let day = 7; day >= 1; day--) {
    for (const branch of [mly, val]) {
      const branchTables = tables.filter((t) => t.branchId === branch.id);
      const cashier = branch === mly ? byEmail["cashier@synchub.dev"] : byEmail["cashier.valencia@synchub.dev"];
      const count = 6 + Math.floor(rand() * 8);
      for (let v = 0; v < count; v++) {
        const opened = new Date();
        opened.setDate(opened.getDate() - day);
        opened.setHours(11 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);
        const closed = new Date(opened.getTime() + (40 + rand() * 50) * 60_000);
        const sessionId = randomUUID();
        const orderId = randomUUID();
        history.sessions.push({ id: sessionId, tableId: pick(branchTables).id, guestCount: 1 + Math.floor(rand() * 4), openedAt: opened, closedAt: closed, closedBy: cashier.id });
        history.orders.push({ id: orderId, sessionId, status: "completed", taxRateBp: branch.taxRateBp, placedAt: opened, updatedAt: closed });
        const lines = Array.from({ length: 1 + Math.floor(rand() * 4) }, () => ({ seed: pick(simple), qty: 1 + Math.floor(rand() * 2) }));
        lines.forEach((l, i) => history.lines.push({ orderId, lineNo: i + 1, menuItemId: item[l.seed.name].id, quantity: l.qty, unitPriceCents: peso(l.seed.price) }));
        history.events.push({ orderId, status: "submitted", changedAt: opened }, { orderId, status: "completed", changedAt: closed, changedBy: cashier.id });
        const sub = lines.reduce((sum, l) => sum + peso(l.seed.price) * l.qty, 0);
        const total = sub + Math.round((sub * branch.taxRateBp) / 10000);
        const online = rand() < 0.4;
        history.payments.push({
          sessionId,
          method: online ? "online" : "cash",
          status: "paid",
          amountCents: total,
          tenderedCents: online ? null : Math.ceil(total / 10000) * 10000,
          provider: online ? "paymongo" : null,
          providerRef: online ? `cs_seed_${history.payments.length}` : null,
          channel: online ? pick(["gcash", "paymaya", "card"]) : null,
          receivedBy: online ? null : cashier.id,
          createdAt: closed,
          paidAt: closed,
        });
        if (rand() < 0.45) history.feedback.push({ sessionId, rating: pick([5, 5, 5, 4, 4, 3]), comment: pick(comments), createdAt: closed });
      }
    }
  }
  await db.insert(s.tableSessions).values(history.sessions);
  await db.insert(s.orders).values(history.orders);
  await db.insert(s.orderItems).values(history.lines);
  await db.insert(s.orderStatusEvents).values(history.events);
  await db.insert(s.payments).values(history.payments);
  await db.insert(s.feedback).values(history.feedback);
  const visits = history.sessions.length;

  const mlyTables = tables.filter((t) => t.branchId === mly.id);
  console.log(`Seeded ${resto.name}: 2 branches, ${tables.length} tables, ${items.length} menu items, ${staff.length} staff, ${visits} past visits.`);
  console.log(`Table 5 (Malaybalay) guest URL: http://localhost:3000/order/table/${mlyTables.find((t) => t.number === "5")!.qrToken}`);
  console.log(`Staff sign-in: http://localhost:3000/login (${staff.map((u) => u.email).join(", ")}; password ChangeMe!2026)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
