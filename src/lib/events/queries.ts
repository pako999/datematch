import "server-only";
import { and, asc, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/** Upcoming published events for the public homepage / dogodki page. */
export async function listUpcomingEvents(limit = 20): Promise<schema.EventRow[]> {
  try {
    return await db()
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.published, true),
          gte(schema.events.startsAt, new Date()),
        ),
      )
      .orderBy(asc(schema.events.startsAt))
      .limit(limit);
  } catch {
    // Public pages must render even when the DB isn't configured yet.
    return [];
  }
}

export interface EventWithCount extends schema.EventRow {
  bookedCount: number;
}

/** All events (staff view), newest first, with booking counts. */
export async function listAllEvents(): Promise<EventWithCount[]> {
  const rows = await db()
    .select({
      event: schema.events,
      bookedCount: sql<number>`(
        SELECT count(*)::int FROM event_bookings b
        WHERE b.event_id = ${schema.events.id}
      )`,
    })
    .from(schema.events)
    .orderBy(asc(schema.events.startsAt));
  return rows.map((r) => ({ ...r.event, bookedCount: r.bookedCount }));
}

export interface EventDetail {
  event: schema.EventRow;
  bookings: (schema.EventBooking & { clientName: string; staffName: string })[];
  /** Active clients not yet booked — for the add-booking select. */
  availableClients: { id: string; fullName: string; city: string }[];
}

export async function getEventDetail(id: string): Promise<EventDetail | null> {
  const event = await db().query.events.findFirst({
    where: eq(schema.events.id, id),
  });
  if (!event) return null;

  const bookingRows = await db()
    .select({
      booking: schema.eventBookings,
      clientName: schema.clients.fullName,
      staffName: schema.staff.name,
    })
    .from(schema.eventBookings)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.eventBookings.clientId))
    .innerJoin(schema.staff, eq(schema.staff.id, schema.eventBookings.bookedByStaffId))
    .where(eq(schema.eventBookings.eventId, id))
    .orderBy(asc(schema.eventBookings.createdAt));

  const bookedIds = bookingRows.map((b) => b.booking.clientId);
  const availableClients = await db()
    .select({
      id: schema.clients.id,
      fullName: schema.clients.fullName,
      city: schema.clients.city,
    })
    .from(schema.clients)
    .where(
      and(
        inArray(schema.clients.status, ["lead", "active"]),
        bookedIds.length > 0
          ? notInArray(schema.clients.id, bookedIds)
          : undefined,
      ),
    )
    .orderBy(asc(schema.clients.fullName))
    .limit(300);

  return {
    event,
    bookings: bookingRows.map((b) => ({
      ...b.booking,
      clientName: b.clientName,
      staffName: b.staffName,
    })),
    availableClients,
  };
}
