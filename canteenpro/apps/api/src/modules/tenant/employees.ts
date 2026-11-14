import { Router } from "express";
import bcrypt from "bcryptjs";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db";
import {
  ah,
  badRequest,
  notFound,
  pageParams,
  parse,
  forbidden,
} from "../../lib/http";
import { allowedCanteens, assertCanteenAccess } from "../../middleware/auth";
import { assertLimit } from "../../services/billing";
import { randomPin } from "../../lib/crypto";
import { walletMove } from "../../services/orders";
import { employeeQr } from "../../services/qr";
import { sendCsv } from "../../lib/csv";
import { audit } from "../../lib/audit";
import { localDate } from "../../lib/time";
import { sendPush, empExternalId } from "../../lib/push";

export const employeesRouter = Router();
const E = schema.employees; // Creates a shortcut for the employees database table.
const normalizePhone = (p?: string | null) =>
  // Defines a function to normalize phone numbers.
  p ? p.replace(/\D/g, "").slice(-10) : p;

const empSchema = z.object({
  canteenId: z.string(),
  departmentId: z.string().nullish(),
  employeeCode: z
    .string()
    .min(1)
    .max(30)
    .transform((s) => s.trim().toUpperCase()),
  name: z.string().min(1).max(120),
  phone: z.string().min(8).max(20).nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  designation: z.string().nullish(),
  photoUrl: z.string().url().nullish().or(z.literal("")),
  dietaryPref: z.enum(["VEG", "NON_VEG", "EGG", "VEGAN", "JAIN"]).optional(),
  allergies: z.string().nullish(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  monthlyAllowance: z.coerce.number().min(0).optional(),
  defaultPayMode: z
    .enum([
      "WALLET",
      "PAYROLL",
      "COMPANY",
      "CASH",
      "UPI",
      "CARD",
      "COMPLIMENTARY",
    ])
    .optional(),
  biometricId: z.string().nullish(),
  biometricSynced: z.boolean().optional(),
  rfidCard: z.string().nullish(),
  joinedAt: z.string().nullish(),
  pin: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
});

function scope(req: any) {
  const conds = [eq(E.tenantId, req.auth!.tenantId!)];
  const allowed = allowedCanteens(req);
  if (req.query.canteenId)
    conds.push(eq(E.canteenId, String(req.query.canteenId)));
  else if (allowed) conds.push(inArray(E.canteenId, allowed));
  return conds;
}

employeesRouter.get(
  "/",
  ah(async (req, res) => {
    const { page, pageSize, offset } = pageParams(req.query);
    const conds = scope(req);
    const q = String(req.query.q ?? "").trim();
    if (q)
      conds.push(
        or(
          ilike(E.name, `%${q}%`),
          ilike(E.employeeCode, `%${q}%`),
          ilike(E.phone, `%${q}%`),
          ilike(schema.departments.name, `%${q}%`),
        )!,
      );
    if (req.query.status) conds.push(eq(E.status, req.query.status as any));
    if (req.query.departmentId)
      conds.push(eq(E.departmentId, String(req.query.departmentId)));
    if (req.query.biometric === "pending")
      conds.push(eq(E.biometricSynced, false));
    const where = and(...conds);
    const base = db
      .select({
        id: E.id,
        employeeCode: E.employeeCode,
        name: E.name,
        phone: E.phone,
        email: E.email,
        designation: E.designation,
        status: E.status,
        walletBalance: E.walletBalance,
        monthlyAllowance: E.monthlyAllowance,
        defaultPayMode: E.defaultPayMode,
        dietaryPref: E.dietaryPref,
        biometricSynced: E.biometricSynced,
        biometricId: E.biometricId,
        photoUrl: E.photoUrl,
        canteenId: E.canteenId,
        departmentId: E.departmentId,
        department: schema.departments.name,
        canteen: schema.canteens.name,
        hasPin: sql<boolean>`${E.pinHash} is not null`,
        createdAt: E.createdAt,
      })
      .from(E)
      .leftJoin(schema.departments, eq(schema.departments.id, E.departmentId))
      .innerJoin(schema.canteens, eq(schema.canteens.id, E.canteenId))
      .where(where)
      .orderBy(asc(E.employeeCode));
    if (req.query.format === "csv")
      return sendCsv(res, "employees.csv", (await base) as any);
    const [items, [{ c }]] = await Promise.all([
      base.limit(pageSize).offset(offset),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(E)
        .leftJoin(schema.departments, eq(schema.departments.id, E.departmentId))
        .where(where),
    ]);
    res.json({ items, total: c, page, pageSize });
  }),
);

employeesRouter.get(
  "/:id",
  ah(async (req, res) => {
    const e = await db.query.employees.findFirst({
      where: and(eq(E.id, req.params.id), ...scope(req)),
      with: {
        department: true,
        canteen: { columns: { id: true, name: true } },
      },
    });
    if (!e) throw notFound();
    const month = localDate(req.tenantCtx!.tenant.timezone).slice(0, 7);
    const [stats] = await db
      .select({
        mealsThisMonth: sql<number>`count(*) filter (where ${schema.orders.businessDate} >= ${month + "-01"})::int`,
        spentThisMonth: sql<number>`coalesce(sum(${schema.orders.total}) filter (where ${schema.orders.businessDate} >= ${month + "-01"}),0)::float`,
        lifetimeMeals: sql<number>`count(*)::int`,
        lastMealAt: sql<string>`max(${schema.orders.createdAt})`,
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.employeeId, e.id),
          eq(schema.orders.status, "COMPLETED"),
        ),
      );
    const { pinHash, ...rest } = e;
    res.json({ ...rest, hasPin: !!pinHash, qr: employeeQr(e.qrToken), stats });
  }),
);

