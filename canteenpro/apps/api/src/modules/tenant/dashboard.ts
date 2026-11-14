import { Router } from 'express';
import { and, asc, desc, eq, inArray, lte, sql, gte } from 'drizzle-orm';
import { db, schema } from '../../db';
import { ah } from '../../lib/http';
import { allowedCanteens, assertCanteenAccess } from '../../middleware/auth';
import { datesBetween, localDate, resolveRange } from '../../lib/time';

export const dashboardRouter = Router();
const O = schema.orders;

dashboardRouter.get(
  '/',
  ah(async (req, res) => {
    const tenantId = req.auth!.tenantId!;
    const tz = req.tenantCtx!.tenant.timezone;
    const today = localDate(tz);
    const range = String(req.query.range ?? 'today');
    const { from, to } = resolveRange(range, tz, req.query.from as string, req.query.to as string);
    const canteenId = req.query.canteenId ? String(req.query.canteenId) : null;
    if (canteenId) assertCanteenAccess(req, canteenId);
    const allowed = allowedCanteens(req);
    const canteenCond = (col: any) => (canteenId ? eq(col, canteenId) : allowed ? inArray(col, allowed) : undefined);

    const base = and(eq(O.tenantId, tenantId), canteenCond(O.canteenId), eq(O.status, 'COMPLETED'));
    const inRange = and(base, gte(O.businessDate, from), lte(O.businessDate, to));

    const [kpi] = await db
      .select({
        meals: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${O.total}),0)::float`,
        subsidy: sql<number>`coalesce(sum(${O.subsidyAmount}),0)::float`,
        gross: sql<number>`coalesce(sum(${O.subtotal} - ${O.discount}),0)::float`,
        guests: sql<number>`count(*) filter (where ${O.consumerType} <> 'EMPLOYEE')::int`,
        uniqueEaters: sql<number>`count(distinct ${O.employeeId})::int`,
      })
      .from(O)
      .where(inRange);

    const [emp] = await db
      .select({
        active: sql<number>`count(*) filter (where ${schema.employees.status}='ACTIVE')::int`,
        pendingBiometric: sql<number>`count(*) filter (where ${schema.employees.status}='ACTIVE' and ${schema.employees.biometricSynced}=false)::int`,
        lowWallet: sql<number>`count(*) filter (where ${schema.employees.status}='ACTIVE' and ${schema.employees.defaultPayMode}='WALLET' and ${schema.employees.walletBalance} < 100)::int`,
      })
      .from(schema.employees)
      .where(and(eq(schema.employees.tenantId, tenantId), canteenCond(schema.employees.canteenId)));

    // chart: per day x session
    const perDay = await db
      .select({ date: O.businessDate, session: schema.mealSessions.name, count: sql<number>`count(*)::int`, amount: sql<number>`coalesce(sum(${O.total} + ${O.subsidyAmount}),0)::float` })
      .from(O)
      .leftJoin(schema.mealSessions, eq(schema.mealSessions.id, O.mealSessionId))
      .where(inRange)
      .groupBy(O.businessDate, schema.mealSessions.name)
      .orderBy(asc(O.businessDate));
    const sessionNames = [...new Set(perDay.map((r) => r.session ?? 'À la carte'))];
    const chart = datesBetween(from, to).map((date) => {
      const row: Record<string, string | number> = { date };
      for (const s of sessionNames) row[s] = perDay.find((r) => r.date === date && (r.session ?? 'À la carte') === s)?.count ?? 0;
      row.amount = perDay.filter((r) => r.date === date).reduce((a, r) => a + r.amount, 0);
      return row;
    });

    // payment mix
    const payMix = await db
      .select({ mode: O.paymentMode, count: sql<number>`count(*)::int`, amount: sql<number>`coalesce(sum(${O.total} + ${O.subsidyAmount}),0)::float` })
      .from(O)
      .where(inRange)
      .groupBy(O.paymentMode);

    // top items
    const topItems = await db
      .select({ name: schema.orderItems.name, qty: sql<number>`sum(${schema.orderItems.quantity})::int`, amount: sql<number>`sum(${schema.orderItems.lineTotal})::float` })
      .from(schema.orderItems)
      .innerJoin(O, eq(O.id, schema.orderItems.orderId))
      .where(inRange)
      .groupBy(schema.orderItems.name)
      .orderBy(desc(sql`sum(${schema.orderItems.quantity})`))
      .limit(6);

    // who ate today
    const recent = await db
      .select({
        id: O.id, createdAt: O.createdAt, billNo: O.billNo, consumerType: O.consumerType, name: sql<string>`coalesce(${schema.employees.name}, ${schema.guests.name}, ${O.walkInName})`,
        employeeCode: schema.employees.employeeCode, department: schema.departments.name, session: schema.mealSessions.name, total: O.total, paymentMode: O.paymentMode, channel: O.channel,
      })
      .from(O)
      .leftJoin(schema.employees, eq(schema.employees.id, O.employeeId))
      .leftJoin(schema.departments, eq(schema.departments.id, schema.employees.departmentId))
      .leftJoin(schema.guests, eq(schema.guests.id, O.guestId))
      .leftJoin(schema.mealSessions, eq(schema.mealSessions.id, O.mealSessionId))
      .where(and(base, eq(O.businessDate, today)))
      .orderBy(desc(O.createdAt))
      .limit(12);

    // today's opt-in forecast vs served
    const optIns = await db
      .select({ sessionId: schema.mealOptIns.mealSessionId, session: schema.mealSessions.name, optedIn: sql<number>`count(*) filter (where ${schema.mealOptIns.status}='OPTED_IN')::int`, optedOut: sql<number>`count(*) filter (where ${schema.mealOptIns.status}='OPTED_OUT')::int` })
      .from(schema.mealOptIns)
      .innerJoin(schema.mealSessions, eq(schema.mealSessions.id, schema.mealOptIns.mealSessionId))
      .innerJoin(schema.canteens, eq(schema.canteens.id, schema.mealOptIns.canteenId))
      .where(and(eq(schema.canteens.tenantId, tenantId), canteenCond(schema.mealOptIns.canteenId), eq(schema.mealOptIns.date, today)))
      .groupBy(schema.mealOptIns.mealSessionId, schema.mealSessions.name);
    const servedToday = await db
      .select({ sessionId: O.mealSessionId, count: sql<number>`count(*)::int` })
      .from(O)
      .where(and(base, eq(O.businessDate, today)))
      .groupBy(O.mealSessionId);

    // menu status today
    const [menu] = await db
      .select({ menus: sql<number>`count(distinct ${schema.dailyMenus.id})::int`, items: sql<number>`count(${schema.dailyMenuItems.id})::int`, soldOut: sql<number>`count(*) filter (where ${schema.dailyMenuItems.isAvailable}=false)::int` })
      .from(schema.dailyMenus)
      .innerJoin(schema.canteens, eq(schema.canteens.id, schema.dailyMenus.canteenId))
      .leftJoin(schema.dailyMenuItems, eq(schema.dailyMenuItems.dailyMenuId, schema.dailyMenus.id))
      .where(and(eq(schema.canteens.tenantId, tenantId), canteenCond(schema.dailyMenus.canteenId), eq(schema.dailyMenus.date, today), eq(schema.dailyMenus.isPublished, true)));

    // alerts
    const lowStock = await db
      .select({ name: schema.inventoryItems.name, stock: schema.inventoryItems.currentStock, unit: schema.inventoryItems.unit, reorder: schema.inventoryItems.reorderLevel })
      .from(schema.inventoryItems)
      .where(and(eq(schema.inventoryItems.tenantId, tenantId), eq(schema.inventoryItems.isActive, true), sql`${schema.inventoryItems.currentStock} <= ${schema.inventoryItems.reorderLevel}`, sql`${schema.inventoryItems.reorderLevel} > 0`))
      .limit(5);
    const [fb] = await db
      .select({ avg: sql<number>`coalesce(avg(${schema.feedback.rating}),0)::float`, low: sql<number>`count(*) filter (where ${schema.feedback.rating} <= 2 and ${schema.feedback.reply} is null)::int`, total: sql<number>`count(*)::int` })
      .from(schema.feedback)
      .where(and(eq(schema.feedback.tenantId, tenantId), canteenCond(schema.feedback.canteenId), gte(sql`${schema.feedback.createdAt}::date`, from)));

    const alerts: { level: 'danger' | 'warning' | 'info'; title: string; text: string; link?: string }[] = [];
    const sub = req.tenantCtx!;
    if (sub.subscription && sub.daysLeft <= 7) {
      alerts.push({ level: sub.daysLeft <= 2 ? 'danger' : 'warning', title: sub.subscription.status === 'TRIALING' ? 'Trial ending' : 'Subscription renewal due', text: `${Math.max(0, sub.daysLeft)} day(s) left on your ${sub.plan?.name ?? ''} plan.`, link: '/billing' });
    }
    if (!menu?.menus) alerts.push({ level: 'warning', title: "Today's menu not published", text: 'Employees cannot see what is being served today.', link: '/menu' });
    if (menu?.soldOut) alerts.push({ level: 'info', title: `${menu.soldOut} item(s) sold out`, text: 'Marked unavailable on today’s menu.', link: '/menu' });
    for (const s of lowStock) alerts.push({ level: 'warning', title: `Low stock: ${s.name}`, text: `${s.stock} ${s.unit} left (reorder at ${s.reorder}).`, link: '/inventory' });
    if (emp.pendingBiometric) alerts.push({ level: 'info', title: 'Biometric sync pending', text: `${emp.pendingBiometric} employee(s) not enrolled on the device.`, link: '/employees?biometric=pending' });
    if (fb.low) alerts.push({ level: 'warning', title: 'Unanswered low ratings', text: `${fb.low} feedback with rating ≤ 2 need a reply.`, link: '/feedback' });

    res.json({
      range: { key: range, from, to },
      kpis: { ...kpi, activeEmployees: emp.active, lowWalletEmployees: emp.lowWallet, avgRating: Math.round(fb.avg * 10) / 10, feedbackCount: fb.total },
      menuStatus: { published: (menu?.menus ?? 0) > 0, menus: menu?.menus ?? 0, items: menu?.items ?? 0, soldOut: menu?.soldOut ?? 0 },
      chart: { sessions: sessionNames, rows: chart },
      payMix,
      topItems,
      recent,
      forecast: optIns.map((o) => ({ ...o, served: servedToday.find((s) => s.sessionId === o.sessionId)?.count ?? 0 })),
      alerts,
    });
  }),
);
