"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";

interface ChitItem {
  qty: string;
  name: string;
  status: string;
  statusCls: string;
  note: string;
  noteCls: string;
  /** Finished items: struck through, dimmed, with a check in the badge */
  ready?: boolean;
}

interface Chit {
  id: string;
  strip: string;
  badge: string;
  badgeCls: string;
  meta: React.ReactNode;
  timer: { icon: string; spin?: boolean; text: string; boxCls: string; textCls: string };
  timerNote: { text: string; cls: string };
  course: { label: string; labelCls: string; right: string; rightCls: string };
  items: ChitItem[];
  progress: { pct: number; barCls: string };
  bump: { label: string; icon: string; cls: string };
  sideIcon: string;
}

const STATUS_NEUTRAL = "bg-surface-container-highest text-on-surface";
const STATUS_QUEUED = "bg-surface-container-highest text-on-surface-variant";
const STATUS_WARM = "bg-tertiary-container text-on-tertiary-container";
const STATUS_DONE = "bg-secondary-container text-on-secondary-container";
const BADGE = "font-label-sm text-label-sm px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold";
const BUMP_GLOW = "hover:brightness-110";

const Server = ({ table, name }: { table: string; name: string }) => (
  <>
    {table} • <span className="text-on-surface font-medium">{name}</span>
  </>
);

