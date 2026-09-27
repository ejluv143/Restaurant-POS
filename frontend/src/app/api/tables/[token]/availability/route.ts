import { and, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { findTable } from "@/lib/tableOrdering";

// GET /api/tables/:token/availability — ids of dishes sold out at this table's branch (the guest menu polls it)
export async function GET(_request: Request, ctx: RouteContext<"/api/tables/[token]/availability">) {
  const table = await findTable((await ctx.params).token);
  if (!table) return Response.json({ error: "Table not found." }, { status: 404 });
  const rows = await getDb()
    .select({ id: s.branchMenuAvailability.menuItemId })
    .from(s.branchMenuAvailability)
    .where(and(eq(s.branchMenuAvailability.branchId, table.branchId), eq(s.branchMenuAvailability.isAvailable, false)));
  return Response.json({ soldOut: rows.map((r) => r.id) }, { headers: { "Cache-Control": "no-store" } });
}
