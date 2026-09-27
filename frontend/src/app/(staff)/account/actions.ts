"use server";

import { redirect } from "next/navigation";
import { changeOwnPassword } from "@/lib/auth";
import { allow } from "@/lib/rateLimit";
import { homeFor } from "@/lib/staffAccess";
import { ActionError, audit, getStaffContext, runAction, type ActionResult } from "@/lib/staffContext";
import { newPassword } from "@/lib/validate";

export async function changePassword(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let done: string | null = null;
  const result = await runAction(async () => {
    // No role list: this is the one action allowed while a temporary password is in use
    const ctx = await getStaffContext();
    if (!allow(`pw:${ctx.staff.id}`, 5, 15 * 60_000)) throw new ActionError("Too many attempts. Try again in 15 minutes.");
    const current = String(fd.get("current") ?? "");
    const next = newPassword(fd, "password", "confirm");
    if (next === current) throw new ActionError("Choose a password different from your current one.");
    if (next.toLowerCase().includes(ctx.staff.email.split("@")[0].toLowerCase())) throw new ActionError("Don't use your email name in your password.");
    if (!(await changeOwnPassword(ctx.staff, current, next))) throw new ActionError("Your current password is incorrect.");
    await audit(ctx, "user.password_changed", { type: "user", id: ctx.staff.id });
    done = ctx.staff.mustChangePassword ? homeFor(ctx.staff.role) : null;
    return "Password changed. Your other devices have been signed out.";
  });
  if (done) redirect(done);
  return result;
}
