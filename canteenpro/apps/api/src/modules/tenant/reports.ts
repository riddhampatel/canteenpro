import { Router, type Request, type Response } from "express";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db, schema } from "../../db";
import { ah, badRequest } from "../../lib/http";
import { allowedCanteens, assertCanteenAccess } from "../../middleware/auth";
import { localDate, monthRange, resolveRange } from "../../lib/time";
import { sendCsv } from "../../lib/csv";
import { round2 } from "../../lib/money";

export const reportsRouter = Router();
const O = schema.orders;

function ctx(req: Request) {
  const tz = req.tenantCtx!.tenant.timezone;
  let { from, to } = resolveRange(
    String(req.query.range ?? "thisMonth"),
    tz,
    req.query.from as string,
    req.query.to as string,
  );
  if (req.query.month) ({ from, to } = monthRange(String(req.query.month)));
  const canteenId = req.query.canteenId ? String(req.query.canteenId) : null;
  if (canteenId) assertCanteenAccess(req, canteenId);
  const allowed = allowedCanteens(req);
  const canteenCond = (col: any): SQL | undefined =>
    canteenId
      ? eq(col, canteenId)
      : allowed
        ? inArray(col, allowed)
        : undefined;
  const orderWhere = and(
    eq(O.tenantId, req.auth!.tenantId!),
    canteenCond(O.canteenId),
    eq(O.status, "COMPLETED"),
    sql`${O.businessDate} between ${from} and ${to}`,
  );
  return { from, to, canteenId, canteenCond, orderWhere, tz };
}

function out(
  req: Request,
  res: Response,
  name: string,
  payload: { rows: Record<string, any>[]; [k: string]: unknown },
  cols?: { key: string; label: string }[],
) {
  if (req.query.format === "csv")
    return sendCsv(res, `${name}.csv`, payload.rows, cols);
  res.json(payload);
}

const sums = {
  meals: sql<number>`count(*)::int`,
  gross: sql<number>`coalesce(sum(${O.subtotal} - ${O.discount}),0)::float`,
  collected: sql<number>`coalesce(sum(${O.total}),0)::float`,
  subsidy: sql<number>`coalesce(sum(${O.subsidyAmount}),0)::float`,
  discount: sql<number>`coalesce(sum(${O.discount}),0)::float`,
  tax: sql<number>`coalesce(sum(${O.taxAmount}),0)::float`,
};

reportsRouter.get(
  "/summary",
  ah(async (req, res) => {
    const c = ctx(req);
    const [totals] = await db.select(sums).from(O).where(c.orderWhere);
    const group = (col: any) =>
      db
        .select({ key: col, ...sums })
        .from(O)
        .where(c.orderWhere)
        .groupBy(col);
    const [byPayment, byConsumer, byChannel] = await Promise.all([
      group(O.paymentMode),
      group(O.consumerType),
      group(O.channel),
    ]);
    const bySession = await db
      .select({
        key: sql<string>`coalesce(${schema.mealSessions.name}, 'À la carte')`,
        ...sums,
      })
      .from(O)
      .leftJoin(
        schema.mealSessions,
        eq(schema.mealSessions.id, O.mealSessionId),
      )
      .where(c.orderWhere)
      .groupBy(sql`coalesce(${schema.mealSessions.name}, 'À la carte')`);
    res.json({
      from: c.from,
      to: c.to,
      totals,
      byPayment,
      byConsumer,
      byChannel,
      bySession,
    });
  }),
);

reportsRouter.get(
  "/daily",
  ah(async (req, res) => {
    const c = ctx(req);
    const rows = await db
      .select({
        date: O.businessDate,
        ...sums,
        employees: sql<number>`count(distinct ${O.employeeId})::int`,
        guests: sql<number>`count(*) filter (where ${O.consumerType} <> 'EMPLOYEE')::int`,
      })
      .from(O)
      .where(c.orderWhere)
      .groupBy(O.businessDate)
      .orderBy(asc(O.businessDate));
    out(req, res, `daily-sales-${c.from}-${c.to}`, {
      from: c.from,
      to: c.to,
      rows,
    });
  }),
);

