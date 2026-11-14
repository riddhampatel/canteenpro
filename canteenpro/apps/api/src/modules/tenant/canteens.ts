import { Router } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db";
import { ah, forbidden, notFound, parse } from "../../lib/http";
import { allowedCanteens, assertCanteenAccess } from "../../middleware/auth";
import { assertLimit, DEFAULT_SESSIONS } from "../../services/billing";
import { counterQr } from "../../services/qr";
import { localDate } from "../../lib/time";
import { audit } from "../../lib/audit";

export const canteensRouter = Router();
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");

const canteenSchema = z.object({
  name: z.string().min(2),
  code: z
    .string()
    .min(1)
    .max(10)
    .transform((s) => s.toUpperCase()),
  clientCompany: z.string().nullish(),
  clientGstin: z.string().nullish(),
  address: z.string().nullish(),
  phone: z.string().nullish(),
  isActive: z.boolean().optional(),
  allowGuests: z.boolean().optional(),
  optInRequired: z.boolean().optional(),
  autoPublishMenus: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  allowNegativeWallet: z.boolean().optional(),
  walletCreditLimit: z.coerce.number().min(0).optional(),
  gstPercent: z.coerce.number().min(0).max(28).optional(),
  billPrefix: z.string().min(1).max(6).optional(),
});

canteensRouter.get(
  "/",
  ah(async (req, res) => {
    const allowed = allowedCanteens(req);
    const rows = await db.query.canteens.findMany({
      where: and(
        eq(schema.canteens.tenantId, req.auth!.tenantId!),
        allowed ? inArray(schema.canteens.id, allowed) : undefined,
      ),
      with: { sessions: { orderBy: asc(schema.mealSessions.sortOrder) } },
      orderBy: asc(schema.canteens.createdAt),
    });
    res.json(rows.map(({ qrSecret, ...c }) => c));
  }),
);

canteensRouter.post(
  "/",
  ah(async (req, res) => {
    if (req.auth!.role !== "OWNER")
      throw forbidden("Only the owner can add canteens");
    await assertLimit(req.tenantCtx!, "canteens");
    const b = parse(canteenSchema, req.body);
    const c = await db.transaction(async (tx) => {
      const [c] = await tx
        .insert(schema.canteens)
        .values({ ...b, tenantId: req.auth!.tenantId! })
        .returning();
      await tx
        .insert(schema.mealSessions)
        .values(DEFAULT_SESSIONS.map((s) => ({ ...s, canteenId: c.id })));
      return c;
    });
    audit(req, "canteen.create", { entity: "canteen", entityId: c.id });
    const { qrSecret, ...rest } = c;
    res.status(201).json(rest);
  }),
);

canteensRouter.patch(
  "/:id",
  ah(async (req, res) => {
    if (!["OWNER", "MANAGER"].includes(req.auth!.role!)) throw forbidden();
    assertCanteenAccess(req, req.params.id);
    const b = parse(canteenSchema.partial(), req.body);
    const [c] = await db
      .update(schema.canteens)
      .set(b)
      .where(
        and(
          eq(schema.canteens.id, req.params.id),
          eq(schema.canteens.tenantId, req.auth!.tenantId!),
        ),
      )
      .returning();
    if (!c) throw notFound();
    audit(req, "canteen.update", {
      entity: "canteen",
      entityId: c.id,
      meta: b,
    });
    const { qrSecret, ...rest } = c;
    res.json(rest);
  }),
);

/** Counter QR for today (print it or show it on a TV/tablet at the counter). */
canteensRouter.get(
  "/:id/daily-qr",
  ah(async (req, res) => {
    assertCanteenAccess(req, req.params.id);
    const c = await db.query.canteens.findFirst({
      where: and(
        eq(schema.canteens.id, req.params.id),
        eq(schema.canteens.tenantId, req.auth!.tenantId!),
      ),
    });
    if (!c) throw notFound();
    const date = localDate(req.tenantCtx!.tenant.timezone);
    res.json({
      canteen: { id: c.id, name: c.name },
      date,
      code: counterQr(c.id, c.qrSecret, date),
    });
  }),
);

/* ---------------- meal sessions ---------------- */
const sessionSchema = z.object({
  name: z.string().min(2),
  startTime: hhmm,
  endTime: hhmm,
  optInCutoff: hhmm.nullish(),
  employeePrice: z.coerce.number().min(0),
  companySubsidy: z.coerce.number().min(0),
  guestPrice: z.coerce.number().min(0),
  mealsPerDay: z.coerce.number().int().min(1).max(5).default(1),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

async function ownCanteen(tenantId: string, canteenId: string) {
  const c = await db.query.canteens.findFirst({
    where: and(
      eq(schema.canteens.id, canteenId),
      eq(schema.canteens.tenantId, tenantId),
    ),
  });
  if (!c) throw notFound("Canteen not found");
  return c;
}

canteensRouter.post(
  "/:id/sessions",
  ah(async (req, res) => {
    if (!["OWNER", "MANAGER"].includes(req.auth!.role!)) throw forbidden();
    assertCanteenAccess(req, req.params.id);
    await ownCanteen(req.auth!.tenantId!, req.params.id);
    const b = parse(sessionSchema, req.body);
    const [s] = await db
      .insert(schema.mealSessions)
      .values({ ...b, canteenId: req.params.id })
      .returning();
    res.status(201).json(s);
  }),
);

canteensRouter.patch(
  "/:id/sessions/:sid",
  ah(async (req, res) => {
    if (!["OWNER", "MANAGER"].includes(req.auth!.role!)) throw forbidden();
    assertCanteenAccess(req, req.params.id);
    await ownCanteen(req.auth!.tenantId!, req.params.id);
    const b = parse(sessionSchema.partial(), req.body);
    const [s] = await db
      .update(schema.mealSessions)
      .set(b)
      .where(
        and(
          eq(schema.mealSessions.id, req.params.sid),
          eq(schema.mealSessions.canteenId, req.params.id),
        ),
      )
      .returning();
    if (!s) throw notFound();
    res.json(s);
  }),
);

canteensRouter.delete(
  "/:id/sessions/:sid",
  ah(async (req, res) => {
    if (!["OWNER", "MANAGER"].includes(req.auth!.role!)) throw forbidden();
    assertCanteenAccess(req, req.params.id);
    await ownCanteen(req.auth!.tenantId!, req.params.id);
    // soft-disable to preserve historical orders
    await db
      .update(schema.mealSessions)
      .set({ isActive: false })
      .where(
        and(
          eq(schema.mealSessions.id, req.params.sid),
          eq(schema.mealSessions.canteenId, req.params.id),
        ),
      );
    res.json({ ok: true });
  }),
);
