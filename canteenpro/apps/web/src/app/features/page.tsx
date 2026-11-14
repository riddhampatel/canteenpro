import Link from "next/link";
import type { Metadata } from "next";
import { FEATURES } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { Icon } from "@/components/Icon";
import { CtaBand } from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "Features – Canteen Management System | CanteenPro",
  description:
    "Every CanteenPro feature: QR & biometric meal tracking, menu planning, POS billing, wallets & payroll, guests, inventory, food waste, reports and the mobile app.",
  alternates: { canonical: "/features" },
};

export default function Features() {
  return (
    <>
      <PageHero
        title="One system for the whole canteen"
        intro="From the kitchen plan to the client's monthly statement — each module works on its own and gets better together."
      />
      <div className="wrap py-16">
        {FEATURES.map((f) => (
          <section
            key={f.slug}
            id={f.slug}
            className="grid gap-8 border-b border-steel py-14 md:grid-cols-[1fr_1.4fr]"
          >
            <div>
              <Icon name={f.icon} className="h-8 w-8 text-navy-600" />
              <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">
                {f.name}
              </h2>
              <p className="mt-3 text-navy-600">{f.intro}</p>
              <Link
                href={`/features/${f.slug}`}
                className="mt-5 inline-block font-semibold text-navy-700 underline decoration-turmeric decoration-2 underline-offset-4"
              >
                More about {f.name.toLowerCase()}
              </Link>
            </div>
            <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {f.points.map((p) => (
                <li key={p.title}>
                  <h3 className="text-lg font-bold">{p.title}</h3>
                  <p className="mt-1 text-[15px] text-navy-600">{p.text}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <CtaBand />
    </>
  );
}
