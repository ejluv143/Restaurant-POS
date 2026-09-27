import { getKitchenBoard } from "@/lib/operations";
import { rolesFor } from "@/lib/staffAccess";
import { apiStaffContext } from "@/lib/staffContext";

// GET /api/staff/kitchen — live tickets for the active branch's kitchen display (polled)
export async function GET() {
  const ctx = await apiStaffContext(rolesFor("/kitchen"));
  if (ctx instanceof Response) return ctx;
  return Response.json(await getKitchenBoard(ctx.branch.id), { headers: { "Cache-Control": "no-store" } });
}
