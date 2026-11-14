import { Router } from "express";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  or,
  sql,
  isNull,
} from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import {
  ah,
  badRequest,
  HttpError,
  notFound,
  pageParams,
  parse,
} from "../lib/http";
import { requireEmployee } from "../middleware/auth";
import { addDays, localDate, localTime } from "../lib/time";
import { createOrder, detectSession } from "../services/orders";
import { employeeQr, parseCounterQr, counterQr } from "../services/qr";
import { menuFor } from "./tenant/menu";

/** Mobile app API for employees (people who eat at the canteen). */
export const employeeRouter = Router();
employeeRouter.use(requireEmployee);

const me = async (id: string) => {
  const e = await db.query.employees.findFirst({
    where: eq(schema.employees.id, id),
    with: {
      department: true,
      canteen: {
        columns: {
          id: true,
          name: true,
          address: true,
          optInRequired: true,
          allowGuests: true,
        },
      },
      tenant: { columns: { id: true, name: true, logoUrl: true } },
    },
  });
  if (!e) throw notFound();
  return e;
};

employeeRouter.get(
  "/me",
  ah(async (req, res) => {
    const e = await me(req.auth!.id);
    const month = localDate(req.tenantCtx!.tenant.timezone).slice(0, 7) + "-01";
    const [stats] = await db
      .select({
        mealsThisMonth: sql<number>`count(*)::int`,
        spentThisMonth: sql<number>`coalesce(sum(${schema.orders.total}),0)::float`,
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.employeeId, e.id),
          eq(schema.orders.status, "COMPLETED"),
          gte(schema.orders.businessDate, month),
        ),
      );
    res.json({
      id: e.id,
      name: e.name,
      employeeCode: e.employeeCode,
      phone: e.phone,
      email: e.email,
      designation: e.designation,
      photoUrl: e.photoUrl,
      dietaryPref: e.dietaryPref,
      allergies: e.allergies,
      status: e.status,
      walletBalance: e.walletBalance,
      monthlyAllowance: e.monthlyAllowance,
      defaultPayMode: e.defaultPayMode,
      department: e.department?.name ?? null,
      canteen: e.canteen,
      tenant: e.tenant,
      qr: employeeQr(e.qrToken),
      mustChangePin: !e.pinChangedAt,
      stats,
      oneSignal: {
        externalId: `emp_${e.id}`,
        tags: {
          tenantId: e.tenantId,
          canteenId: e.canteenId,
          role: "employee",
        },
      },
    });
  }),
);

employeeRouter.patch(
  "/me",
  ah(async (req, res) => {
    const b = parse(
      z.object({
        email: z.string().email().nullish(),
        dietaryPref: z
          .enum(["VEG", "NON_VEG", "EGG", "VEGAN", "JAIN"])
          .optional(),
        allergies: z.string().max(200).nullish(),
        photoUrl: z.string().url().nullish(),
      }),
      req.body,
    );
    await db
      .update(schema.employees)
      .set(b)
      .where(eq(schema.employees.id, req.auth!.id));
    res.json({ ok: true });
  }),
);

