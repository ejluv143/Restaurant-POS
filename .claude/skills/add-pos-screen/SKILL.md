---
name: add-pos-screen
description: Add a new screen/route to the SynchubPOS app following project conventions (route groups, NavTabs, theme tokens, static-export safety). Use when the user asks to add a page, screen, tab, view, or module such as reports, reservations, inventory, or shifts.
---

# Add a POS screen

## 1. Pick the route group

- `src/app/(pos)/<slug>/page.tsx`: staff screens that share the POS header, the nav tabs, and the footer (`(pos)/layout.tsx`).
- `src/app/(register)/<slug>/page.tsx`: register-style screens with their own layout.
- `src/app/order/...`: guest-facing, server-only. **Excluded from the GitHub Pages build**, so only put things here that need the API.

Read the neighboring `page.tsx` first and match its structure.

## 2. Wire navigation

If the screen belongs in the top nav, add an entry to `NAV` in `src/components/NavTabs.tsx`: `{ label, href: "/<slug>", match: ["/<slug>"] }`. Keep `href` without a trailing slash; the component already normalizes one.

## 3. Build it

- Server Component page by default. Put interactive parts in `src/components/<Name>.tsx` with `"use client"`.
- Types go in `src/lib/types.ts`. Browser-persisted state goes in a `src/lib/<thing>.ts` store modelled on `lib/orders.ts` (`useSyncExternalStore`, a `try/catch` around `localStorage`, and a stable `EMPTY` snapshot).
- Money: compute with `round2` and display with `money()` from `src/lib/format.ts`.
- Styling: only theme tokens from `src/app/globals.css` (`bg-surface-container`, `text-on-surface`, `px-space-lg`, `font-label-md`, `rounded-lg`, …). Icons are Material Symbols: `<span className="material-symbols-outlined" aria-hidden>icon</span>`, with an `aria-label` on the icon-only button.
- Layout: mobile-first, and test at 360, 768, 1024, and 1280px. Touch targets of at least 44px. No horizontal page scroll.
- Handle the empty, loading, and error states explicitly.

## 4. Static-export safety

The page must build under `GITHUB_PAGES=1` (`output: "export"`, `basePath: /Restaurant-POS`, `trailingSlash`). That rules out `cookies()`/`headers()`, imports of `lib/roomOrders`, and unguarded `/api` fetches. A dynamic segment needs `generateStaticParams`.

## 5. Finish

Run the `verify` skill. Suggest that the user have the `pos-ux-reviewer` agent check the new screen.
