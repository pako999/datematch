import type { Metadata } from "next";
import { LocaleProvider } from "@/components/locale-provider";
import { getI18n } from "@/lib/i18n";
import "./globals.css";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://datematch-iota.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "DateMatch — Personalizirano iskanje partnerja",
    template: "%s · DateMatch",
  },
  description:
    "DateMatch je agencija za personalizirano iskanje partnerja. Vi poveste, koga iščete — vaš osebni svetovalec ga najde, preveri in organizira predstavitev. Brez javnih profilov, brez drsanja.",
  keywords: [
    "iskanje partnerja",
    "agencija za zmenke",
    "personalizirano iskanje partnerja",
    "resne zveze",
    "matchmaking Slovenija",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "DateMatch",
    locale: "sl_SI",
    title: "DateMatch — Personalizirano iskanje partnerja",
    description:
      "Vi poveste, koga iščete. Mi ga najdemo za vas. Agencija za personalizirano iskanje partnerja — brez javnih profilov, brez drsanja.",
    images: [{ url: "/hero.webp", width: 1672, height: 941, alt: "DateMatch" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DateMatch — Personalizirano iskanje partnerja",
    description: "Vi poveste, koga iščete. Mi ga najdemo za vas.",
    images: ["/hero.webp"],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { t, locale } = await getI18n();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <LocaleProvider dict={t} locale={locale}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
