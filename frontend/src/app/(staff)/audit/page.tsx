import type { Metadata } from "next";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Badge, Card, DataTable, Icon, PageHeader, btn, input } from "@/components/ui";
import { getDb, schema as s } from "@/db";
import { parseRange, REPORT_TZ } from "@/lib/reports";
import { ADMINS, ROLE_LABEL } from "@/lib/staffAccess";
import { getStaffContext } from "@/lib/staffContext";

export const metadata: Metadata = { title: "Audit Log" };

const PAGE = 50;
const AREAS = [
  ["", "All activity"],
  ["auth.", "Sign-in / sign-out"],
  ["order.", "Orders"],
  ["payment.", "Payments & refunds"],
  ["bill.", "Bills closed"],
  ["menu.", "Menu changes"],
  ["table.", "Tables & QR codes"],
  ["user.", "Users & permissions"],
  ["branch.", "Branches"],
  ["restaurant.", "Restaurants"],
  ["report.", "Report exports"],
] as const;

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  const ctx = await getStaffContext(ADMINS);
  const sp = await searchParams;
  const range = parseRange(sp.from ?? undefined, sp.to);
  const area = typeof sp.area === "string" && AREAS.some(([a]) => a === sp.area) ? sp.area : "";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const page = Math.max(0, Math.min(1000, Number(sp.page) || 0));

  const where = and(
    // Restaurant admins only ever see their own restaurant's trail
    ctx.staff.role === "system_admin" ? undefined : eq(s.auditLogs.restaurantId, ctx.staff.restaurantId!),
    sql`${s.auditLogs.createdAt} >= ((${range.from}::date)::timestamp at time zone ${REPORT_TZ}) and ${s.auditLogs.createdAt} < (((${range.to}::date) + 1)::timestamp at time zone ${REPORT_TZ})`,
    area ? ilike(s.auditLogs.action, `${area}%`) : undefined,
    q ? or(ilike(s.auditLogs.actorName, `%${q.replace(/[%_\\]/g, "\\$&")}%`), ilike(s.auditLogs.details, `%${q.replace(/[%_\\]/g, "\\$&")}%`)) : undefined,
  );
  const rows = await getDb()
    .select({
      id: s.auditLogs.id,
      createdAt: s.auditLogs.createdAt,
      actorName: s.auditLogs.actorName,
      actorRole: s.auditLogs.actorRole,
      action: s.auditLogs.action,
      entityType: s.auditLogs.entityType,
      details: s.auditLogs.details,
      ipAddress: s.auditLogs.ipAddress,
      branch: s.branches.name,
    })
    .from(s.auditLogs)
    .leftJoin(s.branches, eq(s.branches.id, s.auditLogs.branchId))
    .where(where)
    .orderBy(desc(s.auditLogs.createdAt))
    .limit(PAGE + 1)
    .offset(page * PAGE);
  const more = rows.length > PAGE;
  const link = (p: number) => `?${new URLSearchParams({ from: range.from, to: range.to, area, q, page: String(p) })}`;

  return (
    <>
      <PageHeader title="Audit Log" icon="policy" subtitle="Who did what and when: sign-ins, orders, payments, refunds, menu, table and user changes. Entries can't be edited or deleted." />
      <form method="get" className="mb-5 rounded-xl bg-surface-container-low border border-outline-variant/30 p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface-variant">From</span>
          <input type="date" name="from" defaultValue={range.from} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface-variant">To</span>
          <input type="date" name="to" defaultValue={range.to} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface-variant">Activity</span>
          <select name="area" defaultValue={area} className={input}>
            {AREAS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 flex-1 min-w-48">
          <span className="font-label-md text-label-md text-on-surface-variant">Search staff or details</span>
          <input type="search" name="q" defaultValue={q} maxLength={60} className={input} />
        </label>
        <button type="submit" className={btn.primary}>
          <Icon name="filter_alt" className="text-[18px]" />
          Filter
        </button>
      </form>

      <Card padded>
        <DataTable head={["When", "Who", "Action", "Branch", "Details", "IP"]} empty={rows.length === 0 && <p className="py-8 text-center text-on-surface-variant">No activity matches these filters.</p>}>
          {rows.slice(0, PAGE).map((r) => (
            <tr key={r.id} className="align-top">
              <td className="py-2.5 pr-4 whitespace-nowrap text-on-surface-variant">{r.createdAt.toLocaleString("en-PH", { timeZone: REPORT_TZ, dateStyle: "medium", timeStyle: "short" })}</td>
              <td className="py-2.5 pr-4">
                <span className="block text-on-surface">{r.actorName ?? "System"}</span>
                <span className="block font-body-sm text-body-sm text-outline">{r.actorRole ? ROLE_LABEL[r.actorRole] : ""}</span>
              </td>
              <td className="py-2.5 pr-4">
                <Badge className={r.action.includes("refund") || r.action.includes("cancel") || r.action.includes("suspend") ? "border-error/40 text-error" : "border-outline-variant/60 text-on-surface-variant"}>{r.action}</Badge>
              </td>
              <td className="py-2.5 pr-4 text-on-surface-variant">{r.branch ?? "—"}</td>
              <td className="py-2.5 pr-4 max-w-md">
                <code className="font-mono text-[12px] text-on-surface-variant break-all">{r.details ?? ""}</code>
              </td>
              <td className="py-2.5 pr-4 font-mono text-[12px] text-outline whitespace-nowrap">{r.ipAddress ?? "—"}</td>
            </tr>
          ))}
        </DataTable>
        <div className="mt-4 flex justify-between">
          {page > 0 ? (
            <a href={link(page - 1)} className={btn.ghost}>
              ← Newer
            </a>
          ) : (
            <span />
          )}
          {more && (
            <a href={link(page + 1)} className={btn.ghost}>
              Older →
            </a>
          )}
        </div>
      </Card>
    </>
  );
}
