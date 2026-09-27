"use server";

import { randomBytes } from "node:crypto";
import { and, count, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb, schema as s } from "@/db";
import { MANAGERS } from "@/lib/staffAccess";
import { ActionError, audit, requireBranch, runAction, type ActionResult } from "@/lib/staffContext";
import { id, int, optionalText, text } from "@/lib/validate";

// Tables and zones belong to one branch; every action checks the target is in the manager's active branch.

const newToken = () => randomBytes(12).toString("base64url");

async function ctxAndTable(tableId: string) {
  const ctx = await requireBranch(MANAGERS);
  const [table] = await getDb()
    .select({ id: s.diningTables.id, number: s.diningTables.number, branchId: s.diningTables.branchId })
    .from(s.diningTables)
    .where(and(eq(s.diningTables.id, id(tableId, undefined, "Table")), eq(s.diningTables.branchId, ctx.branch.id)));
  if (!table) throw new ActionError("Table not found in this branch.", 404);
  return { ctx, table };
}

async function assertZone(branchId: string, zoneId: string) {
  const [z] = await getDb()
    .select({ id: s.zones.id })
    .from(s.zones)
    .where(and(eq(s.zones.id, zoneId), eq(s.zones.branchId, branchId)));
  if (!z) throw new ActionError("Choose an area.");
}

const tableNumber = (fd: FormData) => {
  const n = text(fd, "number", "Table number", { max: 6 }).replace(/^T-?/i, "");
  if (!/^[A-Za-z0-9]{1,5}$/.test(n)) throw new ActionError("Table number can only use letters and digits (e.g. 12 or B3).");
  return n.replace(/^0+(?=\d)/, "");
};

export async function saveZone(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireBranch(MANAGERS);
    const zoneId = fd.get("id") ? id(fd, "id", "Area") : null;
    const name = text(fd, "name", "Area name", { max: 40 });
    const description = optionalText(fd, "description", "Description", 80);
    const db = getDb();
    try {
      if (zoneId) {
        const [u] = await db
          .update(s.zones)
          .set({ name, description })
          .where(and(eq(s.zones.id, zoneId), eq(s.zones.branchId, ctx.branch.id)))
          .returning({ id: s.zones.id });
        if (!u) throw new ActionError("Area not found.", 404);
      } else {
        const [{ n }] = await db.select({ n: count() }).from(s.zones).where(eq(s.zones.branchId, ctx.branch.id));
        await db.insert(s.zones).values({ branchId: ctx.branch.id, name, description, sortOrder: n });
      }
    } catch (e) {
      if (e instanceof ActionError) throw e;
      throw new ActionError(`An area named "${name}" already exists.`);
    }
    await audit(ctx, zoneId ? "table.zone_updated" : "table.zone_created", { type: "zone", id: zoneId ?? name }, { name });
    refresh();
    return `Area "${name}" saved.`;
  });
}

export async function saveTable(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireBranch(MANAGERS);
    const tableId = fd.get("id") ? id(fd, "id", "Table") : null;
    const number = tableNumber(fd);
    const seats = int(fd, "seats", "Seats", { min: 1, max: 40 })!;
    const zoneId = id(fd, "zoneId", "Area");
    await assertZone(ctx.branch.id, zoneId);
    const db = getDb();
    try {
      if (tableId) {
        const [u] = await db
          .update(s.diningTables)
          .set({ number, seats, zoneId })
          .where(and(eq(s.diningTables.id, tableId), eq(s.diningTables.branchId, ctx.branch.id)))
          .returning({ id: s.diningTables.id });
        if (!u) throw new ActionError("Table not found.", 404);
      } else {
        await db.insert(s.diningTables).values({ branchId: ctx.branch.id, zoneId, number, seats, qrToken: newToken() });
      }
    } catch (e) {
      if (e instanceof ActionError) throw e;
      throw new ActionError(`Table ${number} already exists in this branch.`);
    }
    await audit(ctx, tableId ? "table.updated" : "table.created", { type: "table", id: tableId ?? number }, { number, seats });
    refresh();
    return `Table ${number} saved.`;
  });
}

/** Issues a new QR code: the old printed code stops working immediately (e.g. a stand was photographed or stolen). */
export async function regenerateQr(tableId: string): Promise<ActionResult> {
  return runAction(async () => {
    const { ctx, table } = await ctxAndTable(tableId);
    await getDb().update(s.diningTables).set({ qrToken: newToken() }).where(eq(s.diningTables.id, table.id));
    await audit(ctx, "table.qr_regenerated", { type: "table", id: table.id }, { number: table.number });
    refresh();
    return `New QR code issued for table ${table.number}. Print and replace its stand; the old code no longer works.`;
  });
}

/** Out of service: hidden from the floor and its QR code stops accepting orders. */
export async function setTableActive(tableId: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const { ctx, table } = await ctxAndTable(tableId);
    if (!active) {
      const [open] = await getDb()
        .select({ id: s.tableSessions.id })
        .from(s.tableSessions)
        .where(and(eq(s.tableSessions.tableId, table.id), isNull(s.tableSessions.closedAt)));
      if (open) throw new ActionError("Guests are still seated here. Close their bill first.");
    }
    await getDb().update(s.diningTables).set({ isActive: active, hold: null }).where(eq(s.diningTables.id, table.id));
    await audit(ctx, active ? "table.activated" : "table.deactivated", { type: "table", id: table.id }, { number: table.number });
    refresh();
    return active ? `Table ${table.number} is back in service.` : `Table ${table.number} is out of service.`;
  });
}
