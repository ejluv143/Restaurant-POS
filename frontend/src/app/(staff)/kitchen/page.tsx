import type { Metadata } from "next";
import KitchenBoard from "@/components/staff/KitchenBoard";
import { EmptyState, PageHeader } from "@/components/ui";
import { getAvailability, getKitchenBoard } from "@/lib/operations";
import { MANAGERS, rolesFor } from "@/lib/staffAccess";
import { getStaffContext } from "@/lib/staffContext";

export const metadata: Metadata = { title: "Kitchen Display" };

export default async function KitchenPage() {
  const ctx = await getStaffContext(rolesFor("/kitchen"));
  if (!ctx.branch) return <EmptyState icon="storefront" title="No branch assigned">Ask an administrator to assign you to a branch.</EmptyState>;
  const [board, availability] = await Promise.all([getKitchenBoard(ctx.branch.id), getAvailability(ctx)]);
  return (
    <>
      <PageHeader title="Kitchen Display" icon="skillet" subtitle={`${ctx.branch.name} • Accept, cook and send out every ticket. Guests see each step on their phone.`} />
      <KitchenBoard initial={board} availability={availability} canCancel={MANAGERS.includes(ctx.staff.role)} />
    </>
  );
}
