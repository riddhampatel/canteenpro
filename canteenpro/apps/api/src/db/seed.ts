/**
 * Seed: plans, super admin, website content, and (optionally) a realistic demo tenant.
 *   npm run db:seed                 → everything (idempotent)
 *   SEED_DEMO=false npm run db:seed → skip demo tenant (production)
 */
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db, pool, schema } from "./index";
import { env } from "../config/env";
import {
  SEED_CATEGORIES,
  SEED_FAQS,
  SEED_PAGES,
  SEED_PLANS,
  SEED_POSTS,
} from "./seed-content";
import { DEFAULT_SESSIONS } from "../services/billing";
import { addDays, dayjs, localDate } from "../lib/time";
import { inclusiveTax, round2 } from "../lib/money";

// deterministic PRNG so demo data is stable
let s = 42;
const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];

async function seedPlatform() {
  for (const p of SEED_PLANS) {
    await db
      .insert(schema.plans)
      .values(p)
      .onConflictDoNothing({ target: schema.plans.code });
  }
  const email = env.SEED_ADMIN_EMAIL.toLowerCase();
  const [admin] = await db
    .select()
    .from(schema.platformUsers)
    .where(eq(schema.platformUsers.email, email));
  let adminId = admin?.id;
  if (!admin) {
    const [u] = await db
      .insert(schema.platformUsers)
      .values({
        name: "Super Admin",
        email,
        role: "SUPER_ADMIN",
        passwordHash: await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10),
      })
      .returning();
    adminId = u.id;
    console.info(`👤 Super admin: ${email} / ${env.SEED_ADMIN_PASSWORD}`);
  }
  const defaults: Record<string, string> = {
    "brand.name": "CanteenPro",
    "brand.supportEmail": "support@canteenpro.in",
    "brand.supportPhone": "+91 94275 72571",
    "brand.whatsapp": "+919427572571",
    "tax.gstPercent": "18",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db
      .insert(schema.platformSettings)
      .values({ key, value })
      .onConflictDoNothing();
  }
  for (const c of SEED_CATEGORIES)
    await db.insert(schema.blogCategories).values(c).onConflictDoNothing();
  const cats = await db.select().from(schema.blogCategories);
  let i = 0;
  for (const p of SEED_POSTS) {
    const { category, ...rest } = p;
    await db
      .insert(schema.blogPosts)
      .values({
        ...rest,
        status: "PUBLISHED",
        categoryId: cats.find((c) => c.slug === category)?.id,
        authorId: adminId,
        readingMinutes: Math.max(
          2,
          Math.round(rest.content.split(/\s+/).length / 200),
        ),
        publishedAt: dayjs()
          .subtract(3 + i++ * 6, "day")
          .toDate(),
      })
      .onConflictDoNothing({ target: schema.blogPosts.slug });
  }
  const today = dayjs().format("DD MMMM YYYY");
  for (const p of SEED_PAGES) {
    await db
      .insert(schema.cmsPages)
      .values({ ...p, content: p.content.replace("{{date}}", today) })
      .onConflictDoNothing({ target: schema.cmsPages.slug });
  }
  const [{ c: faqCount }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.faqs);
  if (!faqCount)
    await db
      .insert(schema.faqs)
      .values(SEED_FAQS.map((f, i) => ({ ...f, sortOrder: i })));
  console.info("✅ Platform data seeded");
}

