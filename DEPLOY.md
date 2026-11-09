# Deploying the TractorApp admin panel

The panel is a static React build served by the existing API server at **https://tractor.skillinnovex.in/admin**. OpenLiteSpeed already proxies every path to the Node server on port 3013 (`Backend/vhost.txt`), so the vhost needs no change.

## 1. Build the panel (on your computer)

```bash
cd Admin_Panel
npm ci
npm run lint
npm run build          # creates Admin_Panel/dist
```

## 2. Upload

Copy these to the server's backend folder (next to `server.js`):

| Local | Server |
|---|---|
| `Backend/server.js` | `server.js` |
| `Backend/admin.js` | `admin.js` (new file) |
| `Backend/agri-ai.js` | `agri-ai.js` (new file, Agri Doctor "Check with AI") |
| `Backend/billing.js` | `billing.js` (new file, Premium subscriptions via Cashfree) |
| `Backend/payouts.js` | `payouts.js` (new file, direct payouts to sellers via Cashfree Easy Split) |
| `Backend/scripts/` | `scripts/` |
| `Backend/package.json`, `Backend/package-lock.json` | same |
| `Admin_Panel/dist/*` | `admin-panel/` (the server looks there first) |

If you keep the build somewhere else, set `ADMIN_PANEL_DIR=/full/path/to/dist` in `Backend/.env`.

## 3. Install and create the super admin (on the server, once)

```bash
cd /path/to/backend
npm ci --omit=dev
node scripts/create-admin.js --email you@skillinnovex.in --password "Choose-A-Strong-Pass-2026" --name "Your Name"
```

- The password needs at least 10 characters with letters and numbers.
- Running it again with the same email resets that admin's password, makes them super admin and unlocks the account. Use this if the super admin is ever locked out.
- App users are never touched by this script.

## 4. Restart

```bash
pm2 restart tractor-api --update-env
```

Check:
- `https://tractor.skillinnovex.in/api/health` → `"release": "subscriptions-v1"`
- `https://tractor.skillinnovex.in/admin` → sign-in page

## Premium subscriptions (vendors and shopkeepers)

**Read before deploying:** the paywall is **on** by default. The moment the new server starts, every vendor and shopkeeper without paid time is locked in the app and their tractors/products are hidden from farmers. Either:
- activate existing accounts first — Admin panel → Users → open the user → **Premium → Activate** (record the amount, or 0 for free time), or
- turn it off until you're ready — **Settings → Premium → Require an active plan**.

Farmers and drivers never pay. A locked vendor/shopkeeper can still cancel bookings/orders, so farmers are never left waiting.

Payments use Cashfree's hosted checkout; the server always confirms an order with Cashfree's API before unlocking, and each payment is applied exactly once.

