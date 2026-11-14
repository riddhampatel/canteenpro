import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE } from "@/lib/content";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default:
      "CanteenPro – Canteen Management Software for Corporate & Factory Canteens",
    template: "%s",
  },
  description: SITE.description,
  keywords: [
    "canteen management software",
    "canteen software",
    "corporate canteen management system",
    "cafeteria management software",
    "factory canteen software",
    "canteen billing software",
    "canteen POS",
    "meal tracking",
  ],
  openGraph: {
    type: "website",
    siteName: "CanteenPro",
    locale: "en_IN",
    url: SITE.url,
    title: "CanteenPro – Canteen Management Software",
    description: SITE.description,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CanteenPro",
    url: SITE.url,
    logo: `${SITE.url}/favicon.svg`,
  };
  return (
    <html lang="en-IN">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-turmeric focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
