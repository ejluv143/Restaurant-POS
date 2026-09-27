"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { switchBranch } from "@/app/(staff)/actions";
import { Icon } from "@/components/ui";
import { GlobalSearch, ProfileMenu } from "./StaffHeader";

export interface ShellProps {
  user: { name: string; role: string; email: string };
  branches: { id: string; label: string; restaurant: string; inactive: boolean }[];
  activeBranchId: string | null;
  screens: { href: string; label: string; icon: string; group: string }[];
  children: ReactNode;
}

function BranchSwitcher({ branches, activeBranchId }: Pick<ShellProps, "branches" | "activeBranchId">) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (branches.length === 0) return <p className="px-3 font-body-sm text-body-sm text-error">No branch assigned yet.</p>;
  const restaurants = [...new Set(branches.map((b) => b.restaurant))];
  return (
    <div className="px-3">
      <label htmlFor="branch-switcher" className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
        Branch
      </label>
      <div className="relative mt-1">
        <Icon name="storefront" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-primary pointer-events-none" />
        <select
          id="branch-switcher"
          value={activeBranchId ?? ""}
          disabled={pending || branches.length === 1}
          onChange={(e) =>
            start(async () => {
              const r = await switchBranch(e.target.value);
              setError(r.ok ? null : r.error);
            })
          }
          className="w-full appearance-none min-h-10 rounded-lg bg-surface-container border border-outline-variant/40 pl-9 pr-8 py-2 font-label-lg text-label-lg text-on-surface outline-none focus:border-primary disabled:opacity-80"
        >
          {restaurants.map((r) => (
            <optgroup key={r} label={r}>
              {branches
                .filter((b) => b.restaurant === r)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                    {b.inactive ? " (inactive)" : ""}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {branches.length > 1 && <Icon name={pending ? "progress_activity" : "unfold_more"} className={`absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none ${pending ? "animate-spin" : ""}`} />}
      </div>
      {error && <p className="mt-1 font-body-sm text-body-sm text-error">{error}</p>}
    </div>
  );
}

function Nav({ screens, onNavigate }: { screens: ShellProps["screens"]; onNavigate?: () => void }) {
  const path = usePathname();
  const groups = [...new Set(screens.map((s) => s.group))];
  return (
    <nav aria-label="Staff screens" className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g}>
          <p className="px-3 mb-1 font-label-sm text-label-sm text-outline uppercase tracking-wider">{g}</p>
          <ul className="flex flex-col gap-0.5">
            {screens
              .filter((s) => s.group === g)
              .map((s) => {
                const active = path === s.href || path.startsWith(`${s.href}/`);
                return (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-label-lg text-label-lg transition-colors ${
                        active ? "bg-primary-container text-on-primary-container shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      }`}
                    >
                      <Icon name={s.icon} className="text-[20px]" filled={active} />
                      {s.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <span className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shadow-md group-hover:scale-105 transition-transform">
        <Icon name="restaurant" className="text-[20px]" />
      </span>
      <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">Sync Hub Resto</span>
    </Link>
  );
}

export default function StaffShell({ user, branches, activeBranchId, screens, children }: ShellProps) {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const path = usePathname();
  const current = screens.find((s) => path === s.href || path.startsWith(`${s.href}/`));
  const branch = branches.find((b) => b.id === activeBranchId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex flex-col gap-5 flex-1 min-h-0">
      <BranchSwitcher branches={branches} activeBranchId={activeBranchId} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-4">
        <Nav screens={screens} onNavigate={onNavigate} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-72">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 flex-col gap-5 py-4 bg-surface-container-lowest border-r border-outline-variant/20 print:hidden">
        <div className="px-5 h-8 flex items-center">
          <Brand />
        </div>
        {sidebar()}
      </aside>

      {/* Header on every staff screen: page title, global search, profile menu */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/20 print:hidden">
        <div className="h-16 px-3 sm:px-6 lg:px-8 flex items-center gap-3">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="lg:hidden w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container-high">
            <Icon name="menu" className="text-[24px]" />
          </button>
          <div className="min-w-0 flex-1 md:flex-none md:w-52 xl:w-64">
            <p className="font-headline-sm text-headline-sm text-on-surface truncate">{current?.label ?? "Sync Hub Resto"}</p>
            {branch && <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{branch.label}</p>}
          </div>
          <div className="hidden md:block flex-1 max-w-xl mx-auto">
            <GlobalSearch />
          </div>
          <button
            type="button"
            onClick={() => setSearching((v) => !v)}
            aria-label={searching ? "Close search" : "Search"}
            aria-expanded={searching}
            className="md:hidden w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container-high"
          >
            <Icon name={searching ? "close" : "search"} className="text-[22px]" />
          </button>
          <ProfileMenu user={{ ...user, branch: branch?.label ?? null }} />
        </div>
        {searching && (
          <div className="md:hidden px-3 pb-3">
            <GlobalSearch autoFocus onNavigate={() => setSearching(false)} />
          </div>
        )}
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-80 max-w-[85vw] h-full flex flex-col gap-5 py-4 bg-surface-container-lowest border-r border-outline-variant/30 shadow-2xl">
            <div className="px-4 flex items-center justify-between">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high">
                <Icon name="close" className="text-[22px]" />
              </button>
            </div>
            {sidebar(() => setOpen(false))}
          </div>
        </div>
      )}

      <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">{children}</main>
    </div>
  );
}
