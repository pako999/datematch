"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { ageOn } from "@/lib/matching/score";
import { QUESTION_RULES } from "@/lib/matching/questions";
import { afterClientChange } from "@/lib/matching/refresh";
import { capture } from "@/lib/analytics";
import { deletePhotoBlob, uploadPhotoBlob } from "@/lib/storage";
import { geocodeCity } from "@/lib/geocode";
import { parseAttributes } from "@/lib/attributes";
import { getI18n } from "@/lib/i18n";
import { fill, questionLabel, type Dict } from "@/lib/i18n/dictionaries";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const PROFILE_PATH = "/portal/profile";

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

async function getMyClientId(userId: string): Promise<string | null> {
  const row = await db().query.clients.findFirst({
    where: eq(schema.clients.clerkUserId, userId),
    columns: { id: true },
  });
  return row?.id ?? null;
}

/* ------------------------------------------------------------------ */
/* Basics (creates the client record on first save)                    */
/* ------------------------------------------------------------------ */

function basicsSchema(t: Dict) {
  return z.object({
    fullName: z.string().trim().min(2, t.portalErrors.fullNameRequired).max(200),
    phone: z.string().trim().max(40).optional(),
    birthdate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t.portalErrors.birthdateRequired),
    gender: z.enum(schema.genderEnum.enumValues),
    city: z.string().trim().min(2, t.portalErrors.cityRequired).max(100),
    country: z.string().trim().min(2).max(100),
    bio: z.string().trim().max(4000, t.portalErrors.bioTooLong),
  });
}

export async function saveBasics(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getI18n();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return { ok: false, error: t.portalErrors.noEmail };
  }

  const parsed = basicsSchema(t).safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? undefined,
    birthdate: formData.get("birthdate"),
    gender: formData.get("gender"),
    city: formData.get("city"),
    country: formData.get("country") || "Slovenija",
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? t.portalErrors.checkForm,
    };
  }

  const birthdate = new Date(`${parsed.data.birthdate}T00:00:00Z`);
  if (Number.isNaN(birthdate.getTime())) {
    return { ok: false, error: t.portalErrors.invalidBirthdate };
  }
  // Age gate: the agency only takes on adult clients.
  if (ageOn(birthdate, new Date()) < 18) {
    return { ok: false, error: t.portalErrors.tooYoung };
  }
  if (ageOn(birthdate, new Date()) > 100) {
    return { ok: false, error: t.portalErrors.checkBirthdate };
  }

  const attrs = parseAttributes(formData);
  if (!attrs.ok) {
    return { ok: false, error: t.portalErrors.checkForm };
  }

  const coords = await geocodeCity(parsed.data.city, parsed.data.country);
  const values = {
    ...attrs.data,
    fullName: parsed.data.fullName,
    email,
    phone: parsed.data.phone || null,
    birthdate,
    gender: parsed.data.gender,
    city: parsed.data.city,
    country: parsed.data.country,
    ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
    bio: parsed.data.bio,
    updatedAt: new Date(),
  };

  const existingId = await getMyClientId(userId);
  let clientId = existingId;
  if (existingId) {
    await db()
      .update(schema.clients)
      .set(values)
      .where(eq(schema.clients.id, existingId));
  } else {
    const [row] = await db()
      .insert(schema.clients)
      .values({ ...values, clerkUserId: userId, status: "lead" })
      .returning({ id: schema.clients.id });
    clientId = row!.id;
    capture("client_created", userId, { source: "portal", clientId });
  }

  if (clientId) {
    await afterClientChange(clientId, { bioChanged: true });
  }
  revalidatePath(PROFILE_PATH);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Match preferences                                                   */
/* ------------------------------------------------------------------ */

function preferencesSchema(t: Dict) {
  return z
    .object({
      interestedInGenders: z
        .array(z.enum(schema.genderEnum.enumValues))
        .min(1, t.portalErrors.selectGenderInterest),
      minAge: z.coerce.number().int().min(18, t.portalErrors.minAge18).max(99),
      maxAge: z.coerce.number().int().min(18).max(99),
      maxDistanceKm: z.coerce.number().int().min(1).max(1000).nullable(),
      noSmokers: z.boolean(),
      partnerMustWantChildren: z.boolean(),
    })
    .refine((v) => v.maxAge >= v.minAge, {
      message: t.portalErrors.maxAgeBelowMin,
    });
}

