"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { advanceOrderAction, serviceRequestAction, tableHoldAction } from "@/app/(staff)/actions";
import { Icon, btn } from "@/components/ui";
import { FLOOR_STATUS, type FloorStatus, type FloorTableDto } from "@/lib/staffDto";
import { SERVICE_REQUEST_LABEL, formatCents, tableLabel } from "@/lib/tableOrder";
import { chime, minutesSince, notifyBrowser, useNow, usePoll, useToast } from "./hooks";

type FloorData = { tables: FloorTableDto[]; serverTime: string };

export default function FloorBoard({ initial, currency }: { initial: FloorData; currency: string }) {
  const { data, online, refresh } = usePoll<FloorData>("/api/staff/floor", initial);
  const now = useNow();
  const { show, node } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FloorStatus | "all" | "attention">("all");
  const money = (c: number) => formatCents(c, currency);

  const calls = data.tables.flatMap((t) => (t.session?.requests ?? []).map((r) => ({ ...r, table: t })));
  const seenCalls = useRef(new Set(calls.map((c) => c.id)));
  useEffect(() => {
    const fresh = calls.filter((c) => !seenCalls.current.has(c.id));
    calls.forEach((c) => seenCalls.current.add(c.id));
    if (fresh.length === 0) return;
    chime();
    notifyBrowser("Guest call", fresh.map((c) => `${tableLabel(c.table.number)}: ${SERVICE_REQUEST_LABEL[c.type]}`).join(", "));
  }, [calls]);

  const counts = data.tables.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.status]: (acc[t.status] ?? 0) + 1 }), {});
  const needsAttention = (t: FloorTableDto) => t.status === "ready" || (t.session?.requests.length ?? 0) > 0;
  const visible = data.tables.filter((t) => filter === "all" || (filter === "attention" ? needsAttention(t) : t.status === filter));
  const zones = [...new Set(visible.map((t) => t.zone))];
  const selected = data.tables.find((t) => t.id === selectedId) ?? null;

  const act = async (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, done: string) => {
    const r = await fn();
    show(r.ok ? (r.message ?? done) : r.error!, !r.ok);
    await refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      {calls.length > 0 && (
        <section aria-label="Guest calls" className="rounded-xl border border-secondary/40 bg-secondary/5 p-4">
          <h2 className="flex items-center gap-2 font-headline-sm text-headline-sm text-secondary mb-3">
            <Icon name="notifications_active" className="text-[20px] motion-safe:animate-pulse" />
            Guest calls ({calls.length})
          </h2>
          <ul className="flex flex-wrap gap-2">
            {calls.map((c) => (
              <CallChip key={c.id} call={c} now={now} onAct={act} />
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full" role="toolbar" aria-label="Filter tables">
          <FilterChip on={filter === "all"} onClick={() => setFilter("all")} label={`All tables (${data.tables.length})`} />
          <FilterChip on={filter === "attention"} onClick={() => setFilter("attention")} label={`Needs attention (${data.tables.filter(needsAttention).length})`} />
          {(Object.keys(FLOOR_STATUS) as FloorStatus[])
            .filter((st) => counts[st])
            .map((st) => (
              <FilterChip key={st} on={filter === st} onClick={() => setFilter(st)} label={`${FLOOR_STATUS[st].label} (${counts[st]})`} />
            ))}
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-label-md text-label-md ${online ? "border-tertiary/40 text-tertiary" : "border-error/40 text-error"}`}>
          <span className={`w-2 h-2 rounded-full ${online ? "bg-tertiary motion-safe:animate-pulse" : "bg-error"}`} />
          {online ? "Live" : "Reconnecting…"}
        </span>
      </div>

      {visible.length === 0 && <p className="py-10 text-center font-body-md text-body-md text-on-surface-variant">No tables match this filter.</p>}
      {zones.map((zone) => (
        <section key={zone} aria-label={zone}>
          <h2 className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider mb-2">{zone}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {visible
              .filter((t) => t.zone === zone)
              .map((t) => {
                const st = FLOOR_STATUS[t.status];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`relative text-left rounded-xl border-2 p-3.5 min-h-32 flex flex-col justify-between gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg ${st.cls} ${selectedId === t.id ? "ring-2 ring-primary" : ""}`}
                  >
                    {(t.session?.requests.length ?? 0) > 0 && <span className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full bg-secondary motion-safe:animate-ping" aria-label="Guest is calling" />}
                    <div>
                      <p className="font-headline-md text-headline-md font-bold text-on-surface">{tableLabel(t.number)}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">{t.seats} seats</p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 font-label-md text-label-md">
                        <Icon name={st.icon} className="text-[16px]" />
                        {st.label}
                      </span>
                      {t.session && t.session.totalCents > 0 && (
                        <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">
                          {t.session.balanceCents > 0 ? `Due ${money(t.session.balanceCents)}` : `Paid ${money(t.session.paidCents)}`}
                          {now !== null && ` • ${minutesSince(t.session.openedAt, now)}m`}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </section>
      ))}

      {selected && <TablePanel table={selected} money={money} onClose={() => setSelectedId(null)} onAct={act} />}
      {node}
    </div>
  );
}

function FilterChip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`shrink-0 min-h-9 px-3.5 rounded-full border font-label-md text-label-md transition-colors ${on ? "bg-primary-container text-on-primary-container border-primary-container" : "bg-surface-container border-outline-variant/40 text-on-surface-variant hover:text-on-surface"}`}
    >
      {label}
    </button>
  );
}

type Act = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, done: string) => Promise<void>;

function CallChip({ call, now, onAct }: { call: NonNullable<FloorTableDto["session"]>["requests"][number] & { table: FloorTableDto }; now: number | null; onAct: Act }) {
  const [pending, start] = useTransition();
  const ack = call.status === "acknowledged";
  return (
    <li className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${ack ? "border-outline-variant/40 bg-surface-container" : "border-secondary/50 bg-secondary-container/20"}`}>
      <Icon name={call.type === "request_bill" ? "payments" : "notifications_active"} className="text-[18px] text-secondary" />
      <span className="font-label-lg text-label-lg text-on-surface">
        {tableLabel(call.table.number)} • {SERVICE_REQUEST_LABEL[call.type]}
        {now !== null && <span className="text-on-surface-variant font-label-md text-label-md"> • {minutesSince(call.createdAt, now)}m</span>}
      </span>
      {!ack && (
        <button type="button" disabled={pending} onClick={() => start(() => onAct(() => serviceRequestAction(call.id, "acknowledged"), `${tableLabel(call.table.number)}: guest notified you're on the way`))} className={btn.ghost}>
          On my way
        </button>
      )}
      <button type="button" disabled={pending} onClick={() => start(() => onAct(() => serviceRequestAction(call.id, "resolved"), `${tableLabel(call.table.number)}: done`))} className={`${btn.success} min-h-8 px-3 py-1`}>
        Done
      </button>
    </li>
  );
}

function TablePanel({ table: t, money, onClose, onAct }: { table: FloorTableDto; money: (c: number) => string; onClose: () => void; onAct: Act }) {
  const [pending, start] = useTransition();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const st = FLOOR_STATUS[t.status];
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Table ${t.number}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full overflow-y-auto bg-surface-container border-l border-outline-variant/30 shadow-2xl p-5 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">{tableLabel(t.number)}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t.zone} • {t.seats} seats
            </p>
            <span className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-label-md text-label-md ${st.cls}`}>
              <Icon name={st.icon} className="text-[16px]" />
              {st.label}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high">
            <Icon name="close" className="text-[22px]" />
          </button>
        </div>

        {t.session ? (
          <>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Tickets", String(t.session.tickets)],
                ["Total", money(t.session.totalCents)],
                ["Balance", money(t.session.balanceCents)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-container-low border border-outline-variant/30 p-2.5">
                  <dt className="font-label-sm text-label-sm text-on-surface-variant uppercase">{k}</dt>
                  <dd className="font-headline-sm text-headline-sm text-on-surface tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>

            {t.session.ready.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="font-label-lg text-label-lg text-tertiary">Ready at the pass</h3>
                {t.session.ready.map((o) => (
                  <button key={o.id} type="button" disabled={pending} onClick={() => start(() => onAct(() => advanceOrderAction(o.id, "served"), `Ticket #${o.ticketNumber} served.`))} className={btn.success}>
                    <Icon name="done_all" className="text-[18px]" />
                    Mark ticket #{o.ticketNumber} served
                  </button>
                ))}
              </div>
            )}

            {t.session.requests.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="font-label-lg text-label-lg text-secondary">Guest calls</h3>
                {t.session.requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low border border-outline-variant/30 px-3 py-2">
                    <span className="font-label-lg text-label-lg text-on-surface">{SERVICE_REQUEST_LABEL[r.type]}</span>
                    <button type="button" disabled={pending} onClick={() => start(() => onAct(() => serviceRequestAction(r.id, "resolved"), "Done."))} className={`${btn.success} min-h-8 px-3 py-1`}>
                      Done
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Link href={`/cashier/order?table=${t.id}`} className={btn.secondary}>
                <Icon name="add_shopping_cart" className="text-[18px]" />
                Add order
              </Link>
              <Link href={`/cashier?bill=${t.session.id}`} className={btn.primary}>
                <Icon name="receipt_long" className="text-[18px]" />
                Open bill
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-body-md text-body-md text-on-surface-variant">No guests are seated. Guests who scan this table&apos;s QR code start a new bill automatically.</p>
            <Link href={`/cashier/order?table=${t.id}`} className={btn.primary}>
              <Icon name="add_shopping_cart" className="text-[18px]" />
              Take an order for this table
            </Link>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  [null, "Available", "check_circle"],
                  ["cleaning", "Cleaning", "cleaning_services"],
                  ["reserved", "Reserved", "event_available"],
                ] as const
              ).map(([hold, text, icon]) => {
                const active = (t.status === "available" && hold === null) || t.status === hold;
                return (
                  <button
                    key={text}
                    type="button"
                    disabled={pending || active}
                    aria-pressed={active}
                    onClick={() => start(() => onAct(() => tableHoldAction(t.id, hold), `${tableLabel(t.number)} marked ${text.toLowerCase()}.`))}
                    className={`${active ? btn.primary : btn.secondary} flex-col min-h-16 gap-1`}
                  >
                    <Icon name={icon} className="text-[20px]" />
                    {text}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
