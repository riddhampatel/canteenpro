import { Router } from "express";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db";
import {
  ah,
  badRequest,
  forbidden,
  notFound,
  pageParams,
  parse,
} from "../../lib/http";
import { allowedCanteens, assertCanteenAccess } from "../../middleware/auth";
import { cancelOrder, createOrder } from "../../services/orders";
import { parseEmployeeQr } from "../../services/qr";
import { localDate } from "../../lib/time";
import { sendCsv } from "../../lib/csv";
import { audit } from "../../lib/audit";

export const ordersRouter = Router();
const O = schema.orders;
const payModes = [
  "WALLET",
  "PAYROLL",
  "COMPANY",
  "CASH",
  "UPI",
  "CARD",
  "COMPLIMENTARY",
] as const;

/** Find an employee by QR payload, employee code, RFID, biometric id or phone. */
export async function findEmployeeByCode(tenantId: string, code: string) {
  const c = code.trim();
  const token = parseEmployeeQr(c);
  const E = schema.employees;
  const where = token
    ? eq(E.qrToken, token)
    : or(
        eq(E.employeeCode, c.toUpperCase()),
        eq(E.rfidCard, c),
        eq(E.biometricId, c),
        eq(E.phone, c.replace(/\D/g, "").slice(-10)),
      );
  return db.query.employees.findFirst({
    where: and(eq(E.tenantId, tenantId), where),
    with: { department: true },
  });
}

const orderSchema = z.object({
  canteenId: z.string(),
  consumerType: z.enum(["EMPLOYEE", "GUEST", "WALK_IN"]),
  employeeId: z.string().optional(),
  guestId: z.string().optional(),
  walkInName: z.string().max(80).optional(),
  mealSessionId: z.string().nullish(),
  items: z
    .array(
      z.object({
        menuItemId: z.string(),
        quantity: z.coerce.number().int().min(1).max(100),
      }),
    )
    .default([]),
  paymentMode: z.enum(payModes).optional(),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().max(300).optional(),
  override: z.boolean().default(false),
});

ordersRouter.post(
  "/",
  ah(async (req, res) => {
    const b = parse(orderSchema, req.body);
    assertCanteenAccess(req, b.canteenId);
    if (b.override && !["OWNER", "MANAGER"].includes(req.auth!.role!))
      throw forbidden("Only managers can override meal rules");
    if (b.discount > 0 && !["OWNER", "MANAGER"].includes(req.auth!.role!))
      throw forbidden("Only managers can give discounts");
    const consumer =
      b.consumerType === "EMPLOYEE"
        ? { type: "EMPLOYEE" as const, employeeId: b.employeeId ?? "" }
        : b.consumerType === "GUEST"
          ? { type: "GUEST" as const, guestId: b.guestId ?? "" }
          : { type: "WALK_IN" as const, name: b.walkInName };
    if (consumer.type === "EMPLOYEE" && !consumer.employeeId)
      throw badRequest("employeeId required");
    if (consumer.type === "GUEST" && !consumer.guestId)
      throw badRequest("guestId required");
    const order = await createOrder({
      tenantId: req.auth!.tenantId!,
      timezone: req.tenantCtx!.tenant.timezone,
      canteenId: b.canteenId,
      consumer,
      mealSessionId: b.mealSessionId,
      items: b.items,
      paymentMode: b.paymentMode,
      discount: b.discount,
      channel: "POS",
      servedById: req.auth!.id,
      notes: b.notes,
      override: b.override,
    });
    res.status(201).json(order);
  }),
);

/** Quick-serve a fixed meal by scanning employee QR / typing code (counter & manager app). */
ordersRouter.post(
  "/serve",
  ah(async (req, res) => {
    const b = parse(
      z.object({
        canteenId: z.string(),
        code: z.string().min(1),
        mealSessionId: z.string().nullish(),
        paymentMode: z.enum(payModes).optional(),
        override: z.boolean().default(false),
      }),
      req.body,
    );
    assertCanteenAccess(req, b.canteenId);
    if (b.override && !["OWNER", "MANAGER"].includes(req.auth!.role!))
      throw forbidden("Only managers can override meal rules");
    const emp = await findEmployeeByCode(req.auth!.tenantId!, b.code);
    if (!emp) throw notFound("No employee found for this QR / code");
    const order = await createOrder({
      tenantId: req.auth!.tenantId!,
      timezone: req.tenantCtx!.tenant.timezone,
      canteenId: b.canteenId,
      consumer: { type: "EMPLOYEE", employeeId: emp.id },
      mealSessionId: b.mealSessionId,
      paymentMode: b.paymentMode,
      channel: parseEmployeeQr(b.code) ? "EMPLOYEE_QR" : "POS",
      servedById: req.auth!.id,
      override: b.override,
    });
    res
      .status(201)
      .json({ ...order, department: emp.department?.name ?? null });
  }),
);

