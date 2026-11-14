import { Router } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db";
import {
  ah,
  badRequest,
  forbidden,
  notFound,
  pageParams,
  parse,
} from "../../lib/http";
import { crud } from "./crud";
import { round2 } from "../../lib/money";
import { audit } from "../../lib/audit";

export const inventoryRouter = Router();
const I = schema.inventoryItems;
const canWrite = (r?: string) =>
  ["OWNER", "MANAGER", "KITCHEN"].includes(r ?? "");

inventoryRouter.use(
  "/suppliers",
  crud({
    name: "supplier",
    table: schema.suppliers,
    schema: z.object({
      name: z.string().min(1),
      phone: z.string().nullish(),
      email: z
        .string()
        .email()
        .nullish()
        .or(z.literal("").transform(() => null)),
      gstin: z.string().nullish(),
      address: z.string().nullish(),
      isActive: z.boolean().default(true),
    }),
    search: [schema.suppliers.name, schema.suppliers.phone],
    orderBy: schema.suppliers.name,
    orderDir: "asc",
    writeRoles: ["OWNER", "MANAGER", "KITCHEN"],
  }),
);

const itemSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1).max(10),
  category: z.string().nullish(),
  reorderLevel: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

inventoryRouter.get(
  "/items",
  ah(async (req, res) => {
    const conds = [eq(I.tenantId, req.auth!.tenantId!)];
    if (req.query.low === "true")
      conds.push(sql`${I.currentStock} <= ${I.reorderLevel}`);
    if (req.query.q)
      conds.push(sql`${I.name} ilike ${"%" + req.query.q + "%"}`);
    const rows = await db
      .select()
      .from(I)
      .where(and(...conds))
      .orderBy(asc(I.name));
    res.json(
      rows.map((r) => ({
        ...r,
        stockValue: round2(r.currentStock * r.avgCost),
        isLow: r.reorderLevel > 0 && r.currentStock <= r.reorderLevel,
      })),
    );
  }),
);

inventoryRouter.post(
  "/items",
  ah(async (req, res) => {
    if (!canWrite(req.auth!.role)) throw forbidden();
    const b = parse(
      itemSchema.extend({
        openingStock: z.coerce.number().min(0).default(0),
        unitCost: z.coerce.number().min(0).default(0),
      }),
      req.body,
    );
    const { openingStock, unitCost, ...data } = b;
    const row = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(I)
        .values({
          ...data,
          tenantId: req.auth!.tenantId!,
          currentStock: openingStock,
          avgCost: unitCost,
        })
        .returning();
      if (openingStock > 0) {
        await tx
          .insert(schema.stockMovements)
          .values({
            tenantId: req.auth!.tenantId!,
            inventoryItemId: row.id,
            type: "ADJUSTMENT",
            quantity: openingStock,
            unitCost,
            note: "Opening stock",
            createdById: req.auth!.id,
          });
      }
      return row;
    });
    res.status(201).json(row);
  }),
);

inventoryRouter.patch(
  "/items/:id",
  ah(async (req, res) => {
    if (!canWrite(req.auth!.role)) throw forbidden();
    const b = parse(itemSchema.partial(), req.body);
    const [row] = await db
      .update(I)
      .set(b)
      .where(and(eq(I.id, req.params.id), eq(I.tenantId, req.auth!.tenantId!)))
      .returning();
    if (!row) throw notFound();
    res.json(row);
  }),
);

const IN_TYPES = ["PURCHASE", "RETURN"];

/** Record purchase / consumption / wastage / adjustment and update stock + weighted average cost. */
inventoryRouter.post(
  "/movements",
  ah(async (req, res) => {
    if (!canWrite(req.auth!.role)) throw forbidden();
    const b = parse(
      z.object({
        inventoryItemId: z.string(),
        type: z.enum([
          "PURCHASE",
          "CONSUMPTION",
          "WASTAGE",
          "ADJUSTMENT",
          "RETURN",
        ]),
        quantity: z.coerce
          .number()
          .refine((n) => n !== 0, "Quantity cannot be 0"),
        unitCost: z.coerce.number().min(0).optional(),
        supplierId: z.string().nullish(),
        canteenId: z.string().nullish(),
        invoiceRef: z.string().nullish(),
        note: z.string().nullish(),
      }),
      req.body,
    );
    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(I)
        .where(
          and(eq(I.id, b.inventoryItemId), eq(I.tenantId, req.auth!.tenantId!)),
        )
        .for("update");
      if (!item) throw notFound("Item not found");
      // ADJUSTMENT may be negative (stock count correction); others are positive quantities
      const q = Math.abs(b.quantity);
      const delta =
        b.type === "ADJUSTMENT"
          ? b.quantity
          : IN_TYPES.includes(b.type)
            ? q
            : -q;
      const newStock = round2(item.currentStock + delta);
      if (newStock < 0)
        throw badRequest(`Only ${item.currentStock} ${item.unit} in stock`);
      let avgCost = item.avgCost;
      if (b.type === "PURCHASE" && b.unitCost !== undefined && newStock > 0) {
        avgCost = round2(
          (item.currentStock * item.avgCost + q * b.unitCost) / newStock,
        );
      }
      await tx
        .update(I)
        .set({ currentStock: newStock, avgCost })
        .where(eq(I.id, item.id));
      const [m] = await tx
        .insert(schema.stockMovements)
        .values({
          ...b,
          quantity: b.type === "ADJUSTMENT" ? b.quantity : q,
          tenantId: req.auth!.tenantId!,
          createdById: req.auth!.id,
        })
        .returning();
      return { movement: m, currentStock: newStock, avgCost };
    });
    audit(req, "stock." + b.type.toLowerCase(), {
      entity: "inventory_item",
      entityId: b.inventoryItemId,
      meta: { qty: b.quantity },
    });
    res.status(201).json(result);
  }),
);

inventoryRouter.get(
  "/movements",
  ah(async (req, res) => {
    const { pageSize, offset } = pageParams(req.query);
    const conds = [eq(schema.stockMovements.tenantId, req.auth!.tenantId!)];
    if (req.query.inventoryItemId)
      conds.push(
        eq(
          schema.stockMovements.inventoryItemId,
          String(req.query.inventoryItemId),
        ),
      );
    if (req.query.type)
      conds.push(eq(schema.stockMovements.type, req.query.type as any));
    const rows = await db.query.stockMovements.findMany({
      where: and(...conds),
      with: {
        item: { columns: { name: true, unit: true } },
        supplier: { columns: { name: true } },
      },
      orderBy: desc(schema.stockMovements.createdAt),
      limit: pageSize,
      offset,
    });
    res.json(rows);
  }),
);
