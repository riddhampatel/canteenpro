import cron from "node-cron";
import {
  and,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db, schema } from "../db";
import { env } from "../config/env";
import { sendTemplateMail } from "../lib/mailer";
import { getSetting } from "../lib/settings";
import { sendPush, empExternalId } from "../lib/push";
import { addDays, dayjs, localDate, localTime } from "../lib/time";
import { walletMove } from "../services/orders";
import { audit } from "../lib/audit";

const fmt = (d: Date | string) => dayjs(d).format("DD MMM YYYY");
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

async function ownerOf(tenantId: string) {
  return db.query.staffUsers.findFirst({
    where: and(
      eq(schema.staffUsers.tenantId, tenantId),
      eq(schema.staffUsers.role, "OWNER"),
      eq(schema.staffUsers.isActive, true),
    ),
  });
}

/** Renewal / trial reminders at 7, 3, 1 days and expiry handling. */
export async function subscriptionJob() {
  const brand = await getSetting("brand.name");
  const billingUrl = `${env.CONSOLE_URL}/billing`;
  const now = new Date();
  // reminders
  const soon = await db.query.subscriptions.findMany({
    where: and(
      inArray(schema.subscriptions.status, ["ACTIVE", "TRIALING"]),
      gt(schema.subscriptions.currentPeriodEnd, now),
      lte(
        schema.subscriptions.currentPeriodEnd,
        dayjs().add(7, "day").toDate(),
      ),
    ),
    with: { tenant: true, plan: true },
  });
  for (const s of soon) {
    const days = Math.ceil(
      (new Date(s.currentPeriodEnd).getTime() - now.getTime()) / 86_400_000,
    );
    if (![7, 3, 1].includes(days)) continue;
    if (
      s.lastReminderAt &&
      dayjs(s.lastReminderAt).isAfter(dayjs().subtract(20, "hour"))
    )
      continue;
    if (s.cancelAtPeriodEnd) continue;
    const owner = await ownerOf(s.tenantId);
    if (!owner) continue;
    await sendTemplateMail(
      owner.email,
      s.status === "TRIALING" ? "trial_ending" : "renewal_reminder",
      {
        brand,
        name: owner.name,
        tenant: s.tenant.name,
        plan: s.plan.name,
        days,
        endDate: fmt(s.currentPeriodEnd),
        billingUrl,
      },
      { tenantId: s.tenantId },
    );
    await db
      .update(schema.subscriptions)
      .set({ lastReminderAt: now })
      .where(eq(schema.subscriptions.id, s.id));
  }
  // expiry
  const expired = await db.query.subscriptions.findMany({
    where: and(
      inArray(schema.subscriptions.status, ["ACTIVE", "TRIALING", "PAST_DUE"]),
      lt(schema.subscriptions.currentPeriodEnd, now),
    ),
    with: { tenant: true },
  });
  for (const s of expired) {
    const graceOver = dayjs(s.currentPeriodEnd).add(3, "day").isBefore(now);
    const next =
      s.status === "PAST_DUE" && graceOver
        ? "EXPIRED"
        : s.status === "PAST_DUE"
          ? null
          : s.cancelAtPeriodEnd
            ? "CANCELLED"
            : "PAST_DUE";
    if (!next) continue;
    await db
      .update(schema.subscriptions)
      .set({ status: next })
      .where(eq(schema.subscriptions.id, s.id));
    await db
      .update(schema.tenants)
      .set({ status: next === "CANCELLED" ? "CANCELLED" : "PAST_DUE" })
      .where(eq(schema.tenants.id, s.tenantId));
    if (next === "PAST_DUE" || next === "CANCELLED") {
      const owner = await ownerOf(s.tenantId);
      if (owner)
        await sendTemplateMail(
          owner.email,
          "subscription_expired",
          {
            brand,
            name: owner.name,
            tenant: s.tenant.name,
            endDate: fmt(s.currentPeriodEnd),
            billingUrl,
          },
          { tenantId: s.tenantId },
        );
    }
    audit(null, "subscription." + next.toLowerCase(), { tenantId: s.tenantId });
  }
}

