import "server-only";
import { and, asc, desc, eq, gt, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { confirmOnlinePayment } from "@/lib/payments";
import { ActionError, assertBranchAccess, audit, type StaffContext } from "@/lib/staffContext";
import { ALL_STAFF, MANAGERS, type StaffRole } from "@/lib/staffAccess";
import type { BillDetailDto, FloorStatus, FloorTableDto, KitchenBoardDto } from "@/lib/staffDto";
import { billFor, totals, type OrderStatus, type PaymentMethod } from "@/lib/tableOrder";
import { OrderError, UUID_RE, describeOrders, findTableById, placeOrder, sessionPayments } from "@/lib/tableOrdering";

// Server-only: the live restaurant floor for staff (kitchen board, floor map, bills) and every action on
// it. Each mutation resolves the target's branch and checks the caller may act there before touching it.

const KITCHEN: StaffRole[] = ["kitchen", ...MANAGERS];

// Forward-only ticket flow, and who may make each move
const TRANSITIONS: Partial<Record<OrderStatus, Partial<Record<OrderStatus, StaffRole[]>>>> = {
  submitted: { confirmed: KITCHEN, cancelled: KITCHEN },
  confirmed: { preparing: KITCHEN, cancelled: MANAGERS },
  preparing: { ready: KITCHEN, cancelled: MANAGERS },
  ready: { served: ALL_STAFF, cancelled: MANAGERS },
};

const assertId = (id: unknown, what: string): string => {
  if (typeof id !== "string" || !UUID_RE.test(id)) throw new ActionError(`${what} not found.`, 404);
  return id;
};

// ─── Reads ──────────────────────────────────────────────────────────────────

const RECENT_MS = 20 * 60 * 1000;

export async function getKitchenBoard(branchId: string): Promise<KitchenBoardDto> {
  const db = getDb();
  const rows = await db
    .select({
      id: s.orders.id,
      ticketNumber: s.orders.ticketNumber,
      status: s.orders.status,
      placedAt: s.orders.placedAt,
      note: s.orders.note,
      cancelReason: s.orders.cancelReason,
      taxRateBp: s.orders.taxRateBp,
      tableNumber: s.diningTables.number,
      zone: s.zones.name,
      byStaff: sql<boolean>`${s.orders.placedBy} is not null`,
    })
    .from(s.orders)
    .innerJoin(s.tableSessions, eq(s.tableSessions.id, s.orders.sessionId))
    .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
    .innerJoin(s.zones, eq(s.zones.id, s.diningTables.zoneId))
    .where(
      and(
        eq(s.diningTables.branchId, branchId),
        or(inArray(s.orders.status, ["submitted", "confirmed", "preparing", "ready"]), and(eq(s.orders.status, "served"), gt(s.orders.updatedAt, new Date(Date.now() - RECENT_MS)))),
      ),
    )
    .orderBy(asc(s.orders.placedAt))
    .limit(150);
  const [{ completedToday }] = await db
    .select({ completedToday: sql<number>`count(*)::int` })
    .from(s.orders)
    .innerJoin(s.tableSessions, eq(s.tableSessions.id, s.orders.sessionId))
    .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
    .where(and(eq(s.diningTables.branchId, branchId), inArray(s.orders.status, ["served", "completed"]), gte(s.orders.placedAt, startOfToday())));
  return { orders: await describeOrders(rows), completedToday, serverTime: new Date().toISOString() };
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Every table in the branch with its live state: who's seated, what's cooking, what's owed, who's calling. */
export async function getFloor(branchId: string): Promise<FloorTableDto[]> {
  const db = getDb();
  // Tables and their open visit in one round trip (the partial unique index guarantees at most one)
  const tables = await db
    .select({
      id: s.diningTables.id,
      number: s.diningTables.number,
      seats: s.diningTables.seats,
      zone: s.zones.name,
      hold: s.diningTables.hold,
      sessionId: s.tableSessions.id,
      openedAt: s.tableSessions.openedAt,
    })
    .from(s.diningTables)
    .innerJoin(s.zones, eq(s.zones.id, s.diningTables.zoneId))
    .leftJoin(s.tableSessions, and(eq(s.tableSessions.tableId, s.diningTables.id), isNull(s.tableSessions.closedAt)))
    .where(and(eq(s.diningTables.branchId, branchId), eq(s.diningTables.isActive, true)))
    .orderBy(asc(s.zones.sortOrder), sql`length(${s.diningTables.number})`, asc(s.diningTables.number));
  if (tables.length === 0) return [];

  const sessions = tables.filter((t) => t.sessionId).map((t) => ({ id: t.sessionId!, tableId: t.id, openedAt: t.openedAt! }));
  const sessionIds = sessions.map((x) => x.id);

  const [orderRows, paid, requests] = sessionIds.length
    ? await Promise.all([
        db
          .select({
            id: s.orders.id,
            ticketNumber: s.orders.ticketNumber,
            sessionId: s.orders.sessionId,
            status: s.orders.status,
            taxRateBp: s.orders.taxRateBp,
            sub: sql<number>`coalesce(sum(${s.orderItems.quantity} * ${s.orderItems.unitPriceCents}), 0)::int`,
          })
          .from(s.orders)
          .leftJoin(s.orderItems, eq(s.orderItems.orderId, s.orders.id))
          .where(inArray(s.orders.sessionId, sessionIds))
          .groupBy(s.orders.id),
        db
          .select({ sessionId: s.payments.sessionId, paid: sql<number>`sum(${s.payments.amountCents})::int` })
          .from(s.payments)
          .where(and(inArray(s.payments.sessionId, sessionIds), eq(s.payments.status, "paid")))
          .groupBy(s.payments.sessionId),
        db
          .select({ id: s.serviceRequests.id, sessionId: s.serviceRequests.sessionId, type: s.serviceRequests.type, status: s.serviceRequests.status, createdAt: s.serviceRequests.createdAt })
          .from(s.serviceRequests)
          .where(and(inArray(s.serviceRequests.sessionId, sessionIds), ne(s.serviceRequests.status, "resolved")))
          .orderBy(asc(s.serviceRequests.createdAt)),
      ])
    : [[], [], []];

  return tables.map((t) => {
    const session = sessions.find((x) => x.tableId === t.id);
    if (!session) return { id: t.id, number: t.number, seats: t.seats, zone: t.zone, status: (t.hold ?? "available") as FloorStatus, session: null };
    const orders = orderRows.filter((o) => o.sessionId === session.id);
    const live = orders.filter((o) => o.status !== "cancelled");
    const totalCents = live.reduce((sum, o) => sum + totals(o.sub, o.taxRateBp).totalCents, 0);
    const paidCents = paid.find((p) => p.sessionId === session.id)?.paid ?? 0;
    const has = (...st: OrderStatus[]) => live.some((o) => st.includes(o.status));
    const status: FloorStatus = has("ready")
      ? "ready"
      : has("confirmed", "preparing")
        ? "preparing"
        : has("submitted")
          ? "ordering"
          : live.length === 0
            ? "seated"
            : totalCents > 0 && paidCents >= totalCents
              ? "paid"
              : "serving";
    return {
      id: t.id,
      number: t.number,
      seats: t.seats,
      zone: t.zone,
      status,
      session: {
        id: session.id,
        openedAt: session.openedAt.toISOString(),
        tickets: live.length,
        ready: live.filter((o) => o.status === "ready").map((o) => ({ id: o.id, ticketNumber: o.ticketNumber })),
        totalCents,
        paidCents,
        balanceCents: Math.max(0, totalCents - paidCents),
        requests: requests.filter((r) => r.sessionId === session.id).map((r) => ({ id: r.id, type: r.type, status: r.status, createdAt: r.createdAt.toISOString() })),
      },
    };
  });
}

/** Full bill for one open (or just-closed) table visit. */
export async function getBill(ctx: StaffContext, sessionIdInput: unknown): Promise<BillDetailDto> {
  const sessionId = assertId(sessionIdInput, "Bill");
  const db = getDb();
  const [session] = await db
    .select({
      id: s.tableSessions.id,
      openedAt: s.tableSessions.openedAt,
      closedAt: s.tableSessions.closedAt,
      tableNumber: s.diningTables.number,
      zone: s.zones.name,
      branchId: s.diningTables.branchId,
      branch: s.branches.name,
      address: s.branches.address,
      restaurant: s.restaurants.name,
      currency: s.branches.currency,
      taxRateBp: s.branches.taxRateBp,
    })
    .from(s.tableSessions)
    .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
    .innerJoin(s.zones, eq(s.zones.id, s.diningTables.zoneId))
    .innerJoin(s.branches, eq(s.branches.id, s.diningTables.branchId))
    .innerJoin(s.restaurants, eq(s.restaurants.id, s.branches.restaurantId))
    .where(eq(s.tableSessions.id, sessionId));
  // Same answer for "doesn't exist" and "another branch's bill"
  if (!session || !ctx.branches.some((b) => b.id === session.branchId)) throw new ActionError("Bill not found.", 404);

  const orderRows = await db
    .select({ id: s.orders.id, ticketNumber: s.orders.ticketNumber, status: s.orders.status, placedAt: s.orders.placedAt, note: s.orders.note, cancelReason: s.orders.cancelReason, taxRateBp: s.orders.taxRateBp })
    .from(s.orders)
    .where(eq(s.orders.sessionId, sessionId))
    .orderBy(asc(s.orders.placedAt));
  const [orders, payments] = await Promise.all([describeOrders(orderRows), sessionPayments(sessionId)]);
  return {
    ...session,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    orders,
    bill: billFor(orders, payments),
  };
}

/** Menu items with this branch's sold-out flags, for the kitchen's quick "86" toggles. */
export async function getAvailability(ctx: StaffContext) {
  const branch = ctx.branch!;
  return getDb()
    .select({
      id: s.menuItems.id,
      name: s.menuItems.name,
      category: s.menuCategories.name,
      available: sql<boolean>`coalesce(${s.branchMenuAvailability.isAvailable}, true)`,
    })
    .from(s.menuItems)
    .innerJoin(s.menuCategories, eq(s.menuCategories.id, s.menuItems.categoryId))
    .leftJoin(s.branchMenuAvailability, and(eq(s.branchMenuAvailability.menuItemId, s.menuItems.id), eq(s.branchMenuAvailability.branchId, branch.id)))
    .where(and(eq(s.menuCategories.restaurantId, branch.restaurantId), eq(s.menuItems.isActive, true)))
    .orderBy(asc(s.menuCategories.sortOrder), asc(s.menuItems.sortOrder));
}

// ─── Tickets ────────────────────────────────────────────────────────────────

async function orderBranch(orderId: string) {
  const [row] = await getDb()
    .select({ status: s.orders.status, branchId: s.diningTables.branchId, ticketNumber: s.orders.ticketNumber, tableNumber: s.diningTables.number })
    .from(s.orders)
    .innerJoin(s.tableSessions, eq(s.tableSessions.id, s.orders.sessionId))
    .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
    .where(eq(s.orders.id, orderId));
  return row;
}

/** Moves a ticket along the kitchen flow (or rejects/cancels it with a reason shown to the guest). */
export async function advanceOrder(ctx: StaffContext, orderIdInput: unknown, toInput: unknown, reasonInput?: unknown) {
  const orderId = assertId(orderIdInput, "Ticket");
  const order = await orderBranch(orderId);
  // Same answer for "doesn't exist" and "another branch's ticket"
  if (!order || !ctx.branches.some((b) => b.id === order.branchId)) throw new ActionError("Ticket not found.", 404);

  const to = toInput as OrderStatus;
  const allowed = TRANSITIONS[order.status]?.[to];
  if (!allowed) throw new ActionError(`Ticket #${order.ticketNumber} is already ${order.status}. Refreshing…`, 409);
  if (!allowed.includes(ctx.staff.role)) throw new ActionError(to === "cancelled" ? "Only a manager can cancel a ticket the kitchen has accepted." : "Your role can't make that change.", 403);
  const reason = typeof reasonInput === "string" ? reasonInput.trim().slice(0, 200) : "";
  if (to === "cancelled" && !reason) throw new ActionError("Please give a reason; the guest will see it.");

  await getDb().transaction(async (tx) => {
    // Only applies if nobody changed it since we read it (two cooks tapping at once can't skip a step)
    const [updated] = await tx
      .update(s.orders)
      .set({ status: to, updatedAt: sql`now()`, cancelReason: to === "cancelled" ? reason : undefined })
      .where(and(eq(s.orders.id, orderId), eq(s.orders.status, order.status)))
      .returning({ id: s.orders.id });
    if (!updated) throw new ActionError("Someone else just updated this ticket. Refreshing…", 409);
    await tx.insert(s.orderStatusEvents).values({ orderId, status: to, changedBy: ctx.staff.id });
  });
  await audit(ctx, `order.${to}`, { type: "order", id: orderId }, { ticket: order.ticketNumber, table: order.tableNumber, from: order.status, reason: reason || undefined }, order.branchId);
}

// ─── Service requests & tables ──────────────────────────────────────────────

export async function updateServiceRequest(ctx: StaffContext, idInput: unknown, toInput: unknown) {
  const id = assertId(idInput, "Request");
  if (toInput !== "acknowledged" && toInput !== "resolved") throw new ActionError("Unknown status.");
  const db = getDb();
  const [request] = await db
    .select({ status: s.serviceRequests.status, branchId: s.diningTables.branchId })
    .from(s.serviceRequests)
    .innerJoin(s.tableSessions, eq(s.tableSessions.id, s.serviceRequests.sessionId))
    .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
    .where(eq(s.serviceRequests.id, id));
  if (!request || !ctx.branches.some((b) => b.id === request.branchId)) throw new ActionError("Request not found.", 404);
  if (request.status === "resolved" || (request.status === "acknowledged" && toInput === "acknowledged")) return;
  await db
    .update(s.serviceRequests)
    .set(toInput === "resolved" ? { status: "resolved", resolvedAt: sql`now()`, resolvedBy: ctx.staff.id } : { status: "acknowledged" })
    .where(and(eq(s.serviceRequests.id, id), eq(s.serviceRequests.status, request.status)));
}

async function tableBranch(tableId: string) {
  const [row] = await getDb().select({ branchId: s.diningTables.branchId, number: s.diningTables.number }).from(s.diningTables).where(eq(s.diningTables.id, tableId));
  return row;
}

/** Marks a free table as being cleaned / reserved, or back to available. */
export async function setTableHold(ctx: StaffContext, tableIdInput: unknown, holdInput: unknown) {
  const tableId = assertId(tableIdInput, "Table");
  if (holdInput !== null && holdInput !== "cleaning" && holdInput !== "reserved") throw new ActionError("Unknown table status.");
  const table = await tableBranch(tableId);
  if (!table) throw new ActionError("Table not found.", 404);
  await assertBranchAccess(ctx, table.branchId);
  const [open] = await getDb()
    .select({ id: s.tableSessions.id })
    .from(s.tableSessions)
    .where(and(eq(s.tableSessions.tableId, tableId), isNull(s.tableSessions.closedAt)));
  if (open && holdInput) throw new ActionError("Guests are still seated at this table. Settle and close their bill first.");
  await getDb().update(s.diningTables).set({ hold: holdInput }).where(eq(s.diningTables.id, tableId));
  await audit(ctx, "table.status", { type: "table", id: tableId }, { table: table.number, status: holdInput ?? "available" }, table.branchId);
}

/** Marks a dish sold out (or back in stock) at the active branch. Guests see it within seconds. */
export async function setItemAvailability(ctx: StaffContext, itemIdInput: unknown, available: boolean) {
  const itemId = assertId(itemIdInput, "Menu item");
  const branch = ctx.branch;
  if (!branch) throw new ActionError("Choose a branch first.");
  const [item] = await getDb()
    .select({ name: s.menuItems.name })
    .from(s.menuItems)
    .innerJoin(s.menuCategories, eq(s.menuCategories.id, s.menuItems.categoryId))
    .where(and(eq(s.menuItems.id, itemId), eq(s.menuCategories.restaurantId, branch.restaurantId)));
  if (!item) throw new ActionError("Menu item not found.", 404);
  await getDb()
    .insert(s.branchMenuAvailability)
    .values({ branchId: branch.id, menuItemId: itemId, isAvailable: available })
    .onConflictDoUpdate({ target: [s.branchMenuAvailability.branchId, s.branchMenuAvailability.menuItemId], set: { isAvailable: available } });
  await audit(ctx, available ? "menu.back_in_stock" : "menu.sold_out", { type: "menu_item", id: itemId }, { item: item.name });
}

/** Staff keys in an order for a table (e.g. a guest without a phone). Same pricing and checks as QR orders. */
export async function placeStaffOrder(ctx: StaffContext, tableIdInput: unknown, body: unknown) {
  const tableId = assertId(tableIdInput, "Table");
  const table = await findTableById(tableId);
  if (!table) throw new ActionError("Table not found or out of service.", 404);
  await assertBranchAccess(ctx, table.branchId);
  try {
    const order = await placeOrder(table, body, ctx.staff.id);
    await audit(ctx, "order.placed_by_staff", { type: "order", id: order.id }, { ticket: order.ticketNumber, table: table.number, total: order.totalCents }, table.branchId);
    return order;
  } catch (e) {
    if (e instanceof OrderError) throw new ActionError(e.message);
    throw e;
  }
}

// ─── Payments & closing ─────────────────────────────────────────────────────

async function sessionBranch(sessionId: string) {
  const [row] = await getDb()
    .select({ branchId: s.diningTables.branchId, tableId: s.diningTables.id, tableNumber: s.diningTables.number, closedAt: s.tableSessions.closedAt })
    .from(s.tableSessions)
    .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
    .where(eq(s.tableSessions.id, sessionId));
  return row;
}

const MAX_PAYMENT_CENTS = 10_000_000; // ₱100,000 per payment

/** Records a payment taken at the table: cash (with change), or card/e-wallet on the restaurant's own terminal. */
export async function recordPayment(ctx: StaffContext, input: { sessionId: unknown; method: unknown; amountCents: unknown; tenderedCents?: unknown; reference?: unknown }) {
  const sessionId = assertId(input.sessionId, "Bill");
  const method = input.method as PaymentMethod;
  if (!["cash", "card", "e_wallet"].includes(method)) throw new ActionError("Choose cash, card or e-wallet.");
  const amount = Number(input.amountCents);
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_PAYMENT_CENTS) throw new ActionError("Enter a valid amount.");
  const session = await sessionBranch(sessionId);
  if (!session) throw new ActionError("Bill not found.", 404);
  await assertBranchAccess(ctx, session.branchId);
  if (session.closedAt) throw new ActionError("This bill is already closed.");

  const detail = await getBill(ctx, sessionId);
  if (amount > detail.bill.balanceCents) throw new ActionError(`That's more than the balance of ${(detail.bill.balanceCents / 100).toFixed(2)}.`);
  let tendered: number | null = null;
  if (method === "cash") {
    tendered = input.tenderedCents === undefined || input.tenderedCents === "" ? amount : Number(input.tenderedCents);
    if (!Number.isInteger(tendered) || tendered < amount || tendered > MAX_PAYMENT_CENTS) throw new ActionError("Cash received must be at least the amount being paid.");
  }
  const reference = typeof input.reference === "string" ? input.reference.trim().slice(0, 60) || null : null;
  if (method !== "cash" && !reference) throw new ActionError("Enter the terminal's approval / reference number.");

  const [payment] = await getDb()
    .insert(s.payments)
    .values({ sessionId, method, status: "paid", amountCents: amount, tenderedCents: tendered, referenceNumber: reference, receivedBy: ctx.staff.id, paidAt: sql`now()` })
    .returning({ id: s.payments.id });
  await audit(ctx, "payment.recorded", { type: "payment", id: payment.id }, { table: session.tableNumber, method, amount, tendered }, session.branchId);
  return { changeCents: tendered !== null ? tendered - amount : 0 };
}

async function paymentWithBranch(paymentId: string) {
  const [row] = await getDb()
    .select({ id: s.payments.id, status: s.payments.status, method: s.payments.method, amountCents: s.payments.amountCents, providerRef: s.payments.providerRef, sessionId: s.payments.sessionId, branchId: s.diningTables.branchId })
    .from(s.payments)
    .innerJoin(s.tableSessions, eq(s.tableSessions.id, s.payments.sessionId))
    .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
    .where(eq(s.payments.id, paymentId));
  return row;
}

/** Re-checks an online payment with PayMongo (e.g. the guest says they paid but the tracker hasn't caught up). */
export async function verifyPayment(ctx: StaffContext, paymentIdInput: unknown) {
  const payment = await paymentWithBranch(assertId(paymentIdInput, "Payment"));
  if (!payment) throw new ActionError("Payment not found.", 404);
  await assertBranchAccess(ctx, payment.branchId);
  if (payment.method !== "online" || !payment.providerRef) throw new ActionError("Only online payments can be verified with the provider.");
  const result = await confirmOnlinePayment(payment.providerRef);
  await audit(ctx, "payment.verified", { type: "payment", id: payment.id }, { result }, payment.branchId);
  return result;
}

/** Marks a payment refunded (managers). Online refunds must also be issued in the PayMongo dashboard. */
export async function refundPayment(ctx: StaffContext, paymentIdInput: unknown, reasonInput: unknown) {
  if (!MANAGERS.includes(ctx.staff.role)) throw new ActionError("Only a manager can refund a payment.", 403);
  const payment = await paymentWithBranch(assertId(paymentIdInput, "Payment"));
  if (!payment) throw new ActionError("Payment not found.", 404);
  await assertBranchAccess(ctx, payment.branchId);
  const reason = typeof reasonInput === "string" ? reasonInput.trim().slice(0, 200) : "";
  if (!reason) throw new ActionError("Please give a reason for the refund.");
  const [updated] = await getDb()
    .update(s.payments)
    .set({ status: "refunded" })
    .where(and(eq(s.payments.id, payment.id), eq(s.payments.status, "paid")))
    .returning({ id: s.payments.id });
  if (!updated) throw new ActionError("Only a paid payment can be refunded.");
  await audit(ctx, "payment.refunded", { type: "payment", id: payment.id }, { amount: payment.amountCents, method: payment.method, reason }, payment.branchId);
}

/** Settles a visit: requires a zero balance and nothing still in the kitchen. Frees the table for cleaning. */
export async function closeSession(ctx: StaffContext, sessionIdInput: unknown) {
  const sessionId = assertId(sessionIdInput, "Bill");
  const session = await sessionBranch(sessionId);
  if (!session) throw new ActionError("Bill not found.", 404);
  await assertBranchAccess(ctx, session.branchId);
  if (session.closedAt) throw new ActionError("This bill is already closed.");
  const detail = await getBill(ctx, sessionId);
  if (detail.bill.balanceCents > 0) throw new ActionError("There's still a balance to pay.");
  const cooking = detail.orders.filter((o) => ["submitted", "confirmed", "preparing", "ready"].includes(o.status));
  if (cooking.length) throw new ActionError(`Ticket #${cooking[0].ticketNumber} is still ${cooking[0].status}. Serve or cancel it first.`);
  if (detail.bill.payments.some((p) => p.status === "pending")) throw new ActionError("An online payment is still in progress. Verify it first.");

  await getDb().transaction(async (tx) => {
    const [closed] = await tx
      .update(s.tableSessions)
      .set({ closedAt: sql`now()`, closedBy: ctx.staff.id })
      .where(and(eq(s.tableSessions.id, sessionId), isNull(s.tableSessions.closedAt)))
      .returning({ id: s.tableSessions.id });
    if (!closed) throw new ActionError("This bill was just closed by someone else.");
    const served = await tx
      .update(s.orders)
      .set({ status: "completed", updatedAt: sql`now()` })
      .where(and(eq(s.orders.sessionId, sessionId), eq(s.orders.status, "served")))
      .returning({ id: s.orders.id });
    if (served.length) await tx.insert(s.orderStatusEvents).values(served.map((o) => ({ orderId: o.id, status: "completed" as const, changedBy: ctx.staff.id })));
    await tx
      .update(s.serviceRequests)
      .set({ status: "resolved", resolvedAt: sql`now()`, resolvedBy: ctx.staff.id })
      .where(and(eq(s.serviceRequests.sessionId, sessionId), ne(s.serviceRequests.status, "resolved")));
    // The old QR session is over: the next scan starts a fresh bill. Table goes to cleaning.
    await tx.update(s.diningTables).set({ hold: "cleaning" }).where(eq(s.diningTables.id, session.tableId));
  });
  await audit(ctx, "bill.closed", { type: "session", id: sessionId }, { table: session.tableNumber, total: detail.bill.totalCents }, session.branchId);
}

/** Payments taken today at a branch (the cashier's shift view). */
export async function todaysPayments(branchId: string) {
  return getDb()
    .select({
      id: s.payments.id,
      method: s.payments.method,
      status: s.payments.status,
      channel: s.payments.channel,
      amountCents: s.payments.amountCents,
      paidAt: s.payments.paidAt,
      tableNumber: s.diningTables.number,
      receivedBy: s.users.fullName,
      sessionId: s.payments.sessionId,
    })
    .from(s.payments)
    .innerJoin(s.tableSessions, eq(s.tableSessions.id, s.payments.sessionId))
    .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
    .leftJoin(s.users, eq(s.users.id, s.payments.receivedBy))
    .where(and(eq(s.diningTables.branchId, branchId), gte(s.payments.createdAt, startOfToday()), inArray(s.payments.status, ["paid", "refunded"])))
    .orderBy(desc(s.payments.createdAt));
}
