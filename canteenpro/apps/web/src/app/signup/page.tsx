import { Suspense } from "react";
import type { Metadata } from "next";
import { getPlans, getSite } from "@/lib/api";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "Start your free trial | CanteenPro",
  description:
    "Create your CanteenPro account and start a 14-day free trial of canteen management software. No card needed.",
  alternates: { canonical: "/signup" },
};

export default async function Signup() {
  const [plans, site] = await Promise.all([getPlans(), getSite()]);
  return (
    <div className="wrap grid gap-14 py-14 md:py-20 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="text-4xl font-extrabold md:text-[56px]">
          Start serving from CanteenPro today
        </h1>
        <p className="mt-4 text-lg text-navy-600">
          14 days free. No card needed.
        </p>
        <ul className="mt-10 space-y-4 text-lg">
          {[
            "Breakfast, lunch, snacks and dinner sessions are created for you",
            "Import employees from Excel in one go",
            "Print the counter QR and start serving",
            "Share the employee app with your team",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-turmeric" />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <Suspense>
        <SignupForm plans={plans} gst={site.gstPercent} />
      </Suspense>
    </div>
  );
}
