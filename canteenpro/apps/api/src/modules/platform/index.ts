import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  inArray,
} from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db";
import { ah, badRequest, notFound, pageParams, parse } from "../../lib/http";
import { requirePlatform } from "../../middleware/auth";
import { pcrud } from "./pcrud";
import { slugify, round2 } from "../../lib/money";
import { dayjs } from "../../lib/time";
import { signToken } from "../../lib/jwt";
import { audit } from "../../lib/audit";
import {
  listSettingsMasked,
  setSettings,
  getSetting,
} from "../../lib/settings";
import { render, sendMail, sendTemplateMail } from "../../lib/mailer";
import { DEFAULT_TEMPLATES } from "../../lib/email-templates";
import { sendPush } from "../../lib/push";
import { createTenantWithOwner } from "../../services/billing";
import { env } from "../../config/env";

/** Super Admin API — manages the whole SaaS. */
export const platformRouter = Router();
platformRouter.use(requirePlatform());
const adminOnly = requirePlatform("SUPER_ADMIN");
const content = requirePlatform("SUPER_ADMIN", "CONTENT_EDITOR");

/* ------------------------------------------------------------ dashboard */
platformRouter.get(
  "/dashboard",
  ah(async (_req, res) => {
    const S = schema.subscriptions;
    const now = new Date();
    const in7 = dayjs().add(7, "day").toDate();
    const [tenantStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${schema.tenants.status}='ACTIVE')::int`,
        trial: sql<number>`count(*) filter (where ${schema.tenants.status}='TRIAL')::int`,
        pastDue: sql<number>`count(*) filter (where ${schema.tenants.status}='PAST_DUE')::int`,
        suspended: sql<number>`count(*) filter (where ${schema.tenants.status}='SUSPENDED')::int`,
        newThisMonth: sql<number>`count(*) filter (where ${schema.tenants.createdAt} >= date_trunc('month', now()))::int`,
      })
      .from(schema.tenants);
    const activeSubs = await db
      .select({
        cycle: S.billingCycle,
        monthly: schema.plans.priceMonthly,
        yearly: schema.plans.priceYearly,
      })
      .from(S)
      .innerJoin(schema.plans, eq(schema.plans.id, S.planId))
      .where(and(eq(S.status, "ACTIVE"), gte(S.currentPeriodEnd, now)));
    const mrr = round2(
      activeSubs.reduce(
        (a, s) => a + (s.cycle === "YEARLY" ? s.yearly / 12 : s.monthly),
        0,
      ),
    );
    const expiring = await db.query.subscriptions.findMany({
      where: and(
        inArray(S.status, ["ACTIVE", "TRIALING"]),
        gte(S.currentPeriodEnd, now),
        lte(S.currentPeriodEnd, in7),
      ),
      with: {
        tenant: { columns: { id: true, name: true, email: true, phone: true } },
        plan: { columns: { name: true } },
      },
      orderBy: asc(S.currentPeriodEnd),
      limit: 10,
    });
    const revenue = await db
      .select({
        month: sql<string>`to_char(${schema.payments.paidAt}, 'YYYY-MM')`,
        amount: sql<number>`sum(${schema.payments.amount})::float`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.status, "PAID"),
          gte(
            schema.payments.paidAt,
            dayjs().subtract(11, "month").startOf("month").toDate(),
          ),
        ),
      )
      .groupBy(sql`to_char(${schema.payments.paidAt}, 'YYYY-MM')`)
      .orderBy(sql`1`);
    const signups = await db
      .select({
        month: sql<string>`to_char(${schema.tenants.createdAt}, 'YYYY-MM')`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.tenants)
      .where(
        gte(
          schema.tenants.createdAt,
          dayjs().subtract(11, "month").startOf("month").toDate(),
        ),
      )
      .groupBy(sql`to_char(${schema.tenants.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`1`);
    const months = Array.from({ length: 12 }, (_, i) =>
      dayjs()
        .subtract(11 - i, "month")
        .format("YYYY-MM"),
    );
    const recentPayments = await db.query.payments.findMany({
      where: eq(schema.payments.status, "PAID"),
      with: {
        tenant: { columns: { name: true } },
        plan: { columns: { name: true } },
      },
      orderBy: desc(schema.payments.paidAt),
      limit: 8,
    });
    const recentTenants = await db.query.tenants.findMany({
      orderBy: desc(schema.tenants.createdAt),
      limit: 8,
      with: { subscription: { with: { plan: { columns: { name: true } } } } },
    });
    const [usage] = await db
      .select({
        mealsToday: sql<number>`count(*) filter (where ${schema.orders.createdAt} >= now() - interval '24 hours')::int`,
        mealsMonth: sql<number>`count(*)::int`,
      })
      .from(schema.orders)
      .where(
        gte(schema.orders.createdAt, dayjs().subtract(30, "day").toDate()),
      );
    const [{ employees }] = await db
      .select({ employees: sql<number>`count(*)::int` })
      .from(schema.employees)
      .where(eq(schema.employees.status, "ACTIVE"));
    const [{ newLeads }] = await db
      .select({ newLeads: sql<number>`count(*)::int` })
      .from(schema.leads)
      .where(eq(schema.leads.status, "NEW"));
    const [{ totalRevenue }] = await db
      .select({
        totalRevenue: sql<number>`coalesce(sum(${schema.payments.amount}),0)::float`,
      })
      .from(schema.payments)
      .where(eq(schema.payments.status, "PAID"));
    res.json({
      tenants: tenantStats,
      mrr,
      arr: round2(mrr * 12),
      totalRevenue,
      payingCustomers: activeSubs.length,
      employees,
      newLeads,
      usage,
      expiring,
      chart: months.map((m) => ({
        month: m,
        revenue: revenue.find((r) => r.month === m)?.amount ?? 0,
        signups: signups.find((s) => s.month === m)?.count ?? 0,
      })),
      recentPayments,
      recentTenants,
    });
  }),
);

/* ------------------------------------------------------------ tenants */
platformRouter.get(
  "/tenants",
  ah(async (req, res) => {
    const { page, pageSize, offset } = pageParams(req.query);
    const T = schema.tenants;
    const conds = [];
    if (req.query.q)
      conds.push(
        or(
          ilike(T.name, `%${req.query.q}%`),
          ilike(T.email, `%${req.query.q}%`),
          ilike(T.phone, `%${req.query.q}%`),
        ),
      );
    if (req.query.status) conds.push(eq(T.status, req.query.status as any));
    const where = conds.length ? and(...conds) : undefined;
    const rows = await db
      .select({
        id: T.id,
        name: T.name,
        slug: T.slug,
        email: T.email,
        phone: T.phone,
        city: T.city,
        status: T.status,
        createdAt: T.createdAt,
        plan: schema.plans.name,
        subStatus: schema.subscriptions.status,
        periodEnd: schema.subscriptions.currentPeriodEnd,
        cycle: schema.subscriptions.billingCycle,
        employees: sql<number>`(select count(*) from employees e where e.tenant_id = ${T.id})::int`,
        canteens: sql<number>`(select count(*) from canteens c where c.tenant_id = ${T.id})::int`,
        meals30d: sql<number>`(select count(*) from orders o where o.tenant_id = ${T.id} and o.created_at > now() - interval '30 days')::int`,
      })
      .from(T)
      .leftJoin(schema.subscriptions, eq(schema.subscriptions.tenantId, T.id))
      .leftJoin(schema.plans, eq(schema.plans.id, schema.subscriptions.planId))
      .where(where)
      .orderBy(desc(T.createdAt))
      .limit(pageSize)
      .offset(offset);
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(T)
      .where(where);
    res.json({ items: rows, total: c, page, pageSize });
  }),
);

platformRouter.post(
  "/tenants",
  adminOnly,
  ah(async (req, res) => {
    const b = parse(
      z.object({
        businessName: z.string().min(2),
        ownerName: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional(),
        password: z.string().min(8),
        planCode: z.string().optional(),
        billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
        city: z.string().optional(),
      }),
      req.body,
    );
    const r = await createTenantWithOwner({ ...b, source: "sales" });
    audit(req, "platform.tenant.create", {
      entity: "tenant",
      entityId: r.tenant.id,
    });
    res.status(201).json(r.tenant);
  }),
);

platformRouter.get(
  "/tenants/:id",
  ah(async (req, res) => {
    const t = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, req.params.id),
      with: {
        subscription: { with: { plan: true } },
        canteens: { columns: { qrSecret: false } },
        staff: { columns: { passwordHash: false, resetToken: false } },
        payments: {
          orderBy: desc(schema.payments.createdAt),
          limit: 30,
          with: { plan: { columns: { name: true } } },
        },
      },
    });
    if (!t) throw notFound();
    const [usage] = await db
      .select({
        employees: sql<number>`(select count(*) from employees where tenant_id = ${t.id})::int`,
        activeEmployees: sql<number>`(select count(*) from employees where tenant_id = ${t.id} and status='ACTIVE')::int`,
        meals30d: sql<number>`(select count(*) from orders where tenant_id = ${t.id} and created_at > now() - interval '30 days')::int`,
        mealsTotal: sql<number>`(select count(*) from orders where tenant_id = ${t.id})::int`,
        lastOrderAt: sql<string>`(select max(created_at) from orders where tenant_id = ${t.id})`,
      })
      .from(sql`(select 1) x`);
    res.json({ ...t, usage });
  }),
);

