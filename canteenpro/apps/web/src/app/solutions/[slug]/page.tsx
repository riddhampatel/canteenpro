import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { X } from "lucide-react";
import { SOLUTIONS } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";

export const generateStaticParams = () =>
  SOLUTIONS.map((s) => ({ slug: s.slug }));
export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const s = SOLUTIONS.find((x) => x.slug === params.slug);
  if (!s) return {};
  return {
    title: s.seoTitle,
    description: s.seoDescription,
    alternates: { canonical: `/solutions/${s.slug}` },
  };
}

export default function SolutionPage({ params }: { params: { slug: string } }) {
  const s = SOLUTIONS.find((x) => x.slug === params.slug);
  if (!s) notFound();
  return (
    <>
      <PageHero
        crumb={{
          href: "/solutions",
          label: `Solutions for ${s.name.toLowerCase()}`,
        }}
        title={s.headline}
        intro={s.intro}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary">
            Start free trial
          </Link>
          <Link href="/demo" className="btn-ghost">
            Book a demo
          </Link>
        </div>
      </PageHero>
      <section className="wrap grid gap-12 py-20 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-extrabold">What usually goes wrong</h2>
          <ul className="mt-6 space-y-4">
            {s.pains.map((p) => (
              <li key={p} className="flex gap-3 text-lg">
                <X className="mt-1 h-5 w-5 shrink-0 text-red-600" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-8">
          <h2 className="text-3xl font-extrabold">How CanteenPro fixes it</h2>
          {s.answers.map((a) => (
            <div key={a.title} className="border-l-4 border-turmeric pl-5">
              <h3 className="text-xl font-bold">{a.title}</h3>
              <p className="mt-1 text-navy-600">{a.text}</p>
            </div>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
