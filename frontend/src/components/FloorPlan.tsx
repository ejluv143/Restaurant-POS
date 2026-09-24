"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import ModifierEditor from "@/components/ModifierEditor";
import ZoneTabs, { type ZoneId } from "@/components/ZoneTabs";
import { FLOOR_TABLES, billTotal, type BillLine, type FloorTable, type TableId } from "@/lib/floorTables";
import { peso } from "@/lib/rooms";
import { isSample, markCleaned, updateLine, useTableBills, type TableBill } from "@/lib/tableBills";

const isTableId = (id: string | null): id is TableId => id !== null && id in FLOOR_TABLES;

const LIVE_STAGE: Record<FloorTable["status"], string> = {
  seated: "Order Sent",
  bill: "Bill Out",
  available: "Ready for Seating",
  bussing: "Dirtied • just now",
};

// Once a table leaves its sample session it has no sample ticket, timer or course
function tableView(id: TableId, bill: TableBill): FloorTable {
  const base = FLOOR_TABLES[id];
  if (isSample(id, bill)) return base;
  const name = base.name.split(" - ")[0];
  return { ...base, name, status: bill.status, guests: bill.guests, server: bill.server, stage: LIVE_STAGE[bill.status], ticket: undefined, elapsed: undefined, progress: undefined };
}

