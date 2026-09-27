import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { saveBranch, saveRestaurantProfile } from "./actions";
import { ActionForm } from "@/components/staff/ActionForm";
import { Badge, Card, EmptyState, Field, Icon, PageHeader, input } from "@/components/ui";
import { getDb, schema as s } from "@/db";
import { onlinePaymentsConfigured } from "@/lib/payments";
import { ADMINS } from "@/lib/staffAccess";
import { getStaffContext } from "@/lib/staffContext";

export const metadata: Metadata = { title: "Branches & Payments" };

type BranchRow = typeof s.branches.$inferSelect;

export default async function BranchesPage() {
  const ctx = await getStaffContext(ADMINS);
  const restaurantId = ctx.staff.role === "system_admin" ? ctx.branch?.restaurantId : ctx.staff.restaurantId;
  if (!restaurantId) return <EmptyState icon="storefront" title="No restaurant selected">Create a restaurant under Platform Admin first.</EmptyState>;
  const db = getDb();
  const [[restaurant], branches] = await Promise.all([
    db.select({ name: s.restaurants.name }).from(s.restaurants).where(eq(s.restaurants.id, restaurantId)),
    db.select().from(s.branches).where(eq(s.branches.restaurantId, restaurantId)).orderBy(asc(s.branches.name)),
  ]);
  const gateway = onlinePaymentsConfigured();
  const webhook = !!process.env.PAYMONGO_WEBHOOK_SECRET;

  return (
    <>
      <PageHeader title="Branches & Payments" icon="storefront" subtitle={`${restaurant.name} • Branch details, VAT and the payment methods guests can use.`} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 flex flex-col gap-5">
          {branches.map((b) => (
            <Card
              key={b.id}
              title={b.name}
              icon="storefront"
              actions={
                <span className="flex gap-1.5">
                  <Badge className="border-outline-variant/60 text-on-surface-variant">{b.code}</Badge>
                  {b.isActive ? <Badge className="border-tertiary/40 text-tertiary">Active</Badge> : <Badge className="border-error/40 text-error">Inactive</Badge>}
                </span>
              }
            >
              <ActionForm action={saveBranch} submitLabel="Save branch" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="hidden" name="id" value={b.id} />
                <BranchFields b={b} />
              </ActionForm>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-5">
          <Card title="Online payments (PayMongo)" icon="qr_code_2">
            <ul className="flex flex-col gap-2 font-body-md text-body-md">
              <li className="flex items-center gap-2">
                <Icon name={gateway ? "check_circle" : "cancel"} className={`text-[20px] ${gateway ? "text-tertiary" : "text-error"}`} />
                API keys {gateway ? "configured" : "not configured"}
              </li>
              <li className="flex items-center gap-2">
                <Icon name={webhook ? "check_circle" : "warning"} className={`text-[20px] ${webhook ? "text-tertiary" : "text-secondary"}`} />
                Webhook {webhook ? "configured" : "not configured (payments still confirm when guests return)"}
              </li>
            </ul>
            <p className="mt-3 font-body-sm text-body-sm text-on-surface-variant">
              Guests pay on PayMongo&apos;s secure page (GCash, Maya, cards). Card details never reach this system. Keys are set on the server by your system administrator (PAYMONGO_SECRET_KEY, PAYMONGO_WEBHOOK_SECRET).
            </p>
          </Card>

          <Card title="Restaurant profile" icon="restaurant">
            <ActionForm action={saveRestaurantProfile} submitLabel="Save profile">
              <Field label="Restaurant name" htmlFor="restaurant-name">
                <input id="restaurant-name" name="name" required maxLength={80} defaultValue={restaurant.name} className={input} />
              </Field>
            </ActionForm>
          </Card>

          <Card title="Add a branch" icon="add_business">
            <ActionForm action={saveBranch} submitLabel="Create branch" submitIcon="add" resetOnSuccess className="grid grid-cols-1 gap-4">
              <BranchFields />
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}

function BranchFields({ b }: { b?: BranchRow }) {
  const p = b?.id ?? "new";
  return (
    <>
      <Field label="Branch name" htmlFor={`${p}-name`}>
        <input id={`${p}-name`} name="name" required maxLength={80} defaultValue={b?.name} placeholder="e.g. Maramag Branch" className={input} />
      </Field>
      <Field label="Code" htmlFor={`${p}-code`} hint="Short code printed on QR stands.">
        <input id={`${p}-code`} name="code" required maxLength={8} defaultValue={b?.code} placeholder="MRG" className={`${input} uppercase`} />
      </Field>
      <Field label="Address" htmlFor={`${p}-address`}>
        <input id={`${p}-address`} name="address" maxLength={200} defaultValue={b?.address ?? ""} className={input} />
      </Field>
      <Field label="VAT / tax rate (%)" htmlFor={`${p}-tax`} hint="Added to every bill. 12 for Philippine VAT.">
        <input id={`${p}-tax`} name="taxRate" required inputMode="decimal" defaultValue={b ? (b.taxRateBp / 100).toString() : "12"} className={input} />
      </Field>
      <Field label="Guest Wi-Fi name" htmlFor={`${p}-ssid`}>
        <input id={`${p}-ssid`} name="wifiSsid" maxLength={40} defaultValue={b?.wifiSsid ?? ""} className={input} />
      </Field>
      <Field label="Guest Wi-Fi password" htmlFor={`${p}-wifi`} hint="Shown to guests on the menu and QR stand.">
        <input id={`${p}-wifi`} name="wifiPassword" maxLength={60} defaultValue={b?.wifiPassword ?? ""} className={input} />
      </Field>
      <fieldset className="md:col-span-2 flex flex-wrap gap-5">
        <legend className="font-label-md text-label-md text-on-surface-variant mb-2">Guest payment methods</legend>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="cash" defaultChecked={b?.cashPaymentsEnabled ?? true} className="accent-primary-container w-4 h-4" /> Cash (pay the cashier)
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="online" defaultChecked={b?.onlinePaymentsEnabled ?? false} className="accent-primary-container w-4 h-4" /> Online (GCash, Maya, cards)
        </label>
        {b && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isActive" defaultChecked={b.isActive} className="accent-primary-container w-4 h-4" /> Branch active (QR ordering on)
          </label>
        )}
      </fieldset>
    </>
  );
}
