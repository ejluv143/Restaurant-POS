import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { setItemActive } from "./actions";
import { ActionButton } from "@/components/staff/ActionForm";
import AvailabilitySwitch from "@/components/staff/AvailabilitySwitch";
import { Badge, Card, EmptyState, Icon, PageHeader, btn } from "@/components/ui";
import { getDb, schema as s } from "@/db";
import { ADMINS, rolesFor } from "@/lib/staffAccess";
import { getStaffContext } from "@/lib/staffContext";
import { formatCents } from "@/lib/tableOrder";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage({ searchParams }: PageProps<"/menu">) {
  const ctx = await getStaffContext(rolesFor("/menu"));
  if (!ctx.branch) return <EmptyState icon="storefront" title="No branch assigned">Ask an administrator to assign you to a branch.</EmptyState>;
  const branch = ctx.branch;
  const isAdmin = ADMINS.includes(ctx.staff.role);
  const { show } = await searchParams;
  const showRemoved = isAdmin && show === "removed";

  const [categories, items] = await Promise.all([
    getDb().select({ id: s.menuCategories.id, name: s.menuCategories.name }).from(s.menuCategories).where(eq(s.menuCategories.restaurantId, branch.restaurantId)).orderBy(asc(s.menuCategories.sortOrder)),
    getDb()
      .select({
        id: s.menuItems.id,
        categoryId: s.menuItems.categoryId,
        name: s.menuItems.name,
        description: s.menuItems.description,
        priceCents: s.menuItems.priceCents,
        prepMinutes: s.menuItems.prepMinutes,
        station: s.kitchenStations.name,
        isSignature: s.menuItems.isSignature,
        highlightLabel: s.menuItems.highlightLabel,
        isActive: s.menuItems.isActive,
        available: sql<boolean>`coalesce(${s.branchMenuAvailability.isAvailable}, true)`,
        options: sql<number>`(select count(*) from ${s.menuItemModifierGroups} where ${s.menuItemModifierGroups.menuItemId} = ${s.menuItems.id})::int`,
      })
      .from(s.menuItems)
      .innerJoin(s.menuCategories, eq(s.menuCategories.id, s.menuItems.categoryId))
      .leftJoin(s.kitchenStations, eq(s.kitchenStations.id, s.menuItems.stationId))
      .leftJoin(s.branchMenuAvailability, and(eq(s.branchMenuAvailability.menuItemId, s.menuItems.id), eq(s.branchMenuAvailability.branchId, branch.id)))
      .where(and(eq(s.menuCategories.restaurantId, branch.restaurantId), eq(s.menuItems.isActive, !showRemoved)))
      .orderBy(asc(s.menuCategories.sortOrder), asc(s.menuItems.sortOrder)),
  ]);
  const money = (c: number) => formatCents(c, branch.currency);
  const soldOut = items.filter((i) => !i.available).length;

  return (
    <>
      <PageHeader
        title={showRemoved ? "Removed dishes" : "Menu"}
        icon="restaurant_menu"
        subtitle={
          isAdmin
            ? `${branch.restaurant} • ${items.length} dishes shared by all branches. Availability switches apply to ${branch.name} only.`
            : `${branch.name} • Switch a dish to "Sold out" and guests see "Currently Unavailable" right away.`
        }
        actions={
          isAdmin && (
            <>
              <Link href={showRemoved ? "/menu" : "/menu?show=removed"} className={btn.ghost}>
                {showRemoved ? "Back to menu" : "Removed dishes"}
              </Link>
              <Link href="/menu/options" className={btn.secondary}>
                <Icon name="tune" className="text-[18px]" />
                Categories & add-ons
              </Link>
              <Link href="/menu/new" className={btn.primary}>
                <Icon name="add" className="text-[18px]" />
                New dish
              </Link>
            </>
          )
        }
      />
      {!showRemoved && soldOut > 0 && (
        <p className="mb-4 inline-flex items-center gap-2 rounded-lg bg-error-container/30 text-on-error-container px-3 py-2 font-label-lg text-label-lg">
          <Icon name="block" className="text-[18px]" />
          {soldOut} {soldOut === 1 ? "dish is" : "dishes are"} sold out at {branch.name}
        </p>
      )}
      {items.length === 0 && <EmptyState icon="restaurant_menu" title={showRemoved ? "No removed dishes" : "No dishes yet"}>{isAdmin && !showRemoved && "Add your first dish with “New dish”."}</EmptyState>}
      <div className="flex flex-col gap-5">
        {categories.map((c) => {
          const list = items.filter((i) => i.categoryId === c.id);
          if (list.length === 0) return null;
          return (
            <Card key={c.id} title={c.name} actions={<span className="font-label-md text-label-md text-on-surface-variant">{list.length} dishes</span>} padded={false}>
              <ul className="divide-y divide-outline-variant/20">
                {list.map((i) => (
                  <li key={i.id} className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-label-lg text-label-lg text-on-surface">
                        {i.name}
                        {i.isSignature && <Badge className="border-primary/40 text-primary">Featured</Badge>}
                        {i.highlightLabel && <Badge className="border-outline-variant/60 text-on-surface-variant">{i.highlightLabel}</Badge>}
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{i.description}</p>
                      <p className="font-body-sm text-body-sm text-outline">
                        {i.station ?? "No station"}
                        {i.prepMinutes ? ` • ${i.prepMinutes} min` : ""}
                        {i.options ? ` • ${i.options} option ${i.options === 1 ? "group" : "groups"}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 shrink-0">
                      <span className="font-headline-sm text-headline-sm text-on-surface tabular-nums">{money(i.priceCents)}</span>
                      {!showRemoved && <AvailabilitySwitch itemId={i.id} name={i.name} initial={i.available} />}
                      {isAdmin && (
                        <>
                          <Link href={`/menu/${i.id}`} className={btn.ghost}>
                            <Icon name="edit" className="text-[16px]" />
                            Edit
                          </Link>
                          <ActionButton
                            action={setItemActive.bind(null, i.id, showRemoved)}
                            label={showRemoved ? "Restore" : "Remove"}
                            icon={showRemoved ? "restore" : "delete"}
                            confirm={showRemoved ? undefined : `Remove ${i.name} from the menu?`}
                            className={btn.ghost}
                          />
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}
