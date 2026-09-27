"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LIMITS, type MenuItemDto, type PlacedOrderDto } from "@/lib/tableOrder";
import { defaultOptionIds, linePrice } from "./cart";
import { DishImage, Icon, Stepper } from "./MenuParts";
import { STATUS_LABEL } from "./OrderPanel";

/** Bottom sheet on phones, centered dialog on larger screens. Escape or backdrop closes it. */
export function Sheet({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "sm:max-w-lg" : "sm:max-w-md"} max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-xl bg-surface-container border border-outline-variant/30 shadow-2xl outline-none`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-5 py-3 bg-surface-container/95 backdrop-blur-md border-b border-outline-variant/30">
          <h2 className="text-headline-sm font-headline-sm text-on-surface">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface">
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ItemOptionsSheet({ item, money, onClose, onAdd }: { item: MenuItemDto; money: (c: number) => string; onClose: () => void; onAdd: (optionIds: string[], qty: number, note: string) => void }) {
  const [optionIds, setOptionIds] = useState(() => defaultOptionIds(item));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const toggle = (groupId: string, optionId: string) => {
    const group = item.modifierGroups.find((g) => g.id === groupId)!;
    const inGroup = optionIds.filter((id) => group.options.some((o) => o.id === id));
    if (group.maxSelect === 1) return setOptionIds([...optionIds.filter((id) => !inGroup.includes(id)), optionId]);
    if (optionIds.includes(optionId)) return setOptionIds(optionIds.filter((id) => id !== optionId));
    if (inGroup.length < group.maxSelect) setOptionIds([...optionIds, optionId]);
  };
  const missing = item.modifierGroups.find((g) => optionIds.filter((id) => g.options.some((o) => o.id === id)).length < g.minSelect);

  return (
    <Sheet title={item.name} onClose={onClose}>
      <DishImage item={item} className="w-full h-40 rounded-lg mb-3" />
      <p className="text-body-md font-body-md text-on-surface-variant mb-4">{item.description}</p>
      <div className="space-y-4">
        {item.modifierGroups.map((g) => (
          <fieldset key={g.id}>
            <legend className="flex items-center justify-between w-full mb-2 text-label-md font-label-md text-on-surface">
              {g.name}
              <span className="text-label-sm font-label-sm font-medium text-on-surface-variant">
                {g.minSelect ? "Required" : "Optional"}
                {g.maxSelect > 1 ? ` • up to ${g.maxSelect}` : ""}
              </span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {g.options.map((o) => {
                const on = optionIds.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={g.maxSelect === 1 ? "radio" : "checkbox"}
                    aria-checked={on}
                    onClick={() => toggle(g.id, o.id)}
                    className={`min-h-11 px-3 py-2 rounded-lg border text-left text-label-md font-label-md transition-colors flex items-center justify-between gap-2 ${
                      on ? "bg-primary-container/20 border-primary-container text-on-surface" : "bg-surface-container-high border-outline-variant/30 text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span>{o.name}</span>
                    {o.priceDeltaCents !== 0 && <span className="text-label-sm font-label-sm text-primary shrink-0">+{money(o.priceDeltaCents)}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        <label className="block">
          <span className="block mb-2 text-label-md font-label-md text-on-surface">{item.station === "Bar" ? "Bar" : "Kitchen"} note</span>
          <input
            value={note}
            maxLength={LIMITS.lineNote}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional — e.g. sauce on the side"
            className="w-full min-h-11 rounded-lg bg-surface-container-lowest border border-outline-variant/40 px-3 text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container"
          />
        </label>
      </div>
      <div className="flex items-center gap-3 pt-5">
        <Stepper qty={qty} name={item.name} onDec={() => setQty((q) => Math.max(1, q - 1))} onInc={() => setQty((q) => Math.min(LIMITS.maxQty, q + 1))} />
        <button
          type="button"
          disabled={!!missing}
          onClick={() => onAdd(optionIds, qty, note.trim())}
          className="flex-1 min-h-12 rounded-lg bg-primary-container text-on-primary-container text-label-lg font-label-lg flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all disabled:opacity-40"
        >
          <Icon name="add_circle" className="text-[18px]" />
          {missing ? `Choose ${missing.name}` : `Add to Order (${money(linePrice(item, optionIds) * qty)})`}
        </button>
      </div>
    </Sheet>
  );
}

const STATUS_STYLE: Record<PlacedOrderDto["status"], string> = {
  submitted: "bg-secondary-container/30 text-secondary border-secondary-container/40",
  confirmed: "bg-secondary-container/30 text-secondary border-secondary-container/40",
  completed: "bg-surface-container-highest text-on-surface-variant border-outline-variant/40",
  preparing: "bg-primary-container/25 text-primary border-primary-container/40",
  ready: "bg-tertiary-container/25 text-tertiary border-tertiary-container/40",
  served: "bg-surface-container-highest text-on-surface-variant border-outline-variant/40",
  cancelled: "bg-error-container/30 text-error border-error/30",
};

export function TicketsSheet({
  orders,
  money,
  tableNumber,
  trackerHref,
  onClose,
  onRequestBill,
  billRequested,
}: {
  orders: PlacedOrderDto[];
  money: (c: number) => string;
  tableNumber: string;
  trackerHref: string;
  onClose: () => void;
  onRequestBill: () => void;
  billRequested?: boolean;
}) {
  const tab = orders.filter((o) => o.status !== "cancelled").reduce((a, o) => ({ sub: a.sub + o.subtotalCents, tax: a.tax + o.taxCents, total: a.total + o.totalCents }), { sub: 0, tax: 0, total: 0 });
  return (
    <Sheet title={`Table ${tableNumber} • Live Kitchen Tickets`} onClose={onClose} wide>
      {orders.length === 0 ? (
        <div className="py-8 flex flex-col items-center text-center gap-2 text-on-surface-variant">
          <Icon name="receipt_long" className="text-[40px] text-outline" />
          <p className="text-body-md font-body-md">Nothing sent to the kitchen yet.</p>
        </div>
      ) : (
        <div className="space-y-3" aria-live="polite">
          {orders.map((o) => (
            <article key={o.id} className="rounded-lg bg-surface-container-low border border-outline-variant/30 p-4">
              <header className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-label-lg font-label-lg text-on-surface">Ticket #{o.ticketNumber}</h3>
                  <p className="text-label-sm font-label-sm font-medium text-on-surface-variant">{new Date(o.placedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full border text-label-sm font-label-sm ${STATUS_STYLE[o.status]} ${o.status === "preparing" ? "animate-pulse" : ""}`}>{STATUS_LABEL[o.status]}</span>
              </header>
              <ul className="space-y-1 text-body-sm font-body-sm">
                {o.lines.map((l, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="text-on-surface">
                      <span className="text-primary font-bold">{l.quantity}x</span> {l.name}
                      {l.modifiers.length > 0 && <span className="text-on-surface-variant"> — {l.modifiers.join(", ")}</span>}
                      {l.note && <span className="block text-secondary italic">“{l.note}”</span>}
                    </span>
                    <span className="tabular-nums text-on-surface-variant shrink-0">{money(l.quantity * l.unitPriceCents)}</span>
                  </li>
                ))}
              </ul>
              {o.note && (
                <p className="mt-2 text-label-sm font-label-sm text-secondary flex items-center gap-1">
                  <Icon name="verified_user" className="text-[14px]" /> Dietary alert: {o.note}
                </p>
              )}
              {o.cancelReason && (
                <p className="mt-2 text-label-sm font-label-sm text-error flex items-center gap-1">
                  <Icon name="info" className="text-[14px]" /> {o.cancelReason} (not charged)
                </p>
              )}
            </article>
          ))}
          <dl className="pt-2 space-y-1 text-body-sm font-body-sm">
            <div className="flex justify-between text-on-surface-variant">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{money(tab.sub)}</dd>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <dt>Service &amp; Tax</dt>
              <dd className="tabular-nums">{money(tab.tax)}</dd>
            </div>
            <div className="flex justify-between text-headline-sm font-headline-sm font-bold text-on-surface pt-1 border-t border-outline-variant/20">
              <dt>Table Tab</dt>
              <dd className="text-primary tabular-nums">{money(tab.total)}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onRequestBill}
            disabled={billRequested}
            className="w-full min-h-12 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface text-label-lg font-label-lg flex items-center justify-center gap-2 hover:bg-surface-bright transition-colors disabled:text-tertiary"
          >
            <Icon name={billRequested ? "check_circle" : "payments"} className="text-[18px]" />
            {billRequested ? "Bill requested — your server is on the way" : "Request the Bill"}
          </button>
          <Link
            href={trackerHref}
            className="w-full min-h-12 rounded-lg bg-primary-container text-on-primary-container text-label-lg font-label-lg flex items-center justify-center gap-2 hover:brightness-105 transition-all"
          >
            <Icon name="timer" className="text-[18px]" />
            Open Live Tracker &amp; Bill Split
          </Link>
        </div>
      )}
    </Sheet>
  );
}
