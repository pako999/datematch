import type { Metadata } from "next";
import Link from "next/link";
import { listUpcomingEvents } from "@/lib/events/queries";
import { EventCards } from "@/components/event-cards";
import { getI18n } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/components/site-footer";
import type { EventRow } from "@/db/schema";

export const metadata: Metadata = {
  title: "Dogodki za samske — pohodi, potovanja in družabni večeri",
  description:
    "Celoletni koledar dogodkov za samske v Sloveniji in tujini: vsak vikend pohod, degustacija, jadranje po Jadranu ali križarjenje. Spoznavanje v živo, ki ga organizira agencija DateMatch.",
  alternates: { canonical: "/dogodki" },
};

export default async function EventsPublicPage() {
  const { t, locale } = await getI18n();
  const events = await listUpcomingEvents(120);

  // Group by "YYYY-MM" so a full year reads as a calendar.
  const groups = new Map<string, EventRow[]>();
  for (const e of events) {
    const key = `${e.startsAt.getFullYear()}-${e.startsAt.getMonth()}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(e);
  }
  const monthLabel = (d: Date) =>
    new Intl.DateTimeFormat(locale === "sl" ? "sl-SI" : "en-GB", {
      month: "long",
      year: "numeric",
    }).format(d);

  return (
    <article>
      <h1>{t.home.eventsTitle}</h1>
      <p className="legal-updated">{t.home.eventsSub}</p>

      <div className="mt-8 space-y-10 not-prose">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          [...groups.values()].map((monthEvents) => (
            <section key={monthEvents[0]!.id}>
              <h2 className="mb-4 text-lg font-semibold capitalize tracking-tight">
                {monthLabel(monthEvents[0]!.startsAt)}
              </h2>
              <EventCards events={monthEvents} t={t} locale={locale} />
            </section>
          ))
        )}
      </div>

      <p className="legal-note">
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> ·{" "}
        <Link href="/sign-up">{t.home.navCreateProfile}</Link>
      </p>
    </article>
  );
}
