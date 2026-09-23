"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  // Hotel Rooms is a zone of the floor plan, so it keeps "Floor Plan" highlighted
  { label: "Floor Plan", href: "/", match: ["/", "/rooms"] },
  { label: "Order Entry", href: "/order-entry", match: ["/order-entry"] },
  { label: "Checkout & Pay", href: "/checkout", match: ["/checkout"] },
  { label: "Kitchen Display / KDS", href: "/kitchen", match: ["/kitchen"] },
];

const ACTIVE = "font-label-md px-space-lg py-space-sm rounded-lg transition-all select-none bg-primary-container text-on-primary-container shadow-sm";
const IDLE =
  "font-label-md text-label-md px-space-lg py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all select-none";

export default function NavTabs() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-space-xs bg-surface-container-low p-1 rounded-xl">
      {NAV.map((item) => {
        const active = item.match.includes(path);
        return (
          <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={active ? ACTIVE : IDLE}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
