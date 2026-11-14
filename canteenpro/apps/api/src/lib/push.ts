import { getSettings } from "./settings";
/**
 * OneSignal push. Mobile app calls OneSignal.login(<externalId>) where
 *   employees → "emp_<employeeId>", staff → "staff_<staffUserId>"
 * and adds tags { tenantId, canteenId, role }
 */
export async function sendPush(opts: {
  title: string;
  body: string;
  externalIds?: string[];
  filters?: { field: "tag"; key: string; relation: "="; value: string }[];
  data?: Record<string, unknown>;
}): Promise<"SENT" | "FAILED" | "SKIPPED"> {

  const s = await getSettings(["onesignal.appId", "onesignal.restApiKey"]);

  if (!s["onesignal.appId"] || !s["onesignal.restApiKey"]) return "SKIPPED";
  if (!opts.externalIds?.length && !opts.filters?.length) return "SKIPPED";
  
  const payload: Record<string, unknown> = {
    app_id: s["onesignal.appId"],
    headings: { en: opts.title },
    contents: { en: opts.body },
    data: opts.data ?? {},
    target_channel: "push",
  };
  if (opts.externalIds?.length)
    payload.include_aliases = { external_id: opts.externalIds.slice(0, 2000) };
  else {
    const f: unknown[] = [];
    opts.filters!.forEach((x, i) => {
      if (i) f.push({ operator: "AND" });
      f.push(x);
    });
    payload.filters = f;
  }
  try {
    const r = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${s["onesignal.restApiKey"]}`,
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      console.warn("[push] OneSignal error", r.status, await r.text());
      return "FAILED";
    }
    return "SENT";
  } catch (e) {
    console.warn("[push] failed", e);
    return "FAILED";
  }
}
export const empExternalId = (id: string) => `emp_${id}`;
export const staffExternalId = (id: string) => `staff_${id}`;
