/** Website content seeded on first run. Edit later in Super Admin → Website. */

export const SEED_PLANS = [
  {
    code: "starter",
    name: "Starter",
    tagline: "For a single canteen getting off paper registers",
    priceMonthly: 1499,
    priceYearly: 14990,
    trialDays: 14,
    maxCanteens: 1,
    maxEmployees: 150,
    maxStaffUsers: 3,
    features: {
      inventory: false,
      workforce: false,
      biometric: false,
      payroll: true,
      multiCanteen: false,
      api: false,
    },
    highlights: [
      "1 canteen, up to 150 employees",
      "Daily menu & meal sessions",
      "QR meal logging + POS billing",
      "Employee wallet & payroll deduction",
      "Employee mobile app",
      "Daily email reports",
    ],
    isPopular: false,
    sortOrder: 1,
  },
  {
    code: "growth",
    name: "Growth",
    tagline: "For busy corporate canteens that want full control",
    priceMonthly: 3999,
    priceYearly: 39990,
    trialDays: 14,
    maxCanteens: 3,
    maxEmployees: 1000,
    maxStaffUsers: 10,
    features: {
      inventory: true,
      workforce: true,
      biometric: true,
      payroll: true,
      multiCanteen: true,
      api: false,
    },
    highlights: [
      "Up to 3 canteens, 1,000 employees",
      "Everything in Starter",
      "Meal opt-in & headcount forecast",
      "Inventory, suppliers & food-waste tracking",
      "Kitchen staff attendance & wages",
      "Biometric / RFID device integration",
      "Client company billing statements",
    ],
    isPopular: true,
    sortOrder: 2,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    tagline: "For caterers running many sites",
    priceMonthly: 9999,
    priceYearly: 99990,
    trialDays: 14,
    maxCanteens: -1,
    maxEmployees: -1,
    maxStaffUsers: -1,
    features: {
      inventory: true,
      workforce: true,
      biometric: true,
      payroll: true,
      multiCanteen: true,
      api: true,
    },
    highlights: [
      "Unlimited canteens & employees",
      "Everything in Growth",
      "Multi-site P&L and consolidated reports",
      "Device & HRMS integration API",
      "Priority onboarding & support",
    ],
    isPopular: false,
    sortOrder: 3,
  },
];

export const SEED_FAQS = [
  {
    group: "general",
    question: "What is CanteenPro?",
    answer:
      "CanteenPro is cloud canteen management software for corporate, factory and institutional canteens. It covers menu planning, meal logging (QR, biometric or POS), employee wallets and payroll deduction, guest meals, inventory, reports and client billing — with an admin panel and a mobile app.",
  },
  {
    group: "general",
    question: "Who is it built for?",
    answer:
      "Canteen owners and caterers who run one or many company canteens, and companies that run their own employee cafeteria. Managers and cashiers get role-based access, and employees get their own mobile app.",
  },
  {
    group: "product",
    question: "How do employees record a meal?",
    answer:
      "Three ways: scan the daily counter QR from the employee app, show their personal QR to the cashier, or punch on a fingerprint/RFID device. The system prevents double meals in the same session automatically.",
  },
  {
    group: "product",
    question: "Can guests and visitors eat at the canteen?",
    answer:
      "Yes. Register a guest with name, phone, company and host employee, then bill the meal as cash/UPI/card, to the company, or as complimentary. Every guest meal is stored and appears in the guest report.",
  },
  {
    group: "product",
    question: "How does company subsidy work?",
    answer:
      "Each meal session has an employee price and a company subsidy. The employee pays their share (wallet, payroll, cash or UPI) and the subsidy is collected into a monthly client billing statement you can export.",
  },
  {
    group: "product",
    question: "Does it work if the internet is slow?",
    answer:
      "The counter screens are light and work on 4G. For sites with unreliable connectivity we recommend the mobile manager app with a hotspot as backup.",
  },
  {
    group: "pricing",
    question: "Is there a free trial?",
    answer:
      "Yes — every plan starts with a 14-day free trial. No card needed to start. Pay by UPI, card or net banking through Razorpay when you are ready.",
  },
  {
    group: "pricing",
    question: "Can I change plans later?",
    answer:
      "Yes. Upgrade or downgrade any time from Billing in your dashboard. Yearly billing gives you roughly two months free.",
  },
  {
    group: "pricing",
    question: "Is GST included in the price?",
    answer:
      "Plan prices are shown excluding GST. GST is added at checkout and shown on your invoice.",
  },
  {
    group: "general",
    question: "Is my data safe?",
    answer:
      "Data is stored in a managed PostgreSQL database with encrypted connections and daily backups. Each business’s data is isolated and only your team can access it.",
  },
];

