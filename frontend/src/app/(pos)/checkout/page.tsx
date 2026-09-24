"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import CheckoutReceipt from "@/components/CheckoutReceipt";
import TablePicker from "@/components/TablePicker";
import {
  DISCOUNT_LABEL,
  NO_DISCOUNT,
  PAYMENT_LABEL,
  computeCheck,
  isStatutory,
  type Discount,
  type DiscountKind,
  type PaymentMethod,
} from "@/lib/checkout";
import { FLOOR_TABLES, billTotal, type TableId } from "@/lib/floorTables";
import { peso } from "@/lib/rooms";
import { closeTable, recordPayment, useTableBills } from "@/lib/tableBills";

const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0"];

const PAD_BUTTON =
  "h-11 bg-surface-container-high hover:bg-surface-container-highest active:scale-95 text-on-surface rounded-lg font-label-md text-label-md font-bold transition-all select-none disabled:opacity-40 disabled:active:scale-100";
const CASH_BUTTON =
  "py-1.5 bg-surface-container-high hover:bg-surface-container-highest active:scale-95 text-on-surface rounded font-label-sm text-label-sm font-semibold transition-all select-none disabled:opacity-40 disabled:active:scale-100";
const CASH_BUTTON_ACTIVE = "py-1.5 bg-primary-container active:scale-95 text-on-primary-container rounded font-label-sm text-label-sm font-semibold transition-all select-none";
const SPLIT_SOON =
  "px-space-lg py-space-sm rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-space-xs select-none opacity-50 cursor-not-allowed";

export default function CheckoutPage() {
  // The table comes from ?table=T1; the static export prerenders the table list until the URL is read
  return (
    <Suspense fallback={<Checkout tableId={null} />}>
      <CheckoutForUrl />
    </Suspense>
  );
}

function CheckoutForUrl() {
  const table = useSearchParams().get("table");
  return <Checkout tableId={table !== null && table in FLOOR_TABLES ? (table as TableId) : null} />;
}

function Checkout({ tableId }: { tableId: TableId | null }) {
  if (tableId) return <CheckoutTable key={tableId} id={tableId} />;
  return (
    <div className="w-full p-space-sm sm:p-space-md flex justify-center">
      <div className="w-full max-w-2xl flex flex-col bg-surface-container-low rounded-xl shadow-xl overflow-hidden">
        <TablePicker
          subtitle="Pick the table that is paying."
          href={(id) => `/checkout?table=${id}`}
          blocked={(bill) => (bill.lines.length === 0 || (bill.status !== "seated" && bill.status !== "bill") ? "No open bill on this table" : null)}
        />
      </div>
    </div>
  );
}

/** Suggested cash amounts just above what is due, e.g. ₱1,000 / ₱1,500 / ₱2,000 for ₱932.14 */
function cashSuggestions(due: number) {
  const out: number[] = [];
  for (const step of [50, 100, 500, 1000]) {
    const n = Math.ceil(due / step) * step;
    if (n > due && !out.includes(n)) out.push(n);
  }
  while (out.length < 3) out.push((out.at(-1) ?? Math.ceil(due)) + 1000);
  return out.slice(0, 3);
}

