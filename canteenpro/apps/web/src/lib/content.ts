/** Static marketing content. Pricing, blog, FAQs and legal pages come from the API (Super Admin). */

export const SITE = {
  name: "CanteenPro",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  consoleUrl: process.env.NEXT_PUBLIC_CONSOLE_URL || "http://localhost:5173",
  tagline: "Canteen management software for corporate and factory canteens",
  description:
    "CanteenPro is cloud canteen management software for corporate, factory and institutional canteens: menu planning, QR & biometric meal tracking, POS billing, employee wallet & payroll deduction, guest meals, inventory and client billing — with a mobile app.",
};

export interface Feature {
  slug: string;
  icon: string;
  name: string;
  short: string;
  seoTitle: string;
  seoDescription: string;
  headline: string;
  intro: string;
  points: { title: string; text: string }[];
  faqs: { q: string; a: string }[];
}

export const FEATURES: Feature[] = [
  {
    slug: "meal-tracking",
    icon: "ScanLine",
    name: "QR & biometric meal tracking",
    short:
      "Employees scan a daily QR, show their own QR, or punch a fingerprint. One meal per session, enforced.",
    seoTitle: "Canteen Meal Tracking with QR Code & Biometric | CanteenPro",
    seoDescription:
      "Replace the paper canteen register. Track employee meals with a daily QR code, personal QR or fingerprint device, with automatic duplicate-meal protection.",
    headline: "Every meal recorded the moment it is served",
    intro:
      "Paper registers and coupons leak money: duplicate meals, proxy signatures, lost slips. CanteenPro records each meal against the employee, session and payment in under three seconds.",
    points: [
      {
        title: "Daily counter QR",
        text: "Print or display a QR at the counter. Employees scan it with the app. The code changes every day, so yesterday’s photo doesn’t work.",
      },
      {
        title: "Personal QR & ID cards",
        text: "Cashiers scan the employee’s app QR or printed meal card with a phone or USB scanner.",
      },
      {
        title: "Fingerprint & RFID devices",
        text: "Connect biometric terminals through the device API. Punches create meal records instantly.",
      },
      {
        title: "One meal per session",
        text: "Set how many meals an employee may take per session. Second scans are blocked with a clear message; managers can override.",
      },
      {
        title: "Opt-in enforcement",
        text: "Optionally serve only employees who confirmed they are eating before the cut-off time.",
      },
      {
        title: "Live counter screen",
        text: "See who was just served, per-session counts and sound feedback for every scan.",
      },
    ],
    faqs: [
      {
        q: "Do employees need a smartphone?",
        a: "No. They can use a printed QR meal card, an RFID card or a fingerprint device instead of the app.",
      },
      {
        q: "What stops someone from scanning twice?",
        a: "Each employee is limited to the meals allowed per session. A repeat scan shows “Already served” at the counter.",
      },
    ],
  },
  {
    slug: "menu-planning",
    icon: "CalendarDays",
    name: "Menu planning",
    short:
      "Plan the week by session, copy last week in one click, mark items sold out in real time.",
    seoTitle:
      "Canteen Menu Planning Software – Weekly Menu Planner | CanteenPro",
    seoDescription:
      "Plan breakfast, lunch, snacks and dinner menus for the week, publish to the employee app and mark items sold out in real time.",
    headline: "Plan the week once. Everyone sees it.",
    intro:
      "A weekly planner built around meal sessions. Publish menus to the employee app and notify employees with a push notification.",
    points: [
      {
        title: "Weekly grid by session",
        text: "Breakfast, lunch, snacks and dinner across seven days in one view.",
      },
      {
        title: "Dish catalog",
        text: "Employee price, guest price, food cost, calories, veg/non-veg marks, photos and highlights.",
      },
      {
        title: "Repeat last week",
        text: "Copy a week’s menu forward and only change what’s different.",
      },
      {
        title: "Sold-out toggle",
        text: "Mark a dish unavailable mid-service so the app and POS stay accurate.",
      },
      {
        title: "Day-specific pricing",
        text: "Override a dish price for a specific day or festival special.",
      },
      {
        title: "Menu notifications",
        text: "Tell employees the menu is live with one tap.",
      },
    ],
    faqs: [
      {
        q: "Can different canteens have different menus?",
        a: "Yes. Every canteen has its own sessions, timings, prices and daily menu.",
      },
    ],
  },
  {
    slug: "pos-billing",
    icon: "ShoppingCart",
    name: "POS billing",
    short:
      "Fast à-la-carte billing for employees, guests and walk-ins with printed receipts.",
    seoTitle: "Canteen POS Billing Software | CanteenPro",
    seoDescription:
      "Touch-friendly canteen POS for employees, guests and walk-ins. Wallet, payroll, UPI, cash, card and company-paid bills with GST receipts.",
    headline: "A counter POS made for canteen rush hour",
    intro:
      "Tap dishes, pick the customer, choose the payment and print. Built for tablets and desktops at busy counters.",
    points: [
      {
        title: "Employee, guest or walk-in",
        text: "Look up employees by name, code, phone or QR; select registered guests; or bill walk-ins.",
      },
      {
        title: "Seven payment modes",
        text: "Wallet, payroll deduction, company-paid, cash, UPI, card or complimentary.",
      },
      {
        title: "GST-ready bills",
        text: "Sequential bill numbers per canteen and tax-inclusive GST on every bill.",
      },
      {
        title: "Manager controls",
        text: "Only managers can discount, override meal rules or cancel bills — with an audit trail.",
      },
      {
        title: "Wallet refunds",
        text: "Cancelling a wallet bill refunds the employee automatically.",
      },
      {
        title: "Thermal-printer receipts",
        text: "Clean 80mm receipts from the browser.",
      },
    ],
    faqs: [
      {
        q: "Which printers work?",
        a: "Any printer your computer or tablet can print to, including 80mm thermal receipt printers.",
      },
    ],
  },
  {
    slug: "employee-wallet-payroll",
    icon: "Wallet",
    name: "Employee wallet & payroll",
    short:
      "Prepaid wallets, monthly allowances, salary deduction sheets and company subsidy — side by side.",
    seoTitle: "Cashless Canteen Wallet & Payroll Deduction | CanteenPro",
    seoDescription:
      "Run a cashless canteen with employee wallets, automatic monthly meal allowance, payroll deduction exports and company subsidy tracking.",
    headline: "Go cashless without changing how your client pays",
    intro:
      "Each employee has a default payment mode. The employee’s share and the company subsidy are tracked separately on every meal.",
    points: [
      {
        title: "Prepaid wallet",
        text: "Recharge at the counter or in bulk; balance visible in the employee app.",
      },
      {
        title: "Monthly allowance",
        text: "Automatically credit a meal allowance on the 1st of every month.",
      },
      {
        title: "Payroll deduction",
        text: "Export a salary-deduction sheet for HR at month end.",
      },
      {
        title: "Company subsidy",
        text: "Split every session price into employee share and company share.",
      },
      {
        title: "Credit limit",
        text: "Optionally allow wallets to go negative up to a limit you set.",
      },
      {
        title: "Full ledger",
        text: "Every credit, debit and refund with balance history.",
      },
    ],
    faqs: [
      {
        q: "Can some employees use wallet and others payroll?",
        a: "Yes — payment mode is set per employee and can be overridden at the counter.",
      },
    ],
  },
  {
    slug: "guest-management",
    icon: "UserRoundPlus",
    name: "Guests & visitors",
    short:
      "Register visitors, interview candidates and vendors. Every guest meal is stored and billable.",
    seoTitle: "Guest Meal Management for Company Canteens | CanteenPro",
    seoDescription:
      "Register canteen guests and visitors, bill them by cash, UPI or to the company, and keep a full record of every guest meal.",
    headline: "Visitors eat. You still have the record.",
    intro:
      "Guests often go unrecorded and unbilled. CanteenPro registers each visitor with a host employee and bills the meal correctly.",
    points: [
      {
        title: "Guest passes",
        text: "Name, phone, company, purpose, host employee and validity.",
      },
      {
        title: "Guest pricing",
        text: "Separate guest price per session or per dish.",
      },
      {
        title: "Bill to company",
        text: "Client-paid guest meals flow into the monthly billing statement.",
      },
      {
        title: "Guest report",
        text: "Who visited, who hosted, what they ate and how it was paid.",
      },
    ],
    faqs: [
      {
        q: "Can guest meals be turned off?",
        a: "Yes, per canteen, from Settings.",
      },
    ],
  },
  {
    slug: "inventory-food-waste",
    icon: "Boxes",
    name: "Inventory & food waste",
    short:
      "Track raw material stock, purchases and waste. Forecast headcount so you cook just enough.",
    seoTitle: "Canteen Inventory & Food Waste Management | CanteenPro",
    seoDescription:
      "Canteen inventory with purchases, kitchen issues, low-stock alerts, supplier records, daily food-waste logs and opt-in based headcount forecasting.",
    headline: "Cook for the people who will actually eat",
    intro:
      "Over-production is the biggest leak in most canteens. Opt-ins, forecasts and waste logs close it.",
    points: [
      {
        title: "Headcount forecast",
        text: "Confirmed opt-ins plus the typical turn-up of those who didn’t respond.",
      },
      {
        title: "Stock in / out",
        text: "Purchases with supplier and invoice, kitchen issues, wastage and stock-count adjustments.",
      },
      {
        title: "Weighted average cost",
        text: "Stock value updates automatically with every purchase.",
      },
      {
        title: "Low-stock alerts",
        text: "Dashboard warnings and a morning email to the owner.",
      },
      {
        title: "Food-waste log",
        text: "Prepared vs wasted kg per session with reasons and trends.",
      },
      {
        title: "Expenses & P&L",
        text: "Gas, electricity, rent and wages roll into a monthly profit report.",
      },
    ],
    faqs: [
      {
        q: "Is inventory required?",
        a: "No. Many canteens start with menus and meal tracking and switch on inventory later.",
      },
    ],
  },
  {
    slug: "reports-client-billing",
    icon: "FileBarChart2",
    name: "Reports & client billing",
    short:
      "Month-end client statements, payroll sheets, department and item reports — exported in a click.",
    seoTitle: "Canteen Reports & Client Billing Statements | CanteenPro",
    seoDescription:
      "Generate monthly client billing statements with GST, payroll deduction sheets, department consumption, item sales, P&L and daily email reports.",
    headline: "Month-end in minutes, not days",
    intro:
      "Every meal record already knows who ate, when, and who pays. Reports are just the right view of it.",
    points: [
      {
        title: "Client billing statement",
        text: "Company subsidy by session and employee, with GST breakdown, ready to print.",
      },
      { title: "Payroll sheet", text: "Per-employee deduction totals for HR." },
      {
        title: "Department consumption",
        text: "Meals and cost per department or cost centre.",
      },
      {
        title: "Item sales & margin",
        text: "What sells, and what it costs you.",
      },
      {
        title: "Daily email report",
        text: "Meals, collections, subsidy, guests and waste — every evening.",
      },
      {
        title: "CSV / Excel export",
        text: "Every report and list exports to CSV.",
      },
    ],
    faqs: [
      {
        q: "Can I give the client company access?",
        a: "You can export and share the statement each month. Read-only client access is on the roadmap.",
      },
    ],
  },
  {
    slug: "mobile-app",
    icon: "Smartphone",
    name: "Mobile app",
    short:
      "One app for employees (menu, opt-in, scan, wallet) and managers (serve, dashboard, sold-out).",
    seoTitle: "Canteen Mobile App for Employees & Managers | CanteenPro",
    seoDescription:
      "Android & iOS canteen app: employees see menus, opt in, scan to eat and check wallet; managers scan QR to serve, view live dashboard and manage menus.",
    headline: "The canteen in every pocket",
    intro:
      "Employees sign in with their mobile number and PIN. Owners and managers sign in with email to run the counter from a phone.",
    points: [
      {
        title: "Today’s menu",
        text: "Dish photos, calories, veg marks and availability.",
      },
      {
        title: "Eating today?",
        text: "One-tap opt-in before the cut-off, with reminders.",
      },
      {
        title: "Scan to eat",
        text: "Scan the counter QR; confirmation shows instantly.",
      },
      {
        title: "Wallet & history",
        text: "Balance, recharges, meal history and ratings.",
      },
      {
        title: "Manager mode",
        text: "Camera scanning, live counts, forecast and sold-out toggles.",
      },
      {
        title: "Push notifications",
        text: "Menu live, opt-in reminders, wallet credits and announcements.",
      },
    ],
    faqs: [
      {
        q: "Is there a separate app for managers?",
        a: "No — the same app switches to manager mode when a staff account signs in.",
      },
    ],
  },
];