const FIRST = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Vihaan",
  "Arjun",
  "Sai",
  "Reyansh",
  "Krishna",
  "Ishaan",
  "Rohan",
  "Ananya",
  "Diya",
  "Aadhya",
  "Saanvi",
  "Pari",
  "Anika",
  "Navya",
  "Meera",
  "Kavya",
  "Riya",
  "Karan",
  "Nikhil",
  "Pooja",
  "Sneha",
  "Rahul",
  "Priya",
  "Amit",
  "Neha",
  "Suresh",
  "Lakshmi",
];
const LAST = [
  "Sharma",
  "Patel",
  "Iyer",
  "Reddy",
  "Nair",
  "Gupta",
  "Desai",
  "Mehta",
  "Joshi",
  "Kulkarni",
  "Singh",
  "Rao",
  "Shah",
  "Menon",
  "Pillai",
];
const DEPTS = [
  "IT",
  "Finance",
  "Security",
  "Admin",
  "Production",
  "HR",
  "Maintenance",
  "Quality",
];
const ITEMS: {
  name: string;
  cat: string;
  price: number;
  cost: number;
  type: "VEG" | "NON_VEG" | "EGG";
  kcal: number;
  desc: string;
  tags: string[];
  session: string[];
}[] = [
  {
    name: "Idli Sambar",
    cat: "Breakfast",
    price: 30,
    cost: 12,
    type: "VEG",
    kcal: 250,
    desc: "Steamed rice cakes with sambar and coconut chutney.",
    tags: ["Light", "South Indian"],
    session: ["Breakfast"],
  },
  {
    name: "Poha & Chai",
    cat: "Breakfast",
    price: 35,
    cost: 14,
    type: "VEG",
    kcal: 280,
    desc: "Flattened rice tempered with mustard seeds, curry leaves and turmeric, with cutting chai.",
    tags: ["Light"],
    session: ["Breakfast"],
  },
  {
    name: "Upma & Chai",
    cat: "Breakfast",
    price: 35,
    cost: 13,
    type: "VEG",
    kcal: 260,
    desc: "Savory semolina porridge with vegetables, served with hot chai.",
    tags: ["High Fibre"],
    session: ["Breakfast"],
  },
  {
    name: "Aloo Paratha",
    cat: "Breakfast",
    price: 45,
    cost: 18,
    type: "VEG",
    kcal: 380,
    desc: "Stuffed wheat flatbread with curd and pickle.",
    tags: ["North Indian"],
    session: ["Breakfast", "Dinner"],
  },
  {
    name: "Masala Omelette",
    cat: "Breakfast",
    price: 40,
    cost: 16,
    type: "EGG",
    kcal: 300,
    desc: "Two-egg omelette with onion, chilli and coriander, with toast.",
    tags: ["Protein"],
    session: ["Breakfast"],
  },
  {
    name: "Executive Veg Thali",
    cat: "Main Course",
    price: 90,
    cost: 42,
    type: "VEG",
    kcal: 750,
    desc: "Dal, two sabzis, rice, 3 rotis, salad, curd and sweet.",
    tags: ["Full Meal"],
    session: ["Lunch", "Dinner"],
  },
  {
    name: "Gujrati Thali",
    cat: "Main Course",
    price: 70,
    cost: 32,
    type: "VEG",
    kcal: 620,
    desc: "Fresh rotis with aloo sabzi, dal fry and salad.",
    tags: ["Full Meal"],
    session: ["Lunch", "Dinner"],
  },
  {
    name: "Dal Tadka & Jeera Rice",
    cat: "Main Course",
    price: 60,
    cost: 24,
    type: "VEG",
    kcal: 540,
    desc: "Yellow dal tempered with ghee, served with cumin rice.",
    tags: ["Comfort"],
    session: ["Lunch", "Dinner"],
  },
  {
    name: "Chicken Curry Meal",
    cat: "Main Course",
    price: 120,
    cost: 60,
    type: "NON_VEG",
    kcal: 820,
    desc: "Home-style chicken curry with rice, 2 rotis and salad.",
    tags: ["Protein"],
    session: ["Lunch", "Dinner"],
  },
  {
    name: "Veg Biryani",
    cat: "Main Course",
    price: 80,
    cost: 35,
    type: "VEG",
    kcal: 650,
    desc: "Fragrant basmati rice with vegetables, served with raita.",
    tags: ["Spicy"],
    session: ["Lunch"],
  },
  {
    name: "Bhindi Masala Thali",
    cat: "Main Course",
    price: 85,
    cost: 38,
    type: "VEG",
    kcal: 690,
    desc: "Okra masala with dal, rice, rotis and salad.",
    tags: ["Full Meal"],
    session: ["Lunch"],
  },
  {
    name: "Masala Dosa",
    cat: "Snacks",
    price: 50,
    cost: 20,
    type: "VEG",
    kcal: 400,
    desc: "Crispy dosa with potato masala, sambar and chutney.",
    tags: ["South Indian"],
    session: ["Snacks", "Breakfast"],
  },
  {
    name: "Samosa (2 pcs)",
    cat: "Snacks",
    price: 25,
    cost: 9,
    type: "VEG",
    kcal: 300,
    desc: "Crisp samosas with mint and tamarind chutney.",
    tags: ["Fried"],
    session: ["Snacks"],
  },
  {
    name: "Peri-Peri Fries",
    cat: "Snacks",
    price: 60,
    cost: 22,
    type: "VEG",
    kcal: 420,
    desc: "Fries tossed in peri-peri seasoning.",
    tags: ["Spicy"],
    session: ["Snacks"],
  },
  {
    name: "Veg Sandwich",
    cat: "Snacks",
    price: 40,
    cost: 16,
    type: "VEG",
    kcal: 320,
    desc: "Grilled sandwich with veggies and green chutney.",
    tags: ["Light"],
    session: ["Snacks"],
  },
  {
    name: "Filter Coffee",
    cat: "Beverages",
    price: 15,
    cost: 5,
    type: "VEG",
    kcal: 90,
    desc: "South Indian filter coffee.",
    tags: [],
    session: ["Breakfast", "Snacks"],
  },
  {
    name: "Masala Chai",
    cat: "Beverages",
    price: 12,
    cost: 4,
    type: "VEG",
    kcal: 80,
    desc: "Ginger and cardamom tea.",
    tags: [],
    session: ["Breakfast", "Snacks"],
  },
  {
    name: "Fresh Lime Soda",
    cat: "Beverages",
    price: 30,
    cost: 8,
    type: "VEG",
    kcal: 60,
    desc: "Sweet or salted.",
    tags: ["Refreshing"],
    session: ["Lunch", "Snacks"],
  },
  {
    name: "Gulab Jamun (2 pcs)",
    cat: "Desserts",
    price: 25,
    cost: 9,
    type: "VEG",
    kcal: 300,
    desc: "Soft khoya dumplings in sugar syrup.",
    tags: ["Sweet"],
    session: ["Lunch", "Dinner"],
  },
];