export const SEED_CATEGORIES = [
  { name: "Canteen Operations", slug: "canteen-operations" },
  { name: "Food Cost & Waste", slug: "food-cost-waste" },
  { name: "Technology", slug: "technology" },
];

export const SEED_POSTS = [
  {
    category: "technology",
    title:
      "Canteen Management Software: The Complete Guide for Corporate Canteens",
    slug: "canteen-management-software-guide",
    excerpt:
      "What canteen management software does, which features matter for corporate and factory canteens, and how to roll it out without disrupting lunch service.",
    seoTitle:
      "Canteen Management Software – Complete Guide for Corporate Canteens",
    seoDescription:
      "Learn what canteen management software does, the must-have features for corporate canteens, and a step-by-step rollout plan.",
    tags: ["canteen software", "corporate canteen", "guide"],
    content: `Running a company canteen looks simple from the outside: cook, serve, collect money. In practice the canteen owner juggles headcount guesses, paper registers, subsidy calculations, guest meals, cash handling and month-end billing to the client company. **Canteen management software** replaces those registers with one system everyone can trust.

## What canteen management software does

At its core, the software records **who ate what, when, and who pays for it**. Around that core you get:

- **Menu planning** — publish breakfast, lunch, snacks and dinner menus by date so employees know what is being served.
- **Meal logging** — employees scan a QR code, punch a fingerprint, or the cashier records the meal on a POS screen.
- **Payment & subsidy** — the employee share is deducted from a prepaid wallet, salary (payroll) or paid by UPI/cash, while the company subsidy is tracked separately.
- **Guest meals** — visitors, interview candidates and vendors are registered and billed correctly.
- **Reports** — daily sales, department consumption, item sales, payroll deduction sheets and client billing statements.

## Must-have features for corporate canteens

### 1. Duplicate-meal protection
If an employee is entitled to one lunch, the system should block a second scan in the same session. This alone stops a surprising amount of leakage.

### 2. Meal opt-in and headcount forecast
Asking employees to confirm "eating / not eating" before a cut-off time lets the kitchen cook closer to real demand. Combined with historical turn-up rates, you get a reliable forecast.

### 3. Flexible payment modes
Different clients work differently: some deduct from salary, some pre-load a wallet, some pay the full meal. Your software should support **wallet, payroll, company-paid, cash, UPI and card** per employee.

### 4. Client billing statements
Caterers bill the client company every month for subsidised meals. A one-click statement by session and employee saves days of reconciliation.

### 5. An employee mobile app
Employees should see today's menu, opt in, scan to eat, check their wallet and meal history — without calling the canteen.

## Rolling it out in one week

1. **Day 1:** set meal sessions, timings and prices.
2. **Day 2:** import employees from an Excel sheet.
3. **Day 3:** add your menu items and publish this week's menu.
4. **Day 4:** print the counter QR and share the app with employees.
5. **Day 5-7:** run parallel with the paper register, then switch fully.

## The bottom line

Canteen software pays for itself through fewer duplicate meals, less over-cooking and faster month-end billing. Start with the basics — menu, meal logging, payments — and add inventory and waste tracking once the team is comfortable.`,
  },
  {
    category: "food-cost-waste",
    title: "7 Proven Ways to Reduce Food Waste in a Corporate Canteen",
    slug: "reduce-food-waste-corporate-canteen",
    excerpt:
      "Over-production is the biggest source of canteen food waste. Here are seven practical steps — from opt-ins to waste logs — that cut it without running out of food.",
    seoTitle: "How to Reduce Food Waste in a Corporate Canteen – 7 Proven Ways",
    seoDescription:
      "Practical ways to reduce food waste in office and factory canteens: meal opt-ins, headcount forecasting, waste logging and menu engineering.",
    tags: ["food waste", "cost control", "kitchen"],
    content: `Food waste in a company canteen usually comes from one place: **cooking for the number of employees on the payroll instead of the number who will actually eat**. Here is how successful canteens fix it.

## 1. Ask employees to opt in
A simple "Eating / Not eating" toggle in the employee app, closing an hour or two before service, gives the kitchen a real number to plan against.

## 2. Forecast from history, not gut feel
Opt-ins are never 100%. Combine confirmed opt-ins with the average turn-up of employees who didn’t respond over the last two weeks. The result is far more accurate than a fixed percentage.

## 3. Log waste every day
Measure prepared quantity and wasted quantity per session. What gets measured gets managed — after a few weeks you will see which days and dishes cause the most waste.

## 4. Engineer the menu
Dishes that consistently come back uneaten should be rotated out. Use item-wise sales and feedback ratings to decide.

## 5. Cook in batches
Prepare the first 60–70% of the forecast and cook the rest in smaller batches as the counter moves.

## 6. Mark items sold out
When a dish runs out, mark it unavailable in the system so employees see an accurate menu instead of crowding the counter.

## 7. Share the numbers
Show the client company and your team the monthly waste trend. Visible progress keeps everyone motivated.

**Result:** canteens that combine opt-ins, forecasting and daily waste logs typically see a meaningful drop in over-production within the first month.`,
  },
  {
    category: "canteen-operations",
    title:
      "Wallet, Payroll or Cash? Choosing the Right Payment Model for Your Employee Canteen",
    slug: "employee-canteen-payment-models",
    excerpt:
      "Prepaid wallets, salary deduction, company-paid meals and cash each fit different workplaces. Compare them and learn how to run several at once.",
    seoTitle: "Employee Canteen Payment Models: Wallet vs Payroll vs Cash",
    seoDescription:
      "Compare prepaid wallet, payroll deduction, company-paid and cash payments for employee canteens and learn how to combine them.",
    tags: ["cashless canteen", "payroll", "wallet"],
    content: `How employees pay for meals shapes the whole canteen operation — queues, cash handling, reconciliation and month-end disputes.

## Prepaid wallet
Employees (or the company) top up a balance; each meal is debited instantly.
- ✅ No cash at the counter, instant balance visible in the app
- ✅ Company can credit a monthly meal allowance automatically
- ⚠️ Needs a recharge process (UPI at the counter or company top-up)

## Payroll (salary) deduction
Meals are recorded during the month and HR deducts the total from salary.
- ✅ Zero friction at the counter
- ✅ Works well in factories and large offices
- ⚠️ Needs an accurate, exportable deduction sheet every month

## Company-paid / subsidised
The employer pays all or part of each meal; the caterer invoices the company monthly.
- ✅ Simple for employees
- ⚠️ Requires trustworthy meal records to avoid billing disputes

## Cash / UPI
Pay per meal.
- ✅ Good for guests, contractors and walk-ins
- ⚠️ Cash handling and end-of-day reconciliation

## Run them side by side
Most canteens need more than one model: permanent staff on payroll, contractors on wallet, guests on UPI, and the company paying a fixed subsidy on every meal. Choose software that lets you set a **default payment mode per employee** and still override it at the counter.`,
  },
  {
    category: "canteen-operations",
    title:
      "QR Code vs Biometric Meal Tracking: Which Is Better for Your Canteen?",
    slug: "qr-vs-biometric-canteen-meal-tracking",
    excerpt:
      "Both stop proxy meals and paper registers. Here is how QR scanning and fingerprint devices compare on cost, speed and accuracy.",
    seoTitle: "QR Code vs Biometric Meal Tracking for Canteens",
    seoDescription:
      "Compare QR code and biometric fingerprint meal tracking for corporate canteens: cost, speed, hygiene and accuracy.",
    tags: ["qr code", "biometric", "attendance"],
    content: `Replacing the paper canteen register is the first step to accurate billing. The two most common options are QR codes and biometric devices.

## QR code tracking
A daily QR is displayed at the counter; employees scan it from their phone. Alternatively the cashier scans the employee’s personal QR.
- **Cost:** no hardware beyond a printed sheet or a tablet
- **Speed:** 2–3 seconds per employee
- **Security:** a daily rotating QR stops yesterday’s screenshot from working; one meal per session is enforced

## Biometric (fingerprint / face) tracking
Employees punch on a device at the counter.
- **Cost:** one device per counter
- **Speed:** about 1 second per punch, no phone needed
- **Security:** cannot be shared — ideal for factories with large shifts

## Which should you choose?
- Office canteens where everyone has a smartphone → **QR**
- Factories, shift workers, or no-phone zones → **Biometric / RFID**
- Many sites → **both**, depending on the counter

A good canteen system supports both and records them in the same meal log, so reports and billing stay identical regardless of how the meal was captured.`,
  },
];

