# TractorApp — Task 4: Admin Panel (React, production level)

## Goal (auto-continue)

Build a complete, production-level admin panel for TractorApp at **`tractor.skillinnovex.in/admin`**, using the **exact Paces template** (`template.html`) converted to React. Every number comes from the server; every permission is enforced by the server. **Work continues phase by phase without stopping until every box is checked and the final regression passes.** Then report back.

### Decisions (confirmed by the owner)

| Topic | Decision |
|---|---|
| Hosting | Same Node server, static build served at `/admin` |
| Staff | **Super admin** and **Admin**. Super admin creates, edits, suspends and deletes admins and chooses each admin's powers (sections they may use). |
| Admin logins | Separate **`admins`** collection. First super admin is seeded by `node scripts/create-admin.js`. Every admin has a Change password page. |
| App users | **Suspend / reactivate only** — app users are never deleted from the panel. Suspension signs them out everywhere at once. |
| Subscriptions | Plans live in the database: name, price, period, features (perks), which roles may subscribe, active/hidden. Panel shows who is subscribed to what (farmers, vendors, shopkeepers). |
| Products | **Need admin approval** before farmers see them. Reject needs a reason the shopkeeper sees. |
| Driver pay | **Fixed amount per completed job**, set by the admin; snapshotted on each job when it completes. |
| Skipped | Bulk purchase, rental duration, online payment gateway. |
| Template | Paces layout exactly: dark collapsible sidebar, white header, breadcrumbs, cards, Chart.js donut/line, range chart, list widgets. |

### Hard constraints

- No feature of the mobile app is removed; app changes are only the ones these decisions require.
- Server enforces every admin permission; the UI only hides what the server already refuses.
- Every admin write is recorded in the **audit log** (who, what, when, before/after summary).
- No hardcoded data in the panel: all figures, plans, pages and settings come from the API.
- Money history is never rewritten: driver pay and payments are snapshotted on the record.

### Delivery loop (every phase)

1. **Plan** the API contract and screens.
2. **Build** backend + panel (+ app when required).
3. **Gate check (7 gates)**:
   1. Server enforces role and per-admin powers.
   2. Inputs validated (server and form).
   3. Data persisted, scoped and audited.
   4. Loading / empty / error / success states.
   5. Navigation, breadcrumbs, back, deep links.
   6. Layout at 1440 px, 1024 px and 768 px.
   7. `node --check`, in-memory API tests, panel lint + build, app lint + Android export.
4. **Record** evidence below, tick the boxes, continue.

## Checklist

### Phase 1 — Foundation
- [x] `Admin` + `AuditLog` + `Setting` + `Plan` + `Page` models; defaults seeded once (plans and pages move from code to DB).
- [x] Admin auth: login (lockout after 5 failures for 15 min), `/me`, change password, 8-hour tokens with token version.
- [x] `scripts/create-admin.js` seeds / resets the super admin.
- [x] Super admin manages admins: create, edit name & powers, suspend, reset password, delete (never self / the last super admin).
- [x] React project (Vite, Tailwind, Font Awesome, Public Sans, Chart.js) reproducing the template shell; built to `/admin`.
- [x] Express serves the panel at `/admin` with SPA fallback.

### Phase 2 — Users
- [x] Users list: role tabs, status filter, search, sort, server pagination, CSV export.
- [x] Create any role (driver must belong to a vendor), edit details and location, reset password, sign out everywhere.
- [x] Suspend (with reason) / reactivate; app signs suspended users out and blocks login.
- [x] User detail per role: Farmer (bookings, orders, Agri cases, subscription), Vendor (tractors, drivers, job history incl. cancelled, earnings), Driver (jobs, pay history), Shopkeeper (products, orders incl. cancelled, payments).

