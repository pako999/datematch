import "server-only";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";

export interface ClientListFilters {
  q?: string;
  status?: schema.ClientStatus;
  city?: string;
  staffId?: string;
}

export async function listClients(filters: ClientListFilters) {
  const conditions: SQL[] = [];
  if (filters.q) {
    const like = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(schema.clients.fullName, like),
        ilike(schema.clients.email, like),
      )!,
    );
  }
  if (filters.status) conditions.push(eq(schema.clients.status, filters.status));
  if (filters.city) conditions.push(ilike(schema.clients.city, `%${filters.city}%`));
  if (filters.staffId) {
    conditions.push(eq(schema.clients.assignedStaffId, filters.staffId));
  }

  return db()
    .select({
      client: schema.clients,
      assignedStaffName: schema.staff.name,
    })
    .from(schema.clients)
    .leftJoin(schema.staff, eq(schema.staff.id, schema.clients.assignedStaffId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.clients.updatedAt))
    .limit(200);
}

export async function listStaff() {
  return db().select().from(schema.staff).orderBy(schema.staff.name);
}

export interface ClientDetail {
  client: schema.Client;
  assignedStaff: schema.Staff | null;
  preferences: schema.ClientPreferencesRow | null;
  intake: Record<string, unknown>;
  photos: schema.ClientPhoto[];
  notes: (schema.ClientNote & { staffName: string })[];
  intros: (schema.Introduction & { otherName: string; otherId: string })[];
}

export async function getClientDetail(id: string): Promise<ClientDetail | null> {
  const client = await db().query.clients.findFirst({
    where: eq(schema.clients.id, id),
  });
  if (!client) return null;

  const [assignedStaff, preferences, answers, photos, noteRows, introRows] =
    await Promise.all([
      client.assignedStaffId
        ? db().query.staff.findFirst({
            where: eq(schema.staff.id, client.assignedStaffId),
          })
        : Promise.resolve(undefined),
      db().query.clientPreferences.findFirst({
        where: eq(schema.clientPreferences.clientId, id),
      }),
      db()
        .select()
        .from(schema.intakeAnswers)
        .where(eq(schema.intakeAnswers.clientId, id)),
      db()
        .select()
        .from(schema.clientPhotos)
        .where(eq(schema.clientPhotos.clientId, id))
        .orderBy(schema.clientPhotos.position),
      db()
        .select({ note: schema.clientNotes, staffName: schema.staff.name })
        .from(schema.clientNotes)
        .innerJoin(schema.staff, eq(schema.staff.id, schema.clientNotes.staffId))
        .where(eq(schema.clientNotes.clientId, id))
        .orderBy(desc(schema.clientNotes.createdAt))
        .limit(50),
      db()
        .select()
        .from(schema.introductions)
        .where(
          or(
            eq(schema.introductions.clientAId, id),
            eq(schema.introductions.clientBId, id),
          ),
        )
        .orderBy(desc(schema.introductions.updatedAt)),
    ]);

  const intake: Record<string, unknown> = {};
  for (const a of answers) intake[a.questionKey] = a.value;

  const otherIds = introRows.map((i) =>
    i.clientAId === id ? i.clientBId : i.clientAId,
  );
  const otherNames =
    otherIds.length > 0
      ? await db()
          .select({ id: schema.clients.id, fullName: schema.clients.fullName })
          .from(schema.clients)
          .where(inArray(schema.clients.id, otherIds))
      : [];
  const nameById = new Map(otherNames.map((o) => [o.id, o.fullName]));

  return {
    client,
    assignedStaff: assignedStaff ?? null,
    preferences: preferences ?? null,
    intake,
    photos,
    notes: noteRows.map((r) => ({ ...r.note, staffName: r.staffName })),
    intros: introRows.map((i) => {
      const otherId = i.clientAId === id ? i.clientBId : i.clientAId;
      return { ...i, otherId, otherName: nameById.get(otherId) ?? "Unknown" };
    }),
  };
}

export async function listDistinctCities(): Promise<string[]> {
  const rows = await db()
    .selectDistinct({ city: schema.clients.city })
    .from(schema.clients)
    .orderBy(schema.clients.city);
  return rows.map((r) => r.city);
}

/** Row counts used by the dashboard. */
export async function countClients(where?: SQL): Promise<number> {
  const [row] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.clients)
    .where(where);
  return row?.count ?? 0;
}
