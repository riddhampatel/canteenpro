import type { Response } from "express";

const esc = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(
  rows: Record<string, unknown>[],
  columns?: { key: string; label: string }[],
) {
  const cols =
    columns ?? Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }));
  const head = cols.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => cols.map((c) => esc(r[c.key])).join(","))
    .join("\n");
  return head + "\n" + body;
}

export function sendCsv(
  res: Response,
  filename: string,
  rows: Record<string, unknown>[],
  columns?: { key: string; label: string }[],
) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("﻿" + toCsv(rows, columns));
}
