# CanteenPro — Developer Guide

This guide gets a new developer from zero to a running system, explains how the code is organised, and lists what to configure before going live.

---

## 1. What is in this repository

```
canteenpro/
├── apps/
│   ├── api/          Node.js + Express + TypeScript + Drizzle ORM  → REST API on Neon Postgres (port 4000)
│   ├── console/      React + Vite + Tailwind  → Canteen owner / manager / cashier panel (port 5173)
│   ├── superadmin/   React + Vite + Tailwind  → SaaS Super Admin panel (port 5174)
│   ├── web/          Next.js 14 (App Router)   → Marketing website, blog, pricing, signup (port 3000)
│   └── mobile/       Flutter                    → Employee app + manager/cashier mode
├── docs/
│   ├── DEVELOPER_GUIDE.md   ← you are here
│   ├── ARCHITECTURE.md      system design, data model, key flows
│   └── API.md               endpoint reference
└── package.json      npm workspaces (api, console, superadmin, web)
```

| App         | Who uses it                                           | Auth                                                    |
| ----------- | ----------------------------------------------------- | ------------------------------------------------------- |
| Website     | Visitors searching "canteen software" → sign up & pay | none / owner token after signup                         |
| Super Admin | You (SaaS owner), support, content editors            | platform users (email + password)                       |
| Console     | Canteen owner, manager, cashier, kitchen              | staff users (email + password)                          |
| Mobile app  | Employees (eat) and staff (serve)                     | employee: phone + 4-digit PIN · staff: email + password |
| Devices     | Fingerprint / RFID terminals                          | `X-Device-Key` header                                   |

All five talk to **one API** and **one database**.

---

## 2. Prerequisites

| Tool       | Version                                                  | Notes                   |
| ---------- | -------------------------------------------------------- | ----------------------- |
| Node.js    | 20 LTS or newer                                          | `node -v`               |
| npm        | 10+                                                      | comes with Node         |
| PostgreSQL | Neon (cloud) **or** local Postgres 15/16 for development |                         |
| Flutter    | 3.24+ (Dart 3.4+)                                        | only for the mobile app |
| Git        | any                                                      |                         |

---

## 3. Quick start (local, ~10 minutes)

```bash
# 1. install all JS workspaces
npm install

# 2. configure the API
cp apps/api/.env.example apps/api/.env
#    → set DATABASE_URL and DIRECT_URL (see §4), JWT_SECRET, ENCRYPTION_KEY

# 3. create tables + demo data
npm run db:migrate          # applies apps/api/drizzle/*.sql
npm run db:seed             # plans, super admin, blog, FAQs + "Demo Caterers" tenant

# 4. configure the front-ends (defaults already point to localhost)
cp apps/console/.env.example    apps/console/.env
cp apps/superadmin/.env.example apps/superadmin/.env
cp apps/web/.env.example        apps/web/.env.local

# 5. run everything
npm run dev                 # api :4000, console :5173, superadmin :5174, web :3000
```

Open:

| URL                   | Login                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| http://localhost:3000 | website                                                                                                       |
| http://localhost:5173 | `demo@canteenpro.in` / `Demo@123` (owner) · `manager@canteenpro.in` · `cashier@canteenpro.in` (same password) |
| http://localhost:5174 | `admin@canteenpro.in` / `Admin@123` (from `SEED_ADMIN_*`)                                                     |
| Mobile app            | employee phone `9876543210`, PIN `1234`                                                                       |

> **Change the seeded passwords** before any shared/staging deployment. For production run `SEED_DEMO=false npm run db:seed` so no demo tenant is created.

Run a single app: `npm run dev:api`, `npm run dev:console`, `npm run dev:superadmin`, `npm run dev:web`.

---

## 4. Database — Neon setup

