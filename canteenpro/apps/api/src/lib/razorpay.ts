import { getSettings } from "./settings";
import { hmac, safeEqual } from "./crypto";
import { env, isProd } from "../config/env";

export async function razorpayKeys() {
  const s = await getSettings([
    "razorpay.keyId",
    "razorpay.keySecret",
    "razorpay.webhookSecret",
  ]);
  return {
    keyId: s["razorpay.keyId"],
    keySecret: s["razorpay.keySecret"],
    webhookSecret: s["razorpay.webhookSecret"],
  };
}

export const testModeAllowed = async () => {
  const k = await razorpayKeys();
  return !k.keyId && env.PAYMENTS_TEST_MODE && !isProd;
};

/** Create a Razorpay order. amount in rupees. */
export async function createRazorpayOrder(
  amount: number,
  receipt: string,
  notes: Record<string, string>,
) {
  const { keyId, keySecret } = await razorpayKeys();
  if (!keyId || !keySecret) {
    if (await testModeAllowed())
      return {
        id: `order_test_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency: "INR",
        test: true,
      };
    throw new Error(
      "Razorpay is not configured. Add keys in Super Admin → Settings → Payments.",
    );
  }
  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt,
      notes,
    }),
  });
  if (!r.ok) throw new Error("Razorpay order failed: " + (await r.text()));
  return (await r.json()) as {
    id: string;
    amount: number;
    currency: string;
    test?: boolean;
  };
}

export async function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
) {
  const { keySecret } = await razorpayKeys();
  if (!keySecret) return await testModeAllowed();
  return safeEqual(hmac(keySecret, `${orderId}|${paymentId}`), signature);
}

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
) {
  const { webhookSecret } = await razorpayKeys();
  if (!webhookSecret) return false;
  return safeEqual(hmac(webhookSecret, rawBody), signature);
}