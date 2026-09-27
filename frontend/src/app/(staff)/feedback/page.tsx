import type { Metadata } from "next";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { Card, EmptyState, Icon, PageHeader, StatCard } from "@/components/ui";
import { getDb, schema as s } from "@/db";
import { reportBranches } from "@/lib/reports";
import { rolesFor } from "@/lib/staffAccess";
import { getStaffContext } from "@/lib/staffContext";
import { tableLabel } from "@/lib/tableOrder";

export const metadata: Metadata = { title: "Customer Feedback" };

export default async function FeedbackPage({ searchParams }: PageProps<"/feedback">) {
  const ctx = await getStaffContext(rolesFor("/feedback"));
  if (!ctx.branch) return <EmptyState icon="storefront" title="No branch assigned">Ask an administrator to assign you to a branch.</EmptyState>;
  const { branch: branchParam } = await searchParams;
  const ids = reportBranches(ctx, branchParam);
  const restaurantBranches = ctx.branches.filter((b) => b.restaurantId === ctx.branch!.restaurantId);
  const db = getDb();
  const [rows, [stats]] = await Promise.all([
    db
      .select({
        id: s.feedback.id,
        rating: s.feedback.rating,
        comment: s.feedback.comment,
        createdAt: s.feedback.createdAt,
        tableNumber: s.diningTables.number,
        branch: s.branches.name,
        tickets: sql<number[]>`(select array_agg(${s.orders.ticketNumber} order by ${s.orders.ticketNumber}) from ${s.orders} where ${s.orders.sessionId} = ${s.feedback.sessionId})`,
      })
      .from(s.feedback)
      .innerJoin(s.tableSessions, eq(s.tableSessions.id, s.feedback.sessionId))
      .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
      .innerJoin(s.branches, eq(s.branches.id, s.diningTables.branchId))
      .where(inArray(s.diningTables.branchId, ids))
      .orderBy(desc(s.feedback.createdAt))
      .limit(100),
    db
      .select({
        avg: sql<number | null>`round(avg(${s.feedback.rating})::numeric, 2)::float`,
        total: sql<number>`count(*)::int`,
        dist: sql<number[]>`array[${sql.join([1, 2, 3, 4, 5].map((n) => sql`count(*) filter (where ${s.feedback.rating} = ${n})::int`), sql`, `)}]`,
      })
      .from(s.feedback)
      .innerJoin(s.tableSessions, eq(s.tableSessions.id, s.feedback.sessionId))
      .innerJoin(s.diningTables, eq(s.diningTables.id, s.tableSessions.tableId))
      .where(inArray(s.diningTables.branchId, ids)),
  ]);
  const maxDist = Math.max(1, ...stats.dist);

  return (
    <>
      <PageHeader
        title="Customer Feedback"
        icon="reviews"
        subtitle="Ratings guests leave on their phone after their meal."
        actions={
          restaurantBranches.length > 1 && (
            <form method="get" className="flex items-center gap-2">
              <select name="branch" defaultValue={typeof branchParam === "string" ? branchParam : ctx.branch.id} aria-label="Branch" className="min-h-10 rounded-lg bg-surface-container border border-outline-variant/50 px-3 text-on-surface">
                <option value="all">All branches</option>
                {restaurantBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="min-h-10 px-3 rounded-lg bg-surface-container-high text-on-surface">
                Show
              </button>
            </form>
          )
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="flex flex-col gap-4">
          <StatCard label="Average rating" value={stats.avg ? `${stats.avg} / 5` : "—"} hint={`${stats.total} ratings`} icon="star" tone="secondary" />
          <Card title="Rating breakdown" icon="bar_chart">
            <ul className="flex flex-col gap-2">
              {[5, 4, 3, 2, 1].map((n) => (
                <li key={n} className="flex items-center gap-3">
                  <span className="w-10 font-label-md text-label-md text-on-surface-variant flex items-center gap-0.5">
                    {n} <Icon name="star" filled className="text-[14px] text-secondary" />
                  </span>
                  <span className="flex-1 h-2.5 rounded-full bg-surface-container-highest overflow-hidden">
                    <span className="block h-full bg-secondary rounded-full" style={{ width: `${(stats.dist[n - 1] / maxDist) * 100}%` }} />
                  </span>
                  <span className="w-8 text-right tabular-nums text-on-surface-variant">{stats.dist[n - 1]}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card title="Latest feedback" icon="chat" className="lg:col-span-2" padded={false}>
          {rows.length === 0 ? (
            <EmptyState icon="reviews" title="No feedback yet">Guests can rate their visit from their live order tracker once their food is served.</EmptyState>
          ) : (
            <ul className="divide-y divide-outline-variant/20">
              {rows.map((f) => (
                <li key={f.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-0.5 text-secondary" aria-label={`${f.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Icon key={i} name="star" filled={i < f.rating} className={`text-[18px] ${i < f.rating ? "" : "text-outline-variant"}`} />
                      ))}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {f.branch} • {tableLabel(f.tableNumber)} • {f.createdAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  {f.comment ? <p className="mt-1.5 text-on-surface">&ldquo;{f.comment}&rdquo;</p> : <p className="mt-1.5 text-outline italic">No comment</p>}
                  {f.tickets?.length > 0 && <p className="mt-1 font-body-sm text-body-sm text-outline">Tickets #{f.tickets.join(", #")}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