platformRouter.patch(
  "/tenants/:id",
  adminOnly,
  ah(async (req, res) => {
    const b = parse(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().nullish(),
        gstin: z.string().nullish(),
        city: z.string().nullish(),
        status: z
          .enum(["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED"])
          .optional(),
        notes: z.string().nullish(),
      }),
      req.body,
    );
    const [t] = await db
      .update(schema.tenants)
      .set(b)
      .where(eq(schema.tenants.id, req.params.id))
      .returning();
    if (!t) throw notFound();
    audit(req, "platform.tenant.update", {
      tenantId: t.id,
      entity: "tenant",
      entityId: t.id,
      meta: b,
    });
    res.json(t);
  }),
);

/** Change plan / extend period / set status manually (offline deals, goodwill extensions) */
platformRouter.post(
  "/tenants/:id/subscription",
  adminOnly,
  ah(async (req, res) => {
    const b = parse(
      z.object({
        planId: z.string().optional(),
        billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
        status: z
          .enum(["TRIALING", "ACTIVE", "PAST_DUE", "EXPIRED", "CANCELLED"])
          .optional(),
        extendDays: z.coerce.number().int().min(-365).max(3650).optional(),
        currentPeriodEnd: z.coerce.date().optional(),
      }),
      req.body,
    );
    const sub = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.tenantId, req.params.id),
    });
    if (!sub) throw notFound("No subscription");
    const patch: Partial<typeof schema.subscriptions.$inferInsert> = {};
    if (b.planId) patch.planId = b.planId;
    if (b.billingCycle) patch.billingCycle = b.billingCycle;
    if (b.status) patch.status = b.status;
    if (b.currentPeriodEnd) patch.currentPeriodEnd = b.currentPeriodEnd;
    if (b.extendDays) {
      const base =
        new Date(sub.currentPeriodEnd) > new Date()
          ? sub.currentPeriodEnd
          : new Date();
      patch.currentPeriodEnd = dayjs(base).add(b.extendDays, "day").toDate();
    }
    const [s] = await db
      .update(schema.subscriptions)
      .set(patch)
      .where(eq(schema.subscriptions.id, sub.id))
      .returning();
    if (s.status === "ACTIVE")
      await db
        .update(schema.tenants)
        .set({ status: "ACTIVE" })
        .where(eq(schema.tenants.id, req.params.id));
    if (s.status === "TRIALING")
      await db
        .update(schema.tenants)
        .set({ status: "TRIAL" })
        .where(eq(schema.tenants.id, req.params.id));
    audit(req, "platform.subscription.update", {
      tenantId: req.params.id,
      meta: b,
    });
    res.json(s);
  }),
);

