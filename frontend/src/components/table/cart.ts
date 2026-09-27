import { LIMITS, unitPrice, type MenuItemDto } from "@/lib/tableOrder";

export interface CartLine {
  key: string;
  itemId: string;
  qty: number;
  optionIds: string[];
  note: string;
}

// Same dish with the same options stacks into one line; different options get their own line
export const lineKey = (itemId: string, optionIds: string[]) => `${itemId}|${[...optionIds].sort().join(",")}`;

export const defaultOptionIds = (item: MenuItemDto) =>
  item.modifierGroups.flatMap((g) => {
    const defaults = g.options.filter((o) => o.isDefault).map((o) => o.id);
    return defaults.length || g.minSelect === 0 ? defaults.slice(0, g.maxSelect) : g.options.slice(0, g.minSelect).map((o) => o.id);
  });

export const selectedOptions = (item: MenuItemDto, optionIds: string[]) =>
  item.modifierGroups.flatMap((g) => g.options.filter((o) => optionIds.includes(o.id)));

export const linePrice = (item: MenuItemDto, optionIds: string[]) =>
  unitPrice(item.priceCents, selectedOptions(item, optionIds).map((o) => o.priceDeltaCents));

export function addToCart(cart: CartLine[], itemId: string, optionIds: string[], qty = 1, note = ""): CartLine[] {
  const key = lineKey(itemId, optionIds);
  const existing = cart.find((l) => l.key === key);
  if (existing) return cart.map((l) => (l.key === key ? { ...l, qty: Math.min(LIMITS.maxQty, l.qty + qty), note: note || l.note } : l));
  return [...cart, { key, itemId, qty: Math.min(LIMITS.maxQty, qty), optionIds, note }];
}

export const changeQty = (cart: CartLine[], key: string, delta: number) =>
  cart.flatMap((l) => (l.key !== key ? [l] : l.qty + delta <= 0 ? [] : [{ ...l, qty: Math.min(LIMITS.maxQty, l.qty + delta) }]));
