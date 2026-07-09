import type { Metadata } from "next";
import { LocaleProvider } from "@/components/locale-provider";
import { getI18n } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "DateMatch — Osebna agencija za povezovanje",
  description:
    "Osebno povezovanje, ki ga vodijo ljudje. Vaš svetovalec izbere ujemanja in organizira predstavitve.",
  robots: { index: false, follow: false },
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
