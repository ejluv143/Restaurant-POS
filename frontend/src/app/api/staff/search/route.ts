import type { NextRequest } from "next/server";
import { and, desc, eq, ilike, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ADMINS, ALL_STAFF, MANAGERS, ROLE_LABEL, SCREENS, canAccess } from "@/lib/staffAccess";
import { apiStaffContext } from "@/lib/staffContext";
import type { SearchResult } from "@/lib/staffDto";
import { orderNumber, tableLabel } from "@/lib/tableOrder";

const LIMIT = 5;
const escapeLike = (v: string) => v.replace(/[%_\\]/g, "\\$&");

// GET /api/staff/search?q= — header search across the screens and data the signed-in role may open,
// scoped to their active branch (staff: their branches' people). Nothing outside that scope is returned.
export async function GET(request: NextRequest) {
  const ctx = await apiStaffContext(ALL_STAFF);
  if (ctx instanceof Response) return ctx;
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  const headers = { "Cache-Control": "no-store" };
  if (q.length < 1) return Response.json({ results: [] }, { headers });

  const { staff, branch } = ctx;
  const can = (path: string) => canAccess(staff.role, path);
  const like = `%${escapeLike(q)}%`;
  const db = getDb();
  const results: SearchResult[] = [];

  // Screens (no database)
  const ql = q.toLowerCase();
  for (const sc of SCREENS) if (sc.roles.includes(staff.role) && sc.label.toLowerCase().includes(ql)) results.push({ group: "Screens", label: sc.label, detail: sc.group, href: sc.href, icon: sc.icon });

  const jobs: Promise<void>[] = [];

  // Tables: "5", "T-05", "t5"
  const tableNo = q.match(/^t?-?0*(\w{1,5})$/i)?.[1];
  if (tableNo && (can("/floor") || can("/cashier"))) {
    jobs.push(
      db
        .select({ number: s.diningTables.number, zone: s.zones.name, sessionId: s.tableSessions.id })
        .from(s.diningTables)
        .innerJoin(s.zones, eq(s.zones.id, s.diningTables.zoneId))
        .leftJoin(s.tableSessions, and(eq(s.tableSessions.tableId, s.diningTables.id), isNull(s.tableSessions.closedAt)))
        .where(and(eq(s.diningTables.branchId, branch.id), eq(s.diningTables.isActive, true), ilike(s.diningTables.number, `${escapeLike(tableNo)}%`)))
        .limit(LIMIT)
        .then((rows) => {
          for (const t of rows)
            results.push({
              group: "Tables",
              label: tableLabel(t.number),
              detail: `${t.zone} • ${t.sessionId ? "Guests seated" : "Free"}`,
              href: t.sessionId && can("/cashier") ? `/cashier?bill=${t.sessionId}` : "/floor",
              icon: "table_restaurant",
            });
        }),
    );
  }

  // Orders: "1140", "#1140", "SH-2026-001140"
  const ticket = q.match(/^(?:sh-?\d{4}-?|#)?0*(\d{1,9})$/i)?.[1];
  if (ticket && (can("/cashier") || can("/kitchen"))) {
    jobs.push(
      db
        .select({ ticketNumber: s.orders.ticketNumber, placedAt: s.orders.placedAt, status: s.orders.status, sessionId: s.orders.sessionId, tableNumber: s.diningTables.number })
        .from(s.orders)
        .innerJoin(s.tableSessions, eq(s.tableSessions.id, s.orders.sessionId))
        .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
        .where(and(eq(s.diningTables.branchId, branch.id), sql`${s.orders.ticketNumber}::text like ${`${ticket}%`}`))
        .orderBy(desc(s.orders.placedAt))
        .limit(LIMIT)
        .then((rows) => {
          for (const o of rows)
            results.push({
              group: "Orders",
              label: orderNumber(o.ticketNumber, o.placedAt),
              detail: `${tableLabel(o.tableNumber)} • ${o.status} • ${o.placedAt.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`,
              href: can("/cashier") ? `/cashier?bill=${o.sessionId}` : "/kitchen",
              icon: "receipt_long",
            });
        }),
    );
  }

  // Menu items
  if (can("/menu") && q.length >= 2) {
    const admin = ADMINS.includes(staff.role);
    jobs.push(
      db
        .select({ id: s.menuItems.id, name: s.menuItems.name, category: s.menuCategories.name, priceCents: s.menuItems.priceCents })
        .from(s.menuItems)
        .innerJoin(s.menuCategories, eq(s.menuCategories.id, s.menuItems.categoryId))
        .where(and(eq(s.menuCategories.restaurantId, branch.restaurantId), eq(s.menuItems.isActive, true), ilike(s.menuItems.name, like)))
        .limit(LIMIT)
        .then((rows) => {
          for (const m of rows) results.push({ group: "Menu", label: m.name, detail: `${m.category} • ₱${(m.priceCents / 100).toFixed(2)}`, href: admin ? `/menu/${m.id}` : "/menu", icon: "restaurant_menu" });
        }),
    );
  }

  // Staff (managers and up, within the people they may manage)
  if (MANAGERS.includes(staff.role) && q.length >= 2) {
    let scope: SQL | undefined;
    if (staff.role === "restaurant_admin") scope = and(eq(s.users.restaurantId, staff.restaurantId!), ne(s.users.role, "system_admin"));
    else if (staff.role === "branch_manager")
      scope = and(
        inArray(s.users.role, ["cashier", "kitchen"]),
        inArray(s.users.id, db.select({ id: s.branchStaff.userId }).from(s.branchStaff).where(inArray(s.branchStaff.branchId, ctx.branches.map((b) => b.id)))),
      );
    jobs.push(
      db
        .select({ fullName: s.users.fullName, email: s.users.email, role: s.users.role, isActive: s.users.isActive })
        .from(s.users)
        .where(and(scope, or(ilike(s.users.fullName, like), ilike(s.users.email, like))))
        .limit(LIMIT)
        .then((rows) => {
          for (const u of rows) results.push({ group: "Staff", label: u.fullName, detail: `${ROLE_LABEL[u.role]}${u.isActive ? "" : " • Suspended"}`, href: "/staff", icon: "badge" });
        }),
    );
  }

  await Promise.all(jobs);
  const order = ["Screens", "Tables", "Orders", "Menu", "Staff"];
  results.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  return Response.json({ results }, { headers });
}
