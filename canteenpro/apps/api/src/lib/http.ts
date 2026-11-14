import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodTypeAny, type z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export const badRequest = (m: string, code?: string) =>
  new HttpError(400, m, code);
export const unauthorized = (m = "Unauthorized") =>
  new HttpError(401, m, "UNAUTHORIZED");
export const forbidden = (m = "Forbidden") =>
  new HttpError(403, m, "FORBIDDEN");
export const notFound = (m = "Not found") => new HttpError(404, m, "NOT_FOUND");
export const conflict = (m: string, code = "CONFLICT") =>
  new HttpError(409, m, code);

/** Wrap an async route so thrown errors reach the error middleware. */
export const ah =
  (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
  ): RequestHandler =>
  (req, res, next) =>
    fn(req, res, next).catch(next);

/** Parse & validate body/query with zod. */
export function parse<T extends ZodTypeAny>(
  schema: T,
  data: unknown,
): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success)
    throw new HttpError(
      422,
      "Validation failed",
      "VALIDATION",
      r.error.flatten(),
    );
  return r.data;
}

export function pageParams(q: Record<string, unknown>) {
  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.min(500, Math.max(1, Number(q.pageSize) || 25));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ error: err.message, code: err.code, details: err.details });
  }
  if (err instanceof ZodError) {
    return res
      .status(422)
      .json({
        error: "Validation failed",
        code: "VALIDATION",
        details: err.flatten(),
      });
  }
  // Postgres unique violation
  const pgCode = err?.code ?? err?.cause?.code;
  if (pgCode === "23505") {
    const detail = err?.detail ?? err?.cause?.detail;
    return res
      .status(409)
      .json({
        error: "Record already exists",
        code: "DUPLICATE",
        details: detail,
      });
  }
  if (pgCode === "23503") {
    return res
      .status(409)
      .json({
        error: "Record is referenced by other data",
        code: "FK_VIOLATION",
      });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
