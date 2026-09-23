"use client";

import { money } from "@/lib/format";
import type { CartLine, OrderType } from "@/lib/types";

interface Props {
  lines: CartLine[];
  orderType: OrderType;
  table: string;
  discountPct: number;
  totals: { subtotal: number; discount: number; tax: number; total: number };
  onQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onOrderType: (t: OrderType) => void;
  onTable: (t: string) => void;
  onDiscount: (pct: number) => void;
  onCharge: () => void;
}

export default function Cart(p: Props) {
  const empty = p.lines.length === 0;

  return (
    <aside className="flex w-full flex-col border-t border-zinc-200 bg-white lg:w-96 lg:border-l lg:border-t-0 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Current Order</h2>
        <button
          onClick={p.onClear}
          disabled={empty}
          className="text-sm text-red-600 hover:underline disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      <div className="flex gap-2 p-4 pb-0">
        {(["dine-in", "takeout"] as const).map((t) => (
          <button
            key={t}
            onClick={() => p.onOrderType(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize ${
              p.orderType === t ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {p.orderType === "dine-in" && (
        <div className="px-4 pt-3">
          <input
            value={p.table}
            onChange={(e) => p.onTable(e.target.value)}
            placeholder="Table #"
            className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-zinc-700"
          />
        </div>
      )}

      <ul className="min-h-40 flex-1 divide-y divide-zinc-100 overflow-y-auto p-4 dark:divide-zinc-800">
        {empty && <li className="py-10 text-center text-zinc-500">Tap a menu item to add it.</li>}
        {p.lines.map(({ item, qty }) => (
          <li key={item.id} className="flex items-center gap-3 py-2">
            <span className="text-2xl">{item.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.name}</p>
              <p className="text-xs text-zinc-500">{money(item.price)} each</p>
            </div>
            <div className="flex items-center gap-1">
              <QtyButton onClick={() => p.onQty(item.id, -1)}>−</QtyButton>
              <span className="w-6 text-center tabular-nums">{qty}</span>
              <QtyButton onClick={() => p.onQty(item.id, 1)}>+</QtyButton>
            </div>
            <span className="w-16 text-right tabular-nums">{money(item.price * qty)}</span>
            <button onClick={() => p.onRemove(item.id)} className="text-zinc-400 hover:text-red-600" aria-label="Remove">
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-2 border-t border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <span>Discount</span>
          <select
            value={p.discountPct}
            onChange={(e) => p.onDiscount(Number(e.target.value))}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          >
            {[0, 5, 10, 20].map((d) => (
              <option key={d} value={d} className="text-black">
                {d === 0 ? "None" : `${d}%`}
              </option>
            ))}
          </select>
        </div>
        <Row label="Subtotal" value={p.totals.subtotal} />
        {p.totals.discount > 0 && <Row label="Discount" value={-p.totals.discount} />}
        <Row label="Tax (12%)" value={p.totals.tax} />
        <div className="flex justify-between pt-2 text-xl font-bold">
          <span>Total</span>
          <span className="tabular-nums">{money(p.totals.total)}</span>
        </div>
        <button
          onClick={p.onCharge}
          disabled={empty}
          className="mt-2 w-full rounded-xl bg-orange-500 py-4 text-lg font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Charge {money(p.totals.total)}
        </button>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
      <span>{label}</span>
      <span className="tabular-nums">{money(value)}</span>
    </div>
  );
}

function QtyButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="h-7 w-7 rounded-md bg-zinc-100 font-bold hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
    >
      {children}
    </button>
  );
}
