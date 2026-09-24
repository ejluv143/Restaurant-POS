"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import ModifierEditor from "@/components/ModifierEditor";
import TablePicker from "@/components/TablePicker";
import { FLOOR_TABLES, billTotal, type BillLine, type TableId } from "@/lib/floorTables";
import { MODIFIERS } from "@/lib/modifiers";
import { peso } from "@/lib/rooms";
import { addLine, changeQty, isSample, removeLine, sendTicket, useTableBills } from "@/lib/tableBills";

interface MenuTile {
  code: string;
  name: string;
  desc: string;
  price: number;
  /** Material Symbols icon shown until a dish photo is added */
  icon: string;
  badge?: "low-stock" | "chef-pick";
}

const MENU_TILES: MenuTile[] = [
  { code: "#M-101", name: "Crispy Pata (Whole)", desc: "Deep-fried pork knuckle, soy-vinegar dip", price: 895, icon: "kebab_dining", badge: "low-stock" },
  { code: "#M-102", name: "Kare-Kare", desc: "Oxtail & tripe in peanut sauce, bagoong", price: 650, icon: "soup_kitchen" },
  { code: "#M-103", name: "Sinigang na Hipon", desc: "Tamarind broth, prawns, kangkong, radish", price: 520, icon: "ramen_dining" },
  { code: "#M-104", name: "Chicken Inasal", desc: "Bacolod-style grilled chicken, annatto oil", price: 320, icon: "outdoor_grill", badge: "chef-pick" },
  { code: "#M-105", name: "Lechon Kawali", desc: "Crispy pork belly, Mang Tomas liver sauce", price: 450, icon: "restaurant" },
  { code: "#M-106", name: "Bistek Tagalog", desc: "Beef sirloin, calamansi-soy, onion rings", price: 480, icon: "lunch_dining" },
  { code: "#M-107", name: "Sizzling Sisig", desc: "Pork cheek, chili & egg on a hot plate", price: 380, icon: "skillet" },
  { code: "#M-108", name: "Adobong Manok", desc: "Chicken braised in soy, vinegar & garlic", price: 340, icon: "rice_bowl" },
];

const CATEGORIES = [
  "Favorites & Quick Keys",
  "Pulutan & Starters",
  "Ulam & Mains",
  "Pancit & Noodles",
  "Rice & Sides",
  "Drinks & Beer",
  "Panghimagas / Desserts",
];
const ACTIVE_CATEGORY = "Ulam & Mains";

const MODIFIER =
  "h-12 px-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high active:bg-primary-container active:text-on-primary-container text-on-surface font-label-md text-label-md transition-colors flex items-center justify-center text-center leading-tight select-none";

export default function OrderEntryPage() {
  // The table comes from ?table=T1; the static export prerenders the no-table view until the URL is read
  return (
    <Suspense fallback={<OrderEntry tableId={null} />}>
      <OrderEntryForUrl />
    </Suspense>
  );
}

function OrderEntryForUrl() {
  const table = useSearchParams().get("table");
  return <OrderEntry tableId={table !== null && table in FLOOR_TABLES ? (table as TableId) : null} />;
}