1. Create a project at **neon.tech** → choose the region closest to your users (e.g. _AWS ap-south-1 Mumbai_ or _ap-southeast-1 Singapore_).
2. Create a database `canteenpro`.
3. In **Connection Details** copy two strings:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL` (used by the running app)
   - **Direct** (no `-pooler`) → `DIRECT_URL` (used for migrations)
4. Both must end with `?sslmode=require`.

```env
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.ap-south-1.aws.neon.tech/canteenpro?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.ap-south-1.aws.neon.tech/canteenpro?sslmode=require"
```

**Branches:** create a Neon branch per environment (`dev`, `staging`, `main`) — each gets its own connection string. Point local `.env` at the `dev` branch.

**Local Postgres alternative:** `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/canteenpro` (same value for `DIRECT_URL`).

### Schema changes (Drizzle)

The schema lives in **`apps/api/src/db/schema.ts`** (TypeScript, one file). Workflow:

```bash
# 1. edit schema.ts
# 2. generate a SQL migration
npm run db:generate -w apps/api -- --name add_xyz     # writes apps/api/drizzle/000N_add_xyz.sql
# 3. review the SQL, then apply
npm run db:migrate
# browse data
npm run db:studio -w apps/api
```

Commit the generated SQL files. Never edit an already-applied migration; add a new one.

---

## 5. Environment variables

### API — `apps/api/.env`

| Variable                                       | Required        | Purpose                                                                                                                                                  |
| ---------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                 | ✅              | Neon pooled URL                                                                                                                                          |
| `DIRECT_URL`                                   | ✅ (migrations) | Neon direct URL                                                                                                                                          |
| `JWT_SECRET`                                   | ✅              | ≥ 32 random chars. `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`                                                         |
| `ENCRYPTION_KEY`                               | ✅ prod         | 32-byte base64 key that encrypts Razorpay/SMTP/OneSignal secrets stored in the DB. **Never change it after go-live** (stored secrets become unreadable). |
| `CORS_ORIGINS`                                 | ✅              | comma list of browser origins (website, console, superadmin)                                                                                             |
| `WEBSITE_URL`, `CONSOLE_URL`, `SUPERADMIN_URL` | ✅              | used in emails and redirects                                                                                                                             |
| `CRON_ENABLED`                                 |                 | `true` on exactly **one** API instance                                                                                                                   |
| `CRON_TIMEZONE`                                |                 | default `Asia/Kolkata`                                                                                                                                   |
| `RAZORPAY_*`, `ONESIGNAL_*`, `SMTP_*`          |                 | fallbacks only — prefer Super Admin → Settings                                                                                                           |
| `PAYMENTS_TEST_MODE`                           | dev             | `true` lets checkout "simulate" payments when no Razorpay keys exist. Ignored in production.                                                             |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`      |                 | first super admin created by the seed                                                                                                                    |

### Console / Super Admin — `.env`

```
VITE_API_URL=http://localhost:4000/api
VITE_WEBSITE_URL=http://localhost:3000
VITE_CONSOLE_URL=http://localhost:5173      # superadmin only
```

### Website — `.env.local`

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000        # canonical URLs, sitemap
NEXT_PUBLIC_API_URL=http://localhost:4000/api     # browser calls (signup, leads, checkout)
NEXT_PUBLIC_CONSOLE_URL=http://localhost:5173     # "Sign in" + post-signup redirect
API_URL=http://localhost:4000/api                 # server-side fetches (can be an internal URL)
```

### Mobile — `--dart-define`

```
API_URL=https://api.yourdomain.com/api
ONESIGNAL_APP_ID=xxxxxxxx-xxxx
APP_NAME=CanteenPro
SUPPORT_WHATSAPP=919427572571
```

---

## 6. Integrations (configured in Super Admin → Settings & keys)

Keys entered in the Super Admin are **encrypted (AES-256-GCM)** in `platform_settings` and override `.env`. A green tick means the value comes from the DB, "from .env" means the fallback is used.

### Razorpay (subscription payments)

1. Razorpay Dashboard → Settings → API Keys → generate **Key ID** + **Key Secret** (use _Test mode_ first).
2. Webhooks → add `https://api.yourdomain.com/api/webhooks/razorpay`, events `payment.captured`, `payment.failed`, `order.paid`, set a **webhook secret**.
3. Paste all three in Super Admin → Settings → Razorpay.
4. Flow: website/console calls `POST /checkout` → API creates a Razorpay order → Razorpay Checkout opens → `POST /checkout/verify` checks the HMAC signature → subscription is activated/extended and a GST invoice number is issued. The webhook is a safety net if the browser closes before verify (both paths are idempotent).
5. Razorpay requires public **Terms, Privacy and Refund** pages — they are seeded and editable in Super Admin → Pages (`/p/terms`, `/p/privacy-policy`, `/p/refund-policy`).

