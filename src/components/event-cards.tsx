import type { EventRow } from "@/db/schema";
import type { Dict, Locale } from "@/lib/i18n/dictionaries";

export function formatEventDate(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "sl" ? "sl-SI" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Public event card grid (homepage + /dogodki). Server component. */
export function EventCards({
  events,
  t,
  locale,
}: {
  events: EventRow[];
  t: Dict;
  locale: Locale;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => (
        <article
          key={e.id}
          className="flex flex-col rounded-lg border border-black/10 p-5 dark:border-white/15"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span aria-hidden className="text-3xl">{e.emoji ?? "📅"}</span>
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
              {formatEventDate(e.startsAt, locale)}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold leading-snug">{e.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">📍 {e.location}</p>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            {e.description}
          </p>
          <p className="mt-3 text-sm font-medium">
            {e.priceEur === null ? t.home.eventsFree : `${e.priceEur} €`}
            {e.capacity !== null && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                · {t.home.eventsLimited}
              </span>
            )}
          </p>
        </article>
      ))}
    </div>
  );
}
