/* eslint-disable @next/next/no-img-element -- menu photos are remote CMS URLs; next/image needs a domain allowlist */
"use client";

import { useState } from "react";
import type { MenuItemDto } from "@/lib/tableOrder";
import { defaultOptionIds, linePrice } from "./cart";

const CATEGORY_ICON: Record<string, string> = {
  "rice-meals": "rice_bowl",
  burgers: "lunch_dining",
  pizza: "local_pizza",
  pasta: "ramen_dining",
  chicken: "kebab_dining",
  seafood: "set_meal",
  desserts: "icecream",
  beverages: "local_drink",
  coffee: "local_cafe",
  snacks: "fastfood",
};

const TAG_STYLE: Record<string, { icon?: string; chip: string; badge: string }> = {
  vegetarian: { icon: "eco", chip: "bg-tertiary-container/20 text-tertiary border-tertiary-container/40", badge: "bg-tertiary-container/90 text-on-tertiary-container" },
  "gluten-free": { icon: "grain", chip: "bg-secondary-container/20 text-secondary border-secondary-container/40", badge: "bg-secondary-container/90 text-on-secondary-container" },
};
export const tagChipClass = (code: string) => TAG_STYLE[code]?.chip ?? "bg-surface-container text-on-surface-variant border-outline-variant/30";
export const tagIcon = (code: string) => TAG_STYLE[code]?.icon;

export function Icon({ name, className = "", filled = false }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span aria-hidden className={`material-symbols-outlined ${className}`} style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}>
      {name}
    </span>
  );
}

export function DishImage({ item, className }: { item: MenuItemDto; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!item.imageUrl || failed)
    return (
      <div className={`${className} bg-gradient-to-br from-surface-container-highest via-surface-container-high to-primary-container/25 flex items-center justify-center`}>
        <Icon name={CATEGORY_ICON[item.categorySlug] ?? "restaurant"} className="text-[56px] text-primary/60" />
      </div>
    );
  return <img src={item.imageUrl} alt={item.name} loading="lazy" onError={() => setFailed(true)} className={`${className} object-cover`} />;
}

/** The photo badge: the item's own label, else its first highlighted dietary tag. */
function badgeFor(item: MenuItemDto, tagLabels: Record<string, string>) {
  if (item.highlightLabel) return { text: item.highlightLabel, cls: item.highlightLabel === "Popular" ? "bg-primary-container text-on-primary-container" : "bg-surface-variant/90 text-on-surface" };
  const tag = item.tags.find((t) => TAG_STYLE[t]);
  return tag ? { text: tagLabels[tag], cls: TAG_STYLE[tag].badge } : null;
}

export function Stepper({ qty, name, onDec, onInc, size = "md" }: { qty: number; name: string; onDec: () => void; onInc: () => void; size?: "sm" | "md" }) {
  const btn = size === "sm" ? "w-8 h-8" : "w-10 h-10 sm:w-9 sm:h-9";
  return (
    <div className="flex items-center gap-1 bg-surface-container-high rounded-lg p-0.5 border border-outline-variant/30">
      <button type="button" onClick={onDec} aria-label={`Remove one ${name}`} className={`${btn} flex items-center justify-center rounded text-on-surface hover:bg-surface-bright active:scale-95 transition-all`}>
        <Icon name="remove" className="text-[16px]" />
      </button>
      <span className="w-6 text-center text-label-md font-label-md font-bold tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button type="button" onClick={onInc} aria-label={`Add one more ${name}`} className={`${btn} flex items-center justify-center rounded text-on-surface hover:bg-surface-bright active:scale-95 transition-all`}>
        <Icon name="add" className="text-[16px]" />
      </button>
    </div>
  );
}

