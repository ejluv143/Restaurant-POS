"use client";

import { useState } from "react";

// Micro-interaction logic for NumPad cash calculations (mirrors the design's script)
const GUEST_TOTAL_DUE = 932.14;

// Seat 1 base ₱1,305.00 (VAT-inclusive). Senior/PWD: VAT removed (₱139.82) then 20% off ₱1,165.18 (₱233.04).
const DISCOUNT_PRESETS = [
  { label: "PWD 20%", amount: "−₱372.86" },
  { label: "Promo 10%", amount: "−₱130.50" },
  { label: "Employee 15%", amount: "−₱195.75" },
];

const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0"];

const PAD_BUTTON =
  "h-11 bg-surface-container-high hover:bg-surface-container-highest active:scale-95 text-on-surface rounded-lg font-label-md text-label-md font-bold transition-all select-none";
const CASH_BUTTON =
  "py-1.5 bg-surface-container-high hover:bg-surface-container-highest active:scale-95 text-on-surface rounded font-label-sm text-label-sm font-semibold transition-all select-none";

export default function CheckoutPage() {
  const [currentTender, setCurrentTender] = useState("1000.00");

  const diff = (parseFloat(currentTender) || 0) - GUEST_TOTAL_DUE;

  const setCash = (amount: number) => setCurrentTender(amount.toFixed(2));

  const pressPad = (val: string) =>
    setCurrentTender((cur) => {
      if (val === "C") return "0.00";
      if (cur === "0.00" || cur === "1000.00") return val;
      return cur.length < 7 ? cur + val : cur;
    });

  return (
    <div className="flex flex-col w-full">
      {/* Table Metadata Top Ticker */}
      <div className="w-full bg-surface-container-low px-space-lg py-space-sm shadow-sm flex flex-wrap items-center justify-between gap-space-md select-none">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs bg-surface-container px-space-md py-1 rounded-full shadow-sm">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse"></span>
            <span className="font-label-sm text-label-sm text-tertiary">TABLE 12</span>
          </div>
          <div className="flex items-center gap-space-xs text-on-surface">
            <span className="font-headline-sm text-headline-sm tracking-tight">Main Dining Room</span>
            <span className="text-on-surface-variant font-label-md text-label-md">/</span>
            <span className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">badge</span> Andrea R.
            </span>
            <span className="text-on-surface-variant font-label-md text-label-md">/</span>
            <span className="font-label-md text-label-md text-on-surface-variant">Covers: 3 Guests</span>
          </div>
        </div>
        {/* Live Bill Aggregates Ticker */}
        <div className="flex items-center gap-space-lg">
          <div className="flex items-center gap-space-md bg-surface-container-lowest px-space-md py-1 rounded-xl shadow-inner">
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Paid Balance</span>
              <span className="font-label-md text-label-md text-secondary font-semibold tabular-nums">₱750.00</span>
            </div>
            <div className="w-px h-6 bg-surface-container-highest"></div>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-error uppercase">Balance Due</span>
              <span className="font-label-md text-label-md text-on-surface tabular-nums font-bold">₱1,905.00</span>
            </div>
            <div className="w-px h-6 bg-surface-container-highest"></div>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Check Total</span>
              <span className="font-label-lg text-label-lg text-primary tabular-nums font-bold tracking-tight">₱2,655.00</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              className="h-10 px-space-md bg-surface-container hover:bg-surface-container-high active:scale-95 text-on-surface rounded-lg font-label-sm text-label-sm flex items-center gap-1 transition-all shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span> Itemize
            </button>
            <button
              className="h-10 px-space-md bg-surface-container hover:bg-surface-container-high active:scale-95 text-on-surface rounded-lg font-label-sm text-label-sm flex items-center gap-1 transition-all shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
          </div>
        </div>
      </div>

      {/* Workbench Grid */}
      <div className="w-full p-space-md flex flex-col gap-space-md">
        {/* Split Strategy Control Ribbon */}
        <div className="w-full bg-surface-container p-space-xs rounded-xl flex items-center justify-between gap-space-sm flex-wrap shadow-md">
          <div className="flex items-center gap-space-xs flex-wrap">
            <button
              className="px-space-lg py-space-sm rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md flex items-center gap-space-xs shadow-sm select-none"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">person_pin_circle</span>
              Split by Seat (3 Guests)
            </button>
            <button
              className="px-space-lg py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md flex items-center gap-space-xs transition-all select-none"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">call_split</span>
              Split Evenly
              <span className="bg-surface-container-lowest px-1.5 py-0.5 rounded text-primary text-label-sm font-label-sm">÷3</span>
            </button>
            <button
              className="px-space-lg py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md flex items-center gap-space-xs transition-all select-none"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">calculate</span>
              Custom Amount
            </button>
            <button
              className="px-space-lg py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md flex items-center gap-space-xs transition-all select-none"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">credit_card</span>
              Single Full Payment
            </button>
          </div>
          <div className="flex items-center gap-space-xs pr-space-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-secondary">pie_chart</span>
              Split Allocation:
            </span>
            <div className="w-32 h-2.5 bg-surface-container-lowest rounded-full overflow-hidden flex">
              <div className="h-full bg-secondary" style={{ width: "28.2%" }}></div>
              <div className="h-full bg-primary" style={{ width: "49.2%" }}></div>
              <div className="h-full bg-tertiary" style={{ width: "22.6%" }}></div>
            </div>
            <span className="font-label-sm text-label-sm text-secondary tabular-nums ml-1 font-semibold">1 / 3 Paid</span>
          </div>
        </div>

        {/* 3-Column Ergonomic Touch Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
          {/* COLUMN 1: Guest Split Checks (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-space-md">
            {/* Header / Mini status */}
            <div className="flex items-center justify-between px-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">groups</span>
                Sub-Checks by Seat
              </span>
              <button className="text-primary font-label-sm text-label-sm hover:underline flex items-center gap-1" type="button">
                <span className="material-symbols-outlined text-[14px]">shuffle</span> Reassign Items
              </button>
            </div>

            {/* Guest 1 Card: ACTIVE SELECTION TARGET */}
            <div className="relative bg-surface-container rounded-xl p-space-md shadow-xl overflow-hidden transition-all">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
              <div className="flex items-center justify-between mb-space-sm pl-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container font-label-md text-label-md flex items-center justify-center font-bold">
                    G1
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface leading-tight">Guest 1 • Seat A</span>
                    <span className="font-label-sm text-label-sm text-primary font-medium flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span> Active Target
                    </span>
                  </div>
                </div>
                <span className="bg-primary/15 text-primary px-space-sm py-0.5 rounded-full font-label-sm text-label-sm font-semibold">PENDING</span>
              </div>
              {/* Items Breakdown */}
              <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-1.5 pl-space-sm mb-space-sm">
                <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface">
                  <span className="truncate pr-2">1x Crispy Pata (Whole)</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">₱955.00</span>
                </div>
                <div className="text-[11px] font-body-sm text-on-surface-variant pl-space-sm flex items-center gap-1">
                  <span className="text-tertiary">•</span> Extra Crispy, Add Garlic Rice
                </div>
                <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface">
                  <span className="truncate pr-2">1x Calamansi Juice Pitcher</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">₱240.00</span>
                </div>
                <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface">
                  <span className="truncate pr-2 flex items-center gap-1">
                    <span className="bg-surface-container-highest text-tertiary px-1 rounded text-[10px]">SHARE</span>
                    Crispy Calamares (1/3 Split)
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">₱110.00</span>
                </div>
              </div>
              {/* Financial Subtotals */}
              <div className="flex items-center justify-between px-space-xs font-label-sm text-label-sm text-on-surface-variant pt-space-xs mb-1">
                <span>Subtotal ₱1,305.00 • VAT 12% incl. ₱139.82</span>
                <span className="text-on-surface">Guest Due</span>
              </div>
              <div className="flex items-baseline justify-between px-space-xs">
                <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-semibold">Balance Due</span>
                <span className="font-display-lg text-[32px] text-primary font-bold tabular-nums leading-none tracking-tight">₱1,305.00</span>
              </div>
            </div>

            {/* Guest 2 Card: ALREADY PAID */}
            <div className="relative bg-surface-container-low rounded-xl p-space-md shadow-sm opacity-90 overflow-hidden">
              <div className="absolute -right-6 -top-4 w-32 h-16 bg-secondary/10 rotate-12 flex items-center justify-center pointer-events-none">
                <span className="text-secondary font-label-md text-label-md font-bold tracking-widest uppercase">PAID</span>
              </div>
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md flex items-center justify-center font-bold">
                    G2
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface leading-tight">Guest 2 • Seat B</span>
                    <span className="font-label-sm text-label-sm text-secondary font-medium">GCash •••• 4291 Approved</span>
                  </div>
                </div>
                <span className="bg-secondary/15 text-secondary px-space-sm py-0.5 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span> PAID
                </span>
              </div>
              {/* Items Breakdown Compressed */}
              <div className="bg-surface-container rounded-lg p-space-sm flex flex-col gap-1 text-on-surface-variant text-body-sm font-body-sm mb-space-sm">
                <PriceRow name="Sinigang na Hipon" price="₱520.00" />
                <PriceRow name="Buko Juice (Fresh)" price="₱120.00" />
                <PriceRow name="Crispy Calamares (1/3)" price="₱110.00" />
              </div>
              {/* Payment Summary Row */}
              <div className="flex items-center justify-between px-space-xs font-label-sm text-label-sm">
                <span className="text-on-surface-variant">Paid via GCash • VAT incl. ₱80.36</span>
                <span className="font-label-lg text-label-lg text-secondary font-bold tabular-nums">Settled: ₱750.00</span>
              </div>
              <div className="flex justify-end gap-space-xs mt-space-sm pt-space-xs">
                <button
                  className="px-space-sm py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded text-label-sm font-label-sm flex items-center gap-1 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">print</span> Repr. Slip
                </button>
                <button
                  className="px-space-sm py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded text-label-sm font-label-sm flex items-center gap-1 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">undo</span> Refund / Void
                </button>
              </div>
            </div>

            {/* Guest 3 Card: PENDING */}
            <div className="relative bg-surface-container rounded-xl p-space-md shadow-md opacity-85 hover:opacity-100 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface font-label-md text-label-md flex items-center justify-center font-bold">
                    G3
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface leading-tight">Guest 3 • Seat C</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Tap to switch active tender</span>
                  </div>
                </div>
                <span className="bg-surface-container-highest text-on-surface-variant px-space-sm py-0.5 rounded-full font-label-sm text-label-sm font-semibold">UNPAID</span>
              </div>
              <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-1 text-on-surface-variant text-body-sm font-body-sm mb-space-sm">
                <PriceRow name="Pancit Canton Guisado" price="₱380.00" truncate />
                <PriceRow name="San Miguel Pale Pilsen" price="₱110.00" truncate />
                <PriceRow name="Crispy Calamares (1/3)" price="₱110.00" truncate />
              </div>
              <div className="flex items-baseline justify-between px-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Subtotal ₱600.00 • VAT 12% incl. ₱64.29</span>
                <span className="font-label-lg text-label-lg text-on-surface font-bold tabular-nums">₱600.00</span>
              </div>
            </div>
          </div>

          {/* COLUMN 2: Active Payment Terminal Action Console (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            {/* Interactive Tender Display Card */}
            <div className="bg-surface-container rounded-xl p-space-lg shadow-xl relative overflow-hidden">
              {/* Header for active target */}
              <div className="flex items-center justify-between mb-space-md pb-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="p-2 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
                  </span>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-surface">Tendering Seat #1 • Guest 1</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Select payment method &amp; discount</span>
                  </div>
                </div>
                <button className="text-tertiary hover:bg-surface-container-high px-space-sm py-1 rounded font-label-sm text-label-sm flex items-center gap-1 transition-colors" type="button">
                  <span className="material-symbols-outlined text-[16px]">percent</span> Promo / Comp
                </button>
              </div>
              {/* Total Calculation Hero Area */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-inner mb-space-md">
                <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm mb-1">
                  <span>BASE DUE FOR SEAT 1</span>
                  <span className="tabular-nums">₱1,305.00</span>
                </div>
                <div className="flex justify-between items-center text-secondary font-label-sm text-label-sm mb-1">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">receipt_long</span> LESS 12% VAT EXEMPTION
                  </span>
                  <span className="tabular-nums font-bold">−₱139.82</span>
                </div>
                <div className="flex justify-between items-center text-secondary font-label-sm text-label-sm mb-2">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">elderly</span> LESS SENIOR CITIZEN DISCOUNT (20%)
                  </span>
                  <span className="tabular-nums font-bold">−₱233.04</span>
                </div>
                <div className="h-px bg-surface-container-highest my-space-xs"></div>
                <div className="flex justify-between items-baseline pt-1">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Total to Authorize</span>
                    <span className="font-label-sm text-label-sm text-tertiary">VAT-exempt sale • OSCA ID #12-4491</span>
                  </div>
                  <div className="text-right">
                    <span className="font-display-lg text-display-lg text-on-surface font-extrabold tracking-tight tabular-nums text-primary">₱932.14</span>
                  </div>
                </div>
              </div>
              {/* Quick Discount Grid */}
              <div className="mb-space-md">
                <div className="flex items-center justify-between mb-space-xs">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Discount Presets</label>
                  <span className="font-label-sm text-label-sm text-secondary">OSCA / PWD ID required</span>
                </div>
                <div className="grid grid-cols-3 gap-space-xs">
                  <PresetButton {...DISCOUNT_PRESETS[0]} />
                  <button
                    className="py-space-sm px-1 bg-primary-container text-on-primary-container rounded-lg flex flex-col items-center justify-center shadow-md select-none scale-[1.02] ring-2 ring-primary"
                    type="button"
                  >
                    <span className="font-label-md text-label-md font-bold flex items-center gap-1">
                      Senior 20% <span className="material-symbols-outlined text-[14px] text-tertiary-fixed">star</span>
                    </span>
                    <span className="font-label-sm text-label-sm text-on-primary-container font-semibold tabular-nums">−₱372.86</span>
                  </button>
                  <PresetButton {...DISCOUNT_PRESETS[1]} />
                  <PresetButton {...DISCOUNT_PRESETS[2]} />
                  <button
                    className="py-space-sm px-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg flex flex-col items-center justify-center transition-all select-none"
                    type="button"
                  >
                    <span className="font-label-md text-label-md font-bold">Custom Discount</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Amount / %</span>
                  </button>
                  <button
                    className="py-space-sm px-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg flex flex-col items-center justify-center transition-all select-none"
                    type="button"
                  >
                    <span className="font-label-md text-label-md font-bold">No Discount</span>
                    <span className="font-label-sm text-label-sm text-outline tabular-nums">₱0.00</span>
                  </button>
                </div>
              </div>
              {/* Payment Tender Method Tiles */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Select Payment Channel</label>
                <div className="grid grid-cols-2 gap-space-xs">
                  {/* Primary Card Terminal Trigger */}
                  <button
                    className="col-span-2 min-h-[56px] px-space-md py-space-sm bg-primary-container hover:bg-primary-container/90 active:scale-[0.98] text-on-primary-container rounded-xl flex items-center justify-between shadow-lg transition-all select-none"
                    type="button"
                  >
                    <div className="flex items-center gap-space-md">
                      <div className="w-10 h-10 rounded-lg bg-surface/30 flex items-center justify-center text-on-primary-container">
                        <span className="material-symbols-outlined text-[24px]">qr_code_2</span>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-headline-sm text-headline-sm font-bold">GCash / QR Ph</span>
                        <span className="font-label-sm text-label-sm text-on-primary-container/80">Scan QR • InstaPay • Instant Confirm</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-label-md text-label-md font-bold tabular-nums">
                      Send ₱932.14 <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </div>
                  </button>
                  <ChannelButton icon="payments" tone="text-secondary" title="Cash / Drawer" sub="Exact or Change" />
                  <ChannelButton icon="account_balance_wallet" tone="text-secondary" title="Maya" sub="QR • Tap to Pay" />
                  <ChannelButton icon="account_balance" tone="text-primary" title="House Account" sub="Hotel • Member" />
                  <ChannelButton icon="credit_card" tone="text-on-surface" title="Credit / Debit Card" sub="EMV Tap • Chip • Swipe" />
                </div>
              </div>
            </div>

            {/* Split Progress Visualization */}
            <div className="bg-surface-container p-space-md rounded-xl shadow-sm flex flex-col gap-space-sm">
              <div className="flex items-center justify-between text-label-sm font-label-sm">
                <span className="text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                  Payment Session Completeness
                </span>
                <span className="text-on-surface font-bold tabular-nums">1 of 3 Checks Settled</span>
              </div>
              <div className="w-full h-3 bg-surface-container-lowest rounded-full overflow-hidden flex">
                <div className="h-full bg-secondary transition-all" style={{ width: "33.3%" }} title="Seat 2: Settled"></div>
                <div className="h-full bg-primary animate-pulse transition-all" style={{ width: "33.3%" }} title="Seat 1: Ready to charge"></div>
                <div className="h-full bg-surface-container-highest transition-all" style={{ width: "33.4%" }} title="Seat 3: Waiting"></div>
              </div>
              <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant pt-0.5">
                <span className="text-secondary font-medium">• Seat 2 (₱750.00) Paid</span>
                <span className="text-primary font-medium">• Seat 1 (₱932.14 w/ Senior disc.) Tendering</span>
                <span className="text-on-surface-variant">• Seat 3 (₱600.00) Queued</span>
              </div>
            </div>
          </div>

          {/* COLUMN 3: Hardware Terminal Status, Cash Tender & Final Actions (3 Cols) */}
          <div className="lg:col-span-3 flex flex-col gap-space-md">
            {/* Live Integrated Hardware Hub Status */}
            <div className="bg-surface-container rounded-xl p-space-md shadow-md flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Hardware Hub</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-label-sm text-label-sm font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span> ONLINE
                </span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center gap-space-sm mt-1">
                <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[24px]">terminal</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md font-bold text-on-surface truncate">Verifone P400 (T#02)</span>
                  <span className="font-label-sm text-label-sm text-secondary truncate">Prompting Guest: Scan QR / Tap</span>
                </div>
              </div>
              <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant px-1 pt-1">
                <span>Customer Facing Screen:</span>
                <span className="text-on-surface font-medium">Mirroring Table 12</span>
              </div>
              <div className="flex gap-space-xs pt-1">
                <button
                  className="flex-1 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded text-label-sm font-label-sm flex items-center justify-center gap-1 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span> Ping PinPad
                </button>
                <button
                  className="flex-1 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded text-label-sm font-label-sm flex items-center justify-center gap-1 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">cancel</span> Cancel Tx
                </button>
              </div>
            </div>

            {/* Quick Cash Keypad & Quick Presets */}
            <div className="bg-surface-container rounded-xl p-space-md shadow-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Cash Calculation</span>
                <span className="font-label-sm text-label-sm text-tertiary">Drawer #01</span>
              </div>
              {/* Tender Input Display */}
              <div className="bg-surface-container-lowest p-space-sm rounded-lg flex items-center justify-between shadow-inner">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">Tendered:</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-primary font-label-sm text-label-sm">₱</span>
                  <span className="font-label-lg text-label-lg font-bold text-on-surface tabular-nums" id="calc-tender-display">
                    {currentTender}
                  </span>
                </div>
              </div>
              {/* Quick Cash Bills Bar */}
              <div className="grid grid-cols-4 gap-1">
                <button className={CASH_BUTTON} onClick={() => setCash(932.14)} type="button">
                  Exact
                </button>
                <button className={CASH_BUTTON} onClick={() => setCash(950.0)} type="button">
                  ₱950
                </button>
                <button
                  className="py-1.5 bg-primary-container active:scale-95 text-on-primary-container rounded font-label-sm text-label-sm font-semibold transition-all select-none"
                  onClick={() => setCash(1000.0)}
                  type="button"
                >
                  ₱1,000
                </button>
                <button className={CASH_BUTTON} onClick={() => setCash(1500.0)} type="button">
                  ₱1,500
                </button>
              </div>
              {/* Projected Change */}
              <div className="bg-surface-container-low px-space-sm py-1.5 rounded flex items-center justify-between font-label-sm text-label-sm">
                <span className="text-secondary font-medium">Change to Return:</span>
                <span className={`font-label-md text-label-md ${diff >= 0 ? "text-secondary" : "text-error"} font-bold tabular-nums`} id="calc-change-display">
                  {diff >= 0 ? `₱${diff.toFixed(2)}` : `-₱${Math.abs(diff).toFixed(2)} (Short)`}
                </span>
              </div>
              {/* Tactile NumPad for fast custom tender */}
              <div className="grid grid-cols-3 gap-1 pt-1">
                {PAD_KEYS.map((k) => (
                  <button key={k} className={PAD_BUTTON} onClick={() => pressPad(k)} type="button">
                    {k}
                  </button>
                ))}
                <button
                  className="h-11 bg-error-container hover:bg-error-container/80 active:scale-95 text-on-error-container rounded-lg font-label-md text-label-md font-bold transition-all select-none flex items-center justify-center"
                  onClick={() => pressPad("C")}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">backspace</span>
                </button>
              </div>
              <button
                className="w-full mt-1 min-h-[44px] bg-secondary-container hover:bg-secondary-container/90 active:scale-[0.98] text-on-secondary-container font-label-md text-label-md font-bold rounded-lg flex items-center justify-center gap-1 shadow transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">lock_open</span> Open Drawer &amp; Tender Cash
              </button>
            </div>

            {/* Post-Payment & Close Table Ribbon */}
            <div className="bg-surface-container rounded-xl p-space-md shadow-md flex flex-col gap-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Post Payment Receipt</span>
              <div className="grid grid-cols-3 gap-1">
                <ReceiptButton icon="print" tone="text-primary" label="Print Slip" />
                <ReceiptButton icon="sms" tone="text-secondary" label="SMS" />
                <ReceiptButton icon="mail" tone="text-tertiary" label="Email" />
              </div>
              <div className="h-px bg-surface-container-highest my-0.5"></div>
              {/* Final table close trigger */}
              <button
                className="w-full min-h-[50px] bg-surface-container-highest hover:bg-surface-bright active:scale-[0.98] text-on-surface-variant hover:text-on-surface font-label-md text-label-md rounded-xl flex items-center justify-between px-space-md transition-all"
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-tertiary">table_restaurant</span>
                  <span className="font-semibold">Close Table 12 &amp; Free Floor</span>
                </div>
                <span className="text-[11px] font-label-sm uppercase bg-surface-container-lowest px-2 py-0.5 rounded text-outline">Requires 3/3 Paid</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceRow({ name, price, truncate }: { name: string; price: string; truncate?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={truncate ? "truncate" : undefined}>{name}</span>
      <span className="font-label-sm text-label-sm tabular-nums">{price}</span>
    </div>
  );
}

function PresetButton({ label, amount }: { label: string; amount: string }) {
  return (
    <button
      className="py-space-sm px-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg flex flex-col items-center justify-center transition-all select-none"
      type="button"
    >
      <span className="font-label-md text-label-md font-bold">{label}</span>
      <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">{amount}</span>
    </button>
  );
}

function ChannelButton({ icon, tone, title, sub }: { icon: string; tone: string; title: string; sub: string }) {
  return (
    <button
      className="min-h-[56px] p-space-sm bg-surface-container-high hover:bg-surface-container-highest active:scale-[0.98] text-on-surface rounded-xl flex items-center gap-space-sm transition-all select-none"
      type="button"
    >
      <div className={`w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center ${tone} shrink-0`}>
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div className="flex flex-col text-left min-w-0">
        <span className="font-label-md text-label-md font-bold truncate">{title}</span>
        <span className="font-label-sm text-label-sm text-on-surface-variant truncate">{sub}</span>
      </div>
    </button>
  );
}

function ReceiptButton({ icon, tone, label }: { icon: string; tone: string; label: string }) {
  return (
    <button
      className="py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg flex flex-col items-center justify-center transition-colors text-label-sm font-label-sm"
      type="button"
    >
      <span className={`material-symbols-outlined text-[18px] ${tone} mb-0.5`}>{icon}</span> {label}
    </button>
  );
}
