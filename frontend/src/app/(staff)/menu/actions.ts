"use server";

import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ADMINS } from "@/lib/staffAccess";
import { ActionError, audit, requireBranch, runAction, type ActionResult } from "@/lib/staffContext";
import { bool, id, ids, imageUrl, int, money, optionalId, optionalText, slugify, text } from "@/lib/validate";

// Menu editing is restaurant-wide (every branch shares one menu), so only restaurant/system admins may
// change it. Branch staff manage per-branch availability from the kitchen / menu screens instead.

async function adminCtx() {
  return requireBranch(ADMINS);
}

async function assertCategory(restaurantId: string, categoryId: string) {
  const [c] = await getDb()
    .select({ id: s.menuCategories.id })
    .from(s.menuCategories)
    .where(and(eq(s.menuCategories.id, categoryId), eq(s.menuCategories.restaurantId, restaurantId)));
  if (!c) throw new ActionError("Choose a category.");
}

export async function saveMenuItem(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let created: string | null = null;
  const result = await runAction(async () => {
    const ctx = await adminCtx();
    const restaurantId = ctx.branch.restaurantId;
    const itemId = fd.get("id") ? id(fd, "id", "Menu item") : null;
    const values = {
      name: text(fd, "name", "Name", { max: 80 }),
      description: optionalText(fd, "description", "Description", 400) ?? "",
      categoryId: id(fd, "categoryId", "Category"),
      stationId: optionalId(fd, "stationId", "Kitchen station"),
      priceCents: money(fd, "price", "Price", { min: 0, max: 10_000_000 }),
      prepMinutes: int(fd, "prepMinutes", "Prep time", { min: 1, max: 240, required: false }),
      imageUrl: imageUrl(fd, "imageUrl"),
      highlightLabel: optionalText(fd, "highlightLabel", "Badge", 24),
      isSignature: bool(fd, "isSignature"),
      isActive: bool(fd, "isActive"),
    };
    await assertCategory(restaurantId, values.categoryId);
    const db = getDb();
    if (values.stationId) {
      const [st] = await db.select({ id: s.kitchenStations.id }).from(s.kitchenStations).where(and(eq(s.kitchenStations.id, values.stationId), eq(s.kitchenStations.restaurantId, restaurantId)));
      if (!st) throw new ActionError("Choose a kitchen station.");
    }
    // Only this restaurant's modifier groups / any global dietary tag
    const groupIds = ids(fd, "groups");
    const validGroups = groupIds.length
      ? (await db.select({ id: s.modifierGroups.id }).from(s.modifierGroups).where(and(inArray(s.modifierGroups.id, groupIds), eq(s.modifierGroups.restaurantId, restaurantId)))).map((g) => g.id)
      : [];
    const tagIds = fd
      .getAll("tags")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0 && n < 1000);

    let before: { name: string; priceCents: number } | undefined;
    const savedId = await db.transaction(async (tx) => {
      let target = itemId;
      if (target) {
        [before] = await tx
          .select({ name: s.menuItems.name, priceCents: s.menuItems.priceCents })
          .from(s.menuItems)
          .innerJoin(s.menuCategories, eq(s.menuCategories.id, s.menuItems.categoryId))
          .where(and(eq(s.menuItems.id, target), eq(s.menuCategories.restaurantId, restaurantId)));
        if (!before) throw new ActionError("Menu item not found.", 404);
        await tx.update(s.menuItems).set(values).where(eq(s.menuItems.id, target));
      } else {
        const [{ n }] = await tx.select({ n: count() }).from(s.menuItems).where(eq(s.menuItems.categoryId, values.categoryId));
        [{ id: target }] = await tx
          .insert(s.menuItems)
          .values({ ...values, sortOrder: n })
          .returning({ id: s.menuItems.id });
      }
      await tx.delete(s.menuItemModifierGroups).where(eq(s.menuItemModifierGroups.menuItemId, target!));
      if (validGroups.length) await tx.insert(s.menuItemModifierGroups).values(validGroups.map((groupId, i) => ({ menuItemId: target!, groupId, sortOrder: i })));
      await tx.delete(s.menuItemDietaryTags).where(eq(s.menuItemDietaryTags.menuItemId, target!));
      if (tagIds.length) {
        const valid = await tx.select({ id: s.dietaryTags.id }).from(s.dietaryTags).where(inArray(s.dietaryTags.id, tagIds));
        if (valid.length) await tx.insert(s.menuItemDietaryTags).values(valid.map((t) => ({ menuItemId: target!, tagId: t.id })));
      }
      return target!;
    });
    await audit(ctx, itemId ? "menu.item_updated" : "menu.item_created", { type: "menu_item", id: savedId }, {
      name: values.name,
      price: values.priceCents,
      previousPrice: before && before.priceCents !== values.priceCents ? before.priceCents : undefined,
      active: values.isActive,
    });
    if (!itemId) created = savedId;
    return `${values.name} saved.`;
  });
  if (created) redirect(`/menu?saved=${created}`);
  return result;
}

