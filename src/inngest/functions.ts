import { cron } from "inngest";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { clientChangedEvent, clientDeletedEvent, inngest } from "./client";
import { embedText } from "@/lib/embeddings";
import { recomputeScoresForClient } from "@/lib/matching/candidates";
import { generateRationale } from "@/lib/matching/explain";
import { nudgeStaff } from "@/lib/email";

/** Days an intro may sit in "proposed" before the staff nudge. */
const PROPOSED_STALE_DAYS = 5;
/** Days after "met" without both feedbacks before the staff nudge. */
const FEEDBACK_STALE_DAYS = 7;
/** How many top pairs get a rationale pre-generated per recompute. */
const RATIONALE_PREGEN = 3;

/* ------------------------------------------------------------------ */
/* Client changed → (embed) → recompute → pre-generate top rationales  */
/* ------------------------------------------------------------------ */

export const onClientChanged = inngest.createFunction(
  {
    id: "client-changed-recompute",
    // Coalesce bursts (a staff member saving three sections in a row).
    debounce: { key: "event.data.clientId", period: "30s" },
    // Keep Anthropic/Voyage usage polite under bulk edits.
    throttle: { limit: 10, period: "1m" },
    retries: 3,
    triggers: [clientChangedEvent],
  },
  async ({ event, step }) => {
    const { clientId, bioChanged } = event.data;

    if (bioChanged) {
      await step.run("embed-bio", async () => {
        const client = await db().query.clients.findFirst({
          where: eq(schema.clients.id, clientId),
          columns: { bio: true, embedding: true },
        });
        if (!client) return "client gone";
        if (client.embedding) return "already embedded inline";
        const embedding = await embedText(client.bio);
        if (!embedding) return "embeddings not configured or empty bio";
        await db()
          .update(schema.clients)
          .set({ embedding })
          .where(eq(schema.clients.id, clientId));
        return "embedded";
      });
    }

    const { scored } = await step.run("recompute-scores", () =>
      recomputeScoresForClient(clientId),
    );

    // Pre-generate rationales for the top pairs so the panel is instant.
    const topPairs = await step.run("find-top-pairs", async () => {
      const rows = await db()
        .select({ id: schema.matchScores.id })
        .from(schema.matchScores)
        .where(
          and(
            or(
              eq(schema.matchScores.clientAId, clientId),
              eq(schema.matchScores.clientBId, clientId),
            ),
            isNull(schema.matchScores.rationale),
          ),
        )
        .orderBy(sql`${schema.matchScores.score} DESC`)
        .limit(RATIONALE_PREGEN);
      return rows.map((r) => r.id);
    });
    for (const scoreId of topPairs) {
      await step.run(`rationale-${scoreId}`, () => generateRationale(scoreId));
    }

    return { scored, rationales: topPairs.length };
  },
);

/* ------------------------------------------------------------------ */
/* GDPR cleanup after hard delete                                      */
/* ------------------------------------------------------------------ */

export const onClientDeleted = inngest.createFunction(
  { id: "client-deleted-cleanup", retries: 3, triggers: [clientDeletedEvent] },
  async ({ event, step }) => {
    // FK cascades already removed scores/intros/feedback/notes/photos.
    // This function is the hook for external systems (email suppression,
    // analytics erasure) and a defensive sweep of orphaned pair rows.
    await step.run("sweep-orphans", async () => {
      await db().execute(sql`
        DELETE FROM match_scores ms
        WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = ms.client_a_id)
           OR NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = ms.client_b_id)
      `);
      await db().execute(sql`
        DELETE FROM match_exclusions me
        WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = me.client_a_id)
           OR NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = me.client_b_id)
      `);
    });
    return { deletedClientId: event.data.clientId };
  },
);

/* ------------------------------------------------------------------ */
/* Daily reminders                                                     */
/* ------------------------------------------------------------------ */

async function staffEmailsForIntro(intro: {
  initiatedByStaffId: string;
}): Promise<{ email: string }[]> {
  const initiator = await db().query.staff.findFirst({
    where: eq(schema.staff.id, intro.initiatedByStaffId),
  });
  return initiator ? [{ email: initiator.email }] : [];
}

export const staleProposedReminder = inngest.createFunction(
  {
    id: "stale-proposed-reminder",
    retries: 2,
    triggers: [cron("0 8 * * *")], // daily 08:00 UTC
  },
  async ({ step }) => {
    const cutoff = new Date(Date.now() - PROPOSED_STALE_DAYS * 86_400_000);
    const stale = await step.run("find-stale-proposed", () =>
      db()
        .select()
        .from(schema.introductions)
        .where(
          and(
            eq(schema.introductions.status, "proposed"),
            lt(schema.introductions.updatedAt, cutoff),
          ),
        )
        .limit(50),
    );

    for (const intro of stale) {
      await step.run(`nudge-${intro.id}`, async () => {
        for (const s of await staffEmailsForIntro(intro)) {
          await nudgeStaff({
            staffEmail: s.email,
            subject: "Predstavitev čaka na odgovora strank",
            body: `Predstavitev je v stanju »ponujeno« že več kot ${PROPOSED_STALE_DAYS} dni. Pokličite obe stranki za odgovor ali jo zaključite.`,
            path: `/introductions/${intro.id}`,
          });
        }
      });
    }
    return { nudged: stale.length };
  },
);

export const missingFeedbackReminder = inngest.createFunction(
  {
    id: "missing-feedback-reminder",
    retries: 2,
    triggers: [cron("0 9 * * *")], // daily 09:00 UTC
  },
  async ({ step }) => {
    const cutoff = new Date(Date.now() - FEEDBACK_STALE_DAYS * 86_400_000);
    const met = await step.run("find-met-missing-feedback", async () => {
      const intros = await db()
        .select()
        .from(schema.introductions)
        .where(
          and(
            eq(schema.introductions.status, "met"),
            lt(schema.introductions.updatedAt, cutoff),
          ),
        )
        .limit(50);
      if (intros.length === 0) return [];
      const feedbackRows = await db()
        .select()
        .from(schema.feedback)
        .where(
          inArray(
            schema.feedback.introductionId,
            intros.map((i) => i.id),
          ),
        );
      const counts = new Map<string, number>();
      for (const f of feedbackRows) {
        counts.set(f.introductionId, (counts.get(f.introductionId) ?? 0) + 1);
      }
      return intros.filter((i) => (counts.get(i.id) ?? 0) < 2);
    });

    for (const intro of met) {
      await step.run(`nudge-${intro.id}`, async () => {
        for (const s of await staffEmailsForIntro(intro)) {
          await nudgeStaff({
            staffEmail: s.email,
            subject: "Zberite povratne informacije po zmenku",
            body: `Par se je srečal pred več kot ${FEEDBACK_STALE_DAYS} dnevi in povratne informacije vsaj ene strani še manjkajo. Pokličite ju, dokler je vtis svež — povratne informacije izboljšujejo ujemanje.`,
            path: `/introductions/${intro.id}`,
          });
        }
      });
    }
    return { nudged: met.length };
  },
);

export const functions = [
  onClientChanged,
  onClientDeleted,
  staleProposedReminder,
  missingFeedbackReminder,
];
