import type { Metadata } from "next";
import Link from "next/link";
import { listUpcomingEvents } from "@/lib/events/queries";
import { EventCards } from "@/components/event-cards";
import { getI18n } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Dogodki za samske — pohodi, potovanja in družabni večeri",
  description:
    "Dogodki za samske v Sloveniji in tujini: pohodi, degustacije, jadranje po Jadranu in križarjenja. Spoznavanje v živo, ki ga organizira agencija DateMatch.",
  alternates: { canonical: "/dogodki" },
};

export default async function EventsPublicPage() {
  const { t, locale } = await getI18n();
  const events = await listUpcomingEvents(50);

  return (
    <article>
      <h1>{t.home.eventsTitle}</h1>
      <p className="legal-updated">{t.home.eventsSub}</p>
      <div className="mt-8 not-prose">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <EventCards events={events} t={t} locale={locale} />
        )}
      </div>
      <p className="legal-note">
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> ·{" "}
        <Link href="/sign-up">{t.home.navCreateProfile}</Link>
      </p>
    </article>
  );
}
