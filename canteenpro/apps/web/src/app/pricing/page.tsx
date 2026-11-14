import type { Metadata } from "next";
import { getFaqs, getPlans, getSite } from "@/lib/api";
import { PricingTable } from "@/components/PricingTable";
import { Faq } from "@/components/Faq";
import { CtaBand } from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "Pricing -- Canteen Management Software | CanteenPro",
  description:
    "Simple per-business pricing for canteen management software. Start with a 14-day free trial. Pay monthly or yearly by UPI, card or net banking.",
  alternates: { canonical: "/pricing" },
};
export const revalidate = 300;

export default async function Pricing() {
  const [plans, faqs, site] = await Promise.all([
    getPlans(),
    getFaqs("pricing"),
    getSite(),
  ]);
  const compare: [string, (p: any) => string][] = [
    [
      "Canteens",
      (p) => (p.maxCanteens < 0 ? "Unlimited" : String(p.maxCanteens)),
    ],
    [
      "Employees",
      (p) =>
        p.maxEmployees < 0
          ? "Unlimited"
          : p.maxEmployees.toLocaleString("en-IN"),
    ],
    [
      "Staff logins",
      (p) => (p.maxStaffUsers < 0 ? "Unlimited" : String(p.maxStaffUsers)),
    ],
    [
      "Inventory & expenses",
      (p) => (p.features?.inventory === false ? "—" : "Included"),
    ],
    [
      "Kitchen staff attendance",
      (p) => (p.features?.workforce === false ? "—" : "Included"),
    ],
    [
      "Biometric devices",
      (p) => (p.features?.biometric === false ? "—" : "Included"),
    ],
    ["Integration API", (p) => (p.features?.api ? "Included" : "—")],
  ];
  return (
    <>
      <section className="bg-steel-50 py-16 md:py-24">
        <div className="wrap">
          <h1 className="text-center text-4xl font-extrabold md:text-[60px]">
            Pricing that fits a canteen budget
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-navy-600">
            One price for your business, whatever the meal count. Try any plan
            free for 14 days.
          </p>
          <div className="mt-14">
            <PricingTable plans={plans} gst={site.gstPercent} />
          </div>
        </div>
      </section>
      <section className="wrap py-20">
        <h2 className="text-3xl font-extrabold">Compare plans</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-160 text-left">
            <thead>
              <tr className="border-b-2 border-navy-800">
                <th className="py-3" />
                {plans.map((p) => (
                  <th key={p.code} className="py-3 font-display text-xl">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compare.map(([l, fn]) => (
                <tr key={l} className="border-b border-steel">
                  <td className="py-3.5 font-semibold">{l}</td>
                  {plans.map((p) => (
                    <td key={p.code} className="py-3.5 text-navy-600">
                      {fn(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-[15px] text-navy-600">
          All plans include menu planning, QR meal tracking, POS, wallets,
          payroll deduction, guests, reports, the mobile app and email support.
        </p>
      </section>
      {faqs.length > 0 && (
        <section className="wrap grid gap-10 pb-24 md:grid-cols-[1fr_1.6fr]">
          <h2 className="text-3xl font-extrabold">Billing questions</h2>
          <Faq items={faqs.map((f) => ({ q: f.question, a: f.answer }))} />
        </section>
      )}
      <CtaBand />
    </>
  );
}
