# CanteenPro — Architecture

## System overview

```
                 ┌──────────────────────┐
  Google search →│  Website (Next.js)   │── signup / Razorpay checkout ──┐
                 └──────────────────────┘                                 │
 ┌─────────────────┐  ┌───────────────────┐  ┌──────────────────────┐    │
 │ Super Admin     │  │ Console (React)   │  │ Mobile app (Flutter) │    │
 │ (React)         │  │ owner/manager/    │  │ employee + staff     │    │
 │ SaaS owner      │  │ cashier/kitchen   │  │ modes                │    │
 └───────┬─────────┘  └────────┬──────────┘  └──────────┬───────────┘    │
         │ /api/platform        │ /api/tenant            │ /api/employee  │
         │                      │ /api/auth              │ /api/tenant    │
         ▼                      ▼                        ▼                ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                       API (Node.js · Express · Drizzle)                  │
 │  auth & RBAC · subscription gate · plan limits · orders service · cron   │
 └───────┬───────────────┬────────────────┬───────────────┬────────────────┘
         │               │                │               │
   Neon Postgres     Razorpay         OneSignal         SMTP        ◄── Biometric / kiosk devices
   (single DB,       (orders,         (push)            (emails)        (/api/device, X-Device-Key)
   tenant_id on      webhooks)
   every row)
```

## Multi-tenancy

- **Shared database, shared schema**; every tenant table carries `tenant_id`.
- The tenant id always comes from the **JWT** (`requireStaff`, `requireEmployee`, `requireDevice`), never from client input.
- A **tenant** = a canteen business (a caterer or a company running its own cafeteria).
- A tenant has many **canteens** (sites). Each canteen usually serves one **client company** and has its own meal sessions, prices, menus, employees, bill series and counter QR.
- Staff users can be limited to specific canteens (`staff_users.canteen_ids`; empty = all).

## Roles

| Layer | Role | Can |
|---|---|---|
| Platform | SUPER_ADMIN | everything in Super Admin |
| | SUPPORT | customers, payments, leads, logs |
| | CONTENT_EDITOR | blog, pages, testimonials, FAQs, leads |
| Tenant | OWNER | everything incl. billing, team, canteens |
| | MANAGER | operations, menus, employees, reports, settings of assigned canteens |
| | CASHIER | counter, POS, transactions, guests, wallet recharge |
| | KITCHEN | menu, forecast, inventory, waste |
| End user | Employee | own menu, opt-ins, scan, history, wallet, feedback |

## Data model (main tables)

```
plans ─┐
       └─< subscriptions >── tenants ──< payments
                               │
     ┌────────────┬────────────┼──────────────┬──────────────┬─────────────┐
 staff_users   canteens    departments    menu_categories  suppliers   inventory_items
                 │  │           │               │                          │
                 │  └─< meal_sessions           └─< menu_items        stock_movements
                 │         │                          │
                 ├─< daily_menus ──< daily_menu_items >┘
                 ├─< employees ──< wallet_transactions
                 │       │  └─< meal_opt_ins
                 ├─< guests
                 ├─< orders ──< order_items          (orders = sales AND meal attendance)
                 ├─< feedback, waste_logs, expenses
                 ├─< canteen_workers ──< worker_attendance
                 └─< devices
 notifications ──< notification_reads
 platform: platform_users, platform_settings (encrypted secrets), email_templates, email_logs,
           blog_categories, blog_posts, cms_pages, testimonials, faqs, leads, coupons, audit_logs
```

## The meal record (`orders`)

Every meal or sale is one row in `orders`, created only by `services/orders.ts#createOrder`:

1. Resolve canteen and **session** (given, or the one running now in the tenant's timezone).
2. Resolve **consumer**: employee (must be ACTIVE), guest (pass valid, guests allowed), or walk-in.
3. For fixed session meals by employees (unless a manager overrides):
   - **one meal per session** (configurable `meals_per_day`), guarded with a Postgres advisory lock against double scans,
   - **opt-in required** if the canteen enables it.
4. **Pricing**: fixed meal = `employee_price + company_subsidy` (guests: `guest_price`); à-la-carte = dish price or today's override; sold-out items are rejected.
5. **Payment mode**: WALLET, PAYROLL, COMPANY, CASH, UPI, CARD, COMPLIMENTARY. `subsidy_amount` is what the client company owes; `total` is what the consumer pays. GST is tax-inclusive and stored for reporting.
6. **Wallet** debit is atomic with a balance floor (0 or the canteen's credit limit) and writes a ledger row.
7. **Bill number** = `<prefix>-<canteen code>-<counter>` from an atomic counter per canteen.

Cancelling a bill (manager only) refunds wallet payments and is audit-logged.

## Channels that create meals

| Channel | Who | Endpoint |
|---|---|---|
| QR_SCAN | employee scans the daily counter QR in the app | `POST /employee/scan` |
| EMPLOYEE_QR | cashier scans employee's QR / card (console Serve or mobile manager mode) | `POST /tenant/orders/serve` |
| POS | cashier bills items / guests / walk-ins | `POST /tenant/orders` |
| BIOMETRIC | fingerprint/RFID device | `POST /device/punch` |

The **daily counter QR** is `CPQ1.<canteenId>.<date>.<HMAC(qr_secret)>`, so a photo of yesterday's QR is rejected.

## Subscription lifecycle

```
signup ──► TRIALING (plan.trial_days) ──pay──► ACTIVE ──period end──► PAST_DUE (3-day grace) ──► EXPIRED
                │                                 ▲   │
                └──────────── pay ────────────────┘   └─ cancel at period end ──► CANCELLED
```
- `requireActiveSubscription` returns **402** for tenant APIs when not active (billing routes stay open so owners can renew).
- Plan **limits** (canteens, employees, staff) are enforced on create/import; plan **features** (`inventory`, `workforce`, `biometric`…) gate routes and hide UI.
- Payments: Razorpay order → client-side checkout → signature verification (and webhook) → `markPaymentPaid` extends the period (renewals extend from the current end date) and issues an invoice number `CP-YYYY-NNNNN`.

## Security

- Passwords/PINs: bcrypt. Employee PIN must be changed on first login.
- JWT: platform 12h, staff 7d, employee 30d; impersonation tokens 1h and audit-logged.
- Integration secrets encrypted with AES-256-GCM (`ENCRYPTION_KEY`) and masked in the UI.
- Device keys stored as SHA-256 hashes, shown once.
- Rate limits on login, signup and lead forms; Helmet headers; CORS allow-list.
- Audit log for cancellations, wallet changes, settings, impersonation, plan changes.

## Scaling notes

- Neon pooled connections + `pg` pool (`DB_POOL_MAX`). Hot queries are indexed on `(tenant_id, business_date)`, `(canteen_id, business_date)`, `(employee_id, business_date)`.
- The API is stateless except for cron; scale horizontally with only one cron-enabled instance.
- Dashboards aggregate in SQL; for very large tenants add a nightly rollup table (`daily_canteen_stats`) — the report endpoints are the only consumers to change.
