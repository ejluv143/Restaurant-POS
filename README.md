# Synchub POS

Point-of-sale for a restaurant and hotel: floor plan, order entry, checkout, kitchen display and hotel room-service ordering by QR code.

- **Demo (GitHub Pages, sample data):** https://ejluv143.github.io/Restaurant-POS/
- **Frontend:** [`frontend/`](frontend/) (Next.js)
- **Backend:** `backend/` (Go REST API + PostgreSQL), started in Sprint 1 · Day 1 ([#1](https://github.com/ejluv143/Restaurant-POS/issues/1))

## Run it locally

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Phones and tablets on the same Wi-Fi can use `http://<your-computer's-IP>:3000`.

## Team and modules

| Module | What it covers | Owner |
|---|---|---|
| **Cashier** | Floor plan, Order Entry, Checkout & Pay | [@ejluv143](https://github.com/ejluv143) |
| **Admin** | Menu, staff, tables, end-of-day reports | [@ejluv143](https://github.com/ejluv143) |
| **Backend** | Go API, PostgreSQL, staff login, registration, hosting | [@ejluv143](https://github.com/ejluv143) |
| **Customer** | Landing page, guest QR ordering, order status, customer-facing display | [@Krismar-Gonzaga](https://github.com/Krismar-Gonzaga) |
| **Inventory** | Stock items, recipes, low-stock and sold-out, deliveries | [@Krismar-Gonzaga](https://github.com/Krismar-Gonzaga) |
| **Kitchen** | Kitchen Display (KDS): tickets, stations, bumping | [@Krismar-Gonzaga](https://github.com/Krismar-Gonzaga) |

## Daily tasks

Each of us has **one GitHub issue per working day**. Every issue has a goal, a checklist, a **Done when** section and the files to start from. Issues are labelled `daily-task` plus their module (e.g. `module: kitchen`) and belong to the current sprint milestone.

### Every day

1. Open **your issue for today** (table below, or filter [`is:open label:daily-task assignee:@me`](https://github.com/ejluv143/Restaurant-POS/issues?q=is%3Aopen+label%3Adaily-task+assignee%3A%40me)).
2. On the board, move its card to **In Progress**.
3. Create a branch named after the day and module, e.g. `day-3/kitchen`.
4. Tick the checklist as you go. Open a pull request with `Closes #<issue number>` in the description, then move the card to **Review**.
5. Before you log off, comment on the issue:
   > **Done:** … **Next:** … **Blockers:** …
6. When the PR is merged, the issue closes and the card moves to **Done**.

If a task doesn't fit in the day, leave it open, write what's left in your comment, and carry it into tomorrow. Don't create a new issue for leftovers.

### Sprint 1: Mon Sep 28 – Tue Oct 13, 2026

@ejluv143 builds the Go backend first (days 1–5), because the cashier, kitchen, customer and inventory screens all need the shared database and API. Until then, Krismar works on the kitchen and customer screens using the browser-saved data the app already has. Days 11–12 add the public landing page (Krismar) and business registration (@ejluv143).

| Day | Date | @ejluv143 | @Krismar-Gonzaga |
|---|---|---|---|
| 1 | Mon, Sep 28 | [#1](https://github.com/ejluv143/Restaurant-POS/issues/1) Backend: Set up the Go API and database | [#2](https://github.com/ejluv143/Restaurant-POS/issues/2) Kitchen: Kitchen Display shows real tickets |
| 2 | Tue, Sep 29 | [#3](https://github.com/ejluv143/Restaurant-POS/issues/3) Backend: Database schema (SQL migrations) and seed data | [#4](https://github.com/ejluv143/Restaurant-POS/issues/4) Kitchen: Stations, timers and bumping |
| 3 | Wed, Sep 30 | [#5](https://github.com/ejluv143/Restaurant-POS/issues/5) Backend: Tables & bills REST API | [#6](https://github.com/ejluv143/Restaurant-POS/issues/6) Kitchen: Room-service orders on the KDS |
| 4 | Thu, Oct 1 | [#7](https://github.com/ejluv143/Restaurant-POS/issues/7) Backend: Deploy the Go API + move room orders to Go | [#8](https://github.com/ejluv143/Restaurant-POS/issues/8) Customer: Table QR ordering for restaurant tables |
| 5 | Fri, Oct 2 | [#9](https://github.com/ejluv143/Restaurant-POS/issues/9) Backend: Staff login and roles | [#10](https://github.com/ejluv143/Restaurant-POS/issues/10) Customer: Order status page for guests |
| 6 | Mon, Oct 5 | [#11](https://github.com/ejluv143/Restaurant-POS/issues/11) Cashier: Order Entry: categories, quick modifiers, seats | [#12](https://github.com/ejluv143/Restaurant-POS/issues/12) Customer: Customer-facing display at checkout |
| 7 | Tue, Oct 6 | [#13](https://github.com/ejluv143/Restaurant-POS/issues/13) Cashier: Checkout: split bill and multiple payments | [#14](https://github.com/ejluv143/Restaurant-POS/issues/14) Inventory: Stock items screen |
| 8 | Wed, Oct 7 | [#15](https://github.com/ejluv143/Restaurant-POS/issues/15) Cashier: Voids, refunds, custom discount, charge to room | [#16](https://github.com/ejluv143/Restaurant-POS/issues/16) Inventory: Recipes and automatic stock deduction |
| 9 | Thu, Oct 8 | [#17](https://github.com/ejluv143/Restaurant-POS/issues/17) Admin: Menu management | [#18](https://github.com/ejluv143/Restaurant-POS/issues/18) Inventory: Low-stock alerts and sold-out dishes |
| 10 | Fri, Oct 9 | [#19](https://github.com/ejluv143/Restaurant-POS/issues/19) Admin: Staff, tables and end-of-day report | [#20](https://github.com/ejluv143/Restaurant-POS/issues/20) Inventory: Deliveries, waste and stock counts |
| 11 | Mon, Oct 12 | [#21](https://github.com/ejluv143/Restaurant-POS/issues/21) Backend: Registration page: business sign-up | [#22](https://github.com/ejluv143/Restaurant-POS/issues/22) Customer: Landing page: layout and content |
| 12 | Tue, Oct 13 | [#23](https://github.com/ejluv143/Restaurant-POS/issues/23) Backend: Registration: verification and first-time setup | [#24](https://github.com/ejluv143/Restaurant-POS/issues/24) Customer: Landing page: phone layout, SEO and launch |

### Planning the next sprint

Use **New issue → Daily task**. The form asks for the day, date, owner, module, goal, tasks and "done when", and applies the `daily-task` label. Add the issue to the next sprint milestone and to the board.

## Labels

| Label | Use |
|---|---|
| `daily-task` | One day of planned work for one person |
| `module: cashier` · `module: admin` · `module: backend` | @ejluv143's modules |
| `module: customer` · `module: inventory` · `module: kitchen` | @Krismar-Gonzaga's modules |
| `bug` | Something that used to work is broken; add the module label too |
