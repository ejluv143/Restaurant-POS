"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/register", label: "Register" },
  { href: "/orders", label: "Orders" },
];

export default function Header() {
  const path = usePathname();
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 print:hidden dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-bold">🍽️ SynchubPOS</h1>
      <nav className="flex gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              path === l.href ? "bg-orange-500 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
