# CanteenPro — SaaS canteen management system

Complete system for canteen businesses (corporate, factory and institutional canteens, contract caterers):

- **Website** (Next.js) — SEO landing pages, pricing, blog, signup with Razorpay
- **Super Admin** (React) — customers, plans, coupons, payments, blog/CMS, leads, Razorpay/OneSignal/SMTP keys, email templates
- **Console** (React) — dashboard, serve meals (QR/code), POS, transactions, guests, menu planner, opt-in forecast, employees & wallets, inventory, waste, kitchen staff attendance, feedback, announcements, reports & client billing, settings, plan & billing
- **Mobile app** (Flutter) — employee mode (menu, opt-in, scan, history, wallet) and staff mode (dashboard, serve, menu, guests…)
- **API** (Node.js + Drizzle) on **Neon Postgres**, with cron jobs for renewals, daily reports, allowances and reminders

```bash
npm install
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL / DIRECT_URL / JWT_SECRET
npm run db:migrate && npm run db:seed
npm run dev
```

Start with **[docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)** · design in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · endpoints in [docs/API.md](docs/API.md).
