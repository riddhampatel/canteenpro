import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { db, schema, type Tx } from "../db";
import { env } from "../config/env";
import { HttpError, badRequest, conflict, notFound } from "../lib/http";
import { round2, slugify } from "../lib/money";
import { dayjs } from "../lib/time";
import { getSetting } from "../lib/settings";
import { sendTemplateMail } from "../lib/mailer";
import { createRazorpayOrder } from "../lib/razorpay";

type Cycle = "MONTHLY" | "YEARLY";

export const DEFAULT_SESSIONS = [
  {
    name: "Breakfast",
    startTime: "07:30",
    endTime: "10:00",
    optInCutoff: "07:00",
    employeePrice: 20,
    companySubsidy: 20,
    guestPrice: 60,
    sortOrder: 1,
  },
  {
    name: "Lunch",
    startTime: "12:00",
    endTime: "15:00",
    optInCutoff: "10:30",
    employeePrice: 40,
    companySubsidy: 50,
    guestPrice: 120,
    sortOrder: 2,
  },
  {
    name: "Snacks",
    startTime: "16:00",
    endTime: "18:00",
    optInCutoff: null,
    employeePrice: 15,
    companySubsidy: 10,
    guestPrice: 40,
    sortOrder: 3,
  },
  {
    name: "Dinner",
    startTime: "19:30",
    endTime: "22:30",
    optInCutoff: "17:00",
    employeePrice: 40,
    companySubsidy: 50,
    guestPrice: 120,
    sortOrder: 4,
  },
];

async function uniqueSlug(tx: Tx, base: string) {
  let slug = slugify(base) || "canteen";
  for (let i = 0; i < 20; i++) {
    const cand = i ? `${slug}-${i + 1}` : slug;
    const [x] = await tx
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, cand));
    if (!x) return cand;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

/** Website signup: tenant + owner + default canteen + 4 meal sessions + trial subscription. */
export async function createTenantWithOwner(input: {
  businessName: string;
  ownerName: string;
  email: string;
  phone?: string;
  password: string;
  planCode?: string;
  billingCycle?: Cycle;
  city?: string;
  canteenName?: string;
  clientCompany?: string;
  source?: string;
}) {
  const email = input.email.toLowerCase().trim();
  const [exists] = await db
    .select({ id: schema.staffUsers.id })
    .from(schema.staffUsers)
    .where(eq(schema.staffUsers.email, email));
  if (exists)
    throw conflict(
      "An account with this email already exists. Please sign in.",
      "EMAIL_EXISTS",
    );

  const plan =
    (input.planCode &&
      (await db.query.plans.findFirst({
        where: and(
          eq(schema.plans.code, input.planCode),
          eq(schema.plans.isActive, true),
        ),
      }))) ||
    (await db.query.plans.findFirst({
      where: eq(schema.plans.isActive, true),
      orderBy: schema.plans.sortOrder,
    }));
  if (!plan) throw new HttpError(500, "No plans configured");

  const passwordHash = await bcrypt.hash(input.password, 10);
  const result = await db.transaction(async (tx) => {
    const slug = await uniqueSlug(tx, input.businessName);
    const [tenant] = await tx
      .insert(schema.tenants)
      .values({
        name: input.businessName,
        slug,
        email,
        phone: input.phone,
        city: input.city,
        status: "TRIAL",
        source: input.source ?? "website",
      })
      .returning();
    const [owner] = await tx
      .insert(schema.staffUsers)
      .values({
        tenantId: tenant.id,
        name: input.ownerName,
        email,
        phone: input.phone,
        passwordHash,
        role: "OWNER",
      })
      .returning();
    const [canteen] = await tx
      .insert(schema.canteens)
      .values({
        tenantId: tenant.id,
        name: input.canteenName || `${input.businessName} Canteen`,
        code: "C01",
        clientCompany: input.clientCompany,
        billPrefix: (slug.replace(/-/g, "").slice(0, 3) || "BL").toUpperCase(),
      })
      .returning();
    await tx
      .insert(schema.mealSessions)
      .values(DEFAULT_SESSIONS.map((s) => ({ ...s, canteenId: canteen.id })));
    await tx
      .insert(schema.menuCategories)
      .values(
        ["Breakfast", "Main Course", "Snacks", "Beverages", "Desserts"].map(
          (name, i) => ({ tenantId: tenant.id, name, sortOrder: i }),
        ),
      );
    const now = new Date();
    const [sub] = await tx
      .insert(schema.subscriptions)
      .values({
        tenantId: tenant.id,
        planId: plan.id,
        status: "TRIALING",
        billingCycle: input.billingCycle ?? "MONTHLY",
        currentPeriodStart: now,
        currentPeriodEnd: dayjs(now).add(plan.trialDays, "day").toDate(),
      })
      .returning();
    return { tenant, owner, canteen, sub, plan };
  });

  const brand = await getSetting("brand.name");
  sendTemplateMail(
    email,
    "welcome",
    {
      brand,
      name: input.ownerName,
      tenant: input.businessName,
      plan: plan.name,
      trialEnds: dayjs(result.sub.currentPeriodEnd).format("DD MMM YYYY"),
      consoleUrl: env.CONSOLE_URL,
    },
    { tenantId: result.tenant.id },
  );
  return result;
}

