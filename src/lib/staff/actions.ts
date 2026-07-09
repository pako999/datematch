"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { canManageClient, requireStaffAction } from "@/lib/auth";
import { capture } from "@/lib/analytics";
import { afterClientChange } from "@/lib/matching/refresh";
import { ageOn } from "@/lib/matching/score";
import { QUESTION_RULES } from "@/lib/matching/questions";
import { generateIntakeSummary } from "@/lib/intake/summarize";
import { generateRationale } from "@/lib/matching/explain";
import { recomputeScoresForClient } from "@/lib/matching/candidates";
import { sendClientDeleted } from "@/inngest/client";
import { deletePhotoBlob, uploadPhotoBlob } from "@/lib/storage";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireManagedClient(clientId: string, opts: { write?: boolean } = { write: true }) {
  const staff = await requireStaffAction(opts);
  const client = await db().query.clients.findFirst({
    where: eq(schema.clients.id, clientId),
  });
  if (!client) throw new Error("Client not found");
  if (opts.write && !canManageClient(staff, client)) {
    throw new Error("This client is assigned to another matchmaker");
  }
  return { staff, client };
}

function fail(error: string): ActionResult {
  return { ok: false, error };
}

/* ------------------------------------------------------------------ */
/* Create / edit basics                                                */
/* ------------------------------------------------------------------ */

const basicsSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(200),
  email: z.string().trim().email("Valid email required").max(200),
  phone: z.string().trim().max(40).optional(),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Birthdate required"),
  gender: z.enum(schema.genderEnum.enumValues),
  city: z.string().trim().min(2, "City is required").max(100),
  lat: z.coerce.number().min(-90).max(90).nullable(),
  lng: z.coerce.number().min(-180).max(180).nullable(),
  bio: z.string().trim().max(4000),
});

function parseBasics(formData: FormData) {
  const latRaw = String(formData.get("lat") ?? "").trim();
  const lngRaw = String(formData.get("lng") ?? "").trim();
  return basicsSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? undefined,
    birthdate: formData.get("birthdate"),
    gender: formData.get("gender"),
    city: formData.get("city"),
    lat: latRaw === "" ? null : latRaw,
    lng: lngRaw === "" ? null : lngRaw,
    bio: formData.get("bio") ?? "",
  });
}

export async function createClient(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const staff = await requireStaffAction({ write: true });
  const parsed = parseBasics(formData);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the form");
  }
  const birthdate = new Date(`${parsed.data.birthdate}T00:00:00Z`);
  if (ageOn(birthdate, new Date()) < 18) {
    return fail("Clients must be at least 18 years old");
  }

  const [row] = await db()
    .insert(schema.clients)
    .values({
      ...parsed.data,
      phone: parsed.data.phone || null,
      birthdate,
      status: "lead",
      assignedStaffId: staff.id,
      updatedByStaffId: staff.id,
    })
    .returning({ id: schema.clients.id });

  capture("client_created", staff.id, { source: "staff", clientId: row!.id });
  await afterClientChange(row!.id, { bioChanged: parsed.data.bio.length > 0 });
  redirect(`/clients/${row!.id}`);
}

export async function updateClientBasics(
  clientId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { staff, client } = await requireManagedClient(clientId);
  const parsed = parseBasics(formData);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the form");
  }
  const birthdate = new Date(`${parsed.data.birthdate}T00:00:00Z`);
  if (ageOn(birthdate, new Date()) < 18) {
    return fail("Clients must be at least 18 years old");
  }

  const bioChanged = client.bio !== parsed.data.bio;
  await db()
    .update(schema.clients)
    .set({
      ...parsed.data,
      phone: parsed.data.phone || null,
      birthdate,
      updatedAt: new Date(),
      updatedByStaffId: staff.id,
      // Bio changed → stale summary and embedding.
      ...(bioChanged ? { intakeSummary: null, embedding: null } : {}),
    })
    .where(eq(schema.clients.id, clientId));

  await afterClientChange(clientId, { bioChanged });
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Management: status, tier, assignment, consent                       */
/* ------------------------------------------------------------------ */

const managementSchema = z.object({
  status: z.enum(schema.clientStatusEnum.enumValues),
  membershipTier: z.enum(schema.membershipTierEnum.enumValues),
  assignedStaffId: z.string().nullable(),
  consentToIntroduce: z.boolean(),
});

