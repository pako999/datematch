/**
 * Physical & personal attribute option keys. Stored as stable keys on the
 * client row; translated at display time via the i18n dictionaries.
 */

import type { Dict } from "@/lib/i18n/dictionaries";

export const EYE_COLORS = ["brown", "blue", "green", "hazel", "gray", "other"] as const;
export const HAIR_COLORS = ["blonde", "brown", "black", "red", "gray", "bald", "other"] as const;
export const BODY_TYPES = ["slim", "athletic", "average", "curvy", "plus"] as const;
export const EDUCATIONS = ["highschool", "vocational", "bachelor", "master", "phd", "other"] as const;

export const HEIGHT_MIN = 120;
export const HEIGHT_MAX = 230;
export const WEIGHT_MIN = 35;
export const WEIGHT_MAX = 250;

export interface ClientAttributes {
  heightCm: number | null;
  weightKg: number | null;
  eyeColor: string | null;
  hairColor: string | null;
  bodyType: string | null;
  education: string | null;
  occupation: string | null;
}

/** "175 cm · 72 kg · Barva oči: modre · rjavi lasje" — profile headers. */
export function formatAttributes(a: ClientAttributes, t: Dict): string {
  const parts: string[] = [];
  if (a.heightCm) parts.push(`${a.heightCm} cm`);
  if (a.weightKg) parts.push(`${a.weightKg} kg`);
  if (a.eyeColor) {
    parts.push(`${t.attributes.eyeColor}: ${t.attributes.eyeColors[a.eyeColor] ?? a.eyeColor}`);
  }
  if (a.hairColor) {
    parts.push(`${t.attributes.hairColor}: ${t.attributes.hairColors[a.hairColor] ?? a.hairColor}`);
  }
  if (a.bodyType) {
    parts.push(`${t.attributes.bodyType}: ${t.attributes.bodyTypes[a.bodyType] ?? a.bodyType}`);
  }
  if (a.education) {
    parts.push(`${t.attributes.education}: ${t.attributes.educations[a.education] ?? a.education}`);
  }
  if (a.occupation) parts.push(a.occupation);
  return parts.join(" · ");
}

/** Parse the shared attribute fields from a (portal or staff) form. */
export function parseAttributes(
  formData: FormData,
): { ok: true; data: ClientAttributes } | { ok: false } {
  const num = (name: string, min: number, max: number): number | null | false => {
    const raw = String(formData.get(name) ?? "").trim();
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) return false;
    return n;
  };
  const opt = (name: string, allowed: readonly string[]): string | null | false => {
    const raw = String(formData.get(name) ?? "").trim();
    if (raw === "") return null;
    return allowed.includes(raw) ? raw : false;
  };

  const heightCm = num("heightCm", HEIGHT_MIN, HEIGHT_MAX);
  const weightKg = num("weightKg", WEIGHT_MIN, WEIGHT_MAX);
  const eyeColor = opt("eyeColor", EYE_COLORS);
  const hairColor = opt("hairColor", HAIR_COLORS);
  const bodyType = opt("bodyType", BODY_TYPES);
  const education = opt("education", EDUCATIONS);
  const occupation = String(formData.get("occupation") ?? "").trim().slice(0, 200) || null;

  if (
    heightCm === false ||
    weightKg === false ||
    eyeColor === false ||
    hairColor === false ||
    bodyType === false ||
    education === false
  ) {
    return { ok: false };
  }
  return {
    ok: true,
    data: { heightCm, weightKg, eyeColor, hairColor, bodyType, education, occupation },
  };
}
