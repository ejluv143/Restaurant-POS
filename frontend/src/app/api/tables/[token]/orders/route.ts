import { OrderError, getTableOrders, placeTableOrder } from "@/lib/tableOrdering";

const MAX_BODY = 32 * 1024;

// GET /api/tables/:token/orders — the guest's phone polls its table's live kitchen tickets
export async function GET(_request: Request, ctx: RouteContext<"/api/tables/[token]/orders">) {
  const { token } = await ctx.params;
  try {
    return Response.json(await getTableOrders(token), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof OrderError) return Response.json({ error: err.message }, { status: 404 });
    throw err;
  }
}

// POST /api/tables/:token/orders — "Send Order to Kitchen" from the table's QR menu
export async function POST(request: Request, ctx: RouteContext<"/api/tables/[token]/orders">) {
  const { token } = await ctx.params;
  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ error: "Order is too large." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    return Response.json(await placeTableOrder(token, body), { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) return Response.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