//register new employee
employeesRouter.post(
  "/",
  ah(async (req, res) => {
    const b = parse(empSchema, req.body);
    assertCanteenAccess(req, b.canteenId);
    await assertLimit(req.tenantCtx!, "employees");
    const pin = b.pin ?? randomPin();
    const { pin: _p, ...data } = b;
    const [e] = await db
      .insert(E)
      .values({
        ...data,
        email: data.email || null,
        photoUrl: data.photoUrl || null,
        phone: normalizePhone(data.phone),
        tenantId: req.auth!.tenantId!,
        pinHash: await bcrypt.hash(pin, 10),
      })
      .returning();
    audit(req, "employee.create", { entity: "employee", entityId: e.id });
    const { pinHash, ...rest } = e;
    res.status(201).json({ ...rest, initialPin: pin });
  }),
);

employeesRouter.patch(
  "/:id",
  ah(async (req, res) => {
    const b = parse(empSchema.partial(), req.body);
    if (b.canteenId) assertCanteenAccess(req, b.canteenId);
    const { pin, ...data } = b;
    const patch: Record<string, unknown> = { ...data };
    if (data.phone !== undefined) patch.phone = normalizePhone(data.phone);
    if (data.email === "") patch.email = null;
    if (data.photoUrl === "") patch.photoUrl = null;
    if (pin)
      Object.assign(patch, {
        pinHash: await bcrypt.hash(pin, 10),
        pinChangedAt: null,
      });

    const [e] = await db
      .update(E)
      .set(patch)
      .where(and(eq(E.id, req.params.id), ...scope(req)))
      .returning();
    if (!e) throw notFound();
    audit(req, "employee.update", { entity: "employee", entityId: e.id });
    const { pinHash, ...rest } = e;
    res.json(rest);
  }),
);

/** Soft delete → INACTIVE (keeps meal history intact) */
employeesRouter.delete(
  "/:id",
  ah(async (req, res) => {
    const [e] = await db
      .update(E)
      .set({ status: "INACTIVE" })
      .where(and(eq(E.id, req.params.id), ...scope(req)))
      .returning({ id: E.id });
    if (!e) throw notFound();
    audit(req, "employee.deactivate", { entity: "employee", entityId: e.id });
    res.json({ ok: true });
  }),
);

