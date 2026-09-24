"use client";

import { DISCOUNT_LABEL, PAYMENT_LABEL, isStatutory, type Payment } from "@/lib/checkout";
import type { BillLine, TableId } from "@/lib/floorTables";
import { peso } from "@/lib/rooms";

/** Printable slip for a paid table. Not BIR-registered, so it must say it is not an official receipt. */
export default function CheckoutReceipt({
  tableId,
  guests,
  server,
  lines,
  payment,
  onClose,
}: {
  tableId: TableId;
  guests: number;
  server?: string;
  lines: BillLine[];
  payment: Payment;
  onClose: () => void;
}) {
  const b = payment.breakdown;
  const d = payment.discount;
  const statutory = isStatutory(d.kind);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/70 backdrop-blur-sm p-space-md print:static print:bg-white print:p-0" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Receipt"
        onClick={(e) => e.stopPropagation()}
        className="print-area w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 font-mono text-sm text-zinc-900 shadow-xl print:max-h-none print:shadow-none"
      >
        <div className="text-center">
          <p className="text-lg font-bold">THE OAKWOOD BISTRO</p>
          <p className="text-xs">Terminal #04 • Dining Main</p>
          <p className="mt-2 border border-zinc-900 px-2 py-1 text-xs font-bold">THIS IS NOT AN OFFICIAL RECEIPT</p>
          <p className="mt-2">Receipt {payment.receiptNo}</p>
          <p className="text-xs text-zinc-600">{new Date(payment.paidAt).toLocaleString("en-PH")}</p>
          <p className="mt-1 text-xs">
            Table {tableId} • {guests} {guests === 1 ? "guest" : "guests"}
            {server ? ` • Server: ${server}` : ""}
          </p>
        </div>
        <hr className="my-3 border-dashed border-zinc-400" />
        {lines.map((l, i) => (
          <div key={`${l.name}-${i}`} className="mb-1">
            <div className="flex justify-between gap-2">
              <span>
                {l.qty} × {l.name}
              </span>
              <span className="shrink-0">{peso(l.price)}</span>
            </div>
            {l.mods && <p className="pl-4 text-xs text-zinc-600">{l.mods}</p>}
          </div>
        ))}
        <hr className="my-3 border-dashed border-zinc-400" />
        <Row label="Subtotal (VAT incl.)" value={peso(b.total)} />
        {statutory && (
          <>
            <Row label="Less 12% VAT exemption" value={`-${peso(b.vatExemption)}`} />
            <Row label={`Less ${DISCOUNT_LABEL[d.kind as "senior" | "pwd"].long}`} value={`-${peso(b.statutoryDiscount)}`} />
          </>
        )}
        {b.percentDiscount > 0 && d.kind !== "none" && <Row label={`Less ${DISCOUNT_LABEL[d.kind].long}`} value={`-${peso(b.percentDiscount)}`} />}
        <div className="mt-1 flex justify-between text-base font-bold">
          <span>TOTAL DUE</span>
          <span>{peso(b.due)}</span>
        </div>
        <hr className="my-3 border-dashed border-zinc-400" />
        <Row label="VATable Sales" value={peso(b.vatableSales)} />
        <Row label="VAT-Exempt Sales" value={peso(b.vatExemptSales)} />
        <Row label="VAT 12%" value={peso(b.vat)} />
        {statutory && (
          <div className="mt-2 text-xs">
            <p>
              {d.kind === "senior" ? "OSCA" : "PWD"} ID: {d.idNo}
            </p>
            <p>Name: {d.holder}</p>
            <p>
              Qualifying guests: {d.guests} of {guests}
            </p>
            <p className="mt-3">Signature: ______________________</p>
          </div>
        )}
        <hr className="my-3 border-dashed border-zinc-400" />
        <Row label={`Paid via ${PAYMENT_LABEL[payment.method]}`} value={peso(payment.method === "cash" ? (payment.tendered ?? b.due) : b.due)} />
        {payment.method === "cash" ? <Row label="Change" value={peso(payment.change ?? 0)} /> : <Row label="Reference No." value={payment.reference ?? ""} />}
        <p className="mt-4 text-center">Thank you! Come again.</p>
        <p className="text-center text-xs">This is not an official receipt.</p>

        <div className="mt-6 flex gap-2 font-sans print:hidden">
          <button type="button" onClick={() => window.print()} className="flex-1 rounded-lg bg-zinc-200 py-3 font-medium">
            Print
          </button>
          <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-zinc-900 py-3 font-semibold text-white">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  );
}
