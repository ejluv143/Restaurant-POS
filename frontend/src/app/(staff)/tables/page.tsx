import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { regenerateQr, saveTable, saveZone, setTableActive } from "./actions";
import { ActionButton, ActionForm } from "@/components/staff/ActionForm";
import { Badge, Card, EmptyState, Field, Icon, PageHeader, btn, input } from "@/components/ui";
import { getDb, schema as s } from "@/db";
import { MANAGERS } from "@/lib/staffAccess";
import { getStaffContext } from "@/lib/staffContext";
import { tableLabel } from "@/lib/tableOrder";

export const metadata: Metadata = { title: "Tables & QR Codes" };

export default async function TablesPage() {
  const ctx = await getStaffContext(MANAGERS);
  if (!ctx.branch) return <EmptyState icon="storefront" title="No branch assigned">Ask an administrator to assign you to a branch.</EmptyState>;
  const branch = ctx.branch;
  const db = getDb();
  const [zones, tables] = await Promise.all([
    db.select({ id: s.zones.id, name: s.zones.name, description: s.zones.description }).from(s.zones).where(eq(s.zones.branchId, branch.id)).orderBy(asc(s.zones.sortOrder)),
    db
      .select({
        id: s.diningTables.id,
        number: s.diningTables.number,
        seats: s.diningTables.seats,
        zoneId: s.diningTables.zoneId,
        isActive: s.diningTables.isActive,
        occupied: sql<boolean>`exists (select 1 from ${s.tableSessions} where ${s.tableSessions.tableId} = ${s.diningTables.id} and ${s.tableSessions.closedAt} is null)`,
      })
      .from(s.diningTables)
      .where(eq(s.diningTables.branchId, branch.id))
      .orderBy(sql`length(${s.diningTables.number})`, asc(s.diningTables.number)),
  ]);

  return (
    <>
      <PageHeader
        title="Tables & QR Codes"
        icon="qr_code_2"
        subtitle={`${branch.name} • Each table has its own QR code. Guests scan it to order and pay; staff never share codes between tables.`}
        actions={
          <Link href="/tables/print" className={btn.primary}>
            <Icon name="print" className="text-[18px]" />
            Print QR stands
          </Link>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 flex flex-col gap-5">
          {zones.length === 0 && <EmptyState icon="table_restaurant" title="No areas yet">Add an area (e.g. Main Dining, Al Fresco) and then its tables.</EmptyState>}
          {zones.map((z) => {
            const list = tables.filter((t) => t.zoneId === z.id);
            return (
              <Card key={z.id} title={z.name} icon="chair" actions={<span className="font-body-sm text-body-sm text-on-surface-variant">{z.description}</span>} padded={false}>
                {list.length === 0 ? (
                  <p className="px-5 py-4 text-on-surface-variant">No tables in this area yet.</p>
                ) : (
                  <ul className="divide-y divide-outline-variant/20">
                    {list.map((t) => (
                      <li key={t.id} className="px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-14 h-12 rounded-lg bg-surface-container-high text-on-surface font-headline-sm text-headline-sm flex items-center justify-center">{tableLabel(t.number)}</span>
                          <span className="flex flex-col">
                            <span className="text-on-surface">{t.seats} seats</span>
                            <span className="flex gap-1.5 mt-0.5">
                              {t.isActive ? <Badge className="border-tertiary/40 text-tertiary">In service</Badge> : <Badge className="border-error/40 text-error">Out of service</Badge>}
                              {t.occupied && <Badge className="border-secondary/40 text-secondary">Occupied</Badge>}
                            </span>
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <a href={`/api/staff/tables/${t.id}/qr`} download className={btn.ghost}>
                            <Icon name="download" className="text-[16px]" />
                            QR (SVG)
                          </a>
                          <ActionButton action={regenerateQr.bind(null, t.id)} label="New QR" icon="autorenew" confirm="The printed code will stop working. Continue?" className={btn.ghost} />
                          <ActionButton
                            action={setTableActive.bind(null, t.id, !t.isActive)}
                            label={t.isActive ? "Out of service" : "Back in service"}
                            icon={t.isActive ? "block" : "check_circle"}
                            confirm={t.isActive ? "Guests won't be able to order from this table. Continue?" : undefined}
                            className={btn.ghost}
                          />
                          <details className="relative">
                            <summary className={`${btn.ghost} list-none cursor-pointer`}>
                              <Icon name="edit" className="text-[16px]" />
                              Edit
                            </summary>
                            <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg bg-surface-container-high border border-outline-variant/40 p-3 shadow-2xl">
                              <ActionForm action={saveTable} submitLabel="Save table" className="flex flex-col gap-2">
                                <input type="hidden" name="id" value={t.id} />
                                <TableFields zones={zones} number={t.number} seats={t.seats} zoneId={t.zoneId} idPrefix={t.id} />
                              </ActionForm>
                            </div>
                          </details>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col gap-5">
          {zones.length > 0 && (
            <Card title="Add a table" icon="add">
              <ActionForm action={saveTable} submitLabel="Add table" submitIcon="add" resetOnSuccess>
                <TableFields zones={zones} idPrefix="new" />
              </ActionForm>
            </Card>
          )}
          <Card title="Add an area" icon="chair">
            <ActionForm action={saveZone} submitLabel="Add area" submitIcon="add" resetOnSuccess>
              <Field label="Name" htmlFor="zone-name">
                <input id="zone-name" name="name" required maxLength={40} placeholder="e.g. Al Fresco" className={input} />
              </Field>
              <Field label="Description (optional)" htmlFor="zone-desc">
                <input id="zone-desc" name="description" maxLength={80} placeholder="e.g. Garden patio" className={input} />
              </Field>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}

function TableFields({ zones, number, seats, zoneId, idPrefix }: { zones: { id: string; name: string }[]; number?: string; seats?: number; zoneId?: string; idPrefix: string }) {
  return (
    <>
      <Field label="Table number" htmlFor={`${idPrefix}-number`}>
        <input id={`${idPrefix}-number`} name="number" required maxLength={6} defaultValue={number} placeholder="e.g. 17" className={input} />
      </Field>
      <Field label="Seats" htmlFor={`${idPrefix}-seats`}>
        <input id={`${idPrefix}-seats`} name="seats" required inputMode="numeric" defaultValue={seats ?? 4} className={input} />
      </Field>
      <Field label="Area" htmlFor={`${idPrefix}-zone`}>
        <select id={`${idPrefix}-zone`} name="zoneId" defaultValue={zoneId} className={input}>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}