### OneSignal (push notifications)

1. Create an app at onesignal.com → configure **Android (FCM v1 service account JSON)** and **iOS (.p8 APNs key)**.
2. Copy **App ID** + **REST API key** into Super Admin → Settings → OneSignal.
3. Build the mobile app with `--dart-define=ONESIGNAL_APP_ID=<App ID>`.
4. The app logs users in as external IDs `emp_<employeeId>` / `staff_<staffId>` and tags `tenantId`, `canteenId`, `role`. The API targets those IDs/tags (menu published, opt-in reminders, wallet credits, feedback replies, announcements).
5. Test from Super Admin with an external ID such as `emp_<id>`.

### SMTP (email)

Any SMTP provider works: Amazon SES, Zoho, Brevo, SendGrid, Gmail (App Password).
Host/port/user/pass/from in Super Admin → Settings → SMTP, then "Test". All sends are logged in **Email logs**. Email templates (welcome, trial ending, renewal reminder, expired, payment received, daily report, low stock, password reset, staff invite, new lead) are editable in **Email templates** with live preview.

---

## 7. Scheduled jobs

Defined in `apps/api/src/jobs/cron.ts`, started with the API when `CRON_ENABLED=true`:

| Schedule (IST)     | Job                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 09:00 daily        | Trial/renewal reminders at 7, 3, 1 days; mark expired subscriptions PAST_DUE → EXPIRED after 3-day grace; "subscription expired" email |
| 21:30 daily        | Daily canteen report email to every active owner                                                                                       |
| 1st of month 00:05 | Credit monthly meal allowance to employee wallets (idempotent)                                                                         |
| every 15 min       | Push opt-in reminders ~45–60 min before each session's cut-off to employees who haven't answered                                       |
| 08:00 daily        | Low-stock email to owners                                                                                                              |

Run **only one** instance with `CRON_ENABLED=true`. If you deploy the API to a serverless platform, set `CRON_ENABLED=false` and call the job functions from an external scheduler instead.

---

## 8. How the code is organised

### API (`apps/api/src`)

```
config/env.ts          zod-validated environment
db/schema.ts           ALL tables, enums, relations (Drizzle)
db/index.ts            pg Pool + drizzle client (casing: snake_case)
db/migrate.ts, seed.ts migrations runner and seed (seed-content.ts = plans, blog, pages, FAQs)
lib/                   http errors, jwt, crypto, settings (encrypted), mailer, push, razorpay, csv, time, audit
middleware/auth.ts     requirePlatform / requireStaff / requireEmployee / requireDevice,
                       subscription gate (402), plan feature gate, canteen scoping
services/orders.ts     ⭐ createOrder(): the single place a meal/sale is created (rules, pricing, wallet, bill no.)
services/billing.ts    signup, quotes, Razorpay checkout, activation, plan limits
services/qr.ts         daily counter QR (HMAC, rotates daily) + employee QR
modules/public.ts      website endpoints (plans, blog, pages, leads, signup, checkout, webhook)
modules/auth.ts        login for platform, staff, employee
modules/tenant/*       console + manager-app endpoints (one file per area)
modules/employee.ts    employee mobile API
modules/device.ts      biometric / kiosk API
modules/platform/*     Super Admin API
jobs/cron.ts           scheduled jobs
```

**Rules of thumb**

