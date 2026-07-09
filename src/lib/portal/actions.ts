"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { ageOn } from "@/lib/matching/score";
import { QUESTION_RULES } from "@/lib/matching/questions";

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

const basicsSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(200),
  phone: z.string().trim().max(40).optional(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter your date of birth"),
  gender: z.enum(schema.genderEnum.enumValues),
  city: z.string().trim().min(2, "Please enter your city").max(100),
  bio: z
    .string()
    .trim()
    .max(4000, "Please keep your introduction under 4000 characters"),
});

export async function saveBasics(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return { ok: false, error: "Your account has no email address." };
  }

  const parsed = basicsSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? undefined,
    birthdate: formData.get("birthdate"),
    gender: formData.get("gender"),
    city: formData.get("city"),
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form.",
    };
  }

  const birthdate = new Date(`${parsed.data.birthdate}T00:00:00Z`);
  if (Number.isNaN(birthdate.getTime())) {
    return { ok: false, error: "Please enter a valid date of birth." };
  }
  // Age gate: the agency only takes on adult clients.
  if (ageOn(birthdate, new Date()) < 18) {
    return { ok: false, error: "You must be at least 18 years old to register." };
  }
  if (ageOn(birthdate, new Date()) > 100) {
    return { ok: false, error: "Please double-check your date of birth." };
  }

  const values = {
    fullName: parsed.data.fullName,
    email,
    phone: parsed.data.phone || null,
    birthdate,
    gender: parsed.data.gender,
    city: parsed.data.city,
    bio: parsed.data.bio,
    updatedAt: new Date(),
  };

  const existingId = await getMyClientId(userId);
  if (existingId) {
    await db()
      .update(schema.clients)
      .set(values)
      .where(eq(schema.clients.id, existingId));
  } else {
    await db()
      .insert(schema.clients)
      .values({ ...values, clerkUserId: userId, status: "lead" });
  }

  revalidatePath(PROFILE_PATH);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Match preferences                                                   */
/* ------------------------------------------------------------------ */

const preferencesSchema = z
  .object({
    interestedInGenders: z
      .array(z.enum(schema.genderEnum.enumValues))
      .min(1, "Select at least one option for who you'd like to meet"),
    minAge: z.coerce.number().int().min(18, "Minimum age is 18").max(99),
    maxAge: z.coerce.number().int().min(18).max(99),
    maxDistanceKm: z.coerce.number().int().min(1).max(1000).nullable(),
    noSmokers: z.boolean(),
    partnerMustWantChildren: z.boolean(),
  })
  .refine((v) => v.maxAge >= v.minAge, {
    message: "Maximum age must not be below minimum age",
  });

export async function savePreferences(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const clientId = await getMyClientId(userId);
  if (!clientId) {
    return { ok: false, error: "Please save your basic details first." };
  }

  const maxDistanceRaw = String(formData.get("maxDistanceKm") ?? "").trim();
  const parsed = preferencesSchema.safeParse({
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
      error: parsed.error.issues[0]?.message ?? "Please check the form.",
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
  const clientId = await getMyClientId(userId);
  if (!clientId) {
    return { ok: false, error: "Please save your basic details first." };
  }

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
          return { ok: false, error: `Invalid answer for "${rule.label}".` };
        }
        answers.push({ questionKey: key, value: num });
        break;
      }
      case "exact": {
        const raw = String(formData.get(key) ?? "").trim();
        if (raw === "") break;
        if (!rule.options?.some((o) => o.value === raw)) {
          return { ok: false, error: `Invalid answer for "${rule.label}".` };
        }
        answers.push({ questionKey: key, value: raw });
        break;
      }
      case "overlap": {
        const raws = formData.getAll(key).map(String);
        if (raws.length === 0) break;
        if (!raws.every((v) => rule.options?.some((o) => o.value === v))) {
          return { ok: false, error: `Invalid answer for "${rule.label}".` };
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
    .set({ updatedAt: new Date() })
    .where(eq(schema.clients.id, clientId));

  revalidatePath(PROFILE_PATH);
  return { ok: true };
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

  revalidatePath(PROFILE_PATH);
  return { ok: true };
}
