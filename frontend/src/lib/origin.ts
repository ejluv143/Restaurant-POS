import { headers } from "next/headers";

// Guests scan QR codes that point here. Set GUEST_ORDER_ORIGIN (e.g. https://order.example.com)
// in production; otherwise the QR points at whatever host is serving the page.
export async function guestOrderOrigin() {
  if (process.env.GUEST_ORDER_ORIGIN) return process.env.GUEST_ORDER_ORIGIN.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