export const SEED_PAGES = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    seoDescription: "How CanteenPro collects, uses and protects your data.",
    content: `_Last updated: {{date}}_

This Privacy Policy explains how we collect, use and protect information when you use our website, admin panel and mobile applications (the "Service").

## Information we collect
- **Account information:** business name, owner name, email, phone and billing details.
- **Operational data you upload:** employee names, employee codes, phone numbers, departments, meal records, wallet transactions and guest details. You (the canteen operator) control this data; we process it on your behalf.
- **Payment information:** payments are processed by Razorpay. We do not store card numbers.
- **Usage data:** log data such as IP address, device type and pages visited, used to keep the Service secure and reliable.

## How we use information
To provide and improve the Service, process payments, send transactional emails (receipts, renewal reminders, reports), send push notifications you enable, and provide support.

## Sharing
We do not sell personal data. We share data only with service providers needed to run the Service (hosting, database, email delivery, push notifications, payment processing), under appropriate agreements, or when required by law.

## Data retention
We retain your data while your account is active. After cancellation you may request export or deletion.

## Security
Data is encrypted in transit, secrets are encrypted at rest, and access is role-based.

## Your rights
You can access, correct or delete your account data. Contact us using the details on our Contact page.

## Contact
For privacy questions, write to the support email listed on our website.`,
  },
  {
    slug: "terms",
    title: "Terms of Service",
    seoDescription: "Terms that govern the use of CanteenPro.",
    content: `_Last updated: {{date}}_

By creating an account or using the Service you agree to these terms.

## Accounts
You are responsible for your account credentials and for all activity by users you invite.

## Subscription & billing
Plans are billed monthly or yearly in advance. Trials convert only when you choose a paid plan. Prices exclude applicable taxes. If a subscription lapses, access is paused after a short grace period; your data is retained.

## Acceptable use
Do not misuse the Service, attempt to access other customers' data, or upload unlawful content.

## Your data
You own the data you upload. You grant us permission to process it solely to provide the Service.

## Availability
We aim for high availability but do not guarantee uninterrupted service. Planned maintenance is announced in advance where possible.

## Limitation of liability
To the maximum extent permitted by law, our liability is limited to the fees paid in the 3 months before the claim.

## Changes
We may update these terms and will notify account owners of material changes.

## Governing law
These terms are governed by the laws of India.`,
  },
  {
    slug: "refund-policy",
    title: "Refund & Cancellation Policy",
    seoDescription:
      "Refund and cancellation policy for CanteenPro subscriptions.",
    content: `_Last updated: {{date}}_

## Free trial
Every plan starts with a free trial so you can evaluate the Service before paying.

## Cancellation
You can cancel auto-renewal at any time from **Billing**. Your plan stays active until the end of the paid period.

## Refunds
- Monthly plans: payments are non-refundable once the billing period has started.
- Yearly plans: you may request a pro-rated refund for unused full months within 30 days of payment.
- Duplicate or failed-but-debited payments are refunded in full.

Approved refunds are processed to the original payment method within 5–7 working days.

## Contact
Email our support team with your invoice number to request a refund.`,
  },
];
