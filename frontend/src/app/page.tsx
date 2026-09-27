/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import LiveShowcase from "@/components/landing/LiveShowcase";
import { inter } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Sync Hub Resto — The Heart of the Kitchen. The Pace of the Floor.",
  description: "QR table ordering, kitchen display and floor management for restaurants: every table becomes an ordering lounge that fires tickets straight to the line.",
};

// The GitHub Pages build is only this marketing page (no server to sign in to), so "Sign In" becomes "Book a Demo" there
const PAGES_DEMO = process.env.GITHUB_PAGES === "1";
const SIGN_IN = PAGES_DEMO ? { href: "/#book-demo", label: "Book a Demo" } : { href: "/login", label: "Sign In" };

const NAV = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Live Demo", href: "#livedemo", accent: true },
  { label: "Pricing", href: "#pricing" },
];

const BRANDS = [
  { name: "Aura Hearth", icon: "local_fire_department", iconClass: "text-primary", className: "tracking-tighter" },
  { name: "Le Bistro Noir", className: "tracking-widest uppercase" },
  { name: "Ember & Oak", icon: "park", iconClass: "text-secondary", className: "tracking-tight" },
  { name: "Kumo Izakaya (雲)", className: "tracking-wide" },
  { name: "Brasserie Vingt-Deux", className: "italic" },
];

const METRICS = [
  { value: "+38%", label: "Faster Table Turns", note: "Dining time dropped from 68m to 42m avg.", valueClass: "text-primary", border: "border-primary-container" },
  { value: "+$4.20", label: "Average Check Lift", note: "High-res visuals & effortless round re-orders.", valueClass: "text-secondary", border: "border-secondary" },
  { value: "0", label: "Misfired Tickets", note: "Direct diner-to-line modifiers & allergy gates.", valueClass: "text-tertiary", border: "border-tertiary" },
  { value: "< 14s", label: "Instant 86 Propagation", note: "One click on KDS locks item on all guest menus.", valueClass: "text-on-surface", border: "border-outline" },
];

const PILLARS = [
  {
    icon: "qr_code_scanner",
    tone: "text-primary",
    title: "1. Dynamic Acrylic Standees & Print Engine",
    body: "Durable, heat-resistant, matte-finished QR blocks customized to your bistro's aesthetic. Guests never download an app; scanning opens an encrypted, zero-lag browser menu locked to that exact table coordinate.",
    points: ["Direct captive guest Wi-Fi handoff without passwords", "Anti-spoofing session rotation prevents remote pranking", "One-click SVG & PDF vector export for custom brass or wood engraving"],
    cta: "Standee specs & hardware materials",
  },
  {
    icon: "skillet",
    tone: "text-secondary",
    title: "2. Line-Cook Focused KDS Expeditor",
    body: "High-contrast, high-cadence touch rails that withstand steam and glare. Cook times recalculate dynamically so hot plates, sauté items, and grill fires arrive at the expediting pass simultaneously.",
    points: [
      "Station isolating: route grill chits to screen A, pantry/salads to screen B",
      "Allergen sirens: high-contrast inverted crimson flags prevent cross-contact",
      "Haptic bump bars & wireless kitchen foot pedal support",
    ],
    cta: "Explore KDS kitchen mount specs",
  },
  {
    icon: "payments",
    tone: "text-tertiary",
    title: "3. Frictionless Guest Split-Pay",
    body: "No more 15-minute waits for servers to drop the leather checkbook and juggle 6 credit cards. Guests split checks evenly, pay by item or seat, add tip, and settle via Apple Pay in 12 seconds.",
    points: ["Full support for custom percentage split or custom seat allocation", "Direct SMS & email itemized expense receipts for diners", "Immediate table status update from 'Dining' to 'Dirty/Bussing'"],
    cta: "See mobile payment flow",
  },
  {
    icon: "inventory_2",
    tone: "text-primary",
    title: "4. Live Floor Map & Instant 86 Control",
    body: "Ran out of the Ribeye special midway through service? Tap '86' on any kitchen tablet or captain phone. The item instantly grays out across every diner's phone in real-time. Zero awkward table re-trips.",
    points: ["Micro-meter portion countdowns for limited nightly specials", "Floor plan bird's eye view with table turn color-coding", "'Call Server' discreet button alerts captain wristwatches"],
    cta: "Review floor management features",
  },
];

