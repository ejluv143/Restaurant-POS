"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { advanceOrderAction, availabilityAction } from "@/app/(staff)/actions";
import { Icon, btn } from "@/components/ui";
import type { KitchenBoardDto, KitchenTicketDto } from "@/lib/staffDto";
import { orderNumber, tableLabel, ticketPrepMinutes, type OrderStatus } from "@/lib/tableOrder";
import { chime, minutesSince, notifyBrowser, useNow, usePoll, useToast } from "./hooks";

type Availability = { id: string; name: string; category: string; available: boolean }[];

const COLUMNS: { status: OrderStatus; title: string; icon: string; tone: string }[] = [
  { status: "submitted", title: "New Orders", icon: "notifications_active", tone: "text-error" },
  { status: "confirmed", title: "Accepted", icon: "thumb_up", tone: "text-secondary" },
  { status: "preparing", title: "Preparing", icon: "skillet", tone: "text-primary" },
  { status: "ready", title: "Ready at the Pass", icon: "room_service", tone: "text-tertiary" },
];

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string; icon: string; cls: string }>> = {
  submitted: { to: "confirmed", label: "Accept Order", icon: "check", cls: btn.primary },
  confirmed: { to: "preparing", label: "Start Preparing", icon: "skillet", cls: btn.primary },
  preparing: { to: "ready", label: "Mark as Ready", icon: "room_service", cls: btn.success },
  ready: { to: "served", label: "Served", icon: "done_all", cls: btn.secondary },
};

