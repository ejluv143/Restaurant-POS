import type { Metadata } from "next";
import FloorBoard from "@/components/staff/FloorBoard";
import { EmptyState, PageHeader } from "@/components/ui";
import { getFloor } from "@/lib/operations";
import { rolesFor } from "@/lib/staffAccess";
import { getStaffContext } from "@/lib/staffContext";

export const metadata: Metadata = { title: "Floor & Tables" };

export default async function FloorPage() {
  const ctx = await getStaffContext(rolesFor("/floor"));
  if (!ctx.branch) return <EmptyState icon="storefront" title="No branch assigned">Ask an administrator to assign you to a branch.</EmptyState>;
  const tables = await getFloor(ctx.branch.id);
  return (
    <>
      <PageHeader title="Floor & Tables" icon="table_restaurant" subtitle={`${ctx.branch.name} • Live table status, guest calls and food ready to serve.`} />
      {tables.length === 0 ? (
        <EmptyState icon="table_restaurant" title="No tables yet">A manager can add tables under Tables &amp; QR Codes.</EmptyState>
      ) : (
        <FloorBoard initial={{ tables, serverTime: new Date().toISOString() }} currency={ctx.branch.currency} />
      )}
    </>
  );
}