/** Log in to a tenant console as its owner (support) — audited. */
platformRouter.post(
  "/tenants/:id/impersonate",
  adminOnly,
  ah(async (req, res) => {
    const owner = await db.query.staffUsers.findFirst({
      where: and(
        eq(schema.staffUsers.tenantId, req.params.id),
        eq(schema.staffUsers.role, "OWNER"),
      ),
    });
    if (!owner) throw notFound("Owner not found");
    audit(req, "platform.impersonate", {
      tenantId: req.params.id,
      entity: "staff",
      entityId: owner.id,
    });
    const token = signToken(
      { sub: owner.id, typ: "staff", tid: owner.tenantId, role: "OWNER" },
      "1h",
    );
    res.json({ token, url: `${env.CONSOLE_URL}/impersonate#token=${token}` });
  }),
);

/** Record an offline payment (bank transfer / cheque) and activate. */
platformRouter.post(
  "/tenants/:id/manual-payment",
  adminOnly,
  ah(async (req, res) => {
    const b = parse(
      z.object({
        planId: z.string(),
        billingCycle: z.enum(["MONTHLY", "YEARLY"]),
        amount: z.coerce.number().positive(),
        reference: z.string().min(2),
      }),
      req.body,
    );
    const sub = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.tenantId, req.params.id),
    });
    const [p] = await db
      .insert(schema.payments)
      .values({
        tenantId: req.params.id,
        subscriptionId: sub?.id,
        planId: b.planId,
        billingCycle: b.billingCycle,
        amount: b.amount,
        razorpayOrderId: `manual_${Date.now()}`,
        method: "offline",
        status: "CREATED",
      })
      .returning();
    const { markPaymentPaid } = await import("../../services/billing");
    const paid = await markPaymentPaid(
      p.razorpayOrderId!,
      b.reference,
      undefined,
      "offline",
    );
    audit(req, "platform.payment.manual", {
      tenantId: req.params.id,
      entity: "payment",
      entityId: p.id,
      meta: b,
    });
    res.json(paid);
  }),
);

