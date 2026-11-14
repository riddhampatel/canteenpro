import { Router } from "express";
import rateLimit from "express-rate-limit";
import { and, asc, desc, eq, sql, arrayContains } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { ah, badRequest, notFound, pageParams, parse } from "../lib/http";
import { getSettings } from "../lib/settings";
import { sendTemplateMail } from "../lib/mailer";
import { signToken } from "../lib/jwt";
import { env } from "../config/env";
import {
  createTenantWithOwner,
  markPaymentPaid,
  quote,
  startCheckout,
} from "../services/billing";
import { requireStaff } from "../middleware/auth";
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../lib/razorpay";
import { audit } from "../lib/audit";

export const publicRouter = Router();
const formLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Public site config for website & apps */
publicRouter.get(
  "/site",
  ah(async (_req, res) => {
    const s = await getSettings([
      "brand.name",
      "brand.supportEmail",
      "brand.supportPhone",
      "brand.whatsapp",
      "razorpay.keyId",
      "tax.gstPercent",
    ]);
    res.json({
      name: s["brand.name"],
      supportEmail: s["brand.supportEmail"],
      supportPhone: s["brand.supportPhone"],
      whatsapp: s["brand.whatsapp"],
      razorpayKeyId: s["razorpay.keyId"] || null,
      gstPercent: Number(s["tax.gstPercent"] || 0),
      consoleUrl: env.CONSOLE_URL,
    });
  }),
);

publicRouter.get(
  "/plans",
  ah(async (_req, res) => {
    const rows = await db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.isActive, true))
      .orderBy(asc(schema.plans.sortOrder));
    res.json(rows);
  }),
);

publicRouter.get(
  "/blog",
  ah(async (req, res) => {
    const { page, pageSize, offset } = pageParams(req.query);

    const conds = [eq(schema.blogPosts.status, "PUBLISHED")];
    
    if (req.query.category) {
      const cat = await db.query.blogCategories.findFirst({
        where: eq(schema.blogCategories.slug, String(req.query.category)),
      });
      if (cat) conds.push(eq(schema.blogPosts.categoryId, cat.id));
    }
    if (req.query.tag)
      conds.push(arrayContains(schema.blogPosts.tags, [String(req.query.tag)]));
    const where = and(...conds);
    const [items, [{ c }]] = await Promise.all([
      db.query.blogPosts.findMany({
        where,
        columns: { content: false },
        with: { category: true, author: { columns: { name: true } } },
        orderBy: desc(schema.blogPosts.publishedAt),
        limit: pageSize,
        offset,
      }),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(schema.blogPosts)
        .where(where),
    ]);
    res.json({ items, total: c, page, pageSize });
  }),
);

publicRouter.get(
  "/blog/:slug",
  ah(async (req, res) => {
    const post = await db.query.blogPosts.findFirst({
      where: and(
        eq(schema.blogPosts.slug, req.params.slug),
        eq(schema.blogPosts.status, "PUBLISHED"),
      ),
      with: { category: true, author: { columns: { name: true } } },
    });
    if (!post) throw notFound("Post not found");
    const related = await db.query.blogPosts.findMany({
      where: and(
        eq(schema.blogPosts.status, "PUBLISHED"),
        sql`${schema.blogPosts.id} <> ${post.id}`,
      ),
      columns: { content: false },
      orderBy: desc(schema.blogPosts.publishedAt),
      limit: 3,
    });
    res.json({ ...post, related });
  }),
);

publicRouter.get(
  "/blog-categories",
  ah(async (_req, res) =>
    res.json(await db.select().from(schema.blogCategories)),
  ),
);

publicRouter.get(
  "/pages/:slug",
  ah(async (req, res) => {
    const p = await db.query.cmsPages.findFirst({
      where: and(
        eq(schema.cmsPages.slug, req.params.slug),
        eq(schema.cmsPages.status, "PUBLISHED"),
      ),
    });
    if (!p) throw notFound("Page not found");
    res.json(p);
  }),
);

publicRouter.get(
  "/testimonials",
  ah(async (_req, res) =>
    res.json(
      await db
        .select()
        .from(schema.testimonials)
        .where(eq(schema.testimonials.isActive, true))
        .orderBy(asc(schema.testimonials.sortOrder)),
    ),
  ),
);

publicRouter.get(
  "/faqs",
  ah(async (req, res) => {
    const conds = [eq(schema.faqs.isActive, true)];
    if (req.query.group)
      conds.push(eq(schema.faqs.group, String(req.query.group)));
    res.json(
      await db
        .select()
        .from(schema.faqs)
        .where(and(...conds))
        .orderBy(asc(schema.faqs.sortOrder)),
    );
  }),
);

const leadSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  company: z.string().max(160).optional(),
  employees: z.string().max(40).optional(),
  message: z.string().max(4000).optional(),
  type: z.enum(["contact", "demo"]).default("contact"),
  source: z.string().max(200).optional(),
});

