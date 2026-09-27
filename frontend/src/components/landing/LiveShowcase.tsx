/* eslint-disable @next/next/no-img-element */

// Hero product collage: guest phone, acrylic table standee and a KDS ticket. Purely illustrative,
// so the "buttons" are styled spans rather than controls that do nothing.

const GUEST_ITEMS = [
  {
    name: "Dry-Aged Wagyu Coulotte",
    price: "$48",
    note: "Charred cipollini, marrow jus",
    tag: "Med-Rare",
    tagClass: "bg-primary-container/20 text-primary",
    meta: "Course 2",
    metaClass: "text-tertiary",
    alt: "Sliced dry-aged wagyu steak on a black slate platter",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCZMOiMyCDH9CYWG2ZpUW6eAEJKTy_KVagKawP8Dg8esdAa2UCDwZfb0vKEQYFnP_YVu54DL17AUkWRfBtgdh5MWfSXDha42daGCgVHDSjTa2MVl-b3logIZZLaFXlwVTgOVHGczuEf4NsdheREbKMm966IGIFeOYi54lDaCJ3Gygt90AYXs8vWMKS2ABo-jpBBqlwV6BhS5fceliDDQbFe5f4GR5qnOtJIPOBYSpo87AWdt2oGYGI",
  },
  {
    name: "Pugliese Burrata",
    price: "$22",
    note: "Heirloom tomatoes, smoked oil",
    tag: "Starter",
    tagClass: "bg-surface-variant text-on-surface-variant",
    meta: "Fired 3m ago",
    metaClass: "text-secondary",
    alt: "Burrata with roasted heirloom tomatoes and basil oil in a charcoal bowl",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDgRHACP9G8YWRNC1qXQ8Ch1X5YW7_QjdaOi2k7-PfezLSt88EhUp8YQr3WrBse7cNlCUPL7Jquh4y0Adw9BZm3BgtckujAyJJqGv4EHm8YLv2rDdABFb2cW2koV_tj_NDaEys9CD9pqlxpKfrdbOcPu1kib8OuOAQDrwARCpqfDKOVPkqd_qRRSqfNUCACLn7GHYyliSgElDvWpmOfCk00i5PcVc5PdVFVChg51stn6bZK0eu5NOg",
  },
];

// 4×4 stand-in for a QR code: 1 = ink, 2 = brand accent, 0 = blank
const QR_CELLS = [1, 1, 2, 1, 1, 0, 1, 2, 2, 1, 1, 0, 1, 0, 1, 1];
const QR_CLASS = ["bg-transparent", "bg-on-surface", "bg-primary-container"];

