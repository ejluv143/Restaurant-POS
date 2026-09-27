import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { saveMenuItem } from "../actions";
import { ActionForm } from "@/components/staff/ActionForm";
import { Card, Field, Icon, PageHeader, btn, input } from "@/components/ui";
import { getDb, schema as s } from "@/db";
import { ADMINS } from "@/lib/staffAccess";
import { requireBranch } from "@/lib/staffContext";

export const metadata: Metadata = { title: "Edit dish" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function MenuItemPage({ params }: PageProps<"/menu/[id]">) {
  const ctx = await requireBranch(ADMINS);
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !UUID.test(id)) notFound();
  const restaurantId = ctx.branch.restaurantId;
  const db = getDb();

  const [item, categories, stations, groups, tags, itemGroups, itemTags] = await Promise.all([
    isNew
      ? Promise.resolve(undefined)
      : db
          .select({
            id: s.menuItems.id,
            name: s.menuItems.name,
            description: s.menuItems.description,
            categoryId: s.menuItems.categoryId,
            stationId: s.menuItems.stationId,
            priceCents: s.menuItems.priceCents,
            prepMinutes: s.menuItems.prepMinutes,
            imageUrl: s.menuItems.imageUrl,
            highlightLabel: s.menuItems.highlightLabel,
            isSignature: s.menuItems.isSignature,
            isActive: s.menuItems.isActive,
          })
          .from(s.menuItems)
          .innerJoin(s.menuCategories, eq(s.menuCategories.id, s.menuItems.categoryId))
          .where(and(eq(s.menuItems.id, id), eq(s.menuCategories.restaurantId, restaurantId)))
          .then((r) => r[0]),
    db.select({ id: s.menuCategories.id, name: s.menuCategories.name }).from(s.menuCategories).where(eq(s.menuCategories.restaurantId, restaurantId)).orderBy(asc(s.menuCategories.sortOrder)),
    db.select({ id: s.kitchenStations.id, name: s.kitchenStations.name }).from(s.kitchenStations).where(eq(s.kitchenStations.restaurantId, restaurantId)).orderBy(asc(s.kitchenStations.name)),
    db
      .select({ id: s.modifierGroups.id, name: s.modifierGroups.name, minSelect: s.modifierGroups.minSelect, maxSelect: s.modifierGroups.maxSelect })
      .from(s.modifierGroups)
      .where(eq(s.modifierGroups.restaurantId, restaurantId))
      .orderBy(asc(s.modifierGroups.name)),
    db.select({ id: s.dietaryTags.id, label: s.dietaryTags.label }).from(s.dietaryTags).orderBy(asc(s.dietaryTags.id)),
    isNew ? Promise.resolve([]) : db.select({ id: s.menuItemModifierGroups.groupId }).from(s.menuItemModifierGroups).where(eq(s.menuItemModifierGroups.menuItemId, id)),
    isNew ? Promise.resolve([]) : db.select({ id: s.menuItemDietaryTags.tagId }).from(s.menuItemDietaryTags).where(eq(s.menuItemDietaryTags.menuItemId, id)),
  ]);
  if (!isNew && !item) notFound();

  return (
    <>
      <PageHeader
        title={isNew ? "New dish" : `Edit ${item!.name}`}
        icon="restaurant_menu"
        subtitle="Changes apply to every branch's menu immediately. Past orders keep the price they were sold at."
        actions={
          <Link href="/menu" className={btn.ghost}>
            <Icon name="arrow_back" className="text-[16px]" />
            Back to menu
          </Link>
        }
      />
      {categories.length === 0 ? (
        <Card>
          <p className="text-on-surface-variant">
            Create a category first under{" "}
            <Link href="/menu/options" className="text-primary underline">
              Categories &amp; add-ons
            </Link>
            .
          </p>
        </Card>
      ) : (
        <Card className="max-w-3xl">
          <ActionForm action={saveMenuItem} submitLabel={isNew ? "Create dish" : "Save changes"}>
            {item && <input type="hidden" name="id" value={item.id} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" htmlFor="name">
                <input id="name" name="name" required maxLength={80} defaultValue={item?.name} className={input} />
              </Field>
              <Field label="Price (₱)" htmlFor="price" hint="VAT is added on the bill.">
                <input id="price" name="price" required inputMode="decimal" defaultValue={item ? (item.priceCents / 100).toFixed(2) : ""} placeholder="149.00" className={input} />
              </Field>
              <Field label="Category" htmlFor="categoryId">
                <select id="categoryId" name="categoryId" required defaultValue={item?.categoryId} className={input}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kitchen station" htmlFor="stationId" hint="Routes the dish on the kitchen display.">
                <select id="stationId" name="stationId" defaultValue={item?.stationId ?? ""} className={input}>
                  <option value="">None</option>
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Preparation time (minutes)" htmlFor="prepMinutes" hint="Used for the guest's wait estimate.">
                <input id="prepMinutes" name="prepMinutes" inputMode="numeric" defaultValue={item?.prepMinutes ?? ""} className={input} />
              </Field>
              <Field label="Badge (optional)" htmlFor="highlightLabel" hint='e.g. "Bestseller", "Spicy", "New"'>
                <input id="highlightLabel" name="highlightLabel" maxLength={24} defaultValue={item?.highlightLabel ?? ""} className={input} />
              </Field>
            </div>
            <Field label="Description" htmlFor="description">
              <textarea id="description" name="description" rows={3} maxLength={400} defaultValue={item?.description} className={input} />
            </Field>
            <Field label="Photo URL (optional)" htmlFor="imageUrl" hint="A full https:// link to the dish photo.">
              <input id="imageUrl" name="imageUrl" type="url" maxLength={1000} defaultValue={item?.imageUrl ?? ""} placeholder="https://…" className={input} />
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="font-label-md text-label-md text-on-surface-variant mb-1">Variants &amp; add-ons</legend>
              {groups.length === 0 ? (
                <p className="font-body-sm text-body-sm text-outline">
                  No option groups yet.{" "}
                  <Link href="/menu/options" className="text-primary underline">
                    Create one
                  </Link>
                  .
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-2 cursor-pointer">
                      <input type="checkbox" name="groups" value={g.id} defaultChecked={itemGroups.some((x) => x.id === g.id)} className="accent-primary-container w-4 h-4" />
                      <span className="text-on-surface">{g.name}</span>
                      <span className="font-body-sm text-body-sm text-outline">{g.minSelect > 0 ? "required" : "optional"}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="font-label-md text-label-md text-on-surface-variant mb-1">Dietary tags</legend>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 rounded-full bg-surface-container px-3 py-1.5 cursor-pointer">
                    <input type="checkbox" name="tags" value={t.id} defaultChecked={itemTags.some((x) => x.id === t.id)} className="accent-primary-container w-4 h-4" />
                    <span className="text-on-surface">{t.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isSignature" defaultChecked={item?.isSignature} className="accent-primary-container w-4 h-4" />
                <span className="text-on-surface">Featured (shown as the chef&apos;s spotlight)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isActive" defaultChecked={item?.isActive ?? true} className="accent-primary-container w-4 h-4" />
                <span className="text-on-surface">On the menu</span>
              </label>
            </div>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
