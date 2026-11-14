/* =====================================================================
 *  CanteenPro — centralized multi-tenant database schema (Neon Postgres)
 *
 *  Two layers live in one database:
 *   1. PLATFORM — SaaS owner data: plans, tenants, subscriptions, payments,
 *                 website CMS (blog, pages, FAQs), leads, settings, email.
 *   2. TENANT   — every row carries tenant_id: canteens, employees, menus,
 *                 orders (POS + meal attendance), wallet, guests, inventory…
 *
 *  Column names are written in camelCase here and stored as snake_case
 *  (casing: "snake_case" in db/index.ts and drizzle.config.ts).
 * ===================================================================== */
import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// ------------------------------- helpers------------
const id = () =>
  text()
    .primaryKey()
    .$defaultFn(() => createId());
const money = () => numeric({ precision: 12, scale: 2, mode: "number" });
const qty = () => numeric({ precision: 12, scale: 3, mode: "number" });
const createdAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const textArray = () =>
  text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`);

// ---------------------------------------------------------------- enums
export const platformRole = pgEnum("platform_role", [
  "SUPER_ADMIN",
  "SUPPORT",
  "CONTENT_EDITOR",
]);
export const staffRole = pgEnum("staff_role", [
  "OWNER",
  "MANAGER",
  "CASHIER",
  "KITCHEN",
]);
export const tenantStatus = pgEnum("tenant_status", [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELLED",
]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "EXPIRED",
  "CANCELLED",
]);
export const billingCycle = pgEnum("billing_cycle", ["MONTHLY", "YEARLY"]);
export const paymentStatus = pgEnum("payment_status", [
  "CREATED",
  "PAID",
  "FAILED",
  "REFUNDED",
]);
export const employeeStatus = pgEnum("employee_status", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);
export const foodType = pgEnum("food_type", [
  "VEG",
  "NON_VEG",
  "EGG",
  "VEGAN",
  "JAIN",
]);
export const consumerType = pgEnum("consumer_type", [
  "EMPLOYEE",
  "GUEST",
  "WALK_IN",
]);
export const orderChannel = pgEnum("order_channel", [
  "POS",
  "QR_SCAN",
  "EMPLOYEE_QR",
  "BIOMETRIC",
  "KIOSK",
  "MOBILE",
]);
export const paymentMode = pgEnum("payment_mode", [
  "WALLET",
  "PAYROLL",
  "COMPANY",
  "CASH",
  "UPI",
  "CARD",
  "COMPLIMENTARY",
]);
export const orderStatus = pgEnum("order_status", [
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);
export const optInStatus = pgEnum("opt_in_status", ["OPTED_IN", "OPTED_OUT"]);
export const walletTxnType = pgEnum("wallet_txn_type", ["CREDIT", "DEBIT"]);
export const stockMovementType = pgEnum("stock_movement_type", [
  "PURCHASE",
  "CONSUMPTION",
  "WASTAGE",
  "ADJUSTMENT",
  "RETURN",
]);
export const attendanceStatus = pgEnum("attendance_status", [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "LEAVE",
]);
export const postStatus = pgEnum("post_status", ["DRAFT", "PUBLISHED"]);
export const leadStatus = pgEnum("lead_status", [
  "NEW",
  "CONTACTED",
  "DEMO_SCHEDULED",
  "CONVERTED",
  "LOST",
]);
export const notificationAudience = pgEnum("notification_audience", [
  "ALL_EMPLOYEES",
  "CANTEEN",
  "DEPARTMENT",
  "EMPLOYEE",
  "STAFF",
  "TENANT_OWNERS",
]);
export const deviceType = pgEnum("device_type", [
  "BIOMETRIC",
  "KIOSK",
  "POS_TERMINAL",
  "QR_SCANNER",
]);

/* =====================================================================
 *  PLATFORM LAYER
 * ===================================================================== */

export const platformUsers = pgTable("platform_users", {
  id: id(),
  name: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),
  role: platformRole().notNull().default("SUPER_ADMIN"),
  isActive: boolean().notNull().default(true),
  lastLoginAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const plans = pgTable("plans", {
  id: id(),
  code: text().notNull().unique(), // starter | growth | enterprise
  name: text().notNull(),
  tagline: text(),
  priceMonthly: money().notNull(),
  priceYearly: money().notNull(),
  currency: text().notNull().default("INR"),
  trialDays: integer().notNull().default(14),
  maxCanteens: integer().notNull().default(1), // -1 = unlimited
  maxEmployees: integer().notNull().default(200),
  maxStaffUsers: integer().notNull().default(3),
  // feature flags: {"inventory":true,"biometric":false,"payroll":true,"multiCanteen":false,"api":false}
  features: jsonb().$type<Record<string, boolean>>().notNull().default({}),
  highlights: textArray(), // marketing bullet points
  isPopular: boolean().notNull().default(false),
  isActive: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const coupons = pgTable("coupons", {
  id: id(),
  code: text().notNull().unique(),
  description: text(),
  percentOff: integer(),
  amountOff: money(),
  maxRedemptions: integer(),
  redeemedCount: integer().notNull().default(0),
  validUntil: timestamp({ withTimezone: true }),
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
});

export const tenants = pgTable("tenants", {
  id: id(),
  name: text().notNull(), // "Dinesh Caterers"
  slug: text().notNull().unique(),
  email: text().notNull(),
  phone: text(),
  gstin: text(),
  address: text(),
  city: text(),
  state: text(),
  country: text().notNull().default("India"),
  logoUrl: text(),
  currency: text().notNull().default("INR"),
  timezone: text().notNull().default("Asia/Kolkata"),
  status: tenantStatus().notNull().default("TRIAL"),
  source: text(), // website | sales | referral
  notes: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    planId: text()
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatus().notNull().default("TRIALING"),
    billingCycle: billingCycle().notNull().default("MONTHLY"),
    currentPeriodStart: timestamp({ withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp({ withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean().notNull().default(false),
    lastReminderAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex().on(t.tenantId),
    index().on(t.status, t.currentPeriodEnd),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    subscriptionId: text().references(() => subscriptions.id),
    planId: text().references(() => plans.id),
    billingCycle: billingCycle(),
    invoiceNo: text().unique(),
    amount: money().notNull(), // incl. tax
    taxAmount: money().notNull().default(0),
    currency: text().notNull().default("INR"),
    status: paymentStatus().notNull().default("CREATED"),
    couponCode: text(),
    razorpayOrderId: text().unique(),
    razorpayPaymentId: text(),
    razorpaySignature: text(),
    method: text(),
    failureReason: text(),
    paidAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.tenantId, t.createdAt)],
);

/** Key/value platform configuration. Secrets are AES-256-GCM encrypted. */
export const platformSettings = pgTable("platform_settings", {
  key: text().primaryKey(),
  value: text().notNull(),
  isSecret: boolean().notNull().default(false),
  updatedAt: updatedAt(),
});

export const emailTemplates = pgTable("email_templates", {
  id: id(),
  key: text().notNull().unique(),
  name: text().notNull(),
  subject: text().notNull(),
  html: text().notNull(), // supports {{variables}}
  isActive: boolean().notNull().default(true),
  updatedAt: updatedAt(),
});

export const emailLogs = pgTable(
  "email_logs",
  {
    id: id(),
    to: text().notNull(),
    subject: text().notNull(),
    template: text(),
    status: text().notNull(), // SENT | FAILED | SKIPPED
    error: text(),
    tenantId: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.createdAt)],
);

export const blogCategories = pgTable("blog_categories", {
  id: id(),
  name: text().notNull(),
  slug: text().notNull().unique(),
});

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: id(),
    title: text().notNull(),
    slug: text().notNull().unique(),
    excerpt: text(),
    content: text().notNull(), // Markdown
    coverImage: text(),
    status: postStatus().notNull().default("DRAFT"),
    tags: textArray(),
    seoTitle: text(),
    seoDescription: text(),
    readingMinutes: integer().notNull().default(4),
    publishedAt: timestamp({ withTimezone: true }),
    categoryId: text().references(() => blogCategories.id, {
      onDelete: "set null",
    }),
    authorId: text().references(() => platformUsers.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.status, t.publishedAt)],
);

export const cmsPages = pgTable("cms_pages", {
  id: id(),
  slug: text().notNull().unique(), // privacy-policy | terms | refund-policy
  title: text().notNull(),
  content: text().notNull(), // Markdown
  seoDescription: text(),
  status: postStatus().notNull().default("PUBLISHED"),
  updatedAt: updatedAt(),
});

export const testimonials = pgTable("testimonials", {
  id: id(),
  name: text().notNull(),
  role: text(),
  company: text(),
  quote: text().notNull(),
  rating: integer().notNull().default(5),
  avatarUrl: text(),
  isActive: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  createdAt: createdAt(),
});

export const faqs = pgTable("faqs", {
  id: id(),
  question: text().notNull(),
  answer: text().notNull(),
  group: text().notNull().default("general"), // general | pricing | product
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
});

export const leads = pgTable("leads", {
  id: id(),
  name: text().notNull(),
  email: text().notNull(),
  phone: text(),
  company: text(),
  employees: text(), // size bucket
  message: text(),
  type: text().notNull().default("contact"), // contact | demo
  status: leadStatus().notNull().default("NEW"),
  source: text(),
  notes: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* =====================================================================
 *  TENANT LAYER
 * ===================================================================== */

export const staffUsers = pgTable(
  "staff_users",
  {
    id: id(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text().notNull(),
    email: text().notNull().unique(),
    phone: text(),
    passwordHash: text().notNull(),
    role: staffRole().notNull().default("MANAGER"),
    canteenIds: textArray(), // empty = all canteens
    isActive: boolean().notNull().default(true),
    lastLoginAt: timestamp({ withTimezone: true }),
    resetToken: text(),
    resetExpires: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.tenantId)],
);

/** A physical canteen site. A caterer may run many, each serving a client company. */
export const canteens = pgTable(
  "canteens",
  {
    id: id(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text().notNull(),
    code: text().notNull(),
    clientCompany: text(),
    clientGstin: text(),
    address: text(),
    phone: text(),
    isActive: boolean().notNull().default(true),
    allowGuests: boolean().notNull().default(true),
    optInRequired: boolean().notNull().default(false),
    autoPublishMenus: boolean().notNull().default(true),
    maintenanceMode: boolean().notNull().default(false),
    allowNegativeWallet: boolean().notNull().default(false),
    walletCreditLimit: money().notNull().default(0),
    gstPercent: numeric({ precision: 5, scale: 2, mode: "number" })
      .notNull()
      .default(5),
    billPrefix: text().notNull().default("BL"),
    billCounter: integer().notNull().default(0),
    qrSecret: text()
      .notNull()
      .$defaultFn(() => createId() + createId()),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex().on(t.tenantId, t.code), index().on(t.tenantId)],
);

/** Breakfast / Lunch / Snacks / Dinner with timings and fixed-meal pricing. */
export const mealSessions = pgTable(
  "meal_sessions",
  {
    id: id(),
    canteenId: text()
      .notNull()
      .references(() => canteens.id, { onDelete: "cascade" }),
    name: text().notNull(),
    startTime: text().notNull(), // "07:30"
    endTime: text().notNull(), // "10:00"
    optInCutoff: text(), // "10:30"
    employeePrice: money().notNull().default(0), // paid by employee
    companySubsidy: money().notNull().default(0), // billed to client company
    guestPrice: money().notNull().default(0),
    mealsPerDay: integer().notNull().default(1),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
  },
  (t) => [index().on(t.canteenId)],
);

export const departments = pgTable(
  "departments",
  {
    id: id(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text().notNull(),
    costCenter: text(),
  },
  (t) => [uniqueIndex().on(t.tenantId, t.name)],
);

/** People who eat. They log in to the mobile app with phone + 4-digit PIN. */
export const employees = pgTable(
  "employees",
  {
    id: id(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    canteenId: text()
      .notNull()
      .references(() => canteens.id),
    departmentId: text().references(() => departments.id, {
      onDelete: "set null",
    }),
    employeeCode: text().notNull(),
    name: text().notNull(),
    phone: text(),
    email: text(),
    designation: text(),
    pinHash: text(),
    pinChangedAt: timestamp({ withTimezone: true }), // null → app forces PIN change
    photoUrl: text(),
    dietaryPref: foodType().notNull().default("VEG"),
    allergies: text(),
    status: employeeStatus().notNull().default("ACTIVE"),
    walletBalance: money().notNull().default(0),
    monthlyAllowance: money().notNull().default(0), // auto-credited on the 1st
    defaultPayMode: paymentMode().notNull().default("WALLET"),
    qrToken: text()
      .notNull()
      .unique()
      .$defaultFn(() => createId()),
    biometricId: text(),
    biometricSynced: boolean().notNull().default(false),
    rfidCard: text(),
    joinedAt: date({ mode: "string" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex().on(t.tenantId, t.employeeCode),
    index().on(t.tenantId, t.canteenId),
    index().on(t.phone),
  ],
);

export const menuCategories = pgTable(
  "menu_categories",
  {
    id: id(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text().notNull(),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [uniqueIndex().on(t.tenantId, t.name)],
);

/** Master dish catalog. */
export const menuItems = pgTable(
  "menu_items",
  {
    id: id(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    categoryId: text().references(() => menuCategories.id, {
      onDelete: "set null",
    }),
    name: text().notNull(),
    description: text(),
    imageUrl: text(),
    price: money().notNull(),
    guestPrice: money(),
    costPrice: money(),
    foodType: foodType().notNull().default("VEG"),
    calories: integer(),
    prepMinutes: integer(),
    tags: textArray(),
    highlights: textArray(),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.tenantId)],
);

/** What is served on a date for a session. */
export const dailyMenus = pgTable(
  "daily_menus",
  {
    id: id(),
    canteenId: text()
      .notNull()
      .references(() => canteens.id, { onDelete: "cascade" }),
    mealSessionId: text()
      .notNull()
      .references(() => mealSessions.id, { onDelete: "cascade" }),
    date: date({ mode: "string" }).notNull(),
    isPublished: boolean().notNull().default(true),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.canteenId, t.mealSessionId, t.date)],
);

export const dailyMenuItems = pgTable(
  "daily_menu_items",
  {
    id: id(),
    dailyMenuId: text()
      .notNull()
      .references(() => dailyMenus.id, { onDelete: "cascade" }),
    menuItemId: text()
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    priceOverride: money(),
    plannedQty: integer(),
    isAvailable: boolean().notNull().default(true),
  },
  (t) => [uniqueIndex().on(t.dailyMenuId, t.menuItemId)],
);

/** Headcount planning — employees confirm whether they'll eat. */
export const mealOptIns = pgTable(
  "meal_opt_ins",
  {
    id: id(),
    canteenId: text()
      .notNull()
      .references(() => canteens.id, { onDelete: "cascade" }),
    employeeId: text()
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    mealSessionId: text()
      .notNull()
      .references(() => mealSessions.id, { onDelete: "cascade" }),
    date: date({ mode: "string" }).notNull(),
    status: optInStatus().notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex().on(t.employeeId, t.mealSessionId, t.date),
    index().on(t.canteenId, t.date),
  ],
);

export const guests = pgTable(
  "guests",
  {
    id: id(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    canteenId: text()
      .notNull()
      .references(() => canteens.id, { onDelete: "cascade" }),
    name: text().notNull(),
    phone: text(),
    email: text(),
    company: text(),
    purpose: text(),
    hostEmployeeId: text().references(() => employees.id, {
      onDelete: "set null",
    }),
    idProof: text(),
    validFrom: timestamp({ withTimezone: true }).notNull().defaultNow(),
    validUntil: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.tenantId, t.canteenId), index().on(t.phone)],
);

/** Every meal served / sale made. Doubles as meal attendance ("Who ate today"). */
export const orders = pgTable(
  "orders",
  {
    id: id(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    canteenId: text()
      .notNull()
      .references(() => canteens.id, { onDelete: "cascade" }),
    billNo: text().notNull(),
    consumerType: consumerType().notNull(),
    employeeId: text().references(() => employees.id, { onDelete: "set null" }),
    guestId: text().references(() => guests.id, { onDelete: "set null" }),
    walkInName: text(),
    mealSessionId: text().references(() => mealSessions.id, {
      onDelete: "set null",
    }),
    businessDate: date({ mode: "string" }).notNull(), // local date in tenant timezone
    channel: orderChannel().notNull().default("POS"),
    paymentMode: paymentMode().notNull(),
    isFixedMeal: boolean().notNull().default(false), // session meal vs à-la-carte
    subtotal: money().notNull(),
    taxAmount: money().notNull().default(0), // GST included in total (for reports)
    discount: money().notNull().default(0),
    subsidyAmount: money().notNull().default(0), // billed to client company
    total: money().notNull(), // collected from consumer
    status: orderStatus().notNull().default("COMPLETED"),
    notes: text(),
    cancelReason: text(),
    servedById: text().references(() => staffUsers.id, {
      onDelete: "set null",
    }),
    deviceId: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex().on(t.canteenId, t.billNo),
    index().on(t.tenantId, t.businessDate),
    index().on(t.canteenId, t.businessDate),
    index().on(t.employeeId, t.businessDate),
  ],
);

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: text()
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: text().references(() => menuItems.id, { onDelete: "set null" }),
  name: text().notNull(),
  unitPrice: money().notNull(),
  quantity: integer().notNull().default(1),
  lineTotal: money().notNull(),
});

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: id(),
    tenantId: text().notNull(),
    employeeId: text()
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    type: walletTxnType().notNull(),
    amount: money().notNull(),
    balanceAfter: money().notNull(),
    reason: text().notNull(), // RECHARGE | MEAL | REFUND | ALLOWANCE | ADJUSTMENT
    reference: text(),
    note: text(),
    createdById: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.employeeId, t.createdAt),
    index().on(t.tenantId, t.createdAt),
  ],
);

export const feedback = pgTable(
  "feedback",
  {
    id: id(),
    tenantId: text().notNull(),
    canteenId: text()
      .notNull()
      .references(() => canteens.id, { onDelete: "cascade" }),
    employeeId: text().references(() => employees.id, { onDelete: "set null" }),
    orderId: text().references(() => orders.id, { onDelete: "set null" }),
    menuItemId: text().references(() => menuItems.id, { onDelete: "set null" }),
    rating: integer().notNull(),
    comment: text(),
    reply: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.canteenId, t.createdAt)],
);

// ---------- Back office: inventory, purchases, waste, expenses ----------

export const suppliers = pgTable("suppliers", {
  id: id(),
  tenantId: text()
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text().notNull(),
  phone: text(),
  email: text(),
  gstin: text(),
  address: text(),
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
});

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: id(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text().notNull(),
    unit: text().notNull(), // kg | L | pcs
    category: text(),
    currentStock: qty().notNull().default(0),
    reorderLevel: qty().notNull().default(0),
    avgCost: money().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex().on(t.tenantId, t.name)],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: id(),
    tenantId: text().notNull(),
    inventoryItemId: text()
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    canteenId: text().references(() => canteens.id, { onDelete: "set null" }),
    supplierId: text().references(() => suppliers.id, { onDelete: "set null" }),
    type: stockMovementType().notNull(),
    quantity: qty().notNull(), // positive; type decides direction
    unitCost: money(),
    invoiceRef: text(),
    note: text(),
    createdById: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.inventoryItemId, t.createdAt)],
);

export const wasteLogs = pgTable(
  "waste_logs",
  {
    id: id(),
    tenantId: text().notNull(),
    canteenId: text()
      .notNull()
      .references(() => canteens.id, { onDelete: "cascade" }),
    date: date({ mode: "string" }).notNull(),
    mealSessionId: text().references(() => mealSessions.id, {
      onDelete: "set null",
    }),
    preparedQtyKg: qty(),
    wastedQtyKg: qty().notNull(),
    reason: text(),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.canteenId, t.date)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    tenantId: text()
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    canteenId: text().references(() => canteens.id, { onDelete: "set null" }),
    date: date({ mode: "string" }).notNull(),
    category: text().notNull(), // Gas, Electricity, Salary, Maintenance, Rent
    amount: money().notNull(),
    paidTo: text(),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.tenantId, t.date)],
);

// ---------- Canteen workforce (cooks, helpers) & their attendance ----------

export const canteenWorkers = pgTable("canteen_workers", {
  id: id(),
  tenantId: text()
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  canteenId: text()
    .notNull()
    .references(() => canteens.id, { onDelete: "cascade" }),
  name: text().notNull(),
  phone: text(),
  role: text().notNull(), // Head Cook, Helper, Cleaner
  dailyWage: money().notNull().default(0),
  biometricId: text(),
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
});

export const workerAttendance = pgTable(
  "worker_attendance",
  {
    id: id(),
    tenantId: text().notNull(),
    workerId: text()
      .notNull()
      .references(() => canteenWorkers.id, { onDelete: "cascade" }),
    date: date({ mode: "string" }).notNull(),
    status: attendanceStatus().notNull().default("PRESENT"),
    checkIn: timestamp({ withTimezone: true }),
    checkOut: timestamp({ withTimezone: true }),
    note: text(),
  },
  (t) => [uniqueIndex().on(t.workerId, t.date)],
);

// ---------- Integrations & messaging ----------

/** Biometric terminals, kiosks, POS tablets. Authenticate with an API key. */
export const devices = pgTable("devices", {
  id: id(),
  tenantId: text()
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  canteenId: text()
    .notNull()
    .references(() => canteens.id, { onDelete: "cascade" }),
  name: text().notNull(),
  type: deviceType().notNull(),
  apiKeyHash: text().notNull(),
  keyPrefix: text().notNull(),
  lastSeenAt: timestamp({ withTimezone: true }),
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    tenantId: text().references(() => tenants.id, { onDelete: "cascade" }),
    canteenId: text(),
    audience: notificationAudience().notNull(),
    targetId: text(), // department id / employee id
    title: text().notNull(),
    body: text().notNull(),
    type: text().notNull().default("GENERAL"), // MENU | REMINDER | SYSTEM | WALLET | GENERAL
    pushStatus: text(),
    sentById: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.tenantId, t.createdAt)],
);

export const notificationReads = pgTable(
  "notification_reads",
  {
    notificationId: text()
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    employeeId: text().notNull(),
    readAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.notificationId, t.employeeId] })],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    tenantId: text(),
    actorType: text().notNull(), // PLATFORM | STAFF | EMPLOYEE | DEVICE | SYSTEM
    actorId: text(),
    action: text().notNull(),
    entity: text(),
    entityId: text(),
    meta: jsonb(),
    ip: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.tenantId, t.createdAt)],
);

/* =====================================================================
 *  RELATIONS (for db.query.*.findMany({ with: … }))
 * ===================================================================== */

export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  subscription: one(subscriptions, {
    fields: [tenants.id],
    references: [subscriptions.tenantId],
  }),
  canteens: many(canteens),
  staff: many(staffUsers),
  payments: many(payments),
}));
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subscriptions.tenantId],
    references: [tenants.id],
  }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  plan: one(plans, { fields: [payments.planId], references: [plans.id] }),
}));
export const staffRelations = relations(staffUsers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [staffUsers.tenantId],
    references: [tenants.id],
  }),
}));
export const canteensRelations = relations(canteens, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [canteens.tenantId],
    references: [tenants.id],
  }),
  sessions: many(mealSessions),
}));
export const mealSessionsRelations = relations(mealSessions, ({ one }) => ({
  canteen: one(canteens, {
    fields: [mealSessions.canteenId],
    references: [canteens.id],
  }),
}));
export const employeesRelations = relations(employees, ({ one }) => ({
  canteen: one(canteens, {
    fields: [employees.canteenId],
    references: [canteens.id],
  }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  tenant: one(tenants, {
    fields: [employees.tenantId],
    references: [tenants.id],
  }),
}));
export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
}));
export const dailyMenusRelations = relations(dailyMenus, ({ one, many }) => ({
  session: one(mealSessions, {
    fields: [dailyMenus.mealSessionId],
    references: [mealSessions.id],
  }),
  items: many(dailyMenuItems),
}));
export const dailyMenuItemsRelations = relations(dailyMenuItems, ({ one }) => ({
  dailyMenu: one(dailyMenus, {
    fields: [dailyMenuItems.dailyMenuId],
    references: [dailyMenus.id],
  }),
  menuItem: one(menuItems, {
    fields: [dailyMenuItems.menuItemId],
    references: [menuItems.id],
  }),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
  employee: one(employees, {
    fields: [orders.employeeId],
    references: [employees.id],
  }),
  guest: one(guests, { fields: [orders.guestId], references: [guests.id] }),
  session: one(mealSessions, {
    fields: [orders.mealSessionId],
    references: [mealSessions.id],
  }),
  canteen: one(canteens, {
    fields: [orders.canteenId],
    references: [canteens.id],
  }),
  servedBy: one(staffUsers, {
    fields: [orders.servedById],
    references: [staffUsers.id],
  }),
  items: many(orderItems),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
export const guestsRelations = relations(guests, ({ one }) => ({
  host: one(employees, {
    fields: [guests.hostEmployeeId],
    references: [employees.id],
  }),
}));
export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  category: one(blogCategories, {
    fields: [blogPosts.categoryId],
    references: [blogCategories.id],
  }),
  author: one(platformUsers, {
    fields: [blogPosts.authorId],
    references: [platformUsers.id],
  }),
}));
export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [stockMovements.inventoryItemId],
    references: [inventoryItems.id],
  }),
  supplier: one(suppliers, {
    fields: [stockMovements.supplierId],
    references: [suppliers.id],
  }),
}));
export const workersRelations = relations(canteenWorkers, ({ many }) => ({
  attendance: many(workerAttendance),
}));
export const workerAttendanceRelations = relations(
  workerAttendance,
  ({ one }) => ({
    worker: one(canteenWorkers, {
      fields: [workerAttendance.workerId],
      references: [canteenWorkers.id],
    }),
  }),
);
export const feedbackRelations = relations(feedback, ({ one }) => ({
  employee: one(employees, {
    fields: [feedback.employeeId],
    references: [employees.id],
  }),
  menuItem: one(menuItems, {
    fields: [feedback.menuItemId],
    references: [menuItems.id],
  }),
}));
