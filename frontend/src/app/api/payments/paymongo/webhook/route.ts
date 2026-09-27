import { confirmOnlinePayment, verifyWebhookSignature } from "@/lib/payments";

const MAX_BODY = 256 * 1024;

// POST /api/payments/paymongo/webhook — PayMongo calls this when a checkout is paid. The signature proves
// it came from PayMongo, and even then we only use it as a hint: confirmOnlinePayment re-fetches the
// checkout from PayMongo's API before anything is marked paid.
export async function POST(request: Request) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook not configured." }, { status: 503 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ error: "Too large." }, { status: 413 });
  if (!verifyWebhookSignature(request.headers.get("paymongo-signature"), raw, secret)) return Response.json({ error: "Invalid signature." }, { status: 401 });

  let event: { data?: { attributes?: { type?: string; data?: { id?: string } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const type = event.data?.attributes?.type;
  const checkoutId = event.data?.attributes?.data?.id;
  if (type === "checkout_session.payment.paid" && typeof checkoutId === "string") {
    await confirmOnlinePayment(checkoutId);
  }
  // Acknowledge everything else so PayMongo doesn't retry events we don't use
  return Response.json({ received: true });
}
