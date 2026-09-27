"use client";

import { useState } from "react";
import { LIMITS, totals, type MenuItemDto, type OrderStatus, type PlacedOrderDto, type ServiceRequestType } from "@/lib/tableOrder";
import { linePrice, selectedOptions, type CartLine } from "./cart";
import { Icon, Stepper } from "./MenuParts";

const STEPS = ["Browsing & Adding", "Sent to Line", "Cooking", "On Its Way"];
const STEP_OF: Record<OrderStatus, number> = { submitted: 1, confirmed: 2, preparing: 2, ready: 3, served: 3, completed: 3, cancelled: 0 };

export const STATUS_LABEL: Record<OrderStatus, string> = {
  submitted: "Waiting for Kitchen",
  confirmed: "Accepted",
  preparing: "Cooking",
  ready: "Ready to Serve",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
};

export interface OrderPanelProps {
  tableNumber: string;
  zone: string;
  taxRateBp: number;
  seats: number;
  cart: CartLine[];
  items: Map<string, MenuItemDto>;
  orders: PlacedOrderDto[];
  money: (cents: number) => string;
  allergyNote: string;
  sending: boolean;
  requested: Partial<Record<ServiceRequestType, boolean>>;
  onQty: (key: string, delta: number) => void;
  onLineNote: (key: string, note: string) => void;
  onAllergyNote: (note: string) => void;
  onSend: () => void;
  onRequest: (type: ServiceRequestType) => void;
  onViewTickets: () => void;
}

