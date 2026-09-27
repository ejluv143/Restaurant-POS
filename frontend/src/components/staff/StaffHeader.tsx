"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, btn } from "@/components/ui";
import type { SearchResult } from "@/lib/staffDto";

export interface HeaderUser {
  name: string;
  role: string;
  email: string;
  branch: string | null;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={`shrink-0 rounded-full bg-linear-to-br from-primary-container to-secondary-container text-on-primary-container flex items-center justify-center font-bold shadow-sm ring-2 ring-surface-container-lowest ${
        size === "lg" ? "w-12 h-12 font-headline-sm text-headline-sm" : "w-9 h-9 font-label-md text-label-md"
      }`}
    >
      {initials(name)}
    </span>
  );
}

/** Close a popover on outside click and Escape. */
function useDismiss(open: boolean, ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, close]);
}

// ─── Global search ──────────────────────────────────────────────────────────

export function GlobalSearch({ autoFocus = false, onNavigate }: { autoFocus?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, wrap, close);

  // Ctrl/⌘+K or "/" focuses the search from anywhere (except while typing in another field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search; stale responses are aborted so results always match the latest text
  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/staff/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal, cache: "no-store" });
        if (res.status === 401) return window.location.reload();
        const data = res.ok ? await res.json() : { results: [] };
        setResults(data.results);
        setActive(0);
      } catch {
        // aborted by a newer keystroke
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQ("");
    setResults([]);
    input.current?.blur();
    onNavigate?.();
    router.push(r.href);
  };

  const shown = q.trim() ? results : [];
  const groups = [...new Set(shown.map((r) => r.group))];

  return (
    <div ref={wrap} className="relative w-full">
      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline pointer-events-none" />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-expanded={open && q.trim().length > 0}
        aria-controls={listId}
        aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        aria-label="Search tables, orders, menu and staff"
        autoFocus={autoFocus}
        value={q}
        maxLength={60}
        placeholder="Search tables, orders, menu, staff…"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && shown[active]) {
            e.preventDefault();
            go(shown[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
            input.current?.blur();
          }
        }}
        className="w-full min-h-10 rounded-lg bg-surface-container border border-outline-variant/40 pl-10 pr-16 py-2 font-body-md text-body-md text-on-surface placeholder:text-outline outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="hidden md:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center px-1.5 py-0.5 rounded border border-outline-variant/50 font-label-sm text-label-sm text-outline pointer-events-none">Ctrl K</kbd>

      {open && q.trim() && (
        <div id={listId} role="listbox" aria-label="Search results" className="absolute left-0 right-0 mt-2 z-50 max-h-[70vh] overflow-y-auto rounded-xl bg-surface-container-high border border-outline-variant/40 shadow-2xl p-2">
          {loading && shown.length === 0 && <p className="px-3 py-4 font-body-md text-body-md text-on-surface-variant">Searching…</p>}
          {!loading && shown.length === 0 && (
            <p className="px-3 py-4 font-body-md text-body-md text-on-surface-variant">
              No matches for &ldquo;{q.trim()}&rdquo;. Try a table number (5), an order (1140) or a dish name.
            </p>
          )}
          {groups.map((g) => (
            <div key={g} role="group" aria-label={g} className="mb-1 last:mb-0">
              <p className="px-3 pt-2 pb-1 font-label-sm text-label-sm text-outline uppercase tracking-wider">{g}</p>
              {shown.map((r, i) =>
                r.group !== g ? null : (
                  <div
                    key={`${r.group}-${r.href}-${r.label}`}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => go(r)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${i === active ? "bg-primary-container/20" : ""}`}
                  >
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <Icon name={r.icon} className="text-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-label-lg text-label-lg text-on-surface truncate">{r.label}</span>
                      <span className="block font-body-sm text-body-sm text-on-surface-variant truncate">{r.detail}</span>
                    </span>
                    {i === active && <Icon name="keyboard_return" className="text-[16px] text-outline" />}
                  </div>
                ),
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Profile menu + sign-out confirmation ───────────────────────────────────

export function ProfileMenu({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, wrap, close);

  // Focus the first item when the menu opens; arrow keys move between items
  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);
  const onMenuKey = (e: React.KeyboardEvent) => {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") items[(i + 1) % items.length]?.focus();
    else if (e.key === "ArrowUp") items[(i - 1 + items.length) % items.length]?.focus();
    else if (e.key === "Escape") trigger.current?.focus();
    else return;
    e.preventDefault();
  };

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${user.name}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full lg:rounded-xl p-0.5 lg:pl-1 lg:pr-2.5 lg:py-1 hover:bg-surface-container-high transition-colors"
      >
        <Avatar name={user.name} />
        <span className="hidden lg:flex flex-col items-start leading-tight min-w-0">
          <span className="font-label-lg text-label-lg text-on-surface max-w-40 truncate">{user.name}</span>
          <span className="font-label-sm text-label-sm text-tertiary">{user.role}</span>
        </span>
        <Icon name="expand_more" className={`hidden lg:block text-[20px] text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div ref={menu} id={menuId} role="menu" aria-label="Account" onKeyDown={onMenuKey} className="absolute right-0 mt-2 z-50 w-72 rounded-xl bg-surface-container-high border border-outline-variant/40 shadow-2xl overflow-hidden">
          <div className="p-4 flex items-center gap-3 bg-surface-container border-b border-outline-variant/30">
            <Avatar name={user.name} size="lg" />
            <div className="min-w-0">
              <p className="font-label-lg text-label-lg text-on-surface truncate">{user.name}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{user.email}</p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full border border-tertiary/40 text-tertiary font-label-sm text-label-sm">{user.role}</span>
                {user.branch && <span className="font-label-sm text-label-sm text-outline truncate">{user.branch}</span>}
              </p>
            </div>
          </div>
          <div className="p-1.5 flex flex-col">
            <Link href="/account" role="menuitem" onClick={close} className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-label-lg text-label-lg text-on-surface hover:bg-surface-container-highest focus:bg-surface-container-highest outline-none">
              <Icon name="account_circle" className="text-[20px] text-on-surface-variant" />
              My profile
            </Link>
            <Link href="/account" role="menuitem" onClick={close} className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-label-lg text-label-lg text-on-surface hover:bg-surface-container-highest focus:bg-surface-container-highest outline-none">
              <Icon name="password" className="text-[20px] text-on-surface-variant" />
              Change password
            </Link>
            <div className="my-1 border-t border-outline-variant/30" role="separator" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setConfirming(true);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-label-lg text-label-lg text-error hover:bg-error-container/30 focus:bg-error-container/30 outline-none text-left"
            >
              <Icon name="logout" className="text-[20px]" />
              Sign out
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <LogoutConfirm
          user={user}
          onCancel={() => {
            setConfirming(false);
            trigger.current?.focus();
          }}
        />
      )}
    </div>
  );
}

function LogoutConfirm({ user, onCancel }: { user: HeaderUser; onCancel: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();
  useEffect(() => {
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !leaving && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, leaving]);

  // Portalled to <body>: the header's backdrop blur would otherwise trap this "fixed" overlay inside the header
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !leaving && onCancel()} />
      <div className="relative w-full max-w-sm rounded-2xl bg-surface-container-high border border-outline-variant/40 shadow-2xl p-6 flex flex-col items-center text-center gap-3">
        <span className="w-14 h-14 rounded-full bg-error-container/30 text-error flex items-center justify-center">
          <Icon name="logout" className="text-[28px]" />
        </span>
        <h2 id={titleId} className="font-headline-md text-headline-md text-on-surface">
          Sign out?
        </h2>
        <p id={descId} className="font-body-md text-body-md text-on-surface-variant">
          You&apos;re signed in as <span className="text-on-surface font-medium">{user.name}</span>. Anything you haven&apos;t saved on this screen will be lost, and you&apos;ll need your password to sign back in.
        </p>
        <form action="/api/auth/logout" method="post" onSubmit={() => setLeaving(true)} className="mt-2 w-full grid grid-cols-2 gap-2">
          <button ref={cancel} type="button" onClick={onCancel} disabled={leaving} className={btn.secondary}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={leaving}
            className="inline-flex items-center justify-center gap-2 min-h-10 px-4 py-2 rounded-lg bg-error text-on-error font-label-lg text-label-lg font-bold hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            <Icon name={leaving ? "progress_activity" : "logout"} className={`text-[18px] ${leaving ? "animate-spin" : ""}`} />
            {leaving ? "Signing out…" : "Sign out"}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