- Every tenant query filters by `tenantId` from the token — never from the request body.
- Staff users with `canteenIds` set are restricted to those canteens (`assertCanteenAccess`).
- Anything that creates a meal or sale must go through `services/orders.ts#createOrder` so duplicate-meal protection, opt-in rules, pricing, GST, wallet debits and bill numbering stay consistent.
- Money columns are `numeric(12,2)` mapped to JS numbers; round with `round2()`.
- Business dates are stored as `YYYY-MM-DD` in the tenant's timezone (`orders.businessDate`), so "today" is correct for India regardless of server timezone.
- Sensitive actions call `audit()` (visible in console Settings → Activity log and Super Admin → Audit log).

### Console & Super Admin (`apps/console/src`, `apps/superadmin/src`)

- `lib/api.ts` fetch wrapper (token in localStorage, CSV download helper).
- `lib/auth.tsx` session + selected canteen.
- `components/ui.tsx` design-system primitives (Button, Card, Table, Modal, Stat…).
- `components/CrudPage.tsx` config-driven list + form pages for simple resources — use it before writing a custom page.
- Data fetching with TanStack Query; invalidate the query key after mutations.

### Website (`apps/web/src`)

- `lib/content.ts` static marketing copy (features, solutions, flow) — edit here for new SEO landing pages.
- `lib/api.ts` server fetch with ISR (`revalidate`) + fallback plans if the API is down.
- Plans, blog, FAQs, testimonials and legal pages come from the API, managed in Super Admin.
- SEO: per-page metadata, canonical URLs, `sitemap.xml`, `robots.txt`, JSON-LD (Organization, SoftwareApplication, FAQPage, BlogPosting).

### Mobile (`apps/mobile/lib`)

```
core/      api client, session (secure storage), OneSignal, theme, formatters, config
widgets/   shared UI (AppCard, Pill, AsyncView, FloatingNav…)
features/auth/      splash, login (employee ↔ staff), PIN entry/change
features/employee/  home (opt-in + menu), scan, history (+rating), profile (QR, wallet), notifications, week menu
features/staff/     dashboard, serve (camera/code), today's menu toggles, transactions, guests, employees, announcements
```

`main.dart → RootGate` picks the experience from the session. First-time employees are forced to change the PIN their manager gave them.

---

## 9. Mobile app setup

```bash
cd apps/mobile
bash tool/setup_platforms.sh        # flutter create + camera/internet permissions + icons
flutter run --dart-define=API_URL=http://10.0.2.2:4000/api       # Android emulator
flutter run --dart-define=API_URL=http://localhost:4000/api      # iOS simulator
flutter run --dart-define=API_URL=http://192.168.1.20:4000/api   # real phone on the same Wi-Fi
flutter analyze && flutter test
```

Release:

```bash
flutter build appbundle --release --dart-define=API_URL=https://api.yourdomain.com/api --dart-define=ONESIGNAL_APP_ID=xxx
flutter build ipa       --release --dart-define=API_URL=https://api.yourdomain.com/api --dart-define=ONESIGNAL_APP_ID=xxx
```

Before publishing: set the bundle ID (`in.canteenpro` by default), app name, signing keys (Android keystore / Apple team), and the privacy-policy URL in the store listings (`https://yourdomain.com/p/privacy-policy`).

> The scanner screen creates the camera controller once per visit and always disposes it — this fixes the `controllerAlreadyInitialized` camera error seen in the trial app.

---

## 10. Deployment (recommended)

| Part        | Where                                      | Notes                                                                                                                       |
| ----------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Database    | **Neon**                                   | `main` branch for production, enable point-in-time restore                                                                  |
| API         | Render / Railway / Fly.io / a VPS (Docker) | `apps/api/Dockerfile` runs migrations then starts. Long-running Node process (needed for cron). Health check: `GET /health` |
| Website     | **Vercel**                                 | root `apps/web`, framework Next.js, env vars from §5                                                                        |
| Console     | Vercel / Netlify / Cloudflare Pages        | root `apps/console`, build `npm run build`, output `dist` (SPA rewrites included)                                           |
| Super Admin | same as console                            | root `apps/superadmin`; consider IP allow-listing / Cloudflare Access                                                       |
| Mobile      | Play Store / App Store                     | §9                                                                                                                          |

