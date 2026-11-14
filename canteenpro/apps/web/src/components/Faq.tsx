import { Plus } from "lucide-react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  if (!items.length) return null;
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
  return (
    <div className="divide-y divide-steel border-y border-steel">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      {items.map((i) => (
        <details key={i.q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-semibold text-navy-800 [&::-webkit-details-marker]:hidden">
            {i.q}
            <Plus className="mt-1 h-5 w-5 shrink-0 text-navy-400 transition-transform group-open:rotate-45" />
          </summary>
          <p className="mt-3 max-w-prose text-navy-600">{i.a}</p>
        </details>
      ))}
    </div>
  );
}