export function priceFor(plan: typeof schema.plans.$inferSelect, cycle: Cycle) {
  return cycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
}

export async function quote(
  planCode: string,
  cycle: Cycle,
  couponCode?: string,
) {
  const plan = await db.query.plans.findFirst({
    where: and(
      eq(schema.plans.code, planCode),
      eq(schema.plans.isActive, true),
    ),
  });
  if (!plan) throw notFound("Plan not found");
  const base = priceFor(plan, cycle);
  let discount = 0;
  let coupon: typeof schema.coupons.$inferSelect | undefined;
  if (couponCode) {
    coupon = await db.query.coupons.findFirst({
      where: eq(schema.coupons.code, couponCode.toUpperCase().trim()),
    });
    const valid =
      coupon &&
      coupon.isActive &&
      (!coupon.validUntil || new Date(coupon.validUntil) > new Date()) &&
      (coupon.maxRedemptions == null ||
        coupon.redeemedCount < coupon.maxRedemptions);
    if (!valid) throw badRequest("Coupon is invalid or expired", "BAD_COUPON");
    discount = coupon!.percentOff
      ? (base * coupon!.percentOff) / 100
      : (coupon!.amountOff ?? 0);
  }
  const taxable = round2(Math.max(0, base - discount));
  const gstPct = Number(await getSetting("tax.gstPercent")) || 0;
  const tax = round2((taxable * gstPct) / 100);
  return {
    plan,
    cycle,
    base,
    discount: round2(discount),
    taxable,
    gstPct,
    tax,
    total: round2(taxable + tax),
    coupon,
  };
}

/** Create a Razorpay order for a tenant's plan purchase / renewal. */
export async function startCheckout(
  tenantId: string,
  planCode: string,
  cycle: Cycle,
  couponCode?: string,
) {
  const q = await quote(planCode, cycle, couponCode);
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
    with: { subscription: true },
  });
  if (!tenant) throw notFound("Tenant not found");
  const rp = await createRazorpayOrder(
    q.total,
    `t_${tenantId.slice(0, 20)}_${Date.now()}`,
    {
      tenantId,
      plan: q.plan.code,
      cycle,
    },
  );
  const [payment] = await db
    .insert(schema.payments)
    .values({
      tenantId,
      subscriptionId: tenant.subscription?.id,
      planId: q.plan.id,
      billingCycle: cycle,
      amount: q.total,
      taxAmount: q.tax,
      couponCode: q.coupon?.code,
      razorpayOrderId: rp.id,
      status: "CREATED",
    })
    .returning();
  return {
    paymentId: payment.id,
    orderId: rp.id,
    amount: rp.amount, // paise
    currency: "INR",
    keyId: (await getSetting("razorpay.keyId")) || null,
    testMode: !!rp.test,
    quote: {
      ...q,
      plan: { code: q.plan.code, name: q.plan.name },
      coupon: q.coupon?.code ?? null,
    },
    prefill: {
      name: tenant.name,
      email: tenant.email,
      contact: tenant.phone ?? "",
    },
  };
}

async function nextInvoiceNo(tx: Tx) {
  const year = dayjs().format("YYYY");
  const [{ c }] = await tx
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.status, "PAID"),
        sql`extract(year from ${schema.payments.paidAt}) = ${Number(year)}`,
      ),
    );
  return `CP-${year}-${String(c + 1).padStart(5, "0")}`;
}

