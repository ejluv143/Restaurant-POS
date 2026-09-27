import { OrderError, getTableStatus } from "@/lib/tableOrdering";

// GET /api/tables/:token/status — the live tracker polls its table's tickets and service calls
export async function GET(_request: Request, ctx: RouteContext<"/api/tables/[token]/status">) {
  const { token } = await ctx.params;
  try {
    return Response.json(await getTableStatus(token), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof OrderError) return Response.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
