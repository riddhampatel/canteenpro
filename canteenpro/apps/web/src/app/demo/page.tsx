import type { Metadata } from "next";
import { LeadForm } from "@/components/LeadForm";

export const metadata: Metadata = {
  title: "Book a Demo – Canteen Management Software | CanteenPro",
  description:
    "See CanteenPro running a real canteen: menu planning, QR meal serving, wallets, guests and month-end billing. 30-minute online demo.",
  alternates: { canonical: "/demo" },
};

export default function Demo() {
  return (
    <div className="bg-steel-50">
      <div className="wrap grid gap-14 py-16 md:grid-cols-[1fr_1.3fr] md:py-24">
        <div>
          <h1 className="text-4xl font-extrabold md:text-[56px]">
            See it run your canteen
          </h1>
          <p className="mt-4 text-lg text-navy-600">
            A 30-minute online walkthrough using your own sessions and prices.
          </p>
          <ol className="mt-10 space-y-6">
            {[
              "We set up a sample canteen with your timings and pricing",
              "You serve meals by QR and POS, and see the live dashboard",
              "We generate a client statement and payroll sheet together",
            ].map((t, i) => (
              <li key={t} className="flex gap-4 text-lg">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-800 font-display font-bold text-turmeric">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-4xl bg-white p-6 md:p-10">
          <LeadForm type="demo" />
        </div>
      </div>
    </div>
  );
}
