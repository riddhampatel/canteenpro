import Link from "next/link";
import type { Metadata } from "next";
import { getCategories, getPosts } from "@/lib/api";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Canteen Management Blog - Guides for Canteen Owners | CanteenPro",
  description:
    "Practical guides on running corporate and factory canteens: food cost, waste, cashless payments, meal tracking and software.",
  alternates: { canonical: "/blog" },
};
export const revalidate = 120;

export default async function Blog({
  searchParams,
}: {
  searchParams: { category?: string; page?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const [data, cats] = await Promise.all([
    getPosts(page, searchParams.category),
    getCategories(),
  ]);
  const pages = Math.ceil(data.total / data.pageSize);
  return (
    <>
      <PageHero
        title="Guides for people who run canteens."
        intro="Food cost, waste, payments, compliance and the tools that make month-end easier."
      />
      <div className="wrap py-14">
        <div className="mb-10 flex flex-wrap gap-2">
          <Link
            href="/blog"
            className={`rounded-full px-4 py-2 text-[15px] font-semibold ${!searchParams.category ? "bg-navy-800 text-white" : "bg-steel-50 text-navy-600"}`}
          >
            All
          </Link>
          {cats.map((c) => (
            <Link
              key={c.id}
              href={`/blog?category=${c.slug}`}
              className={`rounded-full px-4 py-2 text-[15px] font-semibold ${searchParams.category === c.slug ? "bg-navy-800 text-white" : "bg-steel-50 text-navy-600"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
        {data.items.length === 0 ? (
          <p className="text-navy-600">No articles yet — check back soon.</p>
        ) : (
          <div className="grid gap-x-10 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="group">
                <div className="aspect-16/10 overflow-hidden rounded-3xl bg-steel-50">
                  {p.coverImage ? (
                    <img
                      src={p.coverImage}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-end bg-navy-800 p-6">
                      <span className="font-display text-2xl font-extrabold leading-tight text-white">
                        {p.title}
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-4 text-sm font-semibold text-navy-400">
                  {p.category?.name} — {p.readingMinutes} min read
                </p>
                <h2 className="mt-1 text-xl font-bold group-hover:underline group-hover:decoration-turmeric">
                  {p.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-navy-600">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        )}
        {pages > 1 && (
          <div className="mt-14 flex gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={`/blog?page=${n}${searchParams.category ? `&category=${searchParams.category}` : ""}`}
                className={`grid h-10 w-10 place-items-center rounded-full font-semibold ${n === page ? "bg-navy-800 text-white" : "bg-steel-50"}`}
              >
                {n}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
