import { getBill } from "@/lib/operations";
import { rolesFor } from "@/lib/staffAccess";
import { ActionError, apiStaffContext } from "@/lib/staffContext";

// GET /api/staff/bills/:sessionId — one table's itemized bill and payments (cashier, polled while open)
export async function GET(_request: Request, ctx: RouteContext<"/api/staff/bills/[id]">) {
  const staff = await apiStaffContext(rolesFor("/cashier"));
  if (staff instanceof Response) return staff;
  try {
    return Response.json(await getBill(staff, (await ctx.params).id), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ActionError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