const STEPS = [
  {
    title: "Guest Scans at Table",
    body: "No app download. Diners scan the tabletop QR, choose courses, input custom allergies, and order rounds at their own rhythm.",
    icon: "lock",
    foot: "Table 14 Session Encrypted",
    footClass: "text-secondary",
    badge: "bg-primary-container text-on-primary-container",
  },
  {
    title: "Instant Line Routing",
    body: "Orders bypass front-of-house bottlenecks and bifurcation logic instantly fires proteins to Grill and cocktails to the Bar station.",
    icon: "bolt",
    foot: "12ms WebSocket Push",
    footClass: "text-primary",
    badge: "bg-surface-container-high text-primary border border-primary/30",
  },
  {
    title: "Real-Time Diner Tracking",
    body: "Diners see a discreet status: 'Prepping', 'Grilling', and 'Headed to Table'. Eliminates anxiety and server check-ins.",
    icon: "sync",
    foot: "Live Kitchen Status",
    footClass: "text-tertiary",
    badge: "bg-surface-container-high text-secondary border border-secondary/30",
  },
  {
    title: "Split & Pay in Seconds",
    body: "Guests split the bill effortlessly, add gratuity, and pay instantly. The host stand gets a buzz for immediate table reset.",
    icon: "check_circle",
    foot: "Table Freed & Reset",
    footClass: "text-on-surface",
    badge: "bg-surface-container-high text-tertiary border border-tertiary/30",
  },
];

const TIERS = [
  {
    name: "Bistro & Bar",
    price: "$99",
    blurb: "Essential table QR ordering and single-screen pass expeditor for neighborhood restaurants.",
    features: ["Up to 15 Table QR standees", "1 Kitchen KDS Station screen", "Apple Pay / Google Pay Guest Splitting", "Standard 86 Out-of-Stock menu toggle"],
    cta: "Start Free Bistro Trial",
  },
  {
    name: "High-Volume Gastropub",
    price: "$199",
    blurb: "Multi-station routing, station micro-timers, allergen alarms, and live floor telemetry.",
    features: [
      "Unlimited Table QRs & Standees",
      "4 Multi-Station KDS Screens (Grill, Sauté, Bar, Expo)",
      "Automatic Course Pacing & Micro-Timers",
      "Live Floor Map & Waiter Wristwatch Paging",
      "2-Way Toast / Square / Clover Integration",
    ],
    cta: "Start 30-Day Kitchen Trial",
    featured: true,
  },
  {
    name: "Enterprise & Multi-Unit",
    price: "$389",
    blurb: "Bespoke floor plans, cross-property master 86 controls, dedicated culinary hardware SLAs.",
    features: [
      "Unlimited KDS Stations across multiple kitchens",
      "Custom ERP & inventory database hooks",
      "Dedicated on-site onboarding engineer & 24/7 hotline",
      "Custom branded acrylic or solid wood standee batch",
    ],
    cta: "Talk to Enterprise Sales",
  },
];

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden>
    {name}
  </span>
);

