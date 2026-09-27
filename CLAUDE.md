# Sync Hub Resto

Restaurant QR ordering and management platform (Philippines, prices in ₱): customers scan a table QR, order, track their order live, pay online (PayMongo: GCash, Maya, cards) or cash, and rate their visit. Staff run the kitchen display, floor map, cashier/POS, menu, tables and QR codes, staff accounts, reports and audit log across multiple restaurants and branches.

Users: customers (anonymous, identified by the table QR they scanned), cashiers, kitchen staff, branch managers, restaurant admins, system admins.

The app lives in `frontend/`. Also read `frontend/CLAUDE.md` → `frontend/AGENTS.md`: **Next.js 16 has breaking changes. Read `frontend/node_modules/next/dist/docs/` before using any Next API.**

## Stack

Next.js 16.3 (App Router, Server Actions, `proxy.ts`) · React 19.2 · TypeScript (strict) · Tailwind CSS v4 (tokens in `src/app/globals.css`) · PostgreSQL 17 (Supabase) + Drizzle ORM (`postgres` driver) · PayMongo Checkout · ESLint 9 flat config · `qrcode` · Node 22 in CI.

## Commands (run in `frontend/`)

| Task | Command |
|---|---|
| Start Postgres (Docker) | `npm run db:up` (uses `../docker-compose.yml`) |
| Env | copy `.env.example` → `.env.local` (`DATABASE_URL`, optional `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `GUEST_ORDER_ORIGIN`, `APP_TIMEZONE`) |
| Create migration after editing `src/db/schema.ts` | `npm run db:generate` |
| Apply migrations | `npm run db:migrate` |
| Reset demo data | `npm run db:seed` (wipes `pos.*` and reseeds 2 branches, PHP menu, 8 staff, a week of history; prints the Malaybalay Table 5 guest URL; password `ChangeMe!2026`) |
| Browse the DB | `npm run db:studio` |
| Dev server | `npm run dev` → http://localhost:3000 |
| Lint | `npm run lint` |
| Type-check | `npx next typegen && npx tsc --noEmit` (typegen creates the global `PageProps`/`RouteContext` types) |
| Build (server) | `npm run build` |
| Full gate | `/verify` skill |

There is no test framework yet. Verify with lint, types, and build, then check the screens by hand (or drive them with Playwright).

## Architecture

**Public**
- `src/app/page.tsx`: marketing landing page (hero collage in `src/components/landing/`). "Sign In" → `/login`.
- `src/app/login/`: staff sign-in (Server Action). A temporary password redirects to `/account` first.
- `src/app/order/table/[token]/`: guest QR menu (`TableOrderApp`: sold-out items show "Currently Unavailable", re-checked every 20 s) and `/track` (`TableTracker`: live order steps pending → confirmed → preparing → ready → served, bill, Pay Online / Pay with Cash, split calculator, digital receipt, rating).
- Guest APIs `src/app/api/tables/[token]/{orders,status,service-requests,checkout,feedback,availability}` (token = only credential; rate-limited in `lib/rateLimit.ts`).
- `src/app/api/payments/paymongo/webhook`: signature-checked hint that makes the server re-verify a checkout.

**Staff** (`src/app/(staff)/`, shared `layout.tsx` → `StaffShell`: sidebar by role + branch switcher; `StaffHeader` on every screen: page title, global search (`GET /api/staff/search`, role/branch-scoped, Ctrl+K or "/"), profile dropdown with confirmed sign-out)
- `/dashboard` (managers+), `/floor` (cashier+managers), `/kitchen` (kitchen+managers), `/cashier` + `/cashier/order` (cashier+managers), `/menu` (kitchen & managers: availability; admins: edit, `/menu/[id]`, `/menu/options`), `/tables` + `/tables/print` (managers), `/staff` (managers, scoped), `/reports` + CSV export (managers), `/feedback` (managers), `/branches` (admins), `/audit` (admins), `/admin` (system admin), `/account` (everyone; forced when `must_change_password`).
- Live screens poll `GET /api/staff/{kitchen,floor,bills/[id]}` every ~4 s; every mutation is a Server Action (`src/app/(staff)/actions.ts` for live ops, `<screen>/actions.ts` for management).

**Server libraries** (all `server-only`)
- `lib/auth.ts`: sign-in, throttling, DB sessions, password change, `requireStaff`.
- `lib/staffContext.ts`: `getStaffContext(roles)` (role check + accessible branches + active branch cookie; the one place branch isolation starts), `requireBranch`, `apiStaffContext`, `runAction`, `audit`.
- `lib/operations.ts`: kitchen board, floor state, bills, ticket transitions, payments, close table, staff orders.
- `lib/tableOrdering.ts`: guest menu, pricing/validation (`placeOrder`), tracker status, feedback, checkout start.
- `lib/payments.ts`: PayMongo checkout, `confirmOnlinePayment` (re-fetches from PayMongo; idempotent), webhook signature check.
- `lib/reports.ts`: dashboard/report aggregates in `APP_TIMEZONE` (default Asia/Manila). `lib/validate.ts`: bounded form readers.
- Client-safe: `lib/tableOrder.ts` (DTOs, money, `orderNumber` → `SH-2026-001025`, `tableLabel` → `T-05`), `lib/staffDto.ts`, `lib/staffAccess.ts` (roles → screens; keep in sync with the `proxy.ts` matcher).
- UI kit: `src/components/ui.tsx` (server-safe), `src/components/staff/*` (client screens and `ActionForm`/`ActionButton`).

### Data model (see `src/db/schema.ts`)

All tables live in the Postgres schema **`pos`**. The same database (Supabase) also holds the Laravel backend's tables in `public`, and both have a `users` table, so never create or truncate anything outside `pos` from the frontend. `drizzle.config.ts` uses `schemaFilter: ["pos"]` and keeps its migration log in `pos.__drizzle_migrations`. Hosted databases connect with TLS and short idle timeouts (`src/db/connection.ts`).

restaurants (`is_active`) → branches (VAT `tax_rate_bp`, `cash_payments_enabled`, `online_payments_enabled`) → zones → dining_tables (opaque `qr_token`, `hold` cleaning/reserved, `is_active`). Menu: menu_categories, menu_items, kitchen_stations, dietary_tags, modifier_groups/options (variants & add-ons), branch_menu_availability (sold-out per branch). Dining: table_sessions (one open visit per table; closing it ends the QR session), orders (`status`, `cancel_reason`) → order_items (price snapshot) → order_item_modifiers, order_status_events (who changed what), service_requests (one open per type per visit), payments (`status`, `method`, `provider_ref` unique, `tendered_cents`), feedback (one per visit). Staff: users (`staff_role`, `must_change_password`, `last_login_at`), branch_staff, auth_sessions, login_attempts, audit_logs. Money is integer centavos; totals are always derived, never stored.

Order flow: submitted (Pending) → confirmed (kitchen accepted) → preparing → ready → served → completed (when the cashier closes the paid bill). Rejected/cancelled orders keep their reason and are excluded from the bill.

## Two build targets

1. **Node server:** everything.
2. **GitHub Pages** (`.github/workflows/pages.yml`): static export of the landing page only. CI **deletes `src/app/api`, `src/app/order`, `src/app/(staff)`, `src/app/login`, `src/proxy.ts` and `src/components/staff`**. `src/app/page.tsx` and its components must not import server-only modules.

## Conventions

- Server Components by default; `"use client"` at the leaves. Staff pages call `getStaffContext(rolesFor("/path"))` (or `requireBranch(roles)`) first.
- Every Server Action: re-check role + branch inside (never trust hidden buttons), validate with `lib/validate.ts`, wrap in `runAction`, write an `audit(...)` entry for anything that changes data, then `refresh()`.
- Money: integer centavos everywhere (`formatCents`, `totals`, `billFor` in `lib/tableOrder.ts`). Prices always come from the DB, never from client input.
- Schema changes: edit `schema.ts`, run `npm run db:generate`, and commit the generated SQL. Never hand-edit applied migrations.
- Style only with theme tokens. The whole app uses the warm `.theme-resto` theme (set on `<body>`).
- Times shown to users render only in the browser (`useNow()` returns null during SSR) to avoid hydration mismatches.
- Match the surrounding code's comment density (sparse, "why" comments only) and naming.

## Security rules

- Validate every input on the server and bound lengths/quantities. Guest endpoints are rate-limited per token.
- A table's QR token only reaches that table's *current open* session. Regenerating a table's QR invalidates printed stands.
- Branch isolation: staff only see/act on branches from `getStaffContext` (system admin: all; restaurant admin: their restaurant; others: `branch_staff`). Cross-branch ids answer "not found".
- Online payments: the amount is computed server-side; a payment is marked paid only after `confirmOnlinePayment` fetches the checkout from PayMongo with the secret key. Card data never touches this system. Online refunds must also be issued in the PayMongo dashboard.
- Never render user text with `dangerouslySetInnerHTML` (only server-generated QR SVGs). CSV exports neutralize formula injection.
- No secrets in the repo. `.env*` is gitignored (except `.env.example`, which must contain placeholders only), and Claude is denied access to real env files.
- New staff screens: add to `SCREENS` in `staffAccess.ts` **and** the `matcher` in `proxy.ts`, and re-check roles in the page. Never trust the proxy alone.
- Sign-in errors are generic and unknown emails still run scrypt. Temporary passwords force a change at next sign-in; suspending a user or restaurant revokes sessions immediately.
- Session cookie is HttpOnly, SameSite=Lax, and in production `Secure` with the `__Host-` prefix, so **production must be served over HTTPS**.
- **Known open risks / not yet built:** inventory, recipes, promos/discounts, loyalty, email/SMS notifications, password-reset-by-email and 2FA are not implemented. Rate limits are in-memory (per server process). Per-IP sign-in throttling trusts `X-Forwarded-For`, so run behind a proxy that sets it. Real-time updates use polling (4–5 s), not WebSockets.

## Claude Code tooling in this repo

- Agents: `pos-security-auditor` (run after API/money changes), `nextjs-architect` (design and Next 16 questions), `pos-ux-reviewer` (after UI changes)
- Skills: `/verify`, `/add-pos-screen`
- Hooks: ESLint runs on every edited TS/TSX file. Edits to `.env*` (except `.env.example`), `package-lock.json`, `frontend/data/`, and build output are blocked.
- Plugins (`.claude/settings.json`): frontend-design, security-guidance, typescript-lsp, context7, playwright, feature-dev, pr-review-toolkit, commit-commands, claude-md-management
