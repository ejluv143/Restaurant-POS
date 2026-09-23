"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ZoneTabs from "@/components/ZoneTabs";
import type { RoomOrder, RoomOrderStatus } from "@/lib/roomOrders";
import { peso, tabTotal, type HotelRoom, type RoomStatus } from "@/lib/rooms";

type QrMap = Record<string, { url: string; svg: string }>;
type Filter = "all" | RoomStatus;

const STATUS: Record<RoomStatus, { label: string; filter: string; badge: string; text: string; dot: string; icon: string }> = {
  occupied: { label: "In-House", filter: "Occupied", badge: "bg-primary-container text-on-primary-container", text: "text-primary", dot: "bg-primary", icon: "bed" },
  checkout: { label: "Check-out Today", filter: "Check-out Today", badge: "bg-tertiary-container text-on-tertiary-container", text: "text-tertiary", dot: "bg-tertiary", icon: "luggage" },
  vacant: { label: "Vacant", filter: "Vacant", badge: "bg-surface-container-highest text-on-surface-variant", text: "text-on-surface-variant", dot: "bg-outline", icon: "bed" },
};

const FLOOR_NAMES: Record<number, string> = { 1: "1st Floor", 2: "2nd Floor" };

const POLL_MS = 3000;

const ORDER_STATUS: Record<RoomOrderStatus, { label: string; chip: string; next?: { status: RoomOrderStatus; label: string; icon: string; cls: string } }> = {
  new: {
    label: "New",
    chip: "bg-tertiary-container text-on-tertiary-container animate-pulse",
    next: { status: "preparing", label: "Start Preparing", icon: "skillet", cls: "bg-tertiary-container text-on-tertiary-container" },
  },
  preparing: {
    label: "Preparing",
    chip: "bg-primary-container text-on-primary-container",
    next: { status: "delivered", label: "Mark Delivered", icon: "room_service", cls: "bg-secondary-container text-on-secondary-container" },
  },
  delivered: { label: "Delivered", chip: "bg-secondary-container/30 text-secondary" },
};

const orderTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** Renders a QR code SVG generated on the server by the `qrcode` package. */
function Qr({ svg, className }: { svg: string; className: string }) {
  return <div className={`[&>svg]:w-full [&>svg]:h-full ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function QrCard({ room, qr }: { room: HotelRoom; qr: QrMap[string] }) {
  return (
    <div className="bg-white rounded-xl p-space-md flex flex-col items-center gap-space-xs text-center break-inside-avoid">
      <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#434655]">The Oakwood Bistro • Room Service</span>
      <Qr svg={qr.svg} className="w-48 h-48" />
      <span className="font-headline-md text-headline-md font-bold text-[#0b1326]">Room {room.number}</span>
      <span className="font-body-sm text-body-sm text-[#434655]">Scan to order food &amp; drinks to your room</span>
    </div>
  );
}

export default function RoomsBoard({ rooms, qr, initialOrders }: { rooms: HotelRoom[]; qr: QrMap; initialOrders: RoomOrder[] }) {
  const [selected, setSelected] = useState(rooms[0].number);
  const [filter, setFilter] = useState<Filter>("all");
  const [printMode, setPrintMode] = useState<"single" | "all" | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [orders, setOrders] = useState(initialOrders);
  const [alert, setAlert] = useState<RoomOrder | null>(null);
  const alertTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const seen = useRef(new Set(initialOrders.map((o) => o.id)));

  // Poll for orders placed from room QR codes and announce new ones
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/room-orders", { cache: "no-store" });
        if (!res.ok || !active) return;
        const latest: RoomOrder[] = await res.json();
        const fresh = latest.filter((o) => !seen.current.has(o.id));
        fresh.forEach((o) => seen.current.add(o.id));
        setOrders(latest);
        if (fresh.length) {
          setAlert(fresh[fresh.length - 1]);
          clearTimeout(alertTimer.current);
          alertTimer.current = setTimeout(() => setAlert(null), 8000);
        }
      } catch {
        // Network blip — the next poll will catch up
      }
    };
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
      clearTimeout(alertTimer.current);
    };
  }, []);

  const advance = useCallback(async (order: RoomOrder, status: RoomOrderStatus) => {
    setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, status } : o)));
    const res = await fetch(`/api/room-orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    // Roll back if the server didn't accept the change
    if (!res?.ok) setOrders((os) => os.map((o) => (o.id === order.id ? order : o)));
  }, []);

  const roomOrders = (n: string) => orders.filter((o) => o.room === n);
  const activeOrders = (n: string) => roomOrders(n).filter((o) => o.status !== "delivered");
  const newOrders = (n: string) => roomOrders(n).filter((o) => o.status === "new").length;
  const qrTotal = (n: string) => roomOrders(n).reduce((sum, o) => sum + o.total, 0);
  const chargeTotal = (r: HotelRoom) => tabTotal(r) + qrTotal(r.number);
  const pendingOrders = orders.filter((o) => o.status !== "delivered").length;

  const room = rooms.find((r) => r.number === selected)!;
  const count = (s: RoomStatus) => rooms.filter((r) => r.status === s).length;
  const inHouse = rooms.filter((r) => r.status === "occupied" || r.status === "checkout");
  const guestsInHouse = inHouse.reduce((n, r) => n + (r.guests ?? 0), 0);
  const openTabs = rooms.filter((r) => chargeTotal(r) > 0);
  const floors = [...new Set(rooms.map((r) => r.floor))];
  const s = STATUS[room.status];

  // Print after React has applied the .print-area class for the chosen mode
  useEffect(() => {
    if (!printMode) return;
    const done = () => setPrintMode(null);
    window.addEventListener("afterprint", done, { once: true });
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", done);
    };
  }, [printMode]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(qr[room.number].url);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this room's order link:", qr[room.number].url);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Sub-Header Status & Sections Bar */}
      <div className="w-full bg-surface-container-low px-space-md sm:px-space-lg py-space-sm flex flex-wrap items-center justify-between gap-space-md shadow-sm">
        <ZoneTabs active="rooms" />
        {/* Real-time Live Metrics Telemetry Strip */}
        <div className="max-w-full flex items-center gap-space-md sm:gap-space-lg bg-surface-container px-space-md py-1.5 rounded-lg overflow-x-auto no-scrollbar whitespace-nowrap [&>*]:shrink-0">
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Occupancy:</span>
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              {inHouse.length}/{rooms.length}{" "}
              <span className="text-secondary font-label-sm text-label-sm">({Math.round((inHouse.length / rooms.length) * 100)}%)</span>
            </span>
          </div>
          <div className="h-3 w-px bg-surface-container-highest"></div>
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[16px]">group</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Guests In-House:</span>
            <span className="font-label-md text-label-md text-on-surface font-semibold">{guestsInHouse}</span>
          </div>
          <div className="h-3 w-px bg-surface-container-highest"></div>
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-tertiary text-[16px]">room_service</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Open Tabs:</span>
            <span className="font-label-md text-label-md text-on-surface font-semibold">{openTabs.length}</span>
          </div>
          <div className="h-3 w-px bg-surface-container-highest"></div>
          <div className="flex items-center gap-space-xs">
            <span className={`material-symbols-outlined text-[16px] ${pendingOrders ? "text-tertiary animate-pulse" : "text-on-surface-variant"}`}>qr_code_scanner</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">QR Orders:</span>
            <span className="font-label-md text-label-md text-on-surface font-semibold">{pendingOrders} active</span>
          </div>
        </div>
      </div>

      {/* Filter Ribbon & Quick Actions */}
      <div className="w-full bg-surface px-space-md sm:px-space-lg py-space-sm flex flex-wrap items-center justify-between gap-space-sm">
        <div className="max-w-full flex items-center gap-space-xs overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          <button
            className={`px-space-md py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 transition-colors ${
              filter === "all" ? "bg-primary-container text-on-primary-container shadow-sm" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
            }`}
            type="button"
            onClick={() => setFilter("all")}
          >
            <span>All Rooms</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest/40 font-label-sm text-label-sm">{rooms.length}</span>
          </button>
          {(Object.keys(STATUS) as RoomStatus[]).map((id) => (
            <button
              key={id}
              className={`px-space-md py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1.5 transition-colors ${
                filter === id ? "bg-primary-container text-on-primary-container shadow-sm" : `bg-surface-container-high hover:bg-surface-container-highest ${STATUS[id].text}`
              }`}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(filter === id ? "all" : id)}
            >
              <span className={`w-2 h-2 rounded-full ${STATUS[id].dot}`}></span>
              <span>{STATUS[id].filter}</span>
              <span className={`font-label-sm text-label-sm ${filter === id ? "" : "text-on-surface-variant"}`}>{count(id)}</span>
            </button>
          ))}
        </div>
        <button
          className="px-space-sm py-1 bg-surface-container-high text-primary rounded-lg font-label-sm text-label-sm flex items-center gap-1 hover:bg-surface-container-highest transition-colors"
          type="button"
          onClick={() => setPrintMode("all")}
        >
          <span className="material-symbols-outlined text-[16px]">qr_code_2</span> Print All Room QR Codes
        </button>
      </div>

      {/* Primary Work Area: Rooms Grid + Selected Room Rail */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-gutter p-space-sm lg:p-space-md flex-1">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-space-md min-w-0">
          <div className="relative w-full bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg overflow-hidden sm:min-h-[720px] shadow-md flex flex-col gap-space-lg select-none">
            {/* Architectural Floor Backdrop Guides */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#8d90a0_1px,transparent_1px)] [background-size:24px_24px]"></div>
            {floors.map((floor) => {
              const floorRooms = rooms.filter((r) => r.floor === floor);
              return (
                <section key={floor} className="relative z-10 flex flex-col gap-space-md">
                  <div className="flex flex-wrap items-center justify-between gap-space-xs">
                    <span className="px-space-sm py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">stairs</span> {FLOOR_NAMES[floor] ?? `Floor ${floor}`} • Rooms{" "}
                      {floorRooms[0].number}–{floorRooms[floorRooms.length - 1].number}
                    </span>
                    <span className="text-on-surface-variant font-label-sm text-label-sm">{"// QR ROOM-SERVICE ORDERING"}</span>
                  </div>
                  <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-space-lg">
                    {floorRooms.map((r) => {
                      const st = STATUS[r.status];
                      const isSelected = r.number === selected;
                      const busy = r.status === "occupied" || r.status === "checkout";
                      return (
                        <div
                          key={r.number}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          onClick={() => setSelected(r.number)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelected(r.number);
                            }
                          }}
                          className={`cursor-pointer relative rounded-xl p-space-md transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            isSelected
                              ? "bg-surface-container-highest shadow-lg -translate-y-0.5"
                              : busy
                                ? "bg-surface-container shadow-sm hover:bg-surface-container-high"
                                : "bg-surface-container-low shadow-sm hover:bg-surface-container"
                          } ${filter !== "all" && filter !== r.status ? "opacity-30" : ""}`}
                        >
                          <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full font-label-sm text-label-sm shadow-sm flex items-center gap-1 ${st.badge}`}>
                            <span className="material-symbols-outlined text-[12px]">{st.icon}</span> {st.label}
                          </div>
                          <div className="flex items-start justify-between gap-space-sm">
                            <div className="min-w-0">
                              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Room {r.number}</span>
                              <span className="block font-label-sm text-label-sm text-on-surface-variant truncate">
                                {r.type} • {r.beds}
                              </span>
                            </div>
                          </div>
                          <div className="mt-space-sm space-y-1">
                            <div className="flex items-center justify-between gap-2 text-on-surface-variant font-label-sm text-label-sm">
                              {busy ? (
                                <>
                                  <span className="flex items-center gap-1 truncate">
                                    <span className="material-symbols-outlined text-[13px]">badge</span> {r.guest} • {r.guests}
                                  </span>
                                  <span className={`font-semibold shrink-0 ${st.text}`}>{r.stay}</span>
                                </>
                              ) : (
                                <span className={st.text}>No guest checked in</span>
                              )}
                            </div>
                            {newOrders(r.number) > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm font-semibold animate-pulse">
                                <span className="material-symbols-outlined text-[14px]">qr_code_scanner</span>
                                {newOrders(r.number)} new QR {newOrders(r.number) === 1 ? "order" : "orders"}
                              </div>
                            )}
                            {activeOrders(r.number).map((o) => (
                              <div key={o.id} className="px-2 py-1 rounded bg-surface-container-lowest/60 font-label-sm text-label-sm">
                                <span className="text-tertiary font-semibold">
                                  #{o.number} • {ORDER_STATUS[o.status].label}
                                </span>
                                <p className="text-on-surface truncate">{o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</p>
                              </div>
                            ))}
                            <div className="flex items-center justify-between gap-2 font-label-md text-label-md bg-surface-container-highest/30 px-2 py-1 rounded">
                              <span className="text-on-surface-variant font-label-sm text-label-sm">Room Service</span>
                              <span className={`font-label-md text-label-md font-bold ${chargeTotal(r) ? "text-on-surface" : "text-on-surface-variant"}`}>
                                {chargeTotal(r) ? peso(chargeTotal(r)) : "No open tab"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* Right Side Panel / Selected Room QR */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full">
          <div className="bg-surface-container rounded-xl shadow-xl flex flex-col justify-between overflow-hidden flex-1">
            <div className="p-space-md bg-surface-container-high">
              <div className="flex items-center justify-between pb-space-xs">
                <div className="flex items-center gap-space-xs">
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${s.dot}`}></span>
                  <span className={`font-label-sm text-label-sm uppercase tracking-wider font-bold ${s.text}`}>Selected Room • {s.label}</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded">
                  {FLOOR_NAMES[room.floor] ?? `Floor ${room.floor}`}
                </span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold pt-1">Room {room.number}</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <span className="material-symbols-outlined text-[15px] text-primary">{room.guest ? "person" : "bed"}</span>
                {room.guest ? (
                  <>
                    <strong className="text-on-surface font-medium">{room.guest}</strong> • {room.guests} {room.guests === 1 ? "Guest" : "Guests"} • {room.stay}
                  </>
                ) : (
                  <>
                    {room.type} • {room.beds} • No guest checked in
                  </>
                )}
              </p>
            </div>

            <div className="p-space-md flex-1 overflow-y-auto space-y-space-md">
              {/* Live orders placed from this room's QR code */}
              {roomOrders(room.number).length > 0 && (
                <div className="space-y-space-xs">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">qr_code_scanner</span> QR Orders
                  </span>
                  {[...roomOrders(room.number)].reverse().map((o) => {
                    const st = ORDER_STATUS[o.status];
                    return (
                      <div key={o.id} className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-label-md text-label-md text-on-surface font-bold">
                            #{o.number} <span className="text-on-surface-variant font-normal">• {orderTime(o.createdAt)}</span>
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-label-sm text-label-sm uppercase ${st.chip}`}>{st.label}</span>
                        </div>
                        {o.lines.map((l) => (
                          <div key={l.itemId} className="flex justify-between gap-space-sm font-body-sm text-body-sm text-on-surface">
                            <span>
                              <span className="font-label-sm text-label-sm text-primary font-bold">{l.qty}×</span> {l.name}
                            </span>
                            <span className="font-label-sm text-label-sm shrink-0">{peso(l.qty * l.price)}</span>
                          </div>
                        ))}
                        {o.note && <p className="font-label-sm text-label-sm text-tertiary">Note: {o.note}</p>}
                        <div className="flex items-center justify-between gap-space-sm pt-space-xs">
                          <span className="font-label-md text-label-md text-on-surface font-semibold">{peso(o.total)}</span>
                          {st.next && (
                            <button
                              type="button"
                              onClick={() => advance(o, st.next!.status)}
                              className={`px-space-md py-1.5 rounded-lg font-label-sm text-label-sm font-bold flex items-center gap-1 active:scale-95 transition-all ${st.next.cls}`}
                            >
                              <span className="material-symbols-outlined text-[16px]">{st.next.icon}</span> {st.next.label}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Room-service tab */}
              <div className="space-y-space-xs">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Room Service Tab</span>
                {room.tab.length || roomOrders(room.number).length ? (
                  <>
                    {room.tab.map((l) => (
                      <div key={l.name} className="p-space-sm rounded-lg bg-surface-container-low flex items-start justify-between gap-space-sm">
                        <div className="flex items-start gap-space-xs">
                          <span className="w-5 h-5 shrink-0 rounded bg-surface-container flex items-center justify-center font-label-sm text-label-sm text-on-surface font-bold">
                            {l.qty}
                          </span>
                          <span className="font-body-md text-body-md text-on-surface font-medium leading-tight">{l.name}</span>
                        </div>
                        <span className="font-label-md text-label-md text-on-surface font-semibold shrink-0">{peso(l.amount)}</span>
                      </div>
                    ))}
                    <div className="pt-space-xs flex justify-between items-baseline">
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Charge to Room</span>
                      <span className="font-headline-lg text-headline-lg text-primary font-bold">{peso(chargeTotal(room))}</span>
                    </div>
                  </>
                ) : (
                  <p className="p-space-sm rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">
                    No room-service orders yet. Orders placed from this room&apos;s QR code will appear here.
                  </p>
                )}
              </div>

            </div>

            <div className="p-space-md bg-surface-container-high flex flex-col gap-space-sm">
              <button
                className="w-full min-h-[56px] py-space-sm px-space-md rounded-xl bg-primary-container hover:bg-primary-container/90 active:scale-[0.98] text-on-primary-container font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-space-sm shadow-md transition-all"
                type="button"
                onClick={() => setPrintMode("single")}
              >
                <span className="material-symbols-outlined text-[24px]">print</span>
                <span>Print Room {room.number} QR Card</span>
              </button>
              <div className="grid grid-cols-2 gap-space-xs">
                <button
                  className="min-h-[48px] py-2 px-space-xs rounded-lg bg-surface-container hover:bg-surface-container-highest active:scale-[0.98] text-on-surface font-label-sm text-label-sm font-semibold flex flex-col items-center justify-center gap-1 transition-all"
                  type="button"
                  onClick={copyLink}
                >
                  <span className="material-symbols-outlined text-[18px]">{copied ? "check" : "content_copy"}</span>
                  <span>{copied ? "Link Copied" : "Copy Order Link"}</span>
                </button>
                <button
                  className="min-h-[48px] py-2 px-space-xs rounded-lg bg-surface-container hover:bg-surface-container-highest active:scale-[0.98] text-on-surface font-label-sm text-label-sm font-semibold flex flex-col items-center justify-center gap-1 transition-all"
                  type="button"
                  onClick={() => setPrintMode("all")}
                >
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                  <span>Print All Rooms</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New QR order alert */}
      <button
        type="button"
        onClick={() => {
          if (alert) setSelected(alert.room);
          setAlert(null);
        }}
        className={`fixed bottom-16 left-4 right-4 sm:left-auto sm:right-8 z-50 bg-tertiary-container text-on-tertiary-container px-space-lg py-space-sm rounded-xl shadow-2xl flex items-center gap-space-sm transition-all duration-300 print:hidden ${
          alert ? "" : "translate-y-24 opacity-0 pointer-events-none"
        }`}
      >
        <span className="material-symbols-outlined">notifications_active</span>
        <span className="flex flex-col text-left">
          <span className="font-label-md text-label-md font-bold">New room-service order • Room {alert?.room}</span>
          <span className="font-label-sm text-label-sm">
            #{alert?.number} • {alert ? peso(alert.total) : ""} • Tap to view
          </span>
        </span>
      </button>

      {/* Print-only QR card for the selected room */}
      <div className={`hidden ${printMode === "single" ? "print-area print:block" : ""}`}>
        <QrCard room={room} qr={qr[room.number]} />
      </div>

      {/* Print-only sheet with every room's QR card */}
      <div className={`hidden ${printMode === "all" ? "print-area print:grid" : ""} grid-cols-3 gap-4 p-4 bg-white`}>
        {rooms.map((r) => (
          <QrCard key={r.number} room={r} qr={qr[r.number]} />
        ))}
      </div>
    </div>
  );
}