/** Employee lookup for POS customer picker */
ordersRouter.get(
  "/lookup",
  ah(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json([]);
    const E = schema.employees;
    const exact = await findEmployeeByCode(req.auth!.tenantId!, q);
    const rows = await db
      .select({
        id: E.id,
        name: E.name,
        employeeCode: E.employeeCode,
        walletBalance: E.walletBalance,
        defaultPayMode: E.defaultPayMode,
        status: E.status,
        photoUrl: E.photoUrl,
        department: schema.departments.name,
      })
      .from(E)
      .leftJoin(schema.departments, eq(schema.departments.id, E.departmentId))
      .where(
        and(
          eq(E.tenantId, req.auth!.tenantId!),
          or(
            ilike(E.name, `%${q}%`),
            ilike(E.employeeCode, `%${q}%`),
            ilike(E.phone, `%${q}%`),
          ),
        ),
      )
      .limit(10);
    if (exact && !rows.find((r) => r.id === exact.id)) {
      rows.unshift({
        id: exact.id,
        name: exact.name,
        employeeCode: exact.employeeCode,
        walletBalance: exact.walletBalance,
        defaultPayMode: exact.defaultPayMode,
        status: exact.status,
        photoUrl: exact.photoUrl,
        department: exact.department?.name ?? null,
      });
    }
    res.json(rows);
  }),
);

function listConds(req: any) {
  const conds = [eq(O.tenantId, req.auth!.tenantId!)];
  const allowed = allowedCanteens(req);
  if (req.query.canteenId)
    conds.push(eq(O.canteenId, String(req.query.canteenId)));
  else if (allowed) conds.push(inArray(O.canteenId, allowed));
  const tz = req.tenantCtx!.tenant.timezone;
  const from = String(req.query.from ?? localDate(tz));
  const to = String(req.query.to ?? from);
  conds.push(sql`${O.businessDate} between ${from} and ${to}`);
  for (const k of [
    "mealSessionId",
    "consumerType",
    "paymentMode",
    "status",
    "employeeId",
    "channel",
  ] as const) {
    if (req.query[k]) conds.push(eq((O as any)[k], String(req.query[k])));
  }
  const q = String(req.query.q ?? "").trim();
  if (q)
    conds.push(
      or(
        ilike(O.billNo, `%${q}%`),
        ilike(schema.employees.name, `%${q}%`),
        ilike(schema.employees.employeeCode, `%${q}%`),
        ilike(schema.guests.name, `%${q}%`),
      )!,
    );
  return and(...conds);
}

const listSelect = {
  id: O.id,
  billNo: O.billNo,
  createdAt: O.createdAt,
  businessDate: O.businessDate,
  consumerType: O.consumerType,
  employeeId: O.employeeId,
  employeeName: schema.employees.name,
  employeeCode: schema.employees.employeeCode,
  department: schema.departments.name,
  guestName: schema.guests.name,
  walkInName: O.walkInName,
  session: schema.mealSessions.name,
  mealSessionId: O.mealSessionId,
  channel: O.channel,
  paymentMode: O.paymentMode,
  isFixedMeal: O.isFixedMeal,
  subtotal: O.subtotal,
  discount: O.discount,
  subsidyAmount: O.subsidyAmount,
  taxAmount: O.taxAmount,
  total: O.total,
  status: O.status,
  canteenId: O.canteenId,
  servedBy: schema.staffUsers.name,
};
const listQuery = (where: any) =>
  db
    .select(listSelect)
    .from(O)
    .leftJoin(schema.employees, eq(schema.employees.id, O.employeeId))
    .leftJoin(
      schema.departments,
      eq(schema.departments.id, schema.employees.departmentId),
    )
    .leftJoin(schema.guests, eq(schema.guests.id, O.guestId))
    .leftJoin(schema.mealSessions, eq(schema.mealSessions.id, O.mealSessionId))
    .leftJoin(schema.staffUsers, eq(schema.staffUsers.id, O.servedById))
    .where(where)
    .orderBy(desc(O.createdAt));

