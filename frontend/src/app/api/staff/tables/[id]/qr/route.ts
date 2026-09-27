import { and, eq, inArray } from "drizzle-orm";
import QRCode from "qrcode";
import { getDb, schema as s } from "@/db";
import { guestOrderOrigin } from "@/lib/origin";
import { MANAGERS } from "@/lib/staffAccess";
import { apiStaffContext } from "@/lib/staffContext";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/staff/tables/:id/qr — download one table's QR code as SVG (managers, for print shops / engraving)
export async function GET(_request: Request, ctx: RouteContext<"/api/staff/tables/[id]/qr">) {
  const staff = await apiStaffContext(MANAGERS);
  if (staff instanceof Response) return staff;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "Table not found." }, { status: 404 });
  const [table] = await getDb()
    .select({ number: s.diningTables.number, qrToken: s.diningTables.qrToken, code: s.branches.code })
    .from(s.diningTables)
    .innerJoin(s.branches, eq(s.branches.id, s.diningTables.branchId))
    .where(and(eq(s.diningTables.id, id), inArray(s.diningTables.branchId, staff.branches.map((b) => b.id))));
  if (!table) return Response.json({ error: "Table not found." }, { status: 404 });
  const svg = await QRCode.toString(`${await guestOrderOrigin()}/order/table/${table.qrToken}`, { type: "svg", margin: 2, errorCorrectionLevel: "H" });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="${table.code.toLowerCase()}-table-${table.number}-qr.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