// Order Entry links back with ?table=T4 so the table just ordered for is the one shown
function SelectFromUrl({ onSelect }: { onSelect: (id: TableId) => void }) {
  const table = useSearchParams().get("table");
  useEffect(() => {
    if (isTableId(table)) onSelect(table);
    // Only when the URL changes, not on every render of the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
  return null;
}

// Shared by every restaurant zone; each zone reuses the Main Dining layout until it gets its own design
export default function FloorPlan({ zone }: { zone: ZoneId }) {
  const [selected, setSelected] = useState<TableId>("T1");
  const tableBills = useTableBills();
  const bills = Object.fromEntries(Object.entries(tableBills).map(([id, b]) => [id, b.lines])) as Record<TableId, BillLine[]>;
  const panelRef = useRef<HTMLDivElement>(null);

  // The design appends bg-surface-container-highest to the clicked tile; swap it in for the tile's own background
  const bg = (id: TableId, own: string) => (selected === id ? "bg-surface-container-highest ring-2 ring-primary" : own);

  // Below lg the panel sits under the floor plan, so bring it into view when a table is tapped
  const select = (id: TableId) => {
    setSelected(id);
    if (!window.matchMedia("(min-width: 1024px)").matches) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col w-full">
      <Suspense fallback={null}>
        <SelectFromUrl onSelect={select} />
      </Suspense>
      {/* Sub-Header Status & Sections Bar */}
      <div className="w-full bg-surface-container-low px-space-md sm:px-space-lg py-space-sm flex flex-wrap items-center justify-between gap-space-md shadow-sm">
        <ZoneTabs active={zone} />
        {/* Real-time Live Metrics Telemetry Strip */}
        <div className="max-w-full flex items-center gap-space-md sm:gap-space-lg bg-surface-container px-space-md py-1.5 rounded-lg overflow-x-auto no-scrollbar whitespace-nowrap [&>*]:shrink-0">
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Capacity:</span>
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              18/24 <span className="text-secondary font-label-sm text-label-sm">(75%)</span>
            </span>
          </div>
          <div className="h-3 w-px bg-surface-container-highest"></div>
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[16px]">group</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Guests Seated:</span>
            <span className="font-label-md text-label-md text-on-surface font-semibold">54</span>
          </div>
          <div className="h-3 w-px bg-surface-container-highest"></div>
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-tertiary text-[16px]">avg_pace</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Avg Turn:</span>
            <span className="font-label-md text-label-md text-on-surface font-semibold">48m</span>
          </div>
        </div>
      </div>

      {/* Filter Ribbon & Quick Floor Actions */}
      <div className="w-full bg-surface px-space-md sm:px-space-lg py-space-sm flex flex-wrap items-center justify-between gap-space-sm">
        <div className="max-w-full flex items-center gap-space-xs overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          <button className="px-space-md py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm flex items-center gap-1 shadow-sm" type="button">
            <span>All Tables</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest/40 text-on-primary font-label-sm text-label-sm">24</span>
          </button>
          <button className="px-space-md py-1 rounded-full bg-surface-container-high text-primary hover:bg-surface-container-highest font-label-sm text-label-sm flex items-center gap-1.5 transition-colors" type="button">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <span>Seated (Active)</span>
            <span className="text-on-surface-variant font-label-sm text-label-sm">14</span>
          </button>
          <button className="px-space-md py-1 rounded-full bg-surface-container-high text-tertiary hover:bg-surface-container-highest font-label-sm text-label-sm flex items-center gap-1.5 transition-colors" type="button">
            <span className="w-2 h-2 rounded-full bg-tertiary"></span>
            <span>Check Dropped</span>
            <span className="text-on-surface-variant font-label-sm text-label-sm">4</span>
          </button>
          <button className="px-space-md py-1 rounded-full bg-surface-container-high text-secondary hover:bg-surface-container-highest font-label-sm text-label-sm flex items-center gap-1.5 transition-colors" type="button">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            <span>Available / Clean</span>
            <span className="text-on-surface-variant font-label-sm text-label-sm">4</span>
          </button>
          <button className="px-space-md py-1 rounded-full bg-surface-container-high text-error hover:bg-surface-container-highest font-label-sm text-label-sm flex items-center gap-1.5 transition-colors" type="button">
            <span className="w-2 h-2 rounded-full bg-error"></span>
            <span>Needs Bussing</span>
            <span className="text-on-surface-variant font-label-sm text-label-sm">2</span>
          </button>
        </div>
        {/* View Modes & Canvas Controls */}
        <div className="flex items-center gap-space-xs">
          <div className="bg-surface-container-low p-0.5 rounded-lg flex items-center">
            <button className="p-1 rounded bg-surface-container-highest text-on-surface" title="Grid Floor View" type="button">
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button className="p-1 rounded text-on-surface-variant hover:text-on-surface" title="List View" type="button">
              <span className="material-symbols-outlined text-[18px]">view_list</span>
            </button>
          </div>
          <button className="px-space-sm py-1 bg-surface-container text-on-surface-variant hover:text-on-surface rounded-lg font-label-sm text-label-sm flex items-center gap-1" type="button">
            <span className="material-symbols-outlined text-[16px]">zoom_in</span> 100%
          </button>
          <button className="px-space-sm py-1 bg-surface-container-high text-primary rounded-lg font-label-sm text-label-sm flex items-center gap-1" type="button">
            <span className="material-symbols-outlined text-[16px]">person_add</span> Quick Seat
          </button>
        </div>
      </div>

      {/* Primary Work Area: Floor Plan Grid (Left ~68%) + Detail Rail (Right ~32%) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-gutter p-space-sm lg:p-space-md flex-1">
        {/* Floor Map Canvas Area (Span 8) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-space-md min-w-0">
          <div className="relative w-full bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg overflow-hidden sm:min-h-[720px] shadow-md flex flex-col justify-between select-none">
            {/* Architectural Floor Backdrop Guides */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#8d90a0_1px,transparent_1px)] [background-size:24px_24px]"></div>
            {/* Architectural Annotations & Landmarks */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-space-sm pb-space-md">
              <div className="flex flex-wrap items-center gap-space-sm">
                <span className="px-space-sm py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">door_front</span> Main Entrance • Host Stand
                </span>
                <span className="text-on-surface-variant font-label-sm text-label-sm">{"// SECTOR: ALPHA-DINING"}</span>
              </div>
              <div className="flex items-center gap-space-md">
                <span className="px-space-sm py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">soup_kitchen</span> Kitchen Pass • Expo Line
                </span>
              </div>
            </div>

            {/* Interactive 2D Floor Layout */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-space-md sm:gap-space-lg my-auto py-space-md">
              {/* TABLE T1: Booth 4-top (Active / Selected) */}
              {isSample("T1", tableBills.T1) ? (
                <div
                  onClick={() => select("T1")}
                  className={`cursor-pointer group relative rounded-xl ${bg("T1", "bg-surface-container-high")} p-space-md shadow-lg transition-all duration-150 transform hover:-translate-y-0.5`}
                  id="table-T1"
                >
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Seated
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">T1</span>
                      <span className="block font-label-sm text-label-sm text-on-surface-variant">Booth • 4-Top</span>
                    </div>
                    <div className="flex items-center text-primary gap-0.5">
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      <span className="font-label-md text-label-md font-bold">4</span>
                    </div>
                  </div>
                  {/* Visual Chairs Representation */}
                  <div className="my-space-sm flex justify-center items-center gap-1 py-1 bg-surface-container-lowest/60 rounded-lg">
                    <span className="w-3 h-1.5 rounded-full bg-primary"></span>
                    <span className="w-3 h-1.5 rounded-full bg-primary"></span>
                    <span className="w-3 h-1.5 rounded-full bg-primary"></span>
                    <span className="w-3 h-1.5 rounded-full bg-primary"></span>
                  </div>
                  <div className="mt-space-xs space-y-1">
                    <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">badge</span> Andrea R.
                      </span>
                      <span className="text-primary font-semibold">42m</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 font-label-md text-label-md pt-1 bg-surface-container-highest/30 px-2 py-1 rounded">
                      <span className="text-on-surface-variant font-label-sm text-label-sm">Active Bill</span>
                      <span className="font-label-md text-label-md text-on-surface font-bold">{peso(billTotal(bills.T1))}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <StatusTile id="T1" bill={tableBills.T1} className={`${bg("T1", "bg-surface-container")}`} onSelect={() => select("T1")} />
              )}
              {/* TABLE T2: 2-top Round (Check Dropped / Amber) */}
              {isSample("T2", tableBills.T2) ? (
                <div
                  onClick={() => select("T2")}
                  className={`cursor-pointer group relative rounded-xl ${bg("T2", "bg-surface-container")} p-space-md shadow-sm transition-all hover:bg-surface-container-high`}
                  id="table-T2"
                >
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm shadow-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">receipt_long</span> Bill Sent
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">T2</span>
                      <span className="block font-label-sm text-label-sm text-on-surface-variant">Round • 2-Top</span>
                    </div>
                    <div className="flex items-center text-tertiary gap-0.5">
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      <span className="font-label-md text-label-md font-bold">2</span>
                    </div>
                  </div>
                  {/* Visual Chairs Representation */}
                  <div className="my-space-sm flex justify-center items-center gap-1 py-1 bg-surface-container-lowest/60 rounded-lg">
                    <span className="w-3 h-1.5 rounded-full bg-tertiary"></span>
                    <span className="w-3 h-1.5 rounded-full bg-tertiary"></span>
                  </div>
                  <div className="mt-space-xs space-y-1">
                    <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">badge</span> Andrea R.
                      </span>
                      <span className="text-tertiary font-semibold">1h 10m</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 font-label-md text-label-md pt-1 bg-surface-container-highest/30 px-2 py-1 rounded">
                      <span className="text-on-surface-variant font-label-sm text-label-sm">Check Dropped</span>
                      <span className="font-label-md text-label-md text-tertiary font-bold">{peso(billTotal(bills.T2))}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <StatusTile id="T2" bill={tableBills.T2} className={`${bg("T2", "bg-surface-container")}`} onSelect={() => select("T2")} />
              )}
              {/* TABLE T3: 6-top Large Booth (Seated / Paolo V.) */}
              {isSample("T3", tableBills.T3) ? (
                <div
                  onClick={() => select("T3")}
                  className={`cursor-pointer group relative rounded-xl ${bg("T3", "bg-surface-container")} p-space-md shadow-sm transition-all hover:bg-surface-container-high col-span-2`}
                  id="table-T3"
                >
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm shadow-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">dinner_dining</span> Apps Fired
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">T3 - Family Booth</span>
                      <span className="block font-label-sm text-label-sm text-on-surface-variant">Central Booth • Max 6 Guests</span>
                    </div>
                    <div className="flex items-center text-primary gap-0.5">
                      <span className="material-symbols-outlined text-[18px]">group</span>
                      <span className="font-label-md text-label-md font-bold">6 Guests</span>
                    </div>
                  </div>
                  {/* Visual Chairs Representation */}
                  <div className="my-space-sm flex justify-center items-center gap-2 py-1.5 bg-surface-container-lowest/60 rounded-lg">
                    <span className="w-4 h-1.5 rounded-full bg-primary"></span>
                    <span className="w-4 h-1.5 rounded-full bg-primary"></span>
                    <span className="w-4 h-1.5 rounded-full bg-primary"></span>
                    <span className="w-4 h-1.5 rounded-full bg-primary"></span>
                    <span className="w-4 h-1.5 rounded-full bg-primary"></span>
                    <span className="w-4 h-1.5 rounded-full bg-primary"></span>
                  </div>
                  <div className="grid grid-cols-2 gap-space-sm pt-1">
                    <div className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">badge</span> Paolo V. (18m elapsed)
                    </div>
                    <div className="flex items-center justify-end font-label-md text-label-md gap-2">
                      <span className="text-on-surface-variant font-label-sm text-label-sm">Ticket:</span>
                      <span className="font-label-md text-label-md text-on-surface font-bold">{peso(billTotal(bills.T3))}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <StatusTile id="T3" bill={tableBills.T3} className={`${bg("T3", "bg-surface-container")} col-span-2`} onSelect={() => select("T3")} />
              )}
              {/* TABLE T4: 4-top (Available & Clean - Emerald) */}
              {isSample("T4", tableBills.T4) ? (
                <div
                  onClick={() => select("T4")}
                  className={`cursor-pointer group relative rounded-xl ${bg("T4", "bg-surface-container-low")} p-space-md shadow-sm transition-all hover:bg-surface-container`}
                  id="table-T4"
                >
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm shadow-sm flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[12px]">arrow_back_ios_new</span> Clean • Ready
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">T4</span>
                      <span className="block font-label-sm text-label-sm text-secondary">Open • Seats 4</span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </div>
                  </div>
                  {/* Empty Table Graphic */}
                  <div className="my-space-md py-3 bg-surface-container-lowest/30 rounded-lg flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-secondary text-[26px]">table_bar</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">Tap to Seat Walk-in</span>
                  </div>
                  <div className="text-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Cleaned 12m ago</span>
                  </div>
                </div>
              ) : (
                <StatusTile id="T4" bill={tableBills.T4} className={bg("T4", "bg-surface-container")} onSelect={() => select("T4")} />
              )}
              {/* TABLE T5: 4-top Round (Needs Bussing - Coral Orange / Urgent) */}
              {isSample("T5", tableBills.T5) ? (
                <div
                  onClick={() => select("T5")}
                  className={`cursor-pointer group relative rounded-xl ${bg("T5", "bg-surface-container-low")} p-space-md shadow-sm transition-all hover:bg-surface-container`}
                  id="table-T5"
                >
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm shadow-sm flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[12px]">cleaning_services</span> Bussing Req.
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">T5</span>
                      <span className="block font-label-sm text-label-sm text-error">Dirtied • 6m ago</span>
                    </div>
                    <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                  </div>
                  <div className="my-space-md py-3 bg-surface-container-lowest/50 rounded-lg flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-error text-[24px]">sanitizer</span>
                    <span className="font-label-sm text-label-sm text-error mt-1 font-semibold">Ready for Busser</span>
                  </div>
                  <button
                    onClick={() => markCleaned("T5")}
                    className="w-full py-1 rounded bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold transition-colors"
                    type="button"
                  >
                    Mark as Cleaned
                  </button>
                </div>
              ) : (
                <StatusTile id="T5" bill={tableBills.T5} className={`${bg("T5", "bg-surface-container")}`} onSelect={() => select("T5")} />
              )}
              {/* TABLE T6: High-Top 2-top (Seated) */}
              {isSample("T6", tableBills.T6) ? (
                <div
                  onClick={() => select("T6")}
                  className={`cursor-pointer group relative rounded-xl ${bg("T6", "bg-surface-container")} p-space-md shadow-sm transition-all hover:bg-surface-container-high`}
                  id="table-T6"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">T6</span>
                      <span className="block font-label-sm text-label-sm text-on-surface-variant">High-Top • 2</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm">Active</span>
                  </div>
                  <div className="my-space-sm flex justify-center gap-1 py-1 bg-surface-container-lowest/60 rounded">
                    <span className="w-2.5 h-1.5 rounded-full bg-primary"></span>
                    <span className="w-2.5 h-1.5 rounded-full bg-primary"></span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 text-on-surface-variant font-label-sm text-label-sm mt-1">
                    <span>Andrea R. • 26m</span>
                    <span className="text-on-surface font-semibold font-label-md text-label-md">{peso(billTotal(bills.T6))}</span>
                  </div>
                </div>
              ) : (
                <StatusTile id="T6" bill={tableBills.T6} className={`${bg("T6", "bg-surface-container")}`} onSelect={() => select("T6")} />
              )}
              {/* TABLE T7: High-Top 2-top (Check Dropped) */}
              {isSample("T7", tableBills.T7) ? (
                <div
                  onClick={() => select("T7")}
                  className={`cursor-pointer group relative rounded-xl ${bg("T7", "bg-surface-container")} p-space-md shadow-sm transition-all hover:bg-surface-container-high`}
                  id="table-T7"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">T7</span>
                      <span className="block font-label-sm text-label-sm text-on-surface-variant">High-Top • 2</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm">Bill Out</span>
                  </div>
                  <div className="my-space-sm flex justify-center gap-1 py-1 bg-surface-container-lowest/60 rounded">
                    <span className="w-2.5 h-1.5 rounded-full bg-tertiary"></span>
                    <span className="w-2.5 h-1.5 rounded-full bg-tertiary"></span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 text-on-surface-variant font-label-sm text-label-sm mt-1">
                    <span>Carlo M. • 54m</span>
                    <span className="text-tertiary font-semibold font-label-md text-label-md">{peso(billTotal(bills.T7))}</span>
                  </div>
                </div>
              ) : (
                <StatusTile id="T7" bill={tableBills.T7} className={`${bg("T7", "bg-surface-container")}`} onSelect={() => select("T7")} />
              )}
              {/* TABLE T8: High-Top 2-top (Clean / Open) */}
              {isSample("T8", tableBills.T8) ? (
                <div
                  onClick={() => select("T8")}
                  className={`cursor-pointer group relative rounded-xl ${bg("T8", "bg-surface-container-low")} p-space-md shadow-sm transition-all hover:bg-surface-container`}
                  id="table-T8"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold">T8</span>
                      <span className="block font-label-sm text-label-sm text-secondary">High-Top • 2</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">Clean</span>
                  </div>
                  <div className="my-space-sm flex justify-center items-center py-2 text-secondary">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </div>
                  <div className="text-center font-label-sm text-label-sm text-on-surface-variant">
                    <span>Ready for Seating</span>
                  </div>
                </div>
              ) : (
                <StatusTile id="T8" bill={tableBills.T8} className={bg("T8", "bg-surface-container")} onSelect={() => select("T8")} />
              )}
            </div>

            {/* Perimeter / Bar Seating Rail (B1 to B6) */}
            <div className="relative z-10 pt-space-md">
              <div className="flex flex-wrap items-center justify-between gap-x-space-sm pb-space-xs">
                <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">wine_bar</span> Oakwood Bar Counter Rail
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Bartender: Jomar L. • 5/6 Occupied</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-space-sm bg-surface-container p-space-sm rounded-xl">
                {/* Stool B1 */}
                <div className="bg-surface-container-high rounded-lg p-space-xs flex flex-col items-center justify-between text-center cursor-pointer hover:bg-surface-container-highest transition-colors">
                  <span className="font-label-md text-label-md font-bold text-on-surface">B1</span>
                  <span className="w-3 h-3 rounded-full bg-primary my-1 shadow-sm"></span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant truncate w-full">₱360.00</span>
                </div>
                {/* Stool B2 */}
                <div className="bg-surface-container-high rounded-lg p-space-xs flex flex-col items-center justify-between text-center cursor-pointer hover:bg-surface-container-highest transition-colors">
                  <span className="font-label-md text-label-md font-bold text-on-surface">B2</span>
                  <span className="w-3 h-3 rounded-full bg-primary my-1 shadow-sm"></span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant truncate w-full">₱240.00</span>
                </div>
                {/* Stool B3 */}
                <div className="bg-surface-container-high rounded-lg p-space-xs flex flex-col items-center justify-between text-center cursor-pointer hover:bg-surface-container-highest transition-colors">
                  <span className="font-label-md text-label-md font-bold text-on-surface">B3</span>
                  <span className="w-3 h-3 rounded-full bg-tertiary my-1 shadow-sm"></span>
                  <span className="font-label-sm text-label-sm text-tertiary truncate w-full">₱720.00</span>
                </div>
                {/* Stool B4 */}
                <div className="bg-surface-container-high rounded-lg p-space-xs flex flex-col items-center justify-between text-center cursor-pointer hover:bg-surface-container-highest transition-colors">
                  <span className="font-label-md text-label-md font-bold text-on-surface">B4</span>
                  <span className="w-3 h-3 rounded-full bg-primary my-1 shadow-sm"></span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant truncate w-full">₱180.00</span>
                </div>
                {/* Stool B5 */}
                <div className="bg-surface-container-low rounded-lg p-space-xs flex flex-col items-center justify-between text-center cursor-pointer hover:bg-surface-container transition-colors">
                  <span className="font-label-md text-label-md font-bold text-secondary">B5</span>
                  <span className="w-3 h-3 rounded-full bg-secondary my-1 shadow-sm"></span>
                  <span className="font-label-sm text-label-sm text-secondary truncate w-full">OPEN</span>
                </div>
                {/* Stool B6 */}
                <div className="bg-surface-container-high rounded-lg p-space-xs flex flex-col items-center justify-between text-center cursor-pointer hover:bg-surface-container-highest transition-colors">
                  <span className="font-label-md text-label-md font-bold text-on-surface">B6</span>
                  <span className="w-3 h-3 rounded-full bg-primary my-1 shadow-sm"></span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant truncate w-full">₱480.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Panel / Selected Table Detail Drawer (Span 4) */}
        <div ref={panelRef} className="lg:col-span-5 xl:col-span-4 flex flex-col h-full scroll-mt-36">
          <TablePanel
            key={selected}
            paid={!!tableBills[selected].payment}
            table={tableView(selected, tableBills[selected])}
            lines={bills[selected]}
            onChangeLine={(index, line) => updateLine(selected, index, line)}
          />
        </div>
      </div>
    </div>
  );
}

// Tile for a table past its sample session, drawn from its live status in the styles of T6 (seated), T5 (bussing) and T8 (clean)
function StatusTile({ id, bill, className, onSelect }: { id: TableId; bill: TableBill; className: string; onSelect: () => void }) {
  const { label } = FLOOR_TABLES[id];
  const occupied = bill.status === "seated" || bill.status === "bill";
  const badge = bill.payment
    ? { text: "Paid", cls: "bg-secondary-container text-on-secondary-container" }
    : {
        seated: { text: "Active", cls: "bg-primary-container text-on-primary-container" },
        bill: { text: "Bill Out", cls: "bg-tertiary-container text-on-tertiary-container" },
        available: { text: "Clean", cls: "bg-secondary-container text-on-secondary-container" },
        bussing: { text: "Bussing Req.", cls: "bg-error-container text-on-error-container" },
      }[bill.status];
  return (
    <div onClick={onSelect} className={`cursor-pointer group relative rounded-xl ${className} p-space-md shadow-sm transition-all hover:bg-surface-container-high`} id={`table-${id}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{id}</span>
          <span className={`block font-label-sm text-label-sm ${bill.status === "available" ? "text-secondary" : bill.status === "bussing" ? "text-error" : "text-on-surface-variant"}`}>
            {bill.status === "bussing" ? "Dirtied • just now" : label}
          </span>
        </div>
        <span className={`px-1.5 py-0.5 rounded font-label-sm text-label-sm ${badge.cls}`}>{badge.text}</span>
      </div>
      {occupied && (
        <>
          <div className="my-space-sm flex justify-center gap-1 py-1 bg-surface-container-lowest/60 rounded">
            {Array.from({ length: bill.guests ?? 0 }, (_, i) => (
              <span key={i} className={`w-2.5 h-1.5 rounded-full ${bill.status === "bill" ? "bg-tertiary" : "bg-primary"}`}></span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2 text-on-surface-variant font-label-sm text-label-sm mt-1">
            <span>{bill.server} • New</span>
            <span className="text-on-surface font-semibold font-label-md text-label-md">{peso(billTotal(bill.lines))}</span>
          </div>
        </>
      )}
      {bill.status === "bussing" && (
        <>
          <div className="my-space-sm py-2 bg-surface-container-lowest/50 rounded-lg flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-error text-[22px]">sanitizer</span>
            <span className="font-label-sm text-label-sm text-error mt-1 font-semibold">Ready for Busser</span>
          </div>
          <button
            onClick={() => markCleaned(id)}
            className="w-full py-1 rounded bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold transition-colors"
            type="button"
          >
            Mark as Cleaned
          </button>
        </>
      )}
      {bill.status === "available" && (
        <>
          <div className="my-space-sm flex justify-center items-center py-2 text-secondary">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
          <div className="text-center font-label-sm text-label-sm text-on-surface-variant">
            <span>Ready for Seating</span>
          </div>
        </>
      )}
    </div>
  );
}

const PRIMARY_ACTION =
  "w-full min-h-[56px] py-space-sm px-space-md rounded-xl bg-primary-container hover:bg-primary-container/90 active:scale-[0.98] text-on-primary-container font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-space-sm shadow-md transition-all";
const QUICK_ACTION =
  "min-h-[48px] py-2 px-space-xs rounded-lg bg-surface-container hover:bg-surface-container-highest active:scale-[0.98] text-on-surface font-label-sm text-label-sm font-semibold flex flex-col items-center justify-center gap-1 transition-all";
const QUICK_ACTION_ACCENT =
  "min-h-[48px] py-2 px-space-xs rounded-lg bg-secondary-container hover:bg-secondary-container/90 active:scale-[0.98] text-on-secondary-container font-label-sm text-label-sm font-bold flex flex-col items-center justify-center gap-1 transition-all shadow-sm";

const PANEL_STATUS = {
  seated: { dot: "bg-primary", text: "text-primary", label: "Live Check" },
  bill: { dot: "bg-tertiary", text: "text-tertiary", label: "Bill Out" },
  available: { dot: "bg-secondary", text: "text-secondary", label: "Available" },
  bussing: { dot: "bg-error", text: "text-error", label: "Needs Bussing" },
} as const;

function TablePanel({
  table,
  paid,
  lines,
  onChangeLine,
}: {
  table: FloorTable;
  paid: boolean;
  lines: BillLine[];
  onChangeLine: (index: number, line: BillLine) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const status = PANEL_STATUS[table.status];
  const total = billTotal(lines);
  const vatable = Math.round((total / 1.12) * 100) / 100;
  const occupied = table.status === "seated" || table.status === "bill";

  return (
    <div className="bg-surface-container rounded-xl shadow-xl flex flex-col justify-between overflow-hidden flex-1">
      {/* Drawer Header / Selected Target Identity */}
      <div className="p-space-md bg-surface-container-high">
        <div className="flex items-center justify-between pb-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${status.dot} animate-pulse`}></span>
            <span className={`font-label-sm text-label-sm uppercase tracking-wider ${status.text} font-bold`}>Selected Table • {status.label}</span>
          </div>
          {table.ticket && (
            <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded">Ticket {table.ticket}</span>
          )}
        </div>
        <div className="flex items-start justify-between pt-1">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">{table.name}</h2>
            {occupied ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <span className={`material-symbols-outlined text-[15px] ${status.text}`}>groups</span> {table.guests} Guests • Server:{" "}
                <strong className="text-on-surface font-medium">{table.server}</strong>
              </p>
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <span className={`material-symbols-outlined text-[15px] ${status.text}`}>chair</span> Seats {table.seats}
              </p>
            )}
          </div>
          <div className="text-right">
            {table.elapsed && <span className="font-label-md text-label-md text-on-surface font-bold block">{table.elapsed}</span>}
            <span className={`font-label-sm text-label-sm ${occupied ? "text-tertiary" : status.text}`}>{table.stage}</span>
          </div>
        </div>
        {/* Course Progress Bar Banner */}
        {table.progress && (
          <div className="mt-space-sm bg-surface-container-lowest p-space-sm rounded-lg">
            <div className="flex items-center justify-between text-on-surface font-label-sm text-label-sm pb-1">
              <span className={`flex items-center gap-1 ${status.text} font-semibold`}>
                <span className="material-symbols-outlined text-[14px]">{table.progress.icon}</span> {table.progress.label}
              </span>
              <span className="text-on-surface-variant">{table.progress.minutes} min elapsed</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div className={`${status.dot} h-full rounded-full ${table.progress.width}`}></div>
            </div>
          </div>
        )}
      </div>

      {occupied ? (
        <>
          {/* Quick Itemized Summary Order List */}
          <div className="p-space-md flex-1 overflow-y-auto space-y-space-sm">
            <div className="flex items-center justify-between pb-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Current Bill Details</span>
              <button
                onClick={() => setEditing((e) => !e)}
                aria-pressed={editing}
                className="text-primary font-label-sm text-label-sm hover:underline flex items-center gap-0.5"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">{editing ? "check" : "edit"}</span> {editing ? "Done" : "Edit Modifiers"}
              </button>
            </div>
            {editing && (
              <p className="font-label-sm text-label-sm text-primary bg-primary-container/15 px-space-sm py-1.5 rounded-lg flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">touch_app</span> Tap an item to change its modifiers
              </p>
            )}
            {/* Order Line Items */}
            <div className="space-y-space-xs">
              {lines.map((l, i) => (
                <BillItem
                  key={`${l.name}-${i}`}
                  qty={l.qty}
                  name={l.name}
                  mods={l.mods}
                  note={l.note}
                  modified={l.modified}
                  unsent={l.unsent}
                  price={peso(l.price)}
                  onEdit={editing ? () => setEditIndex(i) : undefined}
                />
              ))}
            </div>
          </div>
          {/* Financial Breakdown & Quick Calculations */}
          <div className="p-space-md bg-surface-container-lowest/80 space-y-space-xs">
            <div className="flex justify-between text-on-surface-variant font-label-sm text-label-sm">
              <span>VATable Sales</span>
              <span className="text-on-surface font-medium font-label-md text-label-md">{peso(vatable)}</span>
            </div>
            <div className="flex justify-between text-on-surface-variant font-label-sm text-label-sm">
              <span>VAT 12% (Inclusive)</span>
              <span className="text-on-surface font-medium font-label-md text-label-md">{peso(total - vatable)}</span>
            </div>
            <div className="pt-space-xs flex justify-between items-baseline">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Total Balance</span>
              <span className={`font-display-lg text-display-lg ${status.text} font-bold tracking-tight`}>{peso(total)}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="p-space-md flex-1 flex flex-col items-center justify-center text-center gap-space-xs min-h-[240px]">
          <span className={`material-symbols-outlined ${status.text} text-[48px]`}>{table.status === "bussing" ? "sanitizer" : "table_bar"}</span>
          <span className={`font-headline-sm text-headline-sm ${status.text} font-bold`}>
            {table.status === "bussing" ? "Ready for Busser" : "Ready for Seating"}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {table.status === "bussing" ? "Clear and sanitize before seating the next guests." : "No open check on this table."}
          </span>
        </div>
      )}

      {/* Tactical Fast-Touch POS Action Buttons */}
      <div className="p-space-md bg-surface-container-high flex flex-col gap-space-sm">
        {paid && (
          <Link href={`/checkout?table=${table.id}`} className={PRIMARY_ACTION}>
            <span className="material-symbols-outlined text-[24px]">task_alt</span>
            <span>Paid • Close Table</span>
          </Link>
        )}
        {!paid && table.status === "seated" && (
          <>
            <Link href={`/order-entry?table=${table.id}`} className={PRIMARY_ACTION}>
              <span className="material-symbols-outlined text-[24px]">post_add</span>
              <span>Open Order / Add Items</span>
            </Link>
            <div className="grid grid-cols-3 gap-space-xs">
              <button className={QUICK_ACTION} type="button">
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Print Bill</span>
              </button>
              <button className={QUICK_ACTION} type="button">
                <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                <span>Transfer Table</span>
              </button>
              <Link href={`/checkout?table=${table.id}`} className={QUICK_ACTION_ACCENT}>
                <span className="material-symbols-outlined text-[18px]">call_split</span>
                <span>Split / Pay</span>
              </Link>
            </div>
          </>
        )}
        {!paid && table.status === "bill" && (
          <>
            <Link href={`/checkout?table=${table.id}`} className={PRIMARY_ACTION}>
              <span className="material-symbols-outlined text-[24px]">payments</span>
              <span>Take Payment</span>
            </Link>
            <div className="grid grid-cols-3 gap-space-xs">
              <button className={QUICK_ACTION} type="button">
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Reprint Bill</span>
              </button>
              <button className={QUICK_ACTION} type="button">
                <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                <span>Transfer Table</span>
              </button>
              <Link href={`/order-entry?table=${table.id}`} className={QUICK_ACTION}>
                <span className="material-symbols-outlined text-[18px]">post_add</span>
                <span>Add Items</span>
              </Link>
            </div>
          </>
        )}
        {table.status === "available" && (
          <Link href={`/order-entry?table=${table.id}`} className={PRIMARY_ACTION}>
            <span className="material-symbols-outlined text-[24px]">group_add</span>
            <span>Seat Guests & Open Order</span>
          </Link>
        )}
        {table.status === "bussing" && (
          <button onClick={() => markCleaned(table.id)} className={PRIMARY_ACTION} type="button">
            <span className="material-symbols-outlined text-[24px]">cleaning_services</span>
            <span>Mark as Cleaned</span>
          </button>
        )}
      </div>

      {editIndex !== null && (
        <ModifierEditor
          mode="edit"
          line={lines[editIndex]}
          onClose={() => setEditIndex(null)}
          onSave={(line) => {
            onChangeLine(editIndex, line);
            setEditIndex(null);
          }}
        />
      )}
    </div>
  );
}

function BillItem({
  qty,
  name,
  mods,
  note,
  modified,
  unsent,
  price,
  onEdit,
}: {
  qty: number;
  name: string;
  mods: string;
  note?: string;
  modified?: boolean;
  unsent?: boolean;
  price: string;
  /** Set while the panel is in Edit Modifiers mode */
  onEdit?: () => void;
}) {
  const body = (
    <div className="flex items-start justify-between gap-space-sm">
      <div className="flex items-start gap-space-xs">
        <span className="w-5 h-5 shrink-0 rounded bg-surface-container flex items-center justify-center font-label-sm text-label-sm text-on-surface font-bold">{qty}</span>
        <div>
          <span className="font-body-md text-body-md text-on-surface font-medium leading-tight flex flex-wrap items-center gap-x-1.5">
            {name}
            {modified && <span className="px-1.5 rounded bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm">Modified</span>}
            {unsent && <span className="px-1.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm">Not sent</span>}
          </span>
          {mods && (
            <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
              <span className="text-secondary">•</span> {mods}
            </span>
          )}
          {note && (
            <span className="font-label-sm text-label-sm text-tertiary flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[13px]">sticky_note_2</span> {note}
            </span>
          )}
        </div>
      </div>
      <span className="flex items-center gap-1 font-label-md text-label-md text-on-surface font-semibold">
        {price}
        {onEdit && <span className="material-symbols-outlined text-[16px] text-primary">chevron_right</span>}
      </span>
    </div>
  );
  return onEdit ? (
    <button type="button" onClick={onEdit} className="w-full text-left p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container-high ring-1 ring-primary/40 transition-colors">
      {body}
    </button>
  ) : (
    <div className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors">{body}</div>
  );
}
