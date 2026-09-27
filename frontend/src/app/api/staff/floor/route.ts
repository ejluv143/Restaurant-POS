import { getFloor } from "@/lib/operations";
import { rolesFor } from "@/lib/staffAccess";
import { apiStaffContext } from "@/lib/staffContext";

// GET /api/staff/floor — every table's live state for the active branch (floor map and cashier, polled)
export async function GET() {
  const ctx = await apiStaffContext([...new Set([...rolesFor("/floor"), ...rolesFor("/cashier")])]);
  if (ctx instanceof Response) return ctx;
  return Response.json({ tables: await getFloor(ctx.branch.id), serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
