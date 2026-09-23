import { OrderError, listRoomOrders, setRoomOrderStatus, type RoomOrderStatus } from "@/lib/roomOrders";

// GET /api/room-orders/:id — the guest's phone polls its own order's status
export async function GET(_request: Request, ctx: RouteContext<"/api/room-orders/[id]">) {
  const { id } = await ctx.params;
  const order = (await listRoomOrders()).find((o) => o.id === id);
  return order ? Response.json(order) : Response.json({ error: "Order not found." }, { status: 404 });
}

// PATCH /api/room-orders/:id { status } — POS moves an order to preparing / delivered
export async function PATCH(request: Request, ctx: RouteContext<"/api/room-orders/[id]">) {
  const { id } = await ctx.params;
  let status: RoomOrderStatus;
  try {
    ({ status } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const order = await setRoomOrderStatus(id, status);
    return order ? Response.json(order) : Response.json({ error: "Order not found." }, { status: 404 });
  } catch (err) {
    if (err instanceof OrderError) return Response.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
