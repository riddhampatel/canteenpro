import { Router, type Request } from "express";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { ZodObject, ZodRawShape } from "zod";
import { db } from "../../db";
import { ah, forbidden, notFound, pageParams, parse } from "../../lib/http";
import { allowedCanteens, assertCanteenAccess } from "../../middleware/auth";
import { audit } from "../../lib/audit";
import { sendCsv } from "../../lib/csv";

interface CrudOptions {
  name: string; // for audit e.g. "supplier"
  table: PgTable & { id: PgColumn; tenantId: PgColumn; canteenId?: PgColumn };
  schema: ZodObject<ZodRawShape>;
  search?: PgColumn[];
  orderBy?: PgColumn;
  orderDir?: "asc" | "desc";
  /** filters allowed from query string: ?status=ACTIVE */
  filters?: Record<string, PgColumn>;
  dateColumn?: PgColumn; // enables ?from&to
  writeRoles?: string[];
  beforeSave?: (
    data: Record<string, any>,
    req: Request,
    isCreate: boolean,
  ) => Promise<void> | void;
  csvColumns?: { key: string; label: string }[];
}

/** Tenant-scoped CRUD router for simple back-office tables. */
export function crud(o: CrudOptions) {
  const r = Router();
  const t = o.table as any;
  const canWrite = (req: Request) =>
    !o.writeRoles || o.writeRoles.includes(req.auth!.role!);

  const scope = (req: Request): SQL[] => {
    const conds: SQL[] = [eq(o.table.tenantId, req.auth!.tenantId!)];
    if (o.table.canteenId) {
      const allowed = allowedCanteens(req);
      if (req.query.canteenId)
        conds.push(eq(o.table.canteenId, String(req.query.canteenId)));
      else if (allowed) conds.push(inArray(o.table.canteenId, allowed));
    }
    return conds;
  };

  r.get(
    "/",
    ah(async (req, res) => {
      const { page, pageSize, offset } = pageParams(req.query);
      const conds = scope(req);
      const q = String(req.query.q ?? "").trim();
      if (q && o.search?.length)
        conds.push(or(...o.search.map((c) => ilike(c, `%${q}%`)))!);
      for (const [k, col] of Object.entries(o.filters ?? {})) {
        const v = req.query[k];
        if (v !== undefined && v !== "")
          conds.push(
            v === "true" || v === "false"
              ? eq(col, v === "true")
              : eq(col, String(v)),
          );
      }
      if (o.dateColumn && req.query.from)
        conds.push(sql`${o.dateColumn} >= ${String(req.query.from)}`);
      if (o.dateColumn && req.query.to)
        conds.push(sql`${o.dateColumn} <= ${String(req.query.to)}`);
      const where = and(...conds);
      const order = o.orderBy
        ? o.orderDir === "asc"
          ? asc(o.orderBy)
          : desc(o.orderBy)
        : desc(o.table.id);
      if (req.query.format === "csv") {
        const rows = await db
          .select()
          .from(o.table)
          .where(where)
          .orderBy(order)
          .limit(50_000);
        return sendCsv(res, `${o.name}s.csv`, rows as any, o.csvColumns);
      }
      const [items, [{ c }]] = await Promise.all([
        db
          .select()
          .from(o.table)
          .where(where)
          .orderBy(order)
          .limit(pageSize)
          .offset(offset),
        db
          .select({ c: sql<number>`count(*)::int` })
          .from(o.table)
          .where(where),
      ]);
      res.json({ items, total: c, page, pageSize });
    }),
  );

  r.get(
    "/:id",
    ah(async (req, res) => {
      const [row] = await db
        .select()
        .from(o.table)
        .where(and(eq(o.table.id, req.params.id), ...scope(req)));
      if (!row) throw notFound();
      res.json(row);
    }),
  );

  r.post(
    "/",
    ah(async (req, res) => {
      if (!canWrite(req)) throw forbidden();
      const data: Record<string, any> = parse(o.schema, req.body);
      if (o.table.canteenId && data.canteenId)
        assertCanteenAccess(req, data.canteenId);
      await o.beforeSave?.(data, req, true);
      const [row] = (await db
        .insert(t)
        .values({ ...data, tenantId: req.auth!.tenantId })
        .returning()) as any[];
      audit(req, `${o.name}.create`, {
        entity: o.name,
        entityId: (row as any).id,
      });
      res.status(201).json(row);
    }),
  );

  r.patch(
    "/:id",
    ah(async (req, res) => {
      if (!canWrite(req)) throw forbidden();
      const data: Record<string, any> = parse(o.schema.partial(), req.body);
      if (o.table.canteenId && data.canteenId)
        assertCanteenAccess(req, data.canteenId);
      await o.beforeSave?.(data, req, false);
      const [row] = await db
        .update(t)
        .set(data)
        .where(and(eq(o.table.id, req.params.id), ...scope(req)))
        .returning();
      if (!row) throw notFound();
      audit(req, `${o.name}.update`, {
        entity: o.name,
        entityId: req.params.id,
      });
      res.json(row);
    }),
  );

  r.delete(
    "/:id",
    ah(async (req, res) => {
      if (!canWrite(req)) throw forbidden();
      const [row] = (await db
        .delete(t)
        .where(and(eq(o.table.id, req.params.id), ...scope(req)))
        .returning()) as any[];
      if (!row) throw notFound();
      audit(req, `${o.name}.delete`, {
        entity: o.name,
        entityId: req.params.id,
      });
      res.json({ ok: true });
    }),
  );
  return r;
}
