"use server";

import { randomInt } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema as s } from "@/db";
import { hashPassword } from "@/lib/password";
import { ActionError, audit, getStaffContext, runAction, type ActionResult } from "@/lib/staffContext";
import { email, id, text } from "@/lib/validate";

function tempPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let p = "";
  for (let i = 0; i < 11; i++) p += alphabet[randomInt(alphabet.length)];
  return p + String(randomInt(2, 10));
}

const slug = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || `restaurant-${Date.now()}`;

/** Onboards a restaurant: the restaurant, its first branch, and its first admin (temporary password). */
export async function createRestaurant(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getStaffContext(["system_admin"]);
    const name = text(fd, "name", "Restaurant name", { max: 80 });
    const branchName = text(fd, "branchName", "First branch name", { max: 80 });
    const code = text(fd, "branchCode", "Branch code", { max: 8 }).toUpperCase();
    if (!/^[A-Z0-9]{2,8}$/.test(code)) throw new ActionError("Branch code must be 2 to 8 letters or digits.");
    const adminName = text(fd, "adminName", "Admin name", { max: 80 });
    const adminEmail = email(fd, "adminEmail");
    const password = tempPassword();
    const db = getDb();
    const [taken] = await db.select({ id: s.users.id }).from(s.users).where(sql`lower(${s.users.email}) = ${adminEmail}`);
    if (taken) throw new ActionError("An account with that admin email already exists.");
    let restaurantId = "";
    try {
      restaurantId = await db.transaction(async (tx) => {
        const [r] = await tx.insert(s.restaurants).values({ name, slug: `${slug(name)}-${randomInt(1000, 9999)}` }).returning({ id: s.restaurants.id });
        await tx.insert(s.branches).values({ restaurantId: r.id, name: branchName, code, currency: "PHP", taxRateBp: 1200 });
        await tx.insert(s.users).values({ fullName: adminName, email: adminEmail, role: "restaurant_admin", restaurantId: r.id, passwordHash: await hashPassword(password), mustChangePassword: true });
        return r.id;
      });
    } catch (e) {
      console.error(e);
      throw new ActionError("Couldn't create the restaurant. Check the details and try again.");
    }
    await audit(ctx, "restaurant.created", { type: "restaurant", id: restaurantId }, { name, branch: branchName, admin: adminEmail }, null);
    refresh();
    return `${name} created with ${branchName}. Admin ${adminEmail} temporary password: ${password} (shown only once).`;
  });
}

/** Suspending locks out all of the restaurant's staff and stops its QR codes immediately. */
export async function setRestaurantActive(restaurantId: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getStaffContext(["system_admin"]);
    const [r] = await getDb().update(s.restaurants).set({ isActive: active }).where(eq(s.restaurants.id, id(restaurantId, undefined, "Restaurant"))).returning({ name: s.restaurants.name });
    if (!r) throw new ActionError("Restaurant not found.", 404);
    await audit(ctx, active ? "restaurant.activated" : "restaurant.suspended", { type: "restaurant", id: restaurantId }, { name: r.name }, null);
    refresh();
    return active ? `${r.name} is active again.` : `${r.name} is suspended: its staff are signed out and its QR codes stop working.`;
  });
}
