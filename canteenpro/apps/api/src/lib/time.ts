import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
export { dayjs };

export const DEFAULT_TZ = "Asia/Kolkata";

/** YYYY-MM-DD in the given timezone */
export const localDate = (tz = DEFAULT_TZ, d: Date | string = new Date()) =>
  dayjs(d).tz(tz).format("YYYY-MM-DD");
/** HH:mm in the given timezone */
export const localTime = (tz = DEFAULT_TZ, d: Date = new Date()) =>
  dayjs(d).tz(tz).format("HH:mm");

export function addDays(dateStr: string, n: number) {
  return dayjs(dateStr).add(n, "day").format("YYYY-MM-DD");
}

/** Resolve a range keyword into inclusive [from, to] local date strings. */
export function resolveRange(
  range: string | undefined,
  tz = DEFAULT_TZ,
  from?: string,
  to?: string,
) {
  const today = localDate(tz);
  if (from && to) return { from, to };
  switch (range) {
    case "week":
      return { from: addDays(today, -6), to: today };
    case "month":
      return { from: addDays(today, -29), to: today };
    case "thisMonth":
      return {
        from: dayjs(today).startOf("month").format("YYYY-MM-DD"),
        to: today,
      };
    case "yesterday":
      return { from: addDays(today, -1), to: addDays(today, -1) };
    default:
      return { from: today, to: today };
  }
}

export function monthRange(month: string /* YYYY-MM */) {
  const start = dayjs(month + "-01");
  return {
    from: start.format("YYYY-MM-DD"),
    to: start.endOf("month").format("YYYY-MM-DD"),
  };
}

export function datesBetween(from: string, to: string) {
  const out: string[] = [];
  let d = dayjs(from);
  const end = dayjs(to);
  while (!d.isAfter(end)) {
    out.push(d.format("YYYY-MM-DD"));
    d = d.add(1, "day");
  }
  return out;
}

/** "07:30" <= t < "10:00" (handles sessions crossing midnight) */
export function inWindow(t: string, start: string, end: string) {
  return start <= end ? t >= start && t < end : t >= start || t < end;
}
