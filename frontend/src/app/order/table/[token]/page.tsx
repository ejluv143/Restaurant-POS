import type { Metadata } from "next";
import TableOrderApp from "@/components/table/TableOrderApp";
import { getTableMenu, getTableOrders } from "@/lib/tableOrdering";

export async function generateMetadata({ params }: PageProps<"/order/table/[token]">): Promise<Metadata> {
  const menu = await getTableMenu((await params).token);
  return {
    title: menu ? `${menu.restaurant} • Table ${menu.table.number} Dining & Ordering` : "Table not found",
    robots: { index: false, follow: false },
  };
}

// Opened by scanning a table's QR code (printable cards at /tables)
export default async function TableOrderPage({ params }: PageProps<"/order/table/[token]">) {
  const { token } = await params;
  const menu = await getTableMenu(token);

  if (!menu) {
    return (
      <main className="min-h-screen max-w-md mx-auto p-6 flex flex-col items-center justify-center text-center gap-3">
        <span className="material-symbols-outlined text-[48px] text-primary" aria-hidden>
          qr_code_scanner
        </span>
        <h1 className="text-headline-md font-headline-md text-on-surface">This table code isn&apos;t active</h1>
        <p className="text-body-md font-body-md text-on-surface-variant">The QR code may be old or the table is closed. Please ask your server for help or scan the code on your table again.</p>
      </main>
    );
  }

  return <TableOrderApp token={token} menu={menu} initialOrders={await getTableOrders(token)} />;
}
