"use client";

import { useState } from "react";
import { money, round2 } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

interface Props {
  total: number;
  onCancel: () => void;
  onConfirm: (method: PaymentMethod, tendered: number) => void;
}

export default function PaymentModal({ total, onCancel, onConfirm }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [input, setInput] = useState("");

  const tendered = method === "card" ? total : Number(input) || 0;
  const change = round2(tendered - total);
  const canPay = method === "card" || change >= 0;

  const quick = [total, ...[5, 10, 20, 50, 100].filter((n) => n > total)].slice(0, 5);

  const press = (key: string) => {
    if (key === "⌫") return setInput((s) => s.slice(0, -1));
    if (key === "." && input.includes(".")) return;
    if (/\.\d{2}$/.test(input)) return;
    setInput((s) => s + key);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900"
      >
        <h2 className="text-lg font-semibold">Payment</h2>
        <p className="mt-1 text-3xl font-bold tabular-nums">{money(total)}</p>

        <div className="mt-4 flex gap-2">
          {(["cash", "card"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-lg py-2 font-medium capitalize ${
                method === m ? "bg-orange-500 text-white" : "bg-zinc-100 dark:bg-zinc-800"
              }`}
            >
              {m === "cash" ? "💵 Cash" : "💳 Card"}
            </button>
          ))}
        </div>

        {method === "cash" ? (
          <>
            <div className="mt-4 rounded-lg border border-zinc-300 px-4 py-3 text-right text-2xl tabular-nums dark:border-zinc-700">
              {input ? `$${input}` : <span className="text-zinc-400">Amount received</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {quick.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q.toFixed(2))}
                  className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  {q === total ? "Exact" : money(q)}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((k) => (
                <button
                  key={k}
                  onClick={() => press(k)}
                  className="rounded-lg bg-zinc-100 py-3 text-xl font-medium hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-lg">
              <span>Change</span>
              <span className={`font-semibold tabular-nums ${change < 0 ? "text-red-600" : "text-green-600"}`}>
                {change < 0 ? `Short ${money(-change)}` : money(change)}
              </span>
            </div>
          </>
        ) : (
          <p className="mt-6 rounded-lg bg-zinc-100 p-4 text-center text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            Process {money(total)} on the card terminal, then confirm.
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-lg bg-zinc-200 py-3 font-medium dark:bg-zinc-800">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(method, tendered)}
            disabled={!canPay}
            className="flex-1 rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-40"
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  );
}
