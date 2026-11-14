import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FEATURES } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { Faq } from "@/components/Faq";
import { CtaBand } from "@/components/CtaBand";
import { Icon } from "@/components/Icon";

export const generateStaticParams = () =>
  FEATURES.map((f) => ({ slug: f.slug }));
export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const f = FEATURES.find((x) => x.slug === params.slug);
  if (!f) return {};
  return {
    title: f.seoTitle,
    description: f.seoDescription,
    alternates: { canonical: `/features/${f.slug}` },
    openGraph: { title: f.seoTitle, description: f.seoDescription },
  };
}

export default function FeaturePage({ params }: { params: { slug: string } }) {
  const f = FEATURES.find((x) => x.slug === params.slug);
  if (!f) notFound();
  const others = FEATURES.filter((x) => x.slug !== f.slug).slice(0, 4);
  return (
    <>
      <PageHero
        crumb={{ href: "/features", label: "Features" }}
        title={f.headline}
        intro={f.intro}
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
      <section className="wrap py-20">
        <h2 className="text-3xl font-extrabold md:text-4xl">
          {f.name}: what you get
        </h2>
        <div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {f.points.map((p) => (
            <div key={p.title} className="border-t-2 border-turmeric pt-5">
              <h3 className="text-xl font-bold">{p.title}</h3>
              <p className="mt-2 text-navy-600">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="wrap grid gap-10 pb-20 md:grid-cols-[1fr_1.6fr]">
        <h2 className="text-3xl font-extrabold">Common questions</h2>
        <Faq items={f.faqs} />
      </section>
      <section className="bg-steel-50 py-16">
        <div className="wrap">
          <h2 className="text-2xl font-extrabold">Works together with</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/features/${o.slug}`}
                className="rounded-2xl bg-white p-5 hover:ring-2 hover:ring-turmeric"
              >
                <Icon name={o.icon} className="h-6 w-6 text-navy-600" />
                <p className="mt-3 font-bold">{o.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
