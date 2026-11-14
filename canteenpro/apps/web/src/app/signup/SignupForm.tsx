"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CheckCircle2 } from "lucide-react";
import type { Plan } from "@/lib/api";
import { CONSOLE_URL, inr, post } from "@/lib/client";

declare global {
  interface Window {
    Razorpay?: any;
  }
}
const loadRzp = () =>
  new Promise<boolean>((res) => {
    if (window.Razorpay) return res(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res(true);
    s.onerror = () => res(false);
    document.body.appendChild(s);
  });

const STEPS = ["Your canteen", "Your account", "Your plan"];

export function SignupForm({ plans, gst }: { plans: Plan[]; gst: number }) {
  const sp = useSearchParams();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    businessName: "",
    canteenName: "",
    clientCompany: "",
    city: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    planCode: sp.get("plan") || "growth",
    billingCycle: (sp.get("cycle") as "MONTHLY" | "YEARLY") || "YEARLY",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{
    token: string;
    trialEndsAt: string;
  } | null>(null);
  useEffect(() => setErr(""), [step]);
  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });
  const plan = plans.find((p) => p.code === f.planCode) ?? plans[0];
  const open = (token: string) =>
    (window.location.href = `${CONSOLE_URL}/impersonate#token=${token}`);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) return setStep(step + 1);
    setBusy(true);
    setErr("");
    try {
      const r = await post<{ token: string; trialEndsAt: string }>(
        "/public/signup",
        f,
      );
      setDone(r);
    } catch (x: any) {
      setErr(x.message);
      if (/email/i.test(x.message)) setStep(1);
    } finally {
      setBusy(false);
    }
  };

  const payNow = async () => {
    if (!done) return;
    setBusy(true);
    setErr("");
    try {
      const co = await post(
        "/public/checkout",
        { planCode: f.planCode, billingCycle: f.billingCycle },
        done.token,
      );
      if (co.testMode) {
        await post(
          "/public/checkout/verify",
          {
            razorpay_order_id: co.orderId,
            razorpay_payment_id: `pay_test_${Date.now()}`,
            razorpay_signature: "",
          },
          done.token,
        );
        return open(done.token);
      }
      if (!(await loadRzp()))
        throw new Error(
          "Could not load the payment window. Check your connection.",
        );
      new window.Razorpay({
        key: co.keyId,
        amount: co.amount,
        currency: "INR",
        order_id: co.orderId,
        name: "CanteenPro",
        description: `${co.quote.plan.name} plan, ${f.billingCycle.toLowerCase()}`,
        prefill: co.prefill,
        theme: { color: "#13203F" },
        handler: async (resp: any) => {
          await post("/public/checkout/verify", resp, done.token);
          open(done.token);
        },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (x: any) {
      setErr(x.message);
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="rounded-4xl border border-steel-300 p-8 md:p-10">
        <CheckCircle2 className="h-10 w-10 text-leaf" />
        <h2 className="mt-4 text-3xl font-extrabold">Your canteen is ready</h2>
        <p className="mt-3 text-navy-600">
          We created <b>{f.businessName}</b> with Breakfast, Lunch, Snacks and
          Dinner sessions. Your free trial runs until{" "}
          <b>
            {new Date(done.trialEndsAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
            })}
          </b>
          .
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => open(done.token)} className="btn-navy">
            Open my dashboard
          </button>
          <button onClick={payNow} disabled={busy} className="btn-primary">
            {busy
              ? "Opening payment…"
              : `Pay now: ${inr((f.billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly) * (1 + gst / 100))}`}
          </button>
        </div>
        <p className="mt-4 text-sm text-navy-400">
          You can also pay any time from Plan & billing inside the dashboard.
        </p>
        {err && (
          <p className="mt-4 text-sm font-semibold text-red-700">{err}</p>
        )}
      </div>
    );

  return (
    <form
      onSubmit={submit}
      className="rounded-4xl border border-steel-300 p-6 md:p-10"
    >
      <ol className="mb-8 flex gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${i <= step ? "bg-navy-800" : "bg-steel"}`}
            />
            <p
              className={`mt-2 text-sm font-semibold ${i === step ? "text-navy-800" : "text-navy-400"}`}
            >
              {s}
            </p>
          </li>
        ))}
      </ol>
      {step === 0 && (
        <div className="grid gap-4">
          <label>
            <span className="label">Business name</span>
            <input
              required
              minLength={2}
              className="field"
              value={f.businessName}
              onChange={set("businessName")}
              placeholder="Dinesh Caterers"
              autoFocus
            />
          </label>
          <label>
            <span className="label">First canteen name</span>
            <input
              className="field"
              value={f.canteenName}
              onChange={set("canteenName")}
              placeholder="Head office cafeteria"
            />
          </label>
          <label>
            <span className="label">
              Company you serve (if you are a caterer)
            </span>
            <input
              className="field"
              value={f.clientCompany}
              onChange={set("clientCompany")}
            />
          </label>
          <label>
            <span className="label">City</span>
            <input className="field" value={f.city} onChange={set("city")} />
          </label>
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="label">Your name</span>
            <input
              required
              minLength={2}
              className="field"
              value={f.ownerName}
              onChange={set("ownerName")}
              autoFocus
            />
          </label>
          <label>
            <span className="label">Work email</span>
            <input
              required
              type="email"
              className="field"
              value={f.email}
              onChange={set("email")}
            />
          </label>
          <label>
            <span className="label">Mobile</span>
            <input
              required
              minLength={8}
              className="field"
              value={f.phone}
              onChange={set("phone")}
              placeholder="+91"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="label">Password</span>
            <input
              required
              minLength={8}
              type="password"
              className="field"
              value={f.password}
              onChange={set("password")}
            />
            <span className="mt-1 block text-sm text-navy-400">
              At least 8 characters
            </span>
          </label>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <div className="mb-4 flex gap-2">
            {(["MONTHLY", "YEARLY"] as const).map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setF({ ...f, billingCycle: c })}
                className={`rounded-full px-4 py-2 text-[15px] font-semibold ${f.billingCycle === c ? "bg-navy-800 text-white" : "bg-steel-50 text-navy-600"}`}
              >
                {c === "YEARLY" ? "Yearly, 2 months free" : "Monthly"}
              </button>
            ))}
          </div>
          {plans.map((p) => (
            <button
              type="button"
              key={p.code}
              onClick={() => setF({ ...f, planCode: p.code })}
              className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left ${f.planCode === p.code ? "border-navy-800 bg-steel-50" : "border-steel"}`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${f.planCode === p.code ? "border-navy-800 bg-navy-800" : "border-steel-300"}`}
              >
                {f.planCode === p.code && (
                  <Check className="h-3.5 w-3.5 text-white" />
                )}
              </span>
              <span className="flex-1">
                <span className="block font-display text-lg font-bold">
                  {p.name}
                </span>
                <span className="text-sm text-navy-400">{p.tagline}</span>
              </span>
              <span className="text-right font-bold">
                {inr(
                  f.billingCycle === "YEARLY" ? p.priceYearly : p.priceMonthly,
                )}
                <span className="block text-xs font-normal text-navy-400">
                  /{f.billingCycle === "YEARLY" ? "year" : "month"} + GST
                </span>
              </span>
            </button>
          ))}
          <p className="pt-2 text-sm text-navy-600">
            You won’t be charged now. The {plan?.trialDays ?? 14}-day trial
            includes every feature of the plan.
          </p>
        </div>
      )}
      {err && <p className="mt-5 text-sm font-semibold text-red-700">{err}</p>}
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
        )}
        <button className="btn-navy flex-1" disabled={busy}>
          {step < 2
            ? "Continue"
            : busy
              ? "Creating your canteen…"
              : "Create my canteen"}
        </button>
      </div>
      <p className="mt-5 text-center text-sm text-navy-400">
        By signing up you agree to our{" "}
        <a href="/p/terms" className="underline">
          terms
        </a>{" "}
        and{" "}
        <a href="/p/privacy-policy" className="underline">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
