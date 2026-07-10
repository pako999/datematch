"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireStaffAction } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { fill, type Dict } from "@/lib/i18n/dictionaries";
import { DEMO_EVENTS } from "./demo-events";

export interface ActionResult {
  ok: boolean;
  error?: string;
  info?: string;
}

const PUBLIC_PATHS = ["/", "/dogodki"];

function revalidateEvents(id?: string) {
  revalidatePath("/events");
  if (id) revalidatePath(`/events/${id}`);
  for (const p of PUBLIC_PATHS) revalidatePath(p);
}

/* ------------------------------------------------------------------ */
/* Create / edit / delete events (trips)                               */
/* ------------------------------------------------------------------ */

function eventSchema(t: Dict) {
  return z.object({
    title: z.string().trim().min(3, t.staff.eventTitleRequired).max(200),
    description: z.string().trim().min(10, t.staff.eventDescRequired).max(2000),
    location: z.string().trim().min(2, t.staff.eventLocationRequired).max(200),
    country: z.string().trim().min(2).max(100),
    emoji: z.string().trim().max(8).optional(),
    startsAt: z.string().min(1, t.staff.eventDateRequired),
    priceEur: z.coerce.number().min(0).max(100000).nullable(),
    capacity: z.coerce.number().int().min(1).max(10000).nullable(),
    published: z.boolean(),
  });
}

function parseEvent(formData: FormData, t: Dict) {
  const priceRaw = String(formData.get("priceEur") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  return eventSchema(t).safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    country: formData.get("country") || "Slovenija",
    emoji: formData.get("emoji") ?? undefined,
    startsAt: formData.get("startsAt"),
    priceEur: priceRaw === "" ? null : priceRaw,
    capacity: capacityRaw === "" ? null : capacityRaw,
    published: formData.get("published") === "on",
  });
}

export async function createEvent(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaffAction({ write: true });
  const { t } = await getI18n();
  const parsed = parseEvent(formData, t);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t.staffErrors.checkForm };
  }
  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: t.staff.eventDateRequired };
  }

  const [row] = await db()
    .insert(schema.events)
    .values({
      ...parsed.data,
      emoji: parsed.data.emoji || null,
      startsAt,
    })
    .returning({ id: schema.events.id });

  revalidateEvents(row!.id);
  redirect(`/events/${row!.id}`);
}

export async function updateEvent(
  eventId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaffAction({ write: true });
  const { t } = await getI18n();
  const parsed = parseEvent(formData, t);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? t.staffErrors.checkForm };
  }
  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: t.staff.eventDateRequired };
  }

  await db()
    .update(schema.events)
    .set({ ...parsed.data, emoji: parsed.data.emoji || null, startsAt })
    .where(eq(schema.events.id, eventId));

  revalidateEvents(eventId);
  return { ok: true };
}

export async function deleteEvent(eventId: string): Promise<void> {
  await requireStaffAction({ admin: true });
  await db().delete(schema.events).where(eq(schema.events.id, eventId));
  revalidateEvents();
  redirect("/events");
}

/* ------------------------------------------------------------------ */
/* Bookings                                                            */
/* ------------------------------------------------------------------ */

export async function addBooking(
  eventId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const staff = await requireStaffAction({ write: true });
  const { t } = await getI18n();

  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return { ok: false, error: t.staff.selectClientFirst };

  const event = await db().query.events.findFirst({
    where: eq(schema.events.id, eventId),
  });
  if (!event) return { ok: false, error: t.staffErrors.checkForm };

  if (event.capacity !== null) {
    const [row] = await db()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.eventBookings)
      .where(eq(schema.eventBookings.eventId, eventId));
    if ((row?.count ?? 0) >= event.capacity) {
      return { ok: false, error: t.staff.eventFull };
    }
  }

  const note = String(formData.get("note") ?? "").trim() || null;
  const inserted = await db()
    .insert(schema.eventBookings)
    .values({ eventId, clientId, bookedByStaffId: staff.id, note })
    .onConflictDoNothing()
    .returning({ id: schema.eventBookings.id });
  if (inserted.length === 0) {
    return { ok: false, error: t.staff.alreadyBooked };
  }

  revalidateEvents(eventId);
  return { ok: true };
}

export async function removeBooking(
  eventId: string,
  bookingId: string,
): Promise<void> {
  await requireStaffAction({ write: true });
  await db()
    .delete(schema.eventBookings)
    .where(eq(schema.eventBookings.id, bookingId));
  revalidateEvents(eventId);
}

/* ------------------------------------------------------------------ */
/* Demo events                                                         */
/* ------------------------------------------------------------------ */

export async function loadDemoEvents(
  _prev: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  await requireStaffAction({ write: true });
  const { t } = await getI18n();

  const [row] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.events);
  if ((row?.count ?? 0) > 0) {
    return { ok: false, error: t.staff.eventsExist };
  }

  const now = Date.now();
  await db().insert(schema.events).values(
    DEMO_EVENTS.map((e) => ({
      title: e.title,
      description: e.description,
      location: e.location,
      country: e.country,
      emoji: e.emoji,
      startsAt: new Date(now + e.inDays * 86_400_000),
      priceEur: e.priceEur,
      capacity: e.capacity,
      published: true,
    })),
  );

  revalidateEvents();
  return { ok: true, info: fill(t.staff.demoEventsLoaded, { n: DEMO_EVENTS.length }) };
}
