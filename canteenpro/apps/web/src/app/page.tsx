import Link from "next/link";
import { TicketStack } from "@/components/TicketStack";
import { RoleTabs } from "@/components/RoleTabs";
import { PhoneMock } from "@/components/PhoneMock";
import { PricingTable } from "@/components/PricingTable";
import { Faq } from "@/components/Faq";
import { CtaBand } from "@/components/CtaBand";
import { Icon } from "@/components/Icon";
import { FEATURES, FLOW, SITE } from "@/lib/content";
import {
  getFaqs,
  getPlans,
  getPosts,
  getSite,
  getTestimonials,
} from "@/lib/api";

export default async function Home() {
  const [plans, faqs, testimonials, posts, site] = await Promise.all([
    getPlans(),
    getFaqs(),
    getTestimonials(),
    getPosts(1),
    getSite(),
  ]);
  const app = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CanteenPro",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    description: SITE.description,
    offers: plans.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: p.priceMonthly,
      priceCurrency: "INR",
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(app) }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-800">
        <div className="pointer-events-none absolute -right-40 -top-40 h-140 w-140 rounded-full border-60 border-white/4" />
        <div className="wrap grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="text-[15px]  font-semibold text-turmeric">
              Canteen management software
            </p>
            {/* <h1 className="mt-4 text-[44px] font-extrabold leading-[1.02] text-white md:text-[72px]">
              The canteen register, replaced.
            </h1> */}
            <h1
              className="mt-4 text-[44px] font-extrabold leading-tight md:text-[72px]"
              style={{ color: "#ffffff", opacity: 1, visibility: "visible" }}
            >
              The canteen register, replaced.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-200 md:text-xl">
              Menus, QR and fingerprint meal tracking, wallets and payroll,
              guest meals and month-end client billing. One system for corporate
              offices, factories and caterers.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary h-14 px-8 text-base">
                Start 14-day free trial
              </Link>
              <Link
                href="/demo"
                className="btn h-14 border border-white/30 px-8 text-base text-white hover:border-white"
              >
                Book a demo
              </Link>
            </div>
            <p className="mt-5 text-[15px] text-navy-200">
              No card needed. Most canteens are serving from it within a day.
            </p>
          </div>
          <TicketStack />
        </div>
      </section>

      {/* Roles */}
      <section className="wrap py-20 md:py-28">
        <h2 className="max-w-3xl text-4xl font-extrabold md:text-[52px]">
          Everyone at the canteen gets the screen they need
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-navy-600">
          Role-based access means cashiers see the counter, managers see
          operations and owners see the money.
        </p>
        <div className="mt-12">
          <RoleTabs />
        </div>
      </section>

      {/* Flow — a real sequence, so it is numbered */}
      <section className="bg-steel-50 py-20 md:py-28">
        <div className="wrap">
          <h2 className="max-w-3xl text-4xl font-extrabold md:text-[52px]">
            How a meal flows through CanteenPro
          </h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
            {FLOW.map((f, i) => (
              <li key={f.title} className="relative">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-navy-800 font-display text-xl font-extrabold text-turmeric">
                    {i + 1}
                  </span>
                  {i < FLOW.length - 1 && (
                    <span className="hidden h-px flex-1 bg-navy-200 md:block" />
                  )}
                </div>
                <h3 className="mt-5 text-2xl font-bold">{f.title}</h3>
                <p className="mt-2 text-navy-600">{f.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features list */}
      <section className="wrap py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-2xl text-4xl font-extrabold md:text-[52px]">
            Everything a canteen business runs on
          </h2>
          <Link href="/features" className="btn-ghost">
            See all features
          </Link>
        </div>
        <div className="mt-12 grid border-t border-steel md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Link
              key={f.slug}
              href={`/features/${f.slug}`}
              className={`group flex gap-5 border-b border-steel py-8 md:pr-10 ${i % 2 ? "md:border-l md:pl-10" : ""}`}
            >
              <Icon
                name={f.icon}
                className="mt-1 h-7 w-7 shrink-0 text-navy-600"
              />
              <div>
                <h3 className="text-2xl font-bold underline-offset-4 group-hover:underline group-hover:decoration-turmeric">
                  {f.name}
                </h3>
                <p className="mt-2 text-navy-600">{f.short}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* App */}
      <section className="overflow-hidden bg-turmeric-50 py-20 md:py-24">
        <div className="wrap grid items-center gap-14 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-extrabold md:text-[52px]">
              An app your employees will open every day
            </h2>
            <p className="mt-5 max-w-xl text-lg text-navy-600">
              They see the menu, say whether they are eating, scan to get served
              and check their wallet. You get an accurate headcount before the
              first roti is rolled.
            </p>
            <ul className="mt-8 space-y-3 text-[17px]">
              <li>Sign in with mobile number and a 4-digit PIN</li>
              <li>Reminders before the opt-in cut-off</li>
              <li>Managers switch to counter mode with the same app</li>
            </ul>
            <Link href="/features/mobile-app" className="btn-navy mt-9">
              Explore the mobile app
            </Link>
          </div>
          <PhoneMock />
        </div>
      </section>

      {/* Pricing */}
      <section className="wrap py-20 md:py-28">
        <h2 className="text-center text-4xl font-extrabold md:text-[52px]">
          Simple pricing per business
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-lg text-navy-600">
          Not per employee, not per meal. Every plan starts with a 14-day free
          trial.
        </p>
        <div className="mt-12">
          <PricingTable plans={plans} gst={site.gstPercent} />
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="bg-steel-50 py-20">
          <div className="wrap grid gap-6 md:grid-cols-3">
            {testimonials.slice(0, 3).map((t) => (
              <figure key={t.id} className="rounded-[28px] bg-white p-8">
                <blockquote className="text-lg">“{t.quote}”</blockquote>
                <figcaption className="mt-5 text-[15px]">
                  <b>{t.name}</b>
                  <br />
                  <span className="text-navy-400">
                    {[t.role, t.company].filter(Boolean).join(", ")}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {posts.items.length > 0 && (
        <section className="wrap py-20">
          <div className="flex items-end justify-between gap-6">
            <h2 className="text-3xl font-extrabold md:text-4xl">
              From the blog
            </h2>
            <Link
              href="/blog"
              className="font-semibold text-navy-600 underline decoration-turmeric decoration-2 underline-offset-4"
            >
              All articles
            </Link>
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {posts.items.slice(0, 3).map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="group">
                <p className="text-sm font-semibold text-navy-400">
                  {p.category?.name}
                </p>
                <h3 className="mt-2 text-xl font-bold group-hover:underline group-hover:decoration-turmeric">
                  {p.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-navy-600">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="wrap grid gap-10 pb-24 pt-8 md:grid-cols-[1fr_1.6fr]">
          <h2 className="text-4xl font-extrabold md:text-[52px]">
            Questions owners ask us
          </h2>
          <Faq
            items={faqs
              .slice(0, 7)
              .map((f) => ({ q: f.question, a: f.answer }))}
          />
        </section>
      )}
      <CtaBand />
    </>
  );
}
