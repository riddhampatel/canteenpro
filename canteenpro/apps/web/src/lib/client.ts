"use client";
export const PUBLIC_API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
export const CONSOLE_URL =
  process.env.NEXT_PUBLIC_CONSOLE_URL || "http://localhost:5173";

export async function post<T = any>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  const r = await fetch(PUBLIC_API + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    let m = d.error || "Something went wrong. Please try again.";
    if (d.code === "VALIDATION" && d.details?.fieldErrors) {
      const f = Object.entries(
        d.details.fieldErrors as Record<string, string[]>,
      )[0];
      if (f) m = `${f[0]}: ${f[1][0]}`;
    }
    throw new Error(m);
  }
  return d as T;
}
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