const CHITS: Chit[] = [
  // TICKET #104: CRITICAL RUSH (RED BADGE)
  {
    id: "#104",
    strip: "bg-error animate-pulse",
    badge: "Rush Alert",
    badgeCls: "bg-error-container text-on-error-container",
    meta: <Server table="Table 12 • 4 Guests" name="Andrea R." />,
    timer: { icon: "alarm", spin: true, text: "18m 42s", boxCls: "bg-error/20 text-error", textCls: "text-error" },
    timerNote: { text: "Late Priority", cls: "text-error" },
    course: { label: "Course 2 • Entrees", labelCls: "text-tertiary", right: "3 Items", rightCls: "text-on-surface-variant" },
    items: [
      { qty: "1x", name: "Crispy Pata (Whole)", status: "In Progress", statusCls: STATUS_WARM, note: "EXTRA CRISPY • Add Garlic Rice", noteCls: "text-error" },
      { qty: "1x", name: "Sinigang na Hipon", status: "Ready", statusCls: STATUS_DONE, note: "Extra sour, extra kangkong", noteCls: "text-on-surface-variant", ready: true },
      { qty: "1x", name: "Pancit Canton Guisado", status: "Ready", statusCls: STATUS_DONE, note: "Extra calamansi on the side", noteCls: "text-on-surface-variant", ready: true },
    ],
    progress: { pct: 66, barCls: "bg-secondary" },
    bump: { label: "Bump Course", icon: "done_all", cls: `bg-secondary-container text-on-secondary-container ${BUMP_GLOW}` },
    sideIcon: "print",
  },
  // TICKET #105: NORMAL STEADY (GREEN BADGE)
  {
    id: "#105",
    strip: "bg-secondary",
    badge: "On Time",
    badgeCls: "bg-secondary-container/30 text-secondary",
    meta: <Server table="Table 04 • 2 Guests" name="Paolo V." />,
    timer: { icon: "schedule", text: "06m 15s", boxCls: "bg-secondary-container/20 text-secondary", textCls: "text-secondary" },
    timerNote: { text: "Target: 10m", cls: "text-on-surface-variant" },
    course: { label: "Course 1 • Starters", labelCls: "text-primary", right: "2 Items", rightCls: "text-on-surface-variant" },
    items: [
      { qty: "1x", name: "Crispy Calamares", status: "Frying", statusCls: STATUS_NEUTRAL, note: "Spiced vinegar dip, calamansi", noteCls: "text-on-surface-variant" },
      { qty: "1x", name: "Bulalo Soup", status: "Simmering", statusCls: STATUS_WARM, note: "Extra bone marrow, extra corn", noteCls: "text-tertiary" },
    ],
    progress: { pct: 50, barCls: "bg-secondary" },
    bump: { label: "Bump Order", icon: "check", cls: `bg-primary-container text-on-primary-container ${BUMP_GLOW}` },
    sideIcon: "print",
  },
  // TICKET #106: ONLINE TAKEOUT / DELIVERY (AMBER BADGE)
  {
    id: "#SH-882",
    strip: "bg-tertiary",
    badge: "Delivery",
    badgeCls: "bg-tertiary-container text-on-tertiary-container",
    meta: (
      <>
        <span className="material-symbols-outlined text-[14px] text-tertiary">moped</span>
        <span className="text-tertiary font-medium">GrabFood Pickup</span> • Bag #02
      </>
    ),
    timer: { icon: "hourglass_top", text: "12m 30s", boxCls: "bg-tertiary-container/30 text-tertiary", textCls: "text-tertiary" },
    timerNote: { text: "Rider Arriving", cls: "text-on-surface-variant" },
    course: { label: "Packaging Station", labelCls: "text-on-surface-variant", right: "Expedite", rightCls: "text-tertiary" },
    items: [
      { qty: "2x", name: "Chicken Inasal Meal", status: "Wrapped", statusCls: STATUS_DONE, note: "MOD: NO SKIN on 1 inasal", noteCls: "text-error" },
      { qty: "1x", name: "Lumpiang Shanghai (12 pcs)", status: "Boxed", statusCls: STATUS_WARM, note: "Side Sweet Chili Sauce Cup", noteCls: "text-on-surface-variant" },
    ],
    progress: { pct: 80, barCls: "bg-tertiary" },
    bump: { label: "Packaged & Ready", icon: "takeout_dining", cls: `bg-tertiary-container text-on-tertiary-container ${BUMP_GLOW}` },
    sideIcon: "receipt_long",
  },
  // TICKET #107: NEW ORDER (BLUE BADGE)
  {
    id: "#107",
    strip: "bg-primary-container",
    badge: "New Chit",
    badgeCls: "bg-primary-container text-on-primary-container",
    meta: <Server table="Table 18 • 6 Guests" name="Carlo M." />,
    timer: { icon: "fiber_new", text: "03m 10s", boxCls: "bg-surface-container text-primary", textCls: "text-primary" },
    timerNote: { text: "Just Received", cls: "text-on-surface-variant" },
    course: { label: "Course 1 • Starters", labelCls: "text-primary", right: "4 Items", rightCls: "text-on-surface-variant" },
    items: [
      { qty: "1x", name: "Kinilaw na Tanigue", status: "Queued", statusCls: STATUS_QUEUED, note: "Coconut vinegar, ginger, red onion", noteCls: "text-on-surface-variant" },
      { qty: "2x", name: "Ensaladang Mangga", status: "Queued", statusCls: STATUS_QUEUED, note: "NO BAGOONG (Shrimp Allergy)", noteCls: "text-error" },
      { qty: "1x", name: "Sizzling Sisig", status: "Queued", statusCls: STATUS_QUEUED, note: "No egg • Extra chili", noteCls: "text-on-surface-variant" },
    ],
    progress: { pct: 15, barCls: "bg-primary" },
    bump: { label: "Start Order", icon: "play_arrow", cls: "bg-surface-container-highest text-on-surface hover:bg-surface-bright" },
    sideIcon: "print",
  },
  // TICKET #108: BAR SERVICE (QUICK FIRE)
  {
    id: "#108",
    strip: "bg-secondary-container",
    badge: "Bar Quick",
    badgeCls: "bg-secondary-container/20 text-secondary",
    meta: <Server table="Bar Tab 03 • 2 Guests" name="Bea R." />,
    timer: { icon: "bolt", text: "02m 00s", boxCls: "bg-surface-container text-secondary", textCls: "text-secondary" },
    timerNote: { text: "Fast Turnaround", cls: "text-on-surface-variant" },
    course: { label: "Pulutan • Bar Snacks", labelCls: "text-secondary", right: "2 Items", rightCls: "text-on-surface-variant" },
    items: [
      { qty: "2x", name: "Chicharon Bulaklak", status: "In Fryer", statusCls: STATUS_NEUTRAL, note: "Spiced vinegar, extra crispy", noteCls: "text-on-surface-variant" },
      { qty: "1x", name: "Tokwa't Baboy", status: "Plating", statusCls: STATUS_WARM, note: "Soy-vinegar, chili, red onion", noteCls: "text-on-surface-variant" },
    ],
    progress: { pct: 40, barCls: "bg-secondary" },
    bump: { label: "Bump Order", icon: "check", cls: `bg-secondary-container text-on-secondary-container ${BUMP_GLOW}` },
    sideIcon: "print",
  },
];

