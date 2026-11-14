import { hmac } from "../lib/crypto";

/**
 * Daily counter QR (printed / shown on a screen at the canteen counter).
 * Employees scan it from the mobile app to log their meal.
 * Format: CPQ1.<canteenId>.<YYYY-MM-DD>.<sig>
 * The signature changes every day, so yesterday's photo of the QR won't work.
 */
export const counterQr = (canteenId: string, qrSecret: string, date: string) =>
  `CPQ1.${canteenId}.${date}.${hmac(qrSecret, `${canteenId}.${date}`).slice(0, 20)}`;

export function parseCounterQr(code: string) {
  const m = /^CPQ1\.([a-z0-9]+)\.(\d{4}-\d{2}-\d{2})\.([a-f0-9]{20})$/.exec(
    code.trim(),
  );
  if (!m) return null;
  return { canteenId: m[1], date: m[2], sig: m[3] };
}

/** Employee personal QR shown in the app; cashier scans it. Format: CPE1.<qrToken> */
export const employeeQr = (qrToken: string) => `CPE1.${qrToken}`;
export const parseEmployeeQr = (code: string) => {
  const m = /^CPE1\.([a-z0-9]+)$/.exec(code.trim());
  return m ? m[1] : null;
};
