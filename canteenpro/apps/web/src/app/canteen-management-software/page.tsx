import Link from "next/link";
import type { Metadata } from "next";
import { FEATURES } from "@/lib/content";
import { Faq } from "@/components/Faq";
import { CtaBand } from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "Canteen Management Software in India – Complete System | CanteenPro",
  description:
    "What a canteen management system does, which features matter for corporate, factory and institutional canteens, and how CanteenPro handles menus, meal tracking, billing and reports.",
  alternates: { canonical: "/canteen-management-software" },
};

const faqs = [
  {
    q: "What is canteen management software?",
    a: "It is a system that records every meal served, who paid and how, and connects that to menus, inventory, payments and reports — replacing registers, coupons and spreadsheets.",
  },
  {
    q: "How much does canteen software cost?",
    a: "CanteenPro is priced per business, starting with a single-canteen plan billed monthly or yearly, with a 14-day free trial. See the pricing page for current prices.",
  },
  {
    q: "Can it handle company subsidy?",
    a: "Yes. Each meal session has an employee price and a company subsidy; the subsidy is collected into a monthly client billing statement.",
  },
  {
    q: "Does it work for multiple canteens?",
    a: "Yes. Each canteen has its own sessions, menus, prices and employees, and managers can be limited to the canteens they run.",
  },
];

export default function Pillar() {
  return (
    <>
      <article>
        <header className="bg-navy-800">
          <div className="wrap max-w-225 py-16 md:py-24">
            <h1 className="text-4xl font-extrabold text-white md:text-[60px]">
              Canteen management software: the complete guide
            </h1>
            <p className="mt-6 text-xl text-navy-200">
              What a canteen management system should do for a corporate,
              factory or institutional canteen — and how to choose one.
            </p>
          </div>
        </header>
        <div className="wrap max-w-190 py-14">
          <div className="prose-md text-[18px] leading-[1.75]">
            <h2>What a canteen management system does</h2>
            <p>
              A canteen management system records{" "}
              <strong>who ate what, when, and who pays for it</strong>. Around
              that record sit menu planning, meal tracking at the counter,
              employee payments, guest billing, inventory and reports. Done
              well, it replaces the paper register, the coupon book and the
              month-end spreadsheet.
            </p>
            <h2>Who needs it</h2>
            <ul>
              <li>
                <strong>Corporate offices</strong> running subsidised
                cafeterias.
              </li>
              <li>
                <strong>Factories and plants</strong> with shift-based canteens
                and contract labour.
              </li>
              <li>
                <strong>Contract caterers</strong> running canteens for several
                client companies.
              </li>
              <li>
                <strong>Hospitals, colleges and campuses</strong> serving staff
                and visitors.
              </li>
            </ul>
            <h2>Features that matter</h2>
            <p>
              Look past the feature list and ask how the system handles a normal
              lunch rush, a disputed bill and month-end. These modules cover the
              full cycle:
            </p>
            <ul>
              {/* this feature is in lib/contents.ts we use this for get dat afrom file  */}
              {FEATURES.map((f) => (
                <li key={f.slug}>
                  <Link href={`/features/${f.slug}`}>{f.name}</Link>: {f.short}
                </li>
              ))}
            </ul>
            <h2>How to choose</h2>
            <ol>
              <li>Can it enforce one meal per session and handle opt-ins?</li>
              <li>
                Does it support how your client pays: wallet, payroll, subsidy,
                cash?
              </li>
              <li>Can guests be billed and reported separately?</li>
              <li>
                Will it produce the client statement and payroll sheet you need
                every month?
              </li>
              <li>
                Do employees get an app, and does it work without a smartphone
                for those who don't have one?
              </li>
            </ol>
            <h2>Getting started</h2>
            <p>
              Most canteens can go live in a day: set sessions and prices,
              import employees, publish the week's menu and print the counter
              QR. <Link href="/signup">Start a free trial</Link> or{" "}
              <Link href="/demo">book a demo</Link> to see it with your own
              data.
            </p>
          </div>
          <div className="mt-14">
            <Faq items={faqs} />
          </div>
        </div>
      </article>
      <CtaBand />
    </>
  );
}
