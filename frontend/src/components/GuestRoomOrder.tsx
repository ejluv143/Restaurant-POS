"use client";

import { useEffect, useState } from "react";
import type { RoomOrder, RoomOrderStatus } from "@/lib/roomOrders";
import { peso } from "@/lib/rooms";
import { ROOM_SERVICE_CATEGORIES, ROOM_SERVICE_MENU } from "@/lib/roomServiceMenu";

type Category = (typeof ROOM_SERVICE_CATEGORIES)[number] | "All";

const STEPS: { status: RoomOrderStatus; label: string; icon: string }[] = [
  { status: "new", label: "Received", icon: "receipt_long" },
  { status: "preparing", label: "Preparing", icon: "skillet" },
  { status: "delivered", label: "Delivered", icon: "room_service" },
];

export default function GuestRoomOrder({ room }: { room: string }) {
  const [category, setCategory] = useState<Category>("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<RoomOrder | null>(null);

  const lines = ROOM_SERVICE_MENU.filter((m) => cart[m.id]).map((m) => ({ item: m, qty: cart[m.id] }));
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.item.price, 0);
  const shown = category === "All" ? ROOM_SERVICE_MENU : ROOM_SERVICE_MENU.filter((m) => m.category === category);

  const change = (id: string, delta: number) =>
    setCart((c) => {
      const qty = Math.min(20, Math.max(0, (c[id] ?? 0) + delta));
      const next = { ...c, [id]: qty };
      if (!qty) delete next[id];
      return next;
    });

  // Keep the confirmation screen's status in sync with the POS
  const orderId = order?.id;
  const delivered = order?.status === "delivered";
  useEffect(() => {
    if (!orderId || delivered) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/room-orders/${orderId}`, { cache: "no-store" });
        if (res.ok) setOrder(await res.json());
      } catch {
        // Offline for a moment — try again on the next tick
      }
    }, 4000);
    return () => clearInterval(poll);
  }, [orderId, delivered]);

  const placeOrder = async () => {
    setPlacing(true);
    setError("");
    try {
      const res = await fetch("/api/room-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, items: lines.map((l) => ({ itemId: l.item.id, qty: l.qty })), note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setOrder(data);
      setCart({});
      setNote("");
      setReviewing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't place your order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const header = (
    <header className="sticky top-0 z-20 bg-surface-container/95 backdrop-blur-md px-space-lg py-space-md shadow-[0_4px_16px_rgba(0,0,0,0.35)]">
      <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">The Oakwood Bistro • Room Service</span>
      <div className="flex items-center justify-between">
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Room {room}</h1>
        <span className="flex items-center gap-1 font-label-sm text-label-sm text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span> Kitchen open
        </span>
      </div>
    </header>
  );

  if (order) {
    const step = STEPS.findIndex((s) => s.status === order.status);
    return (
      <div className="min-h-screen max-w-md mx-auto flex flex-col">
        {header}
        <main className="flex-1 p-space-lg flex flex-col gap-space-lg">
          <div className="flex flex-col items-center text-center gap-space-xs pt-space-md">
            <span className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px]">check</span>
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Order #{order.number} received</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">We&apos;ll bring it to Room {order.room}. Charged to your room bill.</p>
          </div>

          {/* Live status */}
          <div className="grid grid-cols-3 gap-space-xs">
            {STEPS.map((s, i) => (
              <div
                key={s.status}
                className={`rounded-xl p-space-sm flex flex-col items-center gap-1 text-center ${
                  i <= step ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface-variant"
                } ${i === step && !delivered ? "animate-pulse" : ""}`}
              >
                <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
                <span className="font-label-sm text-label-sm">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-surface-container rounded-xl p-space-md flex flex-col gap-space-xs">
            {order.lines.map((l) => (
              <div key={l.itemId} className="flex justify-between gap-space-sm font-body-md text-body-md text-on-surface">
                <span>
                  <span className="font-label-md text-label-md text-primary">{l.qty}×</span> {l.name}
                </span>
                <span className="font-label-md text-label-md shrink-0">{peso(l.qty * l.price)}</span>
              </div>
            ))}
            {order.note && <p className="font-body-sm text-body-sm text-tertiary italic">Note: {order.note}</p>}
            <div className="flex justify-between items-baseline pt-space-xs mt-space-xs border-t border-outline-variant/40">
              <span className="font-headline-sm text-headline-sm text-on-surface">Total</span>
              <span className="font-headline-md text-headline-md text-primary font-bold">{peso(order.total)}</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant text-right">VAT included</span>
          </div>

          <button
            type="button"
            onClick={() => setOrder(null)}
            className="min-h-[52px] rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg transition-colors"
          >
            Order something else
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col pb-28">
      {header}

      {/* Category chips */}
      <nav className="sticky top-[84px] z-10 bg-surface px-space-lg py-space-sm flex gap-space-xs overflow-x-auto">
        {(["All", ...ROOM_SERVICE_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`shrink-0 px-space-md h-10 rounded-lg font-label-md text-label-md transition-colors ${
              category === c ? "bg-primary-container text-on-primary-container shadow-sm" : "bg-surface-container text-on-surface-variant"
            }`}
          >
            {c}
          </button>
        ))}
      </nav>

      {/* Menu */}
      <main className="px-space-lg flex flex-col gap-space-sm">
        {shown.map((m) => {
          const qty = cart[m.id] ?? 0;
          return (
            <div key={m.id} className="bg-surface-container-low rounded-xl p-space-md flex items-center gap-space-md">
              <div className="w-14 h-14 shrink-0 rounded-lg bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[28px]">{m.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-headline-sm text-headline-sm text-on-surface leading-snug">{m.name}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{m.desc}</p>
                <span className="font-label-lg text-label-lg text-primary font-bold">{peso(m.price)}</span>
              </div>
              {qty ? (
                <div className="flex items-center gap-1 shrink-0">
                  <Stepper icon="remove" label={`Remove one ${m.name}`} onClick={() => change(m.id, -1)} />
                  <span className="w-6 text-center font-label-lg text-label-lg text-on-surface">{qty}</span>
                  <Stepper icon="add" label={`Add one more ${m.name}`} onClick={() => change(m.id, 1)} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => change(m.id, 1)}
                  aria-label={`Add ${m.name}`}
                  className="w-11 h-11 shrink-0 rounded-lg bg-surface-container-highest hover:bg-primary hover:text-on-primary text-on-surface flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px]">add</span>
                </button>
              )}
            </div>
          );
        })}
      </main>

      {/* Cart bar */}
      {count > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-20 p-space-md bg-surface-container/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.35)]">
          <button
            type="button"
            onClick={() => setReviewing(true)}
            className="max-w-md mx-auto w-full min-h-[56px] px-space-lg rounded-xl bg-primary-container text-on-primary-container flex items-center justify-between font-headline-sm text-headline-sm font-bold shadow-md active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span> {count} {count === 1 ? "item" : "items"}
            </span>
            <span>Review • {peso(total)}</span>
          </button>
        </div>
      )}

      {/* Review sheet */}
      {reviewing && (
        <div className="fixed inset-0 z-30 bg-surface-container-lowest/70 backdrop-blur-sm flex items-end" onClick={() => setReviewing(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md mx-auto w-full max-h-[90vh] overflow-y-auto bg-surface-container rounded-t-xl p-space-lg flex flex-col gap-space-md"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Your order</h2>
              <button type="button" onClick={() => setReviewing(false)} aria-label="Close" className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            {lines.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">Your order is empty.</p>
            ) : (
              lines.map(({ item, qty }) => (
                <div key={item.id} className="flex items-center gap-space-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-body-md text-on-surface font-medium">{item.name}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{peso(item.price)} each</p>
                  </div>
                  <Stepper icon="remove" label={`Remove one ${item.name}`} onClick={() => change(item.id, -1)} />
                  <span className="w-6 text-center font-label-lg text-label-lg text-on-surface">{qty}</span>
                  <Stepper icon="add" label={`Add one more ${item.name}`} onClick={() => change(item.id, 1)} />
                  <span className="w-20 text-right font-label-md text-label-md text-on-surface">{peso(qty * item.price)}</span>
                </div>
              ))
            )}
            <label className="flex flex-col gap-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Note for the kitchen (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                rows={2}
                placeholder="e.g. less spicy, extra rice, no utensils"
                className="rounded-lg bg-surface-container-lowest p-space-sm font-body-md text-body-md text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <div className="flex justify-between items-baseline">
              <span className="font-headline-sm text-headline-sm text-on-surface">Total</span>
              <div className="text-right">
                <span className="font-headline-lg text-headline-lg text-primary font-bold">{peso(total)}</span>
                <span className="block font-label-sm text-label-sm text-on-surface-variant">VAT included</span>
              </div>
            </div>
            {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}
            <button
              type="button"
              disabled={placing || lines.length === 0}
              onClick={placeOrder}
              className="min-h-[56px] rounded-xl bg-secondary-container text-on-secondary-container font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-space-sm shadow-md active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[22px]">{placing ? "progress_activity" : "room_service"}</span>
              {placing ? "Placing order…" : `Charge to Room ${room}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-9 h-9 rounded-lg bg-surface-container-highest text-on-surface flex items-center justify-center active:scale-95 transition-transform"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}