async function seedDemo() {
  const [exists] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, "demo-caterers"));
  if (exists) return console.info("ℹ️  Demo tenant already exists — skipped");
  const plan = (await db.query.plans.findFirst({
    where: eq(schema.plans.code, "growth"),
  }))!;
  const tz = "Asia/Kolkata";
  const today = localDate(tz);
  const pw = await bcrypt.hash("Demo@123", 10);

  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: "Demo Caterers",
      slug: "demo-caterers",
      email: "demo@canteenpro.in",
      phone: "9876500000",
      city: "Ahmedabad",
      state: "Gujarat",
      gstin: "24ABCDE1234F1Z5",
      address: "Plot 12, GIDC Estate, Ahmedabad",
      status: "ACTIVE",
      source: "seed",
    })
    .returning();
  await db
    .insert(schema.subscriptions)
    .values({
      tenantId: tenant.id,
      planId: plan.id,
      status: "ACTIVE",
      billingCycle: "YEARLY",
      currentPeriodStart: dayjs().subtract(2, "month").toDate(),
      currentPeriodEnd: dayjs().add(10, "month").toDate(),
    });
  const [canteen] = await db
    .insert(schema.canteens)
    .values({
      tenantId: tenant.id,
      name: "Solar Forever – Canberra Plant",
      code: "C01",
      clientCompany: "Solar Forever Pvt Ltd",
      clientGstin: "24AAACS1234K1Z2",
      address: "Sanand Industrial Area",
      billPrefix: "DC",
      optInRequired: false,
      gstPercent: 5,
    })
    .returning();
  const [canteen2] = await db
    .insert(schema.canteens)
    .values({
      tenantId: tenant.id,
      name: "Nova Tech Park – Tower B",
      code: "C02",
      clientCompany: "Nova Technologies Ltd",
      address: "SG Highway",
      billPrefix: "DC",
      gstPercent: 5,
    })
    .returning();
  const sessions = await db
    .insert(schema.mealSessions)
    .values(DEFAULT_SESSIONS.map((s) => ({ ...s, canteenId: canteen.id })))
    .returning();
  await db
    .insert(schema.mealSessions)
    .values(DEFAULT_SESSIONS.map((s) => ({ ...s, canteenId: canteen2.id })));

  const [owner] = await db
    .insert(schema.staffUsers)
    .values({
      tenantId: tenant.id,
      name: "Dinesh Patel",
      email: "demo@canteenpro.in",
      phone: "9876500000",
      role: "OWNER",
      passwordHash: pw,
    })
    .returning();
  await db.insert(schema.staffUsers).values([
    {
      tenantId: tenant.id,
      name: "Ravi Kumar",
      email: "manager@canteenpro.in",
      role: "MANAGER",
      canteenIds: [canteen.id],
      passwordHash: pw,
    },
    {
      tenantId: tenant.id,
      name: "Sunil Yadav",
      email: "cashier@canteenpro.in",
      role: "CASHIER",
      canteenIds: [canteen.id],
      passwordHash: pw,
    },
  ]);

  const depts = await db
    .insert(schema.departments)
    .values(DEPTS.map((name) => ({ tenantId: tenant.id, name })))
    .returning();
  const cats = await db
    .insert(schema.menuCategories)
    .values(
      ["Breakfast", "Main Course", "Snacks", "Beverages", "Desserts"].map(
        (name, i) => ({ tenantId: tenant.id, name, sortOrder: i }),
      ),
    )
    .returning();
  const items = await db
    .insert(schema.menuItems)
    .values(
      ITEMS.map((it) => ({
        tenantId: tenant.id,
        categoryId: cats.find((c) => c.name === it.cat)!.id,
        name: it.name,
        description: it.desc,
        price: it.price,
        guestPrice: Math.round(it.price * 1.5),
        costPrice: it.cost,
        foodType: it.type,
        calories: it.kcal,
        prepMinutes: 10,
        tags: it.tags,
        highlights: [],
      })),
    )
    .returning();

  // employees
  const pinHash = await bcrypt.hash("1234", 8);
  const emps: (typeof schema.employees.$inferInsert)[] = [];
  for (let i = 1; i <= 48; i++) {
    const name = i === 1 ? "Aarav Mehta" : `${pick(FIRST)} ${pick(LAST)}`;
    const mode = i % 5 === 0 ? "PAYROLL" : i % 7 === 0 ? "COMPANY" : "WALLET";
    emps.push({
      tenantId: tenant.id,
      canteenId: i <= 40 ? canteen.id : canteen2.id,
      departmentId: depts[i % depts.length].id,
      employeeCode: "EMP" + String(i).padStart(3, "0"),
      name,
      phone:
        i === 1
          ? "9876543210"
          : "98" + String(10000000 + Math.floor(rnd() * 89999999)),
      designation: pick([
        "Engineer",
        "Executive",
        "Supervisor",
        "Officer",
        "Analyst",
        "Technician",
      ]),
      pinHash,
      pinChangedAt: i === 1 ? new Date() : null,
      dietaryPref: i % 4 === 0 ? "NON_VEG" : "VEG",
      walletBalance: mode === "WALLET" ? 1500 : 0,
      monthlyAllowance: mode === "WALLET" ? 1000 : 0,
      defaultPayMode: mode as any,
      biometricSynced: i % 3 === 0,
      biometricId: i % 3 === 0 ? String(1000 + i) : null,
      joinedAt: "2024-04-01",
    });
  }
  const employees = await db.insert(schema.employees).values(emps).returning();
  const c1Emps = employees.filter((e) => e.canteenId === canteen.id);

  // daily menus: last 30 days → next 6 days
  const menuRows: { date: string; sessionId: string; itemIds: string[] }[] = [];
  for (let d = -30; d <= 6; d++) {
    const date = addDays(today, d);
    for (const sess of sessions) {
      const pool = items.filter((it) =>
        ITEMS.find((x) => x.name === it.name)!.session.includes(sess.name),
      );
      const chosen = [...pool]
        .sort(() => rnd() - 0.5)
        .slice(0, Math.min(pool.length, 3 + Math.floor(rnd() * 2)));
      menuRows.push({
        date,
        sessionId: sess.id,
        itemIds: chosen.map((c) => c.id),
      });
    }
  }
  for (const m of menuRows) {
    const [dm] = await db
      .insert(schema.dailyMenus)
      .values({
        canteenId: canteen.id,
        mealSessionId: m.sessionId,
        date: m.date,
        isPublished: true,
      })
      .returning();
    await db
      .insert(schema.dailyMenuItems)
      .values(m.itemIds.map((id) => ({ dailyMenuId: dm.id, menuItemId: id })));
  }

  // orders (meal attendance) for the past 30 days + today so far
  const nowHM = dayjs().tz(tz).format("HH:mm");
  const rate: Record<string, number> = {
    Breakfast: 0.45,
    Lunch: 0.75,
    Snacks: 0.3,
    Dinner: 0.15,
  };
  const orderRows: (typeof schema.orders.$inferInsert)[] = [];
  const itemRows: {
    idx: number;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    menuItemId: string | null;
  }[] = [];
  const wallet = new Map(c1Emps.map((e) => [e.id, e.walletBalance]));
  let counter = 0;
  for (let d = -30; d <= 0; d++) {
    const date = addDays(today, d);
    const dow = dayjs(date).day();
    if (dow === 0) continue; // Sunday closed
    for (const sess of sessions) {
      if (d === 0 && nowHM < sess.startTime) continue;
      const r = rate[sess.name] * (dow === 6 ? 0.5 : 1);
      for (const e of c1Emps) {
        if (rnd() > r) continue;
        const [h, m] = sess.startTime.split(":").map(Number);
        const at = dayjs
          .tz(
            `${date} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
            tz,
          )
          .add(Math.floor(rnd() * 100), "minute");
        if (d === 0 && at.isAfter(dayjs())) continue;
        const full = sess.employeePrice + sess.companySubsidy;
        let subsidy = sess.companySubsidy;
        let total = sess.employeePrice;
        if (e.defaultPayMode === "COMPANY") {
          subsidy = full;
          total = 0;
        }
        if (e.defaultPayMode === "WALLET")
          wallet.set(e.id, round2((wallet.get(e.id) ?? 0) - total));
        counter++;
        orderRows.push({
          tenantId: tenant.id,
          canteenId: canteen.id,
          billNo: `DC-C01-${String(counter).padStart(6, "0")}`,
          consumerType: "EMPLOYEE",
          employeeId: e.id,
          mealSessionId: sess.id,
          businessDate: date,
          channel: pick([
            "QR_SCAN",
            "QR_SCAN",
            "EMPLOYEE_QR",
            "BIOMETRIC",
            "POS",
          ] as const),
          paymentMode: e.defaultPayMode,
          isFixedMeal: true,
          subtotal: full,
          taxAmount: inclusiveTax(full, 5),
          subsidyAmount: subsidy,
          total,
          createdAt: at.toDate(),
          servedById: owner.id,
        });
        itemRows.push({
          idx: orderRows.length - 1,
          name: `${sess.name} meal`,
          unitPrice: full,
          quantity: 1,
          lineTotal: full,
          menuItemId: null,
        });
      }
      // a few à-la-carte snack/beverage sales and guests
      if (sess.name === "Snacks" || sess.name === "Breakfast") {
        for (let k = 0; k < 4 + Math.floor(rnd() * 6); k++) {
          const e = pick(c1Emps);
          const it = pick(
            items.filter((x) =>
              ["Snacks", "Beverages"].includes(
                cats.find((c) => c.id === x.categoryId)!.name,
              ),
            ),
          );
          const q = 1 + Math.floor(rnd() * 2);
          const amt = it.price * q;
          const at = dayjs
            .tz(`${date} ${sess.startTime}`, tz)
            .add(Math.floor(rnd() * 100), "minute");
          if (d === 0 && at.isAfter(dayjs())) continue;
          counter++;
          orderRows.push({
            tenantId: tenant.id,
            canteenId: canteen.id,
            billNo: `DC-C01-${String(counter).padStart(6, "0")}`,
            consumerType: "EMPLOYEE",
            employeeId: e.id,
            mealSessionId: sess.id,
            businessDate: date,
            channel: "POS",
            paymentMode: "UPI",
            subtotal: amt,
            taxAmount: inclusiveTax(amt, 5),
            total: amt,
            createdAt: at.toDate(),
            servedById: owner.id,
          });
          itemRows.push({
            idx: orderRows.length - 1,
            name: it.name,
            unitPrice: it.price,
            quantity: q,
            lineTotal: amt,
            menuItemId: it.id,
          });
        }
      }
    }
  }
  // guests
  const guests = await db
    .insert(schema.guests)
    .values([
      {
        tenantId: tenant.id,
        canteenId: canteen.id,
        name: "Rakesh Agarwal",
        phone: "9825000001",
        company: "Agarwal Electricals",
        purpose: "Vendor visit",
        hostEmployeeId: c1Emps[2].id,
      },
      {
        tenantId: tenant.id,
        canteenId: canteen.id,
        name: "Neha Bhatt",
        phone: "9825000002",
        company: "—",
        purpose: "Interview",
        hostEmployeeId: c1Emps[5].id,
      },
      {
        tenantId: tenant.id,
        canteenId: canteen.id,
        name: "Martin Wolf",
        phone: "9825000003",
        company: "SolarTec GmbH",
        purpose: "Client meeting",
        hostEmployeeId: c1Emps[1].id,
      },
    ])
    .returning();
  const lunch = sessions.find((x) => x.name === "Lunch")!;
  for (let d = -20; d <= -1; d += 3) {
    const g = pick(guests);
    const date = addDays(today, d);
    counter++;
    const mode = pick(["CASH", "UPI", "COMPANY"] as const);
    orderRows.push({
      tenantId: tenant.id,
      canteenId: canteen.id,
      billNo: `DC-C01-${String(counter).padStart(6, "0")}`,
      consumerType: "GUEST",
      guestId: g.id,
      mealSessionId: lunch.id,
      businessDate: date,
      channel: "POS",
      paymentMode: mode,
      isFixedMeal: true,
      subtotal: lunch.guestPrice,
      taxAmount: inclusiveTax(lunch.guestPrice, 5),
      subsidyAmount: mode === "COMPANY" ? lunch.guestPrice : 0,
      total: mode === "COMPANY" ? 0 : lunch.guestPrice,
      createdAt: dayjs.tz(`${date} 13:10`, tz).toDate(),
      servedById: owner.id,
    });
    itemRows.push({
      idx: orderRows.length - 1,
      name: "Lunch meal (guest)",
      unitPrice: lunch.guestPrice,
      quantity: 1,
      lineTotal: lunch.guestPrice,
      menuItemId: null,
    });
  }
  // insert in chunks
  const inserted: { id: string }[] = [];
  for (let i = 0; i < orderRows.length; i += 500) {
    inserted.push(
      ...(await db
        .insert(schema.orders)
        .values(orderRows.slice(i, i + 500))
        .returning({ id: schema.orders.id })),
    );
  }
  const oi = itemRows.map((r) => ({
    orderId: inserted[r.idx].id,
    name: r.name,
    unitPrice: r.unitPrice,
    quantity: r.quantity,
    lineTotal: r.lineTotal,
    menuItemId: r.menuItemId,
  }));
  for (let i = 0; i < oi.length; i += 1000)
    await db.insert(schema.orderItems).values(oi.slice(i, i + 1000));
  await db
    .update(schema.canteens)
    .set({ billCounter: counter })
    .where(eq(schema.canteens.id, canteen.id));

  // wallets: opening recharge + meal debit summary
  for (const e of c1Emps.filter((x) => x.defaultPayMode === "WALLET")) {
    const spent = round2(1500 - (wallet.get(e.id) ?? 1500));
    const topup = 1000 + Math.ceil(Math.max(0, spent - 1000) / 500) * 500;
    const bal = round2(1500 + topup - spent);
    await db
      .update(schema.employees)
      .set({ walletBalance: bal })
      .where(eq(schema.employees.id, e.id));
    await db.insert(schema.walletTransactions).values([
      {
        tenantId: tenant.id,
        employeeId: e.id,
        type: "CREDIT",
        amount: 1500,
        balanceAfter: 1500,
        reason: "RECHARGE",
        note: "Opening balance",
        createdAt: dayjs().subtract(31, "day").toDate(),
      },
      {
        tenantId: tenant.id,
        employeeId: e.id,
        type: "CREDIT",
        amount: topup,
        balanceAfter: 1500 + topup,
        reason: "ALLOWANCE",
        reference: "ALLOWANCE-" + dayjs().format("YYYY-MM"),
        note: "Monthly meal allowance",
        createdAt: dayjs().startOf("month").toDate(),
      },
      {
        tenantId: tenant.id,
        employeeId: e.id,
        type: "DEBIT",
        amount: spent,
        balanceAfter: bal,
        reason: "MEAL",
        note: "Meals (demo summary)",
        createdAt: dayjs().subtract(1, "day").toDate(),
      },
    ]);
  }

  // opt-ins for today
  for (const e of c1Emps.slice(0, 30)) {
    await db
      .insert(schema.mealOptIns)
      .values({
        canteenId: canteen.id,
        employeeId: e.id,
        mealSessionId: lunch.id,
        date: today,
        status: rnd() > 0.15 ? "OPTED_IN" : "OPTED_OUT",
      });
  }

  // inventory
  const [sup1, sup2] = await db
    .insert(schema.suppliers)
    .values([
      {
        tenantId: tenant.id,
        name: "Shree Ram Grains",
        phone: "9824011111",
        gstin: "24AAKFS1234L1Z9",
      },
      {
        tenantId: tenant.id,
        name: "Fresh Farm Vegetables",
        phone: "9824022222",
      },
    ])
    .returning();
  const inv = [
    ["Basmati Rice", "kg", "Grains", 120, 40, 95],
    ["Wheat Flour (Atta)", "kg", "Grains", 85, 50, 38],
    ["Toor Dal", "kg", "Pulses", 18, 25, 140],
    ["Sunflower Oil", "L", "Oil", 45, 20, 150],
    ["Milk", "L", "Dairy", 30, 20, 56],
    ["Paneer", "kg", "Dairy", 6, 8, 340],
    ["Potatoes", "kg", "Vegetables", 60, 30, 28],
    ["Onions", "kg", "Vegetables", 22, 30, 35],
    ["Tea Leaves", "kg", "Beverages", 4, 2, 420],
    ["LPG Cylinder", "pcs", "Fuel", 3, 2, 1850],
  ] as const;
  for (const [name, unit, category, stock, reorder, cost] of inv) {
    const [it] = await db
      .insert(schema.inventoryItems)
      .values({
        tenantId: tenant.id,
        name,
        unit,
        category,
        currentStock: stock,
        reorderLevel: reorder,
        avgCost: cost,
      })
      .returning();
    await db
      .insert(schema.stockMovements)
      .values({
        tenantId: tenant.id,
        inventoryItemId: it.id,
        canteenId: canteen.id,
        supplierId: category === "Vegetables" ? sup2.id : sup1.id,
        type: "PURCHASE",
        quantity: stock * 2,
        unitCost: cost,
        invoiceRef: "INV-" + Math.floor(rnd() * 9000 + 1000),
        createdAt: dayjs().subtract(10, "day").toDate(),
      });
    await db
      .insert(schema.stockMovements)
      .values({
        tenantId: tenant.id,
        inventoryItemId: it.id,
        canteenId: canteen.id,
        type: "CONSUMPTION",
        quantity: stock,
        note: "Kitchen issue",
        createdAt: dayjs().subtract(2, "day").toDate(),
      });
  }

  // workers + attendance
  const workers = await db
    .insert(schema.canteenWorkers)
    .values(
      [
        ["Ramesh Maharaj", "Head Cook", 900],
        ["Gopal Singh", "Cook", 700],
        ["Sita Devi", "Helper", 500],
        ["Mohan Lal", "Helper", 500],
        ["Kamla Ben", "Cleaner", 450],
        ["Ajay Thakor", "Cashier", 600],
      ].map(([name, role, wage]) => ({
        tenantId: tenant.id,
        canteenId: canteen.id,
        name: name as string,
        role: role as string,
        dailyWage: wage as number,
      })),
    )
    .returning();
  for (let d = -30; d <= -1; d++) {
    const date = addDays(today, d);
    if (dayjs(date).day() === 0) continue;
    await db
      .insert(schema.workerAttendance)
      .values(
        workers.map((w) => ({
          tenantId: tenant.id,
          workerId: w.id,
          date,
          status: (rnd() > 0.93
            ? "ABSENT"
            : rnd() > 0.95
              ? "HALF_DAY"
              : "PRESENT") as any,
          checkIn: dayjs.tz(`${date} 06:30`, tz).toDate(),
          checkOut: dayjs.tz(`${date} 15:30`, tz).toDate(),
        })),
      );
  }

  // expenses & waste
  await db.insert(schema.expenses).values([
    {
      tenantId: tenant.id,
      canteenId: canteen.id,
      date: addDays(today, -25),
      category: "Gas",
      amount: 7400,
      paidTo: "Indane",
    },
    {
      tenantId: tenant.id,
      canteenId: canteen.id,
      date: addDays(today, -20),
      category: "Electricity",
      amount: 12800,
    },
    {
      tenantId: tenant.id,
      canteenId: canteen.id,
      date: addDays(today, -15),
      category: "Maintenance",
      amount: 3500,
      paidTo: "Chimney cleaning",
    },
    {
      tenantId: tenant.id,
      canteenId: canteen.id,
      date: addDays(today, -5),
      category: "Packaging",
      amount: 2200,
    },
  ]);
  for (let d = -14; d <= -1; d++) {
    const date = addDays(today, d);
    if (dayjs(date).day() === 0) continue;
    await db
      .insert(schema.wasteLogs)
      .values({
        tenantId: tenant.id,
        canteenId: canteen.id,
        date,
        mealSessionId: lunch.id,
        preparedQtyKg: 38 + Math.round(rnd() * 6),
        wastedQtyKg: round2(1.5 + rnd() * 3),
        reason: pick(["Over-production", "Plate waste", "Plate waste"]),
      });
  }

  // feedback & notifications
  const comments = [
    "Dal was excellent today",
    "Rotis were a bit cold",
    "Loved the biryani!",
    "Please add more salad options",
    "Great service, quick counter",
    "Too spicy for me",
  ];
  for (let i = 0; i < 14; i++) {
    const e = pick(c1Emps);
    await db.insert(schema.feedback).values({
      tenantId: tenant.id,
      canteenId: canteen.id,
      employeeId: e.id,
      menuItemId: pick(items).id,
      rating: 2 + Math.floor(rnd() * 4),
      comment: pick(comments),
      createdAt: dayjs()
        .subtract(Math.floor(rnd() * 12), "day")
        .toDate(),
    });
  }
  await db.insert(schema.notifications).values([
    {
      tenantId: tenant.id,
      audience: "ALL_EMPLOYEES",
      title: "Today's Lunch Menu is Live 🍽️",
      body: "Executive Thali, Veg Biryani & more are available. Scan the counter QR before 3 PM.",
      type: "MENU",
      sentById: owner.id,
    },
    {
      tenantId: tenant.id,
      audience: "ALL_EMPLOYEES",
      title: "Canteen hours updated",
      body: "Lunch timings are now 12:00 PM – 3:00 PM.",
      type: "SYSTEM",
      sentById: owner.id,
      createdAt: dayjs().subtract(2, "day").toDate(),
    },
    {
      tenantId: tenant.id,
      audience: "CANTEEN",
      canteenId: canteen.id,
      title: "Weekend Dinner Special 🎉",
      body: "Pav Bhaji & Rajma Rice this Saturday.",
      type: "MENU",
      sentById: owner.id,
      createdAt: dayjs().subtract(4, "day").toDate(),
    },
  ]);

  // a paid invoice for the billing page
  await db
    .insert(schema.payments)
    .values({
      tenantId: tenant.id,
      planId: plan.id,
      billingCycle: "YEARLY",
      amount: round2(plan.priceYearly * 1.18),
      taxAmount: round2(plan.priceYearly * 0.18),
      status: "PAID",
      invoiceNo: `CP-${dayjs().format("YYYY")}-00001`,
      razorpayOrderId: "order_demo_seed",
      razorpayPaymentId: "pay_demo_seed",
      method: "upi",
      paidAt: dayjs().subtract(2, "month").toDate(),
    });

  console.info(
    `✅ Demo tenant seeded: ${orderRows.length} meals, ${employees.length} employees`,
  );
  console.info(
    "   Console:  demo@canteenpro.in / Demo@123  (also manager@… and cashier@…)",
  );
  console.info("   Employee app: phone 9876543210 / PIN 1234");
}

(async () => {
  await seedPlatform();
  if (process.env.SEED_DEMO !== "false") await seedDemo();
  await pool.end();
})().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