function CheckoutTable({ id }: { id: TableId }) {
  const router = useRouter();
  const bill = useTableBills()[id];
  const table = FLOOR_TABLES[id];
  const guests = bill.guests ?? table.seats;
  const total = billTotal(bill.lines);
  const unsent = bill.lines.reduce((n, l) => n + (l.unsent ? l.qty : 0), 0);
  const paid = bill.payment;

  const [discount, setDiscount] = useState<Discount>(NO_DISCOUNT);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [currentTender, setCurrentTender] = useState("0.00");
  const [reference, setReference] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

  const shownDiscount = paid ? paid.discount : discount;
  const check = paid ? paid.breakdown : computeCheck(total, guests, discount);
  const due = check.due;
  const tendered = parseFloat(currentTender) || 0;
  const diff = tendered - due;
  const statutory = isStatutory(shownDiscount.kind);
  const idLabel = shownDiscount.kind === "pwd" ? "PWD ID" : "OSCA ID";

  // Why payment can't be taken yet; null when it can
  const blocked =
    bill.lines.length === 0
      ? "There is nothing on this bill."
      : unsent > 0
        ? `${unsent} ${unsent === 1 ? "item hasn't" : "items haven't"} been sent to the kitchen. Send or remove ${unsent === 1 ? "it" : "them"} in Order Entry first.`
        : statutory && (!discount.idNo.trim() || !discount.holder.trim())
          ? `Enter the ${idLabel} number and the name on the ID for the ${DISCOUNT_LABEL[discount.kind as "senior" | "pwd"].short} discount.`
          : null;
  const locked = !!paid || bill.lines.length === 0 || unsent > 0;

  const chooseCash = () => setMethod("cash");
  const setCash = (amount: number) => {
    chooseCash();
    setCurrentTender(amount.toFixed(2));
  };
  const pressPad = (val: string) => {
    chooseCash();
    setCurrentTender((cur) => {
      if (val === "C") return "0.00";
      if (cur === "0.00") return val;
      return cur.length < 7 ? cur + val : cur;
    });
  };

  const pickDiscount = (kind: DiscountKind) => setDiscount((d) => ({ ...d, kind }));
  const presetAmount = (kind: DiscountKind) => {
    const c = computeCheck(total, guests, { ...discount, kind });
    return total - c.due;
  };

  const pay = (payMethod: PaymentMethod) => {
    recordPayment(id, {
      method: payMethod,
      amount: due,
      ...(payMethod === "cash" ? { tendered, change: Math.round(diff * 100) / 100 } : { reference: reference.trim() }),
      discount,
      breakdown: check,
      paidAt: new Date().toISOString(),
      receiptNo: `OR-${Date.now().toString().slice(-8)}`,
    });
    setShowReceipt(true);
  };

  const close = () => {
    closeTable(id);
    router.push(`/?table=${id}`);
  };

  const canPayCash = !locked && !blocked && tendered >= due;
  const canPayOther = !locked && !blocked && method !== null && method !== "cash" && reference.trim().length >= 4;

  return (
    <div className="flex flex-col w-full">
      {/* Table Metadata Top Ticker */}
      <div className="w-full bg-surface-container-low px-space-md sm:px-space-lg py-space-sm shadow-sm flex flex-wrap items-center justify-between gap-space-sm sm:gap-space-md select-none">
        <div className="flex flex-wrap items-center gap-space-sm sm:gap-space-md">
          <Link
            href="/checkout"
            className="w-10 h-10 shrink-0 rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-all active:scale-95"
            title="Back to Choose a Table"
            aria-label="Back to Choose a Table"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </Link>
          <div className="flex items-center gap-space-xs bg-surface-container px-space-md py-1 rounded-full shadow-sm">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${paid ? "bg-secondary" : "bg-tertiary animate-pulse"}`}></span>
            <span className={`font-label-sm text-label-sm ${paid ? "text-secondary" : "text-tertiary"}`}>TABLE {id}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-space-xs text-on-surface">
            <span className="font-headline-sm text-headline-sm tracking-tight">Main Dining Room</span>
            <span className="text-on-surface-variant font-label-md text-label-md">/</span>
            <span className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">badge</span> {bill.server ?? "—"}
            </span>
            <span className="text-on-surface-variant font-label-md text-label-md">/</span>
            <span className="font-label-md text-label-md text-on-surface-variant">Covers: {guests} Guests</span>
          </div>
        </div>
        {/* Live Bill Aggregates Ticker */}
        <div className="w-full sm:w-auto flex items-center justify-between gap-space-sm sm:gap-space-lg">
          <div className="min-w-0 flex items-center gap-space-sm sm:gap-space-md bg-surface-container-lowest px-space-sm sm:px-space-md py-1 rounded-xl shadow-inner overflow-x-auto no-scrollbar [&>*]:shrink-0">
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Paid Balance</span>
              <span className="font-label-md text-label-md text-secondary font-semibold tabular-nums">{peso(paid ? paid.amount : 0)}</span>
            </div>
            <div className="w-px h-6 bg-surface-container-highest"></div>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-error uppercase">Balance Due</span>
              <span className="font-label-md text-label-md text-on-surface tabular-nums font-bold">{peso(paid ? 0 : due)}</span>
            </div>
            <div className="w-px h-6 bg-surface-container-highest"></div>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Check Total</span>
              <span className="font-label-lg text-label-lg text-primary tabular-nums font-bold tracking-tight">{peso(total)}</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs shrink-0">
            <button
              className="h-10 px-space-md bg-surface-container hover:bg-surface-container-high active:scale-95 text-on-surface rounded-lg font-label-sm text-label-sm flex items-center gap-1 transition-all shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span> Itemize
            </button>
            <button
              className="h-10 px-space-md bg-surface-container hover:bg-surface-container-high active:scale-95 text-on-surface rounded-lg font-label-sm text-label-sm flex items-center gap-1 transition-all shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
          </div>
        </div>
      </div>

      {/* Workbench Grid */}
      <div className="w-full p-space-sm sm:p-space-md flex flex-col gap-space-md">
        {/* Split Strategy Control Ribbon (splitting comes in a later round; whole check only for now) */}
        <div className="w-full bg-surface-container p-space-xs rounded-xl flex items-center justify-between gap-space-sm flex-wrap shadow-md">
          <div className="flex items-center gap-space-xs flex-wrap">
            <button className={SPLIT_SOON} type="button" disabled title="Coming soon">
              <span className="material-symbols-outlined text-[18px]">person_pin_circle</span>
              Split by Seat ({guests} Guests)
            </button>
            <button className={SPLIT_SOON} type="button" disabled title="Coming soon">
              <span className="material-symbols-outlined text-[18px]">call_split</span>
              Split Evenly
              <span className="bg-surface-container-lowest px-1.5 py-0.5 rounded text-primary text-label-sm font-label-sm">÷{guests}</span>
            </button>
            <button className={SPLIT_SOON} type="button" disabled title="Coming soon">
              <span className="material-symbols-outlined text-[18px]">calculate</span>
              Custom Amount
            </button>
            <button
              className="px-space-lg py-space-sm rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md flex items-center gap-space-xs shadow-sm select-none"
              type="button"
              aria-pressed="true"
            >
              <span className="material-symbols-outlined text-[18px]">credit_card</span>
              Single Full Payment
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-space-xs px-space-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-secondary">pie_chart</span>
              Split Allocation:
            </span>
            <div className="w-32 h-2.5 bg-surface-container-lowest rounded-full overflow-hidden flex">
              <div className="h-full bg-secondary transition-all" style={{ width: paid ? "100%" : "0%" }}></div>
            </div>
            <span className="font-label-sm text-label-sm text-secondary tabular-nums ml-1 font-semibold">{paid ? 1 : 0} / 1 Paid</span>
          </div>
        </div>

        {/* Payment can't start until every item is in the kitchen */}
        {unsent > 0 && !paid && (
          <div className="w-full bg-error-container/30 text-on-surface rounded-xl p-space-md flex flex-wrap items-center justify-between gap-space-sm">
            <span className="flex items-center gap-space-xs font-body-md text-body-md">
              <span className="material-symbols-outlined text-error text-[22px]">warning</span>
              {unsent} {unsent === 1 ? "item hasn't" : "items haven't"} been sent to the kitchen. Send or remove {unsent === 1 ? "it" : "them"} before taking payment.
            </span>
            <Link
              href={`/order-entry?table=${id}`}
              className="px-space-md py-space-xs rounded-lg bg-error-container text-on-error-container font-label-md text-label-md font-bold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">post_add</span> Open Order Entry
            </Link>
          </div>
        )}

        {/* 3-Column Ergonomic Touch Workbench */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-space-md items-start">
          {/* COLUMN 1: Whole Check */}
          <div className="lg:col-span-4 flex flex-col gap-space-md">
            <div className="flex items-center justify-between px-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">groups</span>
                Whole Check
              </span>
            </div>

            <div className={`relative ${paid ? "bg-surface-container-low" : "bg-surface-container"} rounded-xl p-space-md shadow-xl overflow-hidden transition-all`}>
              {paid ? (
                <div className="absolute -right-6 -top-4 w-32 h-16 bg-secondary/10 rotate-12 flex items-center justify-center pointer-events-none">
                  <span className="text-secondary font-label-md text-label-md font-bold tracking-widest uppercase">PAID</span>
                </div>
              ) : (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
              )}
              <div className="flex items-center justify-between mb-space-sm pl-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div
                    className={`w-8 h-8 rounded-full ${paid ? "bg-secondary-container text-on-secondary-container" : "bg-primary-container text-on-primary-container"} font-label-md text-label-md flex items-center justify-center font-bold`}
                  >
                    {id}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface leading-tight">Whole Check • {guests} Guests</span>
                    {paid ? (
                      <span className="font-label-sm text-label-sm text-secondary font-medium">
                        {PAYMENT_LABEL[paid.method]}
                        {paid.reference ? ` • Ref ${paid.reference}` : ""} Approved
                      </span>
                    ) : (
                      <span className="font-label-sm text-label-sm text-primary font-medium flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span> Active Target
                      </span>
                    )}
                  </div>
                </div>
                {paid ? (
                  <span className="bg-secondary/15 text-secondary px-space-sm py-0.5 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span> PAID
                  </span>
                ) : (
                  <span className="bg-primary/15 text-primary px-space-sm py-0.5 rounded-full font-label-sm text-label-sm font-semibold">PENDING</span>
                )}
              </div>
              {/* Items Breakdown */}
              <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-1.5 pl-space-sm mb-space-sm">
                {bill.lines.length === 0 && <span className="font-body-sm text-body-sm text-on-surface-variant">No items on this bill.</span>}
                {bill.lines.map((l, i) => (
                  <div key={`${l.name}-${i}`} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface">
                      <span className="truncate pr-2 flex items-center gap-1">
                        {l.unsent && <span className="bg-error-container text-on-error-container px-1 rounded text-[10px]">NOT SENT</span>}
                        {l.qty}x {l.name}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">{peso(l.price)}</span>
                    </div>
                    {l.mods && (
                      <div className="text-[11px] font-body-sm text-on-surface-variant pl-space-sm flex items-center gap-1">
                        <span className="text-tertiary">•</span> {l.mods}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Financial Subtotals */}
              <div className="flex flex-wrap items-center justify-between gap-x-space-sm px-space-xs font-label-sm text-label-sm text-on-surface-variant pt-space-xs mb-1">
                <span>
                  Subtotal {peso(total)} • VAT 12% incl. {peso(total - Math.round((total / 1.12) * 100) / 100)}
                </span>
                <span className="text-on-surface">{paid ? "Settled" : "Table Due"}</span>
              </div>
              <div className="flex items-baseline justify-between px-space-xs">
                <span className={`font-label-sm text-label-sm ${paid ? "text-secondary" : "text-primary"} uppercase tracking-wider font-semibold`}>{paid ? "Paid" : "Balance Due"}</span>
                <span className={`font-display-lg text-[32px] ${paid ? "text-secondary" : "text-primary"} font-bold tabular-nums leading-none tracking-tight`}>{peso(due)}</span>
              </div>
              {paid && (
                <div className="flex justify-end gap-space-xs mt-space-sm pt-space-xs">
                  <button
                    onClick={() => setShowReceipt(true)}
                    className="px-space-sm py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded text-label-sm font-label-sm flex items-center gap-1 transition-colors"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">print</span> Repr. Slip
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: Active Payment Terminal Action Console (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            {/* Interactive Tender Display Card */}
            <div className="bg-surface-container rounded-xl p-space-md sm:p-space-lg shadow-xl relative overflow-hidden">
              {/* Header for active target */}
              <div className="flex flex-wrap items-center justify-between gap-space-xs mb-space-md pb-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="p-2 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
                  </span>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface">Tendering {id} • Whole Check</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{paid ? "Payment complete" : "Select payment method & discount"}</span>
                  </div>
                </div>
                <button className="text-tertiary hover:bg-surface-container-high px-space-sm py-1 rounded font-label-sm text-label-sm flex items-center gap-1 transition-colors" type="button">
                  <span className="material-symbols-outlined text-[16px]">percent</span> Promo / Comp
                </button>
              </div>
              {/* Total Calculation Hero Area */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-inner mb-space-md">
                <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm mb-1">
                  <span>BASE DUE FOR TABLE {id}</span>
                  <span className="tabular-nums">{peso(total)}</span>
                </div>
                {statutory && (
                  <>
                    <div className="flex justify-between items-center gap-space-sm text-secondary font-label-sm text-label-sm mb-1">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">receipt_long</span> LESS 12% VAT EXEMPTION ({shownDiscount.guests} OF {guests} GUESTS)
                      </span>
                      <span className="tabular-nums font-bold">−{peso(check.vatExemption)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-space-sm text-secondary font-label-sm text-label-sm mb-2">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">{shownDiscount.kind === "pwd" ? "accessible" : "elderly"}</span> LESS{" "}
                        {DISCOUNT_LABEL[shownDiscount.kind as "senior" | "pwd"].long.toUpperCase()}
                      </span>
                      <span className="tabular-nums font-bold">−{peso(check.statutoryDiscount)}</span>
                    </div>
                  </>
                )}
                {check.percentDiscount > 0 && shownDiscount.kind !== "none" && (
                  <div className="flex justify-between items-center gap-space-sm text-secondary font-label-sm text-label-sm mb-2">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">sell</span> LESS {DISCOUNT_LABEL[shownDiscount.kind].long.toUpperCase()}
                    </span>
                    <span className="tabular-nums font-bold">−{peso(check.percentDiscount)}</span>
                  </div>
                )}
                <div className="h-px bg-surface-container-highest my-space-xs"></div>
                <div className="flex flex-wrap justify-between items-baseline gap-x-space-sm pt-1">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">{paid ? "Total Paid" : "Total to Authorize"}</span>
                    <span className="font-label-sm text-label-sm text-tertiary">
                      {statutory ? `VAT-exempt share • ${idLabel} #${shownDiscount.idNo || "—"}` : "VAT 12% inclusive"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-display-lg text-display-lg text-on-surface font-extrabold tracking-tight tabular-nums text-primary">{peso(due)}</span>
                  </div>
                </div>
              </div>
              {/* Quick Discount Grid */}
              <div className="mb-space-md">
                <div className="flex flex-wrap items-center justify-between gap-x-space-sm mb-space-xs">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Discount Presets</label>
                  <span className="font-label-sm text-label-sm text-secondary">OSCA / PWD ID required</span>
                </div>
                <div className="grid grid-cols-3 gap-space-xs">
                  {(["pwd", "senior", "promo", "employee"] as const).map((kind) => (
                    <PresetButton
                      key={kind}
                      label={DISCOUNT_LABEL[kind].short}
                      amount={`−${peso(presetAmount(kind))}`}
                      selected={shownDiscount.kind === kind}
                      disabled={locked}
                      onClick={() => pickDiscount(kind)}
                    />
                  ))}
                  <button
                    className="py-space-sm px-1 bg-surface-container-high text-on-surface rounded-lg flex flex-col items-center justify-center select-none opacity-50 cursor-not-allowed"
                    type="button"
                    disabled
                    title="Coming soon"
                  >
                    <span className="font-label-md text-label-md font-bold">Custom Discount</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Amount / %</span>
                  </button>
                  <PresetButton label="No Discount" amount={peso(0)} selected={shownDiscount.kind === "none"} disabled={locked} onClick={() => pickDiscount("none")} />
                </div>
                {/* Senior / PWD details: qualifying guests and the ID for the receipt */}
                {statutory && !paid && (
                  <div className="mt-space-sm bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between gap-space-sm">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Qualifying guests</span>
                      <div className="flex items-center gap-space-xs">
                        <StepButton icon="remove" label="One fewer qualifying guest" disabled={discount.guests <= 1} onClick={() => setDiscount((d) => ({ ...d, guests: d.guests - 1 }))} />
                        <span className="w-16 text-center font-label-md text-label-md text-on-surface font-bold">
                          {discount.guests} of {guests}
                        </span>
                        <StepButton icon="add" label="One more qualifying guest" disabled={discount.guests >= guests} onClick={() => setDiscount((d) => ({ ...d, guests: d.guests + 1 }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
                      <TextField label={`${idLabel} No.`} value={discount.idNo} placeholder="e.g. 12-4491" onChange={(v) => setDiscount((d) => ({ ...d, idNo: v }))} />
                      <TextField label="Name on ID" value={discount.holder} placeholder="e.g. Lourdes Santos" onChange={(v) => setDiscount((d) => ({ ...d, holder: v }))} />
                    </div>
                  </div>
                )}
              </div>
              {/* Payment Tender Method Tiles */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Select Payment Channel</label>
                <div className="grid grid-cols-2 gap-space-xs">
                  {/* Primary Card Terminal Trigger */}
                  <button
                    onClick={() => setMethod("gcash")}
                    disabled={locked}
                    aria-pressed={method === "gcash"}
                    className={`col-span-2 min-h-[56px] px-space-md py-space-sm bg-primary-container hover:bg-primary-container/90 active:scale-[0.98] text-on-primary-container rounded-xl flex items-center justify-between gap-space-sm shadow-lg transition-all select-none disabled:opacity-50 disabled:active:scale-100 ${method === "gcash" ? "ring-2 ring-primary ring-offset-2 ring-offset-surface-container" : ""}`}
                    type="button"
                  >
                    <div className="flex items-center gap-space-sm sm:gap-space-md min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-surface/30 flex items-center justify-center text-on-primary-container">
                        <span className="material-symbols-outlined text-[24px]">qr_code_2</span>
                      </div>
                      <div className="flex flex-col text-left min-w-0">
                        <span className="font-headline-sm text-headline-sm font-bold">GCash / QR Ph</span>
                        <span className="font-label-sm text-label-sm text-on-primary-container/80 truncate">Scan QR • InstaPay • Instant Confirm</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-label-md text-label-md font-bold tabular-nums">
                      Send {peso(due)} <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </div>
                  </button>
                  <ChannelButton icon="payments" tone="text-secondary" title="Cash / Drawer" sub="Exact or Change" selected={method === "cash"} disabled={locked} onClick={chooseCash} />
                  <ChannelButton icon="account_balance_wallet" tone="text-secondary" title="Maya" sub="QR • Tap to Pay" selected={method === "maya"} disabled={locked} onClick={() => setMethod("maya")} />
                  <ChannelButton icon="account_balance" tone="text-primary" title="House Account" sub="Coming soon" selected={false} disabled onClick={() => {}} />
                  <ChannelButton icon="credit_card" tone="text-on-surface" title="Credit / Debit Card" sub="EMV Tap • Chip • Swipe" selected={method === "card"} disabled={locked} onClick={() => setMethod("card")} />
                </div>
                {/* GCash / Maya / card: record the approval from the phone or card terminal */}
                {method && method !== "cash" && !paid && (
                  <div className="mt-space-xs bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-space-xs">
                    <TextField
                      label={`${PAYMENT_LABEL[method]} reference / approval no.`}
                      value={reference}
                      placeholder={method === "card" ? "e.g. approval code 004512" : "e.g. 1009 482 331"}
                      onChange={setReference}
                    />
                    <button
                      onClick={() => pay(method)}
                      disabled={!canPayOther}
                      className="w-full min-h-[48px] bg-secondary-container hover:bg-secondary-container/90 active:scale-[0.98] text-on-secondary-container font-label-md text-label-md font-bold rounded-lg flex items-center justify-center gap-1 shadow transition-all disabled:opacity-40 disabled:active:scale-100"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span> Confirm {peso(due)} Received
                    </button>
                  </div>
                )}
                {blocked && !paid && unsent === 0 && <p className="font-label-sm text-label-sm text-error">{blocked}</p>}
              </div>
            </div>

            {/* Split Progress Visualization */}
            <div className="bg-surface-container p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
              <div className="flex flex-wrap items-center justify-between gap-x-space-sm text-label-sm font-label-sm">
                <span className="text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                  Payment Session Completeness
                </span>
                <span className="text-on-surface font-bold tabular-nums">{paid ? 1 : 0} of 1 Checks Settled</span>
              </div>
              <div className="w-full h-3 bg-surface-container-lowest rounded-full overflow-hidden flex">
                <div className={`h-full transition-all ${paid ? "bg-secondary" : "bg-primary animate-pulse"}`} style={{ width: paid ? "100%" : "4%" }}></div>
              </div>
              <div className="flex flex-wrap justify-between gap-x-space-sm font-label-sm text-label-sm text-on-surface-variant pt-0.5">
                <span className={paid ? "text-secondary font-medium" : "text-primary font-medium"}>
                  • Whole check ({peso(due)}
                  {statutory ? ` w/ ${DISCOUNT_LABEL[shownDiscount.kind as "senior" | "pwd"].short.replace(" 20%", "")} disc.` : ""}) {paid ? "Paid" : "Tendering"}
                </span>
              </div>
            </div>
          </div>

          {/* COLUMN 3: Hardware Terminal Status, Cash Tender & Final Actions (3 Cols) */}
          <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-col gap-space-md items-start lg:items-stretch">
            {/* Live Integrated Hardware Hub Status */}
            <div className="bg-surface-container rounded-xl p-space-md shadow-md flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Hardware Hub</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-label-sm text-label-sm font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span> ONLINE
                </span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center gap-space-sm mt-1">
                <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[24px]">terminal</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md font-bold text-on-surface truncate">Verifone P400 (T#02)</span>
                  <span className="font-label-sm text-label-sm text-secondary truncate">Prompting Guest: Scan QR / Tap</span>
                </div>
              </div>
              <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant px-1 pt-1">
                <span>Customer Facing Screen:</span>
                <span className="text-on-surface font-medium">Mirroring Table {id}</span>
              </div>
              <div className="flex gap-space-xs pt-1">
                <button
                  className="flex-1 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded text-label-sm font-label-sm flex items-center justify-center gap-1 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span> Ping PinPad
                </button>
                <button
                  className="flex-1 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded text-label-sm font-label-sm flex items-center justify-center gap-1 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">cancel</span> Cancel Tx
                </button>
              </div>
            </div>

            {/* Quick Cash Keypad & Quick Presets */}
            <div className="bg-surface-container rounded-xl p-space-md shadow-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Cash Calculation</span>
                <span className="font-label-sm text-label-sm text-tertiary">Drawer #01</span>
              </div>
              {/* Tender Input Display */}
              <div className="bg-surface-container-lowest p-space-sm rounded-lg flex items-center justify-between shadow-inner">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">Tendered:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-primary font-label-sm text-label-sm">₱</span>
                  <span className="font-label-lg text-label-lg font-bold text-on-surface tabular-nums" id="calc-tender-display">
                    {paid?.method === "cash" ? (paid.tendered ?? 0).toFixed(2) : currentTender}
                  </span>
                </div>
              </div>
              {/* Quick Cash Bills Bar */}
              <div className="grid grid-cols-4 gap-1">
                <button className={tendered === due && method === "cash" ? CASH_BUTTON_ACTIVE : CASH_BUTTON} onClick={() => setCash(due)} disabled={locked} type="button">
                  Exact
                </button>
                {cashSuggestions(due).map((n) => (
                  <button key={n} className={tendered === n && method === "cash" ? CASH_BUTTON_ACTIVE : CASH_BUTTON} onClick={() => setCash(n)} disabled={locked} type="button">
                    ₱{n.toLocaleString("en-PH")}
                  </button>
                ))}
              </div>
              {/* Projected Change */}
              <div className="bg-surface-container-low px-space-sm py-1.5 rounded flex items-center justify-between font-label-sm text-label-sm">
                <span className="text-secondary font-medium">Change to Return:</span>
                {paid?.method === "cash" ? (
                  <span className="font-label-md text-label-md text-secondary font-bold tabular-nums">{peso(paid.change ?? 0)}</span>
                ) : (
                  <span className={`font-label-md text-label-md ${diff >= 0 ? "text-secondary" : "text-error"} font-bold tabular-nums`} id="calc-change-display">
                    {diff >= 0 ? peso(diff) : `-${peso(Math.abs(diff))} (Short)`}
                  </span>
                )}
              </div>
              {/* Tactile NumPad for fast custom tender */}
              <div className="grid grid-cols-3 gap-1 pt-1">
                {PAD_KEYS.map((k) => (
                  <button key={k} className={PAD_BUTTON} onClick={() => pressPad(k)} disabled={locked} type="button">
                    {k}
                  </button>
                ))}
                <button
                  className="h-11 bg-error-container hover:bg-error-container/80 active:scale-95 text-on-error-container rounded-lg font-label-md text-label-md font-bold transition-all select-none flex items-center justify-center disabled:opacity-40"
                  onClick={() => pressPad("C")}
                  disabled={locked}
                  type="button"
                  aria-label="Clear tendered amount"
                >
                  <span className="material-symbols-outlined text-[20px]">backspace</span>
                </button>
              </div>
              <button
                onClick={() => pay("cash")}
                disabled={!canPayCash}
                className="w-full mt-1 min-h-[44px] bg-secondary-container hover:bg-secondary-container/90 active:scale-[0.98] text-on-secondary-container font-label-md text-label-md font-bold rounded-lg flex items-center justify-center gap-1 shadow transition-all disabled:opacity-40 disabled:active:scale-100"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">lock_open</span> Open Drawer &amp; Tender Cash
              </button>
            </div>

            {/* Post-Payment & Close Table Ribbon */}
            <div className="bg-surface-container rounded-xl p-space-md shadow-md flex flex-col gap-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Post Payment Receipt</span>
              <div className="grid grid-cols-3 gap-1">
                <ReceiptButton icon="print" tone="text-primary" label="Print Slip" disabled={!paid} title={paid ? undefined : "Available after payment"} onClick={() => setShowReceipt(true)} />
                <ReceiptButton icon="sms" tone="text-secondary" label="SMS" disabled title="Needs a server; coming later" />
                <ReceiptButton icon="mail" tone="text-tertiary" label="Email" disabled title="Needs a server; coming later" />
              </div>
              <div className="h-px bg-surface-container-highest my-0.5"></div>
              {/* Final table close trigger */}
              <button
                onClick={close}
                disabled={!paid}
                className={`w-full min-h-[50px] active:scale-[0.98] font-label-md text-label-md rounded-xl flex flex-wrap items-center justify-between gap-x-space-sm gap-y-1 px-space-md py-space-xs transition-all disabled:active:scale-100 disabled:cursor-not-allowed ${
                  paid
                    ? "bg-secondary-container hover:bg-secondary-container/90 text-on-secondary-container shadow-md"
                    : "bg-surface-container-highest text-on-surface-variant opacity-70"
                }`}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[20px] ${paid ? "" : "text-tertiary"}`}>table_restaurant</span>
                  <span className="font-semibold">Close Table {id} &amp; Free Floor</span>
                </div>
                <span className="text-[11px] font-label-sm uppercase bg-surface-container-lowest px-2 py-0.5 rounded text-outline">{paid ? "Paid • Ready" : "Requires Payment"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showReceipt && paid && (
        <CheckoutReceipt
          tableId={id}
          guests={guests}
          server={bill.server}
          lines={bill.lines}
          payment={paid}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}

function PresetButton({
  label,
  amount,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  amount: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return selected ? (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed="true"
      className="py-space-sm px-1 bg-primary-container text-on-primary-container rounded-lg flex flex-col items-center justify-center shadow-md select-none scale-[1.02] ring-2 ring-primary"
      type="button"
    >
      <span className="font-label-md text-label-md font-bold flex items-center gap-1">
        {label} <span className="material-symbols-outlined text-[14px] text-tertiary-fixed">star</span>
      </span>
      <span className="font-label-sm text-label-sm text-on-primary-container font-semibold tabular-nums">{amount}</span>
    </button>
  ) : (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed="false"
      className="py-space-sm px-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg flex flex-col items-center justify-center transition-all select-none disabled:opacity-50"
      type="button"
    >
      <span className="font-label-md text-label-md font-bold">{label}</span>
      <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">{amount}</span>
    </button>
  );
}

function ChannelButton({
  icon,
  tone,
  title,
  sub,
  selected,
  disabled,
  onClick,
}: {
  icon: string;
  tone: string;
  title: string;
  sub: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`min-h-[56px] p-space-sm bg-surface-container-high hover:bg-surface-container-highest active:scale-[0.98] text-on-surface rounded-xl flex items-center gap-space-sm transition-all select-none disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed ${
        selected ? "ring-2 ring-primary bg-surface-container-highest" : ""
      }`}
      type="button"
    >
      <div className={`w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center ${tone} shrink-0`}>
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div className="flex flex-col text-left min-w-0">
        <span className="font-label-md text-label-md font-bold truncate">{title}</span>
        <span className="font-label-sm text-label-sm text-on-surface-variant truncate">{sub}</span>
      </div>
    </button>
  );
}

function ReceiptButton({ icon, tone, label, disabled, title, onClick }: { icon: string; tone: string; label: string; disabled: boolean; title?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg flex flex-col items-center justify-center transition-colors text-label-sm font-label-sm disabled:opacity-40 disabled:cursor-not-allowed"
      type="button"
    >
      <span className={`material-symbols-outlined text-[18px] ${tone} mb-0.5`}>{icon}</span> {label}
    </button>
  );
}

function StepButton({ icon, label, disabled, onClick }: { icon: string; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 40))}
        placeholder={placeholder}
        className="h-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </label>
  );
}