export async function setItemActive(itemId: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await adminCtx();
    const [item] = await getDb()
      .select({ name: s.menuItems.name })
      .from(s.menuItems)
      .innerJoin(s.menuCategories, eq(s.menuCategories.id, s.menuItems.categoryId))
      .where(and(eq(s.menuItems.id, id(itemId)), eq(s.menuCategories.restaurantId, ctx.branch.restaurantId)));
    if (!item) throw new ActionError("Menu item not found.", 404);
    await getDb().update(s.menuItems).set({ isActive: active }).where(eq(s.menuItems.id, itemId));
    await audit(ctx, active ? "menu.item_restored" : "menu.item_removed", { type: "menu_item", id: itemId }, { name: item.name });
    refresh();
    return active ? `${item.name} is back on the menu.` : `${item.name} removed from the menu (kept in past orders and reports).`;
  });
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function saveCategory(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await adminCtx();
    const restaurantId = ctx.branch.restaurantId;
    const name = text(fd, "name", "Category name", { max: 40 });
    const categoryId = fd.get("id") ? id(fd, "id", "Category") : null;
    const db = getDb();
    const slug = slugify(name) || `category-${Date.now()}`;
    const [clash] = await db
      .select({ id: s.menuCategories.id })
      .from(s.menuCategories)
      .where(and(eq(s.menuCategories.restaurantId, restaurantId), eq(s.menuCategories.slug, slug)));
    if (clash && clash.id !== categoryId) throw new ActionError(`A category named "${name}" already exists.`);
    if (categoryId) {
      const [updated] = await db
        .update(s.menuCategories)
        .set({ name, slug })
        .where(and(eq(s.menuCategories.id, categoryId), eq(s.menuCategories.restaurantId, restaurantId)))
        .returning({ id: s.menuCategories.id });
      if (!updated) throw new ActionError("Category not found.", 404);
    } else {
      const [{ n }] = await db.select({ n: count() }).from(s.menuCategories).where(eq(s.menuCategories.restaurantId, restaurantId));
      await db.insert(s.menuCategories).values({ restaurantId, name, slug, sortOrder: n });
    }
    await audit(ctx, categoryId ? "menu.category_renamed" : "menu.category_created", { type: "category", id: categoryId ?? slug }, { name });
    refresh();
    return `Category "${name}" saved.`;
  });
}

export async function moveCategory(categoryId: string, direction: -1 | 1): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await adminCtx();
    const db = getDb();
    const cats = await db
      .select({ id: s.menuCategories.id })
      .from(s.menuCategories)
      .where(eq(s.menuCategories.restaurantId, ctx.branch.restaurantId))
      .orderBy(asc(s.menuCategories.sortOrder), asc(s.menuCategories.name));
    const i = cats.findIndex((c) => c.id === id(categoryId));
    const j = i + (direction === 1 ? 1 : -1);
    if (i < 0 || j < 0 || j >= cats.length) return;
    [cats[i], cats[j]] = [cats[j], cats[i]];
    await db.transaction(async (tx) => {
      for (const [n, c] of cats.entries()) await tx.update(s.menuCategories).set({ sortOrder: n }).where(eq(s.menuCategories.id, c.id));
    });
    refresh();
  });
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await adminCtx();
    const db = getDb();
    const [{ n }] = await db.select({ n: count() }).from(s.menuItems).where(eq(s.menuItems.categoryId, id(categoryId)));
    if (n > 0) throw new ActionError("Move or remove this category's dishes first.");
    const [deleted] = await db
      .delete(s.menuCategories)
      .where(and(eq(s.menuCategories.id, categoryId), eq(s.menuCategories.restaurantId, ctx.branch.restaurantId)))
      .returning({ name: s.menuCategories.name });
    if (!deleted) throw new ActionError("Category not found.", 404);
    await audit(ctx, "menu.category_deleted", { type: "category", id: categoryId }, { name: deleted.name });
    refresh();
    return `Category "${deleted.name}" deleted.`;
  });
}

