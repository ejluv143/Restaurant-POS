import type { Metadata } from "next";
import { asc, desc, sql } from "drizzle-orm";
import { createRestaurant, setRestaurantActive } from "./actions";
import { ActionButton, ActionForm } from "@/components/staff/ActionForm";
import { Badge, Card, DataTable, Field, Icon, PageHeader, StatCard, btn, input } from "@/components/ui";
import { getDb, schema as s } from "@/db";
import { onlinePaymentsConfigured } from "@/lib/payments";
import { getStaffContext } from "@/lib/staffContext";

export const metadata: Metadata = { title: "Platform Admin" };

export default async function AdminPage() {
  await getStaffContext(["system_admin"]);
  const db = getDb();
  const [restaurants, [counts], failedLogins] = await Promise.all([
    db
      .select({
        id: s.restaurants.id,
        name: s.restaurants.name,
        isActive: s.restaurants.isActive,
        createdAt: s.restaurants.createdAt,
        branches: sql<number>`(select count(*) from ${s.branches} where ${s.branches.restaurantId} = ${s.restaurants.id})::int`,
        staff: sql<number>`(select count(*) from ${s.users} where ${s.users.restaurantId} = ${s.restaurants.id})::int`,
      })
      .from(s.restaurants)
      .orderBy(asc(s.restaurants.name)),
    db
      .select({
        users: sql<number>`(select count(*) from ${s.users} where ${s.users.isActive})::int`,
        sessions: sql<number>`(select count(*) from ${s.authSessions} where ${s.authSessions.expiresAt} > now())::int`,
        ordersToday: sql<number>`(select count(*) from ${s.orders} where ${s.orders.placedAt} > now() - interval '24 hours')::int`,
        failed24h: sql<number>`(select count(*) from ${s.loginAttempts} where not ${s.loginAttempts.succeeded} and ${s.loginAttempts.createdAt} > now() - interval '24 hours')::int`,
      })
      .from(sql`(select 1) as one`),
    db
      .select({ ip: s.loginAttempts.ipAddress, failures: sql<number>`count(*)::int`, emails: sql<number>`count(distinct ${s.loginAttempts.email})::int` })
      .from(s.loginAttempts)
      .where(sql`not ${s.loginAttempts.succeeded} and ${s.loginAttempts.createdAt} > now() - interval '24 hours'`)
      .groupBy(s.loginAttempts.ipAddress)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
  ]);
  const gateway = onlinePaymentsConfigured();

  return (
    <>
      <PageHeader title="Platform Admin" icon="admin_panel_settings" subtitle="Restaurants on Sync Hub Resto, platform health and security monitoring." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Restaurants" value={restaurants.length} hint={`${restaurants.filter((r) => !r.isActive).length} suspended`} icon="storefront" />
        <StatCard label="Active staff accounts" value={counts.users} hint={`${counts.sessions} signed-in sessions`} icon="badge" tone="secondary" />
        <StatCard label="Orders (24 h)" value={counts.ordersToday} icon="receipt_long" tone="tertiary" />
        <StatCard label="Failed sign-ins (24 h)" value={counts.failed24h} hint="Accounts lock for 15 min after 5 failures" icon="gpp_maybe" tone={counts.failed24h > 20 ? "error" : "neutral"} />
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <Card title="Restaurants" icon="storefront" className="xl:col-span-2">
          <DataTable head={["Restaurant", "Branches", "Staff", "Since", "Status", ""]}>
            {restaurants.map((r) => (
              <tr key={r.id}>
                <td className="py-2.5 pr-4 text-on-surface">{r.name}</td>
                <td className="py-2.5 pr-4 tabular-nums">{r.branches}</td>
                <td className="py-2.5 pr-4 tabular-nums">{r.staff}</td>
                <td className="py-2.5 pr-4 text-on-surface-variant whitespace-nowrap">{r.createdAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}</td>
                <td className="py-2.5 pr-4">{r.isActive ? <Badge className="border-tertiary/40 text-tertiary">Active</Badge> : <Badge className="border-error/40 text-error">Suspended</Badge>}</td>
                <td className="py-2.5 pr-4">
                  <ActionButton
                    action={setRestaurantActive.bind(null, r.id, !r.isActive)}
                    label={r.isActive ? "Suspend" : "Reactivate"}
                    icon={r.isActive ? "block" : "check_circle"}
                    confirm={r.isActive ? `Suspend ${r.name}? All its staff are signed out and its QR codes stop working.` : undefined}
                    className={btn.ghost}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
          <p className="mt-3 font-body-sm text-body-sm text-outline">To manage a restaurant&apos;s branches, menu or staff, switch to one of its branches in the sidebar.</p>
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Onboard a restaurant" icon="add_business">
            <ActionForm action={createRestaurant} submitLabel="Create restaurant" submitIcon="add" resetOnSuccess>
              <Field label="Restaurant name" htmlFor="r-name">
                <input id="r-name" name="name" required maxLength={80} className={input} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="First branch" htmlFor="r-branch">
                    <input id="r-branch" name="branchName" required maxLength={80} placeholder="e.g. Main Branch" className={input} />
                  </Field>
                </div>
                <Field label="Code" htmlFor="r-code">
                  <input id="r-code" name="branchCode" required maxLength={8} placeholder="MAIN" className={`${input} uppercase`} />
                </Field>
              </div>
              <Field label="Admin full name" htmlFor="r-admin">
                <input id="r-admin" name="adminName" required maxLength={80} className={input} />
              </Field>
              <Field label="Admin email" htmlFor="r-email">
                <input id="r-email" name="adminEmail" type="email" required maxLength={254} autoComplete="off" className={input} />
              </Field>
            </ActionForm>
          </Card>

          <Card title="Platform status" icon="monitor_heart">
            <ul className="flex flex-col gap-2 font-body-md text-body-md">
              <Status ok label="Database connected" />
              <Status ok={gateway} label={gateway ? "PayMongo keys configured" : "PayMongo keys missing (online payment off)"} />
              <Status ok={!!process.env.PAYMONGO_WEBHOOK_SECRET} label={process.env.PAYMONGO_WEBHOOK_SECRET ? "PayMongo webhook configured" : "PayMongo webhook not configured"} />
              <Status ok={process.env.NODE_ENV === "production"} label={process.env.NODE_ENV === "production" ? "Production mode (secure cookies)" : "Development mode"} />
            </ul>
          </Card>

          <Card title="Failed sign-ins by IP (24 h)" icon="gpp_maybe">
            {failedLogins.length === 0 ? (
              <p className="text-on-surface-variant">None.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 font-body-md text-body-md">
                {failedLogins.map((f) => (
                  <li key={f.ip ?? "unknown"} className="flex justify-between gap-3">
                    <code className="font-mono text-[12px] text-on-surface-variant">{f.ip ?? "unknown"}</code>
                    <span className={`tabular-nums ${f.failures >= 20 ? "text-error" : "text-on-surface"}`}>
                      {f.failures} fails / {f.emails} emails
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <Icon name={ok ? "check_circle" : "error"} className={`text-[20px] ${ok ? "text-tertiary" : "text-secondary"}`} />
      {label}
    </li>
  );
}
