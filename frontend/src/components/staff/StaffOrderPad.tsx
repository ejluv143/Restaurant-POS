"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { placeStaffOrderAction } from "@/app/(staff)/actions";
import { addToCart, changeQty, linePrice, selectedOptions, type CartLine } from "@/components/table/cart";
import { ItemOptionsSheet } from "@/components/table/Sheets";
import { Icon, btn, input } from "@/components/ui";
import { LIMITS, formatCents, tableLabel, totals, type MenuItemDto } from "@/lib/tableOrder";
import { useToast } from "./hooks";

interface Props {
  tables: { id: string; number: string; zone: string }[];
  initialTableId: string | null;
  menu: { items: MenuItemDto[]; categories: { slug: string; name: string }[] };
  currency: string;
  taxRateBp: number;
}

// Counter / waiter order entry: same menu, options, prices and kitchen flow as a guest's QR order
export default function StaffOrderPad({ tables, initialTableId, menu, currency, taxRateBp }: Props) {
  const money = (c: number) => formatCents(c, currency);
  const items = useMemo(() => new Map(menu.items.map((i) => [i.id, i])), [menu.items]);
  const [tableId, setTableId] = useState(initialTableId ?? "");
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [customizing, setCustomizing] = useState<MenuItemDto | null>(null);
  const [pending, start] = useTransition();
  const { show, node } = useToast();

  const query = q.trim().toLowerCase();
  const visible = menu.items.filter((i) => (!cat || i.categorySlug === cat) && (!query || `${i.name} ${i.description}`.toLowerCase().includes(query)));
  const lines = cart.flatMap((l) => {
    const item = items.get(l.itemId);
    return item ? [{ ...l, item, unit: linePrice(item, l.optionIds) }] : [];
  });
  const t = totals(
    lines.reduce((s, l) => s + l.unit * l.qty, 0),
    taxRateBp,
  );

  const add = (item: MenuItemDto) => {
    if (!item.available) return;
    if (item.modifierGroups.length) return setCustomizing(item);
    setCart((c) => addToCart(c, item.id, []));
  };

  const send = () =>
    start(async () => {
      const r = await placeStaffOrderAction(tableId, { lines: cart.map((l) => ({ menuItemId: l.itemId, quantity: l.qty, optionIds: l.optionIds, note: l.note })), note });
      if (!r.ok) return show(r.error, true);
      show(r.message ?? "Order sent.");
      setCart([]);
      setNote("");
    });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <section className="xl:col-span-8 flex flex-col gap-4 min-w-0">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="sr-only" htmlFor="pos-table">
            Table
          </label>
          <select id="pos-table" value={tableId} onChange={(e) => setTableId(e.target.value)} className={`${input} sm:max-w-xs font-label-lg`}>
            <option value="">Choose a table…</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {tableLabel(t.number)} • {t.zone}
              </option>
            ))}
          </select>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the menu…" aria-label="Search the menu" className={input} />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="toolbar" aria-label="Categories">
          {[{ slug: null as string | null, name: "All" }, ...menu.categories].map((c) => (
            <button
              key={c.slug ?? "all"}
              type="button"
              aria-pressed={cat === c.slug}
              onClick={() => setCat(c.slug)}
              className={`shrink-0 min-h-9 px-3.5 rounded-full border font-label-md text-label-md ${cat === c.slug ? "bg-primary-container text-on-primary-container border-primary-container" : "bg-surface-container border-outline-variant/40 text-on-surface-variant hover:text-on-surface"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-3">
          {visible.map((i) => (
            <button
              key={i.id}
              type="button"
              disabled={!i.available}
              onClick={() => add(i)}
              className="text-left rounded-xl bg-surface-container-low border border-outline-variant/30 p-3.5 min-h-28 flex flex-col justify-between gap-2 hover:border-primary-container/60 hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-label-lg text-label-lg text-on-surface">{i.name}</span>
              <span className="flex items-center justify-between gap-2">
                <span className="font-headline-sm text-headline-sm text-primary tabular-nums">{money(i.priceCents)}</span>
                {!i.available ? (
                  <span className="font-label-sm text-label-sm text-error uppercase">Sold out</span>
                ) : (
                  i.modifierGroups.length > 0 && <Icon name="tune" className="text-[18px] text-outline" />
                )}
              </span>
            </button>
          ))}
        </div>
      </section>

      <aside className="xl:col-span-4 xl:sticky xl:top-6 rounded-xl bg-surface-container-low border border-outline-variant/30 p-4 flex flex-col gap-3">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">{tableId ? `Order for ${tableLabel(tables.find((t) => t.id === tableId)?.number ?? "")}` : "New order"}</h2>
        {lines.length === 0 ? (
          <p className="py-6 text-center font-body-md text-body-md text-on-surface-variant">Tap dishes to add them.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-outline-variant/20">
            {lines.map((l) => (
              <li key={l.key} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-label-lg text-label-lg text-on-surface">{l.item.name}</p>
                  {l.optionIds.length > 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">{selectedOptions(l.item, l.optionIds).map((o) => o.name).join(", ")}</p>}
                  <p className="font-body-sm text-body-sm text-on-surface-variant tabular-nums">{money(l.unit * l.qty)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => setCart((c) => changeQty(c, l.key, -1))} aria-label={`Remove one ${l.item.name}`} className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center">
                    <Icon name="remove" className="text-[16px]" />
                  </button>
                  <span className="w-6 text-center font-label-lg text-label-lg tabular-nums">{l.qty}</span>
                  <button type="button" onClick={() => setCart((c) => changeQty(c, l.key, 1))} aria-label={`Add one ${l.item.name}`} className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center">
                    <Icon name="add" className="text-[16px]" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <label className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface-variant">Kitchen note / allergies</span>
          <input value={note} maxLength={LIMITS.orderNote} onChange={(e) => setNote(e.target.value)} className={input} placeholder="e.g. No onions, peanut allergy" />
        </label>
        <dl className="flex flex-col gap-1 font-body-md text-body-md border-t border-outline-variant/20 pt-3">
          <div className="flex justify-between text-on-surface-variant">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{money(t.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <dt>VAT ({taxRateBp / 100}%)</dt>
            <dd className="tabular-nums">{money(t.taxCents)}</dd>
          </div>
          <div className="flex justify-between font-headline-sm text-headline-sm text-on-surface">
            <dt>Total</dt>
            <dd className="text-primary tabular-nums">{money(t.totalCents)}</dd>
          </div>
        </dl>
        <button type="button" disabled={pending || !tableId || lines.length === 0} onClick={send} className={btn.primary}>
          <Icon name={pending ? "progress_activity" : "send"} className={`text-[18px] ${pending ? "animate-spin" : ""}`} />
          Send to kitchen
        </button>
        {!tableId && <p className="font-body-sm text-body-sm text-outline">Choose a table first.</p>}
        <Link href="/cashier" className={btn.ghost}>
          <Icon name="arrow_back" className="text-[16px]" />
          Back to bills
        </Link>
      </aside>

      {customizing && (
        <ItemOptionsSheet
          item={customizing}
          money={money}
          onClose={() => setCustomizing(null)}
          onAdd={(opts, qty, lineNote) => {
            setCart((c) => addToCart(c, customizing.id, opts, qty, lineNote));
            setCustomizing(null);
          }}
        />
      )}
      {node}
    </div>
  );
}