// ─── Variants & add-ons (modifier groups) ───────────────────────────────────

export async function saveModifierGroup(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await adminCtx();
    const restaurantId = ctx.branch.restaurantId;
    const groupId = fd.get("id") ? id(fd, "id", "Option group") : null;
    const name = text(fd, "name", "Group name", { max: 40 });
    const minSelect = int(fd, "minSelect", "Minimum", { min: 0, max: 10 })!;
    const maxSelect = int(fd, "maxSelect", "Maximum", { min: 1, max: 10 })!;
    if (maxSelect < minSelect) throw new ActionError("Maximum must be at least the minimum.");
    const db = getDb();
    try {
      if (groupId) {
        const [u] = await db
          .update(s.modifierGroups)
          .set({ name, minSelect, maxSelect })
          .where(and(eq(s.modifierGroups.id, groupId), eq(s.modifierGroups.restaurantId, restaurantId)))
          .returning({ id: s.modifierGroups.id });
        if (!u) throw new ActionError("Option group not found.", 404);
      } else await db.insert(s.modifierGroups).values({ restaurantId, name, minSelect, maxSelect });
    } catch (e) {
      if (e instanceof ActionError) throw e;
      throw new ActionError(`An option group named "${name}" already exists.`);
    }
    await audit(ctx, groupId ? "menu.options_group_updated" : "menu.options_group_created", { type: "modifier_group", id: groupId ?? name }, { name, minSelect, maxSelect });
    refresh();
    return `Option group "${name}" saved.`;
  });
}

async function assertGroup(restaurantId: string, groupId: string) {
  const [g] = await getDb()
    .select({ id: s.modifierGroups.id })
    .from(s.modifierGroups)
    .where(and(eq(s.modifierGroups.id, groupId), eq(s.modifierGroups.restaurantId, restaurantId)));
  if (!g) throw new ActionError("Option group not found.", 404);
}

export async function saveModifierOption(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await adminCtx();
    const groupId = id(fd, "groupId", "Option group");
    await assertGroup(ctx.branch.restaurantId, groupId);
    const optionId = fd.get("id") ? id(fd, "id", "Option") : null;
    const name = text(fd, "name", "Option name", { max: 40 });
    const priceDeltaCents = money(fd, "price", "Extra price", { max: 1_000_000 });
    const isDefault = bool(fd, "isDefault");
    const db = getDb();
    try {
      if (optionId) {
        const [u] = await db
          .update(s.modifierOptions)
          .set({ name, priceDeltaCents, isDefault })
          .where(and(eq(s.modifierOptions.id, optionId), eq(s.modifierOptions.groupId, groupId)))
          .returning({ id: s.modifierOptions.id });
        if (!u) throw new ActionError("Option not found.", 404);
      } else {
        const [{ n }] = await db.select({ n: count() }).from(s.modifierOptions).where(eq(s.modifierOptions.groupId, groupId));
        await db.insert(s.modifierOptions).values({ groupId, name, priceDeltaCents, isDefault, sortOrder: n });
      }
    } catch (e) {
      if (e instanceof ActionError) throw e;
      throw new ActionError(`This group already has an option named "${name}".`);
    }
    await audit(ctx, "menu.option_saved", { type: "modifier_option", id: optionId ?? name }, { name, price: priceDeltaCents });
    refresh();
    return `Option "${name}" saved.`;
  });
}

export async function deleteModifierOption(optionId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await adminCtx();
    const db = getDb();
    const [opt] = await db
      .select({ name: s.modifierOptions.name, used: sql<boolean>`exists (select 1 from ${s.orderItemModifiers} where ${s.orderItemModifiers.modifierOptionId} = ${s.modifierOptions.id})` })
      .from(s.modifierOptions)
      .innerJoin(s.modifierGroups, eq(s.modifierGroups.id, s.modifierOptions.groupId))
      .where(and(eq(s.modifierOptions.id, id(optionId)), eq(s.modifierGroups.restaurantId, ctx.branch.restaurantId)));
    if (!opt) throw new ActionError("Option not found.", 404);
    if (opt.used) throw new ActionError(`"${opt.name}" appears on past orders, so it can't be deleted. Rename it instead.`);
    await db.delete(s.modifierOptions).where(eq(s.modifierOptions.id, optionId));
    await audit(ctx, "menu.option_deleted", { type: "modifier_option", id: optionId }, { name: opt.name });
    refresh();
    return `Option "${opt.name}" deleted.`;
  });
}
