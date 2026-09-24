// Sample floor-plan data for the selected-table panel until tables and orders come from a database.
// Each table's items add up to the total printed on its tile in the floor plan.

export type TableId = "T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7" | "T8";

export type TableStatus = "seated" | "bill" | "available" | "bussing";

export interface BillLine {
  qty: number;
  name: string;
  mods: string;
  /** Line total including modifier charges, VAT-inclusive */
  price: number;
  /** Free-text instruction for the kitchen */
  note?: string;
  /** Changed after the order was sent, so the kitchen should re-check it */
  modified?: boolean;
  /** Added in Order Entry but not sent to the kitchen yet */
  unsent?: boolean;
}

export interface FloorTable {
  id: TableId;
  name: string;
  /** Tile subtitle, e.g. "Booth • 4-Top" */
  label: string;
  seats: number;
  status: TableStatus;
  /** Shown under the status: course or bill stage for occupied tables, cleaning note for empty ones */
  stage: string;
  guests?: number;
  server?: string;
  ticket?: string;
  elapsed?: string;
  progress?: { label: string; icon: string; minutes: number; width: string };
  lines?: BillLine[];
}

export const FLOOR_TABLES: Record<TableId, FloorTable> = {
  T1: {
    id: "T1",
    name: "T1 - Booth",
    label: "Booth • 4-Top",
    seats: 4,
    status: "seated",
    stage: "Entrees Fired",
    guests: 4,
    server: "Andrea R.",
    ticket: "#8921",
    elapsed: "0:42:15",
    progress: { label: "Course 2: Entrees In Progress", icon: "skillet", minutes: 22, width: "w-3/4" },
    lines: [
      { qty: 1, name: "Crispy Pata (Whole)", mods: "Extra Crispy • Soy-Vinegar Dip", price: 895 },
      { qty: 1, name: "Kare-Kare", mods: "Oxtail & Tripe • Bagoong on the Side", price: 650 },
      { qty: 2, name: "Calamansi Juice (Pitcher)", mods: "Fresh-Squeezed • Less Sugar", price: 240 },
      { qty: 1, name: "Garlic Rice Platter", mods: "Extra Toasted Garlic", price: 180 },
    ],
  },
  T2: {
    id: "T2",
    name: "T2 - Round",
    label: "Round • 2-Top",
    seats: 2,
    status: "bill",
    stage: "Check Dropped",
    guests: 2,
    server: "Andrea R.",
    ticket: "#8907",
    elapsed: "1:10:32",
    progress: { label: "Bill Sent • Awaiting Payment", icon: "receipt_long", minutes: 8, width: "w-full" },
    lines: [
      { qty: 1, name: "Sinigang na Hipon", mods: "Extra Sour • Kangkong", price: 520 },
      { qty: 1, name: "Chicken Inasal (Pecho)", mods: "Chicken Oil • Sinamak on the Side", price: 360 },
      { qty: 2, name: "Plain Rice", mods: "Regular Cup", price: 120 },
      { qty: 2, name: "Buko Pandan", mods: "Chilled", price: 240 },
    ],
  },
  T3: {
    id: "T3",
    name: "T3 - Family Booth",
    label: "Central Booth • Max 6 Guests",
    seats: 6,
    status: "seated",
    stage: "Apps Fired",
    guests: 6,
    server: "Paolo V.",
    ticket: "#8930",
    elapsed: "0:18:04",
    progress: { label: "Course 1: Appetizers Fired", icon: "dinner_dining", minutes: 6, width: "w-1/4" },
    lines: [
      { qty: 1, name: "Lechon Kawali (Platter)", mods: "Lechon Sauce • Extra Crispy", price: 780 },
      { qty: 1, name: "Sizzling Sisig", mods: "With Egg • Calamansi", price: 420 },
      { qty: 1, name: "Pancit Canton (Family)", mods: "Seafood & Chicken", price: 540 },
      { qty: 1, name: "Lumpiang Shanghai (24 pcs)", mods: "Sweet Chili Dip", price: 360 },
      { qty: 2, name: "Garlic Rice Platter", mods: "Extra Toasted Garlic", price: 360 },
      { qty: 6, name: "Mango Shake", mods: "Less Ice", price: 1020 },
    ],
  },
  T4: { id: "T4", name: "T4", label: "Seats 4", seats: 4, status: "available", stage: "Cleaned 12m ago" },
  T5: { id: "T5", name: "T5 - Round", label: "Round • 4-Top", seats: 4, status: "bussing", stage: "Dirtied • 6m ago" },
  T6: {
    id: "T6",
    name: "T6 - High-Top",
    label: "High-Top • 2",
    seats: 2,
    status: "seated",
    stage: "Mains Served",
    guests: 2,
    server: "Andrea R.",
    ticket: "#8926",
    elapsed: "0:26:40",
    progress: { label: "Course 2: Mains Served", icon: "room_service", minutes: 4, width: "w-3/4" },
    lines: [
      { qty: 1, name: "Bistek Tagalog", mods: "Extra Onions", price: 380 },
      { qty: 2, name: "Plain Rice", mods: "Regular Cup", price: 120 },
      { qty: 2, name: "House Iced Tea", mods: "Bottomless", price: 120 },
    ],
  },
  T7: {
    id: "T7",
    name: "T7 - High-Top",
    label: "High-Top • 2",
    seats: 2,
    status: "bill",
    stage: "Bill Out",
    guests: 2,
    server: "Carlo M.",
    ticket: "#8912",
    elapsed: "0:54:18",
    progress: { label: "Bill Out • Awaiting Payment", icon: "receipt_long", minutes: 3, width: "w-full" },
    lines: [
      { qty: 1, name: "Adobong Pusit", mods: "Spicy", price: 450 },
      { qty: 1, name: "Pinakbet", mods: "With Bagnet", price: 320 },
      { qty: 2, name: "Plain Rice", mods: "Regular Cup", price: 120 },
      { qty: 1, name: "San Miguel Pale Pilsen", mods: "Ice Cold", price: 90 },
    ],
  },
  T8: { id: "T8", name: "T8 - High-Top", label: "High-Top • 2", seats: 2, status: "available", stage: "Ready for Seating" },
};

export const billTotal = (lines: BillLine[] = []) => lines.reduce((sum, l) => sum + l.price, 0);