/** Everything the home screen needs in one call. */
employeeRouter.get(
  "/home",
  ah(async (req, res) => {
    const tz = req.tenantCtx!.tenant.timezone;
    const today = localDate(tz);
    const now = localTime(tz);
    const e = await me(req.auth!.id);
    const sessions = await db
      .select()
      .from(schema.mealSessions)
      .where(
        and(
          eq(schema.mealSessions.canteenId, e.canteenId),
          eq(schema.mealSessions.isActive, true),
        ),
      )
      .orderBy(asc(schema.mealSessions.sortOrder));
    const [optIns, served, menus, unread] = await Promise.all([
      db
        .select()
        .from(schema.mealOptIns)
        .where(
          and(
            eq(schema.mealOptIns.employeeId, e.id),
            eq(schema.mealOptIns.date, today),
          ),
        ),
      db
        .select({
          sid: schema.orders.mealSessionId,
          at: schema.orders.createdAt,
        })
        .from(schema.orders)
        .where(
          and(
            eq(schema.orders.employeeId, e.id),
            eq(schema.orders.businessDate, today),
            eq(schema.orders.status, "COMPLETED"),
          ),
        ),
      menuFor(e.canteenId, today, today),
      unreadCount(req),
    ]);
    const current = detectSession(sessions, tz);
    res.json({
      date: today,
      now,
      employee: {
        name: e.name,
        walletBalance: e.walletBalance,
        photoUrl: e.photoUrl,
        employeeCode: e.employeeCode,
      },
      canteen: e.canteen,
      tenant: e.tenant,
      currentSessionId: current?.id ?? null,
      unreadNotifications: unread,
      sessions: sessions.map((s) => {
        const opt = optIns.find((o) => o.mealSessionId === s.id);
        const m = menus.find((x) => x.mealSessionId === s.id && x.isPublished);
        return {
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          optInCutoff: s.optInCutoff,
          optInOpen: !s.optInCutoff || now < s.optInCutoff,
          optInStatus: opt?.status ?? null,
          price: s.employeePrice,
          served: served.some((x) => x.sid === s.id),
          servedAt: served.find((x) => x.sid === s.id)?.at ?? null,
          items: (m?.items ?? []).map((i) => ({
            id: i.menuItem.id,
            name: i.menuItem.name,
            description: i.menuItem.description,
            imageUrl: i.menuItem.imageUrl,
            foodType: i.menuItem.foodType,
            calories: i.menuItem.calories,
            prepMinutes: i.menuItem.prepMinutes,
            tags: i.menuItem.tags,
            highlights: i.menuItem.highlights,
            category: i.menuItem.category?.name ?? null,
            price: i.priceOverride ?? i.menuItem.price,
            isAvailable: i.isAvailable,
          })),
        };
      }),
    });
  }),
);

