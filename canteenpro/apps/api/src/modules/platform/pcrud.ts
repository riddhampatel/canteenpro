import { Router } from "express";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { ZodObject, ZodRawShape } from "zod";
import { db } from "../../db";
import { ah, notFound, pageParams, parse } from "../../lib/http";
import { audit } from "../../lib/audit";

/** Platform-level CRUD (no tenant scoping) */
export function pcrud(o: {
  name: string;
  table: PgTable & { id: PgColumn };
  schema: ZodObject<ZodRawShape>;
  search?: PgColumn[];
  filters?: Record<string, PgColumn>;
  orderBy?: PgColumn;
  orderDir?: "asc" | "desc";
  transform?: (
    data: Record<string, any>,
    isCreate: boolean,
  ) => Record<string, any> | Promise<Record<string, any>>;
}) {
  const r = Router();
  const t = o.table as any;


  r.get(
    "/",
    ah(async (req, res) => {
      const { page, pageSize, offset } = pageParams(req.query);
      const conds: SQL[] = [];
      const q = String(req.query.q ?? "").trim();
      if (q && o.search)
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
      const where = conds.length ? and(...conds) : undefined;
      const ord = o.orderBy
        ? o.orderDir === "asc"
          ? asc(o.orderBy)
          : desc(o.orderBy)
        : desc(o.table.id);
        
      const [items, [{ c }]] = await Promise.all([
        db
          .select()
          .from(o.table)
          .where(where)
          .orderBy(ord)
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
        .where(eq(o.table.id, req.params.id));
      if (!row) throw notFound();
      res.json(row);
    }),
  );
  r.post(
    "/",
    ah(async (req, res) => {
      let data: Record<string, any> = parse(o.schema, req.body);
      if (o.transform) data = await o.transform(data, true);
      const [row] = (await db.insert(t).values(data).returning()) as any[];
      audit(req, `platform.${o.name}.create`, {
        entity: o.name,
        entityId: (row as any).id,
      });
      res.status(201).json(row);
    }),
  );
  r.patch(
    "/:id",
    ah(async (req, res) => {
      let data: Record<string, any> = parse(o.schema.partial(), req.body);
      if (o.transform) data = await o.transform(data, false);
      const [row] = await db
        .update(t)
        .set(data)
        .where(eq(o.table.id, req.params.id))
        .returning();
      if (!row) throw notFound();
      audit(req, `platform.${o.name}.update`, {
        entity: o.name,
        entityId: req.params.id,
      });
      res.json(row);
    }),
  );
  r.delete(
    "/:id",
    ah(async (req, res) => {
      const [row] = (await db
        .delete(t)
        .where(eq(o.table.id, req.params.id))
        .returning()) as any[];
      if (!row) throw notFound();
      audit(req, `platform.${o.name}.delete`, {
        entity: o.name,
        entityId: req.params.id,
      });
      res.json({ ok: true });
    }),
  );
  return r;
}
