import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteFooter, CONTACT_EMAIL } from "@/components/site-footer";
import { EventCards } from "@/components/event-cards";
import { listUpcomingEvents } from "@/lib/events/queries";
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

export default async function Home() {
  const { t, locale } = await getI18n();
  const missing = missingEnv();
  const home = t.home;
  const upcomingEvents = await listUpcomingEvents(6);

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

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "DateMatch",
    description: home.heroSub,
    email: CONTACT_EMAIL,
    areaServed: "SI",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "https://datematch-iota.vercel.app",
    image: "/hero.webp",
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      {/* Responsive full-screen hero. The banner is never cropped:
          object-contain scales it to fit every viewport, letterboxed into
          a background matching the artwork's edges. Desktop fills the
          viewport; small screens show the banner at natural height with
          the CTAs directly beneath it. */}
      <section className="relative flex w-full flex-col bg-[#131120] lg:min-h-svh">
        {/* Static row on small screens (no overlay overflow); floats over
            the artwork from lg up. */}
        <header className="relative z-20 lg:absolute lg:inset-x-0 lg:top-0">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-end px-4 py-3 lg:px-6 lg:py-4">
            <nav className="flex flex-wrap items-center justify-end gap-2 rounded-full bg-black/35 px-3 py-1.5 text-sm backdrop-blur-sm sm:gap-4 sm:px-4">
              <LanguageSwitcher variant="onDark" />
              <Link href="/sign-in" className="text-white hover:underline">
                {home.navSignIn}
              </Link>
              <Link
                href="/sign-up"
                className="whitespace-nowrap rounded-md bg-white px-3 py-1.5 font-medium text-black hover:bg-white/90"
              >
                {home.navCreateProfile}
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero.webp"
            alt={home.heroTitle}
            className="h-auto w-full object-contain lg:max-h-[calc(100svh-6rem)]"
            width={1672}
            height={941}
            fetchPriority="high"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 px-6 pb-8 pt-2 lg:pb-6">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg hover:bg-white/90"
          >
            {home.ctaPrimary}
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-md border border-white/50 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            {home.ctaSecondary}
          </Link>
        </div>
      </section>

      <main className="flex-1">
        {/* Positioning statement */}
        <section className="mx-auto max-w-5xl px-6 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400">
            {home.heroKicker}
          </p>
          <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {home.heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {home.heroSub}
          </p>
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

        {/* Singles events */}
        {upcomingEvents.length > 0 && (
          <section className="border-t border-black/5 bg-black/[.02] py-16 dark:border-white/10 dark:bg-white/[.03]">
            <div className="mx-auto max-w-5xl px-6">
              <h2 className="text-center text-2xl font-semibold tracking-tight">
                {home.eventsTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
                {home.eventsSub}
              </p>
              <div className="mt-10">
                <EventCards events={upcomingEvents} t={t} locale={locale} />
              </div>
              <p className="mt-8 text-center">
                <Link href="/dogodki" className="text-sm font-medium underline">
                  {home.eventsAll} →
                </Link>
              </p>
            </div>
          </section>
        )}

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

      <SiteFooter />
    </div>
  );
}
