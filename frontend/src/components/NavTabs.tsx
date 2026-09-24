"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  // The zones (patio, bar, private dining, hotel rooms) are part of the floor plan, so they keep "Floor Plan" highlighted
  { label: "Floor Plan", href: "/", match: ["/", "/patio", "/bar", "/private", "/rooms"] },
  { label: "Order Entry", href: "/order-entry", match: ["/order-entry"] },
  { label: "Checkout & Pay", href: "/checkout", match: ["/checkout"] },
  { label: "Kitchen Display / KDS", href: "/kitchen", match: ["/kitchen"] },
];

const ACTIVE = "font-label-md px-space-lg py-space-sm rounded-lg transition-all select-none bg-primary-container text-on-primary-container shadow-sm";
const IDLE =
  "font-label-md text-label-md px-space-lg py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all select-none";

export default function NavTabs() {
  // The GitHub Pages build uses trailingSlash, so "/order-entry/" must still match "/order-entry"
  const path = usePathname().replace(/(.)\/$/, "$1");
  return (
    <nav className="order-last lg:order-none w-full lg:w-auto flex items-center gap-space-xs bg-surface-container-low p-1 rounded-xl overflow-x-auto no-scrollbar">
      {NAV.map((item) => {
        const active = item.match.includes(path);
        return (
          <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={`${active ? ACTIVE : IDLE} shrink-0 whitespace-nowrap`}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
