import type { Metadata } from "next";
import { and, asc, eq, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { createStaff, resetStaffPassword, setStaffActive, updateStaff } from "./actions";
import { ActionButton, ActionForm } from "@/components/staff/ActionForm";
import { Badge, Card, Field, PageHeader, btn, input } from "@/components/ui";
import { getDb, schema as s } from "@/db";
import { MANAGERS, ROLE_LABEL, manageableRoles, type StaffRole } from "@/lib/staffAccess";
import { getStaffContext, type StaffContext } from "@/lib/staffContext";

export const metadata: Metadata = { title: "Staff Accounts" };

function visibleUsers(ctx: StaffContext): SQL | undefined {
  if (ctx.staff.role === "system_admin") return undefined;
  if (ctx.staff.role === "restaurant_admin") return and(eq(s.users.restaurantId, ctx.staff.restaurantId!), ne(s.users.role, "system_admin"));
  // Branch managers: themselves plus the cashiers and kitchen staff of their branches
  const mine = getDb().select({ id: s.branchStaff.userId }).from(s.branchStaff).where(inArray(s.branchStaff.branchId, ctx.branches.map((b) => b.id)));
  return or(eq(s.users.id, ctx.staff.id), and(inArray(s.users.role, ["cashier", "kitchen"]), inArray(s.users.id, mine)));
}

export default async function StaffPage() {
  const ctx = await getStaffContext(MANAGERS);
  const db = getDb();
  const users = await db
    .select({
      id: s.users.id,
      fullName: s.users.fullName,
      email: s.users.email,
      role: s.users.role,
      isActive: s.users.isActive,
      mustChangePassword: s.users.mustChangePassword,
      lastLoginAt: s.users.lastLoginAt,
      restaurant: s.restaurants.name,
      branchIds: sql<string[]>`coalesce((select array_agg(${s.branchStaff.branchId}) from ${s.branchStaff} where ${s.branchStaff.userId} = ${s.users.id}), '{}')`,
    })
    .from(s.users)
    .leftJoin(s.restaurants, eq(s.restaurants.id, s.users.restaurantId))
    .where(visibleUsers(ctx))
    .orderBy(asc(s.users.role), asc(s.users.fullName));
  const roles = manageableRoles(ctx.staff.role);
  const branchName = (id: string) => ctx.branches.find((b) => b.id === id)?.name;
  const assignable = ctx.branches.filter((b) => !ctx.branch || b.restaurantId === ctx.branch.restaurantId);

  return (
    <>
      <PageHeader title="Staff Accounts" icon="badge" subtitle={`${users.length} accounts you can manage. New accounts get a one-time temporary password.`} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <Card title="Team" icon="groups" className="xl:col-span-2" padded={false}>
          <ul className="divide-y divide-outline-variant/20">
            {users.map((u) => {
              const self = u.id === ctx.staff.id;
              const manageable = !self && (roles.includes(u.role) || ctx.staff.role === "system_admin");
              return (
                <li key={u.id} className="px-5 py-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-label-lg text-label-lg text-on-surface flex flex-wrap items-center gap-2">
                        {u.fullName}
                        {self && <Badge className="border-primary/40 text-primary">You</Badge>}
                        {!u.isActive && <Badge className="border-error/40 text-error">Suspended</Badge>}
                        {u.mustChangePassword && <Badge className="border-secondary/40 text-secondary">Temp password</Badge>}
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{u.email}</p>
                      <p className="font-body-sm text-body-sm text-outline">
                        {ROLE_LABEL[u.role]}
                        {u.restaurant && ctx.staff.role === "system_admin" ? ` • ${u.restaurant}` : ""}
                        {u.branchIds.length > 0 && ` • ${u.branchIds.map(branchName).filter(Boolean).join(", ")}`}
                        {` • Last sign-in ${u.lastLoginAt ? u.lastLoginAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "never"}`}
                      </p>
                    </div>
                    {manageable && (
                      <div className="flex flex-wrap items-center gap-1">
                        <ActionButton action={resetStaffPassword.bind(null, u.id)} label="Reset password" icon="key" confirm="Their current password stops working. Continue?" className={btn.ghost} />
                        <ActionButton
                          action={setStaffActive.bind(null, u.id, !u.isActive)}
                          label={u.isActive ? "Suspend" : "Reactivate"}
                          icon={u.isActive ? "person_off" : "person_check"}
                          confirm={u.isActive ? `Suspend ${u.fullName} and sign them out?` : undefined}
                          className={btn.ghost}
                        />
                      </div>
                    )}
                  </div>
                  {manageable && (
                    <details>
                      <summary className="cursor-pointer font-body-sm text-body-sm text-primary">Edit role &amp; branches</summary>
                      <ActionForm action={updateStaff} submitLabel="Save" className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="hidden" name="id" value={u.id} />
                        <StaffFields roles={roles.includes(u.role) ? roles : [u.role, ...roles]} branches={assignable} name={u.fullName} role={u.role} branchIds={u.branchIds} prefix={u.id} />
                      </ActionForm>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Add staff member" icon="person_add">
          <ActionForm action={createStaff} submitLabel="Create account" submitIcon="person_add" resetOnSuccess>
            <Field label="Email" htmlFor="new-email">
              <input id="new-email" name="email" type="email" required maxLength={254} autoComplete="off" className={input} />
            </Field>
            <StaffFields roles={roles} branches={assignable} prefix="new" />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}

function StaffFields({ roles, branches, name, role, branchIds = [], prefix }: { roles: StaffRole[]; branches: { id: string; name: string }[]; name?: string; role?: StaffRole; branchIds?: string[]; prefix: string }) {
  return (
    <>
      <Field label="Full name" htmlFor={`${prefix}-name`}>
        <input id={`${prefix}-name`} name="fullName" required maxLength={80} defaultValue={name} className={input} />
      </Field>
      <Field label="Role" htmlFor={`${prefix}-role`}>
        <select id={`${prefix}-role`} name="role" defaultValue={role ?? roles[0]} className={input}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="md:col-span-2 flex flex-col gap-1.5">
        <legend className="font-label-md text-label-md text-on-surface-variant mb-1">Branches (cashier, kitchen and branch managers)</legend>
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <label key={b.id} className="flex items-center gap-2 rounded-full bg-surface-container px-3 py-1.5 cursor-pointer">
              <input type="checkbox" name="branches" value={b.id} defaultChecked={branchIds.includes(b.id) || (prefix === "new" && branches.length === 1)} className="accent-primary-container w-4 h-4" />
              <span className="text-on-surface">{b.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
