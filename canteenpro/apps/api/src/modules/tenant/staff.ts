import { Router } from "express";
import bcrypt from "bcryptjs";
import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db";
import { ah, badRequest, forbidden, notFound, parse } from "../../lib/http";
import { assertLimit } from "../../services/billing";
import { randomToken } from "../../lib/crypto";
import { sendTemplateMail } from "../../lib/mailer";
import { getSetting } from "../../lib/settings";
import { env } from "../../config/env";
import { audit } from "../../lib/audit";

export const staffRouter = Router();
const cols = {
  id: schema.staffUsers.id,
  name: schema.staffUsers.name,
  email: schema.staffUsers.email,
  phone: schema.staffUsers.phone,
  role: schema.staffUsers.role,
  canteenIds: schema.staffUsers.canteenIds,
  isActive: schema.staffUsers.isActive,
  lastLoginAt: schema.staffUsers.lastLoginAt,
  createdAt: schema.staffUsers.createdAt,
};
const ownerOnly = (role?: string) => {
  if (role !== "OWNER")
    throw forbidden("Only the owner can manage team members");
};

staffRouter.get(
  "/",
  ah(async (req, res) => {
    res.json(
      await db
        .select(cols)
        .from(schema.staffUsers)
        .where(eq(schema.staffUsers.tenantId, req.auth!.tenantId!))
        .orderBy(asc(schema.staffUsers.createdAt)),
    );
  }),
);

const body = z.object({
  name: z.string().min(2),
  email: z
    .string()
    .email()
    .transform((s) => s.toLowerCase()),
  phone: z.string().nullish(),
  role: z.enum(["MANAGER", "CASHIER", "KITCHEN"]),
  canteenIds: z.array(z.string()).default([]),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

staffRouter.post(
  "/",
  ah(async (req, res) => {
    ownerOnly(req.auth!.role);
    await assertLimit(req.tenantCtx!, "staff");
    const b = parse(body, req.body);
    const password = b.password ?? randomToken(6);
    const [u] = await db
      .insert(schema.staffUsers)
      .values({
        ...b,
        tenantId: req.auth!.tenantId!,
        passwordHash: await bcrypt.hash(password, 10),
      })
      .returning(cols);
    sendTemplateMail(u.email, "staff_invite", {
      brand: await getSetting("brand.name"),
      name: u.name,
      inviter: req.auth!.name,
      role: u.role,
      tenant: req.tenantCtx!.tenant.name,
      email: u.email,
      password,
      consoleUrl: env.CONSOLE_URL,
    });
    audit(req, "staff.create", { entity: "staff", entityId: u.id });
    res
      .status(201)
      .json({ ...u, tempPassword: b.password ? undefined : password });
  }),
);

staffRouter.patch(
  "/:id",
  ah(async (req, res) => {
    ownerOnly(req.auth!.role);
    const b = parse(body.partial(), req.body);
    if (req.params.id === req.auth!.id && (b.role || b.isActive === false))
      throw badRequest(
        "You cannot change your own role or deactivate yourself",
      );
    const patch: Record<string, unknown> = { ...b };
    delete patch.password;
    if (b.password) patch.passwordHash = await bcrypt.hash(b.password, 10);
    const [u] = await db
      .update(schema.staffUsers)
      .set(patch)
      .where(
        and(
          eq(schema.staffUsers.id, req.params.id),
          eq(schema.staffUsers.tenantId, req.auth!.tenantId!),
        ),
      )
      .returning(cols);
    if (!u) throw notFound();
    audit(req, "staff.update", { entity: "staff", entityId: u.id });
    res.json(u);
  }),
);

staffRouter.delete(
  "/:id",
  ah(async (req, res) => {
    ownerOnly(req.auth!.role);
    if (req.params.id === req.auth!.id)
      throw badRequest("You cannot remove yourself");
    const [u] = await db
      .update(schema.staffUsers)
      .set({ isActive: false })
      .where(
        and(
          eq(schema.staffUsers.id, req.params.id),
          eq(schema.staffUsers.tenantId, req.auth!.tenantId!),
          ne(schema.staffUsers.role, "OWNER"),
        ),
      )
      .returning(cols);
    if (!u) throw notFound();
    res.json({ ok: true });
  }),
);
