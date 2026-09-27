import type { Metadata } from "next";
import { and, asc, eq, sql } from "drizzle-orm";
import StaffOrderPad from "@/components/staff/StaffOrderPad";
import { EmptyState, PageHeader } from "@/components/ui";
import { getDb, schema as s } from "@/db";
import { rolesFor } from "@/lib/staffAccess";
import { getStaffContext } from "@/lib/staffContext";
import { branchMenu } from "@/lib/tableOrdering";

export const metadata: Metadata = { title: "New Order" };

export default async function StaffOrderPage({ searchParams }: PageProps<"/cashier/order">) {
  const ctx = await getStaffContext(rolesFor("/cashier"));
  if (!ctx.branch) return <EmptyState icon="storefront" title="No branch assigned">Ask an administrator to assign you to a branch.</EmptyState>;
  const branch = ctx.branch;
  const { table } = await searchParams;
  const [tables, menu] = await Promise.all([
    getDb()
      .select({ id: s.diningTables.id, number: s.diningTables.number, zone: s.zones.name })
      .from(s.diningTables)
      .innerJoin(s.zones, eq(s.zones.id, s.diningTables.zoneId))
      .where(and(eq(s.diningTables.branchId, branch.id), eq(s.diningTables.isActive, true)))
      .orderBy(asc(s.zones.sortOrder), sql`length(${s.diningTables.number})`, asc(s.diningTables.number)),
    branchMenu({ branchId: branch.id, restaurantId: branch.restaurantId }),
  ]);
  const initialTableId = typeof table === "string" && tables.some((t) => t.id === table) ? table : null;
  return (
    <>
      <PageHeader title="New Order" icon="add_shopping_cart" subtitle={`${branch.name} • Key in an order for a table. It goes straight to the kitchen and onto the table's bill.`} />
      <StaffOrderPad tables={tables} initialTableId={initialTableId} menu={menu} currency={branch.currency} taxRateBp={branch.taxRateBp} />
    </>
  );
}