export interface Solution {
  slug: string;
  name: string;
  seoTitle: string;
  seoDescription: string;
  headline: string;
  intro: string;
  pains: string[];
  answers: { title: string; text: string }[];
}

export const SOLUTIONS: Solution[] = [
  {
    slug: "corporate-offices",
    name: "Corporate offices",
    seoTitle: "Corporate Canteen Management Software for Offices | CanteenPro",
    seoDescription:
      "Run your office cafeteria with menus in the app, QR meal logging, wallet or payroll payments and monthly reports for HR and admin.",
    headline: "An office cafeteria employees actually like using",
    intro:
      "For admin and facility teams running a subsidised cafeteria for hundreds of employees.",
    pains: [
      "Long queues at lunch",
      "Disputes over coupons and registers",
      "No idea how many will eat today",
      "Month-end reconciliation with HR",
    ],
    answers: [
      {
        title: "Menus in the app",
        text: "Employees see what’s cooking and opt in before the cut-off.",
      },
      {
        title: "3-second QR serving",
        text: "Scan and go — no coupons, no registers.",
      },
      {
        title: "HR-ready exports",
        text: "Payroll deductions and department reports in one click.",
      },
    ],
  },
  {
    slug: "factories-plants",
    name: "Factories & plants",
    seoTitle: "Factory Canteen Management Software with Biometric | CanteenPro",
    seoDescription:
      "Shift-based factory canteen software with biometric meal punching, contractor wallets, guest meals and client billing statements.",
    headline: "Built for shifts, fingerprints and big numbers",
    intro:
      "For plant canteens serving multiple shifts, contract labour and visitors.",
    pains: [
      "Proxy meals on paper registers",
      "Contract workers paying differently",
      "Shift timings across the day",
      "Food waste from guesswork",
    ],
    answers: [
      {
        title: "Biometric punching",
        text: "Fingerprint devices serve the current session’s meal automatically.",
      },
      {
        title: "Flexible payment per worker",
        text: "Payroll for permanent staff, wallet for contractors, company-paid for visitors.",
      },
      {
        title: "Headcount forecast",
        text: "Plan quantities from opt-ins and recent turn-up.",
      },
    ],
  },
  {
    slug: "contract-caterers",
    name: "Contract caterers",
    seoTitle:
      "Software for Contract Caterers Running Multiple Canteens | CanteenPro",
    seoDescription:
      "Multi-site canteen software for caterers: separate menus and pricing per client site, client billing statements, inventory and P&L per canteen.",
    headline: "Every client site, one dashboard",
    intro:
      "For catering businesses running canteens for several client companies.",
    pains: [
      "Different pricing and subsidy per client",
      "Chasing monthly payments with weak records",
      "No visibility across sites",
      "Managers per site need limited access",
    ],
    answers: [
      {
        title: "Canteen per client",
        text: "Each site has its own sessions, prices, menus and employees.",
      },
      {
        title: "Client statements",
        text: "GST-ready monthly billing statements from real meal records.",
      },
      {
        title: "Role-based access",
        text: "Managers and cashiers only see the canteens you assign them.",
      },
    ],
  },
  {
    slug: "hospitals-campuses",
    name: "Hospitals & campuses",
    seoTitle:
      "Cafeteria Management for Hospitals, Colleges & Campuses | CanteenPro",
    seoDescription:
      "Cafeteria software for hospitals, colleges and large campuses: staff meal entitlements, visitor billing, cashless wallets and inventory.",
    headline: "Staff, students and visitors in one system",
    intro:
      "For cafeterias that serve staff on entitlement and visitors on payment.",
    pains: [
      "Mixed paying and entitled diners",
      "Night shifts and odd hours",
      "Cash handling",
      "Stock running out unnoticed",
    ],
    answers: [
      {
        title: "Entitlements & wallets",
        text: "Staff meals on entitlement, everyone else pays by UPI, card or wallet.",
      },
      {
        title: "Sessions for every shift",
        text: "Add as many sessions as you need, including overnight.",
      },
      { title: "Low-stock alerts", text: "Get warned before you run out." },
    ],
  },
];

export const FLOW = [
  {
    title: "Plan the menu",
    text: "Set sessions and prices, plan the week, publish to the app.",
  },
  {
    title: "Employees opt in",
    text: "They confirm before the cut-off. The kitchen sees a headcount forecast.",
  },
  {
    title: "Serve at the counter",
    text: "QR, ID card or fingerprint. Wallet, payroll or company pays — automatically.",
  },
  {
    title: "Bill at month end",
    text: "Client statement, payroll sheet and P&L are already done.",
  },
];