export async function updateClientManagement(
  clientId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { staff } = await requireManagedClient(clientId);
  const assignedRaw = String(formData.get("assignedStaffId") ?? "");
  const parsed = managementSchema.safeParse({
    status: formData.get("status"),
    membershipTier: formData.get("membershipTier"),
    assignedStaffId: assignedRaw === "" ? null : assignedRaw,
    consentToIntroduce: formData.get("consentToIntroduce") === "on",
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the form");
  }

  await db()
    .update(schema.clients)
    .set({ ...parsed.data, updatedAt: new Date(), updatedByStaffId: staff.id })
    .where(eq(schema.clients.id, clientId));

  await afterClientChange(clientId);
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Preferences                                                         */
/* ------------------------------------------------------------------ */

const ruleArray = z.array(
  z.object({
    questionKey: z.string().min(1),
    disallowedValues: z.array(z.unknown()).optional(),
    acceptedValues: z.array(z.unknown()).optional(),
  }),
);

export async function updateClientPreferences(
  clientId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { staff } = await requireManagedClient(clientId);

  const genders = formData
    .getAll("interestedInGenders")
    .map(String) as schema.Gender[];
  if (
    genders.length === 0 ||
    !genders.every((g) => schema.genderEnum.enumValues.includes(g))
  ) {
    return fail("Select at least one gender preference");
  }
  const minAge = Number(formData.get("minAge"));
  const maxAge = Number(formData.get("maxAge"));
  if (!Number.isInteger(minAge) || !Number.isInteger(maxAge) || minAge < 18 || maxAge > 99 || maxAge < minAge) {
    return fail("Age range must be 18–99 with max ≥ min");
  }
  const maxDistanceRaw = String(formData.get("maxDistanceKm") ?? "").trim();
  const maxDistanceKm = maxDistanceRaw === "" ? null : Number(maxDistanceRaw);
  if (maxDistanceKm !== null && (!Number.isInteger(maxDistanceKm) || maxDistanceKm < 1)) {
    return fail("Max distance must be a positive whole number of km");
  }

  // Dealbreakers/must-haves come as JSON from the advanced editor.
  let dealbreakers: unknown;
  let mustHaves: unknown;
  try {
    dealbreakers = JSON.parse(String(formData.get("dealbreakers") ?? "[]"));
    mustHaves = JSON.parse(String(formData.get("mustHaves") ?? "[]"));
  } catch {
    return fail("Dealbreakers / must-haves must be valid JSON arrays");
  }
  const dbParsed = ruleArray.safeParse(dealbreakers);
  const mhParsed = ruleArray.safeParse(mustHaves);
  if (!dbParsed.success || !mhParsed.success) {
    return fail(
      'Rules must look like [{"questionKey":"smoking","disallowedValues":["regularly"]}]',
    );
  }
  const knownKeys = new Set(Object.keys(QUESTION_RULES));
  const badKey = [...dbParsed.data, ...mhParsed.data].find(
    (r) => !knownKeys.has(r.questionKey),
  );
  if (badKey) return fail(`Unknown question key: ${badKey.questionKey}`);

  const values = {
    interestedInGenders: genders,
    minAge,
    maxAge,
    maxDistanceKm,
    dealbreakers: dbParsed.data.map((r) => ({
      questionKey: r.questionKey,
      disallowedValues: r.disallowedValues ?? [],
    })),
    mustHaves: mhParsed.data.map((r) => ({
      questionKey: r.questionKey,
      acceptedValues: r.acceptedValues ?? [],
    })),
  };
  await db()
    .insert(schema.clientPreferences)
    .values({ clientId, ...values })
    .onConflictDoUpdate({
      target: schema.clientPreferences.clientId,
      set: values,
    });
  await db()
    .update(schema.clients)
    .set({ updatedAt: new Date(), updatedByStaffId: staff.id })
    .where(eq(schema.clients.id, clientId));

  await afterClientChange(clientId);
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Intake questionnaire (staff-entered)                                */
/* ------------------------------------------------------------------ */

export async function updateClientIntake(
  clientId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { staff } = await requireManagedClient(clientId);

  const answers: { questionKey: string; value: unknown }[] = [];
  for (const [key, rule] of Object.entries(QUESTION_RULES)) {
    if (rule.type === "similarity" || rule.type === "complementarity") {
      const raw = String(formData.get(key) ?? "").trim();
      if (raw === "") continue;
      const num = Number(raw);
      const min = rule.scaleMin ?? 1;
      const max = rule.scaleMax ?? 5;
      if (!Number.isInteger(num) || num < min || num > max) {
        return fail(`Invalid answer for "${rule.label}"`);
      }
      answers.push({ questionKey: key, value: num });
    } else if (rule.type === "exact") {
      const raw = String(formData.get(key) ?? "").trim();
      if (raw === "") continue;
      if (!rule.options?.some((o) => o.value === raw)) {
        return fail(`Invalid answer for "${rule.label}"`);
      }
      answers.push({ questionKey: key, value: raw });
    } else {
      const raws = formData.getAll(key).map(String);
      if (raws.length === 0) continue;
      if (!raws.every((v) => rule.options?.some((o) => o.value === v))) {
        return fail(`Invalid answer for "${rule.label}"`);
      }
      answers.push({ questionKey: key, value: raws });
    }
  }

  await db()
    .delete(schema.intakeAnswers)
    .where(eq(schema.intakeAnswers.clientId, clientId));
  if (answers.length > 0) {
    await db()
      .insert(schema.intakeAnswers)
      .values(answers.map((a) => ({ ...a, clientId })));
  }
  await db()
    .update(schema.clients)
    .set({ updatedAt: new Date(), updatedByStaffId: staff.id, intakeSummary: null })
    .where(eq(schema.clients.id, clientId));

  capture("intake_completed", staff.id, { clientId, answers: answers.length, source: "staff" });
  await afterClientChange(clientId);
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Notes & photos                                                      */
/* ------------------------------------------------------------------ */

export async function addClientNote(
  clientId: string,
  formData: FormData,
): Promise<void> {
  const { staff } = await requireManagedClient(clientId);
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await db().insert(schema.clientNotes).values({ clientId, staffId: staff.id, body });
  revalidatePath(`/clients/${clientId}`);
}

async function insertPhotoRow(clientId: string, url: string): Promise<void> {
  const existing = await db()
    .select()
    .from(schema.clientPhotos)
    .where(eq(schema.clientPhotos.clientId, clientId));
  await db().insert(schema.clientPhotos).values({
    clientId,
    url,
    position: existing.length,
    isPrimary: existing.length === 0,
  });
}

export async function uploadClientPhoto(
  clientId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireManagedClient(clientId);
  const file = formData.get("photo");
  if (!(file instanceof File)) return fail("Choose a photo to upload");
  try {
    const url = await uploadPhotoBlob(clientId, file);
    await insertPhotoRow(clientId, url);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Upload failed");
  }
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

export async function addClientPhoto(
  clientId: string,
  formData: FormData,
): Promise<void> {
  await requireManagedClient(clientId);
  const url = String(formData.get("url") ?? "").trim();
  if (!/^https:\/\/.+/.test(url)) throw new Error("Photo URL must be https");
  await insertPhotoRow(clientId, url);
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientPhoto(
  clientId: string,
  photoId: string,
): Promise<void> {
  await requireManagedClient(clientId);
  const photo = await db().query.clientPhotos.findFirst({
    where: eq(schema.clientPhotos.id, photoId),
  });
  await db().delete(schema.clientPhotos).where(eq(schema.clientPhotos.id, photoId));
  if (photo) await deletePhotoBlob(photo.url);
  revalidatePath(`/clients/${clientId}`);
}

/* ------------------------------------------------------------------ */
/* AI + scoring buttons                                                */
/* ------------------------------------------------------------------ */

export async function recomputeClientScores(clientId: string): Promise<void> {
  await requireManagedClient(clientId, { write: true });
  await recomputeScoresForClient(clientId);
  revalidatePath(`/clients/${clientId}`);
}

export async function regenerateIntakeSummary(clientId: string): Promise<void> {
  await requireManagedClient(clientId, { write: true });
  await generateIntakeSummary(clientId, true);
  revalidatePath(`/clients/${clientId}`);
}

export async function generateRationaleAction(
  matchScoreId: string,
  clientId: string,
): Promise<void> {
  await requireStaffAction({ write: true });
  await generateRationale(matchScoreId);
  revalidatePath(`/clients/${clientId}`);
}

/* ------------------------------------------------------------------ */
/* GDPR hard delete                                                    */
/* ------------------------------------------------------------------ */

export async function deleteClientHard(
  clientId: string,
  formData: FormData,
): Promise<void> {
  // DRY RUN reasoning happens in the UI: the confirm field must contain
  // the client's exact full name, and we re-verify it here before the
  // irreversible cascade (scores, intros, feedback, notes, photos).
  const staff = await requireStaffAction({ admin: true });
  const client = await db().query.clients.findFirst({
    where: eq(schema.clients.id, clientId),
  });
  if (!client) throw new Error("Client not found");
  const confirm = String(formData.get("confirmName") ?? "").trim();
  if (confirm !== client.fullName) {
    throw new Error("Confirmation name did not match — nothing was deleted");
  }

  await db().delete(schema.clients).where(eq(schema.clients.id, clientId));
  await sendClientDeleted({ clientId, email: client.email });
  console.info(`GDPR delete: client ${clientId} removed by ${staff.id}`);
  redirect("/clients");
}
