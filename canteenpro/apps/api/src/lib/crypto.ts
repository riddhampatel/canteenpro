//a toolbox of encryption, hashing, and token functions used across the app.

import crypto from "node:crypto";
import { env } from "../config/env";

function key(): Buffer {
  if (env.ENCRYPTION_KEY) {
    const k = Buffer.from(env.ENCRYPTION_KEY, "base64");
    if (k.length === 32) return k;
  }
  // Dev fallback: derive from JWT secret (set ENCRYPTION_KEY in production!)
  return crypto.createHash("sha256").update(env.JWT_SECRET).digest();
}

/** AES-256-GCM → "iv.tag.cipher" (base64url) */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc]
    .map((b) => b.toString("base64url"))
    .join(".");
}

export function decrypt(payload: string): string {
  const [iv, tag, enc] = payload
    .split(".")
    .map((s) => Buffer.from(s, "base64url"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

export const sha256 = (s: string) =>
  crypto.createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 24) =>
  crypto.randomBytes(bytes).toString("base64url");
export const hmac = (secret: string, data: string) =>
  crypto.createHmac("sha256", secret).update(data).digest("hex");
export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a),
    bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}
export const randomPin = () =>
  String(crypto.randomInt(0, 10000)).padStart(4, "0");