employeesRouter.post(
  "/:id/reset-pin",
  ah(async (req, res) => {
    const pin = randomPin();
    const [e] = await db
      .update(E)
      .set({ pinHash: await bcrypt.hash(pin, 10), pinChangedAt: null })
      .where(and(eq(E.id, req.params.id), ...scope(req)))
      .returning({ id: E.id });
    if (!e) throw notFound();
    audit(req, "employee.reset_pin", { entity: "employee", entityId: e.id });
    res.json({ pin });
  }),
);

/** Regenerate personal QR (if a QR screenshot was shared) */
employeesRouter.post(
  "/:id/rotate-qr",
  ah(async (req, res) => {
    const { createId } = await import("@paralleldrive/cuid2"); 
    const [e] = await db
      .update(E)
      .set({ qrToken: createId() })
      .where(and(eq(E.id, req.params.id), ...scope(req)))
      .returning();
    if (!e) throw notFound();
    res.json({ qr: employeeQr(e.qrToken) });
  }),
);

/** Bulk import from CSV/Excel (parsed in the browser). Upserts by employeeCode. */
employeesRouter.post(
  "/import",
  ah(async (req, res) => {
    const b = parse(
      z.object({
        canteenId: z.string(),
        rows: z
          .array(
            z.object({
              employeeCode: z.coerce.string().min(1),
              name: z.string().min(1),
              phone: z.coerce.string().optional(),
              email: z.string().optional(),
              department: z.string().optional(),
              designation: z.string().optional(),
              monthlyAllowance: z.coerce.number().optional(),
              defaultPayMode: z
                .enum([
                  "WALLET",
                  "PAYROLL",
                  "COMPANY",
                  "CASH",
                  "UPI",
                  "CARD",
                  "COMPLIMENTARY",
                ])
                .optional(),
              dietaryPref: z
                .enum(["VEG", "NON_VEG", "EGG", "VEGAN", "JAIN"])
                .optional(),
            }),
          )
          .min(1)
          .max(5000),
      }),
      req.body,
    );
    assertCanteenAccess(req, b.canteenId);
    const tenantId = req.auth!.tenantId!;
    const existing = await db
      .select({ code: E.employeeCode })
      .from(E)
      .where(eq(E.tenantId, tenantId));
    const existingCodes = new Set(existing.map((x) => x.code));
    const newCount = b.rows.filter(
      (r) => !existingCodes.has(r.employeeCode.trim().toUpperCase()),
    ).length;
    await assertLimit(req.tenantCtx!, "employees", newCount);

    // departments by name (create missing)
    const deptNames = [
      ...new Set(b.rows.map((r) => r.department?.trim()).filter(Boolean)),
    ] as string[];
    if (deptNames.length) {
      await db
        .insert(schema.departments)
        .values(deptNames.map((name) => ({ tenantId, name })))
        .onConflictDoNothing();
    }
    const depts = await db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.tenantId, tenantId));
    const deptId = (n?: string) =>
      depts.find((d) => d.name.toLowerCase() === n?.trim().toLowerCase())?.id ??
      null;

    const pins: { employeeCode: string; name: string; pin: string }[] = [];
    let created = 0,
      updated = 0;
    for (const r of b.rows) {
      const code = r.employeeCode.trim().toUpperCase();
      const values = {
        canteenId: b.canteenId,
        name: r.name.trim(),
        phone: normalizePhone(r.phone) || null,
        email: r.email || null,
        designation: r.designation || null,
        departmentId: deptId(r.department),
        ...(r.monthlyAllowance !== undefined
          ? { monthlyAllowance: r.monthlyAllowance }
          : {}),
        ...(r.defaultPayMode ? { defaultPayMode: r.defaultPayMode } : {}),
        ...(r.dietaryPref ? { dietaryPref: r.dietaryPref } : {}),
      };
      if (existingCodes.has(code)) {
        await db
          .update(E)
          .set(values)
          .where(and(eq(E.tenantId, tenantId), eq(E.employeeCode, code)));
        updated++;
      } else {
        const pin = randomPin();
        await db.insert(E).values({
          ...values,
          tenantId,
          employeeCode: code,
          pinHash: await bcrypt.hash(pin, 8),
        });
        pins.push({ employeeCode: code, name: values.name, pin });
        created++;
      }
    }
    audit(req, "employee.import", { meta: { created, updated } });
    res.json({ created, updated, pins });
  }),
);

