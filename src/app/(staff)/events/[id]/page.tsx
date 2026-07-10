import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/auth";
import { getEventDetail } from "@/lib/events/queries";
import { deleteEvent, removeBooking } from "@/lib/events/actions";
import { AddBookingForm, EventForm } from "@/components/event-forms";
import { Card, EmptyState, formatDateTime, ui } from "@/components/ui";
import { getI18n } from "@/lib/i18n";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaffPage();
  const { t } = await getI18n();
  const { id } = await params;
  const detail = await getEventDetail(id);
  if (!detail) notFound();
  const { event, bookings, availableClients } = detail;
  const writable = staff.role !== "readonly";
  const full = event.capacity !== null && bookings.length >= event.capacity;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          {event.emoji ? `${event.emoji} ` : ""}
          {event.title}
        </h1>
        <Link href="/events" className="text-sm hover:underline">
          ← {t.staff.eventsHeading}
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        {formatDateTime(event.startsAt)} · {event.location} ·{" "}
        {event.priceEur === null ? t.staff.freeLabel : `${event.priceEur} €`} ·{" "}
        {t.staff.bookedCol}: {bookings.length}
        {event.capacity !== null ? ` / ${event.capacity}` : ""}
        {full ? ` · ${t.staff.eventFull}` : ""}
      </p>

      <Card title={`${t.staff.bookingsHeading} (${bookings.length})`}>
        {bookings.length === 0 ? (
          <EmptyState>{t.staff.noBookingsYet}</EmptyState>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <Link href={`/clients/${b.clientId}`} className="font-medium hover:underline">
                  {b.clientName}
                </Link>
                {b.note && <span className="text-muted-foreground">— {b.note}</span>}
                <span className="ml-auto flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(b.createdAt)} · {t.staff.bookedByLabel} {b.staffName}
                  </span>
                  {writable && (
                    <form action={removeBooking.bind(null, id, b.id)}>
                      <button type="submit" className={ui.btnDanger}>
                        {t.common.remove}
                      </button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {writable && !full && (
          <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/15">
            <AddBookingForm eventId={id} clients={availableClients} />
          </div>
        )}
      </Card>

      {writable && (
        <Card title={t.staff.editEvent}>
          <EventForm
            eventId={id}
            initial={{
              title: event.title,
              description: event.description,
              location: event.location,
              country: event.country,
              emoji: event.emoji ?? "",
              startsAt: toLocalInputValue(event.startsAt),
              priceEur: event.priceEur,
              capacity: event.capacity,
              published: event.published,
            }}
          />
          {staff.role === "admin" && (
            <div className="mt-6 border-t border-black/10 pt-4 dark:border-white/15">
              <form action={deleteEvent.bind(null, id)}>
                <button type="submit" className={ui.btnDanger}>
                  {t.staff.deleteEventBtn}
                </button>
              </form>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.staff.deleteEventNote}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
