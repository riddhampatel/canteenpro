"use client";
import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import type { Plan } from "@/lib/api";
import { inr } from "@/lib/client";

export function PricingTable({
  plans,
  gst = 18,
}: {
  plans: Plan[];
  gst?: number;
}) {
  const [yearly, setYearly] = useState(true);
  const lim = (n: number) => (n < 0 ? "Unlimited" : n.toLocaleString("en-IN"));
  return (
    <div>
      <div className="mb-10 flex justify-center">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="inline-flex rounded-full border border-steel-300 bg-white p-1"
        >
          {[
            ["Monthly", false],
            ["Yearly, 2 months free", true],
          ].map(([l, v]) => (
            <button
              key={String(v)}
              role="radio"
              aria-checked={yearly === v}
              onClick={() => setYearly(v as boolean)}
              className={`rounded-full px-5 py-2 text-[15px] font-semibold transition-colors ${yearly === v ? "bg-navy-800 text-white" : "text-navy-600"}`}
            >
              {l as string}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.code}
            className={`relative flex flex-col rounded-[28px] p-8 ${p.isPopular ? "bg-navy-800 text-white" : "border border-steel-300 bg-white"}`}
          >
            {p.isPopular && (
              <span className="absolute -top-3.5 left-8 rounded-full bg-turmeric px-3 py-1 text-sm font-bold text-navy-900">
                Most chosen
              </span>
            )}
            <h3
              className={`text-2xl font-extrabold ${p.isPopular ? "text-white" : ""}`}
            >
              {p.name}
            </h3>
            <p
              className={`mt-1 text-[15px] ${p.isPopular ? "text-navy-200" : "text-navy-400"}`}
            >
              {p.tagline}
            </p>
            <div className="mt-6 flex items-end gap-1.5">
              <span className="font-display text-5xl font-extrabold tracking-tight">
                {inr(yearly ? p.priceYearly / 12 : p.priceMonthly)}
              </span>
              <span
                className={`mb-1.5 text-[15px] ${p.isPopular ? "text-navy-200" : "text-navy-400"}`}
              >
                /month
              </span>
            </div>
            <p
              className={`text-sm ${p.isPopular ? "text-navy-200" : "text-navy-400"}`}
            >
              {yearly
                ? `${inr(p.priceYearly)} billed yearly`
                : "Billed monthly"}
              , plus {gst}% GST
            </p>
            <p
              className={`mt-4 text-sm font-semibold ${p.isPopular ? "text-turmeric" : "text-navy-600"}`}
            >
              {lim(p.maxCanteens)} canteen{p.maxCanteens === 1 ? "" : "s"},{" "}
              {lim(p.maxEmployees)} employees, {lim(p.maxStaffUsers)} staff
              logins
            </p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-2.5 text-[15px]">
                  <Check
                    className={`mt-1 h-4 w-4 shrink-0 ${p.isPopular ? "text-turmeric" : "text-leaf"}`}
                  />
                  {h}
                </li>
              ))}
            </ul>
            <Link
              href={`/signup?plan=${p.code}&cycle=${yearly ? "YEARLY" : "MONTHLY"}`}
              className={`mt-8 ${p.isPopular ? "btn-primary" : "btn-navy"}`}
            >
              Start {p.trialDays}-day free trial
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
