import { NextRequest } from "next/server";
import { OrderError, listRoomOrders, placeRoomOrder } from "@/lib/roomOrders";

// GET /api/room-orders[?room=101] — orders for the POS (optionally one room)
export async function GET(request: NextRequest) {
  const room = request.nextUrl.searchParams.get("room");
  const orders = await listRoomOrders();
  return Response.json(room ? orders.filter((o) => o.room === room) : orders);
}

// POST /api/room-orders — placed by a guest after scanning their room QR
export async function POST(request: Request) {
  let body: { room?: unknown; items?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const order = await placeRoomOrder(String(body.room ?? ""), body.items as { itemId: string; qty: number }[], body.note as string | undefined);
    return Response.json(order, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) return Response.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
