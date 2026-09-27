import type { BillDto, PlacedOrderDto, ServiceRequestStatus, ServiceRequestType } from "@/lib/tableOrder";

// Client-safe shapes for the live staff screens (kitchen, floor, cashier)

export type KitchenTicketDto = PlacedOrderDto & { tableNumber: string; zone: string; byStaff: boolean };

export interface KitchenBoardDto {
  orders: KitchenTicketDto[];
  completedToday: number;
  /** Lets screens with a wrong clock still show correct waiting times */
  serverTime: string;
}

export type FloorStatus = "available" | "seated" | "ordering" | "preparing" | "ready" | "serving" | "paid" | "cleaning" | "reserved";

export const FLOOR_STATUS: Record<FloorStatus, { label: string; icon: string; cls: string }> = {
  available: { label: "Available", icon: "check_circle", cls: "border-outline-variant/40 bg-surface-container-low text-on-surface-variant" },
  seated: { label: "Seated", icon: "event_seat", cls: "border-outline/50 bg-surface-container text-on-surface" },
  ordering: { label: "New Order", icon: "receipt_long", cls: "border-secondary/60 bg-secondary/10 text-secondary" },
  preparing: { label: "Preparing", icon: "skillet", cls: "border-primary-container/70 bg-primary-container/15 text-primary" },
  ready: { label: "Ready to Serve", icon: "room_service", cls: "border-tertiary/70 bg-tertiary/15 text-tertiary" },
  serving: { label: "Dining", icon: "restaurant", cls: "border-outline/50 bg-surface-container-high text-on-surface" },
  paid: { label: "Paid", icon: "task_alt", cls: "border-tertiary/50 bg-tertiary-container/20 text-tertiary" },
  cleaning: { label: "Cleaning", icon: "cleaning_services", cls: "border-outline-variant/60 bg-surface-container-low text-outline" },
  reserved: { label: "Reserved", icon: "event_available", cls: "border-secondary/40 bg-surface-container-low text-secondary" },
};

export interface FloorTableDto {
  id: string;
  number: string;
  seats: number;
  zone: string;
  status: FloorStatus;
  session: {
    id: string;
    openedAt: string;
    tickets: number;
    ready: { id: string; ticketNumber: number }[];
    totalCents: number;
    paidCents: number;
    balanceCents: number;
    requests: { id: string; type: ServiceRequestType; status: ServiceRequestStatus; createdAt: string }[];
  } | null;
}

export interface BillDetailDto {
  id: string;
  openedAt: string;
  closedAt: string | null;
  tableNumber: string;
  zone: string;
  branchId: string;
  branch: string;
  address: string | null;
  restaurant: string;
  currency: string;
  taxRateBp: number;
  orders: PlacedOrderDto[];
  bill: BillDto;
}

/** One hit from the header's global search (GET /api/staff/search) */
export interface SearchResult {
  group: "Screens" | "Tables" | "Orders" | "Menu" | "Staff";
  label: string;
  detail: string;
  href: string;
  icon: string;
}
