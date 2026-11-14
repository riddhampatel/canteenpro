"use client";
import { useState } from "react";
import { Check } from "lucide-react";

const ROLES = {
  Owner: {
    lead: "See every canteen, every rupee.",
    items: [
      "Live dashboard across all your canteens",
      "Client billing statements and P&L every month",
      "Plan, billing and team permissions in one place",
      "Evening email summary of meals, collections and waste",
    ],
  },
  Manager: {
    lead: "Run the day without the paperwork.",
    items: [
      "Weekly menu planner with sold-out toggles",
      "Opt-in headcount forecast for the kitchen",
      "Employees, wallets, guests and announcements",
      "Inventory, waste and kitchen staff attendance",
    ],
  },
  Cashier: {
    lead: "Serve a queue in seconds.",
    items: [
      "Scan QR or ID card, hear the confirmation beep",
      "À-la-carte POS with receipt printing",
      "Wallet, UPI, cash, card or company-paid",
      "Register a guest and bill them in one step",
    ],
  },
  Employee: {
    lead: "Know what’s cooking. Skip the coupon.",
    items: [
      "Today’s menu with photos and veg marks",
      "Tap “eating today” before the cut-off",
      "Scan the counter QR to get served",
      "Wallet balance, meal history and ratings",
    ],
  },
} as const;
type R = keyof typeof ROLES;

export function RoleTabs() {
  const [r, setR] = useState<R>("Owner");
  return (
    <div className="grid gap-10 md:grid-cols-[280px_1fr]">
      <div
        role="tablist"
        aria-label="Roles"
        className="flex gap-2 overflow-x-auto md:flex-col"
      >
        {(Object.keys(ROLES) as R[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={r === k}
            onClick={() => setR(k)}
            className={`whitespace-nowrap rounded-2xl px-5 py-4 text-left font-display text-xl font-bold transition-colors ${r === k ? "bg-navy-800 text-white" : "text-navy-400 hover:bg-steel-50 hover:text-navy-800"}`}
          >
            {k}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="rounded-[28px] bg-steel-50 p-8 md:p-12">
        <p className="font-display text-3xl font-extrabold md:text-4xl">
          {ROLES[r].lead}
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {ROLES[r].items.map((i) => (
            <li key={i} className="flex gap-3 text-[17px]">
              <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-turmeric">
                <Check className="h-3 w-3 text-navy-900" />
              </span>
              {i}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
