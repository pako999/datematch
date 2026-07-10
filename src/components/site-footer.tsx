import Link from "next/link";
import { getI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export const CONTACT_EMAIL = "info@datematch.si";

/** Shared marketing footer (homepage + legal/FAQ pages). */
export async function SiteFooter() {
  const { t } = await getI18n();
  const home = t.home;

  const col = "space-y-2 text-sm";
  const head = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";
  const link = "text-muted-foreground hover:text-foreground hover:underline";

  return (
    <footer className="border-t border-black/5 dark:border-white/10">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <p className="text-base font-semibold tracking-tight">
            Date<span className="text-rose-600 dark:text-rose-400">Match</span>
          </p>
          <p className="text-sm text-muted-foreground">{home.footerTagline}</p>
          <LanguageSwitcher />
        </div>

        <div className={col}>
          <p className={head}>{home.footerPages}</p>
          <p><Link href="/" className={link}>{home.footerHome}</Link></p>
          <p><Link href="/dogodki" className={link}>{home.footerEvents}</Link></p>
          <p><Link href="/faq" className={link}>{home.footerFaq}</Link></p>
          <p><Link href="/sign-up" className={link}>{home.navCreateProfile}</Link></p>
          <p><Link href="/portal" className={link}>{home.footerMyProfile}</Link></p>
        </div>

        <div className={col}>
          <p className={head}>{home.footerLegal}</p>
          <p><Link href="/pogoji" className={link}>{home.footerTerms}</Link></p>
          <p><Link href="/zasebnost" className={link}>{home.footerPrivacy}</Link></p>
          <p><Link href="/piskotki" className={link}>{home.footerCookies}</Link></p>
          <p><Link href="/vracila" className={link}>{home.footerRefunds}</Link></p>
        </div>

        <div className={col}>
          <p className={head}>{home.footerContact}</p>
          <p>
            <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="text-muted-foreground">DateMatch, Slovenija</p>
          <p>
            <Link href="/dashboard" className={link}>{home.footerStaff}</Link>
          </p>
        </div>
      </div>
      <div className="border-t border-black/5 py-4 dark:border-white/10">
        <p className="mx-auto max-w-5xl px-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} DateMatch. {home.footerRights}
        </p>
      </div>
    </footer>
  );
}
