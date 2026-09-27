import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { Badge, Card, EmptyState, Icon, PageHeader, StatCard, btn } from "@/components/ui";
import { getDb, schema as s } from "@/db";
import { branchPerformance, dailySales, kitchenTimes, localDate, summary, topItems } from "@/lib/reports";
import { ADMINS, rolesFor } from "@/lib/staffAccess";
import { getStaffContext } from "@/lib/staffContext";
import { CHANNEL_LABEL, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, formatCents, orderNumber, tableLabel, type PaymentMethod } from "@/lib/tableOrder";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await getStaffContext(rolesFor("/dashboard"));
  if (!ctx.branch) return <EmptyState icon="storefront" title="No branch yet">Create a branch under Branches &amp; Payments to get started.</EmptyState>;
  const branch = ctx.branch;
  const ids = [branch.id];
  const today = { from: localDate(), to: localDate() };
  const week = { from: localDate(-6), to: localDate() };
  const isAdmin = ADMINS.includes(ctx.staff.role);
  const restaurantBranches = ctx.branches.filter((b) => b.restaurantId === branch.restaurantId).map((b) => b.id);

  const [todayStats, days, popular, kitchen, perf, recent, rating] = await Promise.all([
    summary(ids, today),
    dailySales(ids, week),
    topItems(ids, week, 6),
    kitchenTimes(ids, today),
    isAdmin && restaurantBranches.length > 1 ? branchPerformance(restaurantBranches, today) : Promise.resolve([]),
    getDb()
      .select({ id: s.orders.id, ticketNumber: s.orders.ticketNumber, status: s.orders.status, placedAt: s.orders.placedAt, tableNumber: s.diningTables.number })
      .from(s.orders)
      .innerJoin(s.tableSessions, eq(s.tableSessions.id, s.orders.sessionId))
      .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
      .where(eq(s.diningTables.branchId, branch.id))
      .orderBy(desc(s.orders.placedAt))
      .limit(8),
    getDb()
      .select({ avg: sql<number | null>`round(avg(${s.feedback.rating})::numeric, 1)::float`, count: sql<number>`count(*)::int` })
      .from(s.feedback)
      .innerJoin(s.tableSessions, eq(s.tableSessions.id, s.feedback.sessionId))
      .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
      .where(sql`${s.diningTables.branchId} = ${branch.id} and ${s.feedback.createdAt} > now() - interval '30 days'`),
  ]);
  const money = (c: number) => formatCents(c, branch.currency);
  const maxDay = Math.max(1, ...days.map((d) => d.cents));
  const weekTotal = days.reduce((sum, d) => sum + d.cents, 0);

  return (
    <>
      <PageHeader
        title={`Good day, ${ctx.staff.fullName.split(" ")[0]}`}
        icon="space_dashboard"
        subtitle={`${branch.restaurant} • ${branch.name} • Today at a glance`}
        actions={
          <Link href="/reports" className={btn.secondary}>
            <Icon name="monitoring" className="text-[18px]" />
            Full reports
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Today's sales" value={money(todayStats.salesCents)} hint={`${todayStats.payments} payments`} icon="payments" />
        <StatCard label="Today's orders" value={todayStats.orders} hint={`Avg ${money(todayStats.avgOrderCents)}`} icon="receipt_long" tone="secondary" />
        <StatCard label="Pending" value={todayStats.pending} hint="In the kitchen now" icon="pending_actions" tone="neutral" />
        <StatCard label="Completed" value={todayStats.completed} hint={kitchen?.median ? `Median ${Math.round(kitchen.median)} min to ready` : "Served & settled"} icon="task_alt" tone="tertiary" />
        <StatCard label="Cancelled" value={todayStats.cancelled} hint="Rejected or cancelled" icon="cancel" tone="error" />
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card title="Sales, last 7 days" icon="bar_chart" className="xl:col-span-2" actions={<span className="font-label-lg text-label-lg text-primary tabular-nums">{money(weekTotal)}</span>}>
          <div className="h-56 flex items-end gap-2 sm:gap-4" role="img" aria-label={`Daily sales: ${days.map((d) => `${d.day} ${money(d.cents)}`).join(", ")}`}>
            {days.map((d) => (
              <div key={d.day} className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 min-w-0">
                <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums truncate max-w-full">{d.cents ? money(d.cents).replace(/\.\d\d$/, "") : "—"}</span>
                <div className="w-full max-w-14 rounded-t-md bg-linear-to-t from-primary-container/60 to-primary-container" style={{ height: `${Math.max(2, (d.cents / maxDay) * 100)}%` }} />
                <span className="font-label-sm text-label-sm text-outline">{new Date(`${d.day}T00:00:00`).toLocaleDateString("en-PH", { weekday: "short" })}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Payment summary (today)" icon="account_balance_wallet">
          {todayStats.byMethod.length === 0 ? (
            <p className="text-on-surface-variant">No payments yet today.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {todayStats.byMethod.map((m) => (
                <li key={`${m.method}-${m.channel}`} className="flex items-center justify-between gap-3">
                  <span className="text-on-surface">
                    {m.method === "online" ? `Online • ${m.channel ? (CHANNEL_LABEL[m.channel] ?? m.channel) : "PayMongo"}` : PAYMENT_METHOD_LABEL[m.method as PaymentMethod]}
                    <span className="text-on-surface-variant"> ({m.count})</span>
                  </span>
                  <span className="font-label-lg text-label-lg tabular-nums text-on-surface">{money(m.cents)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
            <span className="text-on-surface-variant">Customer rating (30 days)</span>
            <span className="flex items-center gap-1 font-label-lg text-label-lg text-secondary">
              <Icon name="star" filled className="text-[18px]" />
              {rating[0]?.avg ?? "—"} <span className="text-on-surface-variant font-body-sm text-body-sm">({rating[0]?.count ?? 0})</span>
            </span>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card title="Popular items (7 days)" icon="local_fire_department">
          {popular.length === 0 ? (
            <p className="text-on-surface-variant">No orders yet.</p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {popular.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-surface-container-high text-primary font-label-md text-label-md flex items-center justify-center">{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-on-surface truncate">{p.name}</span>
                    <span className="block font-body-sm text-body-sm text-outline">{p.category}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-label-lg text-label-lg text-on-surface tabular-nums">{p.quantity} sold</span>
                    <span className="block font-body-sm text-body-sm text-on-surface-variant tabular-nums">{money(p.cents)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Recent orders" icon="history" className="xl:col-span-2" actions={<Link href="/kitchen" className={btn.ghost}>Kitchen →</Link>}>
          {recent.length === 0 ? (
            <p className="text-on-surface-variant">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-outline-variant/20">
              {recent.map((o) => (
                <li key={o.id} className="py-2.5 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-label-lg text-label-lg text-on-surface">{orderNumber(o.ticketNumber, o.placedAt)}</span>
                    <span className="block font-body-sm text-body-sm text-on-surface-variant">
                      {tableLabel(o.tableNumber)} • {o.placedAt.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </span>
                  <Badge className={o.status === "cancelled" ? "border-error/40 text-error" : o.status === "completed" || o.status === "served" ? "border-tertiary/40 text-tertiary" : "border-secondary/40 text-secondary"}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {perf.length > 0 && (
        <Card title="Branch performance (today)" icon="storefront" className="mt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {perf.map((p) => (
              <div key={p.branch} className="rounded-lg bg-surface-container border border-outline-variant/30 p-4">
                <p className="font-label-lg text-label-lg text-on-surface">{p.branch}</p>
                <p className="mt-1 font-headline-md text-headline-md text-primary tabular-nums">{money(p.cents)}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {p.orders} orders • Rating {p.rating ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