/* ------------------------------------------------------------ plans & coupons */
const planSchema = z.object({
  code: z
    .string()
    .min(2)
    .transform((s) => slugify(s)),
  name: z.string().min(2),
  tagline: z.string().nullish(),
  priceMonthly: z.coerce.number().min(0),
  priceYearly: z.coerce.number().min(0),
  trialDays: z.coerce.number().int().min(0).max(90).default(14),
  maxCanteens: z.coerce.number().int().default(1),
  maxEmployees: z.coerce.number().int().default(200),
  maxStaffUsers: z.coerce.number().int().default(3),
  features: z.record(z.boolean()).default({}),
  highlights: z.array(z.string()).default([]),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

platformRouter.use(
  "/plans",
  adminOnly,
  pcrud({
    name: "plan",
    table: schema.plans,
    schema: planSchema,
    orderBy: schema.plans.sortOrder,
    orderDir: "asc",
  }),
);
platformRouter.use(
  "/coupons",
  adminOnly,
  pcrud({
    name: "coupon",
    table: schema.coupons,
    schema: z.object({
      code: z
        .string()
        .min(3)
        .transform((s) => s.toUpperCase().trim()),
      description: z.string().nullish(),
      percentOff: z.coerce.number().int().min(1).max(100).nullish(),
      amountOff: z.coerce.number().min(1).nullish(),
      maxRedemptions: z.coerce.number().int().min(1).nullish(),
      validUntil: z.coerce.date().nullish(),
      isActive: z.boolean().default(true),
    }),
    search: [schema.coupons.code],
    orderBy: schema.coupons.createdAt,
  }),
);

/* ------------------------------------------------------------ payments */
platformRouter.get(
  "/payments",
  ah(async (req, res) => {
    const { pageSize, offset, page } = pageParams(req.query);
    const conds = [];
    if (req.query.status)
      conds.push(eq(schema.payments.status, req.query.status as any));
    if (req.query.tenantId)
      conds.push(eq(schema.payments.tenantId, String(req.query.tenantId)));
    const where = conds.length ? and(...conds) : undefined;
    const items = await db.query.payments.findMany({
      where,
      with: {
        tenant: { columns: { name: true, email: true } },
        plan: { columns: { name: true } },
      },
      orderBy: desc(schema.payments.createdAt),
      limit: pageSize,
      offset,
    });
    const [agg] = await db
      .select({
        c: sql<number>`count(*)::int`,
        paid: sql<number>`coalesce(sum(${schema.payments.amount}) filter (where ${schema.payments.status}='PAID'),0)::float`,
      })
      .from(schema.payments)
      .where(where);
    res.json({ items, total: agg.c, paidTotal: agg.paid, page, pageSize });
  }),
);

/* ------------------------------------------------------------ website content */
const blogSchema = z.object({
  title: z.string().min(3),
  slug: z.string().optional(),
  excerpt: z.string().nullish(),
  content: z.string().min(1),
  coverImage: z.string().nullish(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().nullish(),
  seoDescription: z.string().nullish(),
  categoryId: z.string().nullish(),
  publishedAt: z.coerce.date().nullish(),
});
platformRouter.get(
  "/blog/posts",
  content,
  ah(async (req, res) => {
    const conds = [];
    if (req.query.status)
      conds.push(eq(schema.blogPosts.status, req.query.status as any));
    if (req.query.q)
      conds.push(ilike(schema.blogPosts.title, `%${req.query.q}%`));
    res.json(
      await db.query.blogPosts.findMany({
        where: conds.length ? and(...conds) : undefined,
        columns: { content: false },
        with: { category: true, author: { columns: { name: true } } },
        orderBy: desc(schema.blogPosts.updatedAt),
      }),
    );
  }),
);


platformRouter.use(
  "/blog/posts",
  content,
  pcrud({
    name: "blog_post",
    table: schema.blogPosts,
    schema: blogSchema,
    transform: (d, isCreate) => {
      if (d.title && (isCreate || d.slug !== undefined))
        d.slug = slugify(d.slug || d.title);
      if (d.content)
        d.readingMinutes = Math.max(
          1,
          Math.round(String(d.content).split(/\s+/).length / 200),
        );
      if (d.status === "PUBLISHED" && !d.publishedAt)
        d.publishedAt = new Date();
      return d;
    },
  }),
);


platformRouter.use(
  "/blog/categories",
  content,
  pcrud({
    name: "blog_category",
    table: schema.blogCategories,
    schema: z.object({ name: z.string().min(2), slug: z.string().optional() }),
    transform: (d) => ({
      ...d,
      ...(d.name ? { slug: slugify(d.slug || d.name) } : {}),
    }),
  }),
);

platformRouter.use(
  "/pages",
  content,
  pcrud({
    name: "cms_page",
    table: schema.cmsPages,
    schema: z.object({
      slug: z.string().min(2).transform(slugify),
      title: z.string().min(2),
      content: z.string(),
      seoDescription: z.string().nullish(),
      status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
    }),
    orderBy: schema.cmsPages.slug,
    orderDir: "asc",
  }),
);


platformRouter.use(
  "/testimonials",
  content,
  pcrud({
    name: "testimonial",
    table: schema.testimonials,
    schema: z.object({
      name: z.string().min(2),
      role: z.string().nullish(),
      company: z.string().nullish(),
      quote: z.string().min(5),
      rating: z.coerce.number().int().min(1).max(5).default(5),
      avatarUrl: z.string().nullish(),
      isActive: z.boolean().default(true),
      sortOrder: z.coerce.number().int().default(0),
    }),
    orderBy: schema.testimonials.sortOrder,
    orderDir: "asc",
  }),
);


platformRouter.use(
  "/faqs",
  content,
  pcrud({
    name: "faq",
    table: schema.faqs,
    schema: z.object({
      question: z.string().min(5),
      answer: z.string().min(2),
      group: z.string().default("general"),
      sortOrder: z.coerce.number().int().default(0),
      isActive: z.boolean().default(true),
    }),
    filters: { group: schema.faqs.group },
    orderBy: schema.faqs.sortOrder,
    orderDir: "asc",
  }),
);

/* ------------------------------------------------------------ leads */
platformRouter.use(
  "/leads",
  pcrud({
    name: "lead",
    table: schema.leads,
    schema: z.object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string().nullish(),
      company: z.string().nullish(),
      employees: z.string().nullish(),
      message: z.string().nullish(),
      type: z.string().default("contact"),
      status: z
        .enum(["NEW", "CONTACTED", "DEMO_SCHEDULED", "CONVERTED", "LOST"])
        .default("NEW"),
      notes: z.string().nullish(),
      source: z.string().nullish(),
    }),
    search: [schema.leads.name, schema.leads.email, schema.leads.company],
    filters: { status: schema.leads.status, type: schema.leads.type },
    orderBy: schema.leads.createdAt,
  }),
);

/* ------------------------------------------------------------ settings & integrations */
platformRouter.get(
  "/settings",
  adminOnly,
  ah(async (_req, res) => res.json(await listSettingsMasked())),
);
platformRouter.put(
  "/settings",
  adminOnly,
  ah(async (req, res) => {
    const b = parse(z.record(z.string().nullable()), req.body);
    const allowed = /^(razorpay|onesignal|smtp|brand|tax)\.[a-zA-Z]+$/;
    for (const k of Object.keys(b))
      if (!allowed.test(k)) throw badRequest(`Unknown setting ${k}`);
    await setSettings(b);
    audit(req, "platform.settings.update", { meta: { keys: Object.keys(b) } });
    res.json(await listSettingsMasked());
  }),
);

platformRouter.post(
  "/settings/test-email",
  adminOnly,
  ah(async (req, res) => {
    const { to } = parse(z.object({ to: z.string().email() }), req.body);
    const r = await sendMail(
      to,
      "SMTP test from " + (await getSetting("brand.name")),
      "<p>Your SMTP settings are working ✅</p>",
      { template: "test" },
    );
    res.json(r);
  }),
);

platformRouter.post(
  "/settings/test-push",
  adminOnly,
  ah(async (req, res) => {
    const { externalId } = parse(
      z.object({ externalId: z.string() }),
      req.body,
    );
    res.json({
      status: await sendPush({
        title: "Test notification",
        body: "OneSignal is configured correctly ✅",
        externalIds: [externalId],
      }),
    });
  }),
);

/* ------------------------------------------------------------ email templates & logs */
platformRouter.get(
  "/email-templates",
  ah(async (_req, res) => {
    const rows = await db.select().from(schema.emailTemplates);
    res.json(
      DEFAULT_TEMPLATES.map((d) => {
        const r = rows.find((x) => x.key === d.key);
        return r
          ? { ...r, isCustom: true }
          : { ...d, id: null, isActive: true, isCustom: false };
      }),
    );
  }),
);
platformRouter.put(
  "/email-templates/:key",
  adminOnly,
  ah(async (req, res) => {
    const def = DEFAULT_TEMPLATES.find((d) => d.key === req.params.key);
    if (!def) throw notFound("Unknown template");
    const b = parse(
      z.object({
        subject: z.string().min(2),
        html: z.string().min(2),
        isActive: z.boolean().default(true),
      }),
      req.body,
    );
    const [row] = await db
      .insert(schema.emailTemplates)
      .values({ key: def.key, name: def.name, ...b })
      .onConflictDoUpdate({ target: schema.emailTemplates.key, set: b })
      .returning();
    res.json(row);
  }),
);


platformRouter.delete(
  "/email-templates/:key",
  adminOnly,
  ah(async (req, res) => {
    await db
      .delete(schema.emailTemplates)
      .where(eq(schema.emailTemplates.key, req.params.key));
    res.json({ ok: true, reset: true });
  }),
);
platformRouter.post(
  "/email-templates/:key/test",
  adminOnly,
  ah(async (req, res) => {
    const { to, vars } = parse(
      z.object({ to: z.string().email(), vars: z.record(z.any()).default({}) }),
      req.body,
    );
    res.json(
      await sendTemplateMail(to, req.params.key, {
        brand: await getSetting("brand.name"),
        name: "Test User",
        tenant: "Demo Caterers",
        ...vars,
      }),
    );
  }),
);
platformRouter.post(
  "/email-templates/preview",
  ah(async (req, res) => {
    const { html, vars } = parse(
      z.object({ html: z.string(), vars: z.record(z.any()).default({}) }),
      req.body,
    );
    res.json({
      html: render(html, {
        brand: await getSetting("brand.name"),
        name: "Test User",
        tenant: "Demo Caterers",
        ...vars,
      }),
    });
  }),
);

platformRouter.get(
  "/email-logs",
  ah(async (req, res) => {
    const { pageSize, offset } = pageParams(req.query);
    const conds = [];
    if (req.query.status)
      conds.push(eq(schema.emailLogs.status, String(req.query.status)));
    if (req.query.q) conds.push(ilike(schema.emailLogs.to, `%${req.query.q}%`));
    res.json(
      await db
        .select()
        .from(schema.emailLogs)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(schema.emailLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
    );
  }),
);

/** Email all tenant owners (product updates, maintenance notices) */
platformRouter.post(
  "/broadcast",
  adminOnly,
  ah(async (req, res) => {
    const b = parse(
      z.object({
        subject: z.string().min(3),
        html: z.string().min(3),
        tenantStatus: z
          .array(z.enum(["TRIAL", "ACTIVE", "PAST_DUE"]))
          .default(["TRIAL", "ACTIVE"]),
      }),
      req.body,
    );
    const owners = await db
      .select({
        email: schema.staffUsers.email,
        name: schema.staffUsers.name,
        tenant: schema.tenants.name,
        tenantId: schema.tenants.id,
      })
      .from(schema.staffUsers)
      .innerJoin(
        schema.tenants,
        eq(schema.tenants.id, schema.staffUsers.tenantId),
      )
      .where(
        and(
          eq(schema.staffUsers.role, "OWNER"),
          eq(schema.staffUsers.isActive, true),
          inArray(schema.tenants.status, b.tenantStatus),
        ),
      );
    (async () => {
      for (const o of owners)
        await sendMail(o.email, render(b.subject, o), render(b.html, o), {
          tenantId: o.tenantId,
          template: "broadcast",
        });
    })();
    audit(req, "platform.broadcast", {
      meta: { subject: b.subject, recipients: owners.length },
    });
    res.json({ queued: owners.length });
  }),
);

/* ------------------------------------------------------------ platform users & audit */
platformRouter.get(
  "/users",
  adminOnly,
  ah(async (_req, res) =>
    res.json(
      await db
        .select({
          id: schema.platformUsers.id,
          name: schema.platformUsers.name,
          email: schema.platformUsers.email,
          role: schema.platformUsers.role,
          isActive: schema.platformUsers.isActive,
          lastLoginAt: schema.platformUsers.lastLoginAt,
          createdAt: schema.platformUsers.createdAt,
        })
        .from(schema.platformUsers)
        .orderBy(asc(schema.platformUsers.createdAt)),
    ),
  ),
);
platformRouter.post(
  "/users",
  adminOnly,
  ah(async (req, res) => {
    const b = parse(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(["SUPER_ADMIN", "SUPPORT", "CONTENT_EDITOR"]),
      }),
      req.body,
    );
    const [u] = await db
      .insert(schema.platformUsers)
      .values({
        name: b.name,
        email: b.email.toLowerCase(),
        role: b.role,
        passwordHash: await bcrypt.hash(b.password, 10),
      })
      .returning({ id: schema.platformUsers.id });
    res.status(201).json(u);
  }),
);

