import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuestRoomOrder from "@/components/GuestRoomOrder";
import { HOTEL_ROOMS, acceptsRoomService } from "@/lib/rooms";

export const metadata: Metadata = {
  title: "Room Service • The Oakwood Bistro",
  description: "Order food and drinks to your room",
};

// Opened by scanning a room's QR code (see /rooms)
export default async function GuestRoomOrderPage({ params }: PageProps<"/order/room/[room]">) {
  const { room } = await params;
  const hotelRoom = HOTEL_ROOMS.find((r) => r.number === room);
  if (!hotelRoom) notFound();

  if (!acceptsRoomService(hotelRoom)) {
    return (
      <main className="min-h-screen max-w-md mx-auto p-space-lg flex flex-col items-center justify-center text-center gap-space-sm">
        <span className="material-symbols-outlined text-[48px] text-tertiary">room_service</span>
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">The Oakwood Bistro • Room Service</span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Room {room}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Room service ordering opens once you&apos;re checked in. Please call the front desk if you need anything.
        </p>
      </main>
    );
  }
  return <GuestRoomOrder room={room} />;
}
