import { guestOrderOrigin } from "@/lib/origin";
import { PaymentError } from "@/lib/payments";
import { allow, tooMany } from "@/lib/rateLimit";
import { OrderError, startTableCheckout } from "@/lib/tableOrdering";

// POST /api/tables/:token/checkout — "Pay Online": creates a PayMongo checkout for the table's balance
export async function POST(_request: Request, ctx: RouteContext<"/api/tables/[token]/checkout">) {
  const { token } = await ctx.params;
  if (!allow(`checkout:${token}`, 5, 60_000)) return tooMany();
  try {
    return Response.json({ url: await startTableCheckout(token, await guestOrderOrigin()) }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError || err instanceof PaymentError) return Response.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
