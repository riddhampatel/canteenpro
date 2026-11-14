import type { NextFunction, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../db";
import { verifyToken, type TokenType } from "../lib/jwt";
import { HttpError, forbidden, unauthorized, ah } from "../lib/http";
import { sha256 } from "../lib/crypto";

type Plan = typeof schema.plans.$inferSelect;
type Subscription = typeof schema.subscriptions.$inferSelect;
type Tenant = typeof schema.tenants.$inferSelect;

export interface AuthContext {
  typ: TokenType | "device";
  id: string;
  tenantId?: string;
  role?: string;
  canteenIds?: string[]; // staff scoping (empty = all)
  canteenId?: string; // employee / device home canteen
  name?: string;
}

export interface TenantContext {
  tenant: Tenant;
  subscription: Subscription | null;
  plan: Plan | null;
  active: boolean; // subscription allows usage
  daysLeft: number;
}


//declare merging of Express.Request to include auth and tenantCtx
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
      tenantCtx?: TenantContext;
      rawBody?: string;
    }
  }
}

const GRACE_DAYS = 3;

function bearer(req: Request) {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return null;
}

export const requirePlatform = (...roles: string[]) =>
  ah(async (req, _res, next) => {
    const t = bearer(req);
    if (!t) throw unauthorized();
    let p;
    try {
      p = verifyToken(t);
    } catch {
      throw unauthorized("Session expired");
    }

    if (p.typ !== "platform") throw unauthorized();
    const [u] = await db
      .select()
      .from(schema.platformUsers)
      .where(eq(schema.platformUsers.id, p.sub));
    if (!u || !u.isActive) throw unauthorized();
    if (roles.length && !roles.includes(u.role)) throw forbidden();
    req.auth = { typ: "platform", id: u.id, role: u.role, name: u.name };
    next();
  });

export async function loadTenantContext(
  tenantId: string,
): Promise<TenantContext> {

  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
    with: { subscription: { with: { plan: true } } },
  });
  if (!tenant) throw unauthorized("Workspace not found");
  const sub = tenant.subscription ?? null;
  const now = Date.now();
  const end = sub ? new Date(sub.currentPeriodEnd).getTime() : 0;
  const daysLeft = Math.ceil((end - now) / 86_400_000);
  const active =
    tenant.status !== "SUSPENDED" &&
    tenant.status !== "CANCELLED" &&
    !!sub &&
    ["TRIALING", "ACTIVE", "PAST_DUE"].includes(sub.status) &&
    end + GRACE_DAYS * 86_400_000 > now;
  const { subscription, ...t } = tenant;
  return {
    tenant: t as Tenant,
    subscription: sub,
    plan: (sub as any)?.plan ?? null,
    active,
    daysLeft,
  };
}

/** Staff (owner / manager / cashier / kitchen) auth for the console + manager mobile app. */
export const requireStaff = (...roles: string[]) =>
  ah(async (req, _res, next) => {
    const t = bearer(req);
    if (!t) throw unauthorized();
    let p;
    // Verify the token
    try {
      p = verifyToken(t);
    } catch {
      throw unauthorized("Session expired");
    }

    if (p.typ !== "staff") throw unauthorized();

    const [u] = await db
      .select()
      .from(schema.staffUsers)
      .where(eq(schema.staffUsers.id, p.sub));

    if (!u || !u.isActive) throw unauthorized();

    if (roles.length && !roles.includes(u.role))
      throw forbidden("Your role cannot perform this action");
    
    req.auth = {
      typ: "staff",
      id: u.id,
      tenantId: u.tenantId,
      role: u.role,
      canteenIds: u.role === "OWNER" ? [] : u.canteenIds,
      name: u.name,
    };
    req.tenantCtx = await loadTenantContext(u.tenantId);
    next();
  });

/** Employee (mobile app) auth. */
export const requireEmployee = ah(async (req, _res, next) => {
  const t = bearer(req);
  if (!t) throw unauthorized();
  let p;
  try {
    p = verifyToken(t);
  } catch {
    throw unauthorized("Session expired");
  }
  if (p.typ !== "employee") throw unauthorized();
  const [e] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, p.sub));
  if (!e || e.status !== "ACTIVE") throw unauthorized("Account inactive");
  req.auth = {
    typ: "employee",
    id: e.id,
    tenantId: e.tenantId,
    canteenId: e.canteenId,
    name: e.name,
  };
  req.tenantCtx = await loadTenantContext(e.tenantId);
  if (!req.tenantCtx.active)
    throw new HttpError(
      402,
      "Canteen service is paused. Please contact your canteen manager.",
      "SUBSCRIPTION_INACTIVE",
    );
  next();
});

/** Device auth (biometric terminals / kiosks): header X-Device-Key */
export const requireDevice = ah(async (req, _res, next) => {
  const key = req.header("x-device-key");
  if (!key) throw unauthorized("Missing X-Device-Key");
  const [d] = await db
    .select()
    .from(schema.devices)
    .where(
      and(
        eq(schema.devices.apiKeyHash, sha256(key)),
        eq(schema.devices.isActive, true),
      ),
    );
  if (!d) throw unauthorized("Invalid device key");
  req.auth = {
    typ: "device",
    id: d.id,
    tenantId: d.tenantId,
    canteenId: d.canteenId,
    name: d.name,
  };
  req.tenantCtx = await loadTenantContext(d.tenantId);
  if (!req.tenantCtx.active)
    throw new HttpError(402, "Subscription inactive", "SUBSCRIPTION_INACTIVE");
  db.update(schema.devices)
    .set({ lastSeenAt: new Date() })
    .where(eq(schema.devices.id, d.id))
    .catch(() => {});
  next();
});

/** Block tenant usage when the subscription is not active (billing routes stay open). */
export function requireActiveSubscription(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.tenantCtx?.active) {
    return next(
      new HttpError(
        402,
        "Your subscription has expired. Renew to continue.",
        "SUBSCRIPTION_INACTIVE",
      ),
    );
  }
  next();
}

/** Plan feature flag gate, e.g. requireFeature('inventory') */
export const requireFeature =
  (feature: string) => (req: Request, _res: Response, next: NextFunction) => {
    const f = req.tenantCtx?.plan?.features ?? {};
    if (f[feature] === false) {
      return next(
        new HttpError(
          403,
          `Your plan does not include ${feature}. Upgrade to unlock it.`,
          "PLAN_FEATURE",
        ),
      );
    }
    next();
  };

/** Canteens visible to the current staff user (null = all in tenant). */
export const allowedCanteens = (req: Request): string[] | null =>
  req.auth?.canteenIds && req.auth.canteenIds.length
    ? req.auth.canteenIds
    : null;

export function assertCanteenAccess(req: Request, canteenId: string) {
  const allowed = allowedCanteens(req);
  if (allowed && !allowed.includes(canteenId))
    throw forbidden("No access to this canteen");
}
