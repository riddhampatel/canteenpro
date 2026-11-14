import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema, type Tx } from "../db";
import { HttpError, badRequest, conflict, notFound } from "../lib/http";
import { inclusiveTax, round2 } from "../lib/money";
import { inWindow, localDate, localTime } from "../lib/time";

type PaymentMode = (typeof schema.paymentMode.enumValues)[number];
type Channel = (typeof schema.orderChannel.enumValues)[number];
type Session = typeof schema.mealSessions.$inferSelect;

export interface CreateOrderInput {
  tenantId: string;
  timezone: string;
  canteenId: string;
  consumer:
    | { type: "EMPLOYEE"; employeeId: string }
    | { type: "GUEST"; guestId: string }
    | { type: "WALK_IN"; name?: string };
  mealSessionId?: string | null;
  /** Empty / undefined → fixed session meal (thali). Otherwise à-la-carte. */
  items?: { menuItemId: string; quantity: number }[];
  paymentMode?: PaymentMode;
  discount?: number;
  channel: Channel;
  servedById?: string | null;
  deviceId?: string | null;
  notes?: string | null;
  /** Skip opt-in + duplicate checks (manager override). */
  override?: boolean;
}

/** Find the session running right now (or the next one within 30 min). */
export function detectSession(sessions: Session[], tz: string): Session | null {
  const t = localTime(tz);
  const active = sessions
    .filter((s) => s.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return active.find((s) => inWindow(t, s.startTime, s.endTime)) ?? null;
}

async function nextBillNo(tx: Tx, canteenId: string) {
  const [c] = await tx
    .update(schema.canteens)
    .set({ billCounter: sql`${schema.canteens.billCounter} + 1` })
    .where(eq(schema.canteens.id, canteenId))
    .returning({
      n: schema.canteens.billCounter,
      prefix: schema.canteens.billPrefix,
      code: schema.canteens.code,
    });
  return `${c.prefix}-${c.code}-${String(c.n).padStart(6, "0")}`;
}

/** Atomically move wallet balance and write a wallet transaction. */
export async function walletMove(
  tx: Tx,
  p: {
    tenantId: string;
    employeeId: string;
    type: "CREDIT" | "DEBIT";
    amount: number;
    reason: string;
    reference?: string | null;
    note?: string | null;
    createdById?: string | null;
    minBalance?: number; // for debits
  },
) {
  const delta = p.type === "CREDIT" ? p.amount : -p.amount;
  const [row] = await tx
    .update(schema.employees)
    .set({ walletBalance: sql`${schema.employees.walletBalance} + ${delta}` })
    .where(
      and(
        eq(schema.employees.id, p.employeeId),
        eq(schema.employees.tenantId, p.tenantId),
        p.type === "DEBIT" && p.minBalance !== undefined
          ? sql`${schema.employees.walletBalance} - ${p.amount} >= ${p.minBalance}`
          : undefined,
      ),
    )
    .returning({ balance: schema.employees.walletBalance });
  if (!row)
    throw new HttpError(
      409,
      "Insufficient wallet balance",
      "INSUFFICIENT_BALANCE",
    );
  await tx.insert(schema.walletTransactions).values({
    tenantId: p.tenantId,
    employeeId: p.employeeId,
    type: p.type,
    amount: p.amount,
    balanceAfter: row.balance,
    reason: p.reason,
    reference: p.reference,
    note: p.note,
    createdById: p.createdById,
  });
  return row.balance;
}

export async function createOrder(input: CreateOrderInput) {
  const today = localDate(input.timezone);

  return db.transaction(async (tx) => {
    const canteen = await tx.query.canteens.findFirst({
      where: and(
        eq(schema.canteens.id, input.canteenId),
        eq(schema.canteens.tenantId, input.tenantId),
      ),
      with: { sessions: true },
    });
    if (!canteen) throw notFound("Canteen not found");
    if (canteen.maintenanceMode && input.channel !== "POS")
      throw new HttpError(423, "Canteen is in maintenance mode", "MAINTENANCE");

    // ---- session
    let session: Session | null = null;
    if (input.mealSessionId) {
      session =
        canteen.sessions.find((s) => s.id === input.mealSessionId) ?? null;
      if (!session) throw badRequest("Invalid meal session");
    } else {
      session = detectSession(canteen.sessions, input.timezone);
    }
    const isFixed = !input.items || input.items.length === 0;
    if (isFixed && !session)
      throw new HttpError(
        409,
        "No meal session is running right now",
        "NO_SESSION",
      );

    // ---- consumer
    let employee: typeof schema.employees.$inferSelect | undefined;
    let guest: typeof schema.guests.$inferSelect | undefined;
    if (input.consumer.type === "EMPLOYEE") {
      // serialize concurrent serves for the same employee (double-scan protection)
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${input.consumer.employeeId}))`,
      );
      employee = await tx.query.employees.findFirst({
        where: and(
          eq(schema.employees.id, input.consumer.employeeId),
          eq(schema.employees.tenantId, input.tenantId),
        ),
      });
      if (!employee) throw notFound("Employee not found");
      if (employee.status !== "ACTIVE")
        throw new HttpError(
          409,
          `Employee is ${employee.status.toLowerCase()}`,
          "EMPLOYEE_INACTIVE",
        );
    } else if (input.consumer.type === "GUEST") {
      if (!canteen.allowGuests)
        throw new HttpError(
          409,
          "Guest meals are disabled for this canteen",
          "GUESTS_DISABLED",
        );
      guest = await tx.query.guests.findFirst({
        where: and(
          eq(schema.guests.id, input.consumer.guestId),
          eq(schema.guests.tenantId, input.tenantId),
        ),
      });
      if (!guest) throw notFound("Guest not found");
      if (guest.validUntil && new Date(guest.validUntil) < new Date())
        throw new HttpError(409, "Guest pass has expired", "GUEST_EXPIRED");
    }

    // ---- business rules for fixed employee meals
    if (isFixed && employee && session && !input.override) {
      const [{ c }] = await tx
        .select({ c: sql<number>`count(*)::int` })
        .from(schema.orders)
        .where(
          and(
            eq(schema.orders.employeeId, employee.id),
            eq(schema.orders.mealSessionId, session.id),
            eq(schema.orders.businessDate, today),
            eq(schema.orders.isFixedMeal, true),
            eq(schema.orders.status, "COMPLETED"),
          ),
        );
      if (c >= session.mealsPerDay) {
        throw new HttpError(
          409,
          `${employee.name} has already taken ${session.name} today`,
          "ALREADY_SERVED",
        );
      }
      if (canteen.optInRequired) {
        const opt = await tx.query.mealOptIns.findFirst({
          where: and(
            eq(schema.mealOptIns.employeeId, employee.id),
            eq(schema.mealOptIns.mealSessionId, session.id),
            eq(schema.mealOptIns.date, today),
          ),
        });
        if (opt?.status !== "OPTED_IN")
          throw new HttpError(
            409,
            `${employee.name} did not opt in for ${session.name}`,
            "NOT_OPTED_IN",
          );
      }
    }

    // ---- pricing
    const lines: {
      menuItemId: string | null;
      name: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }[] = [];
    let subsidy = 0;
    if (isFixed) {
      const s = session!;
      if (employee) {
        const full = round2(s.employeePrice + s.companySubsidy);
        lines.push({
          menuItemId: null,
          name: `${s.name} meal`,
          unitPrice: full,
          quantity: 1,
          lineTotal: full,
        });
        subsidy = s.companySubsidy;
      } else {
        lines.push({
          menuItemId: null,
          name: `${s.name} meal (guest)`,
          unitPrice: s.guestPrice,
          quantity: 1,
          lineTotal: s.guestPrice,
        });
      }
    } else {
      const ids = [...new Set(input.items!.map((i) => i.menuItemId))];
      const items = await tx
        .select()
        .from(schema.menuItems)
        .where(
          and(
            inArray(schema.menuItems.id, ids),
            eq(schema.menuItems.tenantId, input.tenantId),
          ),
        );
      // today's menu overrides (price / sold out)
      const overrides = session
        ? await tx
            .select({
              menuItemId: schema.dailyMenuItems.menuItemId,
              price: schema.dailyMenuItems.priceOverride,
              ok: schema.dailyMenuItems.isAvailable,
            })
            .from(schema.dailyMenuItems)
            .innerJoin(
              schema.dailyMenus,
              eq(schema.dailyMenus.id, schema.dailyMenuItems.dailyMenuId),
            )
            .where(
              and(
                eq(schema.dailyMenus.canteenId, canteen.id),
                eq(schema.dailyMenus.date, today),
                eq(schema.dailyMenus.mealSessionId, session.id),
              ),
            )
        : [];
      for (const it of input.items!) {
        const m = items.find((x) => x.id === it.menuItemId);
        if (!m || !m.isActive) throw badRequest("Menu item not available");
        const ov = overrides.find((o) => o.menuItemId === m.id);
        if (ov && !ov.ok)
          throw new HttpError(409, `${m.name} is sold out`, "SOLD_OUT");
        const base = employee
          ? (ov?.price ?? m.price)
          : (m.guestPrice ?? ov?.price ?? m.price);
        const q = Math.max(1, Math.floor(it.quantity));
        lines.push({
          menuItemId: m.id,
          name: m.name,
          unitPrice: base,
          quantity: q,
          lineTotal: round2(base * q),
        });
      }
    }
    const subtotal = round2(lines.reduce((a, l) => a + l.lineTotal, 0));
    let discount = round2(Math.min(input.discount ?? 0, subtotal));

    let mode: PaymentMode =
      input.paymentMode ?? (employee ? employee.defaultPayMode : "CASH");
    if (!employee && (mode === "WALLET" || mode === "PAYROLL"))
      throw badRequest("Wallet / payroll is only for employees");
    if (mode === "COMPANY") subsidy = round2(subtotal - discount);
    if (mode === "COMPLIMENTARY") {
      discount = subtotal;
      subsidy = 0;
    }
    subsidy = Math.min(subsidy, round2(subtotal - discount));
    const total = round2(Math.max(0, subtotal - discount - subsidy));
    const taxAmount = inclusiveTax(
      round2(subtotal - discount),
      canteen.gstPercent,
    );

    const billNo = await nextBillNo(tx, canteen.id);
    const [order] = await tx
      .insert(schema.orders)
      .values({
        tenantId: input.tenantId,
        canteenId: canteen.id,
        billNo,
        consumerType: input.consumer.type,
        employeeId: employee?.id,
        guestId: guest?.id,
        walkInName:
          input.consumer.type === "WALK_IN"
            ? (input.consumer.name ?? "Walk-in")
            : null,
        mealSessionId: session?.id,
        businessDate: today,
        channel: input.channel,
        paymentMode: mode,
        isFixedMeal: isFixed,
        subtotal,
        taxAmount,
        discount,
        subsidyAmount: subsidy,
        total,
        notes: input.notes,
        servedById: input.servedById ?? null,
        deviceId: input.deviceId ?? null,
      })
      .returning();
    await tx
      .insert(schema.orderItems)
      .values(lines.map((l) => ({ ...l, orderId: order.id })));

    let walletBalance: number | undefined;
    if (employee && mode === "WALLET" && total > 0) {
      walletBalance = await walletMove(tx, {
        tenantId: input.tenantId,
        employeeId: employee.id,
        type: "DEBIT",
        amount: total,
        reason: "MEAL",
        reference: order.id,
        note: billNo,
        createdById: input.servedById,
        minBalance: canteen.allowNegativeWallet
          ? -canteen.walletCreditLimit
          : 0,
      });
    }

    return {
      ...order,
      items: lines,
      session: session ? { id: session.id, name: session.name } : null,
      employee: employee
        ? {
            id: employee.id,
            name: employee.name,
            employeeCode: employee.employeeCode,
            photoUrl: employee.photoUrl,
          }
        : null,
      guest: guest ? { id: guest.id, name: guest.name } : null,
      walletBalance: walletBalance ?? employee?.walletBalance,
    };
  });
}

export async function cancelOrder(
  tenantId: string,
  orderId: string,
  reason: string,
  actorId?: string,
) {
  return db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: and(
        eq(schema.orders.id, orderId),
        eq(schema.orders.tenantId, tenantId),
      ),
    });
    if (!order) throw notFound("Order not found");
    if (order.status !== "COMPLETED")
      throw conflict("Order is already cancelled");
    await tx
      .update(schema.orders)
      .set({ status: "CANCELLED", cancelReason: reason })
      .where(eq(schema.orders.id, orderId));
    if (order.employeeId && order.paymentMode === "WALLET" && order.total > 0) {
      await walletMove(tx, {
        tenantId,
        employeeId: order.employeeId,
        type: "CREDIT",
        amount: order.total,
        reason: "REFUND",
        reference: order.id,
        note: `Refund ${order.billNo}`,
        createdById: actorId,
      });
    }
    return { ...order, status: "CANCELLED" as const };
  });
}