publicRouter.post(
  "/leads",
  formLimiter,
  ah(async (req, res) => {
    const body = parse(leadSchema, req.body);
    const [lead] = await db.insert(schema.leads).values(body).returning();
    const s = await getSettings(["brand.supportEmail", "brand.name"]);
    if (s["brand.supportEmail"])
      sendTemplateMail(s["brand.supportEmail"], "lead_received", {
        ...body,
        brand: s["brand.name"],
      });
    res.status(201).json({ ok: true, id: lead.id });
  }),
);

const signupSchema = z.object({
  businessName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(20),
  password: z.string().min(8).max(100),
  planCode: z.string().optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  city: z.string().max(80).optional(),
  canteenName: z.string().max(120).optional(),
  clientCompany: z.string().max(120).optional(),
});

publicRouter.post(
  "/signup",
  formLimiter,
  ah(async (req, res) => {
    const body = parse(signupSchema, req.body);
    const r = await createTenantWithOwner(body);
    audit(null, "tenant.signup", {
      tenantId: r.tenant.id,
      entity: "tenant",
      entityId: r.tenant.id,
      meta: { plan: r.plan.code },
    });
    const token = signToken({
      sub: r.owner.id,
      typ: "staff",
      tid: r.tenant.id,
      role: "OWNER",
    });
    res.status(201).json({
      token,
      tenant: { id: r.tenant.id, name: r.tenant.name, slug: r.tenant.slug },
      user: {
        id: r.owner.id,
        name: r.owner.name,
        email: r.owner.email,
        role: r.owner.role,
      },
      trialEndsAt: r.sub.currentPeriodEnd,
      consoleUrl: env.CONSOLE_URL,
    });
  }),
);

publicRouter.post(
  "/quote",
  ah(async (req, res) => {
    const b = parse(
      z.object({
        planCode: z.string(),
        billingCycle: z.enum(["MONTHLY", "YEARLY"]),
        coupon: z.string().optional(),
      }),
      req.body,
    );
    const q = await quote(b.planCode, b.billingCycle, b.coupon);
    res.json({
      ...q,
      plan: { code: q.plan.code, name: q.plan.name },
      coupon: q.coupon?.code ?? null,
    });
  }),
);

/** Checkout for a logged-in owner (website after signup, or console Billing page) */
publicRouter.post(
  "/checkout",
  requireStaff("OWNER"),
  ah(async (req, res) => {
    const b = parse(
      z.object({
        planCode: z.string(),
        billingCycle: z.enum(["MONTHLY", "YEARLY"]),
        coupon: z.string().optional(),
      }),
      req.body,
    );
    res.json(
      await startCheckout(
        req.auth!.tenantId!,
        b.planCode,
        b.billingCycle,
        b.coupon,
      ),
    );
  }),
);

publicRouter.post(
  "/checkout/verify",
  requireStaff("OWNER"),
  ah(async (req, res) => {
    const b = parse(
      z.object({
        razorpay_order_id: z.string(),
        razorpay_payment_id: z.string(),
        razorpay_signature: z.string().default(""),
      }),
      req.body,
    );
    const ok = await verifyPaymentSignature(
      b.razorpay_order_id,
      b.razorpay_payment_id,
      b.razorpay_signature,
    );
    if (!ok)
      throw badRequest(
        "Payment signature verification failed",
        "BAD_SIGNATURE",
      );
    const p = await markPaymentPaid(
      b.razorpay_order_id,
      b.razorpay_payment_id,
      b.razorpay_signature,
    );
    if (p.tenantId !== req.auth!.tenantId)
      throw badRequest("Payment does not belong to this account");
    audit(req, "billing.payment", {
      entity: "payment",
      entityId: p.id,
      meta: { amount: p.amount },
    });
    res.json({ ok: true, payment: p });
  }),
);

/** Razorpay webhook — configure URL: https://api.yourdomain.com/api/webhooks/razorpay */
export const webhookRouter = Router();
webhookRouter.post(
  "/razorpay",
  ah(async (req, res) => {
    const sig = req.header("x-razorpay-signature") ?? "";
    if (!(await verifyWebhookSignature(req.rawBody ?? "", sig)))
      return res.status(400).json({ error: "bad signature" });
    const evt = req.body?.event as string;
    const entity = req.body?.payload?.payment?.entity;
    if (
      (evt === "payment.captured" || evt === "order.paid") &&
      entity?.order_id
    ) {
      await markPaymentPaid(
        entity.order_id,
        entity.id,
        undefined,
        entity.method,
      ).catch((e) => console.warn("[webhook]", e.message));
    }
    if (evt === "payment.failed" && entity?.order_id) {
      await db
        .update(schema.payments)
        .set({
          status: "FAILED",
          failureReason: entity.error_description ?? "failed",
        })
        .where(
          and(
            eq(schema.payments.razorpayOrderId, entity.order_id),
            eq(schema.payments.status, "CREATED"),
          ),
        );
    }
    res.json({ ok: true });
  }),
);