function OrderEntry({ tableId }: { tableId: TableId | null }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [adding, setAdding] = useState<BillLine | null>(null);

  // Dishes with options open the modifier window first; the rest go straight onto the ticket
  const onTile = (tile: MenuTile) => {
    if (!tableId) return;
    const line: BillLine = { qty: 1, name: tile.name, mods: "", price: tile.price };
    if (MODIFIERS[tile.name]?.length) setAdding(line);
    else addLine(tableId, line);
  };

  // Lightweight POS tactile feedback and search handling (mirrors the design's script,
  // which targets every button inside a `.grid` in this section)
  const gridButtons = () => sectionRef.current?.querySelectorAll<HTMLButtonElement>(".grid button") ?? [];

  const onSearch = (value: string) => {
    const query = value.toLowerCase().trim();
    gridButtons().forEach((btn) => {
      const text = btn.innerText.toLowerCase();
      btn.style.display = !query || text.includes(query) ? "flex" : "none";
    });
  };

  // Micro-bounce click feedback
  const onSectionClick = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest("button");
    if (!btn || !Array.from(gridButtons()).includes(btn)) return;
    btn.classList.add("ring-2", "ring-primary");
    setTimeout(() => btn.classList.remove("ring-2", "ring-primary"), 180);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="w-full flex flex-col md:flex-row gap-space-md p-space-sm sm:p-space-md min-h-[calc(100vh-5.5rem)]">
        {/* LEFT COLUMN: Active Bill Pad / Ticket Rail (38% on large screens) */}
        <aside className="w-full md:w-[330px] lg:w-[380px] xl:w-[460px] 2xl:w-[490px] shrink-0 flex flex-col bg-surface-container-low rounded-xl shadow-xl overflow-hidden">
          {tableId ? (
            <TicketPad id={tableId} />
          ) : (
            <TablePicker
              subtitle="Pick the table you are taking the order for, then tap dishes on the menu."
              href={(id) => `/order-entry?table=${id}`}
              blocked={(bill) => (bill.status === "bussing" ? "Clear the table before taking an order" : null)}
            />
          )}
        </aside>

        {/* CENTER & RIGHT: High-Speed Touch Menu Matrix */}
        <section ref={sectionRef} onClick={onSectionClick} className="flex-1 flex flex-col gap-space-md min-w-0">
          {/* Top Section: Category Ribbons & Search/PLU Bar */}
          <div className="flex flex-col gap-space-sm bg-surface-container-low p-space-sm sm:p-space-md rounded-xl shadow-md">
            {/* Search and Quick Action Bar */}
            <div className="flex flex-wrap xl:flex-nowrap items-center gap-space-sm">
              <div className="relative flex-1 min-w-[min(240px,100%)]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[22px]">search</span>
                <input
                  className="w-full h-12 pl-11 pr-10 rounded-lg bg-surface-container text-on-surface placeholder:text-outline font-body-md text-body-md outline-none focus:bg-surface-container-high transition-colors"
                  id="menu-search-input"
                  placeholder="Search menu items, ingredients, or enter PLU (e.g. 401)..."
                  type="text"
                  onChange={(e) => onSearch(e.target.value)}
                />
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded"
                  title="Scan Barcode / Camera"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">barcode_scanner</span>
                </button>
              </div>
              <div className="flex items-center gap-space-xs shrink-0 max-w-full overflow-x-auto no-scrollbar">
                <button
                  className="h-12 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 font-label-md text-label-md transition-all active:scale-95"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px] text-tertiary">star</span>
                  <span>Popular</span>
                </button>
                <button
                  className="h-12 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 font-label-md text-label-md transition-all active:scale-95"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">view_comfy</span>
                  <span>Tile Size</span>
                </button>
                <button
                  className="h-12 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 font-label-md text-label-md transition-all active:scale-95"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">eco</span>
                  <span>Dietary</span>
                </button>
              </div>
            </div>
            {/* High-Density Horizontal Category Ribbon Tabs */}
            <nav aria-label="Menu Categories" className="flex items-center gap-space-xs overflow-x-auto pb-1 scrollbar-none no-scrollbar">
              {CATEGORIES.map((c) =>
                c === ACTIVE_CATEGORY ? (
                  <button
                    key={c}
                    className="whitespace-nowrap px-space-lg h-11 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md font-bold shadow-sm transition-all flex items-center gap-1.5"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">restaurant</span>
                    <span>{c}</span>
                  </button>
                ) : (
                  <button
                    key={c}
                    className="whitespace-nowrap px-space-lg h-11 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-md text-label-md font-semibold transition-all"
                    type="button"
                  >
                    {c}
                  </button>
                ),
              )}
            </nav>
          </div>

          {/* Menu Items Grid (Primary Visual Touch Surface) */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-sm sm:gap-space-md content-start auto-rows-fr overflow-y-auto">
            {MENU_TILES.map((tile) => (
              <button
                key={tile.code}
                onClick={() => onTile(tile)}
                className="group relative flex flex-col justify-between p-space-sm sm:p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container active:scale-[0.98] transition-all text-left shadow-md overflow-hidden min-h-[160px]"
                type="button"
              >
                {tile.badge === "low-stock" && (
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold animate-pulse">3 left</span>
                  </div>
                )}
                {tile.badge === "chef-pick" && (
                  <div className="absolute top-2 right-2">
                    <span className="px-1.5 py-0.5 rounded-full bg-secondary-container/80 text-secondary font-label-sm text-label-sm font-semibold">Chef Pick</span>
                  </div>
                )}
                <div className="w-full h-24 rounded-lg overflow-hidden mb-space-sm relative">
                  <div className="w-full h-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:scale-105 transition-transform duration-300">
                    <span className="material-symbols-outlined text-[40px]">{tile.icon}</span>
                  </div>
                  <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-surface-container-lowest/80 backdrop-blur-sm text-on-surface font-label-sm text-label-sm">
                    {tile.code}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold group-hover:text-primary transition-colors leading-snug">{tile.name}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">{tile.desc}</p>
                </div>
                <div className="flex items-center justify-between mt-space-sm pt-space-xs">
                  <span className="font-label-lg text-label-lg text-primary font-bold">{peso(tile.price)}</span>
                  <span className="w-8 h-8 rounded-lg bg-surface-container-highest group-hover:bg-primary group-hover:text-on-primary text-on-surface-variant flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Quick Modifier Ribbon & Kitchen Overrides (Sticky at bottom of Menu area) */}
          <div className="bg-surface-container-low p-space-sm sm:p-space-md rounded-xl shadow-lg flex flex-col gap-space-xs">
            <div className="flex flex-wrap items-center justify-between gap-x-space-sm text-on-surface-variant">
              <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-tertiary">bolt</span> Quick Modifiers &amp; Shift Notes
              </span>
              <span className="font-label-sm text-label-sm">
                Applies to: <strong className="text-on-surface">Seat 1 • Crispy Pata</strong>
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-space-xs">
              <button className={MODIFIER} type="button">
                No Pork
              </button>
              <button className={MODIFIER} type="button">
                Less Salt
              </button>
              <button className={MODIFIER} type="button">
                Sauce on Side
              </button>
              <button className={MODIFIER} type="button">
                Extra Spicy
              </button>
              {/* Mod 5 (Rush Ticket) */}
              <button
                className="h-12 px-space-xs rounded-lg bg-error-container/40 hover:bg-error-container text-error font-label-md text-label-md transition-colors flex items-center justify-center gap-1 text-center leading-tight select-none"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">priority_high</span> Rush Order
              </button>
              {/* Mod 6 (Custom) */}
              <button className={`${MODIFIER} gap-1`} type="button">
                <span className="material-symbols-outlined text-[16px]">edit_note</span> Custom Note
              </button>
            </div>
          </div>
        </section>
      </div>

      {adding && tableId && (
        <ModifierEditor
          mode="add"
          line={adding}
          onClose={() => setAdding(null)}
          onSave={(line) => {
            addLine(tableId, line);
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}

/** The chosen table's ticket: items already sent, new items being added, totals and the send/pay actions */
function TicketPad({ id }: { id: TableId }) {
  const router = useRouter();
  const bill = useTableBills()[id];
  const table = FLOOR_TABLES[id];
  const total = billTotal(bill.lines);
  const itemCount = bill.lines.reduce((n, l) => n + l.qty, 0);
  const newCount = bill.lines.reduce((n, l) => n + (l.unsent ? l.qty : 0), 0);
  const seated = bill.status !== "available";
  // Sample check details only belong to the table's original sample bill
  const sample = isSample(id, bill) && table.ticket;

  const send = () => {
    sendTicket(id);
    router.push(`/?table=${id}`);
  };

  return (
    <>
      {/* Ticket Header / Seat & Table Meta */}
      <div className="bg-surface-container-high p-space-md flex flex-col gap-space-xs">
        <div className="flex items-center justify-between gap-space-xs">
          <div className="flex items-center gap-space-sm min-w-0">
            <Link
              href="/order-entry"
              className="w-10 h-10 shrink-0 rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface flex items-center justify-center transition-all active:scale-95"
              title="Back to Choose a Table"
              aria-label="Back to Choose a Table"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </Link>
            <span className="shrink-0 whitespace-nowrap px-space-sm py-0.5 rounded-lg bg-primary-container text-on-primary-container font-label-lg text-label-lg tracking-wider">{id}</span>
            <div className="min-w-0">
              <h2 className="font-headline-sm text-headline-sm text-on-surface leading-tight">
                Dining Main • {seated ? `${bill.guests} Guests` : `Seats ${table.seats}`}
              </h2>
              <span className="font-label-sm text-label-sm text-on-surface-variant flex flex-wrap items-center gap-x-1">
                {seated ? (
                  <>
                    Server: <span className="text-on-surface font-medium">{bill.server}</span> •{" "}
                    {sample ? `Check ${table.ticket} • Open ${table.elapsed}` : "New check"}
                  </>
                ) : (
                  "Walk-in • seated when the ticket is sent"
                )}
              </span>
            </div>
          </div>
        </div>
        {/* Sent vs. new item counts */}
        <div className="grid grid-cols-2 gap-space-xs mt-space-xs">
          <div className="flex items-center justify-between px-space-sm py-1.5 rounded-lg bg-secondary-container/20 text-secondary">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-secondary shrink-0"></span>
              <span className="font-label-sm text-label-sm font-semibold truncate">Sent to Kitchen</span>
            </div>
            <span className="font-label-sm text-label-sm opacity-90 shrink-0">{itemCount - newCount}</span>
          </div>
          <div className="flex items-center justify-between px-space-sm py-1.5 rounded-lg bg-tertiary-container/25 text-tertiary">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-2 h-2 rounded-full bg-tertiary shrink-0 ${newCount ? "animate-pulse" : ""}`}></span>
              <span className="font-label-sm text-label-sm font-semibold truncate">New • Not Sent</span>
            </div>
            <span className="font-label-sm text-label-sm opacity-90 shrink-0 font-medium">{newCount}</span>
          </div>
        </div>
      </div>

      {/* Ticket Items */}
      <div className="flex-1 overflow-y-auto p-space-sm space-y-space-sm text-on-surface" id="ticket-scroll-container">
        {/* Shared Table Items Section */}
        <div className="bg-surface-container rounded-lg p-space-sm space-y-space-xs">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-tertiary">dinner_dining</span>
              <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-wider font-semibold">Shared / Center Table</span>
            </div>
            {bill.lines.length > 0 &&
              (newCount ? (
                <span className="px-1.5 py-0.5 rounded bg-tertiary-container/30 text-tertiary font-label-sm text-label-sm">{newCount} Not Sent</span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-secondary-container/30 text-secondary font-label-sm text-label-sm">Kitchen Fired</span>
              ))}
          </div>
          {bill.lines.length === 0 && (
            <p className="px-1 py-space-md text-center font-body-sm text-body-sm text-on-surface-variant">No items yet. Tap a dish on the menu to add it.</p>
          )}
          {bill.lines.map((l, i) => (
            <TicketLine key={`${l.name}-${i}`} line={l} onQty={(d) => changeQty(id, i, d)} onRemove={() => removeLine(id, i)} />
          ))}
        </div>
      </div>

      {/* Ticket Totals Calculation Block */}
      <div className="bg-surface-container-highest/60 p-space-md flex flex-col gap-space-xs">
        <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
          <span>Items ({itemCount} total)</span>
          <span className="font-label-md text-label-md text-on-surface">{peso(total)}</span>
        </div>
        <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
          <span>VAT 12% (Inclusive)</span>
          <span className="font-label-md text-label-md text-on-surface">{peso(total - Math.round((total / 1.12) * 100) / 100)}</span>
        </div>
        <div className="flex justify-between items-baseline pt-1">
          <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">Total Balance</span>
          <span className="font-display-lg text-headline-lg text-primary font-bold tracking-tight whitespace-nowrap">{peso(total)}</span>
        </div>
      </div>

      {/* Ticket Bottom Action Touch Command Center */}
      <div className="p-space-sm bg-surface-container-high grid grid-cols-2 gap-space-xs">
        {/* Fire Course 2 (Amber) */}
        <button
          className="h-14 rounded-lg bg-tertiary hover:bg-tertiary-fixed text-on-tertiary font-headline-sm text-headline-sm flex items-center justify-center gap-space-xs font-semibold shadow-md active:scale-[0.98] transition-all"
          type="button"
        >
          <span className="material-symbols-outlined text-[24px]">local_fire_department</span>
          <span>Fire Mains</span>
        </button>
        {/* Send to Kitchen (Emerald) */}
        <button
          onClick={send}
          disabled={newCount === 0}
          className="h-14 rounded-lg bg-secondary-container hover:bg-secondary text-on-secondary-container font-headline-sm text-headline-sm flex items-center justify-center gap-space-xs font-semibold shadow-md active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:bg-secondary-container disabled:active:scale-100"
          type="button"
        >
          <span className="material-symbols-outlined text-[24px]">send</span>
          <span>Send Ticket</span>
        </button>
        {/* Options / Discounts */}
        <button
          className="min-h-12 px-space-xs rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg flex items-center justify-center text-center gap-space-xs transition-colors active:scale-[0.98]"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">tune</span>
          <span>Discounts &amp; Comp</span>
        </button>
        {/* Fast Pay Trigger (Blue) */}
        <Link
          href={`/checkout?table=${id}`}
          className="min-h-12 px-space-xs rounded-lg bg-primary-container hover:bg-inverse-primary text-on-primary-container font-label-lg text-label-lg flex items-center justify-center text-center gap-space-xs font-bold transition-colors active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[20px]">payments</span>
          <span>Fast Pay {peso(total)}</span>
        </Link>
      </div>
    </>
  );
}

function TicketLine({ line, onQty, onRemove }: { line: BillLine; onQty: (delta: number) => void; onRemove: () => void }) {
  return (
    <div className={`bg-surface-container-high rounded p-space-xs space-y-1 ${line.unsent ? "ring-1 ring-tertiary/50" : ""}`}>
      <div className="flex items-center justify-between gap-space-xs">
        <div className="flex items-center gap-space-xs min-w-0">
          {line.unsent ? (
            <div className="flex items-center bg-surface-container-highest rounded px-1 shrink-0">
              <button type="button" onClick={() => onQty(-1)} className="text-on-surface-variant hover:text-on-surface text-label-md font-bold px-1.5 py-0.5" title="Decrease" aria-label={`One less ${line.name}`}>
                -
              </button>
              <span className="font-label-md text-label-md text-on-surface px-1 font-bold">{line.qty}</span>
              <button type="button" onClick={() => onQty(1)} className="text-on-surface-variant hover:text-on-surface text-label-md font-bold px-1.5 py-0.5" title="Increase" aria-label={`One more ${line.name}`}>
                +
              </button>
            </div>
          ) : (
            <span className="shrink-0 font-label-md text-label-md text-primary font-bold px-1.5 py-0.5 rounded bg-surface-container-highest">{line.qty}×</span>
          )}
          <span className="font-body-md text-body-md text-on-surface font-medium truncate">{line.name}</span>
        </div>
        <div className="flex items-center gap-space-xs shrink-0">
          <span className="font-label-md text-label-md text-on-surface font-medium">{peso(line.price)}</span>
          {line.unsent ? (
            <button
              type="button"
              onClick={onRemove}
              className="w-7 h-7 rounded bg-surface-container-highest hover:bg-error/20 text-on-surface-variant hover:text-error flex items-center justify-center transition-colors"
              title="Remove Item"
              aria-label={`Remove ${line.name}`}
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          ) : (
            <button
              type="button"
              className="w-7 h-7 rounded bg-surface-container-highest hover:bg-error/20 text-on-surface-variant hover:text-error flex items-center justify-center transition-colors"
              title="Void or Hold Item"
            >
              <span className="material-symbols-outlined text-[16px]">more_vert</span>
            </button>
          )}
        </div>
      </div>
      <div className="pl-6 space-y-0.5 font-label-sm text-label-sm text-on-surface-variant">
        {line.mods && (
          <p className="flex items-center gap-1">
            <span className="text-outline">•</span> {line.mods}
          </p>
        )}
        {line.note && (
          <p className="flex items-center gap-1 text-tertiary">
            <span className="material-symbols-outlined text-[13px]">sticky_note_2</span> {line.note}
          </p>
        )}
        {line.unsent ? (
          <p className="flex items-center gap-1 text-tertiary">
            <span className="material-symbols-outlined text-[13px]">schedule</span> New • not sent
          </p>
        ) : (
          <p className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-secondary">check_circle</span> Sent to kitchen
          </p>
        )}
      </div>
    </div>
  );
}
