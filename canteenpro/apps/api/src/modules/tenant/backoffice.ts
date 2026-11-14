import { Router } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db";
import {
  ah,
  forbidden,
  notFound,
  pageParams,
  parse,
  badRequest,
} from "../../lib/http";
import { allowedCanteens, assertCanteenAccess } from "../../middleware/auth";
import { crud } from "./crud";
import { localDate, monthRange } from "../../lib/time";
import { randomToken, sha256 } from "../../lib/crypto";
import { sendPush, empExternalId } from "../../lib/push";
import { audit } from "../../lib/audit";

const managers = ["OWNER", "MANAGER"];

/* ---------------- departments ---------------- */
export const departmentsRouter = crud({
  name: "department",
  table: schema.departments,
  schema: z.object({
    name: z.string().min(1).max(80),
    costCenter: z.string().max(40).nullish(),
  }),
  search: [schema.departments.name],
  orderBy: schema.departments.name,
  orderDir: "asc",
  writeRoles: managers,
});

/* ---------------- expenses ---------------- */
export const expensesRouter = crud({
  name: "expense",
  table: schema.expenses,
  schema: z.object({
    canteenId: z.string().nullish(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category: z.string().min(1).max(60),
    amount: z.coerce.number().positive(),
    paidTo: z.string().max(120).nullish(),
    note: z.string().max(300).nullish(),
  }),
  search: [schema.expenses.category, schema.expenses.paidTo],
  filters: { category: schema.expenses.category },
  dateColumn: schema.expenses.date,
  orderBy: schema.expenses.date,
  writeRoles: managers,
});

/* ---------------- food waste ---------------- */
export const wasteRouter = crud({
  name: "waste",
  table: schema.wasteLogs,
  schema: z.object({
    canteenId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mealSessionId: z.string().nullish(),
    preparedQtyKg: z.coerce.number().min(0).nullish(),
    wastedQtyKg: z.coerce.number().min(0),
    reason: z.string().max(80).nullish(),
    note: z.string().max(300).nullish(),
  }),
  dateColumn: schema.wasteLogs.date,
  orderBy: schema.wasteLogs.date,
  writeRoles: ["OWNER", "MANAGER", "KITCHEN"],
});

/* ---------------- canteen workers + attendance ---------------- */
export const workersRouter = Router();
workersRouter.use(
  "/staff",
  crud({
    name: "worker",
    table: schema.canteenWorkers,
    schema: z.object({
      canteenId: z.string(),
      name: z.string().min(1),
      phone: z.string().nullish(),
      role: z.string().min(1).max(40),
      dailyWage: z.coerce.number().min(0).default(0),
      biometricId: z.string().nullish(),
      isActive: z.boolean().default(true),
    }),
    search: [schema.canteenWorkers.name, schema.canteenWorkers.role],
    filters: { isActive: schema.canteenWorkers.isActive },
    orderBy: schema.canteenWorkers.name,
    orderDir: "asc",
    writeRoles: managers,
  }),
);

workersRouter.get(
  "/attendance",
  ah(async (req, res) => {
    const canteenId = String(req.query.canteenId ?? "");
    if (!canteenId) throw badRequest("canteenId required");
    assertCanteenAccess(req, canteenId);
    const date = String(
      req.query.date ?? localDate(req.tenantCtx!.tenant.timezone),
    );
    const W = schema.canteenWorkers;
    const rows = await db
      .select({
        workerId: W.id,
        name: W.name,
        role: W.role,
        status: schema.workerAttendance.status,
        checkIn: schema.workerAttendance.checkIn,
        checkOut: schema.workerAttendance.checkOut,
        note: schema.workerAttendance.note,
      })
      .from(W)
      .leftJoin(
        schema.workerAttendance,
        and(
          eq(schema.workerAttendance.workerId, W.id),
          eq(schema.workerAttendance.date, date),
        ),
      )
      .where(
        and(
          eq(W.tenantId, req.auth!.tenantId!),
          eq(W.canteenId, canteenId),
          eq(W.isActive, true),
        ),
      )
      .orderBy(asc(W.name));
    res.json({ date, rows });
  }),
);

workersRouter.put(
  "/attendance",
  ah(async (req, res) => {
    if (!managers.includes(req.auth!.role!)) throw forbidden();
    const b = parse(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        entries: z.array(
          z.object({
            workerId: z.string(),
            status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE"]),
            checkIn: z.coerce.date().nullish(),
            checkOut: z.coerce.date().nullish(),
            note: z.string().nullish(),
          }),
        ),
      }),
      req.body,
    );
    const ids = b.entries.map((e) => e.workerId);
    const valid = await db
      .select({ id: schema.canteenWorkers.id })
      .from(schema.canteenWorkers)
      .where(
        and(
          inArray(schema.canteenWorkers.id, ids),
          eq(schema.canteenWorkers.tenantId, req.auth!.tenantId!),
        ),
      );
    const ok = new Set(valid.map((v) => v.id));
    for (const e of b.entries.filter((x) => ok.has(x.workerId))) {
      await db
        .insert(schema.workerAttendance)
        .values({ ...e, tenantId: req.auth!.tenantId!, date: b.date })
        .onConflictDoUpdate({
          target: [
            schema.workerAttendance.workerId,
            schema.workerAttendance.date,
          ],
          set: {
            status: e.status,
            checkIn: e.checkIn,
            checkOut: e.checkOut,
            note: e.note,
          },
        });
    }
    res.json({ saved: ok.size });
  }),
);

