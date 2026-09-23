import { headers } from "next/headers";
import QRCode from "qrcode";
import RoomsBoard from "@/components/RoomsBoard";
import { listRoomOrders } from "@/lib/roomOrders";
import { HOTEL_ROOMS, roomOrderPath } from "@/lib/rooms";

// Guests scan a room's QR to order to that room. Set GUEST_ORDER_ORIGIN (e.g. https://order.example.com)
// in production; otherwise the QR points at whatever host is serving this page.
async function orderOrigin() {
  if (process.env.GUEST_ORDER_ORIGIN) return process.env.GUEST_ORDER_ORIGIN.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function HotelRoomsPage() {
  const origin = await orderOrigin();
  const qr = await Promise.all(
    HOTEL_ROOMS.map(async (room) => {
      const url = `${origin}${roomOrderPath(room.number)}`;
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b1326", light: "#ffffff" } });
      return [room.number, { url, svg }] as const;
    }),
  );

  return <RoomsBoard rooms={HOTEL_ROOMS} qr={Object.fromEntries(qr)} initialOrders={await listRoomOrders()} />;
}
