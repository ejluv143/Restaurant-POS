"use client";

import { money } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function Receipt({
  order,
  onClose,
  closeLabel = "New Order",
}: {
  order: Order;
  onClose: () => void;
  closeLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:bg-white print:p-0">
      <div className="print-area w-full max-w-sm rounded-2xl bg-white p-6 font-mono text-sm text-zinc-900 shadow-xl print:shadow-none">
        <div className="text-center">
          <p className="text-lg font-bold">🍽️ THE RESTAURANT</p>
          <p>Order #{order.number}</p>
          <p className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</p>
          <p className="mt-1 capitalize">
            {order.orderType}
            {order.table ? ` · Table ${order.table}` : ""}
          </p>
        </div>
        <hr className="my-3 border-dashed border-zinc-400" />
        {order.lines.map(({ item, qty }) => (
          <div key={item.id} className="flex justify-between">
            <span>
              {qty} × {item.name}
            </span>
            <span>{money(item.price * qty)}</span>
          </div>
        ))}
        <hr className="my-3 border-dashed border-zinc-400" />
        <Line label="Subtotal" value={order.subtotal} />
        {order.discount > 0 && <Line label="Discount" value={-order.discount} />}
        <Line label="Tax" value={order.tax} />
        <div className="mt-1 flex justify-between text-base font-bold">
          <span>TOTAL</span>
          <span>{money(order.total)}</span>
        </div>
        <hr className="my-3 border-dashed border-zinc-400" />
        <Line label={`Paid (${order.paymentMethod})`} value={order.tendered} />
        <Line label="Change" value={order.change} />
        <p className="mt-4 text-center">Thank you! Come again.</p>

        <div className="mt-6 flex gap-2 font-sans print:hidden">
          <button onClick={() => window.print()} className="flex-1 rounded-lg bg-zinc-200 py-3 font-medium">
            🖨️ Print
          </button>
          <button onClick={onClose} className="flex-1 rounded-lg bg-orange-500 py-3 font-semibold text-white">
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="capitalize">{label}</span>
      <span>{money(value)}</span>
    </div>
  );
}