const STATIONS = [
  { icon: "soup_kitchen", label: "All Stations (Expo)", count: 8 },
  { icon: "skillet", label: "Grill Station", count: 3 },
  { icon: "ramen_dining", label: "Sauté & Noodles", count: 2 },
  { icon: "nutrition", label: "Kinilaw & Salads", count: 2 },
  { icon: "local_bar", label: "Dessert / Bar", count: 1 },
];

const VIEW_ACTIVE = "bg-primary-container text-on-primary-container shadow-sm";
const VIEW_IDLE = "text-on-surface-variant hover:text-on-surface";

export default function KitchenDisplayPage() {
  const [chits, setChits] = useState(CHITS);
  const [bumping, setBumping] = useState<string[]>([]);
  const [station, setStation] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [view, setView] = useState<"grid" | "expo">("grid");
  const [clock, setClock] = useState("19:42:15");
  const [toast, setToast] = useState({ visible: false, text: "Ticket #104 Bumped Successfully" });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Latest tickets for the Space shortcut ("bump next ticket")
  const chitsRef = useRef(chits);
  useEffect(() => {
    chitsRef.current = chits;
  }, [chits]);

  // 1. Live Clock
  useEffect(() => {
    const tick = () => setClock(new Date().toTimeString().split(" ")[0]);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // 2. Toast Notification
  const showToast = useCallback((text: string) => {
    setToast({ visible: true, text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }, []);

  // 3. Bump: fade the card out, then remove it and confirm
  const bump = useCallback(
    (id: string) => {
      setBumping((b) => [...b, id]);
      setTimeout(() => {
        setChits((cs) => cs.filter((c) => c.id !== id));
        setBumping((b) => b.filter((x) => x !== id));
        showToast(`${id} Bumped to Expo`);
      }, 250);
    },
    [showToast],
  );

  // 7. Keyboard Shortcuts (Space, R, P)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        const first = chitsRef.current[0];
        if (first) bump(first.id);
      } else if (e.key.toLowerCase() === "r") {
        showToast("Recall function triggered");
      } else if (e.key.toLowerCase() === "p") {
        showToast("Chit printed to Expediters Pass #01");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bump, showToast]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  return (
    <div className="flex flex-col w-full">
      {/* Top KDS Control Bar & Metric Strip */}
      <section className="w-full bg-surface-container-low px-space-md sm:px-space-lg py-space-sm flex flex-col gap-space-sm shadow-md">
        {/* Row 1: Station Selector & Utility Controls */}
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          {/* Active Station Filter Tabs */}
          <div className="flex items-center gap-space-xs bg-surface-container-lowest p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
            {STATIONS.map((s, i) => (
              <button
                key={s.label}
                onClick={() => setStation(i)}
                className={`station-tab font-label-md text-label-md px-space-lg py-space-sm rounded-lg flex items-center gap-space-xs shrink-0 transition-colors ${
                  station === i ? "bg-primary-container text-on-primary-container shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
                <span>{s.label}</span>
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full font-label-sm text-label-sm ${
                    i === 0 ? "bg-surface-container-highest text-on-surface" : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {s.count}
                </span>
              </button>
            ))}
          </div>
          {/* Action Toggles */}
          <div className="flex flex-wrap items-center gap-space-xs bg-surface-container-lowest p-1 rounded-xl max-w-full">
            {/* Sound Alert Toggle */}
            <button
              className="flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
              id="soundToggleBtn"
              title="Toggle Chit Chime"
              type="button"
              onClick={() => setSoundEnabled((on) => !on)}
            >
              <span className={`material-symbols-outlined text-[18px] ${soundEnabled ? "text-secondary" : "text-outline"}`} id="soundIcon">
                {soundEnabled ? "volume_up" : "volume_off"}
              </span>
              <span className="font-label-sm text-label-sm">{soundEnabled ? "Alerts ON" : "Muted"}</span>
            </button>
            {/* Kitchen High-Contrast Mode Toggle */}
            <button
              className="flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
              id="contrastToggleBtn"
              title="Ultra Dark / Glare Reduction"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-tertiary">contrast</span>
              <span className="font-label-sm text-label-sm">High Contrast</span>
            </button>
            {/* View Switcher */}
            <div className="flex items-center bg-surface-container-high rounded-lg p-0.5 ml-1">
              <button
                className={`px-space-sm py-1 rounded font-label-sm text-label-sm flex items-center gap-1 ${view === "grid" ? VIEW_ACTIVE : VIEW_IDLE}`}
                id="viewGridBtn"
                title="Grid 4x2 Display"
                type="button"
                onClick={() => setView("grid")}
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                <span className="hidden sm:inline">Grid 4x2</span>
              </button>
              <button
                className={`px-space-sm py-1 rounded font-label-sm text-label-sm flex items-center gap-1 ${view === "expo" ? VIEW_ACTIVE : VIEW_IDLE}`}
                id="viewExpoBtn"
                title="Condensed Expeditor"
                type="button"
                onClick={() => setView("expo")}
              >
                <span className="material-symbols-outlined text-[16px]">view_agenda</span>
                <span className="hidden sm:inline">Expo</span>
              </button>
            </div>
          </div>
        </div>
        {/* Row 2: Realtime Kitchen Telemetry Metric Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm pt-space-xs">
          <div className="flex items-center justify-between bg-surface-container px-space-md py-space-xs rounded-lg shadow-sm">
            <div className="flex items-center gap-space-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Active Tickets</span>
            </div>
            <span className="font-label-lg text-label-lg text-primary">8</span>
          </div>
          <div className="flex items-center justify-between bg-surface-container px-space-md py-space-xs rounded-lg shadow-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-[16px]">timer</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Avg Ticket Time</span>
            </div>
            <span className="font-label-lg text-label-lg text-secondary">14m 20s</span>
          </div>
          <div className="flex items-center justify-between bg-surface-container px-space-md py-space-xs rounded-lg shadow-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-error text-[16px]">warning</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Overdue (&gt;20m)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.2 rounded bg-error-container text-on-error-container font-label-sm text-label-sm animate-pulse">1 Critical</span>
              <span className="font-label-lg text-label-lg text-error">1</span>
            </div>
          </div>
          <div className="flex items-center justify-between bg-surface-container px-space-md py-space-xs rounded-lg shadow-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-tertiary text-[16px]">check_circle</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Completed Today</span>
            </div>
            <span className="font-label-lg text-label-lg text-tertiary">142</span>
          </div>
        </div>
      </section>

      {/* Live Orders Workspace / Grid */}
      <section
        className={view === "grid" ? "p-space-sm sm:p-space-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-md w-full" : "p-space-sm sm:p-space-md grid grid-cols-1 md:grid-cols-2 gap-space-md w-full"}
        id="ticketContainer"
      >
        {chits.map((c) => (
          <article
            key={c.id}
            className="ticket-card bg-surface-container-high rounded-xl flex flex-col justify-between shadow-xl relative overflow-hidden transition-all duration-200"
            style={bumping.includes(c.id) ? { transform: "scale(0.95)", opacity: 0.3 } : undefined}
          >
            {/* Top Urgency Indicator Strip */}
            <div className={`h-2 w-full ${c.strip}`}></div>
            <div className="p-space-md flex flex-col flex-1">
              {/* Header */}
              <div className="flex items-start justify-between gap-space-xs pb-space-sm">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-sm text-headline-sm text-on-surface">{c.id}</span>
                    <span className={`${c.badgeCls} ${BADGE}`}>{c.badge}</span>
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 flex items-center gap-1 flex-wrap">{c.meta}</div>
                </div>
                {/* Elapsed Timer */}
                <div className="flex flex-col items-end">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${c.timer.boxCls}`}>
                    <span className={`material-symbols-outlined text-[16px] ${c.timer.spin ? "animate-spin" : ""}`}>{c.timer.icon}</span>
                    <span className={`font-label-lg text-label-lg font-bold ${c.timer.textCls}`}>{c.timer.text}</span>
                  </div>
                  <span className={`font-label-sm text-label-sm mt-0.5 ${c.timerNote.cls}`}>{c.timerNote.text}</span>
                </div>
              </div>
              {/* Course Header */}
              <div className="bg-surface-container-lowest px-space-sm py-1 rounded flex items-center justify-between my-space-xs">
                <span className={`font-label-sm text-label-sm uppercase tracking-wider ${c.course.labelCls}`}>{c.course.label}</span>
                <span className={`font-label-sm text-label-sm ${c.course.rightCls}`}>{c.course.right}</span>
              </div>
              {/* Order Items List */}
              <div className="flex flex-col gap-space-xs my-space-xs flex-1">
                {c.items.map((item) => (
                  <div
                    key={item.name}
                    className={`bg-surface-container p-space-sm rounded-lg flex flex-col gap-1 transition-colors hover:bg-surface-bright cursor-pointer ${item.ready ? "opacity-90" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-baseline gap-space-xs">
                        <span className={`font-label-lg text-label-lg font-bold ${item.ready ? "text-secondary" : "text-primary"}`}>{item.qty}</span>
                        <span className={`font-body-md text-body-md text-on-surface font-medium ${item.ready ? "line-through decoration-secondary/50" : ""}`}>{item.name}</span>
                      </div>
                      <span className={`${item.statusCls} font-label-sm text-label-sm px-1.5 py-0.5 rounded uppercase ${item.ready ? "flex items-center gap-0.5" : ""}`}>
                        {item.ready && <span className="material-symbols-outlined text-[12px]">check</span>} {item.status}
                      </span>
                    </div>
                    <div className={`font-label-sm text-label-sm pl-space-md ${item.noteCls}`}>• {item.note}</div>
                  </div>
                ))}
              </div>
              {/* Kitchen Item Visual Progress Mini Bar */}
              <div className="w-full bg-surface-container-lowest rounded-full h-1.5 my-space-sm overflow-hidden">
                <div className={`h-full rounded-full transition-all ${c.progress.barCls}`} style={{ width: `${c.progress.pct}%` }}></div>
              </div>
            </div>
            {/* Action Button Area */}
            <div className="p-space-sm bg-surface-container-lowest flex items-center gap-space-xs">
              <button
                className={`bump-btn flex-1 min-h-[52px] ${c.bump.cls} font-label-lg text-label-lg rounded-xl flex items-center justify-center gap-space-xs active:scale-95 transition-all shadow-md`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  bump(c.id);
                }}
              >
                <span className="material-symbols-outlined text-[20px]">{c.bump.icon}</span>
                <span>{c.bump.label}</span>
              </button>
              <button
                className="w-12 h-[52px] bg-surface-container text-on-surface-variant hover:text-on-surface rounded-xl flex items-center justify-center active:scale-95 transition-all"
                title="Print Chit"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">{c.sideIcon}</span>
              </button>
            </div>
          </article>
        ))}

        {/* INLINE KITCHEN VISUAL MONITOR TILE (Visual rich asset placeholder) */}
        <article className="ticket-card bg-surface-container rounded-xl flex-col justify-between shadow-lg overflow-hidden border-2 border-dashed border-outline-variant/40 p-space-md hidden xl:flex">
          <div className="flex items-center justify-between pb-space-xs">
            <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-wider font-semibold">Expo Live Station Cam</span>
            <span className="flex items-center gap-1 font-label-sm text-label-sm text-secondary">
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span> Live
            </span>
          </div>
          <div className="relative w-full h-44 rounded-lg overflow-hidden bg-surface-container-lowest my-space-xs">
            <img
              className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
              alt="Overhead view of the kitchen expeditor pass with plated dishes under heat lamps"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAy9qVmiQGHh5T7I0r0L--6Ui9AxnTrXpm_fuR2BYK5sd3uT5utidu8Rtiml3QJsECowwtxRYgu9c6m3Xbb7M4Nr8j1lN-V44jc--4li1U1FnhhMJc6SUrpzABiyCIV4G-R9FsjhxMjj4TZVCayeLbQ6s8N72qzBdgwA7gNiZXjekYruP_b4AwRFb7fW1sBh2FVZ8WVY2P6NTWmmX0IQiblVR4xhdeYSwlgIMckszIHObjKjRaCeK22pw"
            />
            <div className="absolute bottom-2 left-2 bg-surface-container-lowest/80 backdrop-blur-sm px-2 py-0.5 rounded text-on-surface font-label-sm text-label-sm">
              Pass Cam #1 • Heat Lamps Active
            </div>
          </div>
          <div className="flex items-center justify-between pt-space-xs text-on-surface-variant font-label-sm text-label-sm">
            <span>
              Pass Load: <strong className="text-secondary">Optimal</strong>
            </span>
            <span>
              Ticket Queue: <strong className="text-on-surface">4 waiting</strong>
            </span>
          </div>
        </article>
      </section>

      {/* Notification Toast (triggered on bump) */}
      <div
        className={`fixed bottom-16 right-8 bg-surface-container-highest text-on-surface px-space-lg py-space-sm rounded-xl shadow-2xl flex items-center gap-space-sm transform transition-all duration-300 z-50 ${
          toast.visible ? "" : "translate-y-24 opacity-0"
        }`}
        id="kdsToast"
      >
        <span className="material-symbols-outlined text-secondary">check_circle</span>
        <span className="font-label-md text-label-md" id="toastMsg">
          {toast.text}
        </span>
      </div>

      {/* Bottom Bump Bar Shortcut Guide (Fixed Utilitarian Footer Strip) */}
      <div className="w-full bg-surface-container-lowest px-space-md sm:px-space-lg py-2.5 shadow-inner flex flex-wrap items-center justify-between gap-space-md z-40 select-none">
        <div className="flex items-center gap-space-md text-on-surface-variant font-label-sm text-label-sm">
          <Shortcut k="SPACE" label="Bump Next Ticket" />
          <span className="text-outline-variant">•</span>
          <Shortcut k="R" label="Recall Last" />
          <span className="text-outline-variant hidden sm:inline">•</span>
          <Shortcut k="F" label="Cycle Station" className="hidden sm:flex" />
          <span className="text-outline-variant hidden md:inline">•</span>
          <Shortcut k="P" label="Print Active Chit" className="hidden md:flex" />
        </div>
        {/* Live System Clock & Rush Monitor */}
        <div className="flex items-center gap-space-md shrink-0">
          <div className="flex items-center gap-1.5 text-secondary font-label-sm text-label-sm">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary"></span>
            <span>Kitchen Net: Synchronized</span>
          </div>
          <div className="bg-surface-container px-space-sm py-1 rounded text-on-surface font-label-md text-label-md">
            <span id="liveClock" suppressHydrationWarning>
              {clock}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Shortcut({ k, label, className = "flex" }: { k: string; label: string; className?: string }) {
  return (
    <div className={`${className} items-center gap-1.5`}>
      <kbd className="px-2 py-1 bg-surface-container-high rounded text-on-surface font-label-sm text-label-sm font-semibold shadow-sm">{k}</kbd>
      <span>{label}</span>
    </div>
  );
}