export async function savePreferences(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getI18n();
  const clientId = await getMyClientId(userId);
  if (!clientId) {
    return { ok: false, error: t.portalErrors.saveBasicsFirst };
  }

  const maxDistanceRaw = String(formData.get("maxDistanceKm") ?? "").trim();
  const parsed = preferencesSchema(t).safeParse({
    interestedInGenders: formData.getAll("interestedInGenders"),
    minAge: formData.get("minAge"),
    maxAge: formData.get("maxAge"),
    maxDistanceKm: maxDistanceRaw === "" ? null : maxDistanceRaw,
    noSmokers: formData.get("noSmokers") === "on",
    partnerMustWantChildren: formData.get("partnerMustWantChildren") === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? t.portalErrors.checkForm,
    };
  }

  // The portal exposes the two most common hard/soft requirements as
  // simple toggles; matchmakers can refine richer dealbreakers/must-haves
  // on the staff side without the client-facing form becoming a wall.
  const dealbreakers = parsed.data.noSmokers
    ? [{ questionKey: "smoking", disallowedValues: ["regularly", "socially"] }]
    : [];
  const mustHaves = parsed.data.partnerMustWantChildren
    ? [{ questionKey: "wants_children", acceptedValues: ["yes"] }]
    : [];

  await db()
    .insert(schema.clientPreferences)
    .values({
      clientId,
      interestedInGenders: parsed.data.interestedInGenders,
      minAge: parsed.data.minAge,
      maxAge: parsed.data.maxAge,
      maxDistanceKm: parsed.data.maxDistanceKm,
      dealbreakers,
      mustHaves,
    })
    .onConflictDoUpdate({
      target: schema.clientPreferences.clientId,
      set: {
        interestedInGenders: parsed.data.interestedInGenders,
        minAge: parsed.data.minAge,
        maxAge: parsed.data.maxAge,
        maxDistanceKm: parsed.data.maxDistanceKm,
        dealbreakers,
        mustHaves,
      },
    });
  await db()
    .update(schema.clients)
    .set({ updatedAt: new Date() })
    .where(eq(schema.clients.id, clientId));

  await afterClientChange(clientId);
  revalidatePath(PROFILE_PATH);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Compatibility questionnaire                                         */
/* ------------------------------------------------------------------ */

export async function saveQuestionnaire(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getI18n();
  const clientId = await getMyClientId(userId);
  if (!clientId) {
    return { ok: false, error: t.portalErrors.saveBasicsFirst };
  }
  const invalid = (key: string, fallback: string): ActionResult => ({
    ok: false,
    error: fill(t.portalErrors.invalidAnswer, {
      label: questionLabel(t, key, fallback),
    }),
  });

  const answers: { questionKey: string; value: unknown }[] = [];
  for (const [key, rule] of Object.entries(QUESTION_RULES)) {
    switch (rule.type) {
      case "similarity":
      case "complementarity": {
        const raw = String(formData.get(key) ?? "").trim();
        if (raw === "") break; // unanswered
        const num = Number(raw);
        const min = rule.scaleMin ?? 1;
        const max = rule.scaleMax ?? 5;
        if (!Number.isInteger(num) || num < min || num > max) {
          return invalid(key, rule.label);
        }
        answers.push({ questionKey: key, value: num });
        break;
      }
      case "exact": {
        const raw = String(formData.get(key) ?? "").trim();
        if (raw === "") break;
        if (!rule.options?.some((o) => o.value === raw)) {
          return invalid(key, rule.label);
        }
        answers.push({ questionKey: key, value: raw });
        break;
      }
      case "overlap": {
        const raws = formData.getAll(key).map(String);
        if (raws.length === 0) break;
        if (!raws.every((v) => rule.options?.some((o) => o.value === v))) {
          return invalid(key, rule.label);
        }
        answers.push({ questionKey: key, value: raws });
        break;
      }
    }
  }

  // Replace-all is idempotent and lets clients clear an answer by
  // deselecting it; per-question upsert would resurrect stale rows.
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
    .set({ updatedAt: new Date(), intakeSummary: null })
    .where(eq(schema.clients.id, clientId));

  capture("intake_completed", userId, {
    clientId,
    answers: answers.length,
    source: "portal",
  });
  await afterClientChange(clientId);
  revalidatePath(PROFILE_PATH);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Photos (client uploads their own — staff-viewable, never public)    */
/* ------------------------------------------------------------------ */

const MAX_PORTAL_PHOTOS = 6;

export async function uploadMyPhoto(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const { t } = await getI18n();
  const clientId = await getMyClientId(userId);
  if (!clientId) {
    return { ok: false, error: t.portalErrors.saveBasicsFirst };
  }

  const existing = await db()
    .select()
    .from(schema.clientPhotos)
    .where(eq(schema.clientPhotos.clientId, clientId));
  if (existing.length >= MAX_PORTAL_PHOTOS) {
    return {
      ok: false,
      error: fill(t.portalErrors.maxPhotos, { n: MAX_PORTAL_PHOTOS }),
    };
  }

  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return { ok: false, error: t.portalErrors.choosePhoto };
  }
  try {
    const url = await uploadPhotoBlob(clientId, file);
    await db().insert(schema.clientPhotos).values({
      clientId,
      url,
      position: existing.length,
      isPrimary: existing.length === 0,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : t.portalErrors.uploadFailed,
    };
  }

  revalidatePath(PROFILE_PATH);
  return { ok: true };
}

export async function deleteMyPhoto(photoId: string): Promise<void> {
  const userId = await requireUserId();
  const clientId = await getMyClientId(userId);
  if (!clientId) return;

  const photo = await db().query.clientPhotos.findFirst({
    where: eq(schema.clientPhotos.id, photoId),
  });
  // Owner check: clients can only remove their own photos.
  if (!photo || photo.clientId !== clientId) return;

  await db()
    .delete(schema.clientPhotos)
    .where(eq(schema.clientPhotos.id, photoId));
  await deletePhotoBlob(photo.url);
  revalidatePath(PROFILE_PATH);
}

/* ------------------------------------------------------------------ */
/* Consent                                                             */
/* ------------------------------------------------------------------ */

export async function saveConsent(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const clientId = await getMyClientId(userId);
  if (!clientId) {
    return { ok: false, error: "Please save your basic details first." };
  }

  await db()
    .update(schema.clients)
    .set({
      consentToIntroduce: formData.get("consentToIntroduce") === "on",
      updatedAt: new Date(),
    })
    .where(eq(schema.clients.id, clientId));

  await afterClientChange(clientId);
  revalidatePath(PROFILE_PATH);
  return { ok: true };
}