export default function LandingPage() {
  return (
    <div
      className={`theme-resto ${inter.variable} min-h-screen font-body-md text-body-md antialiased selection:bg-primary-container selection:text-on-primary-container`}
    >
      {/* Top navbar */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-space-md min-w-0">
            <Link href="/" className="flex items-center gap-2 group min-w-0">
              <span className="w-9 h-9 shrink-0 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shadow-md group-hover:scale-105 transition-transform">
                <Icon name="restaurant" className="text-headline-sm" />
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight truncate">Sync Hub Resto</span>
            </Link>
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container border border-outline-variant/30 text-secondary font-label-sm text-label-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary motion-safe:amber-pulse" />
              v2.4 Live Sync
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-space-lg" aria-label="Sections">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className={`font-label-lg text-label-lg transition-colors ${n.accent ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href={SIGN_IN.href}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-outline-variant/40 text-on-surface font-label-md text-label-md hover:bg-surface-container active:scale-[0.98] transition-all"
            >
              <Icon name="login" className="text-[16px]" />
              {SIGN_IN.label}
            </Link>
            <a
              href="#book-demo"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md font-semibold hover:brightness-105 active:scale-[0.98] transition-all shadow-sm"
            >
              Book Demo
              <Icon name="calendar_month" className="text-[16px]" />
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative pt-12 pb-24 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[520px] bg-linear-to-b from-primary-container/10 via-surface-container-lowest/0 to-transparent pointer-events-none blur-3xl" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant/40 shadow-inner">
                <span className="flex h-2 w-2 relative">
                  <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-on-surface-variant font-label-sm text-label-sm tracking-wider uppercase">Culinary Telemetry &amp; Tabletop Direct Routing</span>
              </div>
            </div>

            <div className="text-center max-w-4xl mx-auto mt-6">
              <h1 className="font-headline-lg text-headline-xl text-on-surface tracking-tight lg:text-[54px] lg:leading-[62px]">
                The Heart of the Kitchen.
                <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-fixed via-primary-container to-secondary">The Pace of the Floor.</span>
              </h1>
              <p className="mt-6 font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                Replace paper chits, clunky POS terminals, and communication delays. Sync Hub Resto turns every table into a scannable ordering lounge while firing line
                tickets directly to your kitchen cook stations in milliseconds.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="#book-demo"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-primary-container text-on-primary-container font-label-lg text-label-lg font-bold shadow-md hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <Icon name="restaurant_menu" />
                  Start 30-Day Free Kitchen Trial
                </a>
                <a
                  href="#livedemo"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface font-label-lg text-label-lg font-semibold hover:bg-surface-variant active:scale-[0.98] transition-all"
                >
                  <Icon name="live_tv" className="text-secondary" />
                  Explore Interactive KDS Demo
                </a>
              </div>

              <div className="mt-12 pt-8 border-t border-outline-variant/15 flex flex-col items-center gap-4">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Trusted by over 450+ craft bistros, high-volume taprooms, and fine dining hearths worldwide
                </p>
                <ul className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 md:gap-x-12 opacity-80">
                  {BRANDS.map((b) => (
                    <li key={b.name} className={`font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5 ${b.className}`}>
                      {b.icon && <Icon name={b.icon} className={`text-[20px] ${b.iconClass}`} />}
                      {b.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <LiveShowcase />
          </div>
        </section>

        {/* Impact metrics */}
        <section className="py-12 bg-surface-container-lowest border-y border-outline-variant/20" aria-label="Results">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {METRICS.map((m) => (
              <div key={m.label} className={`flex flex-col border-l-2 pl-4 ${m.border}`}>
                <span className={`font-mono text-headline-lg sm:text-headline-xl tracking-tight ${m.valueClass}`}>{m.value}</span>
                <span className="font-label-lg text-label-lg text-on-surface mt-1">{m.label}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{m.note}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Four pillars */}
        <section className="py-24 scroll-mt-16" id="features">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mb-16">
              <div className="flex items-center gap-2 text-primary font-label-sm text-label-sm uppercase tracking-wider mb-2">
                <Icon name="layers" className="text-[16px]" />
                End-To-End Hospitality Architecture
              </div>
              <h2 className="font-headline-lg text-headline-lg sm:text-headline-xl text-on-surface">Engineered for line heat, low ambient light, and blistering peak rush.</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-3">
                Legacy point-of-sale systems were built for checkout counters. Sync Hub Resto is built around the synchronized heartbeat between floor captains, expeditors,
                and diners.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {PILLARS.map((p) => (
                <article
                  key={p.title}
                  className="bg-surface-container rounded-xl p-6 sm:p-8 border border-outline-variant/30 flex flex-col justify-between hover:border-primary-container/60 transition-colors"
                >
                  <div>
                    <div className={`w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center mb-6 border border-outline-variant/30 ${p.tone}`}>
                      <Icon name={p.icon} className="text-headline-sm" />
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">{p.title}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-3 leading-relaxed">{p.body}</p>
                    <ul className="mt-6 space-y-2 font-body-sm text-body-sm text-on-surface">
                      {p.points.map((point) => (
                        <li key={point} className="flex items-center gap-2">
                          <Icon name="check" className="text-tertiary text-[18px]" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`mt-8 pt-4 border-t border-outline-variant/20 flex items-center justify-between font-label-md text-label-md ${p.tone}`}>
                    <span>{p.cta}</span>
                    <Icon name="arrow_forward" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="py-20 bg-surface-container-low border-t border-outline-variant/20 scroll-mt-16" id="solutions">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-primary font-label-sm text-label-sm uppercase tracking-wider">The Real-Time Service Symphony</span>
              <h2 className="font-headline-lg text-headline-lg sm:text-headline-xl text-on-surface mt-2">From table tap to fired pan in under 1 second.</h2>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="bg-surface-container p-6 rounded-xl border border-outline-variant/20">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-headline-sm mb-4 ${s.badge}`}>{i + 1}</div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">{s.title}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{s.body}</p>
                  <div className={`mt-4 pt-3 border-t border-outline-variant/20 flex items-center gap-1.5 font-label-sm text-label-sm ${s.footClass}`}>
                    <Icon name={s.icon} className="text-[16px]" />
                    {s.foot}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <figure className="bg-surface-container rounded-2xl p-6 sm:p-8 lg:p-14 border border-outline-variant/30 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <figcaption className="lg:col-span-4 flex flex-col items-center sm:items-start">
                  <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-xl overflow-hidden border-2 border-primary-container/40 shadow-xl">
                    <img
                      className="w-full h-full object-cover"
                      alt="Executive chef in a black kitchen jacket in front of an ember hearth"
                      loading="lazy"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAweaS9RqsxeJbFnLVXJyq0oYuQ4OIKK2nE0gQ6EJWVPWcC_q5PyuW2dTjvNvwgY81V2MOp3TotYF-U-DOAG-aDfwZiGL0rGDrOXethjpUJ8TDJMobksfQm9fWmBfIdha6fYMlazBZFaVtqhgLUONsMsxThiN2F5WeFtx_a-h8rarymMfAi-YWdYHV1wN2rpVXzdGvMip5OOZK_cCjrP0YMjcBEIC5w5dH1-RUdeW7XeqGTwoo5guI"
                    />
                  </div>
                  <div className="mt-4 text-center sm:text-left">
                    <p className="font-headline-sm text-headline-sm text-on-surface">Chef Marcus Vance</p>
                    <p className="font-body-md text-body-md text-primary font-semibold">Executive Chef &amp; Co-Owner</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">The Copper Hearth • Chicago, IL</p>
                    <div className="mt-2 flex items-center gap-1 text-secondary justify-center sm:justify-start" aria-label="Five stars">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden>
                          star
                        </span>
                      ))}
                      <span className="font-mono text-label-sm text-on-surface ml-1">Michelin Recommended</span>
                    </div>
                  </div>
                </figcaption>
                <div className="lg:col-span-8 flex flex-col justify-center">
                  <Icon name="format_quote" className="text-primary-container text-5xl opacity-40 -mb-4" />
                  <blockquote className="font-headline-md text-headline-md text-on-surface leading-snug">
                    “During our Friday 200-cover service, Sync Hub Resto eliminated the chaos at the pass. Line cooks know exactly what to fire, tickets never get lost in steam,
                    and our floor staff spends 100% of their time on genuine hospitality instead of punching orders into a stationary terminal.”
                  </blockquote>
                  <div className="mt-8 pt-6 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div>
                        <div className="font-mono text-headline-sm text-secondary">22 min</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">Average turnaround shaved</div>
                      </div>
                      <div className="h-8 w-px bg-outline-variant/30" />
                      <div>
                        <div className="font-mono text-headline-sm text-tertiary">+$18,400</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">Monthly added bar &amp; dessert sales</div>
                      </div>
                    </div>
                    <div className="font-label-sm text-label-sm px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface-variant">
                      Live Deployment: 34 Tables • 3 KDS Monitors
                    </div>
                  </div>
                </div>
              </div>
            </figure>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 bg-surface-container-lowest border-t border-outline-variant/20 scroll-mt-16" id="pricing">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-secondary font-label-sm text-label-sm uppercase tracking-wider">Predictable Floor Economics</span>
              <h2 className="font-headline-lg text-headline-lg sm:text-headline-xl text-on-surface mt-2">No hardware lock-in. No per-transaction gouging.</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-3">Deploy on any iPad, Android terminal, or commercial kitchen bumper screen. Cancel anytime.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              {TIERS.map((t) => (
                <article
                  key={t.name}
                  className={`rounded-xl p-6 sm:p-8 flex flex-col justify-between relative ${
                    t.featured ? "bg-surface-container-high border-2 border-primary-container shadow-2xl mt-4 lg:mt-0" : "bg-surface-container border border-outline-variant/30"
                  }`}
                >
                  {t.featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold uppercase tracking-wider px-3.5 py-1 rounded-full">
                      Most Popular for High Cadence
                    </div>
                  )}
                  <div>
                    <h3 className={`font-label-md text-label-md uppercase ${t.featured ? "text-primary font-bold" : "text-on-surface-variant"}`}>{t.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="font-mono text-headline-xl text-on-surface">{t.price}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">/ month</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-3">{t.blurb}</p>
                    <ul className={`mt-6 space-y-3 font-body-sm text-body-sm text-on-surface border-t pt-6 ${t.featured ? "border-outline-variant/30" : "border-outline-variant/20"}`}>
                      {t.features.map((f, i) => (
                        <li key={f} className="flex items-center gap-2">
                          <Icon name={t.featured ? "check_circle" : "check"} className={`text-[18px] ${t.featured ? "text-primary" : "text-tertiary"}`} />
                          <span className={t.featured && i === 0 ? "font-semibold" : undefined}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href="#book-demo"
                    className={`mt-8 w-full rounded-lg font-label-md text-label-md flex items-center justify-center transition-all ${
                      t.featured
                        ? "py-3.5 bg-primary-container text-on-primary-container font-bold hover:brightness-105 active:scale-[0.98] shadow-md"
                        : "py-3 border border-outline-variant/50 text-on-surface font-semibold hover:bg-surface-container-high"
                    }`}
                  >
                    {t.cta}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="py-24 relative overflow-hidden scroll-mt-16" id="book-demo">
          <div className="absolute inset-x-0 top-0 h-full bg-linear-to-b from-primary-container/10 to-transparent pointer-events-none blur-3xl" />
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <span className="text-primary font-label-sm text-label-sm uppercase tracking-wider">Ready for Friday night?</span>
            <h2 className="font-headline-lg text-headline-lg sm:text-headline-xl text-on-surface mt-2">Fire your first ticket from the table tonight.</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-4">
              Your team signs in on any tablet or terminal: cashiers land on the floor plan, cooks on the kitchen display, and managers get table QR stands ready to print.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={SIGN_IN.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-primary-container text-on-primary-container font-label-lg text-label-lg font-bold shadow-md hover:brightness-105 active:scale-[0.98] transition-all"
              >
                <Icon name="login" />
                {PAGES_DEMO ? SIGN_IN.label : "Staff Sign In"}
              </Link>
              <a
                href="#pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface font-label-lg text-label-lg font-semibold hover:bg-surface-variant active:scale-[0.98] transition-all"
              >
                <Icon name="sell" className="text-secondary" />
                Compare Plans
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant/20 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
              <Icon name="restaurant" className="text-[18px]" />
            </span>
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">Sync Hub Resto</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Footer">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors">
                {n.label}
              </a>
            ))}
            <Link href={SIGN_IN.href} className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors">
              {SIGN_IN.label}
            </Link>
          </nav>
          <p className="font-body-sm text-body-sm text-on-surface-variant">© {new Date().getFullYear()} Sync Hub Resto. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
