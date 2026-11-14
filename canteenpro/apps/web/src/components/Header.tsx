"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Logo } from "./Logo";
import { FEATURES, SOLUTIONS, SITE } from "@/lib/content";
import { Icon } from "./Icon";

export function Header() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<"features" | "solutions" | null>(null);
  return (
    <header className="sticky top-0 z-50 border-b border-steel bg-white/95 backdrop-blur">
      <div className="wrap flex h-18 items-center gap-8">
        <Link href="/" aria-label="CanteenPro home">
          <Logo />
        </Link>
        <nav
          className="hidden flex-1 items-center gap-1 lg:flex"
          onMouseLeave={() => setMenu(null)}
        >
          {(["features", "solutions"] as const).map((k) => (
            <div key={k} className="relative" onMouseEnter={() => setMenu(k)}>
              <button
                className="flex items-center gap-1 rounded-full px-4 py-2 text-[15px] font-semibold capitalize text-navy-700 hover:bg-steel-50"
                onClick={() => setMenu(menu === k ? null : k)}
                aria-expanded={menu === k}
              >
                {k} <ChevronDown className="h-4 w-4" />
              </button>
              {menu === k && (
                <div className="absolute left-0 top-full w-140 pt-2">
                  <div className="grid grid-cols-2 gap-1 rounded-2xl border border-steel bg-white p-3 shadow-xl shadow-navy-900/10">
                    {(k === "features" ? FEATURES : SOLUTIONS).map((f: any) => (
                      <Link
                        key={f.slug}
                        href={`/${k}/${f.slug}`}
                        onClick={() => setMenu(null)}
                        className="flex gap-3 rounded-xl p-3 hover:bg-steel-50"
                      >
                        {f.icon && (
                          <Icon
                            name={f.icon}
                            className="mt-0.5 h-5 w-5 shrink-0 text-navy-600"
                          />
                        )}
                        <span>
                          <span className="block text-[15px] font-semibold text-navy-800">
                            {f.name}
                          </span>
                          <span className="line-clamp-2 block text-[13px] leading-snug text-navy-400">
                            {f.short ?? f.intro}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <Link
            href="/pricing"
            className="rounded-full px-4 py-2 text-[15px] font-semibold text-navy-700 hover:bg-steel-50"
          >
            Pricing
          </Link>
          <Link
            href="/blog"
            className="rounded-full px-4 py-2 text-[15px] font-semibold text-navy-700 hover:bg-steel-50"
          >
            Blog
          </Link>
          <Link
            href="/contact"
            className="rounded-full px-4 py-2 text-[15px] font-semibold text-navy-700 hover:bg-steel-50"
          >
            Contact
          </Link>
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <a
            href={`${SITE.consoleUrl}/login`}
            className="px-3 text-[15px] font-semibold text-navy-700 hover:text-navy-900"
          >
            Sign in
          </a>
          <Link href="/signup" className="btn-primary h-11">
            Start free trial
          </Link>
        </div>
        <button
          className="ml-auto rounded-full p-2 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="border-t border-steel bg-white lg:hidden">
          <div className="wrap max-h-[75vh] space-y-6 overflow-y-auto py-6">
            <div>
              <p className="mb-2 text-sm font-semibold text-navy-400">
                Features
              </p>
              {FEATURES.map((f) => (
                <Link
                  key={f.slug}
                  onClick={() => setOpen(false)}
                  href={`/features/${f.slug}`}
                  className="block py-1.5 font-semibold"
                >
                  {f.name}
                </Link>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-navy-400">
                Solutions
              </p>
              {SOLUTIONS.map((f) => (
                <Link
                  key={f.slug}
                  onClick={() => setOpen(false)}
                  href={`/solutions/${f.slug}`}
                  className="block py-1.5 font-semibold"
                >
                  {f.name}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {[
                ["/pricing", "Pricing"],
                ["/blog", "Blog"],
                ["/contact", "Contact"],
              ].map(([h, l]) => (
                <Link
                  key={h}
                  href={h}
                  onClick={() => setOpen(false)}
                  className="py-1 font-semibold"
                >
                  {l}
                </Link>
              ))}
            </div>
            <div className="flex gap-3">
              <Link href="/signup" className="btn-primary flex-1">
                Start free trial
              </Link>
              <a href={`${SITE.consoleUrl}/login`} className="btn-ghost">
                Sign in
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
