import type { Metadata } from "next";
import CashierBoard from "@/components/staff/CashierBoard";
import { Badge, Card, DataTable, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { getBill, getFloor, todaysPayments } from "@/lib/operations";
import { MANAGERS, rolesFor } from "@/lib/staffAccess";
import { ActionError, getStaffContext } from "@/lib/staffContext";
import { CHANNEL_LABEL, PAYMENT_METHOD_LABEL, formatCents, tableLabel } from "@/lib/tableOrder";

export const metadata: Metadata = { title: "Cashier & Bills" };

export default async function CashierPage({ searchParams }: PageProps<"/cashier">) {
  const ctx = await getStaffContext(rolesFor("/cashier"));
  if (!ctx.branch) return <EmptyState icon="storefront" title="No branch assigned">Ask an administrator to assign you to a branch.</EmptyState>;
  const { bill: billParam } = await searchParams;
  const [tables, payments, bill] = await Promise.all([
    getFloor(ctx.branch.id),
    todaysPayments(ctx.branch.id),
    typeof billParam === "string" ? getBill(ctx, billParam).catch((e) => (e instanceof ActionError ? null : Promise.reject(e))) : null,
  ]);
  const money = (c: number) => formatCents(c, ctx.branch!.currency);
  const paid = payments.filter((p) => p.status === "paid");
  const sum = (f: (p: (typeof paid)[number]) => boolean) => paid.filter(f).reduce((s, p) => s + p.amountCents, 0);
  const refunded = payments.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amountCents, 0);

  return (
    <>
      <PageHeader title="Cashier & Bills" icon="point_of_sale" subtitle={`${ctx.branch.name} • Take payments, verify online payments, print receipts and close tables.`} />
      <CashierBoard initialFloor={{ tables, serverTime: new Date().toISOString() }} initialBill={bill} currency={ctx.branch.currency} isManager={MANAGERS.includes(ctx.staff.role)} />

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <StatCard label="Collected today" value={money(sum(() => true))} hint={`${paid.length} payments`} icon="savings" />
        <StatCard label="Cash" value={money(sum((p) => p.method === "cash"))} icon="payments" tone="secondary" />
        <StatCard label="Online (PayMongo)" value={money(sum((p) => p.method === "online"))} icon="qr_code_2" tone="tertiary" />
        <StatCard label="Card / e-wallet terminal" value={money(sum((p) => p.method === "card" || p.method === "e_wallet"))} hint={refunded ? `Refunded ${money(refunded)}` : undefined} icon="credit_card" tone="neutral" />
      </div>

      <Card title="Today's transactions" icon="receipt" className="mt-5 print:hidden">
        <DataTable
          head={["Time", "Table", "Method", "Received by", "Status", "Amount"]}
          empty={payments.length === 0 && <p className="py-6 text-center text-on-surface-variant">No payments yet today.</p>}
        >
          {payments.map((p) => (
            <tr key={p.id}>
              <td className="py-2.5 pr-4 whitespace-nowrap">{p.paidAt?.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }) ?? "—"}</td>
              <td className="py-2.5 pr-4">{tableLabel(p.tableNumber)}</td>
              <td className="py-2.5 pr-4">{p.method === "online" ? `Online${p.channel ? ` • ${CHANNEL_LABEL[p.channel] ?? p.channel}` : ""}` : PAYMENT_METHOD_LABEL[p.method]}</td>
              <td className="py-2.5 pr-4 text-on-surface-variant">{p.receivedBy ?? "Guest (online)"}</td>
              <td className="py-2.5 pr-4">
                <Badge className={p.status === "paid" ? "border-tertiary/40 text-tertiary" : "border-error/40 text-error"}>{p.status}</Badge>
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">{money(p.amountCents)}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  );
}
