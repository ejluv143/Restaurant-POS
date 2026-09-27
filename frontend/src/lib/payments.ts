import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/db";

// PayMongo hosted Checkout (GCash, Maya, cards…). Card data never touches this server: the guest pays on
// PayMongo's page. A payment only becomes "paid" after *we* fetch the checkout session from PayMongo with
// our secret key and see it paid for the right amount; webhooks and return URLs just trigger that check.

const API = "https://api.paymongo.com/v1";
const MIN_ONLINE_CENTS = 2000; // PayMongo's minimum charge is ₱20.00
const CHECKOUT_TTL_MS = 60 * 60 * 1000;

export class PaymentError extends Error {}

export const onlinePaymentsConfigured = () => !!process.env.PAYMONGO_SECRET_KEY;

const methodTypes = () =>
  (process.env.PAYMONGO_METHODS ?? "gcash,paymaya,card")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => /^[a-z_]+$/.test(m));

async function paymongo<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new PaymentError("Online payment isn't set up for this restaurant yet. Please pay with cash.");
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`, "Content-Type": "application/json", Accept: "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    // Log PayMongo's detail server-side only; the guest gets a generic message
    console.error("PayMongo error", res.status, JSON.stringify(json?.errors ?? json).slice(0, 500));
    throw new PaymentError("The payment provider is unavailable right now. Please try again or pay with cash.");
  }
  return json as T;
}

interface CheckoutSession {
  data: {
    id: string;
    attributes: {
      checkout_url: string;
      status: string;
      payments?: { id: string; attributes: { status: string; amount: number; source?: { type?: string } } }[];
      payment_intent?: { attributes?: { status?: string } } | null;
    };
  };
}

/** Starts a hosted checkout for a session's outstanding balance. Returns the PayMongo page to send the guest to. */
export async function createOnlineCheckout(opts: {
  sessionId: string;
  balanceCents: number;
  description: string;
  reference: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  if (!onlinePaymentsConfigured()) throw new PaymentError("Online payment isn't set up for this restaurant yet. Please pay with cash.");
  if (opts.balanceCents < MIN_ONLINE_CENTS) throw new PaymentError("Online payments must be at least ₱20. Please pay the remaining balance with cash.");
  const db = getDb();

  // A newer checkout replaces any unfinished one, so the guest can't pay the same balance twice
  await db
    .update(s.payments)
    .set({ status: "cancelled" })
    .where(and(eq(s.payments.sessionId, opts.sessionId), eq(s.payments.status, "pending"), eq(s.payments.provider, "paymongo")));

  const checkout = await paymongo<CheckoutSession>("/checkout_sessions", {
    method: "POST",
    body: {
      data: {
        attributes: {
          line_items: [{ name: opts.description.slice(0, 250), amount: opts.balanceCents, currency: "PHP", quantity: 1 }],
          payment_method_types: methodTypes(),
          description: opts.description.slice(0, 250),
          reference_number: opts.reference,
          success_url: opts.successUrl,
          cancel_url: opts.cancelUrl,
          send_email_receipt: false,
          metadata: { session_id: opts.sessionId },
        },
      },
    },
  });

  await db.insert(s.payments).values({
    sessionId: opts.sessionId,
    method: "online",
    status: "pending",
    amountCents: opts.balanceCents,
    provider: "paymongo",
    providerRef: checkout.data.id,
    referenceNumber: opts.reference,
  });
  return checkout.data.attributes.checkout_url;
}

/**
 * Re-checks one online payment with PayMongo and records the result. Idempotent: safe to call from the
 * webhook, the guest's return, the tracker poll and the cashier's "verify" button at the same time.
 */
export async function confirmOnlinePayment(providerRef: string): Promise<"paid" | "pending" | "expired" | "unknown"> {
  if (!/^cs_[A-Za-z0-9]{8,64}$/.test(providerRef)) return "unknown";
  const db = getDb();
  const [payment] = await db
    .select({ id: s.payments.id, status: s.payments.status, amountCents: s.payments.amountCents, createdAt: s.payments.createdAt })
    .from(s.payments)
    .where(and(eq(s.payments.providerRef, providerRef), eq(s.payments.provider, "paymongo")));
  if (!payment) return "unknown";
  if (payment.status === "paid") return "paid";

  const checkout = await paymongo<CheckoutSession>(`/checkout_sessions/${encodeURIComponent(providerRef)}`);
  const paid = (checkout.data.attributes.payments ?? []).filter((p) => p.attributes.status === "paid");
  const paidAmount = paid.reduce((sum, p) => sum + p.attributes.amount, 0);

  if (paid.length > 0 && paidAmount >= payment.amountCents) {
    // Conditional update: two concurrent confirmations can't both flip it (nor revive a cancelled one silently)
    await db
      .update(s.payments)
      .set({ status: "paid", paidAt: sql`now()`, channel: paid[0].attributes.source?.type ?? null, referenceNumber: paid[0].id })
      .where(and(eq(s.payments.id, payment.id), sql`${s.payments.status} in ('pending', 'cancelled', 'expired')`));
    return "paid";
  }
  if (payment.status === "pending" && (checkout.data.attributes.status === "expired" || Date.now() - payment.createdAt.getTime() > CHECKOUT_TTL_MS)) {
    await db.update(s.payments).set({ status: "expired" }).where(and(eq(s.payments.id, payment.id), eq(s.payments.status, "pending")));
    return "expired";
  }
  return "pending";
}

// At most one PayMongo lookup per payment every 10 s, however many phones are polling
const lastChecked = new Map<string, number>();

/** Checks a session's pending online payments (throttled). Used by the guest tracker's poll. */
export async function verifyPendingOnlinePayments(sessionId: string) {
  if (!onlinePaymentsConfigured()) return;
  const pending = await getDb()
    .select({ ref: s.payments.providerRef })
    .from(s.payments)
    .where(and(eq(s.payments.sessionId, sessionId), eq(s.payments.status, "pending"), eq(s.payments.provider, "paymongo")));
  await Promise.all(
    pending.map(async ({ ref }) => {
      if (!ref || Date.now() - (lastChecked.get(ref) ?? 0) < 10_000) return;
      lastChecked.set(ref, Date.now());
      await confirmOnlinePayment(ref).catch((e) => console.error("payment check failed", e));
    }),
  );
  if (lastChecked.size > 5000) lastChecked.clear();
}

/** Expires checkouts nobody finished, so they stop showing as "pending". */
export async function expireStaleCheckouts() {
  await getDb()
    .update(s.payments)
    .set({ status: "expired" })
    .where(and(eq(s.payments.status, "pending"), eq(s.payments.provider, "paymongo"), lt(s.payments.createdAt, new Date(Date.now() - CHECKOUT_TTL_MS)), isNull(s.payments.paidAt)));
}

/**
 * Verifies a PayMongo webhook signature header ("t=<unix>,te=<test sig>,li=<live sig>"): HMAC-SHA256 of
 * "<t>.<raw body>" with the webhook's secret, compared in constant time, rejecting stale timestamps.
 */
export function verifyWebhookSignature(header: string | null, rawBody: string, secret: string, toleranceSeconds = 600): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=", 2).map((x) => x.trim())));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  return [parts.te, parts.li].some((sig) => typeof sig === "string" && sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}
