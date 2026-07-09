/**
 * Demo/seed data — LABELLED TEST PERSONAS ONLY.
 *
 * Every client here is fictional (emails end in `@seed.example.test`,
 * names tagged [SEED]); match scores are computed with the real engine —
 * no fabricated numbers. Used by `pnpm db:seed` (wipe mode) and the
 * admin "Load demo data" button in /settings (append-if-empty mode).
 *
 * NOTE: no "server-only" import — the CLI script uses this module too.
 */

import { sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import {
  canonicalPair,
  computePairScore,
  type ScoringClient,
} from "@/lib/matching/score";

type DB = NeonHttpDatabase<typeof schema>;

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */
// Placeholder Clerk ids; real staff are managed in /settings.

export const SEED_STAFF = [
  {
    id: "user_seed_admin_0000000000000000",
    email: "admin@seed.example.test",
    name: "Ana Adminovska [SEED]",
    role: "admin" as const,
  },
  {
    id: "user_seed_mm1_00000000000000000",
    email: "matchmaker1@seed.example.test",
    name: "Marko Matcher [SEED]",
    role: "matchmaker" as const,
  },
  {
    id: "user_seed_mm2_00000000000000000",
    email: "matchmaker2@seed.example.test",
    name: "Sara Svetnik [SEED]",
    role: "matchmaker" as const,
  },
];

/* ------------------------------------------------------------------ */
/* Client personas                                                     */
/* ------------------------------------------------------------------ */

const CITIES = {
  ljubljana: { city: "Ljubljana", lat: 46.0569, lng: 14.5058 },
  maribor: { city: "Maribor", lat: 46.5547, lng: 15.6459 },
  celje: { city: "Celje", lat: 46.2311, lng: 15.2683 },
  kranj: { city: "Kranj", lat: 46.2389, lng: 14.3556 },
  koper: { city: "Koper", lat: 45.548, lng: 13.7302 },
} as const;

interface Persona {
  key: string;
  fullName: string;
  birthdate: string;
  gender: schema.Gender;
  location: (typeof CITIES)[keyof typeof CITIES];
  status: schema.ClientStatus;
  membershipTier: "standard" | "premium" | "elite";
  consentToIntroduce: boolean;
  bio: string;
  assignedTo: number; // index into SEED_STAFF
  prefs: {
    interestedInGenders: schema.Gender[];
    minAge: number;
    maxAge: number;
    maxDistanceKm: number | null;
    dealbreakers: { questionKey: string; disallowedValues: unknown[] }[];
    mustHaves: { questionKey: string; acceptedValues: unknown[] }[];
  };
  intake: Record<string, unknown>;
}

const PERSONAS: Persona[] = [
  {
    key: "nina",
    fullName: "Nina Testna [SEED]",
    birthdate: "1991-04-12",
    gender: "woman",
    location: CITIES.ljubljana,
    status: "active",
    membershipTier: "premium",
    consentToIntroduce: true,
    bio: "Architect who spends weekends hiking the Julian Alps or trying a new recipe. Values honesty, curiosity, and a partner who wants a family. Slightly introverted but warm once comfortable.",
    assignedTo: 1,
    prefs: {
      interestedInGenders: ["man"],
      minAge: 30,
      maxAge: 42,
      maxDistanceKm: 80,
      dealbreakers: [{ questionKey: "smoking", disallowedValues: ["regularly"] }],
      mustHaves: [{ questionKey: "wants_children", acceptedValues: ["yes"] }],
    },
    intake: {
      wants_children: "yes",
      relationship_goal: "marriage",
      timeline: 4,
      religion_importance: 2,
      political_alignment: 3,
      social_energy: 2,
      ambition: 4,
      tidiness: 4,
      talker_listener: 2,
      planner_spontaneous: 2,
      hobbies: ["hiking", "cooking", "film"],
      weekend_style: ["nature", "quiet-dinner"],
      smoking: "never",
      drinking: 2,
      pets: ["cat"],
    },
  },
  {
    key: "tomaz",
    fullName: "Tomaž Poskusni [SEED]",
    birthdate: "1988-09-30",
    gender: "man",
    location: CITIES.ljubljana,
    status: "active",
    membershipTier: "elite",
    consentToIntroduce: true,
    bio: "Software engineering lead, amateur mountaineer and enthusiastic home cook. Looking for a long-term partner to build a family with. Talks less, listens more; loves planning trips months ahead.",
    assignedTo: 1,
    prefs: {
      interestedInGenders: ["woman"],
      minAge: 28,
      maxAge: 40,
      maxDistanceKm: 100,
      dealbreakers: [],
      mustHaves: [{ questionKey: "wants_children", acceptedValues: ["yes"] }],
    },
    intake: {
      wants_children: "yes",
      relationship_goal: "marriage",
      timeline: 4,
      religion_importance: 2,
      political_alignment: 3,
      social_energy: 2,
      ambition: 5,
      tidiness: 4,
      talker_listener: 4,
      planner_spontaneous: 1,
      hobbies: ["hiking", "cooking", "climbing"],
      weekend_style: ["nature", "quiet-dinner"],
      smoking: "never",
      drinking: 2,
      pets: [],
    },
  },
  {
    key: "spela",
    fullName: "Špela Vzorčna [SEED]",
    birthdate: "1995-01-22",
    gender: "woman",
    location: CITIES.kranj,
    status: "active",
    membershipTier: "standard",
    consentToIntroduce: true,
    bio: "Primary school teacher, social butterfly, out dancing or at a festival most weekends. Wants kids eventually but in no rush. Can't stand cigarettes.",
    assignedTo: 2,
    prefs: {
      interestedInGenders: ["man", "nonbinary"],
      minAge: 25,
      maxAge: 38,
      maxDistanceKm: 60,
      dealbreakers: [
        { questionKey: "smoking", disallowedValues: ["regularly", "socially"] },
      ],
      mustHaves: [
        { questionKey: "hobbies", acceptedValues: ["dancing", "music", "festivals"] },
      ],
    },
    intake: {
      wants_children: "yes",
      relationship_goal: "long_term",
      timeline: 2,
      religion_importance: 1,
      political_alignment: 2,
      social_energy: 5,
      ambition: 3,
      tidiness: 2,
      talker_listener: 5,
      planner_spontaneous: 5,
      hobbies: ["dancing", "music", "festivals", "yoga"],
      weekend_style: ["nightlife", "events"],
      smoking: "never",
      drinking: 3,
      pets: ["dog"],
    },
  },
  {
    key: "luka",
    fullName: "Luka Primerek [SEED]",
    birthdate: "1993-11-05",
    gender: "man",
    location: CITIES.ljubljana,
    status: "active",
    membershipTier: "standard",
    consentToIntroduce: true,
    bio: "Musician and part-time sound engineer. Night owl, spontaneous, happiest at a gig or jamming with friends. Kids someday, maybe. Smokes at parties.",
    assignedTo: 2,
    prefs: {
      interestedInGenders: ["woman"],
      minAge: 24,
      maxAge: 36,
      maxDistanceKm: null,
      dealbreakers: [],
      mustHaves: [],
    },
    intake: {
      wants_children: "unsure",
      relationship_goal: "long_term",
      timeline: 1,
      religion_importance: 1,
      political_alignment: 2,
      social_energy: 5,
      ambition: 2,
      tidiness: 2,
      talker_listener: 3,
      planner_spontaneous: 5,
      hobbies: ["music", "festivals"],
      weekend_style: ["nightlife", "events"],
      smoking: "socially",
      drinking: 4,
      pets: [],
    },
  },
  {
    key: "maja",
    fullName: "Maja Preizkusna [SEED]",
    birthdate: "1985-06-17",
    gender: "woman",
    location: CITIES.maribor,
    status: "active",
    membershipTier: "premium",
    consentToIntroduce: true,
    bio: "Physician, marathon runner, early riser. Direct communicator who values ambition and order. Not interested in relocating away from Štajerska.",
    assignedTo: 1,
    prefs: {
      interestedInGenders: ["man"],
      minAge: 35,
      maxAge: 50,
      maxDistanceKm: 40,
      dealbreakers: [{ questionKey: "wants_children", disallowedValues: ["yes"] }],
      mustHaves: [{ questionKey: "ambition", acceptedValues: [4, 5] }],
    },
    intake: {
      wants_children: "no",
      relationship_goal: "long_term",
      timeline: 3,
      religion_importance: 3,
      political_alignment: 4,
      social_energy: 3,
      ambition: 5,
      tidiness: 5,
      talker_listener: 4,
      planner_spontaneous: 1,
      hobbies: ["running", "reading", "travel"],
      weekend_style: ["sport", "quiet-dinner"],
      smoking: "never",
      drinking: 1,
      pets: [],
    },
  },
  {
    key: "gregor",
    fullName: "Gregor Demo [SEED]",
    birthdate: "1982-02-08",
    gender: "man",
    location: CITIES.maribor,
    status: "active",
    membershipTier: "elite",
    consentToIntroduce: true,
    bio: "Owns a small vineyard and a logistics business. Structured, driven, child-free by choice. Runs half-marathons and hosts long Sunday lunches.",
    assignedTo: 1,
    prefs: {
      interestedInGenders: ["woman"],
      minAge: 34,
      maxAge: 48,
      maxDistanceKm: 60,
      dealbreakers: [],
      mustHaves: [
        { questionKey: "wants_children", acceptedValues: ["no", "unsure"] },
      ],
    },
    intake: {
      wants_children: "no",
      relationship_goal: "long_term",
      timeline: 3,
      religion_importance: 3,
      political_alignment: 4,
      social_energy: 3,
      ambition: 5,
      tidiness: 4,
      talker_listener: 2,
      planner_spontaneous: 2,
      hobbies: ["running", "wine", "travel"],
      weekend_style: ["sport", "hosting"],
      smoking: "never",
      drinking: 3,
      pets: ["dog"],
    },
  },
  {
    key: "katja",
    fullName: "Katja Vzorec [SEED]",
    birthdate: "1998-08-03",
    gender: "woman",
    location: CITIES.koper,
    status: "lead",
    membershipTier: "standard",
    consentToIntroduce: false, // intake unfinished — must never appear in shortlists
    bio: "Marine biology graduate, new in town. Intake in progress.",
    assignedTo: 2,
    prefs: {
      interestedInGenders: ["man", "woman"],
      minAge: 23,
      maxAge: 35,
      maxDistanceKm: 50,
      dealbreakers: [],
      mustHaves: [],
    },
    intake: {
      hobbies: ["photography"],
    },
  },
  {
    key: "peter",
    fullName: "Peter Paused [SEED]",
    birthdate: "1987-12-19",
    gender: "man",
    location: CITIES.celje,
    status: "paused", // excluded from candidate pool by status
    membershipTier: "premium",
    consentToIntroduce: true,
    bio: "Financial analyst taking a break from matching after a busy quarter.",
    assignedTo: 2,
    prefs: {
      interestedInGenders: ["woman"],
      minAge: 28,
      maxAge: 40,
      maxDistanceKm: 80,
      dealbreakers: [],
      mustHaves: [],
    },
    intake: {
      wants_children: "yes",
      relationship_goal: "long_term",
      social_energy: 3,
      hobbies: ["cycling", "reading"],
      smoking: "never",
      drinking: 2,
    },
  },
  {
    key: "eva",
    fullName: "Eva Nonbinary [SEED]",
    birthdate: "1994-03-27",
    gender: "nonbinary",
    location: CITIES.ljubljana,
    status: "active",
    membershipTier: "standard",
    consentToIntroduce: true,
    bio: "Graphic designer and ceramicist. Quiet weekends, farmers markets, films at Kinodvor. Looking for something serious with someone kind.",
    assignedTo: 2,
    prefs: {
      interestedInGenders: ["woman", "nonbinary"],
      minAge: 26,
      maxAge: 40,
      maxDistanceKm: 30,
      dealbreakers: [],
      mustHaves: [],
    },
    intake: {
      wants_children: "unsure",
      relationship_goal: "long_term",
      timeline: 3,
      religion_importance: 1,
      political_alignment: 2,
      social_energy: 2,
      ambition: 3,
      tidiness: 3,
      talker_listener: 2,
      planner_spontaneous: 3,
      hobbies: ["ceramics", "film", "cooking"],
      weekend_style: ["quiet-dinner", "markets"],
      smoking: "never",
      drinking: 2,
      pets: ["cat"],
    },
  },
  {
    key: "anja",
    fullName: "Anja Sample [SEED]",
    birthdate: "1992-10-14",
    gender: "woman",
    location: CITIES.ljubljana,
    status: "active",
    membershipTier: "premium",
    consentToIntroduce: true,
    bio: "Product manager who unwinds with pottery classes and slow food. Enjoys films, museums, and cooking for friends. Wants a calm, intentional relationship.",
    assignedTo: 1,
    prefs: {
      interestedInGenders: ["man", "nonbinary", "woman"],
      minAge: 28,
      maxAge: 42,
      maxDistanceKm: 40,
      dealbreakers: [],
      mustHaves: [],
    },
    intake: {
      wants_children: "unsure",
      relationship_goal: "long_term",
      timeline: 3,
      religion_importance: 1,
      political_alignment: 2,
      social_energy: 2,
      ambition: 4,
      tidiness: 4,
      talker_listener: 3,
      planner_spontaneous: 2,
      hobbies: ["ceramics", "film", "cooking", "museums"],
      weekend_style: ["quiet-dinner", "markets"],
      smoking: "never",
      drinking: 2,
      pets: [],
    },
  },
  {
    key: "matic",
    fullName: "Matic Testni [SEED]",
    birthdate: "1990-07-21",
    gender: "man",
    location: CITIES.celje,
    status: "active",
    membershipTier: "standard",
    consentToIntroduce: true,
    bio: "High-school PE teacher and volleyball coach. Family-oriented, faith matters to him, loves village festivals and big family gatherings.",
    assignedTo: 2,
    prefs: {
      interestedInGenders: ["woman"],
      minAge: 27,
      maxAge: 38,
      maxDistanceKm: 70,
      dealbreakers: [],
      mustHaves: [{ questionKey: "wants_children", acceptedValues: ["yes"] }],
    },
    intake: {
      wants_children: "yes",
      relationship_goal: "marriage",
      timeline: 5,
      religion_importance: 5,
      political_alignment: 4,
      social_energy: 4,
      ambition: 3,
      tidiness: 3,
      talker_listener: 3,
      planner_spontaneous: 3,
      hobbies: ["hiking", "festivals"],
      weekend_style: ["sport", "family"],
      smoking: "never",
      drinking: 3,
      pets: ["dog"],
    },
  },
];

/* ------------------------------------------------------------------ */
/* Runner                                                              */
/* ------------------------------------------------------------------ */

export interface SeedSummary {
  staff: number;
  clients: number;
  scores: number;
  intros: number;
}

/**
 * Load the demo data set.
 *
 * - wipe=true (CLI): truncates ALL matchmaking tables first, including
 *   staff. Guard destructive use behind --force in the caller.
 * - wipe=false (admin button): appends into an empty roster; existing
 *   staff (e.g. the signed-in admin) are preserved, seed staff rows are
 *   inserted alongside them (skipped if their emails already exist).
 */
export async function runSeed(db: DB, opts: { wipe: boolean }): Promise<SeedSummary> {
  if (opts.wipe) {
    await db.execute(sql`
      TRUNCATE TABLE
        feedback,
        intro_status_history,
        introductions,
        match_exclusions,
        match_scores,
        client_notes,
        client_photos,
        intake_answers,
        client_preferences,
        clients,
        staff
      CASCADE
    `);
    await db.insert(schema.staff).values(SEED_STAFF);
  } else {
    await db.insert(schema.staff).values(SEED_STAFF).onConflictDoNothing();
  }

  const idByKey = new Map<string, string>();
  for (const p of PERSONAS) {
    const [row] = await db
      .insert(schema.clients)
      .values({
        fullName: p.fullName,
        email: `${p.key}@seed.example.test`,
        phone: "+386 00 000 000",
        birthdate: new Date(`${p.birthdate}T00:00:00Z`),
        gender: p.gender,
        city: p.location.city,
        lat: p.location.lat,
        lng: p.location.lng,
        status: p.status,
        membershipTier: p.membershipTier,
        assignedStaffId: SEED_STAFF[p.assignedTo]!.id,
        bio: p.bio,
        consentToIntroduce: p.consentToIntroduce,
      })
      .returning({ id: schema.clients.id });
    idByKey.set(p.key, row!.id);

    await db.insert(schema.clientPreferences).values({
      clientId: row!.id,
      ...p.prefs,
    });

    const answers = Object.entries(p.intake).map(([questionKey, value]) => ({
      clientId: row!.id,
      questionKey,
      value,
    }));
    if (answers.length > 0) {
      await db.insert(schema.intakeAnswers).values(answers);
    }

    await db.insert(schema.clientNotes).values({
      clientId: row!.id,
      staffId: SEED_STAFF[p.assignedTo]!.id,
      body: "[SEED] Test persona created by seed script.",
    });
  }

  // Real engine scores for all eligible pairs (no embeddings yet).
  const toScoring = (p: Persona): ScoringClient => ({
    id: idByKey.get(p.key)!,
    gender: p.gender,
    birthdate: new Date(`${p.birthdate}T00:00:00Z`),
    city: p.location.city,
    lat: p.location.lat,
    lng: p.location.lng,
    status: p.status,
    consentToIntroduce: p.consentToIntroduce,
    preferences: p.prefs,
    intake: p.intake,
  });

  let scored = 0;
  for (let i = 0; i < PERSONAS.length; i++) {
    for (let j = i + 1; j < PERSONAS.length; j++) {
      const a = toScoring(PERSONAS[i]!);
      const b = toScoring(PERSONAS[j]!);
      const result = computePairScore(a, b, { bioCosineSimilarity: null });
      if (result.score === 0) continue;
      const [idA, idB] = canonicalPair(a.id, b.id);
      await db.insert(schema.matchScores).values({
        clientAId: idA,
        clientBId: idB,
        score: result.score,
        breakdown: result.breakdown,
      });
      scored++;
    }
  }

  // Sample introductions across the pipeline.
  const [ninaId, tomazId] = [idByKey.get("nina")!, idByKey.get("tomaz")!];
  const [majaId, gregorId] = [idByKey.get("maja")!, idByKey.get("gregor")!];
  const [spelaId, lukaId] = [idByKey.get("spela")!, idByKey.get("luka")!];
  const mm1 = SEED_STAFF[1]!.id;
  const mm2 = SEED_STAFF[2]!.id;

  const [intro1] = await db
    .insert(schema.introductions)
    .values({
      clientAId: ninaId,
      clientBId: tomazId,
      initiatedByStaffId: mm1,
      status: "proposed",
    })
    .returning({ id: schema.introductions.id });
  await db.insert(schema.introStatusHistory).values([
    { introductionId: intro1!.id, fromStatus: null, toStatus: "suggested", changedByStaffId: mm1 },
    { introductionId: intro1!.id, fromStatus: "suggested", toStatus: "proposed", changedByStaffId: mm1 },
  ]);

  const [intro2] = await db
    .insert(schema.introductions)
    .values({
      clientAId: majaId,
      clientBId: gregorId,
      initiatedByStaffId: mm1,
      status: "date_scheduled",
      scheduledFor: sql`now() + interval '7 days'` as unknown as Date,
    })
    .returning({ id: schema.introductions.id });
  await db.insert(schema.introStatusHistory).values([
    { introductionId: intro2!.id, fromStatus: null, toStatus: "suggested", changedByStaffId: mm1 },
    { introductionId: intro2!.id, fromStatus: "suggested", toStatus: "proposed", changedByStaffId: mm1 },
    { introductionId: intro2!.id, fromStatus: "proposed", toStatus: "both_accepted", changedByStaffId: mm1 },
    { introductionId: intro2!.id, fromStatus: "both_accepted", toStatus: "date_scheduled", changedByStaffId: mm1 },
  ]);

  const [intro3] = await db
    .insert(schema.introductions)
    .values({
      clientAId: spelaId,
      clientBId: lukaId,
      initiatedByStaffId: mm2,
      status: "declined",
    })
    .returning({ id: schema.introductions.id });
  await db.insert(schema.introStatusHistory).values([
    { introductionId: intro3!.id, fromStatus: null, toStatus: "suggested", changedByStaffId: mm2 },
    { introductionId: intro3!.id, fromStatus: "suggested", toStatus: "proposed", changedByStaffId: mm2 },
    { introductionId: intro3!.id, fromStatus: "proposed", toStatus: "both_accepted", changedByStaffId: mm2 },
    { introductionId: intro3!.id, fromStatus: "both_accepted", toStatus: "date_scheduled", changedByStaffId: mm2 },
    { introductionId: intro3!.id, fromStatus: "date_scheduled", toStatus: "met", changedByStaffId: mm2 },
    { introductionId: intro3!.id, fromStatus: "met", toStatus: "declined", changedByStaffId: mm2 },
  ]);
  await db.insert(schema.feedback).values([
    {
      introductionId: intro3!.id,
      fromClientId: spelaId,
      aboutClientId: lukaId,
      rating: 4,
      sentiment: "positive",
      notes: "[SEED] Great conversation, would see him again.",
      wantsSecondDate: true,
    },
    {
      introductionId: intro3!.id,
      fromClientId: lukaId,
      aboutClientId: spelaId,
      rating: 2,
      sentiment: "negative",
      notes: "[SEED] Lovely person but no spark.",
      wantsSecondDate: false,
    },
  ]);
  const [exA, exB] = canonicalPair(spelaId, lukaId);
  await db.insert(schema.matchExclusions).values({
    clientAId: exA,
    clientBId: exB,
    reason: "Dated already — one-sided negative feedback (seed).",
  });

  return {
    staff: SEED_STAFF.length,
    clients: PERSONAS.length,
    scores: scored,
    intros: 3,
  };
}
