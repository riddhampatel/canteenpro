import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { marked } from "marked";
import { getPage } from "@/lib/api";

export const revalidate = 600;
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const p = await getPage(params.slug);
  return p
    ? {
        title: `${p.title} | CanteenPro`,
        description: p.seoDescription,
        alternates: { canonical: `/p/${params.slug}` },
      }
    : {};
}
export default async function CmsPage({
  params,
}: {
  params: { slug: string };
}) {
  const p = await getPage(params.slug);
  if (!p) notFound();
  return (
    <div className="wrap max-w-190 py-16 md:py-24">
      <h1 className="text-4xl font-extrabold md:text-5xl">{p.title}</h1>
      <div
        className="prose-md mt-10 text-[17px] leading-[1.75]"
        dangerouslySetInnerHTML={{ __html: marked.parse(p.content) as string }}
      />
    </div>
  );
}
