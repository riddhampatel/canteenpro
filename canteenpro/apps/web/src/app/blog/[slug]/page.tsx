import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { marked } from "marked";
import { getPost } from "@/lib/api";
import { SITE } from "@/lib/content";
import { CtaBand } from "@/components/CtaBand";

export const revalidate = 120;
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const p = await getPost(params.slug);
  if (!p) return {};
  const title = p.seoTitle || `${p.title} | CanteenPro`;
  const description = p.seoDescription || p.excerpt || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: p.publishedAt,
      images: p.coverImage ? [p.coverImage] : undefined,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: { slug: string };
}) {
  const p = await getPost(params.slug);
  if (!p) notFound();
  const html = marked.parse(p.content ?? "") as string;
  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.excerpt,
    datePublished: p.publishedAt,
    author: { "@type": "Organization", name: "CanteenPro" },
    mainEntityOfPage: `${SITE.url}/blog/${p.slug}`,
    image: p.coverImage ?? undefined,
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <article>
        <header className="border-b border-steel bg-steel-50">
          <div className="wrap max-w-215 py-14 md:py-20">
            <Link
              href="/blog"
              className="text-[15px] font-semibold text-navy-400 hover:text-navy-700"
            >
              Blog{p.category ? ` / ${p.category.name}` : ""}
            </Link>
            <h1 className="mt-4 text-4xl font-extrabold md:text-[52px]">
              {p.title}
            </h1>
            {p.excerpt && (
              <p className="mt-5 text-xl text-navy-600">{p.excerpt}</p>
            )}
            <p className="mt-6 text-[15px] text-navy-400">
              {new Date(p.publishedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              , {p.readingMinutes} min read
            </p>
          </div>
        </header>
        {p.coverImage && (
          <div className="wrap max-w-250 pt-10">
            <img src={p.coverImage} alt="" className="w-full rounded-3xl" />
          </div>
        )}
        <div className="wrap max-w-190 py-14">
          <div
            className="prose-md text-[18px] leading-[1.75]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {p.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-steel-50 px-3 py-1 text-sm text-navy-600"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
      {!!p.related?.length && (
        <section className="wrap max-w-215 border-t border-steel py-14">
          <h2 className="text-2xl font-extrabold">Keep reading</h2>
          <div className="mt-6 grid gap-8 md:grid-cols-3">
            {p.related.map((r) => (
              <Link key={r.id} href={`/blog/${r.slug}`} className="group">
                <h3 className="text-lg font-bold group-hover:underline group-hover:decoration-turmeric">
                  {r.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[15px] text-navy-600">
                  {r.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <CtaBand />
    </>
  );
}
