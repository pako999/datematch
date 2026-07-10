"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { PENDING_STAFF_PREFIX, requireStaffAction } from "@/lib/auth";
import { runSeed } from "@/lib/seed-data";
import { getI18n } from "@/lib/i18n";
import { fill } from "@/lib/i18n/dictionaries";
import { embedText } from "@/lib/embeddings";
import { recomputeScoresForClient } from "@/lib/matching/candidates";
import { and, isNull, ne } from "drizzle-orm";

export interface ActionResult {
  ok: boolean;
  error?: string;
  info?: string;
}

const addSchema = z.object({
  email: z.string().trim().email().max(200).transform((e) => e.toLowerCase()),
  name: z.string().trim().min(2).max(200),
  role: z.enum(schema.staffRoleEnum.enumValues),
});

/** Admin pre-provisions a staff row; the Clerk id is claimed on first sign-in. */
export async function addStaffMember(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaffAction({ admin: true });
  const parsed = addSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  }

  const existing = await db().query.staff.findFirst({
    where: eq(schema.staff.email, parsed.data.email),
  });
  if (existing) {
    const { t } = await getI18n();
    return { ok: false, error: t.staffErrors.emailAlreadyStaff };
  }

  await db().insert(schema.staff).values({
    id: `${PENDING_STAFF_PREFIX}${parsed.data.email}`,
    ...parsed.data,
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateStaffRole(
  staffId: string,
  formData: FormData,
): Promise<void> {
  const actor = await requireStaffAction({ admin: true });
  if (staffId === actor.id) {
    throw new Error("You can't change your own role");
  }
  const role = String(formData.get("role")) as schema.StaffRole;
  if (!schema.staffRoleEnum.enumValues.includes(role)) {
    throw new Error("Invalid role");
  }
  await db()
    .update(schema.staff)
    .set({ role })
    .where(eq(schema.staff.id, staffId));
  revalidatePath("/settings");
}

/**
 * Admin one-click demo data. Only fills an EMPTY roster (never wipes),
 * so it's safe to expose as a button; existing staff are preserved.
 */
export async function loadDemoData(
  _prev: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  await requireStaffAction({ admin: true });
  const [row] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.clients);
  if ((row?.count ?? 0) > 0) {
    const { t } = await getI18n();
    return { ok: false, error: t.staffErrors.rosterNotEmpty };
  }

  const summary = await runSeed(db(), { wipe: false });
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  revalidatePath("/introductions");
  revalidatePath("/settings");
  console.info(
    `Demo data loaded: ${summary.clients} clients, ${summary.scores} scores, ${summary.intros} intros`,
  );
  return { ok: true };
}

/**
 * One-click backfill after VOYAGE_API_KEY is added: embed every bio that
 * predates embeddings, then recompute scores for the affected clients.
 */
export async function backfillEmbeddings(
  _prev: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  await requireStaffAction({ admin: true });
  const { t } = await getI18n();

  if (!process.env.VOYAGE_API_KEY) {
    return { ok: false, error: t.staffErrors.embeddingsNotConfigured };
  }

  const missing = await db()
    .select({ id: schema.clients.id, bio: schema.clients.bio })
    .from(schema.clients)
    .where(and(isNull(schema.clients.embedding), ne(schema.clients.bio, "")))
    .limit(100);

  if (missing.length === 0) {
    return { ok: true, info: t.staff.embeddingsNone };
  }

  let embedded = 0;
  for (const c of missing) {
    try {
      const embedding = await embedText(c.bio);
      if (!embedding) continue;
      await db()
        .update(schema.clients)
        .set({ embedding })
        .where(eq(schema.clients.id, c.id));
      embedded++;
    } catch (err) {
      console.warn(`embedding backfill failed for ${c.id}:`, err);
    }
  }
  for (const c of missing) {
    try {
      await recomputeScoresForClient(c.id);
    } catch (err) {
      console.warn(`recompute failed for ${c.id}:`, err);
    }
  }

  revalidatePath("/settings");
  revalidatePath("/clients");
  return { ok: true, info: fill(t.staff.embeddingsDone, { n: embedded }) };
}

export async function removeStaffMember(staffId: string): Promise<void> {
  const actor = await requireStaffAction({ admin: true });
  if (staffId === actor.id) throw new Error("You can't remove yourself");
  // Clients keep their records: assigned_staff_id is ON DELETE SET NULL,
  // but notes/intros reference staff with NO ACTION — removal fails if
  // they authored history. Pending (never signed-in) rows always delete.
  await db().delete(schema.staff).where(eq(schema.staff.id, staffId));
  revalidatePath("/settings");
}
