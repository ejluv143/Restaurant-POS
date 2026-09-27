import type { NextRequest } from "next/server";
import { dailySales, paymentRows, parseRange, reportBranches, staffTransactions, topItems } from "@/lib/reports";
import { rolesFor } from "@/lib/staffAccess";
import { apiStaffContext, audit } from "@/lib/staffContext";

// Neutralizes spreadsheet formula injection (a cell starting with = + - @ runs as a formula in Excel)
const cell = (v: unknown) => {
  const t = v === null || v === undefined ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const csv = (rows: unknown[][]) => rows.map((r) => r.map(cell).join(",")).join("\r\n");
const pesos = (cents: number) => (cents / 100).toFixed(2);

// GET /api/staff/reports/export?type=payments|daily|items|staff&from=&to=&branch= — CSV for Excel / Sheets
export async function GET(request: NextRequest) {
  const ctx = await apiStaffContext(rolesFor("/reports"));
  if (ctx instanceof Response) return ctx;
  const p = request.nextUrl.searchParams;
  const range = parseRange(p.get("from"), p.get("to"));
  const branchIds = reportBranches(ctx, p.get("branch"));
  const type = p.get("type");

  let body: string;
  if (type === "payments") {
    const rows = await paymentRows(branchIds, range);
    body = csv([["Date/time", "Branch", "Table", "Method", "Channel", "Status", "Amount (PHP)", "Reference", "Received by"], ...rows.map((r) => [r.paid_at, r.branch, r.table_number, r.method, r.channel, r.status, pesos(r.amount_cents), r.reference_number, r.received_by])]);
  } else if (type === "daily") {
    const rows = await dailySales(branchIds, range);
    body = csv([["Date", "Sales (PHP)", "Orders"], ...rows.map((r) => [r.day, pesos(r.cents), r.orders])]);
  } else if (type === "items") {
    const rows = await topItems(branchIds, range, 500);
    body = csv([["Item", "Category", "Quantity sold", "Revenue before VAT (PHP)"], ...rows.map((r) => [r.name, r.category, r.quantity, pesos(r.cents)])]);
  } else if (type === "staff") {
    const rows = await staffTransactions(branchIds, range);
    body = csv([["Staff", "Role", "Payments taken", "Amount (PHP)"], ...rows.map((r) => [r.name, r.role, r.payments, pesos(r.cents)])]);
  } else {
    return Response.json({ error: "Unknown report type." }, { status: 400 });
  }

  await audit(ctx, "report.exported", { type: "report", id: type }, { ...range, branches: branchIds.length });
  // BOM so Excel opens the UTF-8 file (₱, ñ) correctly
  return new Response(`﻿${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="synchub-${type}-${range.from}-to-${range.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
