// Client-safe types and money math for QR table ordering. The server (lib/tableOrdering.ts)
// uses the same functions, so what the guest sees is exactly what gets charged.

// submitted (pending) → confirmed (kitchen accepted) → preparing → ready → served → completed (bill settled)
export type OrderStatus = "submitted" | "confirmed" | "preparing" | "ready" | "served" | "completed" | "cancelled";
export type ServiceRequestType = "call_server" | "water_cutlery" | "request_bill" | "sommelier" | "napkins";
export type ServiceRequestStatus = "open" | "acknowledged" | "resolved";
export type PaymentMethod = "cash" | "card" | "e_wallet" | "online";
export type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "refunded" | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  submitted: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const SERVICE_REQUEST_LABEL: Record<ServiceRequestType, string> = {
  call_server: "Call Server",
  water_cutlery: "Water & Cutlery",
  request_bill: "Bill / Cash Payment",
  sommelier: "Drinks Advice",
  napkins: "Napkins & Wet Wipes",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = { cash: "Cash", card: "Card (terminal)", e_wallet: "E-wallet (terminal)", online: "Online" };
export const CHANNEL_LABEL: Record<string, string> = { gcash: "GCash", paymaya: "Maya", card: "Card", grab_pay: "GrabPay", qrph: "QR Ph", dob: "Online Banking", billease: "BillEase", shopee_pay: "ShopeePay" };

/** Customer-facing order number, e.g. SH-2026-001025 (derived, never stored). */
export const orderNumber = (ticketNumber: number, placedAt: string | Date) => `SH-${new Date(placedAt).getFullYear()}-${String(ticketNumber).padStart(6, "0")}`;

/** "5" → "T-05" */
export const tableLabel = (number: string) => `T-${number.padStart(2, "0")}`;

export interface ModifierOptionDto {
  id: string;
  name: string;
  priceDeltaCents: number;
  isDefault: boolean;
}

export interface ModifierGroupDto {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: ModifierOptionDto[];
}

export interface MenuItemDto {
  id: string;
  categorySlug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  prepMinutes: number | null;
  highlightLabel: string | null;
  isSignature: boolean;
  station: string | null;
  tags: string[];
  modifierGroups: ModifierGroupDto[];
  /** False when this branch has it marked sold out: shown as "Currently Unavailable", can't be ordered */
  available: boolean;
}

export interface TableMenuDto {
  restaurant: string;
  branch: { name: string; currency: string; taxRateBp: number; wifiSsid: string | null; wifiPassword: string | null };
  table: { number: string; seats: number; zone: string; zoneDescription: string | null };
  categories: { slug: string; name: string }[];
  dietaryTags: { code: string; label: string }[];
  items: MenuItemDto[];
}

export interface PlacedOrderLineDto {
  /** For "Reorder": the same dish and options, re-priced by the server */
  menuItemId: string;
  optionIds: string[];
  name: string;
  category: string;
  station: string | null;
  prepMinutes: number | null;
  quantity: number;
  unitPriceCents: number;
  modifiers: string[];
  note: string | null;
}

export interface PlacedOrderDto {
  id: string;
  ticketNumber: number;
  status: OrderStatus;
  placedAt: string;
  /** When the ticket entered each status so far (oldest first) */
  events: { status: OrderStatus; at: string }[];
  note: string | null;
  cancelReason: string | null;
  lines: PlacedOrderLineDto[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export interface ServiceRequestDto {
  id: string;
  type: ServiceRequestType;
  status: ServiceRequestStatus;
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  tenderedCents: number | null;
  channel: string | null;
  referenceNumber: string | null;
  createdAt: string;
  paidAt: string | null;
}

/** A table visit's bill. Cancelled tickets don't count; only "paid" payments reduce the balance. */
export interface BillDto {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  payments: PaymentDto[];
}

export interface TableInfoDto {
  restaurant: string;
  branch: string;
  currency: string;
  taxRateBp: number;
  table: { number: string; seats: number; zone: string };
}

/** GET /api/tables/:token/status: everything the live tracker polls for */
export interface TableStatusDto {
  orders: PlacedOrderDto[];
  requests: ServiceRequestDto[];
  bill: BillDto;
  paymentOptions: { cash: boolean; online: boolean };
  feedbackGiven: boolean;
}

/** What the browser sends to POST /api/tables/:token/orders. Prices are never sent. */
export interface PlaceOrderRequest {
  lines: { menuItemId: string; quantity: number; optionIds: string[]; note?: string }[];
  note?: string;
}

export const LIMITS = { maxLines: 30, maxQty: 20, maxOptions: 10, lineNote: 140, orderNote: 200, feedback: 500 } as const;

export const unitPrice = (basePriceCents: number, optionDeltas: number[]) => basePriceCents + optionDeltas.reduce((s, d) => s + d, 0);

export function totals(subtotalCents: number, taxRateBp: number) {
  const taxCents = Math.round((subtotalCents * taxRateBp) / 10000);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

/** Sums tickets (minus cancelled ones) and paid payments into a bill. */
export function billFor(orders: PlacedOrderDto[], payments: PaymentDto[]): BillDto {
  const live = orders.filter((o) => o.status !== "cancelled");
  const sum = (f: (o: PlacedOrderDto) => number) => live.reduce((s, o) => s + f(o), 0);
  const paidCents = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountCents, 0);
  const totalCents = sum((o) => o.totalCents);
  return { subtotalCents: sum((o) => o.subtotalCents), taxCents: sum((o) => o.taxCents), totalCents, paidCents, balanceCents: Math.max(0, totalCents - paidCents), payments };
}

/** Longest dish on the ticket: the kitchen fires lines together, so the slowest one sets the pace. */
export const ticketPrepMinutes = (o: PlacedOrderDto) => Math.max(5, ...o.lines.map((l) => l.prepMinutes ?? 0));

/** Even split in cents that always adds back up to the total: the first `extra` guests pay one cent more. */
export function splitEvenly(totalCents: number, guests: number) {
  const base = Math.floor(totalCents / guests);
  return { base, extra: totalCents - base * guests };
}

const formatters = new Map<string, Intl.NumberFormat>();
export function formatCents(cents: number, currency: string) {
  let f = formatters.get(currency);
  if (!f) formatters.set(currency, (f = new Intl.NumberFormat(currency === "PHP" ? "en-PH" : "en-US", { style: "currency", currency })));
  return f.format(cents / 100);
}