reportsRouter.get(
  "/departments",
  ah(async (req, res) => {
    const c = ctx(req);
    const rows = await db
      .select({
        department: sql<string>`coalesce(${schema.departments.name}, 'Unassigned')`,
        employees: sql<number>`count(distinct ${O.employeeId})::int`,
        ...sums,
      })
      .from(O)
      .innerJoin(schema.employees, eq(schema.employees.id, O.employeeId))
      .leftJoin(
        schema.departments,
        eq(schema.departments.id, schema.employees.departmentId),
      )
      .where(c.orderWhere)
      .groupBy(sql`coalesce(${schema.departments.name}, 'Unassigned')`)
      .orderBy(desc(sql`count(*)`));
    out(req, res, `department-consumption-${c.from}-${c.to}`, {
      from: c.from,
      to: c.to,
      rows,
    });
  }),
);

reportsRouter.get(
  "/items",
  ah(async (req, res) => {
    const c = ctx(req);
    const rows = await db
      .select({
        item: schema.orderItems.name,
        qty: sql<number>`sum(${schema.orderItems.quantity})::int`,
        revenue: sql<number>`sum(${schema.orderItems.lineTotal})::float`,
        cost: sql<number>`coalesce(sum(${schema.orderItems.quantity} * ${schema.menuItems.costPrice}),0)::float`,
      })
      .from(schema.orderItems)
      .innerJoin(O, eq(O.id, schema.orderItems.orderId))
      .leftJoin(
        schema.menuItems,
        eq(schema.menuItems.id, schema.orderItems.menuItemId),
      )
      .where(c.orderWhere)
      .groupBy(schema.orderItems.name)
      .orderBy(desc(sql`sum(${schema.orderItems.quantity})`));
    out(req, res, `item-sales-${c.from}-${c.to}`, {
      from: c.from,
      to: c.to,
      rows: rows.map((r) => ({
        ...r,
        margin: r.cost ? round2(r.revenue - r.cost) : null,
      })),
    });
  }),
);

/** Per-employee consumption (meal statement). Add ?employeeId for a single employee's line items. */
reportsRouter.get(
  "/employees",
  ah(async (req, res) => {
    const c = ctx(req);
    if (req.query.employeeId) {
      const rows = await db
        .select({
          date: O.businessDate,
          time: O.createdAt,
          billNo: O.billNo,
          session: schema.mealSessions.name,
          paymentMode: O.paymentMode,
          gross: sql<number>`(${O.subtotal} - ${O.discount})::float`,
          subsidy: O.subsidyAmount,
          paid: O.total,
        })
        .from(O)
        .leftJoin(
          schema.mealSessions,
          eq(schema.mealSessions.id, O.mealSessionId),
        )
        .where(
          and(c.orderWhere, eq(O.employeeId, String(req.query.employeeId))),
        )
        .orderBy(asc(O.createdAt));
      return out(req, res, `employee-statement-${c.from}-${c.to}`, {
        from: c.from,
        to: c.to,
        rows,
      });
    }
    const rows = await db
      .select({
        employeeCode: schema.employees.employeeCode,
        name: schema.employees.name,
        department: schema.departments.name,
        ...sums,
        wallet: sql<number>`coalesce(sum(${O.total}) filter (where ${O.paymentMode}='WALLET'),0)::float`,
        payroll: sql<number>`coalesce(sum(${O.total}) filter (where ${O.paymentMode}='PAYROLL'),0)::float`,
        cashUpiCard: sql<number>`coalesce(sum(${O.total}) filter (where ${O.paymentMode} in ('CASH','UPI','CARD')),0)::float`,
      })
      .from(O)
      .innerJoin(schema.employees, eq(schema.employees.id, O.employeeId))
      .leftJoin(
        schema.departments,
        eq(schema.departments.id, schema.employees.departmentId),
      )
      .where(c.orderWhere)
      .groupBy(schema.employees.id, schema.departments.name)
      .orderBy(asc(schema.employees.employeeCode));
    out(req, res, `employee-consumption-${c.from}-${c.to}`, {
      from: c.from,
      to: c.to,
      rows,
    });
  }),
);

/** Salary deduction sheet for HR/payroll (PAYROLL payment mode) */
reportsRouter.get(
  "/payroll",
  ah(async (req, res) => {
    const c = ctx(req);
    const rows = await db
      .select({
        employeeCode: schema.employees.employeeCode,
        name: schema.employees.name,
        department: schema.departments.name,
        meals: sql<number>`count(*)::int`,
        deduction: sql<number>`sum(${O.total})::float`,
      })
      .from(O)
      .innerJoin(schema.employees, eq(schema.employees.id, O.employeeId))
      .leftJoin(
        schema.departments,
        eq(schema.departments.id, schema.employees.departmentId),
      )
      .where(and(c.orderWhere, eq(O.paymentMode, "PAYROLL")))
      .groupBy(schema.employees.id, schema.departments.name)
      .orderBy(asc(schema.employees.employeeCode));
    const total = round2(rows.reduce((a, r) => a + r.deduction, 0));
    out(req, res, `payroll-deductions-${c.from}-${c.to}`, {
      from: c.from,
      to: c.to,
      total,
      rows,
    });
  }),
);

