import Link from "next/link";
import type { Metadata } from "next";
import { SOLUTIONS } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "Solutions – Canteen Software by Industry | CanteenPro",
  description:
    "Canteen management for corporate offices, factories, contract caterers, hospitals and campuses.",
  alternates: { canonical: "/solutions" },
};

export default function Solutions() {
  return (
    <>
      <PageHero
        title="Built for the way your canteen runs"
        intro="Offices, plants, caterers and campuses use the same core with different settings."
      />
      <div className="wrap grid gap-6 py-16 md:grid-cols-2">
        {SOLUTIONS.map((s) => (
          <Link
            key={s.slug}
            href={`/solutions/${s.slug}`}
            className="rounded-[28px] border border-steel-300 p-8 hover:border-navy-400"
          >
            <h2 className="text-3xl font-extrabold">{s.name}</h2>
            <p className="mt-3 text-navy-600">{s.intro}</p>
          </Link>
        ))}
      </div>
      <CtaBand />
    </>
  );
}
