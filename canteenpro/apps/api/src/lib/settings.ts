import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../db";
import { env } from "../config/env";
import { decrypt, encrypt } from "./crypto";

/** Which setting keys are secrets (stored encrypted, masked in API responses). */
export const SECRET_KEYS = new Set([
  "razorpay.keySecret",
  "razorpay.webhookSecret",
  "onesignal.restApiKey",
  "smtp.pass",
]);

/** Env fallbacks so the platform works before Super Admin configures anything. */
const ENV_FALLBACK: Record<string, () => string> = {
  "razorpay.keyId": () => env.RAZORPAY_KEY_ID,
  "razorpay.keySecret": () => env.RAZORPAY_KEY_SECRET,
  "razorpay.webhookSecret": () => env.RAZORPAY_WEBHOOK_SECRET,
  "onesignal.appId": () => env.ONESIGNAL_APP_ID,
  "onesignal.restApiKey": () => env.ONESIGNAL_REST_API_KEY,
  "smtp.host": () => env.SMTP_HOST,
  "smtp.port": () => String(env.SMTP_PORT),
  "smtp.secure": () => String(env.SMTP_SECURE),
  "smtp.user": () => env.SMTP_USER,
  "smtp.pass": () => env.SMTP_PASS,
  "smtp.from": () => env.SMTP_FROM,
  "brand.name": () => "CanteenPro",
  "tax.gstPercent": () => "18",
};

let cache: { at: number; map: Map<string, string> } | null = null;
const TTL = 30_000; //30 sec

async function load() {
  if (cache && Date.now() - cache.at < TTL) return cache.map;
  const rows = await db.select().from(schema.platformSettings);
  const map = new Map<string, string>();

  for (const r of rows) {
    try {
      map.set(r.key, r.isSecret ? decrypt(r.value) : r.value);
    } catch {
      console.warn(
        `[settings] could not decrypt ${r.key} (ENCRYPTION_KEY changed?)`,
      );
    }
  }
  cache = { at: Date.now(), map };
  return map;
}

export async function getSetting(key: string): Promise<string> {
  const map = await load();
  const v = map.get(key);
  if (v !== undefined && v !== "") return v;
  return ENV_FALLBACK[key]?.() ?? "";
}

export async function getSettings(keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = await getSetting(k);
  return out;
}

export async function setSettings(
  values: Record<string, string | null | undefined>,
) {
  for (const [key, raw] of Object.entries(values)) {
    if (raw === undefined) continue;
    const isSecret = SECRET_KEYS.has(key);
    if (raw === null || raw === "") {
      await db
        .delete(schema.platformSettings)
        .where(eq(schema.platformSettings.key, key));
      continue;
    }
    // Masked value sent back unchanged from UI → keep existing
    if (isSecret && /^•+/.test(raw)) continue;
    const value = isSecret ? encrypt(raw) : raw;
    await db
      .insert(schema.platformSettings)
      .values({ key, value, isSecret })
      .onConflictDoUpdate({
        target: schema.platformSettings.key,
        set: { value, isSecret },
      });
  }
  cache = null;
}

/** All settings for the Super Admin UI, with secrets masked. */
export async function listSettingsMasked(prefixes?: string[]) {
  const rows = await db.select().from(schema.platformSettings);
  const map = await load();
  const out: Record<
    string,
    { value: string; isSecret: boolean; source: "db" | "env" | "empty" }
  > = {};
  const keys = new Set([
    ...rows.map((r) => r.key),
    ...Object.keys(ENV_FALLBACK),
  ]);
  for (const k of keys) {
    if (prefixes && !prefixes.some((p) => k.startsWith(p))) continue;
    const isSecret = SECRET_KEYS.has(k);
    const dbVal = map.get(k);
    const val = dbVal ?? ENV_FALLBACK[k]?.() ?? "";
    out[k] = {
      value: isSecret && val ? "••••••••" + val.slice(-4) : val,
      isSecret,
      source: dbVal ? "db" : val ? "env" : "empty",
    };
  }
  return out;
}

export async function deleteSettings(keys: string[]) {
  await db
    .delete(schema.platformSettings)
    .where(inArray(schema.platformSettings.key, keys));
  cache = null;
}