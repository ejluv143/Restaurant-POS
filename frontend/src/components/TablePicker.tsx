"use client";

import Link from "next/link";
import { FLOOR_TABLES, billTotal, type TableId, type TableStatus } from "@/lib/floorTables";
import { peso } from "@/lib/rooms";
import { useTableBills, type TableBill } from "@/lib/tableBills";

const STATUS_LABEL: Record<TableStatus, { label: string; text: string; dot: string }> = {
  seated: { label: "Seated", text: "text-primary", dot: "bg-primary" },
  bill: { label: "Bill Out", text: "text-tertiary", dot: "bg-tertiary" },
  available: { label: "Available", text: "text-secondary", dot: "bg-secondary" },
  bussing: { label: "Needs Bussing", text: "text-error", dot: "bg-error" },
};

/** "Choose a Table" list used when a screen is opened without ?table= (e.g. from the top navigation) */
export default function TablePicker({
  subtitle,
  href,
  blocked,
}: {
  subtitle: string;
  href: (id: TableId) => string;
  /** Reason a table can't be picked on this screen, or null when it can */
  blocked: (bill: TableBill) => string | null;
}) {
  const bills = useTableBills();
  return (
    <>
      <div className="bg-surface-container-high p-space-md flex flex-col gap-space-xs">
        <h2 className="font-headline-sm text-headline-sm text-on-surface leading-tight">Choose a Table</h2>
        <span className="font-label-sm text-label-sm text-on-surface-variant">{subtitle}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-space-sm grid grid-cols-2 gap-space-xs content-start">
        {Object.values(FLOOR_TABLES).map((t) => {
          const bill = bills[t.id];
          const status = STATUS_LABEL[bill.status];
          const reason = blocked(bill);
          const body = (
            <>
              <span className="flex items-center justify-between gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{t.id}</span>
                {bill.lines.length > 0 && <span className="font-label-md text-label-md text-on-surface font-semibold">{peso(billTotal(bill.lines))}</span>}
              </span>
              <span className={`font-label-sm text-label-sm ${status.text} flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span> {bill.payment ? "Paid" : status.label} • Seats {t.seats}
              </span>
            </>
          );
          return reason ? (
            <div key={t.id} className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-1 opacity-50" title={reason}>
              {body}
            </div>
          ) : (
            <Link key={t.id} href={href(t.id)} className="p-space-sm rounded-lg bg-surface-container hover:bg-surface-container-highest flex flex-col gap-1 transition-colors">
              {body}
            </Link>
          );
        })}
      </div>
    </>
  );
}
