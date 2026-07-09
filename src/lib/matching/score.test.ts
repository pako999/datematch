import { describe, expect, it } from "vitest";
import {
  ageOn,
  canonicalPair,
  computePairScore,
  cosineSimilarity,
  getHardFilterFailures,
  haversineKm,
  type ScoringClient,
} from "./score";

const AS_OF = new Date("2026-07-01T00:00:00Z");

function makeClient(overrides: Partial<ScoringClient> = {}): ScoringClient {
  return {
    id: "a",
    gender: "woman",
    birthdate: new Date("1992-05-10T00:00:00Z"), // 34 as of AS_OF
    city: "Ljubljana",
    lat: 46.0569,
    lng: 14.5058,
    status: "active",
    consentToIntroduce: true,
    preferences: {
      interestedInGenders: ["man"],
      minAge: 25,
      maxAge: 45,
      maxDistanceKm: 100,
      dealbreakers: [],
      mustHaves: [],
    },
    intake: {},
    ...overrides,
  };
}

function makeMatch(overrides: Partial<ScoringClient> = {}): ScoringClient {
  return makeClient({
    id: "b",
    gender: "man",
    birthdate: new Date("1990-03-02T00:00:00Z"), // 36
    preferences: {
      interestedInGenders: ["woman"],
      minAge: 25,
      maxAge: 45,
      maxDistanceKm: 100,
      dealbreakers: [],
      mustHaves: [],
    },
    ...overrides,
  });
}

describe("canonicalPair", () => {
  it("orders ids lexicographically regardless of input order", () => {
    expect(canonicalPair("b", "a")).toEqual(["a", "b"]);
    expect(canonicalPair("a", "b")).toEqual(["a", "b"]);
  });
});

describe("ageOn", () => {
  it("handles pre- and post-birthday dates", () => {
    expect(ageOn(new Date("1992-05-10Z"), new Date("2026-05-09Z"))).toBe(33);
    expect(ageOn(new Date("1992-05-10Z"), new Date("2026-05-10Z"))).toBe(34);
  });
});

describe("haversineKm", () => {
  it("Ljubljana → Maribor is roughly 105–115 km", () => {
    const d = haversineKm(46.0569, 14.5058, 46.5547, 15.6459);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });

  it("zero distance for identical points", () => {
    expect(haversineKm(46, 14, 46, 14)).toBe(0);
  });
});

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors and 0 for orthogonal", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe("hard filters", () => {
  it("passes a clean eligible pair", () => {
    expect(getHardFilterFailures(makeClient(), makeMatch(), { asOf: AS_OF })).toEqual([]);
  });

  it("fails on one-way gender interest mismatch", () => {
    const b = makeMatch({
      preferences: { ...makeMatch().preferences, interestedInGenders: ["man"] },
    });
    expect(getHardFilterFailures(makeClient(), b, { asOf: AS_OF })).toContain(
      "gender_interest_mismatch",
    );
  });

  it("fails when either side is outside the other's age range", () => {
    const b = makeMatch({
      preferences: { ...makeMatch().preferences, maxAge: 30 }, // A is 34
    });
    expect(getHardFilterFailures(makeClient(), b, { asOf: AS_OF })).toContain(
      "outside_age_range",
    );
  });

  it("fails on distance beyond either side's max", () => {
    const b = makeMatch({
      city: "Koper",
      lat: 45.548,
      lng: 13.7302,
      preferences: { ...makeMatch().preferences, maxDistanceKm: 50 },
    });
    expect(getHardFilterFailures(makeClient(), b, { asOf: AS_OF })).toContain(
      "outside_distance",
    );
  });

  it("fails on non-active status, missing consent, and exclusions", () => {
    expect(
      getHardFilterFailures(makeClient({ status: "paused" }), makeMatch(), { asOf: AS_OF }),
    ).toContain("status_not_active");
    expect(
      getHardFilterFailures(makeClient(), makeMatch({ consentToIntroduce: false }), { asOf: AS_OF }),
    ).toContain("no_consent");
    expect(
      getHardFilterFailures(makeClient(), makeMatch(), { asOf: AS_OF, excluded: true }),
    ).toContain("excluded_pair");
  });

  it("fails when a dealbreaker matches the other's intake answer", () => {
    const a = makeClient({
      preferences: {
        ...makeClient().preferences,
        dealbreakers: [{ questionKey: "smoking", disallowedValues: ["regularly"] }],
      },
    });
    const b = makeMatch({ intake: { smoking: "regularly" } });
    expect(getHardFilterFailures(a, b, { asOf: AS_OF })).toContain("dealbreaker_hit");
    // unanswered question ≠ dealbreaker hit
    const bSilent = makeMatch({ intake: {} });
    expect(getHardFilterFailures(a, bSilent, { asOf: AS_OF })).toEqual([]);
  });
});

