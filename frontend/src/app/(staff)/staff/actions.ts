"use server";

import { randomInt } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema as s } from "@/db";
import { revokeUserSessions } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { MANAGERS, ROLE_LABEL, manageableRoles, type StaffRole } from "@/lib/staffAccess";
import { ActionError, audit, getStaffContext, runAction, type ActionResult, type StaffContext } from "@/lib/staffContext";
import { email, id, ids, text } from "@/lib/validate";

// Staff accounts. Scope rules (checked here, not just hidden in the UI):
//   system admin → anyone; restaurant admin → their restaurant; branch manager → cashiers/kitchen in their branches.
// Nobody can change their own role or suspend themselves.

/** A 12-character temporary password (no look-alike characters), shown once to the admin. */
function tempPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let p = "";
  for (let i = 0; i < 11; i++) p += alphabet[randomInt(alphabet.length)];
  return p + String(randomInt(2, 10));
}

async function targetUser(ctx: StaffContext, userId: string) {
  const db = getDb();
  const [u] = await db
    .select({ id: s.users.id, fullName: s.users.fullName, email: s.users.email, role: s.users.role, restaurantId: s.users.restaurantId, isActive: s.users.isActive })
    .from(s.users)
    .where(eq(s.users.id, id(userId, undefined, "User")));
  if (!u) throw new ActionError("User not found.", 404);
  const role = ctx.staff.role;
  const allowed =
    role === "system_admin" ||
    (role === "restaurant_admin" && u.restaurantId === ctx.staff.restaurantId && u.role !== "system_admin") ||
    (role === "branch_manager" &&
      (u.role === "cashier" || u.role === "kitchen") &&
      (await db
        .select({ b: s.branchStaff.branchId })
        .from(s.branchStaff)
        .where(and(eq(s.branchStaff.userId, u.id), inArray(s.branchStaff.branchId, ctx.branches.map((b) => b.id)))))
        .length > 0);
  if (!allowed) throw new ActionError("User not found.", 404);
  return u;
}

/** Branch ids from the form, limited to branches the actor may assign (and to one restaurant). */
function pickBranches(ctx: StaffContext, fd: FormData, restaurantId: string | null) {
  const wanted = ids(fd, "branches");
  return ctx.branches.filter((b) => wanted.includes(b.id) && (restaurantId === null || b.restaurantId === restaurantId)).map((b) => b.id);
}

export async function createStaff(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getStaffContext(MANAGERS);
    const role = text(fd, "role", "Role", { max: 30 }) as StaffRole;
    if (!manageableRoles(ctx.staff.role).includes(role)) throw new ActionError("You can't create that role.");
    const fullName = text(fd, "fullName", "Full name", { max: 80 });
    const address = email(fd);
    const restaurantId = role === "system_admin" ? null : (ctx.branch?.restaurantId ?? ctx.staff.restaurantId);
    if (role !== "system_admin" && !restaurantId) throw new ActionError("Choose a branch first (top of the sidebar).");
    const branchIds = pickBranches(ctx, fd, restaurantId);
    if ((role === "cashier" || role === "kitchen" || role === "branch_manager") && branchIds.length === 0) throw new ActionError("Assign at least one branch.");

    const password = tempPassword();
    const db = getDb();
    const [existing] = await db.select({ id: s.users.id }).from(s.users).where(sql`lower(${s.users.email}) = ${address}`);
    if (existing) throw new ActionError("An account with that email already exists.");
    const created = await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(s.users)
        .values({ fullName, email: address, role, restaurantId, passwordHash: await hashPassword(password), mustChangePassword: true })
        .returning({ id: s.users.id });
      if (branchIds.length && role !== "restaurant_admin" && role !== "system_admin") await tx.insert(s.branchStaff).values(branchIds.map((branchId) => ({ branchId, userId: u.id })));
      return u;
    });
    await audit(ctx, "user.created", { type: "user", id: created.id }, { name: fullName, email: address, role, branches: branchIds.length });
    refresh();
    return `${fullName} (${ROLE_LABEL[role]}) created. Temporary password: ${password} (shown only once). They'll set their own password at first sign-in.`;
  });
}

export async function updateStaff(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getStaffContext(MANAGERS);
    const user = await targetUser(ctx, String(fd.get("id") ?? ""));
    const fullName = text(fd, "fullName", "Full name", { max: 80 });
    const role = text(fd, "role", "Role", { max: 30 }) as StaffRole;
    if (user.id === ctx.staff.id && role !== user.role) throw new ActionError("You can't change your own role.");
    if (role !== user.role && !manageableRoles(ctx.staff.role).includes(role)) throw new ActionError("You can't assign that role.");
    if ((role === "system_admin") !== (user.role === "system_admin")) throw new ActionError("System admin accounts can't be converted. Create a new account instead.");
    const branchIds = pickBranches(ctx, fd, user.restaurantId);
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.update(s.users).set({ fullName, role }).where(eq(s.users.id, user.id));
      // Only touch assignments to branches the actor manages; leave others (e.g. another manager's) as they are
      const mine = ctx.branches.map((b) => b.id);
      await tx.delete(s.branchStaff).where(and(eq(s.branchStaff.userId, user.id), inArray(s.branchStaff.branchId, mine)));
      if (branchIds.length && (role === "cashier" || role === "kitchen" || role === "branch_manager")) await tx.insert(s.branchStaff).values(branchIds.map((branchId) => ({ branchId, userId: user.id })));
    });
    if (role !== user.role) await revokeUserSessions(user.id);
    await audit(ctx, "user.updated", { type: "user", id: user.id }, { name: fullName, role, previousRole: role !== user.role ? user.role : undefined, branches: branchIds.length });
    refresh();
    return `${fullName} updated.${role !== user.role ? " They've been signed out so the new role takes effect." : ""}`;
  });
}

export async function setStaffActive(userId: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getStaffContext(MANAGERS);
    const user = await targetUser(ctx, userId);
    if (user.id === ctx.staff.id) throw new ActionError("You can't suspend your own account.");
    await getDb().update(s.users).set({ isActive: active }).where(eq(s.users.id, user.id));
    if (!active) await revokeUserSessions(user.id);
    await audit(ctx, active ? "user.activated" : "user.suspended", { type: "user", id: user.id }, { name: user.fullName });
    refresh();
    return active ? `${user.fullName} can sign in again.` : `${user.fullName} is suspended and signed out everywhere.`;
  });
}

export async function resetStaffPassword(userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getStaffContext(MANAGERS);
    const user = await targetUser(ctx, userId);
    if (user.id === ctx.staff.id) throw new ActionError("Change your own password under My Account.");
    const password = tempPassword();
    await getDb()
      .update(s.users)
      .set({ passwordHash: await hashPassword(password), mustChangePassword: true })
      .where(eq(s.users.id, user.id));
    await revokeUserSessions(user.id);
    await audit(ctx, "user.password_reset", { type: "user", id: user.id }, { name: user.fullName });
    return `Temporary password for ${user.fullName}: ${password} (shown only once). They must change it at next sign-in.`;
  });
}