/**
 * Client company billing statement (what the caterer invoices the corporate):
 * company subsidy on employee meals + guest/employee meals charged fully to company.
 */
reportsRouter.get(
  "/company-billing",
  ah(async (req, res) => {
    const c = ctx(req);
    if (!c.canteenId) throw badRequest("Select a canteen");
    const canteen = await db.query.canteens.findFirst({
      where: eq(schema.canteens.id, c.canteenId),
    });
    const where = and(c.orderWhere, sql`${O.subsidyAmount} > 0`);
    const bySession = await db
      .select({
        session: sql<string>`coalesce(${schema.mealSessions.name}, 'À la carte')`,
        meals: sql<number>`count(*)::int`,
        amount: sql<number>`sum(${O.subsidyAmount})::float`,
      })
      .from(O)
      .leftJoin(
        schema.mealSessions,
        eq(schema.mealSessions.id, O.mealSessionId),
      )
      .where(where)
      .groupBy(sql`coalesce(${schema.mealSessions.name}, 'À la carte')`);
    const rows = await db
      .select({
        employeeCode: schema.employees.employeeCode,
        name: sql<string>`coalesce(${schema.employees.name}, ${schema.guests.name}, 'Walk-in')`,
        type: O.consumerType,
        department: schema.departments.name,
        meals: sql<number>`count(*)::int`,
        amount: sql<number>`sum(${O.subsidyAmount})::float`,
      })
      .from(O)
      .leftJoin(schema.employees, eq(schema.employees.id, O.employeeId))
      .leftJoin(
        schema.departments,
        eq(schema.departments.id, schema.employees.departmentId),
      )
      .leftJoin(schema.guests, eq(schema.guests.id, O.guestId))
      .where(where)
      .groupBy(
        schema.employees.employeeCode,
        sql`coalesce(${schema.employees.name}, ${schema.guests.name}, 'Walk-in')`,
        O.consumerType,
        schema.departments.name,
      )
      .orderBy(asc(schema.employees.employeeCode));
    const total = round2(rows.reduce((a, r) => a + r.amount, 0));
    const gstPct = canteen?.gstPercent ?? 5;
    const taxable = round2((total * 100) / (100 + gstPct));
    out(req, res, `company-billing-${canteen?.code}-${c.from}-${c.to}`, {
      from: c.from,
      to: c.to,
      canteen: {
        name: canteen?.name,
        clientCompany: canteen?.clientCompany,
        clientGstin: canteen?.clientGstin,
      },
      vendor: {
        name: req.tenantCtx!.tenant.name,
        gstin: req.tenantCtx!.tenant.gstin,
        address: req.tenantCtx!.tenant.address,
      },
      bySession,
      total,
      taxable,
      gst: round2(total - taxable),
      gstPct,
      rows,
    });
  }),
);