/** Evening email summary to every active tenant owner. */
export async function dailyReportJob(forDate?: string) {
  const brand = await getSetting("brand.name");
  const tenants = await db
    .select()
    .from(schema.tenants)
    .where(inArray(schema.tenants.status, ["ACTIVE", "TRIAL"]));
  for (const t of tenants) {
    const date = forDate ?? localDate(t.timezone);
    const O = schema.orders;
    const [k] = await db
      .select({
        meals: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(${O.total}),0)::float`,
        subsidy: sql<number>`coalesce(sum(${O.subsidyAmount}),0)::float`,
        guests: sql<number>`count(*) filter (where ${O.consumerType} <> 'EMPLOYEE')::int`,
      })
      .from(O)
      .where(
        and(
          eq(O.tenantId, t.id),
          eq(O.businessDate, date),
          eq(O.status, "COMPLETED"),
        ),
      );
    if (!k.meals) continue;
    const bySession = await db
      .select({ n: schema.mealSessions.name, c: sql<number>`count(*)::int` })
      .from(O)
      .leftJoin(
        schema.mealSessions,
        eq(schema.mealSessions.id, O.mealSessionId),
      )
      .where(
        and(
          eq(O.tenantId, t.id),
          eq(O.businessDate, date),
          eq(O.status, "COMPLETED"),
        ),
      )
      .groupBy(schema.mealSessions.name);
    const [opt] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(schema.mealOptIns)
      .innerJoin(
        schema.canteens,
        eq(schema.canteens.id, schema.mealOptIns.canteenId),
      )
      .where(
        and(
          eq(schema.canteens.tenantId, t.id),
          eq(schema.mealOptIns.date, date),
          eq(schema.mealOptIns.status, "OPTED_IN"),
        ),
      );
    const [w] = await db
      .select({
        kg: sql<number>`coalesce(sum(${schema.wasteLogs.wastedQtyKg}),0)::float`,
      })
      .from(schema.wasteLogs)
      .where(
        and(
          eq(schema.wasteLogs.tenantId, t.id),
          eq(schema.wasteLogs.date, date),
        ),
      );
    const owner = await ownerOf(t.id);
    if (!owner) continue;
    await sendTemplateMail(
      owner.email,
      "daily_report",
      {
        brand,
        name: owner.name,
        tenant: t.name,
        date: fmt(date),
        meals: k.meals,
        revenue: inr(k.revenue),
        subsidy: inr(k.subsidy),
        guests: k.guests,
        optedIn: opt.c,
        waste: w.kg,
        sessions: bySession
          .map((s) => `${s.n ?? "À la carte"}: ${s.c}`)
          .join(" · "),
        consoleUrl: env.CONSOLE_URL,
      },
      { tenantId: t.id },
    );
  }
}

/** Monthly allowance credit on the 1st. Idempotent per month via wallet reference. */
export async function monthlyAllowanceJob() {
  const ref = "ALLOWANCE-" + dayjs().format("YYYY-MM");
  const emps = await db
    .select({
      id: schema.employees.id,
      tenantId: schema.employees.tenantId,
      amt: schema.employees.monthlyAllowance,
    })
    .from(schema.employees)
    .where(
      and(
        eq(schema.employees.status, "ACTIVE"),
        gt(schema.employees.monthlyAllowance, 0),
      ),
    );
  let n = 0;
  for (const e of emps) {
    const [done] = await db
      .select({ id: schema.walletTransactions.id })
      .from(schema.walletTransactions)
      .where(
        and(
          eq(schema.walletTransactions.employeeId, e.id),
          eq(schema.walletTransactions.reference, ref),
        ),
      );
    if (done) continue;
    await db.transaction((tx) =>
      walletMove(tx, {
        tenantId: e.tenantId,
        employeeId: e.id,
        type: "CREDIT",
        amount: e.amt,
        reason: "ALLOWANCE",
        reference: ref,
        note: "Monthly meal allowance",
      }),
    );
    sendPush({
      title: "Monthly meal allowance credited",
      body: `₹${e.amt} added to your canteen wallet.`,
      externalIds: [empExternalId(e.id)],
      data: { type: "WALLET" },
    });
    n++;
  }
  if (n) console.info(`[cron] allowance credited to ${n} employees`);
}

/** Push opt-in reminders ~45 minutes before each session's cutoff to employees who haven't responded. */
export async function optInReminderJob() {
  const canteens = await db.query.canteens.findMany({
    where: and(
      eq(schema.canteens.optInRequired, true),
      eq(schema.canteens.isActive, true),
    ),
    with: {
      sessions: true,
      tenant: { columns: { timezone: true, status: true } },
    },
  });
  for (const c of canteens) {
    if (!["ACTIVE", "TRIAL"].includes(c.tenant.status)) continue;
    const tz = c.tenant.timezone;
    const now = localTime(tz);
    const in45 = dayjs().tz(tz).add(45, "minute").format("HH:mm");
    const in60 = dayjs().tz(tz).add(60, "minute").format("HH:mm");
    const date = localDate(tz);
    for (const s of c.sessions.filter((x) => x.isActive && x.optInCutoff)) {
      // fire once inside the 15-min window [cutoff-60, cutoff-45)
      if (
        !(s.optInCutoff! > in45 && s.optInCutoff! <= in60) ||
        now >= s.optInCutoff!
      )
        continue;
      const pending = await db
        .select({ id: schema.employees.id })
        .from(schema.employees)
        .leftJoin(
          schema.mealOptIns,
          and(
            eq(schema.mealOptIns.employeeId, schema.employees.id),
            eq(schema.mealOptIns.mealSessionId, s.id),
            eq(schema.mealOptIns.date, date),
          ),
        )
        .where(
          and(
            eq(schema.employees.canteenId, c.id),
            eq(schema.employees.status, "ACTIVE"),
            isNull(schema.mealOptIns.id),
          ),
        );
      if (!pending.length) continue;
      await sendPush({
        title: `Having ${s.name.toLowerCase()} today?`,
        body: `Confirm before ${s.optInCutoff} so the kitchen cooks just enough.`,
        externalIds: pending.map((p) => empExternalId(p.id)),
        data: { type: "REMINDER", sessionId: s.id },
      });
    }
  }
}

/** Morning low-stock email to owners. */
export async function lowStockJob() {
  const brand = await getSetting("brand.name");
  const rows = await db
    .select({
      tenantId: schema.inventoryItems.tenantId,
      name: schema.inventoryItems.name,
      stock: schema.inventoryItems.currentStock,
      unit: schema.inventoryItems.unit,
      reorder: schema.inventoryItems.reorderLevel,
    })
    .from(schema.inventoryItems)
    .where(
      and(
        eq(schema.inventoryItems.isActive, true),
        gt(schema.inventoryItems.reorderLevel, 0),
        sql`${schema.inventoryItems.currentStock} <= ${schema.inventoryItems.reorderLevel}`,
      ),
    );
  const byTenant = new Map<string, typeof rows>();
  rows.forEach((r) =>
    byTenant.set(r.tenantId, [...(byTenant.get(r.tenantId) ?? []), r]),
  );
  for (const [tenantId, items] of byTenant) {
    const owner = await ownerOf(tenantId);
    if (!owner) continue;
    const itemsHtml =
      "<ul>" +
      items
        .map(
          (i) =>
            `<li><b>${i.name}</b>: ${i.stock} ${i.unit} (reorder at ${i.reorder})</li>`,
        )
        .join("") +
      "</ul>";
    await sendTemplateMail(
      owner.email,
      "low_stock",
      {
        brand,
        name: owner.name,
        count: items.length,
        itemsHtml,
        consoleUrl: env.CONSOLE_URL,
      },
      { tenantId },
    );
  }
}

const safe = (name: string, fn: () => Promise<unknown>) => async () => {
  try {
    await fn();
  } catch (e) {
    console.error(`[cron] ${name} failed`, e);
  }
};

export function startCron() {
  if (!env.CRON_ENABLED) return console.info("[cron] disabled");
  const tz = env.CRON_TIMEZONE;
  cron.schedule("0 9 * * *", safe("subscriptions", subscriptionJob), {
    timezone: tz,
  });
  cron.schedule(
    "30 21 * * *",
    safe("daily-report", () => dailyReportJob()),
    { timezone: tz },
  );
  cron.schedule("5 0 1 * *", safe("allowance", monthlyAllowanceJob), {
    timezone: tz,
  });
  cron.schedule("*/15 * * * *", safe("opt-in-reminder", optInReminderJob), {
    timezone: tz,
  });
  cron.schedule("0 8 * * *", safe("low-stock", lowStockJob), { timezone: tz });
  console.info(
    "[cron] scheduled: subscriptions 09:00, daily report 21:30, allowance 1st 00:05, opt-in reminders */15m, low stock 08:00",
  );
}

// unused import guards
void addDays;
void gte;
void or;
