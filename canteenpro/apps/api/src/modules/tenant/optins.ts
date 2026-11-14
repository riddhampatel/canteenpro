import { Router } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import { ah, badRequest } from "../../lib/http";
import { assertCanteenAccess } from "../../middleware/auth";
import { addDays, localDate } from "../../lib/time";

export const optInsRouter = Router();

/**
 * Headcount forecast for kitchen planning.
 * For each session: opted in / opted out / no response, and a predicted
 * headcount = opted-in + (no-response × historical turn-up rate over last 14 days).
 */
optInsRouter.get(
  "/forecast",
  ah(async (req, res) => {
    const canteenId = String(req.query.canteenId ?? "");
    if (!canteenId) throw badRequest("canteenId required");
    assertCanteenAccess(req, canteenId);
    const tz = req.tenantCtx!.tenant.timezone;
    const date = String(req.query.date ?? localDate(tz));
    const sessions = await db
      .select()
      .from(schema.mealSessions)
      .where(
        and(
          eq(schema.mealSessions.canteenId, canteenId),
          eq(schema.mealSessions.isActive, true),
        ),
      )
      .orderBy(asc(schema.mealSessions.sortOrder));
    const [{ employees }] = await db
      .select({ employees: sql<number>`count(*)::int` })
      .from(schema.employees)
      .where(
        and(
          eq(schema.employees.canteenId, canteenId),
          eq(schema.employees.status, "ACTIVE"),
        ),
      );
    const counts = await db
      .select({
        sid: schema.mealOptIns.mealSessionId,
        status: schema.mealOptIns.status,
        c: sql<number>`count(*)::int`,
      })
      .from(schema.mealOptIns)
      .where(
        and(
          eq(schema.mealOptIns.canteenId, canteenId),
          eq(schema.mealOptIns.date, date),
        ),
      )
      .groupBy(schema.mealOptIns.mealSessionId, schema.mealOptIns.status);
    const histFrom = addDays(date, -14);
    const hist = await db
      .select({
        sid: schema.orders.mealSessionId,
        c: sql<number>`count(*)::float / greatest(count(distinct ${schema.orders.businessDate}),1)`,
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.canteenId, canteenId),
          eq(schema.orders.status, "COMPLETED"),
          sql`${schema.orders.businessDate} >= ${histFrom} and ${schema.orders.businessDate} < ${date}`,
        ),
      )
      .groupBy(schema.orders.mealSessionId);
    const served = await db
      .select({
        sid: schema.orders.mealSessionId,
        c: sql<number>`count(*)::int`,
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.canteenId, canteenId),
          eq(schema.orders.status, "COMPLETED"),
          eq(schema.orders.businessDate, date),
        ),
      )
      .groupBy(schema.orders.mealSessionId);

    const rows = sessions.map((s) => {
      const inC =
        counts.find((c) => c.sid === s.id && c.status === "OPTED_IN")?.c ?? 0;
      const outC =
        counts.find((c) => c.sid === s.id && c.status === "OPTED_OUT")?.c ?? 0;
      const noResp = Math.max(0, employees - inC - outC);
      const avgDaily = hist.find((h) => h.sid === s.id)?.c ?? 0;
      const turnUp = employees ? Math.min(1, avgDaily / employees) : 0;
      const predicted = Math.round(inC + noResp * turnUp);
      return {
        session: {
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          optInCutoff: s.optInCutoff,
        },
        optedIn: inC,
        optedOut: outC,
        noResponse: noResp,
        avgLast14Days: Math.round(avgDaily),
        predicted,
        served: served.find((x) => x.sid === s.id)?.c ?? 0,
      };
    });
    res.json({ date, employees, sessions: rows });
  }),
);

/** List of employees and their opt-in status for a session/date */
optInsRouter.get(
  "/",
  ah(async (req, res) => {
    const canteenId = String(req.query.canteenId ?? "");
    const sessionId = String(req.query.mealSessionId ?? "");
    if (!canteenId || !sessionId)
      throw badRequest("canteenId and mealSessionId required");
    assertCanteenAccess(req, canteenId);
    const date = String(
      req.query.date ?? localDate(req.tenantCtx!.tenant.timezone),
    );
    const rows = await db
      .select({
        id: schema.employees.id,
        name: schema.employees.name,
        employeeCode: schema.employees.employeeCode,
        department: schema.departments.name,
        status: schema.mealOptIns.status,
        updatedAt: schema.mealOptIns.updatedAt,
      })
      .from(schema.employees)
      .leftJoin(
        schema.departments,
        eq(schema.departments.id, schema.employees.departmentId),
      )
      .leftJoin(
        schema.mealOptIns,
        and(
          eq(schema.mealOptIns.employeeId, schema.employees.id),
          eq(schema.mealOptIns.mealSessionId, sessionId),
          eq(schema.mealOptIns.date, date),
        ),
      )
      .where(
        and(
          eq(schema.employees.canteenId, canteenId),
          eq(schema.employees.status, "ACTIVE"),
        ),
      )
      .orderBy(asc(schema.employees.name));
    res.json(rows);
  }),
);
