/**
 * Compatibility scoring engine.
 *
 * Pure functions — no DB access, no network. The recompute pipeline
 * (Inngest) pre-filters candidates in SQL, loads both sides, computes the
 * pgvector cosine similarity in the same query, and calls
 * `computePairScore` per pair. That keeps this module trivially unit
 * testable and the SQL pre-filter merely an optimization: every hard
 * filter is re-checked here, so a stale pre-filter can never produce a
 * nonzero score for an ineligible pair.
 */

import {
  COMPONENT_WEIGHTS,
  QUESTION_RULES,
  type ComponentKey,
} from "./questions";
import type { Gender } from "@/db/schema";

/* ------------------------------------------------------------------ */
/* Input types                                                         */
/* ------------------------------------------------------------------ */

export interface Dealbreaker {
  questionKey: string;
  disallowedValues: unknown[];
}

export interface MustHave {
  questionKey: string;
  acceptedValues: unknown[];
}

/** Everything the engine needs about one client, denormalized. */
export interface ScoringClient {
  id: string;
  gender: Gender;
  birthdate: Date;
  city: string;
  lat: number | null;
  lng: number | null;
  status: string;
  consentToIntroduce: boolean;
  preferences: {
    interestedInGenders: Gender[];
    minAge: number;
    maxAge: number;
    maxDistanceKm: number | null;
    dealbreakers: Dealbreaker[];
    mustHaves: MustHave[];
  };
  /** questionKey → answer value (likert number, string, or string[]). */
  intake: Record<string, unknown>;
}

export interface ScoreOptions {
  /**
   * Cosine similarity of the two bio embeddings in [-1, 1], typically
   * computed by pgvector (`1 - (a.embedding <=> b.embedding)`).
   * Pass null/undefined when either embedding is missing — the semantic
   * component is then dropped and remaining weights renormalized.
   */
  bioCosineSimilarity?: number | null;
  /** True if the pair exists in match_exclusions. */
  excluded?: boolean;
  /** Reference date for age computation (defaults to now). */
  asOf?: Date;
}

/* ------------------------------------------------------------------ */
/* Output types                                                        */
/* ------------------------------------------------------------------ */

export type HardFilterFailure =
  | "excluded_pair"
  | "status_not_active"
  | "no_consent"
  | "gender_interest_mismatch"
  | "outside_age_range"
  | "outside_distance"
  | "dealbreaker_hit";

export interface ComponentBreakdown {
  /** Raw component value in [0, 1], or null if not computable. */
  raw: number | null;
  /** Configured weight of this component. */
  weight: number;
  /** Effective weight after renormalization over available components. */
  effectiveWeight: number;
  /** raw × effectiveWeight × 100 — this component's points in the score. */
  points: number;
  detail?: unknown;
}

export interface ScoreBreakdown {
  hardFilter: {
    passed: boolean;
    failures: HardFilterFailure[];
  };
  components: Record<ComponentKey, ComponentBreakdown>;
  score: number;
}

