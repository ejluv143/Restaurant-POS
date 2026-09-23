"use client";

import { useState } from "react";
import Receipt from "@/components/Receipt";
import { money, round2 } from "@/lib/format";
import { clearOrders, useOrders } from "@/lib/orders";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  const orders = useOrders();
  const [selected, setSelected] = useState<Order | null>(null);

  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const sales = round2(todays.reduce((s, o) => s + o.total, 0));
  const cash = round2(todays.filter((o) => o.paymentMethod === "cash").reduce((s, o) => s + o.total, 0));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Orders today" value={String(todays.length)} />
        <Stat label="Sales today" value={money(sales)} />
        <Stat label="Cash" value={money(cash)} />
        <Stat label="Card" value={money(round2(sales - cash))} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Order History</h2>
        <button
          disabled={orders.length === 0}
          onClick={() => confirm("Delete all order history?") && clearOrders()}
          className="text-sm text-red-600 hover:underline disabled:opacity-40"
        >
          Clear history
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Time</th>
              <th className="p-3">Type</th>
              <th className="p-3">Items</th>
              <th className="p-3">Payment</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-zinc-500">
                  No orders yet.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr
                key={o.id}
                onClick={() => setSelected(o)}
                className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
              >
                <td className="p-3 font-medium">{o.number}</td>
                <td className="p-3">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="p-3 capitalize">
                  {o.orderType}
                  {o.table ? ` (T${o.table})` : ""}
                </td>
                <td className="p-3">{o.lines.reduce((n, l) => n + l.qty, 0)}</td>
                <td className="p-3 capitalize">{o.paymentMethod}</td>
                <td className="p-3 text-right tabular-nums">{money(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <Receipt order={selected} onClose={() => setSelected(null)} closeLabel="Close" />}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
