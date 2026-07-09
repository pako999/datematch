import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getI18n } from "@/lib/i18n";
import { fill } from "@/lib/i18n/dictionaries";

function missingEnv(): string[] {
  const required: Record<string, string | undefined> = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  };
  return Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);
}

const primaryBtn =
  "inline-flex items-center justify-center rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90";
const secondaryBtn =
  "inline-flex items-center justify-center rounded-md border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";

export default async function Home() {
  const { t } = await getI18n();
  const missing = missingEnv();
  const home = t.home;

  const steps = [
    { n: "1", title: home.step1Title, text: home.step1Text },
    { n: "2", title: home.step2Title, text: home.step2Text },
    { n: "3", title: home.step3Title, text: home.step3Text },
  ];
  const why = [
    { title: home.why1Title, text: home.why1Text, icon: "🔒" },
    { title: home.why2Title, text: home.why2Text, icon: "🤝" },
    { title: home.why3Title, text: home.why3Text, icon: "🧭" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">
          Date<span className="text-rose-600 dark:text-rose-400">Match</span>
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <LanguageSwitcher />
          <Link href="/sign-in" className="hover:underline">
            {home.navSignIn}
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-foreground px-3 py-1.5 font-medium text-background hover:opacity-90"
          >
            {home.navCreateProfile}
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-16 text-center sm:pt-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400">
            {home.heroKicker}
          </p>
          <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {home.heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            {home.heroSub}
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/sign-up" className={primaryBtn}>
              {home.ctaPrimary}
            </Link>
            <Link href="/sign-in" className={secondaryBtn}>
              {home.ctaSecondary}
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-black/5 bg-black/[.02] py-16 dark:border-white/10 dark:bg-white/[.03]">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              {home.howTitle}
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n} className="text-center sm:text-left">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-600/10 text-sm font-semibold text-rose-600 dark:text-rose-400">
                    {s.n}
                  </span>
                  <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why us */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            {home.whyTitle}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {why.map((w) => (
              <div
                key={w.title}
                className="rounded-lg border border-black/10 p-5 dark:border-white/15"
              >
                <span aria-hidden className="text-2xl">{w.icon}</span>
                <h3 className="mt-3 text-base font-semibold">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {w.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy strip */}
        <section className="border-y border-black/5 bg-black/[.02] py-8 dark:border-white/10 dark:bg-white/[.03]">
          <p className="mx-auto max-w-3xl px-6 text-center text-sm leading-relaxed text-muted-foreground">
            🔐 {home.privacyStrip}
          </p>
        </section>

        {/* Bottom CTA */}
        <section className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            {home.ctaBottomTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {home.ctaBottomText}
          </p>
          <Link href="/sign-up" className={`${primaryBtn} mt-6`}>
            {home.ctaPrimary}
          </Link>

          {missing.length > 0 && (
            <div className="mx-auto mt-10 max-w-lg rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-left text-xs text-amber-700 dark:text-amber-300">
              <p className="font-semibold">{t.landing.setupIncomplete}</p>
              <p className="mt-1">
                {fill(t.landing.setupMissing, { vars: missing.join(", ") })}
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 py-6 dark:border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} DateMatch. {home.footerRights}
          </span>
          <span className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/dashboard" className="hover:underline">
              {home.footerStaff}
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