/** Monthly attendance + wages summary */
workersRouter.get(
  "/attendance/summary",
  ah(async (req, res) => {
    const month = String(
      req.query.month ?? localDate(req.tenantCtx!.tenant.timezone).slice(0, 7),
    );
    const { from, to } = monthRange(month);
    const W = schema.canteenWorkers;
    const A = schema.workerAttendance;
    const conds = [eq(W.tenantId, req.auth!.tenantId!)];
    if (req.query.canteenId)
      conds.push(eq(W.canteenId, String(req.query.canteenId)));
    const rows = await db
      .select({
        workerId: W.id,
        name: W.name,
        role: W.role,
        dailyWage: W.dailyWage,
        present: sql<number>`count(*) filter (where ${A.status}='PRESENT')::int`,
        halfDay: sql<number>`count(*) filter (where ${A.status}='HALF_DAY')::int`,
        absent: sql<number>`count(*) filter (where ${A.status}='ABSENT')::int`,
        leave: sql<number>`count(*) filter (where ${A.status}='LEAVE')::int`,
      })
      .from(W)
      .leftJoin(
        A,
        and(eq(A.workerId, W.id), sql`${A.date} between ${from} and ${to}`),
      )
      .where(and(...conds))
      .groupBy(W.id)
      .orderBy(asc(W.name));
    res.json({
      month,
      rows: rows.map((r) => ({
        ...r,
        payableDays: r.present + r.halfDay / 2,
        wages: Math.round((r.present + r.halfDay / 2) * r.dailyWage),
      })),
    });
  }),
);

/* ---------------- feedback ---------------- */
export const feedbackRouter = Router();
feedbackRouter.get(
  "/",
  ah(async (req, res) => {
    const { pageSize, offset } = pageParams(req.query);
    const allowed = allowedCanteens(req);
    const conds = [eq(schema.feedback.tenantId, req.auth!.tenantId!)];
    if (req.query.canteenId)
      conds.push(eq(schema.feedback.canteenId, String(req.query.canteenId)));
    else if (allowed) conds.push(inArray(schema.feedback.canteenId, allowed));
    if (req.query.maxRating)
      conds.push(
        sql`${schema.feedback.rating} <= ${Number(req.query.maxRating)}`,
      );
    const rows = await db.query.feedback.findMany({
      where: and(...conds),
      with: {
        employee: { columns: { name: true, employeeCode: true } },
        menuItem: { columns: { name: true } },
      },
      orderBy: desc(schema.feedback.createdAt),
      limit: pageSize,
      offset,
    });
    const [agg] = await db
      .select({
        avg: sql<number>`coalesce(avg(${schema.feedback.rating}),0)::float`,
        total: sql<number>`count(*)::int`,
      })
      .from(schema.feedback)
      .where(and(...conds));
    res.json({ items: rows, ...agg });
  }),
);
feedbackRouter.post(
  "/:id/reply",
  ah(async (req, res) => {
    const { reply } = parse(
      z.object({ reply: z.string().min(1).max(500) }),
      req.body,
    );
    const [f] = await db
      .update(schema.feedback)
      .set({ reply })
      .where(
        and(
          eq(schema.feedback.id, req.params.id),
          eq(schema.feedback.tenantId, req.auth!.tenantId!),
        ),
      )
      .returning();
    if (!f) throw notFound();
    if (f.employeeId)
      sendPush({
        title: "Canteen replied to your feedback",
        body: reply,
        externalIds: [empExternalId(f.employeeId)],
      });
    res.json(f);
  }),
);

