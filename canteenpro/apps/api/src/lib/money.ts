export const round2 = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export const num = (v: unknown) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);
/** GST portion inside a tax-inclusive amount */
export const inclusiveTax = (total: number, pct: number) =>
  round2((total * pct) / (100 + pct));
export const slugify = (s: string) =>
  s 
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