export interface PairScore {
  /** 0–100, one decimal. 0 iff a hard filter failed or nothing scoreable. */
  score: number;
  breakdown: ScoreBreakdown;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Canonical pair ordering for match_scores / match_exclusions rows. */
export function canonicalPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

export function ageOn(birthdate: Date, asOf: Date): number {
  let age = asOf.getUTCFullYear() - birthdate.getUTCFullYear();
  const beforeBirthday =
    asOf.getUTCMonth() < birthdate.getUTCMonth() ||
    (asOf.getUTCMonth() === birthdate.getUTCMonth() &&
      asOf.getUTCDate() < birthdate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Great-circle distance in km (haversine). */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    throw new Error("cosineSimilarity: vectors must be same nonzero length");
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function valuesMatch(answer: unknown, candidates: unknown[]): boolean {
  const answerSet = Array.isArray(answer) ? answer : [answer];
  return answerSet.some((v) => candidates.some((c) => c === v));
}

/* ------------------------------------------------------------------ */
/* Hard filters                                                        */
/* ------------------------------------------------------------------ */

/**
 * All reasons a pair is ineligible. Mirrors the SQL candidate pre-filter;
 * the SQL side narrows the pool, this is the source of truth.
 */
export function getHardFilterFailures(
  a: ScoringClient,
  b: ScoringClient,
  opts: ScoreOptions = {},
): HardFilterFailure[] {
  const failures: HardFilterFailure[] = [];
  const asOf = opts.asOf ?? new Date();

  if (opts.excluded) failures.push("excluded_pair");
  if (a.status !== "active" || b.status !== "active") {
    failures.push("status_not_active");
  }
  if (!a.consentToIntroduce || !b.consentToIntroduce) {
    failures.push("no_consent");
  }

  const aWantsB = a.preferences.interestedInGenders.includes(b.gender);
  const bWantsA = b.preferences.interestedInGenders.includes(a.gender);
  if (!aWantsB || !bWantsA) failures.push("gender_interest_mismatch");

  const ageA = ageOn(a.birthdate, asOf);
  const ageB = ageOn(b.birthdate, asOf);
  const ageOk =
    ageB >= a.preferences.minAge &&
    ageB <= a.preferences.maxAge &&
    ageA >= b.preferences.minAge &&
    ageA <= b.preferences.maxAge;
  if (!ageOk) failures.push("outside_age_range");

  // Distance constraint applies only when both sides have coordinates and
  // at least one side set a max distance.
  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    const d = haversineKm(a.lat, a.lng, b.lat, b.lng);
    const maxA = a.preferences.maxDistanceKm;
    const maxB = b.preferences.maxDistanceKm;
    if ((maxA != null && d > maxA) || (maxB != null && d > maxB)) {
      failures.push("outside_distance");
    }
  }

  const dealbreakerHit = (self: ScoringClient, other: ScoringClient) =>
    self.preferences.dealbreakers.some((db) => {
      const answer = other.intake[db.questionKey];
      return answer !== undefined && valuesMatch(answer, db.disallowedValues);
    });
  if (dealbreakerHit(a, b) || dealbreakerHit(b, a)) {
    failures.push("dealbreaker_hit");
  }

  return failures;
}

/* ------------------------------------------------------------------ */
/* Component: intake compatibility (40%)                               */
/* ------------------------------------------------------------------ */

interface PerQuestionScore {
  questionKey: string;
  type: string;
  weight: number;
  value: number;
}

function scoreIntake(
  a: ScoringClient,
  b: ScoringClient,
): { raw: number | null; detail: PerQuestionScore[] } {
  const perQuestion: PerQuestionScore[] = [];

  for (const [key, rule] of Object.entries(QUESTION_RULES)) {
    const av = a.intake[key];
    const bv = b.intake[key];
    if (av === undefined || bv === undefined) continue; // unanswered → skip

    let value: number | null = null;
    switch (rule.type) {
      case "exact": {
        value = av === bv ? 1 : 0;
        break;
      }
      case "similarity":
      case "complementarity": {
        if (typeof av !== "number" || typeof bv !== "number") break;
        const min = rule.scaleMin ?? 1;
        const max = rule.scaleMax ?? 5;
        const range = max - min;
        if (range <= 0) break;
        const closeness = 1 - Math.abs(av - bv) / range;
        value = clamp01(
          rule.type === "similarity" ? closeness : 1 - closeness,
        );
        break;
      }
      case "overlap": {
        if (!Array.isArray(av) || !Array.isArray(bv)) break;
        const setA = new Set(av);
        const setB = new Set(bv);
        const union = new Set([...setA, ...setB]);
        if (union.size === 0) break;
        let intersection = 0;
        for (const v of setA) if (setB.has(v)) intersection++;
        value = intersection / union.size;
        break;
      }
    }

    if (value !== null) {
      perQuestion.push({ questionKey: key, type: rule.type, weight: rule.weight, value });
    }
  }

  const totalWeight = perQuestion.reduce((s, q) => s + q.weight, 0);
  if (totalWeight === 0) return { raw: null, detail: perQuestion };

  const raw =
    perQuestion.reduce((s, q) => s + q.value * q.weight, 0) / totalWeight;
  return { raw: clamp01(raw), detail: perQuestion };
}

/* ------------------------------------------------------------------ */
/* Component: semantic bio similarity (25%)                            */
/* ------------------------------------------------------------------ */

/**
 * Text-embedding cosine similarities cluster in a narrow high band, so raw
 * cosine is a poor 0–1 signal. Rescale [SEM_LO, SEM_HI] → [0, 1]; values
 * are calibration constants, adjustable without touching the engine.
 */
const SEM_LO = 0.15;
const SEM_HI = 0.85;

function scoreSemantic(cos: number | null | undefined): {
  raw: number | null;
  detail: { cosine: number | null };
} {
  if (cos == null || Number.isNaN(cos)) {
    return { raw: null, detail: { cosine: null } };
  }
  return {
    raw: clamp01((cos - SEM_LO) / (SEM_HI - SEM_LO)),
    detail: { cosine: cos },
  };
}

/* ------------------------------------------------------------------ */
/* Component: must-haves satisfaction (20%, two-way)                   */
/* ------------------------------------------------------------------ */

function mustHavesSatisfied(self: ScoringClient, other: ScoringClient): number {
  const wants = self.preferences.mustHaves;
  if (wants.length === 0) return 1; // nothing required → fully satisfied
  const satisfied = wants.filter((mh) => {
    const answer = other.intake[mh.questionKey];
    return answer !== undefined && valuesMatch(answer, mh.acceptedValues);
  }).length;
  return satisfied / wants.length;
}

function scoreMustHaves(
  a: ScoringClient,
  b: ScoringClient,
): { raw: number; detail: { aSatisfiedByB: number; bSatisfiedByA: number } } {
  const aSatisfiedByB = mustHavesSatisfied(a, b);
  const bSatisfiedByA = mustHavesSatisfied(b, a);
  return {
    raw: clamp01((aSatisfiedByB + bSatisfiedByA) / 2),
    detail: { aSatisfiedByB, bSatisfiedByA },
  };
}

/* ------------------------------------------------------------------ */
/* Component: proximity (15%)                                          */
/* ------------------------------------------------------------------ */

/** Distance up to which proximity is flat 1.0 (same-city dating radius). */
const PROX_FLAT_KM = 15;
/** Decay constant: score halves roughly every DECAY·ln2 ≈ 35 km beyond the flat zone. */
const PROX_DECAY_KM = 50;

function scoreProximity(
  a: ScoringClient,
  b: ScoringClient,
): { raw: number | null; detail: { distanceKm: number | null; sameCity: boolean } } {
  const sameCity = a.city.trim().toLowerCase() === b.city.trim().toLowerCase();

  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) {
    // No coordinates: same city is all we know.
    return sameCity
      ? { raw: 1, detail: { distanceKm: null, sameCity } }
      : { raw: null, detail: { distanceKm: null, sameCity } };
  }

  const d = haversineKm(a.lat, a.lng, b.lat, b.lng);
  const raw =
    sameCity || d <= PROX_FLAT_KM
      ? 1
      : Math.exp(-(d - PROX_FLAT_KM) / PROX_DECAY_KM);
  return { raw: clamp01(raw), detail: { distanceKm: Math.round(d * 10) / 10, sameCity } };
}

/* ------------------------------------------------------------------ */
/* Main entry point                                                    */
/* ------------------------------------------------------------------ */

export function computePairScore(
  a: ScoringClient,
  b: ScoringClient,
  opts: ScoreOptions = {},
): PairScore {
  const failures = getHardFilterFailures(a, b, opts);

  const intake = scoreIntake(a, b);
  const semantic = scoreSemantic(opts.bioCosineSimilarity);
  const mustHaves = scoreMustHaves(a, b);
  const proximity = scoreProximity(a, b);

  const rawByKey: Record<ComponentKey, { raw: number | null; detail: unknown }> = {
    intake,
    semantic,
    mustHaves,
    proximity,
  };

  // Renormalize weights over the components we could actually compute, so
  // a missing embedding or missing coordinates doesn't cap the ceiling.
  const availableWeight = (Object.keys(COMPONENT_WEIGHTS) as ComponentKey[])
    .filter((k) => rawByKey[k].raw !== null)
    .reduce((s, k) => s + COMPONENT_WEIGHTS[k], 0);

  const components = {} as Record<ComponentKey, ComponentBreakdown>;
  let score = 0;

  for (const key of Object.keys(COMPONENT_WEIGHTS) as ComponentKey[]) {
    const { raw, detail } = rawByKey[key];
    const weight = COMPONENT_WEIGHTS[key];
    const effectiveWeight =
      raw === null || availableWeight === 0 ? 0 : weight / availableWeight;
    const points = raw === null ? 0 : raw * effectiveWeight * 100;
    components[key] = {
      raw: raw === null ? null : Math.round(raw * 1000) / 1000,
      weight,
      effectiveWeight: Math.round(effectiveWeight * 1000) / 1000,
      points: Math.round(points * 10) / 10,
      detail,
    };
    score += points;
  }

  const passed = failures.length === 0;
  const finalScore = passed ? Math.round(clamp01(score / 100) * 1000) / 10 : 0;

  return {
    score: finalScore,
    breakdown: {
      hardFilter: { passed, failures },
      components,
      score: finalScore,
    },
  };
}