/** Week menu for planning (published only) */
employeeRouter.get(
  "/menu",
  ah(async (req, res) => {
    const tz = req.tenantCtx!.tenant.timezone;
    const from = String(req.query.from ?? localDate(tz));
    const to = String(req.query.to ?? addDays(from, 6));
    const menus = await menuFor(req.auth!.canteenId!, from, to);
    const sessions = await db
      .select()
      .from(schema.mealSessions)
      .where(eq(schema.mealSessions.canteenId, req.auth!.canteenId!));
    res.json(
      menus
        .filter((m) => m.isPublished)
        .map((m) => ({
          date: m.date,
          session: sessions.find((s) => s.id === m.mealSessionId)?.name,
          mealSessionId: m.mealSessionId,
          items: m.items.map((i) => ({
            id: i.menuItem.id,
            name: i.menuItem.name,
            foodType: i.menuItem.foodType,
            imageUrl: i.menuItem.imageUrl,
            price: i.priceOverride ?? i.menuItem.price,
            isAvailable: i.isAvailable,
          })),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    );
  }),
);

employeeRouter.put(
  "/opt-ins",
  ah(async (req, res) => {
    const b = parse(
      z.object({
        mealSessionId: z.string(),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        status: z.enum(["OPTED_IN", "OPTED_OUT"]),
      }),
      req.body,
    );
    const tz = req.tenantCtx!.tenant.timezone;
    const today = localDate(tz);
    const date = b.date ?? today;
    if (date < today || date > addDays(today, 14))
      throw badRequest("You can respond for today and the next 14 days");
    const [s] = await db
      .select()
      .from(schema.mealSessions)
      .where(
        and(
          eq(schema.mealSessions.id, b.mealSessionId),
          eq(schema.mealSessions.canteenId, req.auth!.canteenId!),
        ),
      );
    if (!s) throw notFound("Session not found");
    if (date === today && s.optInCutoff && localTime(tz) >= s.optInCutoff) {
      throw new HttpError(
        409,
        `${s.name} opt-in closed at ${s.optInCutoff}`,
        "CUTOFF_PASSED",
      );
    }
    await db
      .insert(schema.mealOptIns)
      .values({
        canteenId: req.auth!.canteenId!,
        employeeId: req.auth!.id,
        mealSessionId: s.id,
        date,
        status: b.status,
      })
      .onConflictDoUpdate({
        target: [
          schema.mealOptIns.employeeId,
          schema.mealOptIns.mealSessionId,
          schema.mealOptIns.date,
        ],
        set: { status: b.status },
      });
    res.json({ ok: true, date, mealSessionId: s.id, status: b.status });
  }),
);

employeeRouter.get(
  "/opt-ins",
  ah(async (req, res) => {
    const tz = req.tenantCtx!.tenant.timezone;
    const from = String(req.query.from ?? localDate(tz));
    const to = String(req.query.to ?? addDays(from, 6));
    res.json(
      await db
        .select()
        .from(schema.mealOptIns)
        .where(
          and(
            eq(schema.mealOptIns.employeeId, req.auth!.id),
            gte(schema.mealOptIns.date, from),
            lte(schema.mealOptIns.date, to),
          ),
        ),
    );
  }),
);

/** Employee scans the counter QR → meal recorded. */
employeeRouter.post(
  "/scan",
  ah(async (req, res) => {
    const { code } = parse(z.object({ code: z.string().min(5) }), req.body);
    const tz = req.tenantCtx!.tenant.timezone;
    const qr = parseCounterQr(code);
    if (!qr) throw badRequest("This is not a canteen QR code", "INVALID_QR");
    const canteen = await db.query.canteens.findFirst({
      where: and(
        eq(schema.canteens.id, qr.canteenId),
        eq(schema.canteens.tenantId, req.auth!.tenantId!),
      ),
    });
    if (
      !canteen ||
      counterQr(canteen.id, canteen.qrSecret, qr.date) !== code.trim()
    )
      throw badRequest("Invalid canteen QR", "INVALID_QR");
    if (qr.date !== localDate(tz))
      throw badRequest(
        "This QR has expired. Scan today's QR at the counter.",
        "QR_EXPIRED",
      );
    const order = await createOrder({
      tenantId: req.auth!.tenantId!,
      timezone: tz,
      canteenId: canteen.id,
      consumer: { type: "EMPLOYEE", employeeId: req.auth!.id },
      mealSessionId: null, // always the session running right now
      channel: "QR_SCAN",
    });
    res.status(201).json({
      ok: true,
      message: `${order.session?.name ?? "Meal"} confirmed — enjoy your meal!`,
      order: {
        id: order.id,
        billNo: order.billNo,
        session: order.session,
        total: order.total,
        paymentMode: order.paymentMode,
        createdAt: order.createdAt,
      },
      walletBalance: order.walletBalance,
    });
  }),
);

employeeRouter.get(
  "/history",
  ah(async (req, res) => {
    const { pageSize, offset } = pageParams(req.query);
    const rows = await db.query.orders.findMany({
      where: eq(schema.orders.employeeId, req.auth!.id),
      with: {
        items: { columns: { name: true, quantity: true, lineTotal: true } },
        session: { columns: { name: true } },
        canteen: { columns: { name: true } },
      },
      orderBy: desc(schema.orders.createdAt),
      limit: pageSize,
      offset,
    });
    const myFeedback = rows.length
      ? await db
          .select({
            orderId: schema.feedback.orderId,
            rating: schema.feedback.rating,
          })
          .from(schema.feedback)
          .where(
            inArray(
              schema.feedback.orderId,
              rows.map((r) => r.id),
            ),
          )
      : [];
    res.json(
      rows.map((o) => ({
        id: o.id,
        billNo: o.billNo,
        date: o.businessDate,
        createdAt: o.createdAt,
        session: o.session?.name ?? null,
        canteen: o.canteen?.name,
        items: o.items,
        total: o.total,
        subsidy: o.subsidyAmount,
        paymentMode: o.paymentMode,
        status: o.status,
        channel: o.channel,
        rating: myFeedback.find((f) => f.orderId === o.id)?.rating ?? null,
      })),
    );
  }),
);

employeeRouter.get(
  "/wallet",
  ah(async (req, res) => {
    const { pageSize, offset } = pageParams(req.query);
    const [e] = await db
      .select({
        bal: schema.employees.walletBalance,
        allowance: schema.employees.monthlyAllowance,
      })
      .from(schema.employees)
      .where(eq(schema.employees.id, req.auth!.id));
    const items = await db
      .select()
      .from(schema.walletTransactions)
      .where(eq(schema.walletTransactions.employeeId, req.auth!.id))
      .orderBy(desc(schema.walletTransactions.createdAt))
      .limit(pageSize)
      .offset(offset);
    res.json({ balance: e.bal, monthlyAllowance: e.allowance, items });
  }),
);

function notifWhere(req: any, deptId: string | null) {
  return and(
    eq(schema.notifications.tenantId, req.auth!.tenantId!),
    or(
      eq(schema.notifications.audience, "ALL_EMPLOYEES"),
      and(
        eq(schema.notifications.audience, "CANTEEN"),
        eq(schema.notifications.canteenId, req.auth!.canteenId!),
      ),
      deptId
        ? and(
            eq(schema.notifications.audience, "DEPARTMENT"),
            eq(schema.notifications.targetId, deptId),
          )
        : undefined,
      and(
        eq(schema.notifications.audience, "EMPLOYEE"),
        eq(schema.notifications.targetId, req.auth!.id),
      ),
    ),
    gte(schema.notifications.createdAt, new Date(Date.now() - 30 * 86_400_000)),
  );
}
async function deptOf(id: string) {
  const [e] = await db
    .select({ d: schema.employees.departmentId })
    .from(schema.employees)
    .where(eq(schema.employees.id, id));
  return e?.d ?? null;
}
async function unreadCount(req: any) {
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(schema.notifications)
    .leftJoin(
      schema.notificationReads,
      and(
        eq(schema.notificationReads.notificationId, schema.notifications.id),
        eq(schema.notificationReads.employeeId, req.auth!.id),
      ),
    )
    .where(
      and(
        notifWhere(req, await deptOf(req.auth!.id)),
        isNull(schema.notificationReads.notificationId),
      ),
    );
  return c;
}

employeeRouter.get(
  "/notifications",
  ah(async (req, res) => {
    const rows = await db
      .select({
        id: schema.notifications.id,
        title: schema.notifications.title,
        body: schema.notifications.body,
        type: schema.notifications.type,
        createdAt: schema.notifications.createdAt,
        readAt: schema.notificationReads.readAt,
      })
      .from(schema.notifications)
      .leftJoin(
        schema.notificationReads,
        and(
          eq(schema.notificationReads.notificationId, schema.notifications.id),
          eq(schema.notificationReads.employeeId, req.auth!.id),
        ),
      )
      .where(notifWhere(req, await deptOf(req.auth!.id)))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(100);
    res.json(rows.map((r) => ({ ...r, isRead: !!r.readAt })));
  }),
);

employeeRouter.post(
  "/notifications/read-all",
  ah(async (req, res) => {
    const rows = await db
      .select({ id: schema.notifications.id })
      .from(schema.notifications)
      .where(notifWhere(req, await deptOf(req.auth!.id)));
    if (rows.length) {
      await db
        .insert(schema.notificationReads)
        .values(
          rows.map((r) => ({ notificationId: r.id, employeeId: req.auth!.id })),
        )
        .onConflictDoNothing();
    }
    res.json({ ok: true });
  }),
);

employeeRouter.post(
  "/notifications/:id/read",
  ah(async (req, res) => {
    await db
      .insert(schema.notificationReads)
      .values({ notificationId: req.params.id, employeeId: req.auth!.id })
      .onConflictDoNothing();
    res.json({ ok: true });
  }),
);

employeeRouter.post(
  "/feedback",
  ah(async (req, res) => {
    const b = parse(
      z.object({
        rating: z.coerce.number().int().min(1).max(5),
        comment: z.string().max(500).optional(),
        orderId: z.string().optional(),
        menuItemId: z.string().optional(),
      }),
      req.body,
    );
    if (b.orderId) {
      const [o] = await db
        .select({ id: schema.orders.id })
        .from(schema.orders)
        .where(
          and(
            eq(schema.orders.id, b.orderId),
            eq(schema.orders.employeeId, req.auth!.id),
          ),
        );
      if (!o) throw notFound("Order not found");
    }
    const [f] = await db
      .insert(schema.feedback)
      .values({
        ...b,
        tenantId: req.auth!.tenantId!,
        canteenId: req.auth!.canteenId!,
        employeeId: req.auth!.id,
      })
      .returning();
    res.status(201).json(f);
  }),
);
