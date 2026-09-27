"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema as s } from "@/db";
import { ADMINS } from "@/lib/staffAccess";
import { ActionError, audit, getStaffContext, runAction, type ActionResult } from "@/lib/staffContext";
import { bool, id, optionalText, text } from "@/lib/validate";

// Restaurant admins manage their own restaurant's branches; system admins any restaurant (the one whose
// branch is active in the sidebar).

async function adminRestaurant() {
  const ctx = await getStaffContext(ADMINS);
  const restaurantId = ctx.staff.role === "system_admin" ? ctx.branch?.restaurantId : ctx.staff.restaurantId;
  if (!restaurantId) throw new ActionError("No restaurant selected.");
  return { ctx, restaurantId };
}

export async function saveBranch(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { ctx, restaurantId } = await adminRestaurant();
    const branchId = fd.get("id") ? id(fd, "id", "Branch") : null;
    const code = text(fd, "code", "Branch code", { max: 8 }).toUpperCase();
    if (!/^[A-Z0-9]{2,8}$/.test(code)) throw new ActionError("Branch code must be 2 to 8 letters or digits (e.g. MLY).");
    const tax = text(fd, "taxRate", "VAT / tax rate", { max: 6 });
    if (!/^\d{1,2}(\.\d{1,2})?$/.test(tax)) throw new ActionError("VAT / tax rate must be a percentage like 12 or 12.5.");
    const values = {
      name: text(fd, "name", "Branch name", { max: 80 }),
      code,
      address: optionalText(fd, "address", "Address", 200),
      taxRateBp: Math.round(Number(tax) * 100),
      wifiSsid: optionalText(fd, "wifiSsid", "Wi-Fi name", 40),
      wifiPassword: optionalText(fd, "wifiPassword", "Wi-Fi password", 60),
      cashPaymentsEnabled: bool(fd, "cash"),
      onlinePaymentsEnabled: bool(fd, "online"),
      isActive: branchId ? bool(fd, "isActive") : true,
    };
    if (!values.cashPaymentsEnabled && !values.onlinePaymentsEnabled) throw new ActionError("Enable at least one payment method.");
    const db = getDb();
    try {
      if (branchId) {
        const [u] = await db
          .update(s.branches)
          .set(values)
          .where(and(eq(s.branches.id, branchId), eq(s.branches.restaurantId, restaurantId)))
          .returning({ id: s.branches.id });
        if (!u) throw new ActionError("Branch not found.", 404);
      } else {
        await db.insert(s.branches).values({ ...values, restaurantId, currency: "PHP" });
      }
    } catch (e) {
      if (e instanceof ActionError) throw e;
      throw new ActionError(`Branch code ${code} is already used.`);
    }
    await audit(ctx, branchId ? "branch.updated" : "branch.created", { type: "branch", id: branchId ?? code }, { ...values, wifiPassword: undefined }, branchId ?? null);
    refresh();
    return `${values.name} saved.${branchId ? "" : " Add its areas and tables under Tables & QR Codes after switching to it."}`;
  });
}

export async function saveRestaurantProfile(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { ctx, restaurantId } = await adminRestaurant();
    const name = text(fd, "name", "Restaurant name", { max: 80 });
    await getDb().update(s.restaurants).set({ name }).where(eq(s.restaurants.id, restaurantId));
    await audit(ctx, "restaurant.updated", { type: "restaurant", id: restaurantId }, { name }, null);
    refresh();
    return "Restaurant profile saved.";
  });
}
