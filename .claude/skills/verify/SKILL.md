---
name: verify
description: Run SynchubPOS's full quality gate (lint, type-check, production build, dependency audit, and a static-export compatibility scan) and report pass/fail. Use before committing, before opening a PR, after a refactor, or when the user asks to "verify", "check everything", or "make sure it builds".
---

# Verify SynchubPOS

Run every step from `frontend/`. Keep going after a failure so the report covers everything, then report.

1. **Lint:** `npm run lint`
2. **Types:** `npx next typegen && npx tsc --noEmit`. Next 16 generates the global `PageProps`/`LayoutProps`/`RouteContext` types, so bare `tsc` fails without typegen.
3. **Server build:** `npm run build`. This must succeed with the API routes and the guest order page present.
4. **Dependency audit:** `npm audit --omit=dev`. Report high or critical advisories only.
5. **Static-export scan.** GitHub Pages CI deletes `src/app/api` and `src/app/order`, then builds with `GITHUB_PAGES=1`. Don't run that build locally, because it would mean deleting source. Instead, grep `src/` outside those two folders for:
   - imports of `@/lib/roomOrders`, `node:fs`, `node:crypto`, `next/server`, or `server-only`
   - runtime `fetch("/api/...")` calls that don't handle failure (they 404 on Pages)
   - `href="/..."` on raw `<a>` tags (they bypass `basePath`); `next/link` is fine
   - `usePathname()` comparisons that don't tolerate a trailing slash
   - server-only features in pages: `cookies()`, `headers()`, `revalidate`, or dynamic routes without `generateStaticParams`

## Report

A table with one row per step: ✅ or ❌, plus the key error lines for each failure (file:line). Then a one-line verdict: **ready to commit** or **fix N issues first**. Don't claim a step passed unless you ran it and saw it succeed.
