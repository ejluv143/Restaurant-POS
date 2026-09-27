import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

// Server-only aggregate queries for the dashboard and reports. Callers pass branch ids they have already
// checked the user may see. Days are counted in the restaurant's local time.

export const REPORT_TZ = process.env.APP_TIMEZONE ?? "Asia/Manila";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface Range {
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
}

/** Today's date in the report timezone, as YYYY-MM-DD. */
export function localDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Validates a user-supplied range (defaults: last 7 days), capped at 366 days. */
export function parseRange(from: unknown, to: unknown): Range {
  const f = typeof from === "string" && DATE_RE.test(from) ? from : localDate(-6);
  const t = typeof to === "string" && DATE_RE.test(to) ? to : localDate();
  const [a, b] = f <= t ? [f, t] : [t, f];
  const days = (Date.parse(b) - Date.parse(a)) / 86_400_000;
  return days > 366 ? { from: new Date(Date.parse(b) - 366 * 86_400_000).toISOString().slice(0, 10), to: b } : { from: a, to: b };
}

/**
 * Which branches a report covers: "all" = every branch of the active restaurant the user may see (one
 * currency), a specific accessible branch id, or the active branch by default.
 */
export function reportBranches(ctx: { branches: { id: string; restaurantId: string }[]; branch: { id: string; restaurantId: string } | null }, param: unknown): string[] {
  if (!ctx.branch) return [];
  if (param === "all") return ctx.branches.filter((b) => b.restaurantId === ctx.branch!.restaurantId).map((b) => b.id);
  if (typeof param === "string" && ctx.branches.some((b) => b.id === param)) return [param];
  return [ctx.branch.id];
}

const start = (d: string) => sql`((${d}::date)::timestamp at time zone ${REPORT_TZ})`;
const end = (d: string) => sql`(((${d}::date) + 1)::timestamp at time zone ${REPORT_TZ})`;
const inRange = (col: SQL | typeof s.payments.paidAt, r: Range) => sql`${col} >= ${start(r.from)} and ${col} < ${end(r.to)}`;
const branchIn = (branchIds: string[]) => (branchIds.length ? sql`t.branch_id in (${sql.join(branchIds.map((id) => sql`${id}::uuid`), sql`, `)})` : sql`false`);

const rows = async <T,>(q: SQL) => (await getDb().execute(q)) as unknown as T[];

export interface Summary {
  salesCents: number;
  payments: number;
  orders: number;
  pending: number;
  completed: number;
  cancelled: number;
  avgOrderCents: number;
  byMethod: { method: string; channel: string | null; cents: number; count: number }[];
  refundedCents: number;
}

export async function summary(branchIds: string[], r: Range): Promise<Summary> {
  const [orders, pay, refunds] = await Promise.all([
    rows<{ orders: number; pending: number; completed: number; cancelled: number; avg: number }>(sql`
      with o as (
        select o.status, o.tax_rate_bp, coalesce(sum(oi.quantity * oi.unit_price_cents), 0) as sub
        from ${s.orders} o
        join ${s.tableSessions} ts on ts.id = o.session_id
        join ${s.diningTables} t on t.id = ts.table_id
        left join ${s.orderItems} oi on oi.order_id = o.id
        where ${branchIn(branchIds)} and ${inRange(sql`o.placed_at`, r)}
        group by o.id)
      select count(*) filter (where status <> 'cancelled')::int as orders,
        count(*) filter (where status in ('submitted','confirmed','preparing','ready'))::int as pending,
        count(*) filter (where status in ('served','completed'))::int as completed,
        count(*) filter (where status = 'cancelled')::int as cancelled,
        coalesce(avg(sub + round(sub * tax_rate_bp / 10000.0)) filter (where status <> 'cancelled'), 0)::int as avg
      from o`),
    rows<{ method: string; channel: string | null; cents: number; count: number }>(sql`
      select p.method, p.channel, sum(p.amount_cents)::int as cents, count(*)::int as count
      from ${s.payments} p
      join ${s.tableSessions} ts on ts.id = p.session_id
      join ${s.diningTables} t on t.id = ts.table_id
      where ${branchIn(branchIds)} and p.status = 'paid' and ${inRange(sql`p.paid_at`, r)}
      group by p.method, p.channel order by cents desc`),
    rows<{ cents: number }>(sql`
      select coalesce(sum(p.amount_cents), 0)::int as cents
      from ${s.payments} p
      join ${s.tableSessions} ts on ts.id = p.session_id
      join ${s.diningTables} t on t.id = ts.table_id
      where ${branchIn(branchIds)} and p.status = 'refunded' and ${inRange(sql`p.paid_at`, r)}`),
  ]);
  const o = orders[0];
  return {
    salesCents: pay.reduce((sum, p) => sum + p.cents, 0),
    payments: pay.reduce((sum, p) => sum + p.count, 0),
    orders: o.orders,
    pending: o.pending,
    completed: o.completed,
    cancelled: o.cancelled,
    avgOrderCents: o.avg,
    byMethod: pay,
    refundedCents: refunds[0].cents,
  };
}

