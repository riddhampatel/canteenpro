export const inr = (n: number | null | undefined, digits = 0) =>
  "₹" +
  Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits === 0 ? 2 : digits,
  });
export const num = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-IN");
export const dt = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export const dOnly = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
export const tOnly = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};
export const addDays = (date: string, n: number) => {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};
export const weekday = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
  });
export const dayMonth = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
export const initials = (name?: string | null) =>
  (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
export const titleCase = (s?: string | null) =>
  (s ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const PAY_MODES = [
  "WALLET",
  "PAYROLL",
  "COMPANY",
  "CASH",
  "UPI",
  "CARD",
  "COMPLIMENTARY",
] as const;
export const FOOD_TYPES = ["VEG", "NON_VEG", "EGG", "VEGAN", "JAIN"] as const;
export const SESSION_COLORS: Record<string, string> = {
  Breakfast: "#2563eb",
  Lunch: "#16a34a",
  Snacks: "#f59e0b",
  Dinner: "#8b5cf6",
  "À la carte": "#64748b",
};
export const sessionColor = (name: string, i = 0) =>
  SESSION_COLORS[name] ?? ["#0ea5e9", "#e11d48", "#14b8a6", "#a16207"][i % 4];