export default function LiveShowcase() {
  return (
    <div className="mt-16 relative scroll-mt-24" id="livedemo">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 hidden sm:flex items-center gap-2 whitespace-nowrap bg-surface-container-lowest px-4 py-1.5 rounded-full border border-primary-container/40 shadow-xl">
        <span className="w-2.5 h-2.5 rounded-full bg-tertiary motion-safe:amber-pulse" />
        <span className="font-body-sm text-body-sm font-semibold text-on-surface">
          Live Line Fire: <span className="text-tertiary">12ms latency</span> to sauté &amp; grill
        </span>
        <span className="text-outline-variant">|</span>
        <span className="font-mono text-body-sm text-secondary">TABLE #14 ACTIVE</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Guest phone */}
        <div className="lg:col-span-4 bg-surface-container-low rounded-xl p-5 border border-outline-variant/25 kds-card-border flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" aria-hidden>
                smartphone
              </span>
              <span className="font-label-md text-label-md text-on-surface">Guest Phone • Table 14</span>
            </div>
            <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-tertiary/10 text-tertiary border border-tertiary/30">WiFi Synced</span>
          </div>
          <div className="my-4 space-y-3">
            {GUEST_ITEMS.map((item) => (
              <div key={item.name} className="bg-surface-container rounded-lg p-3 flex gap-3 border border-outline-variant/20">
                <div className="w-16 h-16 rounded-md bg-surface-container-high overflow-hidden shrink-0">
                  <img className="w-full h-full object-cover" alt={item.alt} src={item.src} loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-body-md text-body-md font-bold text-on-surface">{item.name}</h4>
                    <span className="font-mono text-label-md text-primary">{item.price}</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{item.note}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`font-label-sm text-label-sm px-1.5 py-0.5 rounded ${item.tagClass}`}>{item.tag}</span>
                    <span className={`font-label-sm text-label-sm ${item.metaClass}`}>{item.meta}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-outline-variant/20">
            <span className="w-full py-3 rounded-lg bg-on-surface text-surface-container-lowest font-label-lg text-label-lg font-bold flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                credit_card
              </span>
              Pay Tab with Apple Pay ($70.00)
            </span>
          </div>
        </div>

        {/* Acrylic table standee */}
        <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/30 flex flex-col items-center justify-between text-center relative overflow-hidden hearth-glow">
          <div className="w-full flex justify-between items-center font-label-sm text-label-sm text-on-surface-variant">
            <span>ACRYLIC STANDEE</span>
            <span className="text-secondary font-mono">PATIO-14</span>
          </div>
          <div className="my-4 w-48 p-4 rounded-xl bg-surface-container border-2 border-outline-variant/40 shadow-2xl">
            <div className="w-full flex justify-center mb-3">
              <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]" aria-hidden>
                  qr_code_2
                </span>
              </div>
            </div>
            <div className="w-32 h-32 mx-auto bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/40" aria-hidden>
              <div className="grid grid-cols-4 gap-1 w-full h-full p-1 bg-surface-dim rounded">
                {QR_CELLS.map((cell, i) => (
                  <div key={i} className={`${QR_CLASS[cell]} rounded-sm`} />
                ))}
              </div>
            </div>
            <div className="mt-3">
              <p className="font-label-md text-label-md text-on-surface font-bold">TABLE 14</p>
              <p className="text-[10px] text-on-surface-variant font-mono">Scan for Menu, Orders &amp; Bill</p>
              <div className="mt-1.5 flex items-center justify-center gap-1 text-[9px] text-secondary">
                <span className="material-symbols-outlined text-[10px]" aria-hidden>
                  wifi
                </span>
                <span>Guest-WiFi: Hearth_Guest</span>
              </div>
            </div>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">300 DPI UV cured print on matte scratch-proof acrylic. No app download needed.</p>
        </div>

        {/* Kitchen display ticket */}
        <div className="lg:col-span-5 bg-surface-container rounded-xl p-5 border border-primary-container/40 kds-card-border flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono text-label-sm font-bold bg-primary-container text-on-primary-container">T-14</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Order #204</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Patio • 4 Covers</span>
              </div>
              <div className="flex items-center gap-1.5 bg-error-container/30 border border-error/30 px-2 py-0.5 rounded">
                <span className="material-symbols-outlined text-error text-[16px]" aria-hidden>
                  timer
                </span>
                <span className="font-mono text-label-sm text-error">03:42</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 my-3">
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-label-sm text-label-sm border border-outline-variant/30">Station: GRILL / SAUTÉ</span>
              <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]" aria-hidden>
                  warning
                </span>
                ALLERGY: GLUTEN (SEAT 2)
              </span>
            </div>
            <div className="space-y-2.5 my-3">
              <div className="p-2.5 rounded bg-surface-container-low border-l-4 border-primary">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-body-md text-body-md font-bold text-on-surface">1x Dry-Aged Wagyu Coulotte</span>
                  <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-variant text-on-surface">Seat 1</span>
                </div>
                <p className="font-body-sm text-body-sm text-secondary pl-2 mt-0.5">
                  • Temp: Medium-Rare
                  <br />• Sub: Charred Leeks instead of Cipollini
                </p>
              </div>
              <div className="p-2.5 rounded bg-surface-container-low border-l-4 border-tertiary">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-body-md text-body-md font-bold text-on-surface">1x Pugliese Burrata</span>
                  <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-variant text-on-surface">Seat 2</span>
                </div>
                <p className="font-body-sm text-body-sm text-error pl-2 mt-0.5 font-semibold">• GLUTEN-FREE CROSTINI ONLY</p>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-outline-variant/30 flex items-center gap-3">
            <span className="flex-1 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface font-label-md text-label-md flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                call_split
              </span>
              Hold Course 2
            </span>
            <span className="flex-1 py-2.5 rounded-lg bg-tertiary-container text-on-tertiary-container font-label-md text-label-md font-bold flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                check_circle
              </span>
              BUMP TICKET
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
