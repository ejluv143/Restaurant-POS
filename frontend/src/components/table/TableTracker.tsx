"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  CHANNEL_LABEL,
  LIMITS,
  PAYMENT_METHOD_LABEL,
  SERVICE_REQUEST_LABEL,
  formatCents,
  orderNumber,
  splitEvenly,
  tableLabel,
  type PlacedOrderDto,
  type PlacedOrderLineDto,
  type ServiceRequestType,
  type TableInfoDto,
  type TableStatusDto,
} from "@/lib/tableOrder";
import { Icon } from "./MenuParts";
import { STAGES, clockTime, isDone, stageIndex, ticketProgress } from "./tracker";

const POLL_MS = 5000;
const MAX_GUESTS = 20;

// Ticking clock for timers. Null during server render and hydration so times (which depend on the
// guest's timezone) are only ever rendered in the browser.
const subscribeClock = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};
const useNow = () =>
  useSyncExternalStore(
    subscribeClock,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );

const QUICK_SERVICE: { type: ServiceRequestType; icon: string; tone: string; label: string }[] = [
  { type: "water_cutlery", icon: "water_full", tone: "text-primary", label: "Extra Cutlery / Water" },
  { type: "call_server", icon: "hail", tone: "text-secondary", label: "Call Waiter to Table" },
  { type: "sommelier", icon: "local_bar", tone: "text-tertiary", label: "Drinks Advice" },
  { type: "napkins", icon: "dry_cleaning", tone: "text-outline", label: "Napkins & Wet Wipes" },
];

const STATUS_PILL: Record<PlacedOrderDto["status"], { text: string; cls: string }> = {
  submitted: { text: "Pending", cls: "bg-secondary/15 border-secondary/30 text-secondary" },
  confirmed: { text: "Confirmed", cls: "bg-secondary/15 border-secondary/30 text-secondary" },
  preparing: { text: "Preparing", cls: "bg-tertiary/15 border-tertiary/30 text-tertiary" },
  ready: { text: "On Its Way", cls: "bg-primary-container/20 border-primary-container/40 text-primary" },
  served: { text: "Served", cls: "bg-surface-container-highest border-outline-variant/40 text-on-surface-variant" },
  completed: { text: "Completed", cls: "bg-surface-container-highest border-outline-variant/40 text-on-surface-variant" },
  cancelled: { text: "Cancelled", cls: "bg-error-container/30 border-error/30 text-error" },
};

const lineKey = (orderId: string, i: number) => `${orderId}:${i}`;

/** The newest ticket still in progress, else the newest one. */
const defaultTicket = (orders: PlacedOrderDto[]) => orders.findLast((o) => !isDone(o.status) && o.status !== "cancelled") ?? orders.at(-1);