/* ---------------- wallet ---------------- */
employeesRouter.post(
  "/:id/wallet",
  ah(async (req, res) => {
    if (!["OWNER", "MANAGER", "CASHIER"].includes(req.auth!.role!))
      throw forbidden();
    const b = parse(
      z.object({
        type: z.enum(["CREDIT", "DEBIT"]),
        amount: z.coerce.number().positive().max(100000),
        reason: z
          .enum(["RECHARGE", "ADJUSTMENT", "REFUND", "ALLOWANCE"])
          .default("RECHARGE"),
        note: z.string().max(200).optional(),
        reference: z.string().max(100).optional(), // UPI ref / receipt
      }),
      req.body,
    );
    const [e] = await db
      .select()
      .from(E)
      .where(and(eq(E.id, req.params.id), ...scope(req)));
    if (!e) throw notFound();
    const balance = await db.transaction((tx) =>
      walletMove(tx, {
        tenantId: e.tenantId,
        employeeId: e.id,
        ...b,
        createdById: req.auth!.id,
        minBalance: b.type === "DEBIT" ? 0 : undefined,
      }),
    );
    audit(req, "wallet." + b.type.toLowerCase(), {
      entity: "employee",
      entityId: e.id,
      meta: b,
    });
    if (b.type === "CREDIT") {
      sendPush({
        title: "Wallet recharged 💳",
        body: `₹${b.amount} added. New balance ₹${balance}`,
        externalIds: [empExternalId(e.id)],
        data: { type: "WALLET" },
      });
    }
    res.json({ balance });
  }),
);

employeesRouter.get(
  "/:id/wallet",
  ah(async (req, res) => {
    const [e] = await db
      .select({ id: E.id, bal: E.walletBalance })
      .from(E)
      .where(and(eq(E.id, req.params.id), ...scope(req)));
    if (!e) throw notFound();
    const { pageSize, offset } = pageParams(req.query);
    const items = await db
      .select()
      .from(schema.walletTransactions)
      .where(eq(schema.walletTransactions.employeeId, e.id))
      .orderBy(desc(schema.walletTransactions.createdAt))
      .limit(pageSize)
      .offset(offset);
    res.json({ balance: e.bal, items });
  }),
);

/** Bulk wallet credit (e.g. company top-up for a department) */
employeesRouter.post(
  "/wallet/bulk-credit",
  ah(async (req, res) => {
    if (!["OWNER", "MANAGER"].includes(req.auth!.role!)) throw forbidden();
    const b = parse(
      z.object({
        employeeIds: z.array(z.string()).min(1).max(5000),
        amount: z.coerce.number().positive(),
        note: z.string().optional(),
      }),
      req.body,
    );
    const emps = await db
      .select({ id: E.id })
      .from(E)
      .where(and(inArray(E.id, b.employeeIds), ...scope(req)));
    if (!emps.length) throw badRequest("No employees matched");
    await db.transaction(async (tx) => {
      for (const e of emps) {
        await walletMove(tx, {
          tenantId: req.auth!.tenantId!,
          employeeId: e.id,
          type: "CREDIT",
          amount: b.amount,
          reason: "RECHARGE",
          note: b.note,
          createdById: req.auth!.id,
        });
      }
    });
    audit(req, "wallet.bulk_credit", {
      meta: { count: emps.length, amount: b.amount },
    });
    res.json({ credited: emps.length });
  }),
);
