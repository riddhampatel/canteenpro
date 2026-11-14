import { Router } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db";
import { ah, forbidden, notFound, parse, badRequest } from "../../lib/http";
import { markPaymentPaid, startCheckout } from "../../services/billing";
import { verifyPaymentSignature } from "../../lib/razorpay";
import { audit } from "../../lib/audit";
import { getSettings } from "../../lib/settings";

/** Subscription & invoices for the canteen owner (works even when expired). */
export const billingRouter = Router();

billingRouter.use((req, _res, next) =>
  req.auth!.role === "OWNER"
    ? next()
    : next(forbidden("Only the owner can manage billing")),
);

billingRouter.get(
  "/",
  ah(async (req, res) => {
    const c = req.tenantCtx!;
    const [plans, payments, usage] = await Promise.all([
      db
        .select()
        .from(schema.plans)
        .where(eq(schema.plans.isActive, true))
        .orderBy(asc(schema.plans.sortOrder)),
      db.query.payments.findMany({
        where: eq(schema.payments.tenantId, c.tenant.id),
        with: { plan: { columns: { name: true } } },
        orderBy: desc(schema.payments.createdAt),
        limit: 50,
      }),
      Promise.all([
        db.$count(
          schema.employees,
          and(eq(schema.employees.tenantId, c.tenant.id)),
        ),
        db.$count(schema.canteens, eq(schema.canteens.tenantId, c.tenant.id)),
        db.$count(
          schema.staffUsers,
          eq(schema.staffUsers.tenantId, c.tenant.id),
        ),
      ]),
    ]);
    res.json({
      subscription: c.subscription && {
        ...c.subscription,
        daysLeft: c.daysLeft,
        active: c.active,
      },
      plan: c.plan,
      usage: { employees: usage[0], canteens: usage[1], staff: usage[2] },
      plans,
      payments,
    });
  }),
);

billingRouter.post(
  "/checkout",
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

billingRouter.post(
  "/verify",
  ah(async (req, res) => {
    const b = parse(
      z.object({
        razorpay_order_id: z.string(),
        razorpay_payment_id: z.string(),
        razorpay_signature: z.string().default(""),
      }),
      req.body,
    );
    if (
      !(await verifyPaymentSignature(
        b.razorpay_order_id,
        b.razorpay_payment_id,
        b.razorpay_signature,
      ))
    )
      throw badRequest("Payment verification failed");
    const p = await markPaymentPaid(
      b.razorpay_order_id,
      b.razorpay_payment_id,
      b.razorpay_signature,
    );
    audit(req, "billing.payment", { entity: "payment", entityId: p.id });
    res.json({ ok: true, payment: p });
  }),
);

billingRouter.post(
  "/cancel",
  ah(async (req, res) => {
    const { cancel } = parse(z.object({ cancel: z.boolean() }), req.body);
    await db
      .update(schema.subscriptions)
      .set({ cancelAtPeriodEnd: cancel })
      .where(eq(schema.subscriptions.tenantId, req.auth!.tenantId!));
    audit(req, cancel ? "billing.cancel" : "billing.resume");
    res.json({ ok: true });
  }),
);

/** Printable invoice data */
billingRouter.get(
  "/invoices/:id",
  ah(async (req, res) => {
    const p = await db.query.payments.findFirst({
      where: and(
        eq(schema.payments.id, req.params.id),
        eq(schema.payments.tenantId, req.auth!.tenantId!),
        eq(schema.payments.status, "PAID"),
      ),
      with: { plan: true, tenant: true },
    });
    if (!p) throw notFound();
    const s = await getSettings([
      "brand.name",
      "brand.legalName",
      "brand.address",
      "brand.gstin",
      "brand.supportEmail",
      "tax.gstPercent",
    ]);
    res.json({ payment: p, seller: s });
  }),
);