/** Simple monthly P&L: income vs purchases, expenses and kitchen wages */
reportsRouter.get(
  "/pnl",
  ah(async (req, res) => {
    const month = String(
      req.query.month ?? localDate(req.tenantCtx!.tenant.timezone).slice(0, 7),
    );
    req.query.month = month;
    const c = ctx(req);
    const tenantId = req.auth!.tenantId!;
    const [inc] = await db.select(sums).from(O).where(c.orderWhere);
    const [purchases] = await db
      .select({
        v: sql<number>`coalesce(sum(${schema.stockMovements.quantity} * coalesce(${schema.stockMovements.unitCost},0)),0)::float`,
      })
      .from(schema.stockMovements)
      .where(
        and(
          eq(schema.stockMovements.tenantId, tenantId),
          eq(schema.stockMovements.type, "PURCHASE"),
          sql`${schema.stockMovements.createdAt}::date between ${c.from} and ${c.to}`,
          c.canteenId
            ? eq(schema.stockMovements.canteenId, c.canteenId)
            : undefined,
        ),
      );
    const expenses = await db
      .select({
        category: schema.expenses.category,
        amount: sql<number>`sum(${schema.expenses.amount})::float`,
      })
      .from(schema.expenses)
      .where(
        and(
          eq(schema.expenses.tenantId, tenantId),
          sql`${schema.expenses.date} between ${c.from} and ${c.to}`,
          c.canteenId ? eq(schema.expenses.canteenId, c.canteenId) : undefined,
        ),
      )
      .groupBy(schema.expenses.category);
    const [wages] = await db
      .select({
        v: sql<number>`coalesce(sum(case ${schema.workerAttendance.status} when 'PRESENT' then ${schema.canteenWorkers.dailyWage} when 'HALF_DAY' then ${schema.canteenWorkers.dailyWage}/2 else 0 end),0)::float`,
      })
      .from(schema.workerAttendance)
      .innerJoin(
        schema.canteenWorkers,
        eq(schema.canteenWorkers.id, schema.workerAttendance.workerId),
      )
      .where(
        and(
          eq(schema.canteenWorkers.tenantId, tenantId),
          sql`${schema.workerAttendance.date} between ${c.from} and ${c.to}`,
          c.canteenId
            ? eq(schema.canteenWorkers.canteenId, c.canteenId)
            : undefined,
        ),
      );
    const income = round2(inc.collected + inc.subsidy);
    const expTotal = round2(expenses.reduce((a, e) => a + e.amount, 0));
    const cost = round2(purchases.v + expTotal + wages.v);
    const rows = [
      { line: "Collected from employees & guests", amount: inc.collected },
      { line: "Billable to client company (subsidy)", amount: inc.subsidy },
      { line: "Total income", amount: income },
      { line: "Raw material purchases", amount: -purchases.v },
      ...expenses.map((e) => ({
        line: `Expense — ${e.category}`,
        amount: -e.amount,
      })),
      { line: "Kitchen staff wages (attendance)", amount: -wages.v },
      { line: "Net profit", amount: round2(income - cost) },
    ];
    out(req, res, `pnl-${month}`, {
      month,
      income,
      cost,
      profit: round2(income - cost),
      margin: income ? round2(((income - cost) / income) * 100) : 0,
      rows,
    });
  }),
);

reportsRouter.get(
  "/waste",
  ah(async (req, res) => {
    const c = ctx(req);
    const W = schema.wasteLogs;
    const rows = await db
      .select({
        date: W.date,
        session: schema.mealSessions.name,
        preparedKg: W.preparedQtyKg,
        wastedKg: W.wastedQtyKg,
        reason: W.reason,
      })
      .from(W)
      .leftJoin(
        schema.mealSessions,
        eq(schema.mealSessions.id, W.mealSessionId),
      )
      .where(
        and(
          eq(W.tenantId, req.auth!.tenantId!),
          c.canteenCond(W.canteenId),
          sql`${W.date} between ${c.from} and ${c.to}`,
        ),
      )
      .orderBy(asc(W.date));
    const totalWasted = round2(rows.reduce((a, r) => a + r.wastedKg, 0));
    const totalPrepared = round2(
      rows.reduce((a, r) => a + (r.preparedKg ?? 0), 0),
    );
    out(req, res, `food-waste-${c.from}-${c.to}`, {
      from: c.from,
      to: c.to,
      totalWasted,
      totalPrepared,
      wastePct: totalPrepared
        ? round2((totalWasted / totalPrepared) * 100)
        : null,
      rows,
    });
  }),
);

reportsRouter.get(
  "/guests",
  ah(async (req, res) => {
    const c = ctx(req);
    const rows = await db
      .select({
        date: O.businessDate,
        billNo: O.billNo,
        guest: sql<string>`coalesce(${schema.guests.name}, ${O.walkInName})`,
        company: schema.guests.company,
        purpose: schema.guests.purpose,
        host: schema.employees.name,
        session: schema.mealSessions.name,
        paymentMode: O.paymentMode,
        amount: sql<number>`(${O.total} + ${O.subsidyAmount})::float`,
      })
      .from(O)
      .leftJoin(schema.guests, eq(schema.guests.id, O.guestId))
      .leftJoin(
        schema.employees,
        eq(schema.employees.id, schema.guests.hostEmployeeId),
      )
      .leftJoin(
        schema.mealSessions,
        eq(schema.mealSessions.id, O.mealSessionId),
      )
      .where(and(c.orderWhere, sql`${O.consumerType} <> 'EMPLOYEE'`))
      .orderBy(desc(O.createdAt));
    out(req, res, `guest-meals-${c.from}-${c.to}`, {
      from: c.from,
      to: c.to,
      rows,
    });
  }),
);
