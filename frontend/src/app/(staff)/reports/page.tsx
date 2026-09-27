import type { Metadata } from "next";
import PrintButton from "@/components/table/PrintButton";
import { Card, DataTable, EmptyState, Icon, PageHeader, StatCard, btn, input } from "@/components/ui";
import { branchPerformance, dailySales, kitchenTimes, localDate, parseRange, reportBranches, staffTransactions, summary, topItems } from "@/lib/reports";
import { ROLE_LABEL, rolesFor, type StaffRole } from "@/lib/staffAccess";
import { getStaffContext } from "@/lib/staffContext";
import { CHANNEL_LABEL, PAYMENT_METHOD_LABEL, formatCents, type PaymentMethod } from "@/lib/tableOrder";

export const metadata: Metadata = { title: "Reports" };

const PRESETS = [
  { label: "Today", from: 0, to: 0 },
  { label: "Last 7 days", from: -6, to: 0 },
  { label: "Last 30 days", from: -29, to: 0 },
];

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const ctx = await getStaffContext(rolesFor("/reports"));
  if (!ctx.branch) return <EmptyState icon="storefront" title="No branch assigned">Ask an administrator to assign you to a branch.</EmptyState>;
  const sp = await searchParams;
  const range = parseRange(sp.from, sp.to);
  const branchParam = typeof sp.branch === "string" ? sp.branch : ctx.branch.id;
  const ids = reportBranches(ctx, branchParam);
  const restaurantBranches = ctx.branches.filter((b) => b.restaurantId === ctx.branch!.restaurantId);
  const scopeLabel = branchParam === "all" ? `All ${ctx.branch.restaurant} branches` : (ctx.branches.find((b) => b.id === ids[0])?.name ?? ctx.branch.name);

  const [sum, days, items, perf, staff, kitchen] = await Promise.all([
    summary(ids, range),
    dailySales(ids, range),
    topItems(ids, range, 15),
    ids.length > 1 ? branchPerformance(ids, range) : Promise.resolve([]),
    staffTransactions(ids, range),
    kitchenTimes(ids, range),
  ]);
  const money = (c: number) => formatCents(c, ctx.branch!.currency);
  const maxDay = Math.max(1, ...days.map((d) => d.cents));
  const qs = new URLSearchParams({ from: range.from, to: range.to, branch: branchParam }).toString();

  return (
    <>
      <PageHeader title="Reports" icon="monitoring" subtitle={`${scopeLabel} • ${range.from === range.to ? range.from : `${range.from} to ${range.to}`}`} actions={<PrintButton label="Print report" />} />

      <form method="get" className="mb-6 rounded-xl bg-surface-container-low border border-outline-variant/30 p-4 flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface-variant">From</span>
          <input type="date" name="from" defaultValue={range.from} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface-variant">To</span>
          <input type="date" name="to" defaultValue={range.to} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface-variant">Branch</span>
          <select name="branch" defaultValue={branchParam} className={input}>
            {restaurantBranches.length > 1 && <option value="all">All branches</option>}
            {restaurantBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={btn.primary}>
          <Icon name="filter_alt" className="text-[18px]" />
          Apply
        </button>
        <span className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <a key={p.label} href={`?${new URLSearchParams({ from: localDate(p.from), to: localDate(p.to), branch: branchParam })}`} className={btn.ghost}>
              {p.label}
            </a>
          ))}
        </span>
      </form>

      <div className="print-area flex flex-col gap-5">
      <p className="hidden print:block font-headline-sm text-headline-sm">{ctx.branch.restaurant} • {scopeLabel} • {range.from} to {range.to}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sales" value={money(sum.salesCents)} hint={`${sum.payments} payments${sum.refundedCents ? ` • ${money(sum.refundedCents)} refunded` : ""}`} icon="payments" />
        <StatCard label="Orders" value={sum.orders} hint={`${sum.completed} completed • ${sum.cancelled} cancelled`} icon="receipt_long" tone="secondary" />
        <StatCard label="Average order" value={money(sum.avgOrderCents)} hint="Incl. VAT" icon="price_check" tone="tertiary" />
        <StatCard label="Kitchen speed" value={kitchen?.median ? `${Math.round(kitchen.median)} min` : "—"} hint={`Median order → ready (${kitchen?.tickets ?? 0} tickets)`} icon="timer" tone="neutral" />
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Daily sales" icon="bar_chart" actions={<ExportLink qs={qs} type="daily" />}>
          <DataTable head={["Date", "Sales", "Orders", ""]}>
            {days.map((d) => (
              <tr key={d.day}>
                <td className="py-2 pr-4 whitespace-nowrap">{new Date(`${d.day}T00:00:00`).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}</td>
                <td className="py-2 pr-4 tabular-nums">{money(d.cents)}</td>
                <td className="py-2 pr-4 tabular-nums">{d.orders}</td>
                <td className="py-2 w-1/3">
                  <div className="h-2.5 rounded-full bg-surface-container-highest overflow-hidden">
                    <div className="h-full bg-primary-container rounded-full" style={{ width: `${(d.cents / maxDay) * 100}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>

        <Card title="Payments by method" icon="account_balance_wallet" actions={<ExportLink qs={qs} type="payments" />}>
          {sum.byMethod.length === 0 ? (
            <p className="text-on-surface-variant">No payments in this period.</p>
          ) : (
            <DataTable head={["Method", "Payments", "Amount", "Share"]}>
              {sum.byMethod.map((m) => (
                <tr key={`${m.method}-${m.channel}`}>
                  <td className="py-2 pr-4">{m.method === "online" ? `Online • ${m.channel ? (CHANNEL_LABEL[m.channel] ?? m.channel) : "PayMongo"}` : PAYMENT_METHOD_LABEL[m.method as PaymentMethod]}</td>
                  <td className="py-2 pr-4 tabular-nums">{m.count}</td>
                  <td className="py-2 pr-4 tabular-nums">{money(m.cents)}</td>
                  <td className="py-2 pr-4 tabular-nums">{sum.salesCents ? Math.round((m.cents / sum.salesCents) * 100) : 0}%</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>

        <Card title="Product sales" icon="local_fire_department" actions={<ExportLink qs={qs} type="items" />}>
          {items.length === 0 ? (
            <p className="text-on-surface-variant">No orders in this period.</p>
          ) : (
            <DataTable head={["Item", "Category", "Sold", "Revenue (ex-VAT)"]}>
              {items.map((i) => (
                <tr key={i.name}>
                  <td className="py-2 pr-4">{i.name}</td>
                  <td className="py-2 pr-4 text-on-surface-variant">{i.category}</td>
                  <td className="py-2 pr-4 tabular-nums">{i.quantity}</td>
                  <td className="py-2 pr-4 tabular-nums">{money(i.cents)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>

        <Card title="Cashier transactions" icon="badge" actions={<ExportLink qs={qs} type="staff" />}>
          {staff.length === 0 ? (
            <p className="text-on-surface-variant">No staff-recorded payments in this period (online payments are recorded automatically).</p>
          ) : (
            <DataTable head={["Staff", "Role", "Payments", "Amount"]}>
              {staff.map((st) => (
                <tr key={st.name}>
                  <td className="py-2 pr-4">{st.name}</td>
                  <td className="py-2 pr-4 text-on-surface-variant">{ROLE_LABEL[st.role as StaffRole] ?? st.role}</td>
                  <td className="py-2 pr-4 tabular-nums">{st.payments}</td>
                  <td className="py-2 pr-4 tabular-nums">{money(st.cents)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
      </div>

      {perf.length > 0 && (
        <Card title="Branch performance" icon="storefront" className="mt-5">
          <DataTable head={["Branch", "Sales", "Orders", "Avg rating"]}>
            {perf.map((p) => (
              <tr key={p.branch}>
                <td className="py-2 pr-4">{p.branch}</td>
                <td className="py-2 pr-4 tabular-nums">{money(p.cents)}</td>
                <td className="py-2 pr-4 tabular-nums">{p.orders}</td>
                <td className="py-2 pr-4 tabular-nums">{p.rating ?? "—"}</td>
              </tr>
            ))}
          </DataTable>
        </Card>
      )}
      </div>
    </>
  );
}

function ExportLink({ qs, type }: { qs: string; type: string }) {
  return (
    <a href={`/api/staff/reports/export?${qs}&type=${type}`} className={`${btn.ghost} print:hidden`} download>
      <Icon name="download" className="text-[16px]" />
      CSV
    </a>
  );
}
