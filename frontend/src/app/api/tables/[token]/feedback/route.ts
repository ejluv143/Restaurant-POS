import { allow, tooMany } from "@/lib/rateLimit";
import { OrderError, submitFeedback } from "@/lib/tableOrdering";

// POST /api/tables/:token/feedback { rating: 1-5, comment? } — one rating per visit
export async function POST(request: Request, ctx: RouteContext<"/api/tables/[token]/feedback">) {
  const { token } = await ctx.params;
  if (!allow(`feedback:${token}`, 5, 60_000)) return tooMany();
  const raw = await request.text();
  if (raw.length > 4096) return Response.json({ error: "Feedback is too long." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    await submitFeedback(token, body);
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) return Response.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
