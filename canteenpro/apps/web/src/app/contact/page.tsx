import type { Metadata } from "next";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { LeadForm } from "@/components/LeadForm";
import { getSite } from "@/lib/api";

export const metadata: Metadata = {
  title: "Contact CanteenPro",
  description:
    "Talk to the CanteenPro team about canteen management software for your company or catering business.",
  alternates: { canonical: "/contact" },
};

export default async function Contact() {
  const s = await getSite();
  return (
    <div className="wrap grid gap-14 py-16 md:grid-cols-[1fr_1.3fr] md:py-24">
      <div>
        <h1 className="text-4xl font-extrabold md:text-[56px]">Talk to us</h1>
        <p className="mt-4 text-lg text-navy-600">
          Questions about pricing, setup or moving off registers? We reply
          within one working day.
        </p>
        <div className="mt-10 space-y-5 text-lg">
          {s.whatsapp && (
            <a
              href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 font-semibold"
            >
              <MessageCircle className="h-6 w-6 text-leaf" />
              WhatsApp {s.supportPhone}
            </a>
          )}
          {s.supportEmail && (
            <a
              href={`mailto:${s.supportEmail}`}
              className="flex items-center gap-3 font-semibold"
            >
              <Mail className="h-6 w-6 text-navy-600" />
              {s.supportEmail}
            </a>
          )}
          {s.supportPhone && (
            <a
              href={`tel:${s.supportPhone.replace(/\s/g, "")}`}
              className="flex items-center gap-3 font-semibold"
            >
              <Phone className="h-6 w-6 text-navy-600" />
              {s.supportPhone}
            </a>
          )}
        </div>
      </div>
      <div className="rounded-4xl border border-steel-300 p-6 md:p-10">
        <LeadForm />
      </div>
    </div>
  );
}
