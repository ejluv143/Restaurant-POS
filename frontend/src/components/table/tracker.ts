import { ticketPrepMinutes, type OrderStatus, type PlacedOrderDto } from "@/lib/tableOrder";

// Live-tracker estimates. Actual times come from the ticket's status history; upcoming steps are
// estimated from the slowest dish's prep time, and always labelled as estimates in the UI.

const MIN = 60_000;
const QUEUE_MIN = 2; // typical wait before the kitchen accepts a new ticket
const START_MIN = 2; // accepted → on the stove
const RUN_MIN = 3; // pass to table

type Stage = Exclude<OrderStatus, "cancelled" | "completed">;

export const STAGES: { status: Stage; title: string; detail: string; icon: string }[] = [
  { status: "submitted", title: "Order Placed", detail: "Waiting for the kitchen to accept", icon: "receipt_long" },
  { status: "confirmed", title: "Confirmed", detail: "The kitchen accepted your order", icon: "thumb_up" },
  { status: "preparing", title: "Preparing", detail: "Your dishes are being cooked", icon: "skillet" },
  { status: "ready", title: "Ready", detail: "Plated and on its way to you", icon: "room_service" },
  { status: "served", title: "Served", detail: "Enjoy your meal!", icon: "restaurant" },
];

const ORDER: Stage[] = ["submitted", "confirmed", "preparing", "ready", "served"];
/** Completed (bill settled) displays as served. */
export const stageIndex = (status: OrderStatus) => ORDER.indexOf(status === "completed" ? "served" : (status as Stage));
export const isDone = (status: OrderStatus) => status === "served" || status === "completed";

const eventAt = (o: PlacedOrderDto, status: OrderStatus) => {
  const e = o.events.findLast((x) => x.status === status);
  return e ? Date.parse(e.at) : status === "submitted" ? Date.parse(o.placedAt) : undefined;
};

export interface TicketProgress {
  pct: number;
  /** Actual (done) or estimated (upcoming) time for each stage */
  times: { at: number; estimate: boolean }[];
  /** Estimated minutes until the food leaves the pass; null once it has */
  minutesLeft: number | null;
  late: boolean;
}

export function ticketProgress(o: PlacedOrderDto, now: number): TicketProgress {
  const prep = ticketPrepMinutes(o) * MIN;
  const placed = eventAt(o, "submitted")!;
  const confirmedAt = eventAt(o, "confirmed");
  const started = eventAt(o, "preparing");
  const readyAt = eventAt(o, "ready");
  const servedAt = eventAt(o, "served") ?? eventAt(o, "completed");

  const confirmEst = confirmedAt ?? Math.max(placed + QUEUE_MIN * MIN, now);
  const startEst = started ?? Math.max(confirmEst + START_MIN * MIN, now);
  const readyEst = readyAt ?? Math.max(startEst + prep, now);
  const servedEst = servedAt ?? Math.max(readyEst + RUN_MIN * MIN, now);

  const times = [
    { at: placed, estimate: false },
    { at: confirmEst, estimate: !confirmedAt },
    { at: startEst, estimate: !started },
    { at: readyEst, estimate: !readyAt },
    { at: servedEst, estimate: !servedAt },
  ];

  let pct = 100;
  if (o.status === "submitted") pct = 5 + Math.min(5, ((now - placed) / (QUEUE_MIN * MIN)) * 5);
  else if (o.status === "confirmed") pct = 15;
  else if (o.status === "preparing") pct = 25 + Math.min(1, (now - startEst) / prep) * 60;
  else if (o.status === "ready") pct = 90;
  else if (o.status === "cancelled") pct = 0;

  const due = startEst + prep;
  const inKitchen = o.status === "submitted" || o.status === "confirmed" || o.status === "preparing";
  return {
    pct: Math.round(pct),
    times,
    minutesLeft: inKitchen ? Math.max(0, Math.ceil((due - now) / MIN)) : null,
    late: inKitchen && now > due,
  };
}

export const clockTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
