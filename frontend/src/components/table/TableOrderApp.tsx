"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatCents, type PlacedOrderDto, type ServiceRequestType, type TableMenuDto } from "@/lib/tableOrder";
import { addToCart, changeQty, linePrice, type CartLine } from "./cart";
import { DishCard, Icon, SignatureSpotlight, tagChipClass, tagIcon } from "./MenuParts";
import OrderPanel from "./OrderPanel";
import { ItemOptionsSheet, TicketsSheet } from "./Sheets";

type Mode = "all" | "specials";
const POLL_MS = 5000;

export default function TableOrderApp({ token, menu, initialOrders }: { token: string; menu: TableMenuDto; initialOrders: PlacedOrderDto[] }) {
  const { table, branch } = menu;
  const money = useCallback((c: number) => formatCents(c, branch.currency), [branch.currency]);
  // Sold-out flags stay live: the kitchen can mark a dish unavailable while the guest is browsing
  const [soldOut, setSoldOut] = useState(() => menu.items.filter((i) => !i.available).map((i) => i.id));
  const menuItems = useMemo(() => menu.items.map((i) => ({ ...i, available: !soldOut.includes(i.id) })), [menu.items, soldOut]);
  const items = useMemo(() => new Map(menuItems.map((i) => [i.id, i])), [menuItems]);
  useEffect(() => {
    const poll = setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/tables/${token}/availability`, { cache: "no-store" });
        if (res.ok) setSoldOut((await res.json()).soldOut);
      } catch {
        // Offline for a moment; the server still refuses sold-out dishes
      }
    }, 20_000);
    return () => clearInterval(poll);
  }, [token]);
  const tagLabels = useMemo(() => Object.fromEntries(menu.dietaryTags.map((t) => [t.code, t.label])), [menu.dietaryTags]);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState(initialOrders);
  const [mode, setMode] = useState<Mode>("all");
  const [diet, setDiet] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [allergyNote, setAllergyNote] = useState("");
  const [sending, setSending] = useState(false);
  const [requested, setRequested] = useState<Partial<Record<ServiceRequestType, boolean>>>({});
  const [customizing, setCustomizing] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [unseen, setUnseen] = useState(false);

  const notify = useCallback((text: string, error = false) => setToast({ text, error }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Live ticket status: poll while anything is still in the kitchen
  const ordersRef = useRef(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  const active = orders.some((o) => !["served", "completed", "cancelled"].includes(o.status));
  useEffect(() => {
    if (!active) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/tables/${token}/orders`, { cache: "no-store" });
        if (!res.ok) return;
        const next: PlacedOrderDto[] = await res.json();
        const changed = next.find((o) => ordersRef.current.find((p) => p.id === o.id)?.status !== o.status);
        if (changed) {
          setUnseen(true);
          if (changed.status === "ready") notify(`Ticket #${changed.ticketNumber} is ready — it's on its way to Table ${table.number}!`);
        }
        setOrders(next);
      } catch {
        // Offline for a moment; the next tick retries
      }
    }, POLL_MS);
    return () => clearInterval(poll);
  }, [active, token, table.number, notify]);

  const qtyInCart = (itemId: string) => cart.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.qty, 0);
  const cartCount = cart.reduce((n, l) => n + l.qty, 0);
  const cartTotal = cart.reduce((s, l) => {
    const item = items.get(l.itemId);
    return item ? s + linePrice(item, l.optionIds) * l.qty : s;
  }, 0);
  const cartTotalWithTax = cartTotal + Math.round((cartTotal * branch.taxRateBp) / 10000);

  const add = (itemId: string, optionIds: string[] = [], qty = 1, note = "") => {
    setCart((c) => addToCart(c, itemId, optionIds, qty, note));
    notify(`Added ${qty > 1 ? `${qty}× ` : ""}${items.get(itemId)?.name} to your table order`);
  };
  const quickAdd = (itemId: string) => {
    const item = items.get(itemId)!;
    if (!item.available) return notify(`${item.name} is currently unavailable.`, true);
    return item.modifierGroups.length ? setCustomizing(itemId) : add(itemId);
  };
  const quickRemove = (itemId: string) => {
    const line = cart.findLast((l) => l.itemId === itemId);
    if (line) setCart((c) => changeQty(c, line.key, -1));
  };

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/tables/${token}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: cart.map(({ itemId, qty, optionIds, note }) => ({ menuItemId: itemId, quantity: qty, optionIds, note })), note: allergyNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "We couldn't send your order. Please try again or call your server.");
      setOrders((o) => [...o.filter((x) => x.id !== data.id), data]);
      setCart([]);
      setPanelOpen(false);
      notify(`Ticket #${data.ticketNumber} sent to the kitchen`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Something went wrong.", true);
    } finally {
      setSending(false);
    }
  };

  const request = async (type: ServiceRequestType) => {
    try {
      const res = await fetch(`/api/tables/${token}/service-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Request failed");
      setRequested((r) => ({ ...r, [type]: true }));
      notify(type === "water_cutlery" ? "Water & cutlery are on the way" : type === "request_bill" ? "Your server will bring the bill" : "Your server has been notified");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Couldn't reach the staff. Please wave to your server.", true);
    }
  };

  // Filtering
  const clearFilters = () => {
    setMode("all");
    setDiet([]);
  };
  const q = query.trim().toLowerCase();
  const visible = menuItems.filter(
    (i) =>
      (mode === "all" || i.isSignature || i.highlightLabel) &&
      diet.every((d) => i.tags.includes(d)) &&
      (!q || `${i.name} ${i.description} ${i.station ?? ""} ${i.tags.map((t) => tagLabels[t]).join(" ")}`.toLowerCase().includes(q)),
  );
  const spotlight = visible.find((i) => i.isSignature && i.available);
  const filtering = mode !== "all" || diet.length > 0 || q !== "";
  const sections = menu.categories.map((c) => ({ ...c, items: visible.filter((i) => i.categorySlug === c.slug && i !== spotlight) })).filter((s) => s.items.length);

  const panel = (
    <OrderPanel
      tableNumber={table.number}
      zone={table.zone}
      taxRateBp={branch.taxRateBp}
      seats={table.seats}
      cart={cart}
      items={items}
      orders={orders}
      money={money}
      allergyNote={allergyNote}
      sending={sending}
      requested={requested}
      onQty={(key, d) => setCart((c) => changeQty(c, key, d))}
      onLineNote={(key, note) => setCart((c) => c.map((l) => (l.key === key ? { ...l, note } : l)))}
      onAllergyNote={setAllergyNote}
      onSend={send}
      onRequest={request}
      onViewTickets={() => {
        setPanelOpen(false);
        setTicketsOpen(true);
        setUnseen(false);
      }}
    />
  );

  const customizingItem = customizing ? items.get(customizing) : undefined;

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* ── Top bar ── */}
      <header className="w-full px-4 sm:px-6 py-3 sticky top-0 z-40 backdrop-blur-md bg-surface-container-low/95 shadow-sm">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-primary shadow-inner">
                <Icon name="restaurant" className="text-[24px]" />
              </div>
              <div className="min-w-0">
                <span className="text-headline-sm sm:text-headline-md font-headline-md text-primary tracking-tight block truncate">{menu.restaurant}</span>
                <span className="flex items-center gap-1.5 text-on-surface-variant text-label-sm font-label-sm truncate">
                  <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-tertiary" />
                  Table {table.number} • {table.zone} ({table.seats} seats)
                </span>
              </div>
            </div>
            <SearchBox value={query} onChange={setQuery} className="hidden 2xl:block w-80" />
          </div>

          <nav aria-label="Menu sections" className="hidden lg:flex items-center gap-4 xl:gap-6">
            {menu.categories.map((c) => (
              <a key={c.slug} href={`#${c.slug}`} className="whitespace-nowrap text-on-surface-variant hover:text-on-surface font-label-lg text-label-lg transition-colors pb-1 border-b-2 border-transparent hover:border-primary">
                {c.name}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {branch.wifiSsid && (
              <div className="hidden sm:flex lg:hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap bg-surface-container border border-outline-variant/30 text-on-surface-variant text-label-sm font-label-sm" title={branch.wifiPassword ? `Password: ${branch.wifiPassword}` : undefined}>
                <Icon name="wifi" className="text-[16px] text-tertiary" />
                Wi-Fi: {branch.wifiSsid}
              </div>
            )}
            <IconButton
              icon="notifications_active"
              label={unseen ? "Order status updated — view tickets" : "Order status"}
              dot={unseen}
              onClick={() => {
                setTicketsOpen(true);
                setUnseen(false);
              }}
            />
            <IconButton icon="receipt_long" label="Digital receipt" onClick={() => setTicketsOpen(true)} className="hidden sm:flex" />
            {orders.length > 0 && (
              <Link
                href={`/order/table/${token}/track`}
                className="flex items-center gap-1.5 min-h-10 px-3 rounded-lg bg-surface-container-high border border-outline-variant/30 text-on-surface text-label-md font-label-md hover:text-primary transition-colors"
              >
                <Icon name="timer" className="text-[18px] text-secondary" />
                <span className="hidden sm:inline">Live Tracker</span>
                <span className="sr-only sm:hidden">Live order tracker</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => request("call_server")}
              className="flex items-center gap-2 min-h-10 px-3 sm:px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-label-md font-label-md hover:brightness-105 active:scale-95 transition-all shadow-sm"
            >
              <Icon name="concierge" className="text-[18px]" />
              <span className="hidden sm:inline">{requested.call_server ? "Server Called" : "Call Server"}</span>
              <span className="sr-only sm:hidden">Call Server</span>
            </button>
          </div>
        </div>
        {/* Phone/tablet: section jump links */}
        <nav aria-label="Menu sections" className="lg:hidden max-w-[1720px] mx-auto mt-2 -mx-1 flex gap-1 overflow-x-auto no-scrollbar">
          {menu.categories.map((c) => (
            <a key={c.slug} href={`#${c.slug}`} className="shrink-0 px-3 py-1.5 rounded-lg text-label-md font-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high">
              {c.name}
            </a>
          ))}
        </nav>
      </header>

      {/* ── Workspace ── */}
      <main className="w-full max-w-[1720px] mx-auto p-4 lg:p-6 pb-28 lg:pb-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        <section className="lg:col-span-8 space-y-6 min-w-0">
          <SearchBox value={query} onChange={setQuery} className="2xl:hidden" />

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar" role="toolbar" aria-label="Menu filters">
            <Chip on={mode === "all" && diet.length === 0} onClick={clearFilters} idle="bg-surface-container-high text-on-surface border-outline-variant/40">
              All
            </Chip>
            <Chip on={mode === "specials"} onClick={() => setMode(mode === "specials" ? "all" : "specials")} idle="bg-surface-container-high text-on-surface-variant border-outline-variant/30">
              <Icon name="stars" className="text-[16px]" />
              Chef&apos;s Specials
            </Chip>
            {menu.dietaryTags.map((t) => (
              <Chip
                key={t.code}
                small
                on={diet.includes(t.code)}
                onClick={() => setDiet((d) => (d.includes(t.code) ? d.filter((x) => x !== t.code) : [...d, t.code]))}
                idle={tagChipClass(t.code)}
              >
                {tagIcon(t.code) && <Icon name={tagIcon(t.code)!} className="text-[14px]" />}
                {t.label}
              </Chip>
            ))}
          </div>

          {spotlight && <SignatureSpotlight key={spotlight.id} item={spotlight} money={money} onAdd={(opts, qty) => add(spotlight.id, opts, qty)} />}

          {sections.length === 0 && !spotlight ? (
            <div className="py-16 flex flex-col items-center text-center gap-2 text-on-surface-variant">
              <Icon name="search_off" className="text-[40px] text-outline" />
              <p className="text-body-md font-body-md">No dishes match these filters.</p>
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  setQuery("");
                }}
                className="text-primary text-label-md font-label-md underline underline-offset-4">
                Clear filters
              </button>
            </div>
          ) : (
            sections.map((s) => (
              <section key={s.slug} id={s.slug} className="scroll-mt-32 lg:scroll-mt-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-headline-sm font-headline-sm text-on-surface">{s.name}</h3>
                  <span className="text-body-sm font-body-sm text-on-surface-variant">
                    {s.items.length} {s.items.length === 1 ? "dish" : "dishes"}
                    {filtering ? " match" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {s.items.map((i) => (
                    <DishCard key={i.id} item={i} inCart={qtyInCart(i.id)} money={money} tagLabels={tagLabels} onAdd={() => quickAdd(i.id)} onDec={() => quickRemove(i.id)} />
                  ))}
                </div>
              </section>
            ))
          )}

          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-start gap-3.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-error-container/30 border border-error/20 shrink-0 flex items-center justify-center text-error">
              <Icon name="notification_important" className="text-[20px]" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-label-lg font-label-lg text-on-surface">Kitchen &amp; Severe Allergy Notice</h4>
              <p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
                Food allergies or severe dietary restrictions? Add them as a Table Dietary Alert or kitchen note, and please tell your server directly. Our hearth and prep lines handle tree nuts, shellfish, and gluten daily.
              </p>
            </div>
          </div>
        </section>

        {/* Desktop: sticky order panel */}
        <aside className="hidden lg:block lg:col-span-4" aria-label={`Table ${table.number} order`}>
          <div className="sticky top-24 rounded-xl bg-surface-container border border-outline-variant/30 shadow-2xl p-5 max-h-[calc(100vh-7rem)] overflow-y-auto">{panel}</div>
        </aside>
      </main>

      <footer className="w-full py-4 px-6 border-t border-outline-variant/20 bg-surface-container-lowest mb-20 lg:mb-0">
        <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-on-surface-variant text-body-sm font-body-sm">
          <span className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
            Table {table.number} • {table.zone} • Tabletop ordering active
          </span>
          <span className="text-label-sm font-label-sm font-medium">Prices in {branch.currency} • Service &amp; tax {branch.taxRateBp / 100}% added at checkout</span>
        </div>
      </footer>

      {/* Phone/tablet: order bar opens the panel as a sheet */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-surface-container-low/95 backdrop-blur-md border-t border-outline-variant/30">
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className={`w-full min-h-14 px-5 rounded-xl flex items-center justify-between gap-3 text-label-lg font-label-lg shadow-lg active:scale-[0.98] transition-all ${
            cartCount ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface border border-outline-variant/40"
          }`}
        >
          <span className="flex items-center gap-2">
            <Icon name={cartCount ? "shopping_bag" : "receipt_long"} className="text-[20px]" />
            {cartCount ? `${cartCount} ${cartCount === 1 ? "item" : "items"} • Review order` : orders.length ? `Table ${table.number} • ${orders.length} sent to kitchen` : `Table ${table.number} order`}
          </span>
          <span className="tabular-nums">{cartCount ? money(cartTotalWithTax) : "View"}</span>
        </button>
      </div>

      {panelOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end" onClick={() => setPanelOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={`Table ${table.number} order`} onClick={(e) => e.stopPropagation()} className="w-full max-h-[92vh] overflow-y-auto rounded-t-2xl bg-surface-container border-t border-outline-variant/30 p-5 pt-3">
            <div className="flex justify-center pb-2">
              <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close order" className="w-12 h-6 flex items-center justify-center">
                <span className="w-10 h-1.5 rounded-full bg-outline-variant" />
              </button>
            </div>
            {panel}
          </div>
        </div>
      )}

      {customizingItem && (
        <ItemOptionsSheet
          item={customizingItem}
          money={money}
          onClose={() => setCustomizing(null)}
          onAdd={(opts, qty, note) => {
            add(customizingItem.id, opts, qty, note);
            setCustomizing(null);
          }}
        />
      )}

      {ticketsOpen && (
        <TicketsSheet
          orders={orders}
          money={money}
          tableNumber={table.number}
          trackerHref={`/order/table/${token}/track`}
          onClose={() => setTicketsOpen(false)}
          onRequestBill={() => request("request_bill")}
          billRequested={requested.request_bill}
        />
      )}

      <div aria-live="polite" className="fixed z-[60] bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md pointer-events-none">
        {toast && (
          <div className={`px-4 py-3 rounded-lg shadow-2xl border text-label-md font-label-md flex items-center gap-2 ${toast.error ? "bg-error-container text-on-error-container border-error/30" : "bg-surface-container-highest text-on-surface border-outline-variant/40"}`}>
            <Icon name={toast.error ? "error" : "check_circle"} className={`text-[18px] ${toast.error ? "" : "text-tertiary"}`} />
            {toast.text}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchBox({ value, onChange, className }: { value: string; onChange: (v: string) => void; className: string }) {
  return (
    <div className={`relative ${className}`}>
      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search the menu"
        placeholder="Search dishes, drinks, cocktails, dietary notes..."
        className="w-full min-h-10 bg-surface-container-high border border-outline-variant/30 rounded-lg pl-9 pr-3 py-1.5 text-body-md xl:text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container transition-colors"
      />
    </div>
  );
}

function Chip({ on, onClick, idle, small = false, children }: { on: boolean; onClick: () => void; idle: string; small?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`shrink-0 min-h-9 rounded-full border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
        small ? "px-3.5 py-1.5 text-label-sm font-label-sm" : "px-4 py-2 text-label-md font-label-md"
      } ${on ? "bg-primary-container text-on-primary-container border-primary-container shadow-sm" : `${idle} hover:text-on-surface`}`}
    >
      {children}
    </button>
  );
}

function IconButton({ icon, label, onClick, dot, className = "flex" }: { icon: string; label: string; onClick: () => void; dot?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`${className} w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant/30 items-center justify-center text-on-surface hover:text-primary transition-colors relative`}>
      <Icon name={icon} className="text-[20px]" />
      {dot && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-container" />}
    </button>
  );
}