describe("computePairScore", () => {
  it("returns 0 with failures recorded when a hard filter fails", () => {
    const result = computePairScore(makeClient({ status: "churned" }), makeMatch(), {
      asOf: AS_OF,
    });
    expect(result.score).toBe(0);
    expect(result.breakdown.hardFilter.passed).toBe(false);
    expect(result.breakdown.hardFilter.failures).toContain("status_not_active");
  });

  it("scores a perfectly aligned pair near 100", () => {
    const intake = {
      wants_children: "yes",
      relationship_goal: "marriage",
      religion_importance: 3,
      social_energy: 3,
      hobbies: ["hiking", "cooking"],
      smoking: "never",
      // complementarity questions maximally different
      talker_listener: 1,
      planner_spontaneous: 5,
    };
    const a = makeClient({ intake: { ...intake, talker_listener: 1, planner_spontaneous: 5 } });
    const b = makeMatch({ intake: { ...intake, talker_listener: 5, planner_spontaneous: 1 } });
    const result = computePairScore(a, b, { asOf: AS_OF, bioCosineSimilarity: 0.9 });
    expect(result.score).toBeGreaterThan(95);
    expect(result.breakdown.components.intake.raw).toBe(1);
    expect(result.breakdown.components.semantic.raw).toBe(1);
    expect(result.breakdown.components.proximity.raw).toBe(1); // same city
  });

  it("similarity questions penalize distance on the scale", () => {
    const a = makeClient({ intake: { social_energy: 1 } });
    const b = makeMatch({ intake: { social_energy: 5 } });
    const result = computePairScore(a, b, { asOf: AS_OF });
    expect(result.breakdown.components.intake.raw).toBe(0);
  });

  it("renormalizes weights when semantic similarity is unavailable", () => {
    const a = makeClient({ intake: { wants_children: "yes" } });
    const b = makeMatch({ intake: { wants_children: "yes" } });
    const withSem = computePairScore(a, b, { asOf: AS_OF, bioCosineSimilarity: null });
    // semantic dropped → its effective weight is 0, others sum to 1
    expect(withSem.breakdown.components.semantic.effectiveWeight).toBe(0);
    const totalEff = Object.values(withSem.breakdown.components).reduce(
      (s, c) => s + c.effectiveWeight,
      0,
    );
    expect(totalEff).toBeCloseTo(1, 2);
    // everything computable is perfect → still reaches 100
    expect(withSem.score).toBe(100);
  });

  it("scores must-haves two-way and asymmetrically", () => {
    const a = makeClient({
      intake: { pets: ["dog"] },
      preferences: {
        ...makeClient().preferences,
        mustHaves: [
          { questionKey: "wants_children", acceptedValues: ["yes"] },
          { questionKey: "smoking", acceptedValues: ["never"] },
        ],
      },
    });
    // B satisfies 1 of A's 2 must-haves; A satisfies B's only must-have.
    const b = makeMatch({
      intake: { wants_children: "yes", smoking: "socially" },
      preferences: {
        ...makeMatch().preferences,
        mustHaves: [{ questionKey: "pets", acceptedValues: ["dog"] }],
      },
    });
    const result = computePairScore(a, b, { asOf: AS_OF });
    const mh = result.breakdown.components.mustHaves;
    expect(mh.detail).toEqual({ aSatisfiedByB: 0.5, bSatisfiedByA: 1 });
    expect(mh.raw).toBeCloseTo(0.75);
  });

  it("proximity decays with distance but flattens in-city", () => {
    const celje = { city: "Celje", lat: 46.2311, lng: 15.2683 };
    const near = computePairScore(makeClient(), makeMatch(), { asOf: AS_OF });
    const far = computePairScore(makeClient(), makeMatch(celje), { asOf: AS_OF });
    expect(near.breakdown.components.proximity.raw).toBe(1);
    const farProx = far.breakdown.components.proximity.raw;
    expect(farProx).not.toBeNull();
    expect(farProx!).toBeLessThan(1);
    expect(farProx!).toBeGreaterThan(0);
  });

  it("overlap questions use Jaccard similarity", () => {
    const a = makeClient({ intake: { hobbies: ["hiking", "cooking", "film"] } });
    const b = makeMatch({ intake: { hobbies: ["hiking", "yoga"] } });
    const result = computePairScore(a, b, { asOf: AS_OF });
    // intersection 1, union 4 → 0.25
    expect(result.breakdown.components.intake.raw).toBeCloseTo(0.25);
  });

  it("never exceeds 100 or drops below 0", () => {
    const result = computePairScore(makeClient(), makeMatch(), {
      asOf: AS_OF,
      bioCosineSimilarity: 1.5, // out-of-range input clamped
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