1. **Webhook (recommended):** Cashfree dashboard → Developers → Webhooks → add `https://tractor.skillinnovex.in/api/payments/cashfree/webhook` (Payment events). It activates Premium even if the customer closes the browser before returning.
2. **Going live:** replace the TEST keys with production keys in `.env`, set `CASHFREE_ENV=production`, and whitelist `tractor.skillinnovex.in` in the Cashfree dashboard (Developers → Whitelisting). Restart with `--update-env`.
3. The new app build is needed for the Premium screen, the banner and the locks (older builds still work but won't show the paywall UI; the server blocks locked actions anyway).

## Direct payouts to vendors and shopkeepers (Cashfree Easy Split)

Farmers can pay online for accepted bookings and marketplace orders. Cashfree splits each payment: the seller’s share settles straight to the seller’s bank, and the platform keeps its commission.

- **Commission:** Admin panel → **Settings → Online payments & platform commission** (bookings % and marketplace %, 0–50). Each payment keeps the rate it was made at. Default is 0% until you set it.
- **Seller onboarding:** new vendors and shopkeepers get a “Get paid” step after sign-up (skippable). Existing sellers use **Profile → Payouts** in the new app. Online payment for a seller turns on only once Cashfree marks their payout account **Active**.
- **Webhook events:** in the same Cashfree webhook (`/api/payments/cashfree/webhook`) also enable **Payment**, **Refund** and **Easy Split → Vendor status** events.
- **Refunds:** cancelling a paid booking/order (by the farmer, seller or admin) refunds the farmer automatically and takes the seller’s share back. Admins can also refund from **Payments → Online payments**.
- **Switch:** **Settings → Let farmers pay online** turns online payments off without touching existing payments.
- **Bank details:** only masked values are stored (`••••1191`, `XXXXX1234X`); full numbers go to Cashfree only.
- **Going live:** Easy Split must be enabled on the production Cashfree account too (ask Cashfree support). Sandbox name-match: the test bank `026291800001191` / `YESB0000262` only verifies with the holder name **John Doe**.

## What changes on first start

- **Plans, Help/Terms/Privacy pages and platform settings** are copied into the database once (from the previous built-in defaults). From then on, edit them in the panel.
- **Existing products stay live.** Products created before this release are marked approved. New shopkeeper products wait for approval (Settings → Marketplace can turn this off).
- **Plans** become the six paid vendor/shopkeeper plans (Vendor ₹1,100 / ₹2,100 / ₹5,100; Shopkeeper ₹2,100 / ₹5,000 / ₹11,000). The old Free/Growth/Pro plans are hidden, not deleted.
- **Driver pay** starts at ₹0 per job. Set it in **Settings → Driver pay** before drivers finish jobs. Each completed job keeps the pay that applied when it finished.

## Environment variables (Backend/.env)

| Variable | Needed | Purpose |
|---|---|---|
| `Mongo_URI`, `MONGO_DB` | yes (existing) | Database |
| `JWT_SECRET` | **yes** | Signs app and admin tokens. Use a long random value. |
| `ADMIN_PANEL_DIR` | no | Folder with the built panel (default `admin-panel/` beside `server.js`) |
| `GEMINI_API_KEY` | for AI | Google Gemini key for Agri Doctor "Check with AI". Without it the button says AI isn't set up. |
| `GEMINI_MODELS` | no | Models tried in order (default `gemini-3.8-flash,gemini-flash-latest,gemini-3.1-flash-lite`); the next one is used when one is busy |
| `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY` | for payments | Cashfree Payment Gateway keys (TEST… keys = sandbox) |
| `CASHFREE_ENV` | for payments | `sandbox` (default) or `production` |
| `TRUST_PROXY_HOPS` | no | Proxies in front of Node (default 1, OpenLiteSpeed) — needed for correct IPs in the sign-in limiter and audit log |

## Security summary

- Admin accounts live in their own `admins` collection with their own 8-hour tokens (audience `tractor-admin`); app tokens can't open the panel and admin tokens can't act as app users.
- Each admin's sections are enforced by the server on every request. Changing an admin's powers, suspending them or resetting their password takes effect at once.
- Sign-in: 5 wrong passwords lock the account for 15 minutes; 20 attempts per IP per 15 minutes.
- Suspending an app user signs them out on every phone at once.
- Every admin change is in **Audit log**, with before/after values.
- The panel is served with a strict Content-Security-Policy, `X-Frame-Options: DENY` and `noindex`.
- CSV exports neutralise spreadsheet formulas.

## Tests

```bash
cd Backend
npm install            # includes the test-only in-memory MongoDB
npm test               # app flow (104) + admin API (156) + billing (46) + payouts (86), both with a Cashfree mock, + reset scripts (11)
npm run e2e            # real server + seeded in-memory DB + built panel on http://localhost:5055/admin
                       # sign in as owner@tractor.test / Owner-pass-2026 (test data only)
```

## Local development

```bash
cd Admin_Panel && npm run dev             # panel on http://localhost:5174/admin, /api proxied to the live server
# VITE_API_PROXY=http://localhost:3013 npm run dev   to use a local backend (cd Backend && npm run dev)
# VITE_API_PROXY=http://localhost:5055 npm run dev   to use the e2e test server
```
