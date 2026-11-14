import type { Request } from "express";
import { db, schema } from "../db";

export function audit(
  req: Request | null,
  action: string,
  data: {
    entity?: string;
    entityId?: string;
    meta?: unknown;
    tenantId?: string | null;
  } = {},
) {
  const actor = req?.auth;


  // insert auditlogs row in table 
  return db
    .insert(schema.auditLogs)
    .values({
      tenantId: data.tenantId ?? actor?.tenantId ?? null,
      actorType: actor ? actor.typ.toUpperCase() : "SYSTEM",
      actorId: actor?.id ?? null,
      action,
      entity: data.entity,
      entityId: data.entityId,
      meta: (data.meta ?? null) as any,
      ip: req?.ip,
    })
    .catch((e) => console.warn("[audit] failed", e?.message));
}
