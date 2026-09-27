import "server-only";
import { and, asc, eq, inArray, type SQL } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, schema as s } from "@/db";
import { getCurrentStaff, requireStaff, requestMeta, type Staff } from "@/lib/auth";
import type { StaffRole } from "@/lib/staffAccess";

// Who is signed in, which branches they may see, and which one they're working in. Every staff page and
// action goes through here, so branch isolation is enforced in one place.

export const BRANCH_COOKIE = "synchub_branch";

export interface BranchInfo {
  id: string;
  code: string;
  name: string;
  restaurantId: string;
  restaurant: string;
  currency: string;
  taxRateBp: number;
  isActive: boolean;
}

export interface StaffContext {
  staff: Staff;
  branches: BranchInfo[];
  branch: BranchInfo | null;
}

/** SQL condition limiting branches to the ones this staff member may see. */
export function branchScope(staff: Staff): SQL | undefined {
  if (staff.role === "system_admin") return undefined;
  if (staff.role === "restaurant_admin") return eq(s.branches.restaurantId, staff.restaurantId!);
  return inArray(s.branches.id, getDb().select({ id: s.branchStaff.branchId }).from(s.branchStaff).where(eq(s.branchStaff.userId, staff.id)));
}

/**
 * The signed-in staff member and their branches. Passing `roles` (every page and action does) also enforces
 * the role and blocks everything but /account while a temporary password is still in use.
 */
export const getStaffContext = cache(async (roles?: StaffRole[]): Promise<StaffContext> => {
  const staff = await requireStaff(roles);
  if (roles && staff.mustChangePassword) redirect("/account?required=1");
  const branches = await getDb()
    .select({
      id: s.branches.id,
      code: s.branches.code,
      name: s.branches.name,
      restaurantId: s.restaurants.id,
      restaurant: s.restaurants.name,
      currency: s.branches.currency,
      taxRateBp: s.branches.taxRateBp,
      isActive: s.branches.isActive,
    })
    .from(s.branches)
    .innerJoin(s.restaurants, eq(s.restaurants.id, s.branches.restaurantId))
    .where(and(branchScope(staff), staff.role === "system_admin" ? undefined : eq(s.restaurants.isActive, true)))
    .orderBy(asc(s.restaurants.name), asc(s.branches.name));
  const wanted = (await cookies()).get(BRANCH_COOKIE)?.value;
  const branch = branches.find((b) => b.id === wanted) ?? branches.find((b) => b.isActive) ?? branches[0] ?? null;
  return { staff, branches, branch };
});

/** For polling route handlers: the context with an active branch, or a JSON 401/403 to return instead of redirecting. */
export async function apiStaffContext(roles: StaffRole[]): Promise<(StaffContext & { branch: BranchInfo }) | Response> {
  const staff = await getCurrentStaff();
  const headers = { "Cache-Control": "no-store" };
  if (!staff) return Response.json({ error: "Staff sign-in required." }, { status: 401, headers });
  if (!roles.includes(staff.role) || staff.mustChangePassword) return Response.json({ error: "Forbidden." }, { status: 403, headers });
  const ctx = await getStaffContext();
  if (!ctx.branch) return Response.json({ error: "No branch assigned." }, { status: 403, headers });
  return ctx as StaffContext & { branch: BranchInfo };
}

/** The active branch, or throws: for actions that must run inside one branch. */
export async function requireBranch(roles?: StaffRole[]) {
  const ctx = await getStaffContext(roles);
  if (!ctx.branch) throw new ActionError("No branch is assigned to your account yet. Ask an administrator.");
  return ctx as StaffContext & { branch: BranchInfo };
}

/** Throws unless the branch is one this staff member may access ("not found", so other branches' ids can't be probed). */
export async function assertBranchAccess(ctx: StaffContext, branchId: string) {
  if (!ctx.branches.some((b) => b.id === branchId)) throw new ActionError("Not found in your branches.", 404);
}

/** A user-facing error from a staff action or route (message is safe to show). */
export class ActionError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** Wraps a server action body: ActionErrors become messages, anything else is logged and hidden. */
export async function runAction(fn: () => Promise<string | void>): Promise<ActionResult> {
  try {
    const message = await fn();
    return { ok: true, message: message ?? undefined };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message };
    // Let Next's redirect()/notFound() through
    if (e && typeof e === "object" && "digest" in e && typeof e.digest === "string" && e.digest.startsWith("NEXT_")) throw e;
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Appends to the audit trail. Never throws into the caller's flow for a logging failure. */
export async function audit(ctx: StaffContext, action: string, entity?: { type: string; id: string }, details?: Record<string, unknown>, branchId?: string | null) {
  try {
    const { ip } = await requestMeta();
    const branch = branchId === undefined ? ctx.branch : ctx.branches.find((b) => b.id === branchId);
    await getDb()
      .insert(s.auditLogs)
      .values({
        userId: ctx.staff.id,
        actorName: ctx.staff.fullName,
        actorRole: ctx.staff.role,
        restaurantId: branch?.restaurantId ?? ctx.staff.restaurantId,
        branchId: branch?.id ?? null,
        action,
        entityType: entity?.type,
        entityId: entity?.id,
        details: details ? JSON.stringify(details).slice(0, 2000) : null,
        ipAddress: ip,
      });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
