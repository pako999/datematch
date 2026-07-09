import "server-only";
import {
  and,
  cosineDistance,
  eq,
  inArray,
  isNotNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { db, schema } from "@/db";
import {
  canonicalPair,
  computePairScore,
  type Dealbreaker,
  type MustHave,
  type ScoringClient,
} from "./score";

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

function toScoringClient(
  client: schema.Client,
  prefs: schema.ClientPreferencesRow,
  intake: Record<string, unknown>,
): ScoringClient {
  return {
    id: client.id,
    gender: client.gender,
    birthdate: client.birthdate,
    city: client.city,
    lat: client.lat,
    lng: client.lng,
    status: client.status,
    consentToIntroduce: client.consentToIntroduce,
    preferences: {
      interestedInGenders: prefs.interestedInGenders,
      minAge: prefs.minAge,
      maxAge: prefs.maxAge,
      maxDistanceKm: prefs.maxDistanceKm,
      dealbreakers: (prefs.dealbreakers ?? []) as Dealbreaker[],
      mustHaves: (prefs.mustHaves ?? []) as MustHave[],
    },
    intake,
  };
}

async function loadIntakeFor(
  clientIds: string[],
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (clientIds.length === 0) return map;
  const rows = await db()
    .select()
    .from(schema.intakeAnswers)
    .where(inArray(schema.intakeAnswers.clientId, clientIds));
  for (const row of rows) {
    const entry = map.get(row.clientId) ?? {};
    entry[row.questionKey] = row.value;
    map.set(row.clientId, entry);
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Recompute                                                           */
/* ------------------------------------------------------------------ */

/**
 * Recompute stored pair scores between one client and the eligible pool.
 *
 * The SQL pre-filter narrows to active, consenting, mutually
 * gender-compatible candidates and computes the pgvector cosine in the
 * same query; every hard filter is then re-checked inside
 * computePairScore. Idempotent: wipes and rewrites the client's rows
 * (which also invalidates cached rationales for changed pairs).
 */
export async function recomputeScoresForClient(
  clientId: string,
): Promise<{ scored: number }> {
  const pairSide = or(
    eq(schema.matchScores.clientAId, clientId),
    eq(schema.matchScores.clientBId, clientId),
  );
  await db().delete(schema.matchScores).where(pairSide);

  const target = await db().query.clients.findFirst({
    where: eq(schema.clients.id, clientId),
  });
  const targetPrefs = await db().query.clientPreferences.findFirst({
    where: eq(schema.clientPreferences.clientId, clientId),
  });
  if (
    !target ||
    !targetPrefs ||
    target.status !== "active" ||
    !target.consentToIntroduce
  ) {
    return { scored: 0 };
  }

  // Exclusion pairs involving this client.
  const exclusionRows = await db()
    .select()
    .from(schema.matchExclusions)
    .where(
      or(
        eq(schema.matchExclusions.clientAId, clientId),
        eq(schema.matchExclusions.clientBId, clientId),
      ),
    );
  const excludedIds = new Set(
    exclusionRows.map((r) => (r.clientAId === clientId ? r.clientBId : r.clientAId)),
  );

  // Candidate pool pre-filter (mirrors the engine's cheap hard filters).
  const similarity =
    target.embedding != null
      ? sql<number | null>`CASE WHEN ${schema.clients.embedding} IS NULL THEN NULL ELSE 1 - (${cosineDistance(schema.clients.embedding, target.embedding)}) END`
      : sql<number | null>`NULL`;

  const candidates = await db()
    .select({
      client: schema.clients,
      prefs: schema.clientPreferences,
      similarity,
    })
    .from(schema.clients)
    .innerJoin(
      schema.clientPreferences,
      eq(schema.clientPreferences.clientId, schema.clients.id),
    )
    .where(
      and(
        ne(schema.clients.id, clientId),
        eq(schema.clients.status, "active"),
        eq(schema.clients.consentToIntroduce, true),
        inArray(schema.clients.gender, targetPrefs.interestedInGenders),
        sql`${target.gender} = ANY(${schema.clientPreferences.interestedInGenders})`,
      ),
    );

  if (candidates.length === 0) return { scored: 0 };

  const intakeMap = await loadIntakeFor([
    clientId,
    ...candidates.map((c) => c.client.id),
  ]);
  const a = toScoringClient(target, targetPrefs, intakeMap.get(clientId) ?? {});

  const rows: (typeof schema.matchScores.$inferInsert)[] = [];
  for (const c of candidates) {
    const b = toScoringClient(c.client, c.prefs, intakeMap.get(c.client.id) ?? {});
    const result = computePairScore(a, b, {
      bioCosineSimilarity: c.similarity,
      excluded: excludedIds.has(c.client.id),
    });
    if (result.score === 0) continue;
    const [idA, idB] = canonicalPair(a.id, b.id);
    rows.push({
      clientAId: idA,
      clientBId: idB,
      score: result.score,
      breakdown: result.breakdown,
      computedAt: new Date(),
    });
  }

  if (rows.length > 0) {
    // Upsert: the counterpart's own recompute may have written the pair.
    for (const row of rows) {
      await db()
        .insert(schema.matchScores)
        .values(row)
        .onConflictDoUpdate({
          target: [schema.matchScores.clientAId, schema.matchScores.clientBId],
          set: {
            score: row.score,
            breakdown: row.breakdown,
            rationale: null,
            computedAt: row.computedAt,
          },
        });
    }
  }
  return { scored: rows.length };
}

/* ------------------------------------------------------------------ */
/* Suggestions (shortlist)                                             */
/* ------------------------------------------------------------------ */

export interface Suggestion {
  scoreId: string;
  score: number;
  rationale: string | null;
  breakdown: unknown;
  computedAt: Date;
  /** Highlighted despite a mid ranking because bios resonate strongly. */
  isStretchPick: boolean;
  other: Pick<
    schema.Client,
    "id" | "fullName" | "city" | "gender" | "birthdate" | "membershipTier" | "status"
  >;
  hasOpenIntro: boolean;
}

/**
 * Ranked shortlist for a client. Includes one "stretch pick": the
 * highest-semantic pair outside the top ranks — stated preferences aren't
 * revealed preferences, and a human matchmaker always keeps one wildcard.
 */
export async function getSuggestionsForClient(
  clientId: string,
  limit = 6,
): Promise<Suggestion[]> {
  const scores = await db()
    .select()
    .from(schema.matchScores)
    .where(
      or(
        eq(schema.matchScores.clientAId, clientId),
        eq(schema.matchScores.clientBId, clientId),
      ),
    )
    .orderBy(sql`${schema.matchScores.score} DESC`);

  if (scores.length === 0) return [];

  const otherIds = scores.map((s) =>
    s.clientAId === clientId ? s.clientBId : s.clientAId,
  );
  const others = await db()
    .select()
    .from(schema.clients)
    .where(
      and(
        inArray(schema.clients.id, otherIds),
        eq(schema.clients.status, "active"),
        eq(schema.clients.consentToIntroduce, true),
      ),
    );
  const othersById = new Map(others.map((c) => [c.id, c]));

  // Pairs with any non-terminal introduction shouldn't be re-suggested.
  const openIntros = await db()
    .select()
    .from(schema.introductions)
    .where(
      or(
        eq(schema.introductions.clientAId, clientId),
        eq(schema.introductions.clientBId, clientId),
      ),
    );
  const openWith = new Set(
    openIntros
      .filter((i) => !["success", "declined", "no_match"].includes(i.status))
      .flatMap((i) => [i.clientAId, i.clientBId]),
  );

  const all = scores.flatMap((s): Suggestion[] => {
    const otherId = s.clientAId === clientId ? s.clientBId : s.clientAId;
    const other = othersById.get(otherId);
    if (!other) return [];
    return [
      {
        scoreId: s.id,
        score: s.score,
        rationale: s.rationale,
        breakdown: s.breakdown,
        computedAt: s.computedAt,
        isStretchPick: false,
        other: {
          id: other.id,
          fullName: other.fullName,
          city: other.city,
          gender: other.gender,
          birthdate: other.birthdate,
          membershipTier: other.membershipTier,
          status: other.status,
        },
        hasOpenIntro: openWith.has(otherId),
      },
    ];
  });

  const top = all.slice(0, limit);

  // Stretch pick: best semantic resonance among the rest.
  const semanticPoints = (s: Suggestion): number => {
    const b = s.breakdown as {
      components?: { semantic?: { raw: number | null } };
    } | null;
    return b?.components?.semantic?.raw ?? -1;
  };
  const rest = all.slice(limit).filter((s) => semanticPoints(s) >= 0.6);
  rest.sort((x, y) => semanticPoints(y) - semanticPoints(x));
  const stretch = rest[0];
  if (stretch) top.push({ ...stretch, isStretchPick: true });

  return top;
}