export default function OrderPanel(p: OrderPanelProps) {
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [split, setSplit] = useState(false);
  const [guests, setGuests] = useState(Math.max(2, Math.min(p.seats, 4)));

  const lines = p.cart.flatMap((l) => {
    const item = p.items.get(l.itemId);
    return item ? [{ ...l, item, unit: linePrice(item, l.optionIds) }] : [];
  });
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const draft = totals(
    lines.reduce((s, l) => s + l.unit * l.qty, 0),
    p.taxRateBp,
  );
  const latest = p.orders.at(-1);
  const step = count > 0 || !latest ? 0 : STEP_OF[latest.status];
  const sentTotal = p.orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.totalCents, 0);
  const pill = count > 0 ? { icon: "sync", text: "Drafting" } : latest ? { icon: "local_fire_department", text: STATUS_LABEL[latest.status] } : { icon: "restaurant_menu", text: "Open" };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
        <div>
          <h3 className="text-headline-sm font-headline-sm text-primary">Table {p.tableNumber} Order</h3>
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            {count} {count === 1 ? "item" : "items"} in draft • {p.zone}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-secondary-container/30 text-secondary text-label-sm font-label-sm border border-secondary-container/40 flex items-center gap-1">
          <Icon name={pill.icon} className="text-[14px]" />
          {pill.text}
        </span>
      </div>

      {/* Live progress */}
      <div className="py-4 border-b border-outline-variant/20">
        <ol className="grid grid-cols-4 gap-1 text-label-sm font-label-sm mb-2" aria-label="Order progress">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined} className={`${i === step ? "text-primary" : i < step ? "text-on-surface" : "text-on-surface-variant font-medium"} ${i === 3 ? "text-right" : i ? "text-center" : ""}`}>
              {i + 1}. {label}
            </li>
          ))}
        </ol>
        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden flex gap-0.5">
          {STEPS.map((label, i) => (
            <div key={label} className={`flex-1 h-full ${i <= step ? "bg-primary-container" : "bg-surface-container-highest"} ${i === step && step > 0 && latest?.status !== "served" ? "animate-pulse" : ""}`} />
          ))}
        </div>
      </div>

      {/* Draft lines */}
      {lines.length === 0 ? (
        <div className="py-8 flex flex-col items-center text-center gap-2 text-on-surface-variant">
          <Icon name="restaurant_menu" className="text-[36px] text-outline" />
          <p className="text-body-md font-body-md">{p.orders.length ? "Hungry for more? Add dishes from the menu." : "Your table order is empty. Tap a dish to add it."}</p>
        </div>
      ) : (
        <ul className="py-3 divide-y divide-outline-variant/20">
          {lines.map((l) => {
            const mods = selectedOptions(l.item, l.optionIds);
            const isBar = l.item.station === "Bar";
            return (
              <li key={l.key} className="py-3 first:pt-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="flex items-baseline gap-1.5">
                      <span className="text-label-md font-label-md text-primary font-bold tabular-nums">{l.qty}x</span>
                      <span className="text-label-lg font-label-lg text-on-surface">{l.item.name}</span>
                    </p>
                    {(mods.length > 0 || l.note) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mods.map((m) => (
                          <span key={m.id} className="px-2 py-0.5 rounded text-label-sm font-label-sm font-medium bg-surface-container-high text-on-surface-variant">
                            {m.name}
                          </span>
                        ))}
                        {l.note && editingNote !== l.key && <span className="px-2 py-0.5 rounded text-label-sm font-label-sm font-medium bg-secondary-container/20 text-secondary italic">“{l.note}”</span>}
                      </div>
                    )}
                  </div>
                  <span className="text-label-lg font-label-lg font-bold text-on-surface tabular-nums">{p.money(l.unit * l.qty)}</span>
                </div>
                {editingNote === l.key && (
                  <input
                    autoFocus
                    value={l.note}
                    maxLength={LIMITS.lineNote}
                    onChange={(e) => p.onLineNote(l.key, e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingNote(null)}
                    onBlur={() => setEditingNote(null)}
                    placeholder={isBar ? "e.g. less ice, no garnish" : "e.g. sauce on the side, no onions"}
                    aria-label={`${isBar ? "Bar" : "Kitchen"} note for ${l.item.name}`}
                    className="w-full rounded-lg bg-surface-container-lowest border border-outline-variant/40 px-3 py-2 text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container"
                  />
                )}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingNote(editingNote === l.key ? null : l.key)}
                    className="min-h-9 text-on-surface-variant hover:text-primary flex items-center gap-1 text-label-sm font-label-sm font-medium transition-colors"
                  >
                    <Icon name="edit_note" className="text-[16px]" />
                    {l.note ? "Edit" : "Add"} {isBar ? "Bar" : "Kitchen"} Note
                  </button>
                  <Stepper size="sm" qty={l.qty} name={l.item.name} onDec={() => p.onQty(l.key, -1)} onInc={() => p.onQty(l.key, 1)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Service calls & dietary alert */}
      <div className="py-3 border-y border-outline-variant/30 space-y-2">
        <span className="text-label-sm font-label-sm text-on-surface-variant block uppercase tracking-wider">Quick Service Calls</span>
        <div className="grid grid-cols-2 gap-2">
          <ServiceButton icon="water_drop" iconCls="text-tertiary" label="Water / Cutlery" done={p.requested.water_cutlery} onClick={() => p.onRequest("water_cutlery")} />
          <ServiceButton icon="person_alert" iconCls="text-primary" label="Call Waiter" done={p.requested.call_server} onClick={() => p.onRequest("call_server")} />
        </div>
        <label className="px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between gap-2 text-label-sm font-label-sm">
          <span className="flex items-center gap-1.5 text-on-surface-variant shrink-0">
            <Icon name="verified_user" className="text-[16px] text-secondary" />
            Table Dietary Alert:
          </span>
          <input
            value={p.allergyNote}
            maxLength={LIMITS.orderNote}
            onChange={(e) => p.onAllergyNote(e.target.value)}
            placeholder="e.g. Peanut allergy"
            className="min-w-0 flex-1 min-h-8 bg-transparent text-right text-secondary font-bold placeholder:text-outline placeholder:font-medium focus:outline-none"
          />
        </label>
      </div>

      {/* Bill */}
      <div className="pt-4 space-y-3">
        <dl className="space-y-1.5 text-body-sm font-body-sm">
          <div className="flex justify-between text-on-surface-variant">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{p.money(draft.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <dt>Kitchen Service &amp; Tax ({p.taxRateBp / 100}%)</dt>
            <dd className="tabular-nums">{p.money(draft.taxCents)}</dd>
          </div>
          <div className="flex justify-between text-headline-sm font-headline-sm font-bold text-on-surface pt-1 border-t border-outline-variant/20">
            <dt>{p.orders.length ? "This Round" : "Total"}</dt>
            <dd className="text-primary tabular-nums">{p.money(draft.totalCents)}</dd>
          </div>
          {p.orders.length > 0 && (
            <div className="flex justify-between text-on-surface-variant">
              <dt>Table tab so far ({p.orders.length} sent)</dt>
              <dd className="tabular-nums">{p.money(sentTotal)}</dd>
            </div>
          )}
        </dl>

        <div className="p-2.5 rounded-lg bg-surface-container-high border border-outline-variant/30 flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 flex-1 cursor-pointer">
            <Icon name="call_split" className="text-[18px] text-secondary" />
            <span>
              <span className="text-label-sm font-label-sm text-on-surface block">Split Tab Evenly</span>
              <span className="text-label-sm font-label-sm font-medium text-on-surface-variant tabular-nums">
                {guests} Guests • {p.money(Math.ceil((sentTotal + draft.totalCents) / guests))}/ea
              </span>
            </span>
            <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} className="ml-auto w-5 h-5 accent-primary-container cursor-pointer" />
          </label>
        </div>
        {split && (
          <div className="flex items-center justify-between px-1 text-label-md font-label-md text-on-surface-variant">
            <span>Guests at table</span>
            <Stepper size="sm" qty={guests} name="guest" onDec={() => setGuests((g) => Math.max(2, g - 1))} onInc={() => setGuests((g) => Math.min(20, g + 1))} />
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            disabled={lines.length === 0 || p.sending}
            onClick={p.onSend}
            className="w-full min-h-12 py-3 px-4 rounded-lg bg-primary-container text-on-primary-container text-label-lg font-label-lg font-bold hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <Icon name={p.sending ? "progress_activity" : "restaurant_menu"} className={`text-[20px] ${p.sending ? "animate-spin" : ""}`} />
            {p.sending ? "Sending to kitchen…" : `Send Order to Kitchen (${p.money(draft.totalCents)})`}
          </button>
          <button
            type="button"
            onClick={p.onViewTickets}
            className="w-full min-h-11 py-2 px-4 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface text-label-md font-label-md hover:bg-surface-bright active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Icon name="receipt" className="text-[18px]" />
            View Live Kitchen Ticket{p.orders.length ? ` (${p.orders.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceButton({ icon, iconCls, label, done, onClick }: { icon: string; iconCls: string; label: string; done?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={done}
      className={`min-h-10 px-2.5 py-1.5 rounded-lg border text-label-sm font-label-sm transition-all flex items-center justify-center gap-1.5 ${
        done ? "bg-tertiary-container/20 border-tertiary-container/40 text-tertiary" : "bg-surface-container-high border-outline-variant/30 text-on-surface hover:border-primary"
      }`}
    >
      <Icon name={done ? "check_circle" : icon} className={`text-[15px] ${done ? "" : iconCls}`} />
      {done ? "Requested" : label}
    </button>
  );
}
