"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, MENU } from "@/lib/menu";
import { money } from "@/lib/format";
import type { Category, MenuItem } from "@/lib/types";

export default function MenuGrid({ onAdd }: { onAdd: (item: MenuItem) => void }) {
  const [category, setCategory] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MENU.filter(
      (m) => (category === "All" || m.category === category) && m.name.toLowerCase().includes(q),
    );
  }, [category, query]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search menu…"
        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div className="flex flex-wrap gap-2">
        {(["All", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              category === c
                ? "bg-orange-500 text-white"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onAdd(item)}
            className="flex flex-col items-center gap-1 rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-sm transition hover:border-orange-400 hover:shadow active:scale-95 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="text-4xl">{item.emoji}</span>
            <span className="font-medium">{item.name}</span>
            <span className="text-sm text-orange-600 dark:text-orange-400">{money(item.price)}</span>
          </button>
        ))}
        {items.length === 0 && (
          <p className="col-span-full py-10 text-center text-zinc-500">No items match your search.</p>
        )}
      </div>
    </section>
  );
}
