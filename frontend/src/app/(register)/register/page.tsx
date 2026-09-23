"use client";

import { useMemo, useState } from "react";
import Cart from "@/components/Cart";
import MenuGrid from "@/components/MenuGrid";
import PaymentModal from "@/components/PaymentModal";
import Receipt from "@/components/Receipt";
import { round2 } from "@/lib/format";
import { TAX_RATE } from "@/lib/menu";
import { nextOrderNumber, saveOrder } from "@/lib/orders";
import type { CartLine, MenuItem, Order, OrderType, PaymentMethod } from "@/lib/types";

export default function RegisterPage() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("dine-in");
  const [table, setTable] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  const totals = useMemo(() => {
    const subtotal = round2(lines.reduce((sum, l) => sum + l.item.price * l.qty, 0));
    const discount = round2(subtotal * (discountPct / 100));
    const tax = round2((subtotal - discount) * TAX_RATE);
    return { subtotal, discount, tax, total: round2(subtotal - discount + tax) };
  }, [lines, discountPct]);

  const add = (item: MenuItem) =>
    setLines((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) return prev.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { item, qty: 1 }];
    });

  const changeQty = (id: string, delta: number) =>
    setLines((prev) =>
      prev.map((l) => (l.item.id === id ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0),
    );

  const remove = (id: string) => setLines((prev) => prev.filter((l) => l.item.id !== id));

  const reset = () => {
    setLines([]);
    setTable("");
    setDiscountPct(0);
  };

  const complete = (paymentMethod: PaymentMethod, tendered: number) => {
    const order: Order = {
      id: crypto.randomUUID(),
      number: nextOrderNumber(),
      createdAt: new Date().toISOString(),
      orderType,
      table: orderType === "dine-in" && table.trim() ? table.trim() : undefined,
      lines,
      ...totals,
      paymentMethod,
      tendered: round2(tendered),
      change: round2(tendered - totals.total),
    };
    saveOrder(order);
    setPaying(false);
    setReceipt(order);
    reset();
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <MenuGrid onAdd={add} />
      <Cart
        lines={lines}
        orderType={orderType}
        table={table}
        discountPct={discountPct}
        totals={totals}
        onQty={changeQty}
        onRemove={remove}
        onClear={reset}
        onOrderType={setOrderType}
        onTable={setTable}
        onDiscount={setDiscountPct}
        onCharge={() => setPaying(true)}
      />
      {paying && (
        <PaymentModal total={totals.total} onCancel={() => setPaying(false)} onConfirm={complete} />
      )}
      {receipt && <Receipt order={receipt} onClose={() => setReceipt(null)} />}
    </main>
  );
}
