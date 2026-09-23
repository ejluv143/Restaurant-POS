"use client";

import { useState } from "react";
import ZoneTabs from "@/components/ZoneTabs";

// Simple interactive selection logic for floor map tiles (T1–T5), as in the design's script
type InteractiveTable = "T1" | "T2" | "T3" | "T4" | "T5";

export default function FloorPlanPage() {
  const [selected, setSelected] = useState<InteractiveTable | null>(null);

  // The design appends bg-surface-container-highest to the clicked tile; swap it in for the tile's own background
  const bg = (id: InteractiveTable, own: string) => (selected === id ? "bg-surface-container-highest" : own);

  return (
    <div className="flex flex-col w-full">
      {/* Sub-Header Status & Sections Bar */}
      <div className="w-full bg-surface-container-low px-space-md sm:px-space-lg py-space-sm flex flex-wrap items-center justify-between gap-space-md shadow-sm">
        <ZoneTabs active="dining" />
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
              <div
                onClick={() => setSelected("T1")}
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
                    <span className="font-label-md text-label-md text-on-surface font-bold">₱1,965.00</span>
                  </div>
                </div>
              </div>
              {/* TABLE T2: 2-top Round (Check Dropped / Amber) */}
              <div
                onClick={() => setSelected("T2")}
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
                    <span className="font-label-md text-label-md text-tertiary font-bold">₱1,240.00</span>
                  </div>
                </div>
              </div>
              {/* TABLE T3: 6-top Large Booth (Seated / Paolo V.) */}
              <div
                onClick={() => setSelected("T3")}
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
                    <span className="font-label-md text-label-md text-on-surface font-bold">₱3,480.00</span>
                  </div>
                </div>
              </div>
              {/* TABLE T4: 4-top (Available & Clean - Emerald) */}
              <div
                onClick={() => setSelected("T4")}
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
              {/* TABLE T5: 4-top Round (Needs Bussing - Coral Orange / Urgent) */}
              <div
                onClick={() => setSelected("T5")}
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
                <button className="w-full py-1 rounded bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold transition-colors" type="button">
                  Mark as Cleaned
                </button>
              </div>
              {/* TABLE T6: High-Top 2-top (Seated) */}
              <div className="cursor-pointer group relative rounded-xl bg-surface-container p-space-md shadow-sm transition-all hover:bg-surface-container-high">
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
                  <span className="text-on-surface font-semibold font-label-md text-label-md">₱620.00</span>
                </div>
              </div>
              {/* TABLE T7: High-Top 2-top (Check Dropped) */}
              <div className="cursor-pointer group relative rounded-xl bg-surface-container p-space-md shadow-sm transition-all hover:bg-surface-container-high">
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
                  <span className="text-tertiary font-semibold font-label-md text-label-md">₱980.00</span>
                </div>
              </div>
              {/* TABLE T8: High-Top 2-top (Clean / Open) */}
              <div className="cursor-pointer group relative rounded-xl bg-surface-container-low p-space-md shadow-sm transition-all hover:bg-surface-container">
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
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full">
          <div className="bg-surface-container rounded-xl shadow-xl flex flex-col justify-between overflow-hidden flex-1">
            {/* Drawer Header / Selected Target Identity */}
            <div className="p-space-md bg-surface-container-high">
              <div className="flex items-center justify-between pb-space-xs">
                <div className="flex items-center gap-space-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">Selected Table • Live Check</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded">Ticket #8921</span>
              </div>
              <div className="flex items-start justify-between pt-1">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">T1 - Booth</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-[15px] text-primary">groups</span> 4 Guests • Server:{" "}
                    <strong className="text-on-surface font-medium">Andrea R.</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-label-md text-label-md text-on-surface font-bold block">0:42:15</span>
                  <span className="font-label-sm text-label-sm text-tertiary">Entrees Fired</span>
                </div>
              </div>
              {/* Course Progress Bar Banner */}
              <div className="mt-space-sm bg-surface-container-lowest p-space-sm rounded-lg">
                <div className="flex items-center justify-between text-on-surface font-label-sm text-label-sm pb-1">
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <span className="material-symbols-outlined text-[14px]">skillet</span> Course 2: Entrees In Progress
                  </span>
                  <span className="text-on-surface-variant">22 min elapsed</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full w-3/4"></div>
                </div>
              </div>
            </div>
            {/* Quick Itemized Summary Order List */}
            <div className="p-space-md flex-1 overflow-y-auto space-y-space-sm">
              <div className="flex items-center justify-between pb-1">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Current Bill Details</span>
                <button className="text-primary font-label-sm text-label-sm hover:underline flex items-center gap-0.5" type="button">
                  <span className="material-symbols-outlined text-[14px]">edit</span> Edit Modifiers
                </button>
              </div>
              {/* Order Line Items */}
              <div className="space-y-space-xs">
                <BillItem qty={1} name="Crispy Pata (Whole)" mods="Extra Crispy • Soy-Vinegar Dip" price="₱895.00" />
                <BillItem qty={1} name="Kare-Kare" mods="Oxtail & Tripe • Bagoong on the Side" price="₱650.00" />
                <BillItem qty={2} name="Calamansi Juice (Pitcher)" mods="Fresh-Squeezed • Less Sugar" price="₱240.00" />
                <BillItem qty={1} name="Garlic Rice Platter" mods="Extra Toasted Garlic" price="₱180.00" />
              </div>
            </div>
            {/* Financial Breakdown & Quick Calculations */}
            <div className="p-space-md bg-surface-container-lowest/80 space-y-space-xs">
              <div className="flex justify-between text-on-surface-variant font-label-sm text-label-sm">
                <span>VATable Sales</span>
                <span className="text-on-surface font-medium font-label-md text-label-md">₱1,754.46</span>
              </div>
              <div className="flex justify-between text-on-surface-variant font-label-sm text-label-sm">
                <span>VAT 12% (Inclusive)</span>
                <span className="text-on-surface font-medium font-label-md text-label-md">₱210.54</span>
              </div>
              <div className="pt-space-xs flex justify-between items-baseline">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Total Balance</span>
                <span className="font-display-lg text-display-lg text-primary font-bold tracking-tight">₱1,965.00</span>
              </div>
            </div>
            {/* Tactical Fast-Touch POS Action Buttons */}
            <div className="p-space-md bg-surface-container-high flex flex-col gap-space-sm">
              {/* Primary Blue Order Button */}
              <button
                className="w-full min-h-[56px] py-space-sm px-space-md rounded-xl bg-primary-container hover:bg-primary-container/90 active:scale-[0.98] text-on-primary-container font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-space-sm shadow-md transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[24px]">post_add</span>
                <span>Open Order / Add Items</span>
              </button>
              {/* Grid of High-Frequency Fast Touch Actions */}
              <div className="grid grid-cols-3 gap-space-xs">
                <button
                  className="min-h-[48px] py-2 px-space-xs rounded-lg bg-surface-container hover:bg-surface-container-highest active:scale-[0.98] text-on-surface font-label-sm text-label-sm font-semibold flex flex-col items-center justify-center gap-1 transition-all"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  <span>Print Bill</span>
                </button>
                <button
                  className="min-h-[48px] py-2 px-space-xs rounded-lg bg-surface-container hover:bg-surface-container-highest active:scale-[0.98] text-on-surface font-label-sm text-label-sm font-semibold flex flex-col items-center justify-center gap-1 transition-all"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                  <span>Transfer Table</span>
                </button>
                <button
                  className="min-h-[48px] py-2 px-space-xs rounded-lg bg-secondary-container hover:bg-secondary-container/90 active:scale-[0.98] text-on-secondary-container font-label-sm text-label-sm font-bold flex flex-col items-center justify-center gap-1 transition-all shadow-sm"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">call_split</span>
                  <span>Split / Pay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BillItem({ qty, name, mods, price }: { qty: number; name: string; mods: string; price: string }) {
  return (
    <div className="p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors">
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex items-start gap-space-xs">
          <span className="w-5 h-5 rounded bg-surface-container flex items-center justify-center font-label-sm text-label-sm text-on-surface font-bold">{qty}</span>
          <div>
            <span className="font-body-md text-body-md text-on-surface font-medium block leading-tight">{name}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
              <span className="text-secondary">•</span> {mods}
            </span>
          </div>
        </div>
        <span className="font-label-md text-label-md text-on-surface font-semibold">{price}</span>
      </div>
    </div>
  );
}
