"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { closeBillAction, recordPaymentAction, refundPaymentAction, verifyPaymentAction } from "@/app/(staff)/actions";
import { Badge, Icon, btn, input } from "@/components/ui";
import type { BillDetailDto, FloorTableDto } from "@/lib/staffDto";
import { CHANNEL_LABEL, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, formatCents, orderNumber, tableLabel, type PaymentDto } from "@/lib/tableOrder";
import { useNow, usePoll, useToast } from "./hooks";

type FloorData = { tables: FloorTableDto[]; serverTime: string };

const PAYMENT_STATUS_CLS: Record<PaymentDto["status"], string> = {
  paid: "border-tertiary/40 text-tertiary",
  pending: "border-secondary/40 text-secondary",
  failed: "border-error/40 text-error",
  expired: "border-outline-variant text-outline",
  refunded: "border-error/40 text-error",
  cancelled: "border-outline-variant text-outline",
};

export default function CashierBoard({ initialFloor, initialBill, currency, isManager }: { initialFloor: FloorData; initialBill: BillDetailDto | null; currency: string; isManager: boolean }) {
  const { data } = usePoll<FloorData>("/api/staff/floor", initialFloor);
  const [billId, setBillId] = useState<string | null>(initialBill?.id ?? null);
  const [q, setQ] = useState("");
  const money = (c: number) => formatCents(c, currency);
  const open = data.tables.filter((t) => t.session && (t.session.tickets > 0 || t.session.requests.length > 0));
  const list = open.filter((t) => !q || tableLabel(t.number).toLowerCase().includes(q.toLowerCase()) || t.number === q.trim());
  const billRequested = (t: FloorTableDto) => t.session!.requests.some((r) => r.type === "request_bill");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      <section aria-label="Open bills" className="xl:col-span-4 rounded-xl bg-surface-container-low border border-outline-variant/30 p-4 flex flex-col gap-3 print:hidden">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Open bills ({open.length})</h2>
          <Link href="/cashier/order" className={`${btn.primary} min-h-9 px-3`}>
            <Icon name="add" className="text-[18px]" />
            New order
          </Link>
        </div>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find table (e.g. 5 or T-05)" aria-label="Find table" className={input} />
        {list.length === 0 ? (
          <p className="py-8 text-center font-body-md text-body-md text-on-surface-variant">No open bills.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list
              .sort((a, b) => Number(billRequested(b)) - Number(billRequested(a)))
              .map((t) => {
                const sel = t.session!.id === billId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setBillId(t.session!.id)}
                      aria-current={sel ? "true" : undefined}
                      className={`w-full text-left rounded-lg border p-3 flex items-center justify-between gap-3 transition-colors ${sel ? "border-primary bg-primary-container/10" : "border-outline-variant/30 bg-surface-container hover:bg-surface-container-high"}`}
                    >
                      <div className="min-w-0">
                        <p className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                          {tableLabel(t.number)}
                          {billRequested(t) && <Badge className="border-secondary/50 text-secondary">Bill requested</Badge>}
                        </p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {t.zone} • {t.session!.tickets} {t.session!.tickets === 1 ? "ticket" : "tickets"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-headline-sm text-headline-sm text-on-surface tabular-nums">{money(t.session!.balanceCents)}</p>
                        <p className={`font-label-sm text-label-sm ${t.session!.balanceCents === 0 && t.session!.totalCents > 0 ? "text-tertiary" : "text-on-surface-variant"}`}>
                          {t.session!.balanceCents === 0 && t.session!.totalCents > 0 ? "Paid in full" : "Balance due"}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      <div className="xl:col-span-8">
        {billId ? (
          <BillView key={billId} id={billId} initial={initialBill?.id === billId ? initialBill : null} money={money} isManager={isManager} />
        ) : (
          <div className="rounded-xl bg-surface-container-low border border-outline-variant/30 p-10 text-center text-on-surface-variant print:hidden">
            <Icon name="receipt_long" className="text-[44px] text-outline" />
            <p className="mt-2 font-headline-sm text-headline-sm text-on-surface">Select a bill</p>
            <p className="font-body-md text-body-md">Pick an open table on the left to take payment, print a receipt or close the table.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BillView({ id, initial, money, isManager }: { id: string; initial: BillDetailDto | null; money: (c: number) => string; isManager: boolean }) {
  const [bill, setBill] = useState<BillDetailDto | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const now = useNow();
  const { show, node } = useToast();

  const load = async () => {
    const res = await fetch(`/api/staff/bills/${id}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError(json.error ?? "Couldn't load this bill.");
    setBill(json);
  };
  useEffect(() => {
    const first = setTimeout(load, initial ? 4000 : 0);
    const t = setInterval(() => !document.hidden && load(), 5000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load closes over id only
  }, [id]);

  const act = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      show(r.ok ? (r.message ?? "Done.") : r.error!, !r.ok);
      await load();
      router.refresh();
    });

  if (error) return <p className="rounded-xl bg-error-container/30 text-on-error-container p-6">{error}</p>;
  if (!bill) return <p className="p-10 text-center text-on-surface-variant">Loading bill…</p>;
  const b = bill.bill;
  const closed = !!bill.closedAt;
  const cooking = bill.orders.filter((o) => ["submitted", "confirmed", "preparing", "ready"].includes(o.status));
  const pendingOnline = b.payments.filter((p) => p.status === "pending");

  return (
    <>
      <article className="rounded-xl bg-surface-container-low border border-outline-variant/30 print:hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-outline-variant/20">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">
              {tableLabel(bill.tableNumber)} bill {closed && <Badge className="border-tertiary/40 text-tertiary ml-2">Closed</Badge>}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {bill.zone} • Opened {now === null ? "" : new Date(bill.openedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <button type="button" onClick={() => window.print()} className={btn.secondary}>
            <Icon name="print" className="text-[18px]" />
            Print receipt
          </button>
        </header>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            {bill.orders.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant">No tickets on this bill yet.</p>}
            {bill.orders.map((o) => (
              <div key={o.id} className={`rounded-lg border border-outline-variant/30 p-3 ${o.status === "cancelled" ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-label-lg text-label-lg text-on-surface">{orderNumber(o.ticketNumber, o.placedAt)}</span>
                  <Badge className={o.status === "cancelled" ? "border-error/40 text-error" : "border-outline-variant/50 text-on-surface-variant"}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                </div>
                <ul className="flex flex-col gap-1 font-body-md text-body-md">
                  {o.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="text-on-surface">
                        {l.quantity}× {l.name}
                        {l.modifiers.length > 0 && <span className="block font-body-sm text-body-sm text-on-surface-variant">{l.modifiers.join(", ")}</span>}
                      </span>
                      <span className={`tabular-nums text-on-surface-variant shrink-0 ${o.status === "cancelled" ? "line-through" : ""}`}>{money(l.quantity * l.unitPriceCents)}</span>
                    </li>
                  ))}
                </ul>
                {o.cancelReason && <p className="mt-1 font-body-sm text-body-sm text-error">Cancelled: {o.cancelReason}</p>}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <dl className="rounded-lg bg-surface-container p-4 flex flex-col gap-1.5 font-body-md text-body-md">
              <Row k="Subtotal" v={money(b.subtotalCents)} />
              <Row k={`VAT / tax (${bill.taxRateBp / 100}%)`} v={money(b.taxCents)} />
              <Row k="Total" v={money(b.totalCents)} strong />
              <Row k="Paid" v={money(b.paidCents)} />
              <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-outline-variant/30">
                <dt className="font-headline-sm text-headline-sm text-on-surface">Balance</dt>
                <dd className={`font-headline-lg text-headline-lg font-bold tabular-nums ${b.balanceCents > 0 ? "text-primary" : "text-tertiary"}`}>{money(b.balanceCents)}</dd>
              </div>
            </dl>

            {b.payments.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="font-label-lg text-label-lg text-on-surface-variant">Payments</h3>
                {b.payments.map((p) => (
                  <PaymentRow key={p.id} p={p} money={money} isManager={isManager} pending={pending} onVerify={() => act(() => verifyPaymentAction(p.id))} onRefund={(reason) => act(() => refundPaymentAction(p.id, reason))} />
                ))}
              </div>
            )}

            {!closed && b.balanceCents > 0 && <PaymentForm key={b.balanceCents} sessionId={bill.id} balance={b.balanceCents} money={money} pending={pending} onSubmit={(input) => act(() => recordPaymentAction(input))} />}

            {!closed && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={pending || b.balanceCents > 0 || cooking.length > 0 || pendingOnline.length > 0}
                  onClick={() => act(() => closeBillAction(bill.id))}
                  className={btn.success}
                >
                  <Icon name="task_alt" className="text-[18px]" />
                  Close table & complete orders
                </button>
                <p className="font-body-sm text-body-sm text-outline">
                  {b.balanceCents > 0
                    ? "Collect the full balance first."
                    : cooking.length > 0
                      ? `Ticket #${cooking[0].ticketNumber} is still ${ORDER_STATUS_LABEL[cooking[0].status].toLowerCase()}.`
                      : pendingOnline.length > 0
                        ? "An online payment is in progress. Verify it first."
                        : "Paid in full. Closing completes the orders and frees the table for cleaning."}
                </p>
              </div>
            )}
          </div>
        </div>
      </article>

      <Receipt bill={bill} money={money} now={now} />
      {node}
    </>
  );
}

function Row({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={strong ? "font-label-lg text-label-lg text-on-surface" : "text-on-surface-variant"}>{k}</dt>
      <dd className={`tabular-nums ${strong ? "font-label-lg text-label-lg text-on-surface" : "text-on-surface"}`}>{v}</dd>
    </div>
  );
}

function PaymentRow({ p, money, isManager, pending, onVerify, onRefund }: { p: PaymentDto; money: (c: number) => string; isManager: boolean; pending: boolean; onVerify: () => void; onRefund: (reason: string) => void }) {
  const [refunding, setRefunding] = useState(false);
  const [reason, setReason] = useState("");
  const label = p.method === "online" ? `Online${p.channel ? ` • ${CHANNEL_LABEL[p.channel] ?? p.channel}` : ""}` : PAYMENT_METHOD_LABEL[p.method];
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-label-lg text-label-lg text-on-surface">{label}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
            {p.referenceNumber ? `Ref ${p.referenceNumber}` : " "}
            {p.method === "cash" && p.tenderedCents !== null && p.tenderedCents > p.amountCents && ` • Tendered ${money(p.tenderedCents)}, change ${money(p.tenderedCents - p.amountCents)}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-label-lg text-label-lg text-on-surface tabular-nums">{money(p.amountCents)}</p>
          <Badge className={PAYMENT_STATUS_CLS[p.status]}>{p.status}</Badge>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {p.method === "online" && p.status === "pending" && (
          <button type="button" disabled={pending} onClick={onVerify} className={btn.ghost}>
            <Icon name="verified" className="text-[16px]" />
            Verify with PayMongo
          </button>
        )}
        {isManager && p.status === "paid" && !refunding && (
          <button type="button" disabled={pending} onClick={() => setRefunding(true)} className={btn.ghost}>
            <Icon name="undo" className="text-[16px]" />
            Refund
          </button>
        )}
      </div>
      {refunding && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onRefund(reason);
            setRefunding(false);
          }}
        >
          <input required maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for refund" aria-label="Reason for refund" className={input} />
          {p.method === "online" && <p className="font-body-sm text-body-sm text-secondary">Also issue the refund in your PayMongo dashboard; this only records it here.</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={!reason.trim()} className={btn.danger}>
              Confirm refund
            </button>
            <button type="button" onClick={() => setRefunding(false)} className={btn.ghost}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const toCents = (v: string) => Math.round(Number(v.replace(/,/g, "")) * 100);

function PaymentForm({
  sessionId,
  balance,
  money,
  pending,
  onSubmit,
}: {
  sessionId: string;
  balance: number;
  money: (c: number) => string;
  pending: boolean;
  onSubmit: (input: { sessionId: string; method: string; amountCents: number; tenderedCents?: number | ""; reference?: string }) => void;
}) {
  const [method, setMethod] = useState<"cash" | "card" | "e_wallet">("cash");
  const [amount, setAmount] = useState((balance / 100).toFixed(2));
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const amountCents = toCents(amount);
  const tenderedCents = tendered ? toCents(tendered) : amountCents;
  const change = method === "cash" && Number.isFinite(tenderedCents) ? tenderedCents - amountCents : 0;
  const valid = Number.isFinite(amountCents) && amountCents > 0 && amountCents <= balance && (method !== "cash" || tenderedCents >= amountCents) && (method === "cash" || reference.trim().length > 0);

  return (
    <form
      className="rounded-lg border border-primary-container/40 bg-surface-container p-4 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ sessionId, method, amountCents, tenderedCents: method === "cash" ? tenderedCents : "", reference: method === "cash" ? undefined : reference });
      }}
    >
      <h3 className="font-headline-sm text-headline-sm text-on-surface">Take payment</h3>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
        {(
          [
            ["cash", "Cash", "payments"],
            ["card", "Card", "credit_card"],
            ["e_wallet", "E-wallet", "account_balance_wallet"],
          ] as const
        ).map(([m, text, icon]) => (
          <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className={`${method === m ? btn.primary : btn.secondary} flex-col min-h-16 gap-1`}>
            <Icon name={icon} className="text-[20px]" />
            {text}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface-variant">Amount (max {money(balance)})</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${input} tabular-nums`} />
        </label>
        {method === "cash" ? (
          <label className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface-variant">Cash received</span>
            <input inputMode="decimal" value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder={amount} className={`${input} tabular-nums`} />
          </label>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface-variant">Terminal reference no.</span>
            <input value={reference} maxLength={60} onChange={(e) => setReference(e.target.value)} className={input} />
          </label>
        )}
      </div>
      {method === "cash" && change > 0 && (
        <p className="rounded-lg bg-tertiary/10 text-tertiary px-3 py-2 font-headline-sm text-headline-sm tabular-nums" aria-live="polite">
          Change due: {money(change)}
        </p>
      )}
      <button type="submit" disabled={pending || !valid} className={btn.primary}>
        <Icon name={pending ? "progress_activity" : "check"} className={`text-[18px] ${pending ? "animate-spin" : ""}`} />
        Record {Number.isFinite(amountCents) && amountCents > 0 ? money(amountCents) : ""} payment
      </button>
    </form>
  );
}

function Receipt({ bill, money, now }: { bill: BillDetailDto; money: (c: number) => string; now: number | null }) {
  const b = bill.bill;
  const live = bill.orders.filter((o) => o.status !== "cancelled");
  return (
    <section className="print-area hidden print:block bg-white text-black p-6 max-w-sm mx-auto font-mono text-[12px]" aria-hidden>
      <div className="text-center">
        <p className="text-base font-bold">{bill.restaurant}</p>
        <p>{bill.branch}</p>
        {bill.address && <p>{bill.address}</p>}
        <p className="mt-1">OFFICIAL RECEIPT</p>
      </div>
      <p className="mt-3">Table: {tableLabel(bill.tableNumber)}</p>
      <p>Orders: {live.map((o) => orderNumber(o.ticketNumber, o.placedAt)).join(", ")}</p>
      {(bill.closedAt || now !== null) && <p>Date: {new Date(bill.closedAt ?? now!).toLocaleString()}</p>}
      <hr className="my-2 border-black" />
      {live.flatMap((o) =>
        o.lines.map((l, i) => (
          <div key={`${o.id}-${i}`} className="flex justify-between gap-4">
            <span>
              {l.quantity} x {l.name}
            </span>
            <span>{money(l.quantity * l.unitPriceCents)}</span>
          </div>
        )),
      )}
      <hr className="my-2 border-black" />
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{money(b.subtotalCents)}</span>
      </div>
      <div className="flex justify-between">
        <span>VAT ({bill.taxRateBp / 100}%)</span>
        <span>{money(b.taxCents)}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>TOTAL</span>
        <span>{money(b.totalCents)}</span>
      </div>
      {b.payments
        .filter((p) => p.status === "paid")
        .map((p) => (
          <div key={p.id} className="flex justify-between">
            <span>{p.method === "online" ? `Online ${p.channel ? CHANNEL_LABEL[p.channel] ?? p.channel : ""}` : PAYMENT_METHOD_LABEL[p.method]}</span>
            <span>{money(p.amountCents)}</span>
          </div>
        ))}
      <div className="flex justify-between">
        <span>Balance</span>
        <span>{money(b.balanceCents)}</span>
      </div>
      <p className="mt-4 text-center">Thank you for dining with us!</p>
    </section>
  );
}
