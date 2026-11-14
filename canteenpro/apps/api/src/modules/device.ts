import { Router } from "express";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { ah, notFound, parse } from "../lib/http";
import { requireDevice } from "../middleware/auth";
import { createOrder } from "../services/orders";
import { localDate } from "../lib/time";

/**
 * Integration API for biometric terminals / kiosks (header: X-Device-Key).
 * Typical flow: device middleware polls /employees, enrols fingerprints,
 * calls /enrolled, then POSTs /punch on every fingerprint match.
 */

export const deviceRouter = Router();
deviceRouter.use(requireDevice);

deviceRouter.get(
  "/employees",
  ah(async (req, res) => {
    const rows = await db
      .select({
        employeeCode: schema.employees.employeeCode,
        name: schema.employees.name,
        biometricId: schema.employees.biometricId,
        rfidCard: schema.employees.rfidCard,
        synced: schema.employees.biometricSynced,
      })
      .from(schema.employees)
      .where(
        and(
          eq(schema.employees.canteenId, req.auth!.canteenId!),
          eq(schema.employees.status, "ACTIVE"),
        ),
      );
    res.json(rows);
  }),
);

deviceRouter.post(
  "/enrolled",
  ah(async (req, res) => {
    const b = parse(
      z.object({
        items: z
          .array(
            z.object({ employeeCode: z.string(), biometricId: z.string() }),
          )
          .min(1),
      }),
      req.body,
    );
    for (const it of b.items) {
      await db
        .update(schema.employees)
        .set({ biometricId: it.biometricId, biometricSynced: true })
        .where(
          and(
            eq(schema.employees.tenantId, req.auth!.tenantId!),
            eq(schema.employees.employeeCode, it.employeeCode.toUpperCase()),
          ),
        );
    }
    res.json({ ok: true, updated: b.items.length });
  }),
);

/** A fingerprint / card punch. Serves the current session meal, or marks kitchen staff attendance. */
deviceRouter.post(
  "/punch",
  ah(async (req, res) => {
    const { identifier } = parse(
      z.object({ identifier: z.string().min(1) }),
      req.body,
    );
    const tz = req.tenantCtx!.tenant.timezone;
    const tenantId = req.auth!.tenantId!;
    const emp = await db.query.employees.findFirst({
      where: and(
        eq(schema.employees.tenantId, tenantId),
        or(
          eq(schema.employees.biometricId, identifier),
          eq(schema.employees.rfidCard, identifier),
          eq(schema.employees.employeeCode, identifier.toUpperCase()),
        ),
      ),
    });
    if (emp) {
      const order = await createOrder({
        tenantId,
        timezone: tz,
        canteenId: req.auth!.canteenId!,
        consumer: { type: "EMPLOYEE", employeeId: emp.id },
        channel: "BIOMETRIC",
        deviceId: req.auth!.id,
      });
      return res
        .status(201)
        .json({
          kind: "MEAL",
          ok: true,
          name: emp.name,
          session: order.session?.name,
          billNo: order.billNo,
          total: order.total,
        });
    }
    const worker = await db.query.canteenWorkers.findFirst({
      where: and(
        eq(schema.canteenWorkers.tenantId, tenantId),
        eq(schema.canteenWorkers.biometricId, identifier),
      ),
    });
    if (!worker) throw notFound("Unknown fingerprint / card");
    const date = localDate(tz);
    const existing = await db.query.workerAttendance.findFirst({
      where: and(
        eq(schema.workerAttendance.workerId, worker.id),
        eq(schema.workerAttendance.date, date),
      ),
    });
    if (!existing) {
      await db
        .insert(schema.workerAttendance)
        .values({
          tenantId,
          workerId: worker.id,
          date,
          status: "PRESENT",
          checkIn: new Date(),
        });
      return res
        .status(201)
        .json({
          kind: "ATTENDANCE",
          ok: true,
          name: worker.name,
          action: "CHECK_IN",
        });
    }
    await db
      .update(schema.workerAttendance)
      .set({ checkOut: new Date() })
      .where(eq(schema.workerAttendance.id, existing.id));
    res.json({
      kind: "ATTENDANCE",
      ok: true,
      name: worker.name,
      action: "CHECK_OUT",
    });
  }),
);
