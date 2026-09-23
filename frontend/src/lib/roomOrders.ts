import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { HOTEL_ROOMS, acceptsRoomService } from "./rooms";
import { ROOM_SERVICE_MENU } from "./roomServiceMenu";

// Server-only: room-service orders placed from room QR codes, persisted to a JSON file so the
// guest's phone and the POS terminals share them. Swap for a database before running multiple servers.

export type RoomOrderStatus = "new" | "preparing" | "delivered";

export interface RoomOrderLine {
  itemId: string;
  name: string;
  qty: number;
  price: number;
}

export interface RoomOrder {
  id: string;
  number: number;
  room: string;
  createdAt: string;
  lines: RoomOrderLine[];
  note?: string;
  total: number;
  status: RoomOrderStatus;
}

const FILE = path.join(process.cwd(), "data", "room-orders.json");
const MAX_QTY = 20;
const MAX_NOTE = 200;

let queue: Promise<unknown> = Promise.resolve();

/** Runs read-modify-write operations one at a time so concurrent orders can't overwrite each other. */
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function load(): Promise<RoomOrder[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as RoomOrder[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function save(orders: RoomOrder[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(orders, null, 2));
  await rename(tmp, FILE);
}

export const listRoomOrders = () => serialized(load);

export class OrderError extends Error {}

export function placeRoomOrder(room: string, items: { itemId: string; qty: number }[], note?: string) {
  const hotelRoom = HOTEL_ROOMS.find((r) => r.number === room);
  if (!hotelRoom) throw new OrderError("Unknown room.");
  if (!acceptsRoomService(hotelRoom)) throw new OrderError("Room service is only available for checked-in rooms. Please call the front desk.");
  if (!Array.isArray(items) || items.length === 0) throw new OrderError("Your order is empty.");

  const lines: RoomOrderLine[] = items.map(({ itemId, qty }) => {
    const item = ROOM_SERVICE_MENU.find((m) => m.id === itemId);
    if (!item) throw new OrderError("An item in your order is no longer on the menu.");
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new OrderError(`Quantities must be between 1 and ${MAX_QTY}.`);
    // Prices always come from the server-side menu, never from the request
    return { itemId, name: item.name, qty, price: item.price };
  });
  const cleanNote = typeof note === "string" ? note.trim().slice(0, MAX_NOTE) : "";

  return serialized(async () => {
    const orders = await load();
    const order: RoomOrder = {
      id: randomUUID(),
      number: Math.max(1000, ...orders.map((o) => o.number)) + 1,
      room,
      createdAt: new Date().toISOString(),
      lines,
      note: cleanNote || undefined,
      total: lines.reduce((s, l) => s + l.qty * l.price, 0),
      status: "new",
    };
    await save([...orders, order]);
    return order;
  });
}

export function setRoomOrderStatus(id: string, status: RoomOrderStatus) {
  if (!["new", "preparing", "delivered"].includes(status)) throw new OrderError("Invalid status.");
  return serialized(async () => {
    const orders = await load();
    const order = orders.find((o) => o.id === id);
    if (!order) return null;
    order.status = status;
    await save(orders);
    return order;
  });
}
