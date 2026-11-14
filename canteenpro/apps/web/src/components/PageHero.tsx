import Link from "next/link";

export function PageHero({
  crumb,
  title,
  intro,
  children,
}: {
  crumb?: { href: string; label: string };
  title: string;
  intro?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-steel bg-steel-50">
      <div className="wrap py-14 md:py-20">
        {crumb && (
          <Link
            href={crumb.href}
            className="text-[15px] font-semibold text-navy-400 hover:text-navy-700"
          >
            {crumb.label}
          </Link>
        )}
        <h1 className="mt-3 max-w-4xl text-4xl font-extrabold md:text-[58px]">
          {title}
        </h1>
        {intro && (
          <p className="mt-5 max-w-2xl text-lg text-navy-600 md:text-xl">
            {intro}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