ordersRouter.get(
  "/",
  ah(async (req, res) => {
    const where = listConds(req);
    if (req.query.format === "csv") {
      const rows = await listQuery(where).limit(100_000);
      return sendCsv(
        res,
        "transactions.csv",
        rows.map((r) => ({
          ...r,
          consumer: r.employeeName ?? r.guestName ?? r.walkInName,
          createdAt: new Date(r.createdAt).toLocaleString("en-IN", {
            timeZone: req.tenantCtx!.tenant.timezone,
          }),
        })),
        [
          { key: "billNo", label: "Bill No" },
          { key: "createdAt", label: "Date & Time" },
          { key: "consumerType", label: "Type" },
          { key: "employeeCode", label: "Emp Code" },
          { key: "consumer", label: "Name" },
          { key: "department", label: "Department" },
          { key: "session", label: "Meal" },
          { key: "paymentMode", label: "Payment" },
          { key: "subtotal", label: "Subtotal" },
          { key: "discount", label: "Discount" },
          { key: "subsidyAmount", label: "Company Subsidy" },
          { key: "total", label: "Collected" },
          { key: "taxAmount", label: "GST (incl.)" },
          { key: "status", label: "Status" },
          { key: "channel", label: "Channel" },
        ],
      );
    }
    const { page, pageSize, offset } = pageParams(req.query);
    const [items, [agg]] = await Promise.all([
      listQuery(where).limit(pageSize).offset(offset),
      db
        .select({
          count: sql<number>`count(*)::int`,
          meals: sql<number>`count(*) filter (where ${O.status}='COMPLETED')::int`,
          total: sql<number>`coalesce(sum(${O.total}) filter (where ${O.status}='COMPLETED'),0)::float`,
          subsidy: sql<number>`coalesce(sum(${O.subsidyAmount}) filter (where ${O.status}='COMPLETED'),0)::float`,
          consumers: sql<number>`count(distinct ${O.employeeId})::int`,
        })
        .from(O)
        .leftJoin(schema.employees, eq(schema.employees.id, O.employeeId))
        .leftJoin(schema.guests, eq(schema.guests.id, O.guestId))
        .where(where),
    ]);
    res.json({ items, total: agg.count, page, pageSize, summary: agg });
  }),
);

/** Live counter feed: latest serves today + per-session counts */
ordersRouter.get(
  "/live",
  ah(async (req, res) => {
    const canteenId = String(req.query.canteenId ?? "");
    if (!canteenId) throw badRequest("canteenId required");
    assertCanteenAccess(req, canteenId);
    const today = localDate(req.tenantCtx!.tenant.timezone);
    const where = and(
      eq(O.tenantId, req.auth!.tenantId!),
      eq(O.canteenId, canteenId),
      eq(O.businessDate, today),
      eq(O.status, "COMPLETED"),
    );
    const [recent, bySession] = await Promise.all([
      listQuery(where).limit(Number(req.query.limit) || 30),
      db
        .select({
          sessionId: O.mealSessionId,
          session: schema.mealSessions.name,
          count: sql<number>`count(*)::int`,
          amount: sql<number>`coalesce(sum(${O.total}),0)::float`,
        })
        .from(O)
        .leftJoin(
          schema.mealSessions,
          eq(schema.mealSessions.id, O.mealSessionId),
        )
        .where(where)
        .groupBy(O.mealSessionId, schema.mealSessions.name),
    ]);
    res.json({ date: today, recent, bySession });
  }),
);

ordersRouter.get(
  "/:id",
  ah(async (req, res) => {
    const o = await db.query.orders.findFirst({
      where: and(eq(O.id, req.params.id), eq(O.tenantId, req.auth!.tenantId!)),
      with: {
        items: true,
        employee: {
          columns: {
            id: true,
            name: true,
            employeeCode: true,
            walletBalance: true,
          },
        },
        guest: true,
        session: true,
        canteen: {
          columns: {
            id: true,
            name: true,
            address: true,
            clientCompany: true,
            gstPercent: true,
            phone: true,
          },
        },
        servedBy: { columns: { name: true } },
      },
    });
    if (!o) throw notFound();
    assertCanteenAccess(req, o.canteenId);
    res.json(o);
  }),
);

ordersRouter.post(
  "/:id/cancel",
  ah(async (req, res) => {
    if (!["OWNER", "MANAGER"].includes(req.auth!.role!))
      throw forbidden("Only managers can cancel bills");
    const { reason } = parse(
      z.object({ reason: z.string().min(3).max(200) }),
      req.body,
    );
    const o = await cancelOrder(
      req.auth!.tenantId!,
      req.params.id,
      reason,
      req.auth!.id,
    );
    audit(req, "order.cancel", {
      entity: "order",
      entityId: o.id,
      meta: { reason, billNo: o.billNo, total: o.total },
    });
    res.json(o);
  }),
);
