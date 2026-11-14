import Link from "next/link";
import { Logo } from "./Logo";
import { FEATURES, SOLUTIONS, SITE } from "@/lib/content";
import { getSite } from "@/lib/api";

export async function Footer() {
  const site = await getSite();
  return (
    <footer className="bg-navy-900 text-navy-200">
      <div className="wrap grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed">
            Canteen management software for corporate offices, factories and
            contract caterers in India.
          </p>
          <div className="mt-5 space-y-1 text-[15px]">
            {site.supportEmail && (
              <a
                className="block hover:text-white"
                href={`mailto:${site.supportEmail}`}
              >
                {site.supportEmail}
              </a>
            )}
            {site.supportPhone && (
              <a
                className="block hover:text-white"
                href={`tel:${site.supportPhone.replace(/\s/g, "")}`}
              >
                {site.supportPhone}
              </a>
            )}
            {site.whatsapp && (
              <a
                className="block font-semibold text-turmeric hover:text-turmeric-100"
                href={`https://wa.me/${site.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                Chat on WhatsApp
              </a>
            )}
          </div>
        </div>
        <div>
          <p className="mb-3 font-semibold text-white">Features</p>
          {FEATURES.map((f) => (
            <Link
              key={f.slug}
              href={`/features/${f.slug}`}
              className="block py-1 text-[15px] hover:text-white"
            >
              {f.name}
            </Link>
          ))}
        </div>
        <div>
          <p className="mb-3 font-semibold text-white">Solutions</p>
          {SOLUTIONS.map((f) => (
            <Link
              key={f.slug}
              href={`/solutions/${f.slug}`}
              className="block py-1 text-[15px] hover:text-white"
            >
              {f.name}
            </Link>
          ))}
          <Link
            href="/canteen-management-software"
            className="block py-1 text-[15px] hover:text-white"
          >
            Canteen management software
          </Link>
        </div>
        <div>
          <p className="mb-3 font-semibold text-white">Company</p>
          {[
            ["/pricing", "Pricing"],
            ["/blog", "Blog"],
            ["/faq", "FAQ"],
            ["/about", "About"],
            ["/contact", "Contact"],
            ["/demo", "Book a demo"],
            [`${SITE.consoleUrl}/login`, "Sign in"],
          ].map(([h, l]) => (
            <Link
              key={h}
              href={h}
              className="block py-1 text-[15px] hover:text-white"
            >
              {l}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-wrap items-center justify-between gap-3 py-6 text-sm">
          <span>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </span>
          <span className="flex gap-5">
            <Link href="/p/privacy-policy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/p/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/p/refund-policy" className="hover:text-white">
              Refunds
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
