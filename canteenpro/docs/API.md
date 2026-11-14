# CanteenPro API reference

Base URL: `https://api.yourdomain.com/api` · JSON in/out · Auth: `Authorization: Bearer <token>` (devices: `X-Device-Key`).
Errors: `{ "error": "message", "code": "CODE", "details"?: ... }` with HTTP 4xx/5xx. List endpoints accept `page`, `pageSize`, `q` and return `{ items, total, page, pageSize }`. Most tenant lists/reports accept `format=csv`.

## Public (website)

| Method | Path                                                              |                                                               |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| GET    | `/public/site`                                                    | brand, support contacts, Razorpay key id, GST %               |
| GET    | `/public/plans`                                                   | active plans                                                  |
| GET    | `/public/blog` · `/public/blog/:slug` · `/public/blog-categories` | blog                                                          |
| GET    | `/public/pages/:slug`                                             | CMS page (terms, privacy, refund…)                            |
| GET    | `/public/testimonials` · `/public/faqs?group=`                    |                                                               |
| POST   | `/public/leads`                                                   | contact / demo request                                        |
| POST   | `/public/signup`                                                  | create tenant + owner + default canteen + trial → `{ token }` |
| POST   | `/public/quote`                                                   | price incl. coupon & GST                                      |
| POST   | `/public/checkout` · `/public/checkout/verify`                    | owner token; Razorpay order / verify                          |
| POST   | `/webhooks/razorpay`                                              | Razorpay webhook (signature checked)                          |

## Auth

| POST | `/platform/auth/login` · GET `/platform/auth/me` · POST `/platform/auth/change-password`                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------ |
| POST | `/auth/login` · GET `/auth/me` · POST `/auth/change-password` · `/auth/forgot-password` · `/auth/reset-password` (staff) |
| POST | `/employee/auth/check` (phone exists?) · `/employee/auth/login` (phone + PIN) · `/employee/auth/change-pin`              |

## Tenant (console & manager app) — `/tenant/*`

| Area            | Endpoints                                                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------- |
| Dashboard       | `GET /dashboard?range=today                                                                                                                                                                                                  | week | month&canteenId=` |
| Canteens        | `GET/POST /canteens`, `PATCH /canteens/:id`, `GET /canteens/:id/daily-qr`, `POST/PATCH/DELETE /canteens/:id/sessions[/:sid]`                                                                                                 |
| Team            | `GET/POST /staff`, `PATCH/DELETE /staff/:id` (owner)                                                                                                                                                                         |
| Departments     | CRUD `/departments`                                                                                                                                                                                                          |
| Employees       | `GET/POST /employees`, `GET/PATCH/DELETE /employees/:id`, `POST /employees/import`, `POST /employees/:id/reset-pin`, `POST /employees/:id/rotate-qr`, `GET/POST /employees/:id/wallet`, `POST /employees/wallet/bulk-credit` |
| Menu            | CRUD `/menu/categories`, `GET/POST /menu/items`, `PATCH/DELETE /menu/items/:id`, `GET/PUT /menu/daily`, `PATCH /menu/daily-items/:id`, `POST /menu/daily/copy`                                                               |
| Orders          | `POST /orders` (POS), `POST /orders/serve` (QR/code), `GET /orders/lookup?q=`, `GET /orders`, `GET /orders/live`, `GET /orders/:id`, `POST /orders/:id/cancel`                                                               |
| Guests          | CRUD `/guests`                                                                                                                                                                                                               |
| Opt-ins         | `GET /opt-ins/forecast?date=`, `GET /opt-ins?mealSessionId=&date=`                                                                                                                                                           |
| Inventory       | `GET/POST /inventory/items`, `PATCH /inventory/items/:id`, `GET/POST /inventory/movements`, CRUD `/inventory/suppliers`                                                                                                      |
| Back office     | CRUD `/expenses`, CRUD `/waste`, CRUD `/workers/staff`, `GET/PUT /workers/attendance`, `GET /workers/attendance/summary`                                                                                                     |
| Engagement      | `GET /feedback`, `POST /feedback/:id/reply`, `GET/POST /notifications`                                                                                                                                                       |
| Devices         | `GET/POST /devices`, `PATCH/DELETE /devices/:id`                                                                                                                                                                             |
| Reports         | `GET /reports/{summary,daily,departments,items,employees,payroll,company-billing,pnl,waste,guests}` (`month=YYYY-MM` or `from/to`, `canteenId`, `format=csv`)                                                                |
| Workspace       | `GET/PATCH /workspace`, `GET /workspace/audit-logs`                                                                                                                                                                          |
| Billing (owner) | `GET /billing`, `POST /billing/checkout`, `POST /billing/verify`, `POST /billing/cancel`, `GET /billing/invoices/:id`                                                                                                        |

## Employee app — `/employee/*`

`GET /me`, `PATCH /me`, `GET /home`, `GET /menu`, `GET/PUT /opt-ins`, `POST /scan`, `GET /history`, `GET /wallet`, `GET /notifications`, `POST /notifications/read-all`, `POST /notifications/:id/read`, `POST /feedback`

## Devices — `/device/*` (header `X-Device-Key`)

`GET /employees`, `POST /enrolled`, `POST /punch { identifier }`

## Super Admin — `/platform/*`

`GET /dashboard` · `GET/POST /tenants`, `GET/PATCH /tenants/:id`, `POST /tenants/:id/subscription`, `POST /tenants/:id/impersonate`, `POST /tenants/:id/manual-payment` · CRUD `/plans`, `/coupons`, `/blog/posts`, `/blog/categories`, `/pages`, `/testimonials`, `/faqs`, `/leads` · `GET /payments` · `GET/PUT /settings`, `POST /settings/test-email`, `POST /settings/test-push` · `GET /email-templates`, `PUT/DELETE /email-templates/:key`, `POST /email-templates/:key/test`, `POST /email-templates/preview` · `GET /email-logs` · `POST /broadcast` · `GET/POST/PATCH /users` · `GET /audit-logs`

## Error codes worth handling in clients

`UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION`, `DUPLICATE`, `SUBSCRIPTION_INACTIVE` (402), `PLAN_LIMIT`, `PLAN_FEATURE`, `ALREADY_SERVED`, `NOT_OPTED_IN`, `NO_SESSION`, `SOLD_OUT`, `INSUFFICIENT_BALANCE`, `GUESTS_DISABLED`, `GUEST_EXPIRED`, `CUTOFF_PASSED`, `INVALID_QR`, `QR_EXPIRED`, `MAINTENANCE`, `EMAIL_EXISTS`, `BAD_COUPON`, `BAD_SIGNATURE`