### Phase 3 — Operations
- [x] Tractors: list/filter, detail, edit, availability, delete (no active bookings), create for a vendor.
- [x] Bookings: list/filter (status, vendor, driver, farmer, date), detail, admin status changes with reason, assign/reassign driver, notifications.
- [x] Products: approval queue, approve, reject with reason, edit, delete, create for a shopkeeper. App: new products pending; shopkeeper sees review state and reason.
- [x] Orders: list/filter, detail, status changes with reason, verify payment, reverse a wrong verification (with reason).
- [x] Payments ledger: verified payments with mode, reference, shop, buyer; totals; CSV.

### Phase 4 — Agri Doctor
- [x] Case queue (submitted / under review / advised), photos, mark under review, write/edit advice, notify farmer.

### Phase 5 — Business rules
- [x] Subscription plans CRUD (price, period, perks, audience roles, active, order); subscribers list by plan and role; change a user's plan. App: plans by role; vendors and shopkeepers can subscribe.
- [x] Settings: driver pay per job, product approval on/off, support contact, max tractor radius.
- [x] Driver pay: snapshot on completion; driver app Earnings shows pay; admin sees driver payouts per vendor.
- [x] Content pages editor (Help, Terms, Privacy) served to the app.

### Phase 6 — Dashboard & reports
- [x] Template dashboard on real data: greeting + to-do counts, stat cards with month-over-month change, donut, weekly range chart, revenue line with Today / Monthly / Annual, top products.
- [x] CSV exports for users, bookings, orders, payments.

### Phase 7 — Notifications
- [x] Broadcast to everyone / one role / one user; history.

### Phase 8 — Hardening & regression
- [x] Audit log viewer with filters.
- [x] Security review (auth, powers, injection, uploads, rate limit, CORS).
- [x] End-to-end: real server + in-memory DB + built panel; screenshots of every page at 1440 / 1024 / 768.
- [x] Mobile app regression (lint, Android export, API dry run).
- [x] Deployment guide.

## Evidence log

- 2026-10-22: Task 4 defined from owner decisions.
- 2026-10-22: Backend — `Backend/admin.js` (all `/api/admin/*`, panel hosting), `server.js` (Plan/Page/Setting models, DB-backed pages, settings-based driver pay, product approval, suspension-aware auth, default seeding, migration that keeps existing products live), `scripts/create-admin.js`. `node --check` ok for all.
- 2026-10-22: Tests in `Backend/tests/` (`npm test`, in-memory MongoDB): app flow **103/103**, admin API **142/142** (auth, lockout, token audience, powers granted/revoked live, admin CRUD with last-super-admin guard, users/suspend/reactivate/reset, tractors, bookings flow + driver assignment + pay snapshot, vendor/driver/shop/farmer detail, approvals, orders, payment verify/reverse with audit, Agri, plans/subscribers, settings, pages, broadcasts, dashboard ranges, CSV formula neutralising, audit coverage), reset scripts **11/11**.
- 2026-10-22: Panel — `Admin_Panel/` Vite + React 18 + Tailwind + Font Awesome + Public Sans + Chart.js; 21 pages; `npm run lint` 0 problems; `npm run build` ok.
- 2026-10-22: End-to-end — `npm run e2e` (real server + seeded in-memory DB + built panel), headless Chrome over 29 views × 1440/1024/768: no JS errors, no failed API calls, no horizontal overflow. CSP verified on `/admin`.
- 2026-10-22: App — driver Earnings shows fixed pay; product In review / Needs changes + reason; server message on add; Subscription for vendors and shopkeepers; any 401 signs the app out (suspension shows its reason). `eslint app components screens lib` 0 problems; `expo export --platform android` ok.
- 2026-10-22: Security — separate admin collection + token audience, per-request power check, token version on suspend/password change, 5-try lockout + IP limiter, trust proxy for real IPs, regex-escaped search, enum/ObjectId-validated filters, uploads through the existing MIME-checked multer, CSV formula escaping, CSP/X-Frame-Options/noindex on the panel, `Cache-Control: no-store` on admin API. Admin API uses bearer tokens (no cookies), so cross-site requests can't act without a stolen token.
- 2026-10-22: Deploy guide in `Admin_Panel/DEPLOY.md`.