/** Mark payment paid and extend / activate the subscription. Idempotent. */
export async function markPaymentPaid(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature?: string,
  method?: string,
) {
  const res = await db.transaction(async (tx) => {
    const p = await tx.query.payments.findFirst({
      where: eq(schema.payments.razorpayOrderId, razorpayOrderId),
    });
    if (!p) throw notFound("Payment not found");
    if (p.status === "PAID") return { payment: p, already: true as const };
    const plan = await tx.query.plans.findFirst({
      where: eq(schema.plans.id, p.planId!),
    });
    const sub = await tx.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.tenantId, p.tenantId),
    });
    const cycle = (p.billingCycle ?? "MONTHLY") as Cycle;
    const now = new Date();
    // Renewal of an active paid plan with the same plan → extend from current end; otherwise start now
    const extendFrom =
      sub &&
      sub.status === "ACTIVE" &&
      sub.planId === p.planId &&
      new Date(sub.currentPeriodEnd) > now
        ? new Date(sub.currentPeriodEnd)
        : now;
    const end = dayjs(extendFrom)
      .add(1, cycle === "YEARLY" ? "year" : "month")
      .toDate();
    let subId = sub?.id;
    if (sub) {
      await tx
        .update(schema.subscriptions)
        .set({
          planId: p.planId!,
          status: "ACTIVE",
          billingCycle: cycle,
          currentPeriodStart: extendFrom,
          currentPeriodEnd: end,
          cancelAtPeriodEnd: false,
          lastReminderAt: null,
        })
        .where(eq(schema.subscriptions.id, sub.id));
    } else {
      const [s] = await tx
        .insert(schema.subscriptions)
        .values({
          tenantId: p.tenantId,
          planId: p.planId!,
          status: "ACTIVE",
          billingCycle: cycle,
          currentPeriodStart: extendFrom,
          currentPeriodEnd: end,
        })
        .returning();
      subId = s.id;
    }
    const invoiceNo = await nextInvoiceNo(tx);
    const [paid] = await tx
      .update(schema.payments)
      .set({
        status: "PAID",
        razorpayPaymentId,
        razorpaySignature: signature,
        method,
        paidAt: now,
        invoiceNo,
        subscriptionId: subId,
      })
      .where(eq(schema.payments.id, p.id))
      .returning();
    await tx
      .update(schema.tenants)
      .set({ status: "ACTIVE" })
      .where(eq(schema.tenants.id, p.tenantId));
    if (p.couponCode) {
      await tx
        .update(schema.coupons)
        .set({ redeemedCount: sql`${schema.coupons.redeemedCount} + 1` })
        .where(eq(schema.coupons.code, p.couponCode));
    }
    return { payment: paid, plan, end, cycle, already: false as const };
  });

  if (!res.already) {
    const owner = await db.query.staffUsers.findFirst({
      where: and(
        eq(schema.staffUsers.tenantId, res.payment.tenantId),
        eq(schema.staffUsers.role, "OWNER"),
      ),
    });
    if (owner) {
      sendTemplateMail(
        owner.email,
        "payment_success",
        {
          brand: await getSetting("brand.name"),
          name: owner.name,
          amount: `₹${res.payment.amount.toLocaleString("en-IN")}`,
          plan: res.plan?.name,
          cycle: res.cycle.toLowerCase(),
          endDate: dayjs(res.end).format("DD MMM YYYY"),
          invoiceNo: res.payment.invoiceNo,
          paymentId: razorpayPaymentId,
        },
        { tenantId: res.payment.tenantId },
      );
    }
  }
  return res.payment;
}

/** Plan limit checks */
export async function assertLimit(
  tenantCtx: {
    plan: typeof schema.plans.$inferSelect | null;
    tenant: { id: string };
  },
  kind: "employees" | "canteens" | "staff",
  adding = 1,
) {
  const plan = tenantCtx.plan;
  if (!plan) return;
  const limit =
    kind === "employees"
      ? plan.maxEmployees
      : kind === "canteens"
        ? plan.maxCanteens
        : plan.maxStaffUsers;
  if (limit < 0) return;
  const table =
    kind === "employees"
      ? schema.employees
      : kind === "canteens"
        ? schema.canteens
        : schema.staffUsers;
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(table)
    .where(eq(table.tenantId, tenantCtx.tenant.id));
  if (c + adding > limit) {
    throw new HttpError(
      403,
      `Your ${plan.name} plan allows up to ${limit} ${kind}. Upgrade your plan to add more.`,
      "PLAN_LIMIT",
    );
  }
}
