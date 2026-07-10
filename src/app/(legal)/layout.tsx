import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getI18n } from "@/lib/i18n";

export default async function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-black/5 dark:border-white/10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Date<span className="text-rose-600 dark:text-rose-400">Match</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <LanguageSwitcher />
            <Link href="/" className="hover:underline">
              {t.home.footerHome}
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-foreground px-3 py-1.5 font-medium text-background hover:opacity-90"
            >
              {t.home.navCreateProfile}
            </Link>
          </nav>
        </div>
      </header>
      <main className="legal mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