/* ---------------- devices (biometric / kiosk) ---------------- */


export const devicesRouter = Router();
devicesRouter.get(
  "/",
  ah(async (req, res) => {
    const rows = await db
      .select({
        id: schema.devices.id,
        name: schema.devices.name,
        type: schema.devices.type,
        keyPrefix: schema.devices.keyPrefix,
        lastSeenAt: schema.devices.lastSeenAt,
        isActive: schema.devices.isActive,
        canteenId: schema.devices.canteenId,
        canteen: schema.canteens.name,
        createdAt: schema.devices.createdAt,
      })
      .from(schema.devices)
      .innerJoin(
        schema.canteens,
        eq(schema.canteens.id, schema.devices.canteenId),
      )
      .where(eq(schema.devices.tenantId, req.auth!.tenantId!));
    res.json(rows);
  }),
);
devicesRouter.post(
  "/",
  ah(async (req, res) => {
    if (!managers.includes(req.auth!.role!)) throw forbidden();
    if (req.tenantCtx!.plan?.features?.biometric === false)
      throw forbidden("Device integration is not included in your plan");
    const b = parse(
      z.object({
        canteenId: z.string(),
        name: z.string().min(1),
        type: z.enum(["BIOMETRIC", "KIOSK", "POS_TERMINAL", "QR_SCANNER"]),
      }),
      req.body,
    );
    assertCanteenAccess(req, b.canteenId);
    const key = "cpd_" + randomToken(24);
    const [d] = await db
      .insert(schema.devices)
      .values({
        ...b,
        tenantId: req.auth!.tenantId!,
        apiKeyHash: sha256(key),
        keyPrefix: key.slice(0, 10),
      })
      .returning();
    audit(req, "device.create", { entity: "device", entityId: d.id });
    res.status(201).json({
      id: d.id,
      name: d.name,
      apiKey: key,
      note: "Copy this key now — it will not be shown again.",
    });
  }),
);
devicesRouter.patch(
  "/:id",
  ah(async (req, res) => {
    if (!managers.includes(req.auth!.role!)) throw forbidden();
    const b = parse(
      z.object({
        name: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
      req.body,
    );
    const [d] = await db
      .update(schema.devices)
      .set(b)
      .where(
        and(
          eq(schema.devices.id, req.params.id),
          eq(schema.devices.tenantId, req.auth!.tenantId!),
        ),
      )
      .returning({ id: schema.devices.id });
    if (!d) throw notFound();
    res.json({ ok: true });
  }),
);
devicesRouter.delete(
  "/:id",
  ah(async (req, res) => {
    if (!managers.includes(req.auth!.role!)) throw forbidden();
    await db
      .delete(schema.devices)
      .where(
        and(
          eq(schema.devices.id, req.params.id),
          eq(schema.devices.tenantId, req.auth!.tenantId!),
        ),
      );
    res.json({ ok: true });
  }),
);

/* ---------------- announcements / push to employees ---------------- */
export const notificationsRouter = Router();
notificationsRouter.get(
  "/",
  ah(async (req, res) => {
    const rows = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.tenantId, req.auth!.tenantId!))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(100);
    res.json(rows);
  }),
);
notificationsRouter.post(
  "/",
  ah(async (req, res) => {
    if (!managers.includes(req.auth!.role!)) throw forbidden();
    const b = parse(
      z.object({
        audience: z.enum([
          "ALL_EMPLOYEES",
          "CANTEEN",
          "DEPARTMENT",
          "EMPLOYEE",
        ]),
        canteenId: z.string().nullish(),
        targetId: z.string().nullish(),
        title: z.string().min(2).max(80),
        body: z.string().min(2).max(400),
        type: z
          .enum(["MENU", "REMINDER", "SYSTEM", "WALLET", "GENERAL"])
          .default("GENERAL"),
      }),
      req.body,
    );
    if (b.canteenId) assertCanteenAccess(req, b.canteenId);
    const tenantId = req.auth!.tenantId!;
    let pushStatus: string;
    if (b.audience === "EMPLOYEE" && b.targetId) {
      pushStatus = await sendPush({
        title: b.title,
        body: b.body,
        externalIds: [empExternalId(b.targetId)],
        data: { type: b.type },
      });
    } else if (b.audience === "DEPARTMENT" && b.targetId) {
      const ids = await db
        .select({ id: schema.employees.id })
        .from(schema.employees)
        .where(
          and(
            eq(schema.employees.tenantId, tenantId),
            eq(schema.employees.departmentId, b.targetId),
            eq(schema.employees.status, "ACTIVE"),
          ),
        );
      pushStatus = await sendPush({
        title: b.title,
        body: b.body,
        externalIds: ids.map((i) => empExternalId(i.id)),
        data: { type: b.type },
      });
    } else if (b.audience === "CANTEEN" && b.canteenId) {
      pushStatus = await sendPush({
        title: b.title,
        body: b.body,
        filters: [
          { field: "tag", key: "canteenId", relation: "=", value: b.canteenId },
        ],
        data: { type: b.type },
      });
    } else {
      pushStatus = await sendPush({
        title: b.title,
        body: b.body,
        filters: [
          { field: "tag", key: "tenantId", relation: "=", value: tenantId },
        ],
        data: { type: b.type },
      });
    }
    const [n] = await db
      .insert(schema.notifications)
      .values({ ...b, tenantId, pushStatus, sentById: req.auth!.id })
      .returning();
    res.status(201).json(n);
  }),
);