export default function TableTracker({ token, info, initial, paymentReturn }: { token: string; info: TableInfoDto; initial: TableStatusDto; paymentReturn: "success" | "cancelled" | null }) {
  const { table } = info;
  const money = useCallback((c: number) => formatCents(c, info.currency), [info.currency]);
  const now = useNow();

  const [status, setStatus] = useState(initial);
  // Pinned once chosen, so the ticket being watched stays on screen when it's served
  const [selectedId, setSelectedId] = useState<string | null>(() => defaultTicket(initial.orders)?.id ?? null);
  const [online, setOnline] = useState(true);
  const [expired, setExpired] = useState(false);
  const [unseen, setUnseen] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(
    paymentReturn === "success" ? { text: "Payment received! We're confirming it with the payment provider…" } : paymentReturn === "cancelled" ? { text: "Online payment was cancelled. You can try again or pay with cash.", error: true } : null,
  );
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [split, setSplit] = useState(false);
  const [guests, setGuests] = useState(Math.min(Math.max(table.seats, 2), 4));

  const notify = useCallback((text: string, error = false) => setToast({ text, error }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Live updates ──
  const statusRef = useRef(status);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/tables/${token}/status`, { cache: "no-store" });
      if (res.status === 404) return setExpired(true);
      if (!res.ok) throw new Error(String(res.status));
      const next: TableStatusDto = await res.json();
      const prev = statusRef.current;
      for (const o of next.orders) {
        const before = prev.orders.find((p) => p.id === o.id);
        if (before && before.status !== o.status) {
          setUnseen(true);
          notify(
            o.status === "cancelled"
              ? `Order ${orderNumber(o.ticketNumber, o.placedAt)} was cancelled: ${o.cancelReason ?? "please ask your server"}`
              : o.status === "ready"
                ? `Order ${orderNumber(o.ticketNumber, o.placedAt)} is ready and on its way to your table!`
                : `Order ${orderNumber(o.ticketNumber, o.placedAt)}: ${STATUS_PILL[o.status].text}`,
            o.status === "cancelled",
          );
        }
      }
      for (const r of next.requests) {
        const before = prev.requests.find((p) => p.id === r.id);
        if (before?.status === "open" && r.status === "acknowledged") notify(`${SERVICE_REQUEST_LABEL[r.type]}: a server is on the way`);
      }
      if (next.bill.paidCents > prev.bill.paidCents) notify(next.bill.balanceCents === 0 ? "Payment successful. Your bill is fully paid. Thank you!" : `Payment of ${money(next.bill.paidCents - prev.bill.paidCents)} received.`);
      statusRef.current = next;
      setStatus(next);
      setOnline(true);
    } catch {
      setOnline(false); // Retries on the next tick
    }
  }, [token, notify, money]);

  useEffect(() => {
    // Coming back from the payment page: check right away instead of waiting a full tick
    const first = setTimeout(() => paymentReturn && refresh(), 300);
    const id = setInterval(() => !document.hidden && refresh(), POLL_MS);
    const onVisible = () => !document.hidden && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, paymentReturn]);

  // ── Derived state ──
  const { orders, requests, bill, paymentOptions } = status;
  const selected = orders.find((o) => o.id === selectedId) ?? defaultTicket(orders);
  const itemCount = orders.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.lines.reduce((m, l) => m + l.quantity, 0), 0);
  const pending = (type: ServiceRequestType) => requests.findLast((r) => r.type === type && r.status !== "resolved");
  const cashPending = pending("request_bill");
  const onlinePending = bill.payments.some((p) => p.method === "online" && p.status === "pending");
  const perGuest = splitEvenly(bill.balanceCents || bill.totalCents, guests);
  const canRate = !status.feedbackGiven && orders.some((o) => isDone(o.status));
  const menuHref = `/order/table/${token}`;

  // ── Actions ──
  const request = async (type: ServiceRequestType) => {
    if (busy) return;
    setBusy(type);
    try {
      const res = await fetch(`/api/tables/${token}/service-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't reach the staff. Please wave to your server.");
      notify(
        data.duplicate
          ? `${SERVICE_REQUEST_LABEL[type]}: already requested, the team has been notified`
          : type === "request_bill"
            ? "The cashier has been notified. Your server will bring your bill."
            : `${SERVICE_REQUEST_LABEL[type]}: request sent to the floor`,
      );
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Something went wrong.", true);
    } finally {
      setBusy(null);
    }
  };

  const payOnline = async () => {
    setBusy("online");
    try {
      const res = await fetch(`/api/tables/${token}/checkout`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string" || !data.url.startsWith("https://")) throw new Error(data.error ?? "Online payment is unavailable right now. Please pay with cash.");
      window.location.assign(data.url);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Something went wrong.", true);
      setBusy(null);
    }
  };

  const reorder = async (line: PlacedOrderLineDto, key: string) => {
    setBusy(key);
    try {
      const res = await fetch(`/api/tables/${token}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: [{ menuItemId: line.menuItemId, quantity: 1, optionIds: line.optionIds, note: line.note ?? "" }] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "We couldn't reorder that dish. Please try again or call your server.");
      const placed = data as PlacedOrderDto;
      notify(`Order ${orderNumber(placed.ticketNumber, placed.placedAt)} sent: 1× ${line.name}`);
      // Show the new ticket right away rather than waiting for the next poll
      statusRef.current = { ...statusRef.current, orders: [...statusRef.current.orders, placed] };
      setStatus(statusRef.current);
      setSelectedId(placed.id);
      setConfirming(null);
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Something went wrong.", true);
    } finally {
      setBusy(null);
    }
  };

  if (expired) {
    return (
      <main className="min-h-screen max-w-md mx-auto p-6 flex flex-col items-center justify-center text-center gap-3">
        <Icon name="qr_code_scanner" className="text-[48px] text-primary" />
        <h1 className="text-headline-md font-headline-md text-on-surface">This table code isn&apos;t active</h1>
        <p className="text-body-md font-body-md text-on-surface-variant">Please scan the QR code on your table again, or ask your server for help.</p>
      </main>
    );
  }

  const progress = selected ? ticketProgress(selected, now ?? Date.parse(selected.events.at(-1)?.at ?? selected.placedAt)) : null;
  const stations = selected ? [...new Set(selected.lines.map((l) => l.station).filter(Boolean))] : [];
  const paidInFull = bill.totalCents > 0 && bill.balanceCents === 0;

  return (
    <div className="min-h-screen flex flex-col antialiased font-body-md text-body-md selection:bg-primary-container selection:text-on-primary-container">
      {/* ── Top bar ── */}
      <header className="w-full sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-primary-container/20 border border-primary-container/40 flex items-center justify-center text-primary">
              <Icon name="restaurant" className="text-[20px]" />
            </div>
            <div className="min-w-0">
              <span className="font-headline-sm text-headline-sm sm:text-headline-md font-bold text-primary tracking-tight block leading-none truncate">{info.restaurant}</span>
              <span className="flex items-center gap-2 mt-1 font-label-sm text-label-sm text-on-surface-variant truncate">
                <span className={`inline-block w-2 h-2 shrink-0 rounded-full ${online ? "bg-tertiary motion-safe:animate-pulse" : "bg-error"}`} />
                {tableLabel(table.number)} • {info.branch} • {online ? "Live" : "Reconnecting…"}
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-4 lg:gap-6 whitespace-nowrap" aria-label="Table sections">
            <Link href={menuHref} className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors">
              Menu &amp; Reorder
            </Link>
            <a href="#live-tracker" aria-current="page" className="font-label-lg text-label-lg text-primary border-b-2 border-primary pb-1">
              Live Tracker
            </a>
            <a href="#bill-split" className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors">
              Bill &amp; Payment
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="#live-tracker"
              onClick={() => setUnseen(false)}
              aria-label={unseen ? "Order status updated" : "Order status"}
              title={unseen ? "Order status updated" : "Order status"}
              className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <Icon name="notifications" className="text-[20px]" />
              {unseen && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-container rounded-full" />}
            </a>
            <button
              type="button"
              onClick={() => request("call_server")}
              disabled={busy === "call_server"}
              aria-label="Call staff"
              className="inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg sm:border border-outline-variant/50 text-on-surface font-label-md text-label-md hover:bg-surface-container-high active:scale-95 transition-transform"
            >
              <Icon name={pending("call_server") ? "check_circle" : "room_service"} className="text-[18px] text-secondary" />
              <span className="hidden sm:inline">{pending("call_server") ? "Staff Called" : "Call Staff"}</span>
            </button>
            <a href="#bill-split" className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md font-bold shadow-sm hover:brightness-105 active:scale-95 transition-transform">
              <Icon name="credit_card" className="text-[16px]" />
              Pay Bill
            </a>
          </div>
        </div>
        <nav className="md:hidden max-w-7xl mx-auto px-3 pb-2 flex gap-1 overflow-x-auto no-scrollbar" aria-label="Table sections">
          <a href="#live-tracker" className="shrink-0 px-3 py-1.5 rounded-lg font-label-md text-label-md bg-primary-container/20 text-primary">
            Live Tracker
          </a>
          <a href="#bill-split" className="shrink-0 px-3 py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high">
            Bill &amp; Payment
          </a>
          <Link href={menuHref} className="shrink-0 px-3 py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high">
            Menu &amp; Reorder
          </Link>
        </nav>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 print:hidden">
        {!selected || !progress ? (
          <section className="max-w-lg mx-auto mt-10 rounded-xl bg-surface-container-low border border-outline-variant/30 p-8 flex flex-col items-center text-center gap-3">
            <Icon name="receipt_long" className="text-[48px] text-outline" />
            <h1 className="font-headline-md text-headline-md text-on-surface">Nothing ordered yet</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Pick your dishes from the menu and send them to the kitchen. You&apos;ll be able to follow every order here, live.</p>
            <Link href={menuHref} className="mt-2 inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary-container text-on-primary-container font-label-lg text-label-lg font-bold">
              <Icon name="restaurant_menu" className="text-[18px]" />
              Browse the Menu
            </Link>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {/* ── Left: live order ── */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-5 min-w-0">
              {orders.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Your orders">
                  {orders.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      role="tab"
                      aria-selected={o.id === selected.id}
                      onClick={() => setSelectedId(o.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-full border font-label-md text-label-md flex items-center gap-1.5 transition-colors ${
                        o.id === selected.id ? "bg-primary-container text-on-primary-container border-primary-container" : "bg-surface-container border-outline-variant/40 text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      #{o.ticketNumber}
                      <span className="opacity-80">• {STATUS_PILL[o.status].text}</span>
                    </button>
                  ))}
                </div>
              )}

              <section id="live-tracker" aria-live="polite" className="scroll-mt-28 bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 lg:p-6 shadow-sm relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-44 h-44 bg-primary-container/5 rounded-full blur-3xl pointer-events-none" />
                <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">Order {orderNumber(selected.ticketNumber, selected.placedAt)}</h1>
                      <span className={`px-2.5 py-0.5 rounded-full border font-label-sm text-label-sm uppercase tracking-wider font-semibold ${STATUS_PILL[selected.status].cls}`}>{STATUS_PILL[selected.status].text}</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                      {tableLabel(table.number)} • {stations.length ? `Stations: ${stations.join(" • ")}` : "Kitchen"}
                    </p>
                  </div>
                  {selected.status !== "cancelled" && (
                    <div className="flex items-center gap-3 bg-surface-container px-3.5 py-2 rounded-lg border border-outline-variant/40">
                      {progress.minutesLeft !== null && (
                        <span className="relative flex h-3 w-3">
                          <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary" />
                        </span>
                      )}
                      <div className="text-right">
                        <div className="font-label-sm text-label-sm text-on-surface-variant leading-none">{progress.minutesLeft !== null ? "Estimated wait" : "Status"}</div>
                        <div className="font-headline-sm text-headline-sm text-secondary font-bold leading-tight">
                          {progress.minutesLeft === null
                            ? isDone(selected.status)
                              ? "Served"
                              : "On its way"
                            : progress.late || progress.minutesLeft === 0
                              ? "Any moment now"
                              : `Est. ${progress.minutesLeft} min${progress.minutesLeft === 1 ? "" : "s"}`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {selected.status === "cancelled" ? (
                  <div role="alert" className="relative mt-4 rounded-lg bg-error-container/30 border border-error/30 p-4 flex items-start gap-3">
                    <Icon name="cancel" className="text-[24px] text-error" />
                    <div>
                      <p className="font-label-lg text-label-lg text-on-surface">This order was cancelled and won&apos;t be charged.</p>
                      <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">{selected.cancelReason ?? "Please ask your server for details."}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative mt-4">
                      <div className="flex justify-between items-center font-label-sm text-label-sm mb-1.5">
                        <span className="text-on-surface-variant font-medium">Order progress</span>
                        <span className="text-primary font-bold">{progress.pct}% Complete</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden" role="progressbar" aria-valuenow={progress.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Order progress">
                        <div className="h-full bg-linear-to-r from-secondary to-primary-container rounded-full transition-all duration-500" style={{ width: `${progress.pct}%` }} />
                      </div>
                    </div>

                    <ol className="relative mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                      {STAGES.map((stage, i) => {
                        const current = stageIndex(selected.status);
                        const done = i < current || (i === current && isDone(selected.status));
                        const active = i === current && !isDone(selected.status);
                        const time = progress.times[i];
                        return (
                          <li
                            key={stage.status}
                            aria-current={active ? "step" : undefined}
                            className={`p-3 rounded-lg flex flex-col justify-between relative ${
                              active ? "bg-surface-container border-2 border-primary-container/80 shadow-md" : done ? "bg-surface-container/60 border border-outline-variant/30" : "bg-surface-container-low border border-outline-variant/20 opacity-70"
                            }`}
                          >
                            {active && <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-primary-container text-on-primary-container rounded text-[9px] font-bold tracking-wider uppercase">Now</span>}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                    done ? "bg-tertiary/20 text-tertiary" : active ? "bg-primary-container text-on-primary-container motion-safe:animate-pulse" : "bg-surface-container-high text-outline"
                                  }`}
                                >
                                  {done ? <Icon name="check" className="text-[16px]" /> : active ? <Icon name={stage.icon} className="text-[14px]" /> : i + 1}
                                </span>
                                <span className={`font-label-sm text-label-sm ${active ? "text-primary font-bold" : "text-outline"}`}>{now === null ? "" : `${time.estimate ? "~" : ""}${clockTime(time.at)}`}</span>
                              </div>
                              <h2 className={`font-label-lg text-label-lg font-bold ${active ? "text-primary" : "text-on-surface"}`}>{stage.title}</h2>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{stage.detail}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                    {progress.minutesLeft !== null && <p className="relative mt-3 font-body-sm text-body-sm text-outline">Times marked ~ are estimates based on each dish&apos;s preparation time.</p>}
                  </>
                )}
              </section>

              {/* ── Items on this order ── */}
              <section className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 lg:p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2 border-b border-outline-variant/20">
                  <div>
                    <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Items in this order</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Round {orders.indexOf(selected) + 1}
                      {now !== null && ` • Sent at ${clockTime(Date.parse(selected.placedAt))}`}
                    </p>
                  </div>
                  <span className="font-label-sm text-label-sm px-2.5 py-1 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/30">
                    {selected.lines.reduce((n, l) => n + l.quantity, 0)} items • {money(selected.totalCents)} incl. VAT
                  </span>
                </div>
                <ul className="divide-y divide-outline-variant/20">
                  {selected.lines.map((l, i) => {
                    const key = lineKey(selected.id, i);
                    return (
                      <li key={key} className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-8 h-7 shrink-0 rounded bg-surface-container-highest border border-outline-variant/40 flex items-center justify-center font-bold text-primary font-label-md text-label-md mt-0.5">{l.quantity}x</span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className={`font-label-lg text-label-lg font-bold text-on-surface ${selected.status === "cancelled" ? "line-through" : ""}`}>{l.name}</h3>
                              <span className="px-2 py-0.5 rounded bg-primary-container/15 text-primary text-[10px] font-bold tracking-wider uppercase">{l.category}</span>
                            </div>
                            {(l.modifiers.length > 0 || l.note) && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {l.modifiers.map((m) => (
                                  <span key={m} className="px-2 py-0.5 rounded-full bg-secondary/10 border border-secondary/30 text-secondary font-label-sm text-label-sm">
                                    {m}
                                  </span>
                                ))}
                                {l.note && (
                                  <span className="px-2 py-0.5 rounded-full bg-surface-variant border border-outline-variant/40 text-on-surface-variant font-label-sm text-label-sm inline-flex items-center gap-1">
                                    <Icon name="edit_note" className="text-[13px]" />
                                    {l.note}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-3 pl-11 md:pl-0">
                          <span className="font-headline-sm text-headline-sm font-bold text-on-surface tabular-nums">{money(l.quantity * l.unitPriceCents)}</span>
                          {confirming === key ? (
                            <span className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => reorder(l, key)}
                                disabled={busy === key}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold active:scale-95 transition-all disabled:opacity-70"
                              >
                                <Icon name={busy === key ? "progress_activity" : "send"} className={`text-[15px] ${busy === key ? "motion-safe:animate-spin" : ""}`} />
                                Send 1× for {money(l.unitPriceCents)}
                              </button>
                              <button type="button" onClick={() => setConfirming(null)} aria-label="Cancel reorder" className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high">
                                <Icon name="close" className="text-[16px]" />
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirming(key)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm active:scale-95 transition-all"
                            >
                              <Icon name="replay" className="text-[15px] text-primary" />
                              Reorder
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* ── Dietary alert + quick service ── */}
              <section className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 shadow-sm space-y-3">
                {selected.note && (
                  <div className="p-3 rounded-lg bg-surface-container border border-tertiary/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-tertiary/15 border border-tertiary/30 text-tertiary flex items-center justify-center">
                        <Icon name="shield" className="text-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-label-md text-label-md text-on-surface font-bold">Special instructions on this order</span>
                        <p className="font-body-sm text-body-sm text-tertiary break-words">{selected.note}</p>
                      </div>
                    </div>
                    <span className="shrink-0 px-2 py-1 rounded bg-tertiary/20 text-tertiary text-xs font-semibold uppercase">Sent to kitchen</span>
                  </div>
                )}
                <div>
                  <h2 className="font-label-md text-label-md text-on-surface-variant font-medium mb-2">Need quick table service?</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {QUICK_SERVICE.map((s) => {
                      const req = pending(s.type);
                      return (
                        <button
                          key={s.type}
                          type="button"
                          onClick={() => request(s.type)}
                          disabled={busy === s.type}
                          aria-pressed={!!req}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center group active:scale-95 ${
                            req ? "bg-tertiary/10 border-tertiary/40" : "bg-surface-container border-outline-variant/30 hover:border-primary-container/60 hover:bg-surface-container-high"
                          }`}
                        >
                          <Icon name={req ? "check_circle" : s.icon} className={`text-[22px] group-hover:scale-110 transition-transform ${req ? "text-tertiary" : s.tone}`} />
                          <span className="font-label-sm text-label-sm text-on-surface mt-1.5 font-medium">{s.label}</span>
                          {req && <span className="font-label-sm text-label-sm text-tertiary mt-0.5">{req.status === "acknowledged" ? "On the way" : "Requested"}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {canRate && <FeedbackForm token={token} onDone={refresh} notify={notify} />}
            </div>

            {/* ── Right: bill and payment ── */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="lg:sticky lg:top-24 space-y-4">
                <section id="bill-split" className="scroll-mt-28 bg-surface-container-low border border-outline-variant/40 rounded-xl p-4 lg:p-6 shadow-md">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-outline-variant/20">
                    <div>
                      <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Your Bill</h2>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {tableLabel(table.number)} • {orders.filter((o) => o.status !== "cancelled").length} orders
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded border font-label-sm text-label-sm font-semibold flex items-center gap-1 ${paidInFull ? "bg-tertiary/15 border-tertiary/30 text-tertiary" : "bg-secondary/15 border-secondary/30 text-secondary"}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${paidInFull ? "bg-tertiary" : "bg-secondary"}`} />
                      {paidInFull ? "Paid" : "Payment pending"}
                    </span>
                  </div>

                  <dl className="py-3.5 space-y-2 border-b border-outline-variant/20">
                    <div className="flex justify-between items-center font-body-md text-body-md text-on-surface-variant">
                      <dt>
                        Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                      </dt>
                      <dd className="font-medium text-on-surface tabular-nums">{money(bill.subtotalCents)}</dd>
                    </div>
                    <div className="flex justify-between items-center font-body-md text-body-md text-on-surface-variant">
                      <dt>VAT ({info.taxRateBp / 100}%)</dt>
                      <dd className="font-medium text-on-surface tabular-nums">{money(bill.taxCents)}</dd>
                    </div>
                    <div className="flex justify-between items-center font-body-md text-body-md text-on-surface-variant">
                      <dt>Total</dt>
                      <dd className="font-medium text-on-surface tabular-nums">{money(bill.totalCents)}</dd>
                    </div>
                    {bill.paidCents > 0 && (
                      <div className="flex justify-between items-center font-body-md text-body-md text-tertiary">
                        <dt>Paid</dt>
                        <dd className="font-medium tabular-nums">−{money(bill.paidCents)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline gap-2 pt-2">
                      <dt className="font-headline-sm text-headline-sm font-bold text-on-surface">Amount due</dt>
                      <dd className="font-headline-lg text-headline-lg sm:text-headline-xl font-bold text-primary tabular-nums tracking-tight">{money(bill.balanceCents)}</dd>
                    </div>
                  </dl>

                  {bill.balanceCents > 0 && (
                    <div className="py-4 border-b border-outline-variant/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="flex items-center gap-2" id="split-label">
                          <Icon name="call_split" className="text-[18px] text-primary" />
                          <span className="font-label-md text-label-md font-bold text-on-surface">Split evenly (calculator)</span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={split}
                          aria-labelledby="split-label"
                          onClick={() => setSplit((v) => !v)}
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors ${split ? "bg-primary-container" : "bg-surface-container-highest"}`}
                        >
                          <span className={`block w-5 h-5 rounded-full shadow-md transition-transform ${split ? "translate-x-5 bg-on-primary-container" : "bg-outline"}`} />
                        </button>
                      </div>
                      {split && (
                        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/30 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-label-sm text-label-sm text-on-surface font-semibold">
                              {guests} {guests === 1 ? "guest" : "guests"}
                            </div>
                            <div className="font-headline-sm text-headline-sm font-bold text-secondary tabular-nums">
                              {money(perGuest.base + (perGuest.extra ? 1 : 0))} <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">/ guest</span>
                            </div>
                            {perGuest.extra > 0 && (
                              <div className="font-body-sm text-body-sm text-on-surface-variant">
                                {perGuest.extra} pay {money(perGuest.base + 1)}, {guests - perGuest.extra} pay {money(perGuest.base)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button" onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1} aria-label="Fewer guests" className="w-8 h-8 rounded bg-surface-container-high hover:bg-surface-bright flex items-center justify-center text-on-surface font-bold disabled:opacity-40">
                              −
                            </button>
                            <span className="w-6 text-center font-bold text-on-surface font-label-md text-label-md" aria-live="polite">
                              {guests}
                            </span>
                            <button type="button" onClick={() => setGuests((g) => Math.min(MAX_GUESTS, g + 1))} disabled={guests >= MAX_GUESTS} aria-label="More guests" className="w-8 h-8 rounded bg-surface-container-high hover:bg-surface-bright flex items-center justify-center text-on-surface font-bold disabled:opacity-40">
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 space-y-2.5">
                    {paidInFull ? (
                      <p className="rounded-lg bg-tertiary/10 border border-tertiary/30 p-3 text-tertiary font-label-lg text-label-lg flex items-center gap-2">
                        <Icon name="task_alt" className="text-[20px]" />
                        Fully paid. Thank you for dining with us!
                      </p>
                    ) : bill.totalCents > 0 ? (
                      <>
                        {paymentOptions.online && (
                          <button
                            type="button"
                            onClick={payOnline}
                            disabled={busy === "online"}
                            className="w-full py-3.5 px-4 rounded-lg bg-primary-container hover:brightness-105 text-on-primary-container font-headline-sm text-headline-sm font-bold tracking-tight shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-70"
                          >
                            <Icon name={busy === "online" ? "progress_activity" : "qr_code_2"} className={`text-[20px] ${busy === "online" ? "motion-safe:animate-spin" : ""}`} />
                            Pay Online {money(bill.balanceCents)}
                          </button>
                        )}
                        {paymentOptions.online && (
                          <p className="flex items-center justify-center gap-1.5 text-outline text-[11px] text-center">
                            <Icon name="lock" className="text-[14px]" />
                            GCash • Maya • Cards, on PayMongo&apos;s secure page
                          </p>
                        )}
                        {onlinePending && <p className="font-body-sm text-body-sm text-secondary text-center">An online payment is in progress. If you already paid, it will show here within a few seconds.</p>}
                        {paymentOptions.cash && (
                          <button
                            type="button"
                            onClick={() => request("request_bill")}
                            disabled={!!cashPending || busy === "request_bill"}
                            className={`w-full py-3 px-4 rounded-lg font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:active:scale-100 ${
                              paymentOptions.online ? "border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface" : "bg-primary-container text-on-primary-container font-bold shadow-md"
                            } disabled:bg-tertiary/15 disabled:text-tertiary disabled:border-tertiary/30`}
                          >
                            <Icon name={cashPending ? "check_circle" : "payments"} className="text-[18px]" />
                            {cashPending ? (cashPending.status === "acknowledged" ? "Server is bringing your bill" : "Cashier notified") : `Pay with Cash ${money(bill.balanceCents)}`}
                          </button>
                        )}
                        {!paymentOptions.online && !paymentOptions.cash && <p className="text-center text-on-surface-variant">Please pay at the counter.</p>}
                      </>
                    ) : null}

                    {bill.payments.filter((p) => p.status === "paid" || p.status === "refunded").length > 0 && (
                      <ul className="pt-2 flex flex-col gap-1 font-body-sm text-body-sm text-on-surface-variant">
                        {bill.payments
                          .filter((p) => p.status === "paid" || p.status === "refunded")
                          .map((p) => (
                            <li key={p.id} className="flex justify-between gap-2">
                              <span>
                                {p.method === "online" ? `Online${p.channel ? ` • ${CHANNEL_LABEL[p.channel] ?? p.channel}` : ""}` : PAYMENT_METHOD_LABEL[p.method]}
                                {p.status === "refunded" && " (refunded)"}
                              </span>
                              <span className="tabular-nums">{money(p.amountCents)}</span>
                            </li>
                          ))}
                      </ul>
                    )}

                    <Link
                      href={menuHref}
                      className="w-full py-2.5 px-4 rounded-lg border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Icon name="add_circle" className="text-[18px] text-primary" />
                      Add More Items
                    </Link>
                    <button type="button" onClick={() => window.print()} className="w-full py-2 px-3 text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm flex items-center justify-center gap-1 transition-colors">
                      <Icon name="receipt_long" className="text-[14px]" />
                      View / Save Digital Receipt
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-outline-variant/20 py-3 bg-surface text-center print:hidden">
        <p className="font-body-sm text-body-sm text-outline px-4">
          {info.restaurant} • {info.branch} • {tableLabel(table.number)} • {online ? "Live updates" : "Connection lost, retrying…"}
        </p>
      </footer>

      {/* Digital receipt: printed / saved as PDF instead of the page (see @media print in globals.css) */}
      <section className="print-area hidden print:block p-6 text-black bg-white max-w-sm mx-auto font-mono text-[12px]" aria-hidden>
        <p className="text-center text-base font-bold">{info.restaurant}</p>
        <p className="text-center">{info.branch}</p>
        <p className="text-center mb-2">{paidInFull ? "RECEIPT" : "BILL"}</p>
        <p>Table: {tableLabel(table.number)}</p>
        {now !== null && <p>Date: {new Date(now).toLocaleString()}</p>}
        {orders
          .filter((o) => o.status !== "cancelled")
          .map((o) => (
            <div key={o.id} className="mt-3">
              <p className="font-bold">{orderNumber(o.ticketNumber, o.placedAt)}</p>
              {o.lines.map((l, i) => (
                <p key={i} className="flex justify-between gap-6">
                  <span>
                    {l.quantity} x {l.name}
                    {l.modifiers.length > 0 && ` (${l.modifiers.join(", ")})`}
                  </span>
                  <span>{money(l.quantity * l.unitPriceCents)}</span>
                </p>
              ))}
            </div>
          ))}
        <div className="mt-3 border-t border-black pt-2">
          <p className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(bill.subtotalCents)}</span>
          </p>
          <p className="flex justify-between">
            <span>VAT ({info.taxRateBp / 100}%)</span>
            <span>{money(bill.taxCents)}</span>
          </p>
          <p className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{money(bill.totalCents)}</span>
          </p>
          {bill.payments
            .filter((p) => p.status === "paid")
            .map((p) => (
              <p key={p.id} className="flex justify-between">
                <span>Paid {p.method === "online" ? `online${p.channel ? ` (${CHANNEL_LABEL[p.channel] ?? p.channel})` : ""}` : p.method}</span>
                <span>{money(p.amountCents)}</span>
              </p>
            ))}
          <p className="flex justify-between">
            <span>Balance</span>
            <span>{money(bill.balanceCents)}</span>
          </p>
        </div>
        <p className="mt-4 text-center">Thank you for dining with us!</p>
      </section>

      <div aria-live="polite" className="fixed z-[60] bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md pointer-events-none print:hidden">
        {toast && (
          <div
            className={`px-4 py-3 rounded-lg shadow-2xl border font-label-md text-label-md flex items-center gap-2 ${
              toast.error ? "bg-error-container text-on-error-container border-error/30" : "bg-surface-container-highest text-on-surface border-outline-variant/40"
            }`}
          >
            <Icon name={toast.error ? "error" : "check_circle"} className={`text-[18px] ${toast.error ? "" : "text-tertiary"}`} />
            {toast.text}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackForm({ token, onDone, notify }: { token: string; onDone: () => Promise<void>; notify: (t: string, e?: boolean) => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  const submit = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/tables/${token}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't send your feedback.");
      notify("Thank you for your feedback!");
      await onDone();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Something went wrong.", true);
    } finally {
      setSending(false);
    }
  };
  return (
    <section className="bg-surface-container-low border border-secondary/40 rounded-xl p-4 lg:p-6 shadow-sm" aria-labelledby="rate-title">
      <h2 id="rate-title" className="font-headline-sm text-headline-sm font-bold text-on-surface">
        How was your meal?
      </h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant">Your rating goes straight to the restaurant&apos;s management.</p>
      <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => setRating(n)} className="p-1 rounded-lg hover:bg-surface-container-high">
            <Icon name="star" filled={n <= rating} className={`text-[32px] ${n <= rating ? "text-secondary" : "text-outline-variant"}`} />
          </button>
        ))}
        {rating > 0 && <span className="ml-2 font-label-lg text-label-lg text-secondary">{labels[rating]}</span>}
      </div>
      <label htmlFor="feedback-comment" className="sr-only">
        Comment
      </label>
      <textarea
        id="feedback-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={LIMITS.feedback}
        rows={2}
        placeholder="Tell us more (optional)"
        className="mt-3 w-full rounded-lg bg-surface-container border border-outline-variant/40 px-3 py-2 font-body-md text-body-md text-on-surface placeholder:text-outline outline-none focus:border-primary"
      />
      <button type="button" disabled={rating === 0 || sending} onClick={submit} className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary text-on-secondary font-label-lg text-label-lg font-bold disabled:opacity-50">
        <Icon name={sending ? "progress_activity" : "send"} className={`text-[18px] ${sending ? "motion-safe:animate-spin" : ""}`} />
        Send feedback
      </button>
    </section>
  );
}
