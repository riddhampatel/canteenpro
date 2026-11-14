import type { MetadataRoute } from "next";
import { FEATURES, SITE, SOLUTIONS } from "@/lib/content";
import { getPosts } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const posts = await getPosts(1);
  const stat = [
    "",
    "/features",
    "/solutions",
    "/pricing",
    "/blog",
    "/faq",
    "/about",
    "/contact",
    "/demo",
    "/signup",
    "/canteen-management-software",
    "/p/privacy-policy",
    "/p/terms",
    "/p/refund-policy",
  ];
  return [
    ...stat.map((p) => ({
      url: base + p,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
    })),
    ...FEATURES.map((f) => ({
      url: `${base}/features/${f.slug}`,
      priority: 0.8,
    })),
    ...SOLUTIONS.map((s) => ({
      url: `${base}/solutions/${s.slug}`,
      priority: 0.8,
    })),
    ...posts.items.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.publishedAt,
      priority: 0.6,
    })),
  ];
}
