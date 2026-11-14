import { SEED_FALLBACK_PLANS } from "./fallback";

const API =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api";

export interface Plan {
  id: string;
  code: string;
  name: string;
  tagline?: string | null;
  priceMonthly: number;
  priceYearly: number;
  trialDays: number;
  maxCanteens: number;
  maxEmployees: number;
  maxStaffUsers: number;
  highlights: string[];
  isPopular: boolean;
  features: Record<string, boolean>;
}
export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string;
  coverImage?: string | null;
  tags: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  readingMinutes: number;
  publishedAt: string;
  category?: { name: string; slug: string } | null;
  author?: { name: string } | null;
  related?: Post[];
}

async function get<T>(path: string, fallback: T, revalidate = 300): Promise<T> {
  try {
    const r = await fetch(API + path, { next: { revalidate } });
    if (!r.ok) return fallback;
    return (await r.json()) as T;
  } catch {
    return fallback;
  }
}

export const getPlans = () =>
  get<Plan[]>("/public/plans", SEED_FALLBACK_PLANS as Plan[]);
export const getFaqs = (group?: string) =>
  get<{ id: string; question: string; answer: string; group: string }[]>(
    `/public/faqs${group ? `?group=${group}` : ""}`,
    [],
  );
export const getTestimonials = () =>
  get<
    {
      id: string;
      name: string;
      role?: string;
      company?: string;
      quote: string;
      rating: number;
      avatarUrl?: string;
    }[]
  >("/public/testimonials", []);
export const getPosts = (page = 1, category?: string) =>
  get<{ items: Post[]; total: number; page: number; pageSize: number }>(
    `/public/blog?page=${page}&pageSize=12${category ? `&category=${category}` : ""}`,
    { items: [], total: 0, page: 1, pageSize: 12 },
    120,
  );
export const getPost = (slug: string) =>
  get<Post | null>(`/public/blog/${encodeURIComponent(slug)}`, null, 120);
export const getCategories = () =>
  get<{ id: string; name: string; slug: string }[]>(
    "/public/blog-categories",
    [],
  );
export const getPage = (slug: string) =>
  get<{
    title: string;
    content: string;
    seoDescription?: string;
    updatedAt: string;
  } | null>(`/public/pages/${slug}`, null);
export const getSite = () =>
  get<{
    name: string;
    supportEmail?: string;
    supportPhone?: string;
    whatsapp?: string;
    razorpayKeyId?: string | null;
    gstPercent: number;
  }>("/public/site", {
    name: "CanteenPro",
    supportEmail: "support@canteenpro.in",
    supportPhone: "+91 94275 72571",
    whatsapp: "+919427572571",
    gstPercent: 18,
  });
