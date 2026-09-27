import { allow, tooMany } from "@/lib/rateLimit";
import { OrderError, requestService } from "@/lib/tableOrdering";

// POST /api/tables/:token/service-requests { type } — Call Server, Water / Cutlery, Bill / Cash Payment
export async function POST(request: Request, ctx: RouteContext<"/api/tables/[token]/service-requests">) {
  const { token } = await ctx.params;
  if (!allow(`service:${token}`, 20, 60_000)) return tooMany();
  let type: unknown;
  try {
    ({ type } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const result = await requestService(token, type);
    return Response.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (err) {
    if (err instanceof OrderError) return Response.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