platformRouter.patch(
  "/users/:id",
  adminOnly,
  ah(async (req, res) => {
    const b = parse(
      z.object({
        name: z.string().optional(),
        role: z.enum(["SUPER_ADMIN", "SUPPORT", "CONTENT_EDITOR"]).optional(),
        isActive: z.boolean().optional(),
        password: z.string().min(8).optional(),
      }),
      req.body,
    );
    if (
      req.params.id === req.auth!.id &&
      (b.isActive === false || (b.role && b.role !== "SUPER_ADMIN"))
    )
      throw badRequest("You cannot demote or disable yourself");
    const { password, ...rest } = b;
    const patch: Record<string, unknown> = { ...rest };
    if (password) patch.passwordHash = await bcrypt.hash(password, 10);
    await db
      .update(schema.platformUsers)
      .set(patch)
      .where(eq(schema.platformUsers.id, req.params.id));
    res.json({ ok: true });
  }),
);


platformRouter.get(
  "/audit-logs",
  adminOnly,
  ah(async (req, res) => {
    const { pageSize, offset } = pageParams(req.query);
    const conds = [];
    if (req.query.tenantId)
      conds.push(eq(schema.auditLogs.tenantId, String(req.query.tenantId)));
    if (req.query.action)
      conds.push(ilike(schema.auditLogs.action, `%${req.query.action}%`));
    res.json(
      await db
        .select({
          id: schema.auditLogs.id,
          action: schema.auditLogs.action,
          actorType: schema.auditLogs.actorType,
          actorId: schema.auditLogs.actorId,
          tenant: schema.tenants.name,
          entity: schema.auditLogs.entity,
          entityId: schema.auditLogs.entityId,
          meta: schema.auditLogs.meta,
          ip: schema.auditLogs.ip,
          createdAt: schema.auditLogs.createdAt,
        })
        .from(schema.auditLogs)
        .leftJoin(
          schema.tenants,
          eq(schema.tenants.id, schema.auditLogs.tenantId),
        )
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(schema.auditLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
    );
  }),
);