/* ---------------- workspace profile + audit log ---------------- */
export const workspaceRouter = Router();
workspaceRouter.get(
  "/",
  ah(async (req, res) => res.json(req.tenantCtx!.tenant)),
);
workspaceRouter.patch(
  "/",
  ah(async (req, res) => {
    if (req.auth!.role !== "OWNER") throw forbidden();
    const b = parse(
      z.object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        phone: z.string().nullish(),
        gstin: z.string().nullish(),
        address: z.string().nullish(),
        city: z.string().nullish(),
        state: z.string().nullish(),
        logoUrl: z
          .string()
          .url()
          .nullish()
          .or(z.literal("").transform(() => null)),
        timezone: z.string().optional(),
      }),
      req.body,
    );
    const [t] = await db
      .update(schema.tenants)
      .set(b)
      .where(eq(schema.tenants.id, req.auth!.tenantId!))
      .returning();
    audit(req, "workspace.update", { meta: b });
    res.json(t);
  }),
);
workspaceRouter.get(
  "/audit-logs",
  ah(async (req, res) => {
    if (!managers.includes(req.auth!.role!)) throw forbidden();
    const { pageSize, offset } = pageParams(req.query);
    const rows = await db
      .select({
        id: schema.auditLogs.id,
        action: schema.auditLogs.action,
        entity: schema.auditLogs.entity,
        entityId: schema.auditLogs.entityId,
        meta: schema.auditLogs.meta,
        actorType: schema.auditLogs.actorType,
        actor: schema.staffUsers.name,
        ip: schema.auditLogs.ip,
        createdAt: schema.auditLogs.createdAt,
      })
      .from(schema.auditLogs)
      .leftJoin(
        schema.staffUsers,
        eq(schema.staffUsers.id, schema.auditLogs.actorId),
      )
      .where(eq(schema.auditLogs.tenantId, req.auth!.tenantId!))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(pageSize)
      .offset(offset);
    res.json(rows);
  }),
);