export function DishCard({
  item,
  inCart,
  money,
  tagLabels,
  onAdd,
  onDec,
}: {
  item: MenuItemDto;
  inCart: number;
  money: (c: number) => string;
  tagLabels: Record<string, string>;
  onAdd: () => void;
  onDec: () => void;
}) {
  const badge = badgeFor(item, tagLabels);
  const customizable = item.modifierGroups.length > 0;
  return (
    <article className={`rounded-xl bg-surface-container border border-outline-variant/30 overflow-hidden flex flex-col hover:border-outline transition-colors group shadow-sm ${item.available ? "" : "opacity-70"}`}>
      <div className="relative h-44 overflow-hidden">
        <DishImage item={item} className={`w-full h-full group-hover:scale-105 transition-transform duration-300 ${item.available ? "" : "grayscale"}`} />
        {badge && item.available && <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-label-sm font-label-sm ${badge.cls}`}>{badge.text}</span>}
        {!item.available && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="px-3 py-1.5 rounded-full bg-surface-container-highest text-on-surface font-label-md text-label-md uppercase tracking-wider">Currently Unavailable</span>
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h4 className="text-headline-sm font-headline-sm text-on-surface">{item.name}</h4>
            <span className="text-headline-sm font-headline-sm text-primary font-bold shrink-0">{money(item.priceCents)}</span>
          </div>
          <p className="text-body-sm font-body-sm text-on-surface-variant line-clamp-2 mb-4">{item.description}</p>
        </div>
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/20 min-h-12">
          {inCart > 0 ? (
            <span className="text-label-sm font-label-sm text-tertiary flex items-center gap-1">
              <Icon name="check_circle" className="text-[14px]" />
              In Cart ({inCart})
            </span>
          ) : (
            <span className="text-label-sm font-label-sm text-on-surface-variant font-medium">
              {item.station ? `${item.station} Station` : ""}
              {item.prepMinutes ? ` • ${item.prepMinutes} min` : ""}
            </span>
          )}
          {!item.available ? (
            <span className="text-label-md font-label-md text-error">Sold out today</span>
          ) : inCart > 0 && !customizable ? (
            <Stepper qty={inCart} name={item.name} onDec={onDec} onInc={onAdd} />
          ) : (
            <button
              type="button"
              onClick={onAdd}
              aria-label={`${customizable ? "Customize and add" : "Add"} ${item.name}`}
              className="min-h-10 px-3.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40 hover:bg-primary-container hover:text-on-primary-container text-label-md font-label-md active:scale-95 transition-all flex items-center gap-1 text-on-surface"
            >
              <Icon name={customizable ? "tune" : "add"} className="text-[16px]" />
              {customizable ? "Customize" : "Add"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function SignatureSpotlight({ item, money, onAdd }: { item: MenuItemDto; money: (c: number) => string; onAdd: (optionIds: string[], qty: number) => void }) {
  const [optionIds, setOptionIds] = useState(() => defaultOptionIds(item));
  const [qty, setQty] = useState(1);
  const price = linePrice(item, optionIds) * qty;

  const pick = (groupId: string, optionId: string) => {
    const group = item.modifierGroups.find((g) => g.id === groupId)!;
    const others = optionIds.filter((id) => !group.options.some((o) => o.id === id));
    setOptionIds([...others, optionId]);
  };

  return (
    <section aria-label="Chef's signature" className="rounded-xl bg-surface-container-high border border-outline-variant/40 overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-12 relative group">
      <div className="md:col-span-5 relative min-h-[240px] md:min-h-full overflow-hidden">
        <DishImage item={item} className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-transparent via-surface-container-high/30 to-surface-container-high" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-primary-container text-on-primary-container text-label-sm font-label-sm uppercase shadow-md flex items-center gap-1">
          <Icon name="local_fire_department" className="text-[14px]" />
          Chef&apos;s Signature
        </span>
      </div>
      <div className="md:col-span-7 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            {item.prepMinutes ? (
              <span className="flex items-center gap-1 text-on-surface-variant text-label-sm font-label-sm">
                <Icon name="schedule" className="text-[14px]" />
                {item.prepMinutes} min prep
              </span>
            ) : (
              <span />
            )}
            <span className="text-headline-md font-headline-md text-primary font-bold">{money(item.priceCents)}</span>
          </div>
          <h2 className="text-[24px] leading-8 sm:text-headline-lg font-headline-lg font-semibold text-on-surface mb-2">{item.name}</h2>
          <p className="text-body-md font-body-md text-on-surface-variant leading-relaxed mb-4">{item.description}</p>

          {item.modifierGroups.length > 0 && (
            <div className="space-y-3 p-3 rounded-lg bg-surface-container border border-outline-variant/30 mb-4">
              {item.modifierGroups.map((g, gi) => (
                <fieldset key={g.id} className={`flex flex-wrap items-center justify-between gap-2 ${gi ? "pt-2 border-t border-outline-variant/20" : ""}`}>
                  <legend className="sr-only">{g.name}</legend>
                  <span aria-hidden className="text-label-sm font-label-sm text-on-surface-variant">
                    {g.name}
                  </span>
                  {g.maxSelect === 1 && g.options.length <= 4 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {g.options.map((o) => {
                        const on = optionIds.includes(o.id);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => pick(g.id, o.id)}
                            className={`min-h-9 px-2.5 py-1 rounded text-label-sm font-label-sm transition-colors ${on ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"}`}
                          >
                            {o.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <select
                      aria-label={g.name}
                      value={g.options.find((o) => optionIds.includes(o.id))?.id ?? ""}
                      onChange={(e) => pick(g.id, e.target.value)}
                      className="min-h-9 rounded bg-surface-container-high border border-outline-variant/30 px-2 text-label-sm font-label-sm text-on-surface focus:outline-none focus:border-primary-container"
                    >
                      {g.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                          {o.priceDeltaCents ? ` (+${money(o.priceDeltaCents)})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </fieldset>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 pt-2">
          <Stepper qty={qty} name={item.name} onDec={() => setQty((q) => Math.max(1, q - 1))} onInc={() => setQty((q) => Math.min(20, q + 1))} />
          <button
            type="button"
            onClick={() => {
              onAdd(optionIds, qty);
              setQty(1);
            }}
            className="flex-1 min-h-11 py-2.5 px-4 rounded-lg bg-primary-container text-on-primary-container text-label-lg font-label-lg hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <Icon name="add_circle" className="text-[18px]" />
            Add to Table Order ({money(price)})
          </button>
        </div>
      </div>
    </section>
  );
}
