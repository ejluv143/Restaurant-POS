import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import PrintButton from "@/components/table/PrintButton";
import TableQrCard from "@/components/table/TableQrCard";
import { EmptyState, Icon, PageHeader, btn } from "@/components/ui";
import { guestOrderOrigin } from "@/lib/origin";
import { MANAGERS } from "@/lib/staffAccess";
import { requireBranch } from "@/lib/staffContext";
import { listTablesForQr } from "@/lib/tableOrdering";

export const metadata: Metadata = { title: "Print QR stands" };

// Printable stand for every in-service table of the active branch. Managers only: QR tokens let anyone order.
export default async function PrintQrPage() {
  const ctx = await requireBranch(MANAGERS);
  const [tables, origin] = await Promise.all([listTablesForQr(ctx.branch.id), guestOrderOrigin()]);
  const cards = await Promise.all(
    tables.map(async (t) => {
      const url = `${origin}/order/table/${t.qrToken}`;
      const qrSvg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "H", color: { dark: "#141312", light: "#fbf6f1" } });
      return { ...t, url, qrSvg };
    }),
  );

  return (
    <>
      <PageHeader
        title="Print QR stands"
        icon="print"
        subtitle={`${ctx.branch.name} • ${cards.length} tables. Print on card stock and place one on each table.`}
        actions={
          <>
            <Link href="/tables" className={btn.ghost}>
              <Icon name="arrow_back" className="text-[16px]" />
              Back
            </Link>
            <PrintButton />
          </>
        }
      />
      {cards.length === 0 ? (
        <EmptyState icon="qr_code_2" title="No tables in service">Add tables under Tables &amp; QR Codes first.</EmptyState>
      ) : (
        <div className="print-area rounded-xl flex flex-wrap justify-center gap-2">
          {cards.map((c) => (
            <div key={c.qrToken} className="flex flex-col items-center">
              <TableQrCard
                restaurant={c.restaurant}
                number={c.number}
                zone={c.zone}
                zoneDescription={c.zoneDescription}
                standId={`${c.branchCode}-T${c.number}`}
                wifiSsid={c.wifiSsid}
                wifiPassword={c.wifiPassword}
                qrSvg={c.qrSvg}
              />
              <Link href={`/order/table/${c.qrToken}`} target="_blank" className="print:hidden -mt-3 mb-3 font-label-md text-label-md text-primary hover:underline flex items-center gap-1">
                <Icon name="open_in_new" className="text-[16px]" />
                Open table {c.number} guest view
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
