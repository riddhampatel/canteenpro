import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "About CanteenPro",
  description:
    "CanteenPro is built by Steigern Tech to help canteen owners and caterers run their business without registers and spreadsheets.",
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <>
      <PageHero
        title="We build software for the people who feed India's workforce"
        intro="Canteens run on early mornings, tight margins and a lot of paper. CanteenPro takes the paper away."
      />
      <div className="wrap grid gap-12 py-20 md:grid-cols-2">
        <div className="space-y-5 text-lg text-navy-600">
          <p>
            CanteenPro started with a caterer who ran company canteens on
            registers and Excel. Meal counts were disputed every month, guests
            went unbilled and the kitchen cooked for the full headcount every
            day.
          </p>
          <p>
            We built a system around the meal record itself: who ate, when, and
            who pays. Everything else — menus, wallets, payroll, client
            statements, waste — hangs off that one record.
          </p>
        </div>
        <div className="space-y-5 text-lg text-navy-600">
          <p>
            CanteenPro is developed by{" "}
            <b className="text-navy-800">Steigern Tech LLP</b>, a software
            company building web, mobile and AI products for businesses in India
            and Europe.
          </p>
          <p>
            We keep pricing per business, not per meal, and we answer support on
            WhatsApp — because canteen problems happen at 12:30, not during
            office hours.
          </p>
        </div>
      </div>{" "}
      <CtaBand />
    </>
  );
}
