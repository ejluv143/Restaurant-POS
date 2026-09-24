import { useSyncExternalStore } from "react";
import type { Payment } from "./checkout";
import { FLOOR_TABLES, type BillLine, type TableId, type TableStatus } from "./floorTables";

// Each table's live bill, shared by the floor plan and Order Entry. Saved in this browser only
// (it starts from the sample data) until tables and orders move to a database.

export interface TableBill {
  status: TableStatus;
  guests?: number;
  server?: string;
  lines: BillLine[];
  /** Still the design's sample session (its tile, timer and ticket number); false once the table moves on */
  sample?: boolean;
  /** Set when the check is paid; cleared when the table is closed */
  payment?: Payment;
}

export type TableBills = Record<TableId, TableBill>;

/** Signed-in staff member shown in the POS header; seats walk-ins until real logins exist */
const CURRENT_SERVER = "Andrea R.";

const KEY = "pos.tableBills";
const DEFAULTS = Object.fromEntries(
  Object.values(FLOOR_TABLES).map((t) => [t.id, { status: t.status, guests: t.guests, server: t.server, lines: t.lines ?? [], sample: true }]),
) as TableBills;

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: TableBills = DEFAULTS;
// Used when localStorage is unavailable (private mode, blocked storage)
let memory: TableBills | null = null;

function read(): TableBills {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return memory ?? DEFAULTS;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<TableBills>) } : DEFAULTS;
    } catch {
      cached = DEFAULTS;
    }
  }
  return cached;
}

function write(bills: TableBills) {
  memory = bills;
  try {
    localStorage.setItem(KEY, JSON.stringify(bills));
  } catch {
    // Keep working from memory for this visit
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Bills saved before the sample flag existed count as sample while they keep their original status */
export const isSample = (id: TableId, bill: TableBill) => bill.sample ?? bill.status === FLOOR_TABLES[id].status;

export function useTableBills(): TableBills {
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}

function update(id: TableId, change: (bill: TableBill) => TableBill) {
  const bills = read();
  write({ ...bills, [id]: change(bills[id]) });
}

export function updateLine(id: TableId, index: number, line: BillLine) {
  update(id, (b) => ({ ...b, lines: b.lines.map((l, i) => (i === index ? line : l)) }));
}

/** Adds an unsent line, stacking it onto an identical unsent line when there is one */
export function addLine(id: TableId, line: BillLine) {
  update(id, (b) => {
    const same = b.lines.findIndex((l) => l.unsent && l.name === line.name && l.mods === line.mods && l.note === line.note);
    if (same === -1) return { ...b, lines: [...b.lines, { ...line, unsent: true }] };
    return {
      ...b,
      lines: b.lines.map((l, i) => (i === same ? { ...l, qty: l.qty + line.qty, price: l.price + line.price } : l)),
    };
  });
}

/** Changes the quantity of an unsent line; reaching zero removes it */
export function changeQty(id: TableId, index: number, delta: number) {
  update(id, (b) => ({
    ...b,
    lines: b.lines.flatMap((l, i) => {
      if (i !== index) return [l];
      const qty = l.qty + delta;
      return qty > 0 ? [{ ...l, qty, price: (l.price / l.qty) * qty }] : [];
    }),
  }));
}

export function removeLine(id: TableId, index: number) {
  update(id, (b) => ({ ...b, lines: b.lines.filter((_, i) => i !== index) }));
}

/** Sends unsent lines to the kitchen; an empty table becomes seated */
export function sendTicket(id: TableId) {
  update(id, (b) => ({
    ...b,
    sample: b.status === "available" ? false : isSample(id, b),
    status: b.status === "available" ? "seated" : b.status,
    guests: b.guests ?? FLOOR_TABLES[id].seats,
    server: b.server ?? CURRENT_SERVER,
    lines: b.lines.map((l) => ({ ...l, unsent: undefined })),
  }));
}

export function recordPayment(id: TableId, payment: Payment) {
  update(id, (b) => ({ ...b, payment }));
}

/** After payment the table is cleared and waits for the busser */
export function closeTable(id: TableId) {
  write({ ...read(), [id]: { status: "bussing", lines: [], sample: false } });
}

export function markCleaned(id: TableId) {
  write({ ...read(), [id]: { status: "available", lines: [], sample: false } });
}
