import type { Metadata } from "next";
import { getFaqs } from "@/lib/api";
import { Faq } from "@/components/Faq";
import { PageHero } from "@/components/PageHero";
import { CtaBand } from "@/components/CtaBand";

export const metadata: Metadata = {
  title: "FAQ – CanteenPro Canteen Management Software",
  description:
    "Answers about CanteenPro: meal tracking, guests, payments, pricing, trials and data security.",
  alternates: { canonical: "/faq" },
};
export const revalidate = 300;

export default async function FaqPage() {
  const faqs = await getFaqs();
  const groups = ["general", "product", "pricing"];
  return (
    <>
      <PageHero title="Frequently asked questions" />
      <div className="wrap max-w-225 space-y-14 py-16">
        {groups.map((g) => {
          const items = faqs.filter((f) => f.group === g);
          if (!items.length) return null;
          return (
            <section key={g}>
              <h2 className="mb-4 text-2xl font-extrabold capitalize">{g}</h2>
              <Faq items={items.map((f) => ({ q: f.question, a: f.answer }))} />
            </section>
          );
        })}
      </div>
      <CtaBand />
    </>
  );
}