export default function KitchenBoard({ initial, availability, canCancel }: { initial: KitchenBoardDto; availability: Availability; canCancel: boolean }) {
  const { data, online, refresh } = usePoll<KitchenBoardDto>("/api/staff/kitchen", initial);
  const now = useNow();
  const { show, node } = useToast();
  const [station, setStation] = useState<string | null>(null);
  const [sound, setSound] = useState(true);
  const [panel, setPanel] = useState(false);
  const [items, setItems] = useState(availability);

  // Chime + browser notification when a brand-new ticket arrives
  const seen = useRef(new Set(initial.orders.map((o) => o.id)));
  useEffect(() => {
    const fresh = data.orders.filter((o) => o.status === "submitted" && !seen.current.has(o.id));
    data.orders.forEach((o) => seen.current.add(o.id));
    if (fresh.length === 0) return;
    if (sound) chime();
    notifyBrowser("New order", fresh.map((o) => `${tableLabel(o.tableNumber)}: ${o.lines.reduce((n, l) => n + l.quantity, 0)} items`).join(", "));
  }, [data.orders, sound]);

  const stations = [...new Set(data.orders.flatMap((o) => o.lines.map((l) => l.station).filter((x): x is string => !!x)))].sort();
  const visible = station ? data.orders.filter((o) => o.lines.some((l) => l.station === station)) : data.orders;
  const late = visible.filter((o) => now !== null && isLate(o, now)).length;
  const served = visible.filter((o) => o.status === "served");

  const run = async (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, done?: string) => {
    const r = await fn();
    if (!r.ok) show(r.error ?? "Couldn't update.", true);
    else if (done) show(done);
    await refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full" role="toolbar" aria-label="Filter by station">
          <Chip on={station === null} onClick={() => setStation(null)} label="All Stations" count={data.orders.filter((o) => o.status !== "served").length} />
          {stations.map((s) => (
            <Chip key={s} on={station === s} onClick={() => setStation(s)} label={s} count={data.orders.filter((o) => o.status !== "served" && o.lines.some((l) => l.station === s)).length} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-label-md text-label-md ${online ? "border-tertiary/40 text-tertiary" : "border-error/40 text-error"}`}>
            <span className={`w-2 h-2 rounded-full ${online ? "bg-tertiary motion-safe:animate-pulse" : "bg-error"}`} />
            {online ? "Live" : "Reconnecting…"}
          </span>
          {late > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-error-container/40 text-error font-label-md text-label-md">
              <Icon name="alarm" className="text-[16px]" />
              {late} delayed
            </span>
          )}
          <span className="px-3 py-1.5 rounded-lg bg-surface-container font-label-md text-label-md text-on-surface-variant">{data.completedToday} completed today</span>
          <button
            type="button"
            onClick={() => {
              setSound((v) => !v);
              if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
            }}
            aria-pressed={sound}
            className={btn.ghost}
          >
            <Icon name={sound ? "volume_up" : "volume_off"} className="text-[18px]" />
            {sound ? "Sound on" : "Muted"}
          </button>
          <button type="button" onClick={() => setPanel(true)} className={btn.secondary}>
            <Icon name="block" className="text-[18px]" />
            Sold-out items
            {items.some((i) => !i.available) && <span className="px-1.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm">{items.filter((i) => !i.available).length}</span>}
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const tickets = visible.filter((o) => o.status === col.status);
          return (
            <section key={col.status} aria-label={col.title} className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-3 flex flex-col gap-3 min-h-40">
              <h2 className={`flex items-center justify-between gap-2 px-1 font-headline-sm text-headline-sm ${col.tone}`}>
                <span className="flex items-center gap-2">
                  <Icon name={col.icon} className="text-[20px]" />
                  {col.title}
                </span>
                <span className="min-w-7 h-7 px-2 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center">{tickets.length}</span>
              </h2>
              {tickets.length === 0 ? (
                <p className="px-1 py-6 text-center font-body-sm text-body-sm text-outline">Nothing here.</p>
              ) : (
                tickets.map((o) => <Ticket key={o.id} order={o} now={now} station={station} canCancel={canCancel} onAction={run} />)
              )}
            </section>
          );
        })}
      </div>

      {served.length > 0 && (
        <details className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-4">
          <summary className="cursor-pointer font-label-lg text-label-lg text-on-surface-variant">Recently served ({served.length})</summary>
          <ul className="mt-3 flex flex-wrap gap-2">
            {served.map((o) => (
              <li key={o.id} className="px-3 py-1.5 rounded-lg bg-surface-container font-label-md text-label-md text-on-surface-variant">
                {tableLabel(o.tableNumber)} • #{o.ticketNumber}
              </li>
            ))}
          </ul>
        </details>
      )}

      {panel && <SoldOutPanel items={items} onClose={() => setPanel(false)} onToggle={(id, available) => setItems((xs) => xs.map((i) => (i.id === id ? { ...i, available } : i)))} show={show} />}
      {node}
    </div>
  );
}

const isLate = (o: KitchenTicketDto, now: number) => ["submitted", "confirmed", "preparing"].includes(o.status) && minutesSince(o.placedAt, now) > ticketPrepMinutes(o) + 5;

function Chip({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`shrink-0 min-h-9 px-3.5 rounded-full border flex items-center gap-2 font-label-md text-label-md transition-colors ${
        on ? "bg-primary-container text-on-primary-container border-primary-container" : "bg-surface-container border-outline-variant/40 text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {label}
      <span className={`px-1.5 rounded-full font-label-sm text-label-sm ${on ? "bg-on-primary-container/15" : "bg-surface-container-highest"}`}>{count}</span>
    </button>
  );
}

function Ticket({
  order: o,
  now,
  station,
  canCancel,
  onAction,
}: {
  order: KitchenTicketDto;
  now: number | null;
  station: string | null;
  canCancel: boolean;
  onAction: (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, done?: string) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const next = NEXT[o.status];
  const waited = now === null ? null : minutesSince(o.placedAt, now);
  const late = now !== null && isLate(o, now);
  const canReject = o.status === "submitted" || canCancel;

  return (
    <article className={`rounded-xl bg-surface-container border-l-4 p-3.5 flex flex-col gap-2.5 shadow-sm ${late ? "border-error" : o.status === "submitted" ? "border-secondary" : o.status === "ready" ? "border-tertiary" : "border-primary-container"}`}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-headline-sm text-headline-sm text-on-surface">{tableLabel(o.tableNumber)}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {orderNumber(o.ticketNumber, o.placedAt)} • {o.zone}
            {o.byStaff && " • by staff"}
          </p>
        </div>
        {waited !== null && (
          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-label-md text-label-md tabular-nums ${late ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-on-surface-variant"}`}>
            <Icon name={late ? "alarm" : "schedule"} className="text-[14px]" />
            {waited}m
          </span>
        )}
      </header>

      <ul className="flex flex-col gap-1.5">
        {o.lines.map((l, i) => {
          const dim = station && l.station !== station;
          return (
            <li key={i} className={`font-body-md text-body-md ${dim ? "opacity-40" : "text-on-surface"}`}>
              <span className="font-bold text-primary">{l.quantity}×</span> {l.name}
              {l.station && <span className="ml-1 font-label-sm text-label-sm text-outline">[{l.station}]</span>}
              {l.modifiers.length > 0 && <span className="block pl-5 font-body-sm text-body-sm text-tertiary">{l.modifiers.join(" • ")}</span>}
              {l.note && <span className="block pl-5 font-body-sm text-body-sm text-secondary italic">Note: {l.note}</span>}
            </li>
          );
        })}
      </ul>

      {o.note && (
        <p className="rounded-lg bg-error-container/40 text-on-error-container px-2.5 py-1.5 font-label-md text-label-md flex items-start gap-1.5">
          <Icon name="warning" className="text-[16px] mt-px" />
          {o.note}
        </p>
      )}

      {rejecting ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(() => onAction(() => advanceOrderAction(o.id, "cancelled", reason), `Order ${orderNumber(o.ticketNumber, o.placedAt)} ${o.status === "submitted" ? "rejected" : "cancelled"}.`));
          }}
        >
          <label htmlFor={`reason-${o.id}`} className="font-label-md text-label-md text-on-surface-variant">
            Reason (the guest will see this)
          </label>
          <input
            id={`reason-${o.id}`}
            autoFocus
            required
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Sorry, we just ran out of shrimp"
            className="w-full min-h-10 rounded-lg bg-surface-container-high border border-outline-variant/50 px-3 font-body-md text-body-md text-on-surface outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={pending || !reason.trim()} className={`${btn.danger} flex-1`}>
              {o.status === "submitted" ? "Reject Order" : "Cancel Order"}
            </button>
            <button type="button" onClick={() => setRejecting(false)} className={btn.ghost}>
              Back
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2 mt-1">
          {next && (
            <button
              type="button"
              disabled={pending}
              onClick={() => start(() => onAction(() => advanceOrderAction(o.id, next.to)))}
              className={`${next.cls} flex-1 min-h-11`}
            >
              <Icon name={pending ? "progress_activity" : next.icon} className={`text-[18px] ${pending ? "animate-spin" : ""}`} />
              {next.label}
            </button>
          )}
          {canReject && o.status !== "served" && (
            <button type="button" disabled={pending} onClick={() => setRejecting(true)} aria-label={o.status === "submitted" ? "Reject order" : "Cancel order"} title={o.status === "submitted" ? "Reject" : "Cancel"} className={`${btn.ghost} min-h-11`}>
              <Icon name="close" className="text-[18px]" />
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function SoldOutPanel({ items, onClose, onToggle, show }: { items: Availability; onClose: () => void; onToggle: (id: string, available: boolean) => void; show: (t: string, e?: boolean) => void }) {
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const list = items.filter((i) => `${i.name} ${i.category}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Sold-out items">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-surface-container border-l border-outline-variant/30 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-outline-variant/20">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Sold-out items</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Guests see &ldquo;Currently Unavailable&rdquo; within seconds.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high">
            <Icon name="close" className="text-[22px]" />
          </button>
        </div>
        <div className="p-4">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes…" aria-label="Search dishes" className="w-full min-h-10 rounded-lg bg-surface-container-high border border-outline-variant/40 px-3 font-body-md text-body-md text-on-surface outline-none focus:border-primary" />
        </div>
        <ul className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-1">
          {list.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-high">
              <div className="min-w-0">
                <p className={`font-label-lg text-label-lg ${i.available ? "text-on-surface" : "text-outline line-through"}`}>{i.name}</p>
                <p className="font-body-sm text-body-sm text-outline">{i.category}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={i.available}
                aria-label={`${i.name} available`}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await availabilityAction(i.id, !i.available);
                    if (!r.ok) return show(r.error, true);
                    onToggle(i.id, !i.available);
                    show(`${i.name} is ${i.available ? "now sold out" : "back on the menu"}.`);
                  })
                }
                className={`shrink-0 w-12 h-7 rounded-full p-0.5 transition-colors ${i.available ? "bg-tertiary-container" : "bg-error-container"}`}
              >
                <span className={`block w-6 h-6 rounded-full bg-on-surface shadow transition-transform ${i.available ? "translate-x-5" : ""}`} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
