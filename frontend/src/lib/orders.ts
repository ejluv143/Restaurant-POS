import { useSyncExternalStore } from "react";
import type { Order } from "./types";

const KEY = "cashier.orders";
const EMPTY: Order[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cached: Order[] = EMPTY;

function read(): Order[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as Order[]) : EMPTY;
    } catch {
      cached = EMPTY;
    }
  }
  return cached;
}

function write(orders: Order[]) {
  localStorage.setItem(KEY, JSON.stringify(orders));
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

export function useOrders(): Order[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function saveOrder(order: Order) {
  write([order, ...read()]);
}

export function clearOrders() {
  write([]);
}

export function nextOrderNumber(): number {
  return (read()[0]?.number ?? 0) + 1;
}
