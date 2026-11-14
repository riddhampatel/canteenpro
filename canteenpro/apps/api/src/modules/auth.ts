import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { ah, badRequest, parse, unauthorized } from "../lib/http";
import { signToken } from "../lib/jwt";
import { randomToken, sha256 } from "../lib/crypto";
import { sendTemplateMail } from "../lib/mailer";
import { getSetting } from "../lib/settings";
import { env } from "../config/env";
import {
  requireEmployee,
  requirePlatform,
  requireStaff,
} from "../middleware/auth";
import { audit } from "../lib/audit";
import { employeeQr } from "../services/qr";

const loginLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const creds = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/* ------------------------------------------------------------ platform (super admin) */
export const platformAuthRouter = Router();

platformAuthRouter.post(
  "/login",
  loginLimiter,
  ah(async (req, res) => {
    const b = parse(creds, req.body);
    const [u] = await db
      .select()
      .from(schema.platformUsers)
      .where(eq(schema.platformUsers.email, b.email.toLowerCase()));
    if (
      !u ||
      !u.isActive ||
      !(await bcrypt.compare(b.password, u.passwordHash))
    )
      throw unauthorized("Invalid email or password");
    await db
      .update(schema.platformUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.platformUsers.id, u.id));
    res.json({
      token: signToken({ sub: u.id, typ: "platform", role: u.role }, "12h"),
      user: { id: u.id, name: u.name, email: u.email, role: u.role },
    });
  }),
);

platformAuthRouter.get(
  "/me",
  requirePlatform(),
  ah(async (req, res) => {
    const [u] = await db
      .select()
      .from(schema.platformUsers)
      .where(eq(schema.platformUsers.id, req.auth!.id));
    res.json({ id: u.id, name: u.name, email: u.email, role: u.role });
  }),
);

platformAuthRouter.post(
  "/change-password",
  requirePlatform(),
  ah(async (req, res) => {
    const b = parse(
      z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }),
      req.body,
    );
    const [u] = await db
      .select()
      .from(schema.platformUsers)
      .where(eq(schema.platformUsers.id, req.auth!.id));
    if (!(await bcrypt.compare(b.currentPassword, u.passwordHash)))
      throw badRequest("Current password is incorrect");
    await db
      .update(schema.platformUsers)
      .set({ passwordHash: await bcrypt.hash(b.newPassword, 10) })
      .where(eq(schema.platformUsers.id, u.id));
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------ staff (owner / manager / cashier) */
// handles Staff Sessions and Multi-Tenant Data Access.

export const staffAuthRouter = Router();

async function staffSession(userId: string) {
  const u = await db.query.staffUsers.findFirst({
    where: eq(schema.staffUsers.id, userId),
    with: { tenant: true },
  });
  if (!u) throw unauthorized();
  const canteens = await db
    .select({
      id: schema.canteens.id,
      name: schema.canteens.name,
      code: schema.canteens.code,
      clientCompany: schema.canteens.clientCompany,
    })
    .from(schema.canteens)
    .where(
      and(
        eq(schema.canteens.tenantId, u.tenantId),
        eq(schema.canteens.isActive, true),
      ),
    );
  const visible =
    u.role === "OWNER" || !u.canteenIds.length
      ? canteens
      : canteens.filter((c) => u.canteenIds.includes(c.id));
  return {
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
    },
    tenant: {
      id: u.tenant.id,
      name: u.tenant.name,
      slug: u.tenant.slug,
      logoUrl: u.tenant.logoUrl,
      currency: u.tenant.currency,
      timezone: u.tenant.timezone,
      status: u.tenant.status,
    },
    canteens: visible,
  };
}

staffAuthRouter.post(
  "/login",
  loginLimiter,
  ah(async (req, res) => {
    const b = parse(creds, req.body);
    const [u] = await db
      .select()
      .from(schema.staffUsers)
      .where(eq(schema.staffUsers.email, b.email.toLowerCase().trim()));
    if (
      !u ||
      !u.isActive ||
      !(await bcrypt.compare(b.password, u.passwordHash))
    )
      throw unauthorized("Invalid email or password");
    const [t] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, u.tenantId));
    if (t.status === "SUSPENDED")
      throw unauthorized("This workspace is suspended. Contact support.");
    await db
      .update(schema.staffUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.staffUsers.id, u.id));
    audit(null, "staff.login", {
      tenantId: u.tenantId,
      entity: "staff",
      entityId: u.id,
      meta: { ip: req.ip },
    });
    res.json({
      token: signToken(
        { sub: u.id, typ: "staff", tid: u.tenantId, role: u.role },
        "7d",
      ),
      ...(await staffSession(u.id)),
    });
  }),
);

staffAuthRouter.get(
  "/me",
  requireStaff(),
  ah(async (req, res) => {
    const ctx = req.tenantCtx!;
    res.json({
      ...(await staffSession(req.auth!.id)),
      subscription: ctx.subscription && {
        status: ctx.subscription.status,
        billingCycle: ctx.subscription.billingCycle,
        currentPeriodEnd: ctx.subscription.currentPeriodEnd,
        daysLeft: ctx.daysLeft,
        active: ctx.active,
        plan: ctx.plan && {
          code: ctx.plan.code,
          name: ctx.plan.name,
          features: ctx.plan.features,
        },
      },
    });
  }),
);