/** Sales and order counts per local day (every day in the range, zero-filled). */
export async function dailySales(branchIds: string[], r: Range) {
  const data = await rows<{ day: string; cents: number; orders: number }>(sql`
    with days as (select generate_series(${r.from}::date, ${r.to}::date, interval '1 day')::date as day),
    pay as (
      select (p.paid_at at time zone ${REPORT_TZ})::date as day, sum(p.amount_cents)::int as cents
      from ${s.payments} p
      join ${s.tableSessions} ts on ts.id = p.session_id
      join ${s.diningTables} t on t.id = ts.table_id
      where ${branchIn(branchIds)} and p.status = 'paid' and ${inRange(sql`p.paid_at`, r)}
      group by 1),
    ord as (
      select (o.placed_at at time zone ${REPORT_TZ})::date as day, count(*)::int as orders
      from ${s.orders} o
      join ${s.tableSessions} ts on ts.id = o.session_id
      join ${s.diningTables} t on t.id = ts.table_id
      where ${branchIn(branchIds)} and o.status <> 'cancelled' and ${inRange(sql`o.placed_at`, r)}
      group by 1)
    select to_char(days.day, 'YYYY-MM-DD') as day, coalesce(pay.cents, 0)::int as cents, coalesce(ord.orders, 0)::int as orders
    from days left join pay using (day) left join ord using (day) order by days.day`);
  return data;
}

export async function topItems(branchIds: string[], r: Range, limit = 10) {
  return rows<{ name: string; category: string; quantity: number; cents: number }>(sql`
    select mi.name, mc.name as category, sum(oi.quantity)::int as quantity, sum(oi.quantity * oi.unit_price_cents)::int as cents
    from ${s.orderItems} oi
    join ${s.orders} o on o.id = oi.order_id
    join ${s.tableSessions} ts on ts.id = o.session_id
    join ${s.diningTables} t on t.id = ts.table_id
    join ${s.menuItems} mi on mi.id = oi.menu_item_id
    join ${s.menuCategories} mc on mc.id = mi.category_id
    where ${branchIn(branchIds)} and o.status <> 'cancelled' and ${inRange(sql`o.placed_at`, r)}
    group by mi.id, mc.name order by quantity desc, cents desc limit ${limit}`);
}

export async function branchPerformance(branchIds: string[], r: Range) {
  return rows<{ branch: string; cents: number; orders: number; rating: number | null }>(sql`
    select b.name as branch,
      coalesce((select sum(p.amount_cents) from ${s.payments} p join ${s.tableSessions} ts on ts.id = p.session_id join ${s.diningTables} t on t.id = ts.table_id
        where t.branch_id = b.id and p.status = 'paid' and ${inRange(sql`p.paid_at`, r)}), 0)::int as cents,
      (select count(*) from ${s.orders} o join ${s.tableSessions} ts on ts.id = o.session_id join ${s.diningTables} t on t.id = ts.table_id
        where t.branch_id = b.id and o.status <> 'cancelled' and ${inRange(sql`o.placed_at`, r)})::int as orders,
      (select round(avg(f.rating)::numeric, 1)::float from ${s.feedback} f join ${s.tableSessions} ts on ts.id = f.session_id join ${s.diningTables} t on t.id = ts.table_id
        where t.branch_id = b.id and ${inRange(sql`f.created_at`, r)}) as rating
    from ${s.branches} b where b.id in (${branchIds.length ? sql.join(branchIds.map((id) => sql`${id}::uuid`), sql`, `) : sql`null`})
    order by cents desc`);
}

export async function staffTransactions(branchIds: string[], r: Range) {
  return rows<{ name: string; role: string; payments: number; cents: number }>(sql`
    select u.full_name as name, u.role, count(*)::int as payments, sum(p.amount_cents)::int as cents
    from ${s.payments} p
    join ${s.users} u on u.id = p.received_by
    join ${s.tableSessions} ts on ts.id = p.session_id
    join ${s.diningTables} t on t.id = ts.table_id
    where ${branchIn(branchIds)} and p.status = 'paid' and ${inRange(sql`p.paid_at`, r)}
    group by u.id order by cents desc`);
}

/** Median minutes from order to ready, per day, as a kitchen performance signal. */
export async function kitchenTimes(branchIds: string[], r: Range) {
  const [row] = await rows<{ median: number | null; tickets: number }>(sql`
    select percentile_cont(0.5) within group (order by extract(epoch from (e.changed_at - o.placed_at)) / 60)::float as median, count(*)::int as tickets
    from ${s.orders} o
    join ${s.orderStatusEvents} e on e.order_id = o.id and e.status = 'ready'
    join ${s.tableSessions} ts on ts.id = o.session_id
    join ${s.diningTables} t on t.id = ts.table_id
    where ${branchIn(branchIds)} and ${inRange(sql`o.placed_at`, r)}`);
  return row;
}

/** Individual paid/refunded payments for CSV export. */
export async function paymentRows(branchIds: string[], r: Range) {
  return rows<{ paid_at: string; branch: string; table_number: string; method: string; channel: string | null; status: string; amount_cents: number; reference_number: string | null; received_by: string | null }>(sql`
    select to_char(p.paid_at at time zone ${REPORT_TZ}, 'YYYY-MM-DD HH24:MI') as paid_at, b.name as branch, t.number as table_number, p.method, p.channel, p.status,
      p.amount_cents, p.reference_number, u.full_name as received_by
    from ${s.payments} p
    join ${s.tableSessions} ts on ts.id = p.session_id
    join ${s.diningTables} t on t.id = ts.table_id
    join ${s.branches} b on b.id = t.branch_id
    left join ${s.users} u on u.id = p.received_by
    where ${branchIn(branchIds)} and p.status in ('paid', 'refunded') and ${inRange(sql`p.paid_at`, r)}
    order by p.paid_at`);
}
