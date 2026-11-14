import { Router } from "express";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db";
import { ah, badRequest, forbidden, notFound, parse } from "../../lib/http";
import { assertCanteenAccess } from "../../middleware/auth";
import { crud } from "./crud";
import { addDays, datesBetween, localDate } from "../../lib/time";
import { sendPush } from "../../lib/push";
import { audit } from "../../lib/audit";

export const menuRouter = Router();
const canEdit = (role?: string) =>
  ["OWNER", "MANAGER", "KITCHEN"].includes(role ?? "");

menuRouter.use(
  "/categories",
  crud({
    name: "menu_category",
    table: schema.menuCategories,
    schema: z.object({
      name: z.string().min(1),
      sortOrder: z.coerce.number().int().default(0),
    }),
    orderBy: schema.menuCategories.sortOrder,
    orderDir: "asc",
    writeRoles: ["OWNER", "MANAGER", "KITCHEN"],
  }),
);

/* ---------------- item catalog ---------------- */
const itemSchema = z.object({
  categoryId: z.string().nullish(),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).nullish(),
  imageUrl: z.string().url().nullish().or(z.literal("")),
  price: z.coerce.number().min(0),
  guestPrice: z.coerce.number().min(0).nullish(),
  costPrice: z.coerce.number().min(0).nullish(),
  foodType: z.enum(["VEG", "NON_VEG", "EGG", "VEGAN", "JAIN"]).default("VEG"),
  calories: z.coerce.number().int().min(0).nullish(),
  prepMinutes: z.coerce.number().int().min(0).nullish(),
  tags: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

menuRouter.get(
  "/items",
  ah(async (req, res) => {
    const conds = [eq(schema.menuItems.tenantId, req.auth!.tenantId!)];
    if (req.query.active === "true")
      conds.push(eq(schema.menuItems.isActive, true));
    if (req.query.categoryId)
      conds.push(eq(schema.menuItems.categoryId, String(req.query.categoryId)));
    if (req.query.q)
      conds.push(
        sql`${schema.menuItems.name} ilike ${"%" + String(req.query.q) + "%"}`,
      );
    const rows = await db.query.menuItems.findMany({
      where: and(...conds),
      with: { category: true },
      orderBy: asc(schema.menuItems.name),
    });
    res.json(rows);
  }),
);

menuRouter.post(
  "/items",
  ah(async (req, res) => {
    if (!canEdit(req.auth!.role)) throw forbidden();
    const b = parse(itemSchema, req.body);
    const [row] = await db
      .insert(schema.menuItems)
      .values({
        ...b,
        imageUrl: b.imageUrl || null,
        tenantId: req.auth!.tenantId!,
      })
      .returning();
    res.status(201).json(row);
  }),
);

menuRouter.patch(
  "/items/:id",
  ah(async (req, res) => {
    if (!canEdit(req.auth!.role)) throw forbidden();
    const b = parse(itemSchema.partial(), req.body);
    if (b.imageUrl === "") b.imageUrl = null;
    const [row] = await db
      .update(schema.menuItems)
      .set(b)
      .where(
        and(
          eq(schema.menuItems.id, req.params.id),
          eq(schema.menuItems.tenantId, req.auth!.tenantId!),
        ),
      )
      .returning();
    if (!row) throw notFound();
    res.json(row);
  }),
);

menuRouter.delete(
  "/items/:id",
  ah(async (req, res) => {
    if (!canEdit(req.auth!.role)) throw forbidden();
    // soft delete: keep order history references valid
    await db
      .update(schema.menuItems)
      .set({ isActive: false })
      .where(
        and(
          eq(schema.menuItems.id, req.params.id),
          eq(schema.menuItems.tenantId, req.auth!.tenantId!),
        ),
      );
    res.json({ ok: true });
  }),
);

/* ---------------- daily menu planner ---------------- */
async function canteenFor(req: any, canteenId: string) {
  assertCanteenAccess(req, canteenId);
  const c = await db.query.canteens.findFirst({
    where: and(
      eq(schema.canteens.id, canteenId),
      eq(schema.canteens.tenantId, req.auth!.tenantId!),
    ),
    with: { sessions: { orderBy: asc(schema.mealSessions.sortOrder) } },
  });
  if (!c) throw notFound("Canteen not found");
  return c;
}

/** Menu for a date range grouped by date → session → items. */
export async function menuFor(canteenId: string, from: string, to: string) {
  const menus = await db.query.dailyMenus.findMany({
    where: and(
      eq(schema.dailyMenus.canteenId, canteenId),
      gte(schema.dailyMenus.date, from),
      lte(schema.dailyMenus.date, to),
    ),
    with: { items: { with: { menuItem: { with: { category: true } } } } },
  });
  return menus;
}

menuRouter.get(
  "/daily",
  ah(async (req, res) => {
    const canteenId = String(req.query.canteenId ?? "");
    if (!canteenId) throw badRequest("canteenId is required");
    const c = await canteenFor(req, canteenId);
    const tz = req.tenantCtx!.tenant.timezone;
    const from = String(req.query.from ?? req.query.date ?? localDate(tz));
    const to = String(req.query.to ?? from);
    const menus = await menuFor(canteenId, from, to);
    const days = datesBetween(from, to).map((date) => ({
      date,
      sessions: c.sessions
        .filter((s) => s.isActive)
        .map((s) => {
          const m = menus.find(
            (x) => x.date === date && x.mealSessionId === s.id,
          );
          return {
            session: s,
            dailyMenuId: m?.id ?? null,
            isPublished: m?.isPublished ?? false,
            note: m?.note ?? null,
            items: (m?.items ?? []).map((i) => ({
              id: i.id,
              menuItemId: i.menuItemId,
              name: i.menuItem.name,
              foodType: i.menuItem.foodType,
              imageUrl: i.menuItem.imageUrl,
              category: i.menuItem.category?.name ?? null,
              price: i.priceOverride ?? i.menuItem.price,
              basePrice: i.menuItem.price,
              priceOverride: i.priceOverride,
              plannedQty: i.plannedQty,
              isAvailable: i.isAvailable,
            })),
          };
        }),
    }));
    res.json({ canteen: { id: c.id, name: c.name }, days });
  }),
);

/** Replace items of a (canteen, session, date) menu */
menuRouter.put(
  "/daily",
  ah(async (req, res) => {
    if (!canEdit(req.auth!.role)) throw forbidden();
    const b = parse(
      z.object({
        canteenId: z.string(),
        mealSessionId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        isPublished: z.boolean().optional(),
        note: z.string().nullish(),
        notify: z.boolean().default(false),
        items: z.array(
          z.object({
            menuItemId: z.string(),
            priceOverride: z.coerce.number().min(0).nullish(),
            plannedQty: z.coerce.number().int().min(0).nullish(),
            isAvailable: z.boolean().default(true),
          }),
        ),
      }),
      req.body,
    );
    const c = await canteenFor(req, b.canteenId);
    const session = c.sessions.find((s) => s.id === b.mealSessionId);
    if (!session) throw badRequest("Invalid session");
    const ids = b.items.map((i) => i.menuItemId);
    if (ids.length) {
      const valid = await db
        .select({ id: schema.menuItems.id })
        .from(schema.menuItems)
        .where(
          and(
            inArray(schema.menuItems.id, ids),
            eq(schema.menuItems.tenantId, req.auth!.tenantId!),
          ),
        );
      if (valid.length !== new Set(ids).size)
        throw badRequest("Unknown menu items");
    }
    const published = b.isPublished ?? c.autoPublishMenus;
    const dm = await db.transaction(async (tx) => {
      const [dm] = await tx
        .insert(schema.dailyMenus)
        .values({
          canteenId: c.id,
          mealSessionId: session.id,
          date: b.date,
          isPublished: published,
          note: b.note,
        })
        .onConflictDoUpdate({
          target: [
            schema.dailyMenus.canteenId,
            schema.dailyMenus.mealSessionId,
            schema.dailyMenus.date,
          ],
          set: { isPublished: published, note: b.note ?? null },
        })
        .returning();
      await tx
        .delete(schema.dailyMenuItems)
        .where(eq(schema.dailyMenuItems.dailyMenuId, dm.id));
      if (b.items.length)
        await tx
          .insert(schema.dailyMenuItems)
          .values(b.items.map((i) => ({ ...i, dailyMenuId: dm.id })));
      return dm;
    });
    audit(req, "menu.daily.save", {
      entity: "daily_menu",
      entityId: dm.id,
      meta: { date: b.date, session: session.name, items: ids.length },
    });
    if (b.notify && published && ids.length) {
      const names = await db
        .select({ n: schema.menuItems.name })
        .from(schema.menuItems)
        .where(inArray(schema.menuItems.id, ids))
        .limit(4);
      sendPush({
        title: `${session.name} menu is live 🍽️`,
        body:
          names.map((x) => x.n).join(", ") + (ids.length > 4 ? " & more" : ""),
        filters: [
          { field: "tag", key: "canteenId", relation: "=", value: c.id },
        ],
        data: { type: "MENU", date: b.date },
      });
    }
    res.json({ ok: true, dailyMenuId: dm.id });
  }),
);

/** Toggle sold-out / price for a single item on today's menu */
menuRouter.patch(
  "/daily-items/:id",
  ah(async (req, res) => {
    const b = parse(
      z.object({
        isAvailable: z.boolean().optional(),
        priceOverride: z.coerce.number().min(0).nullish(),
        plannedQty: z.coerce.number().int().nullish(),
      }),
      req.body,
    );
    const row = await db
      .select({
        id: schema.dailyMenuItems.id,
        canteenId: schema.dailyMenus.canteenId,
        tenantId: schema.canteens.tenantId,
      })
      .from(schema.dailyMenuItems)
      .innerJoin(
        schema.dailyMenus,
        eq(schema.dailyMenus.id, schema.dailyMenuItems.dailyMenuId),
      )
      .innerJoin(
        schema.canteens,
        eq(schema.canteens.id, schema.dailyMenus.canteenId),
      )
      .where(eq(schema.dailyMenuItems.id, req.params.id));
    if (!row[0] || row[0].tenantId !== req.auth!.tenantId) throw notFound();
    assertCanteenAccess(req, row[0].canteenId);
    const [u] = await db
      .update(schema.dailyMenuItems)
      .set(b)
      .where(eq(schema.dailyMenuItems.id, req.params.id))
      .returning();
    res.json(u);
  }),
);

/** Copy a day's (or a week's) menu to other dates — e.g. repeat last week. */
menuRouter.post(
  "/daily/copy",
  ah(async (req, res) => {
    if (!canEdit(req.auth!.role)) throw forbidden();
    const b = parse(
      z.object({
        canteenId: z.string(),
        fromDate: z.string(),
        toDate: z.string(),
        days: z.coerce.number().int().min(1).max(31).default(1),
        overwrite: z.boolean().default(false),
      }),
      req.body,
    );
    await canteenFor(req, b.canteenId);
    const src = await menuFor(
      b.canteenId,
      b.fromDate,
      addDays(b.fromDate, b.days - 1),
    );
    let copied = 0;
    await db.transaction(async (tx) => {
      for (const m of src) {
        const offset = datesBetween(b.fromDate, m.date).length - 1;
        const target = addDays(b.toDate, offset);
        const existing = await tx.query.dailyMenus.findFirst({
          where: and(
            eq(schema.dailyMenus.canteenId, b.canteenId),
            eq(schema.dailyMenus.mealSessionId, m.mealSessionId),
            eq(schema.dailyMenus.date, target),
          ),
        });
        if (existing && !b.overwrite) continue;
        const [dm] = await tx
          .insert(schema.dailyMenus)
          .values({
            canteenId: b.canteenId,
            mealSessionId: m.mealSessionId,
            date: target,
            isPublished: m.isPublished,
            note: m.note,
          })
          .onConflictDoUpdate({
            target: [
              schema.dailyMenus.canteenId,
              schema.dailyMenus.mealSessionId,
              schema.dailyMenus.date,
            ],
            set: { isPublished: m.isPublished },
          })
          .returning();
        await tx
          .delete(schema.dailyMenuItems)
          .where(eq(schema.dailyMenuItems.dailyMenuId, dm.id));
        if (m.items.length) {
          await tx
            .insert(schema.dailyMenuItems)
            .values(
              m.items.map((i) => ({
                dailyMenuId: dm.id,
                menuItemId: i.menuItemId,
                priceOverride: i.priceOverride,
                plannedQty: i.plannedQty,
                isAvailable: true,
              })),
            );
        }
        copied++;
      }
    });
    res.json({ copied });
  }),
);
