import type { Metadata } from "next";
import Link from "next/link";
import TableTracker from "@/components/table/TableTracker";
import { getTableInfo, getTableStatus } from "@/lib/tableOrdering";

export async function generateMetadata({ params }: PageProps<"/order/table/[token]/track">): Promise<Metadata> {
  const info = await getTableInfo((await params).token);
  return {
    title: info ? `Live Order Tracker & Bill • Table ${info.table.number} • ${info.restaurant}` : "Table not found",
    robots: { index: false, follow: false },
  };
}

// Guest's live view of their table's kitchen tickets, tab and bill split (linked from the QR menu)
export default async function TableTrackerPage({ params, searchParams }: PageProps<"/order/table/[token]/track">) {
  const { token } = await params;
  const { payment } = await searchParams;
  const paymentReturn = payment === "success" || payment === "cancelled" ? payment : null;
  const info = await getTableInfo(token);

  if (!info) {
    return (
      <main className="min-h-screen max-w-md mx-auto p-6 flex flex-col items-center justify-center text-center gap-3">
        <span className="material-symbols-outlined text-[48px] text-primary" aria-hidden>
          qr_code_scanner
        </span>
        <h1 className="text-headline-md font-headline-md text-on-surface">This table code isn&apos;t active</h1>
        <p className="text-body-md font-body-md text-on-surface-variant">The QR code may be old or the table is closed. Please ask your server for help or scan the code on your table again.</p>
        <Link href="/" className="text-primary text-label-lg font-label-lg underline underline-offset-4">
          Go to the homepage
        </Link>
      </main>
    );
  }

  return <TableTracker token={token} info={info} initial={await getTableStatus(token)} paymentReturn={paymentReturn} />;
}
