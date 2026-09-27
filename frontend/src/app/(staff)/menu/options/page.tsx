import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { deleteCategory, deleteModifierOption, moveCategory, saveCategory, saveModifierGroup, saveModifierOption } from "../actions";
import { ActionButton, ActionForm } from "@/components/staff/ActionForm";
import { Card, Icon, PageHeader, btn, input } from "@/components/ui";
import { getDb, schema as s } from "@/db";
import { ADMINS } from "@/lib/staffAccess";
import { requireBranch } from "@/lib/staffContext";
import { formatCents } from "@/lib/tableOrder";

export const metadata: Metadata = { title: "Categories & add-ons" };

export default async function MenuOptionsPage() {
  const ctx = await requireBranch(ADMINS);
  const restaurantId = ctx.branch.restaurantId;
  const db = getDb();
  const [categories, groups, options] = await Promise.all([
    db
      .select({ id: s.menuCategories.id, name: s.menuCategories.name, items: count(s.menuItems.id) })
      .from(s.menuCategories)
      .leftJoin(s.menuItems, eq(s.menuItems.categoryId, s.menuCategories.id))
      .where(eq(s.menuCategories.restaurantId, restaurantId))
      .groupBy(s.menuCategories.id)
      .orderBy(asc(s.menuCategories.sortOrder)),
    db
      .select({ id: s.modifierGroups.id, name: s.modifierGroups.name, minSelect: s.modifierGroups.minSelect, maxSelect: s.modifierGroups.maxSelect })
      .from(s.modifierGroups)
      .where(eq(s.modifierGroups.restaurantId, restaurantId))
      .orderBy(asc(s.modifierGroups.name)),
    db
      .select({ id: s.modifierOptions.id, groupId: s.modifierOptions.groupId, name: s.modifierOptions.name, priceDeltaCents: s.modifierOptions.priceDeltaCents, isDefault: s.modifierOptions.isDefault })
      .from(s.modifierOptions)
      .innerJoin(s.modifierGroups, eq(s.modifierGroups.id, s.modifierOptions.groupId))
      .where(eq(s.modifierGroups.restaurantId, restaurantId))
      .orderBy(asc(s.modifierOptions.sortOrder)),
  ]);
  const money = (c: number) => formatCents(c, ctx.branch.currency);

  return (
    <>
      <PageHeader
        title="Categories & add-ons"
        icon="tune"
        subtitle={`${ctx.branch.restaurant} • Menu sections, variants (e.g. size) and add-ons (e.g. extra rice) shared by all branches.`}
        actions={
          <Link href="/menu" className={btn.ghost}>
            <Icon name="arrow_back" className="text-[16px]" />
            Back to menu
          </Link>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
        <Card title="Categories" icon="category" className="xl:col-span-2">
          <ul className="flex flex-col gap-2 mb-5">
            {categories.map((c, i) => (
              <li key={c.id} className="rounded-lg bg-surface-container p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-label-lg text-label-lg text-on-surface">
                    {c.name} <span className="text-outline font-body-sm text-body-sm">({c.items})</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <ActionButton action={moveCategory.bind(null, c.id, -1)} label="" ariaLabel={`Move ${c.name} up`} icon="arrow_upward" className={`${btn.ghost} ${i === 0 ? "invisible" : ""}`} />
                    <ActionButton action={moveCategory.bind(null, c.id, 1)} label="" ariaLabel={`Move ${c.name} down`} icon="arrow_downward" className={`${btn.ghost} ${i === categories.length - 1 ? "invisible" : ""}`} />
                    {c.items === 0 && <ActionButton action={deleteCategory.bind(null, c.id)} label="" ariaLabel={`Delete ${c.name}`} icon="delete" confirm="Delete?" className={btn.ghost} />}
                  </span>
                </div>
                <details>
                  <summary className="cursor-pointer font-body-sm text-body-sm text-primary">Rename</summary>
                  <ActionForm action={saveCategory} submitLabel="Rename" className="mt-2 flex flex-col gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input name="name" required maxLength={40} defaultValue={c.name} aria-label={`New name for ${c.name}`} className={input} />
                  </ActionForm>
                </details>
              </li>
            ))}
          </ul>
          <ActionForm action={saveCategory} submitLabel="Add category" submitIcon="add" resetOnSuccess className="flex flex-col gap-2">
            <label htmlFor="new-category" className="font-label-md text-label-md text-on-surface-variant">
              New category
            </label>
            <input id="new-category" name="name" required maxLength={40} placeholder="e.g. Silog Meals" className={input} />
          </ActionForm>
        </Card>

        <Card title="Variants & add-ons" icon="playlist_add" className="xl:col-span-3">
          <div className="flex flex-col gap-4 mb-6">
            {groups.map((g) => (
              <div key={g.id} className="rounded-xl border border-outline-variant/30 bg-surface-container p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">{g.name}</h3>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {g.minSelect > 0 ? `Guest must choose ${g.minSelect === g.maxSelect ? g.minSelect : `${g.minSelect}–${g.maxSelect}`}` : `Optional, up to ${g.maxSelect}`}
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {options
                    .filter((o) => o.groupId === g.id)
                    .map((o) => (
                      <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2">
                        <span className="text-on-surface">
                          {o.name}
                          {o.isDefault && <span className="ml-2 font-label-sm text-label-sm text-tertiary uppercase">default</span>}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums text-on-surface-variant">{o.priceDeltaCents ? `+${money(o.priceDeltaCents)}` : "no charge"}</span>
                          <details className="relative">
                            <summary className="cursor-pointer font-body-sm text-body-sm text-primary list-none">Edit</summary>
                            <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg bg-surface-container-high border border-outline-variant/40 p-3 shadow-2xl">
                              <ActionForm action={saveModifierOption} submitLabel="Save option" className="flex flex-col gap-2">
                                <input type="hidden" name="id" value={o.id} />
                                <input type="hidden" name="groupId" value={g.id} />
                                <input name="name" required maxLength={40} defaultValue={o.name} aria-label="Option name" className={input} />
                                <input name="price" required inputMode="decimal" defaultValue={(o.priceDeltaCents / 100).toFixed(2)} aria-label="Extra price" className={input} />
                                <label className="flex items-center gap-2">
                                  <input type="checkbox" name="isDefault" defaultChecked={o.isDefault} className="accent-primary-container" /> Selected by default
                                </label>
                              </ActionForm>
                            </div>
                          </details>
                          <ActionButton action={deleteModifierOption.bind(null, o.id)} label="" ariaLabel={`Delete ${o.name}`} icon="delete" confirm="Delete?" className={btn.ghost} />
                        </span>
                      </li>
                    ))}
                </ul>
                <details>
                  <summary className="cursor-pointer font-body-sm text-body-sm text-primary">Add option / edit group</summary>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ActionForm action={saveModifierOption} submitLabel="Add option" submitIcon="add" resetOnSuccess className="flex flex-col gap-2">
                      <input type="hidden" name="groupId" value={g.id} />
                      <input name="name" required maxLength={40} placeholder="Option name (e.g. Large)" aria-label="Option name" className={input} />
                      <input name="price" required inputMode="decimal" defaultValue="0.00" aria-label="Extra price" className={input} />
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="isDefault" className="accent-primary-container" /> Selected by default
                      </label>
                    </ActionForm>
                    <ActionForm action={saveModifierGroup} submitLabel="Save group" className="flex flex-col gap-2">
                      <input type="hidden" name="id" value={g.id} />
                      <input name="name" required maxLength={40} defaultValue={g.name} aria-label="Group name" className={input} />
                      <div className="grid grid-cols-2 gap-2">
                        <input name="minSelect" inputMode="numeric" defaultValue={g.minSelect} aria-label="Minimum choices" className={input} />
                        <input name="maxSelect" inputMode="numeric" defaultValue={g.maxSelect} aria-label="Maximum choices" className={input} />
                      </div>
                    </ActionForm>
                  </div>
                </details>
              </div>
            ))}
          </div>
          <ActionForm action={saveModifierGroup} submitLabel="Create option group" submitIcon="add" resetOnSuccess className="flex flex-col gap-2">
            <p className="font-label-md text-label-md text-on-surface-variant">New option group</p>
            <input name="name" required maxLength={40} placeholder="e.g. Drink Size, Add-ons" aria-label="Group name" className={input} />
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 font-body-sm text-body-sm text-on-surface-variant">
                Minimum choices (0 = optional)
                <input name="minSelect" inputMode="numeric" defaultValue="0" className={input} />
              </label>
              <label className="flex flex-col gap-1 font-body-sm text-body-sm text-on-surface-variant">
                Maximum choices
                <input name="maxSelect" inputMode="numeric" defaultValue="1" className={input} />
              </label>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