staffAuthRouter.post(
  "/change-password",
  requireStaff(),
  ah(async (req, res) => {
    const b = parse(
      z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }),
      req.body,
    );
    const [u] = await db
      .select()
      .from(schema.staffUsers)
      .where(eq(schema.staffUsers.id, req.auth!.id));
    if (!(await bcrypt.compare(b.currentPassword, u.passwordHash)))
      throw badRequest("Current password is incorrect");
    await db
      .update(schema.staffUsers)
      .set({ passwordHash: await bcrypt.hash(b.newPassword, 10) })
      .where(eq(schema.staffUsers.id, u.id));
    res.json({ ok: true });
  }),
);

staffAuthRouter.post(
  "/forgot-password",
  loginLimiter,
  ah(async (req, res) => {
    const { email } = parse(z.object({ email: z.string().email() }), req.body);
    const [u] = await db
      .select()
      .from(schema.staffUsers)
      .where(eq(schema.staffUsers.email, email.toLowerCase()));
    if (u) {
      const token = randomToken();
      await db
        .update(schema.staffUsers)
        .set({
          resetToken: sha256(token),
          resetExpires: new Date(Date.now() + 30 * 60_000),
        })
        .where(eq(schema.staffUsers.id, u.id));
      sendTemplateMail(u.email, "password_reset", {
        brand: await getSetting("brand.name"),
        name: u.name,
        resetUrl: `${env.CONSOLE_URL}/reset-password?token=${token}`,
      });
    }
    res.json({ ok: true }); // never reveal whether the email exists
  }),
);

staffAuthRouter.post(
  "/reset-password",
  ah(async (req, res) => {
    const b = parse(
      z.object({ token: z.string(), password: z.string().min(8) }),
      req.body,
    );
    const [u] = await db
      .select()
      .from(schema.staffUsers)
      .where(
        and(
          eq(schema.staffUsers.resetToken, sha256(b.token)),
          gt(schema.staffUsers.resetExpires, new Date()),
        ),
      );
    if (!u) throw badRequest("Reset link is invalid or expired");
    await db
      .update(schema.staffUsers)
      .set({
        passwordHash: await bcrypt.hash(b.password, 10),
        resetToken: null,
        resetExpires: null,
      })
      .where(eq(schema.staffUsers.id, u.id));
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------ employee (mobile app) */
export const employeeAuthRouter = Router();
const normalizePhone = (p: string) => p.replace(/\D/g, "").slice(-10);

/** Step 1: does this phone have an account? (mobile login first screen) */
employeeAuthRouter.post(
  "/check",
  loginLimiter,
  ah(async (req, res) => {
    const { phone } = parse(z.object({ phone: z.string().min(8) }), req.body);
    const rows = await db
      .select({
        id: schema.employees.id,
        tenantName: schema.tenants.name,
        canteenName: schema.canteens.name,
      })
      .from(schema.employees)
      .innerJoin(
        schema.tenants,
        eq(schema.tenants.id, schema.employees.tenantId),
      )
      .innerJoin(
        schema.canteens,
        eq(schema.canteens.id, schema.employees.canteenId),
      )
      .where(
        and(
          eq(schema.employees.phone, normalizePhone(phone)),
          eq(schema.employees.status, "ACTIVE"),
        ),
      );
    res.json({
      exists: rows.length > 0,
      accounts: rows.map((r) => ({
        tenantName: r.tenantName,
        canteenName: r.canteenName,
      })),
    });
  }),
);

employeeAuthRouter.post(
  "/login",
  loginLimiter,
  ah(async (req, res) => {
    const b = parse(
      z.object({ phone: z.string().min(8), pin: z.string().regex(/^\d{4}$/) }),
      req.body,
    );
    const rows = await db
      .select()
      .from(schema.employees)
      .where(
        and(
          eq(schema.employees.phone, normalizePhone(b.phone)),
          eq(schema.employees.status, "ACTIVE"),
        ),
      );
    let match: (typeof rows)[number] | undefined;
    for (const r of rows)
      if (r.pinHash && (await bcrypt.compare(b.pin, r.pinHash))) match = r;
    if (!match) throw unauthorized("Incorrect mobile number or PIN");
    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, match.tenantId),
    });
    const canteen = await db.query.canteens.findFirst({
      where: eq(schema.canteens.id, match.canteenId),
    });
    res.json({
      token: signToken(
        { sub: match.id, typ: "employee", tid: match.tenantId },
        "30d",
      ),
      mustChangePin: !match.pinChangedAt,
      employee: {
        id: match.id,
        name: match.name,
        employeeCode: match.employeeCode,
        photoUrl: match.photoUrl,
        qr: employeeQr(match.qrToken),
        externalId: `emp_${match.id}`,
      },
      tenant: { id: tenant!.id, name: tenant!.name, logoUrl: tenant!.logoUrl },
      canteen: { id: canteen!.id, name: canteen!.name },
    });
  }),
);

employeeAuthRouter.post(
  "/change-pin",
  requireEmployee,
  ah(async (req, res) => {
    const b = parse(
      z.object({
        currentPin: z.string().regex(/^\d{4}$/),
        newPin: z.string().regex(/^\d{4}$/),
      }),
      req.body,
    );
    const [e] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, req.auth!.id));
    if (!e.pinHash || !(await bcrypt.compare(b.currentPin, e.pinHash)))
      throw badRequest("Current PIN is incorrect");
    if (["0000", "1234", "1111"].includes(b.newPin))
      throw badRequest("Please choose a less obvious PIN");
    await db
      .update(schema.employees)
      .set({
        pinHash: await bcrypt.hash(b.newPin, 10),
        pinChangedAt: new Date(),
      })
      .where(eq(schema.employees.id, e.id));
    res.json({ ok: true });
  }),
);