Suggested domains:

```
yourdomain.com            → website
app.yourdomain.com        → console
admin.yourdomain.com      → super admin
api.yourdomain.com        → API
```

Then set `CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com,https://admin.yourdomain.com`.

### Go-live checklist

- [ ] Strong `JWT_SECRET`, `ENCRYPTION_KEY` set and backed up in a password manager
- [ ] `NODE_ENV=production`, `PAYMENTS_TEST_MODE=false`, one instance with `CRON_ENABLED=true`
- [ ] Seed run with `SEED_DEMO=false`; super admin password changed
- [ ] Razorpay **live** keys + webhook secret; test a ₹1 coupon purchase end-to-end
- [ ] SMTP verified (SPF/DKIM on your domain), test email received
- [ ] OneSignal app with FCM + APNs; test push to your own device
- [ ] Super Admin → Settings: brand name, support email/phone/WhatsApp, legal name, address, GSTIN, GST %
- [ ] Plans and prices reviewed; legal pages reviewed by your CA/lawyer
- [ ] Google Search Console: verify domain, submit `https://yourdomain.com/sitemap.xml`
- [ ] Neon backups/PITR enabled; uptime monitor on `/health`

---

## 11. Common tasks

| Task                        | How                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a field to employees    | edit `db/schema.ts` → `db:generate` → `db:migrate` → add to zod schema in `modules/tenant/employees.ts` → add to `EmployeeForm` in console               |
| Add a plan feature flag     | add key in Super Admin plan "features"; gate API routes with `requireFeature('key')`; hide UI via `feature('key')` in console `useAuth()`                |
| Add a report                | add a route in `modules/tenant/reports.ts` using `ctx()` + `out()` (gets CSV export for free) → add an entry to `REPORTS` in console `pages/Reports.tsx` |
| Add an email                | add a template to `lib/email-templates.ts` → call `sendTemplateMail(to, key, vars)`                                                                      |
| Add an SEO landing page     | add an entry to `FEATURES` or `SOLUTIONS` in `apps/web/src/lib/content.ts` (page, metadata and sitemap are generated)                                    |
| Write a blog post           | Super Admin → Blog posts (Markdown with preview); it appears on the website within 2 minutes (ISR)                                                       |
| Reset an employee's app PIN | Console → Employees → employee → Reset PIN, or mobile manager mode → More → Employees                                                                    |
| Help a customer             | Super Admin → Customers → Login as owner (audited, 1-hour token)                                                                                         |

---

## 12. Testing & quality

```bash
npm run typecheck          # all TS workspaces
npm run build              # production builds
cd apps/mobile && flutter analyze && flutter test
```

Quick API smoke test after seeding:

```bash
curl localhost:4000/health
curl -X POST localhost:4000/api/auth/login -H 'content-type: application/json' \
     -d '{"email":"demo@canteenpro.in","password":"Demo@123"}'
```

---

## 13. Troubleshooting

| Symptom                                               | Fix                                                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Invalid environment configuration` on API start      | a required env var is missing; the error lists which                                                                   |
| `402 SUBSCRIPTION_INACTIVE` everywhere in the console | the tenant's subscription expired → renew from Billing or extend in Super Admin                                        |
| Mobile app "Cannot reach the server"                  | wrong `API_URL` (emulator uses `10.0.2.2`, phones need your LAN IP) or HTTP blocked → re-run `tool/setup_platforms.sh` |
| Push "SKIPPED"                                        | OneSignal keys not set in Super Admin                                                                                  |
| Emails "SKIPPED" in Email logs                        | SMTP not configured                                                                                                    |
| Checkout says Razorpay not configured                 | add keys in Super Admin → Settings, or set `PAYMENTS_TEST_MODE=true` in development                                    |
| Secrets show "could not decrypt" in logs              | `ENCRYPTION_KEY` changed — restore the old key or re-enter the secrets                                                 |
| `ALREADY_SERVED` at the counter                       | working as intended (meals per session limit); managers can use "Manager override"                                     |
