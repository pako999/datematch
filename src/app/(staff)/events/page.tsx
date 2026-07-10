import Link from "next/link";
import { requireStaffPage } from "@/lib/auth";
import { listAllEvents } from "@/lib/events/queries";
import { EventForm, LoadDemoEventsForm } from "@/components/event-forms";
import { Card, formatDateTime, ui } from "@/components/ui";
import { getI18n } from "@/lib/i18n";

export default async function EventsPage() {
  const staff = await requireStaffPage();
  const { t } = await getI18n();
  const events = await listAllEvents();
  const writable = staff.role !== "readonly";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">
        {t.staff.eventsHeading}
      </h1>

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full border-collapse">
          <thead className="border-b border-black/10 dark:border-white/15">
            <tr>
              <th className={ui.th}>{t.staff.eventTitleLabel}</th>
              <th className={ui.th}>{t.staff.dateCol}</th>
              <th className={ui.th}>{t.common.city}</th>
              <th className={ui.th}>{t.staff.priceCol}</th>
              <th className={ui.th}>{t.staff.bookedCol}</th>
              <th className={ui.th}>{t.staff.publishedCol}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr
                key={e.id}
                className="border-b border-black/5 last:border-0 hover:bg-black/[.03] dark:border-white/10 dark:hover:bg-white/[.04]"
              >
                <td className={ui.td}>
                  <Link href={`/events/${e.id}`} className="font-medium hover:underline">
                    {e.emoji ? `${e.emoji} ` : ""}
                    {e.title}
                  </Link>
                </td>
                <td className={ui.td}>{formatDateTime(e.startsAt)}</td>
                <td className={ui.td}>{e.location}</td>
                <td className={ui.td}>
                  {e.priceEur === null ? t.staff.freeLabel : `${e.priceEur} €`}
                </td>
                <td className={ui.td}>
                  {e.bookedCount}
                  {e.capacity !== null ? ` / ${e.capacity}` : ""}
                </td>
                <td className={ui.td}>{e.published ? "✓" : "—"}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  {t.staff.noEventsYet}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {writable && events.length === 0 && <LoadDemoEventsForm />}

      {writable && (
        <Card title={t.staff.newEvent}>
          <EventForm initial={null} />
        </Card>
      )}
    </div>
  );
}
