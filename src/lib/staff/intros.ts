import "server-only";
import { desc, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "@/db";

/** Statuses that end the pipeline — no further transitions. */
export const TERMINAL_STATUSES: schema.IntroStatus[] = [
  "success",
  "declined",
  "no_match",
];

/** The operational state machine. Every transition is validated here. */
export const ALLOWED_TRANSITIONS: Record<schema.IntroStatus, schema.IntroStatus[]> = {
  suggested: ["proposed", "no_match"],
  proposed: ["accepted_a", "accepted_b", "both_accepted", "declined", "no_match"],
  accepted_a: ["both_accepted", "declined", "no_match"],
  accepted_b: ["both_accepted", "declined", "no_match"],
  both_accepted: ["date_scheduled", "declined", "no_match"],
  date_scheduled: ["met", "declined", "no_match"],
  met: ["success", "declined", "no_match"],
  success: [],
  declined: [],
  no_match: [],
};

export function canTransition(
  from: schema.IntroStatus,
  to: schema.IntroStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export interface IntroWithClients extends schema.Introduction {
  clientA: Pick<schema.Client, "id" | "fullName" | "city">;
  clientB: Pick<schema.Client, "id" | "fullName" | "city">;
  initiatedByName: string;
}

export async function listIntroductions(opts: {
  staffId?: string;
}): Promise<IntroWithClients[]> {
  const intros = await db()
    .select()
    .from(schema.introductions)
    .where(
      opts.staffId
        ? eq(schema.introductions.initiatedByStaffId, opts.staffId)
        : undefined,
    )
    .orderBy(desc(schema.introductions.updatedAt))
    .limit(300);
  if (intros.length === 0) return [];

  const clientIds = [
    ...new Set(intros.flatMap((i) => [i.clientAId, i.clientBId])),
  ];
  const staffIds = [...new Set(intros.map((i) => i.initiatedByStaffId))];
  const [clients, staffRows] = await Promise.all([
    db()
      .select({
        id: schema.clients.id,
        fullName: schema.clients.fullName,
        city: schema.clients.city,
      })
      .from(schema.clients)
      .where(inArray(schema.clients.id, clientIds)),
    db().select().from(schema.staff).where(inArray(schema.staff.id, staffIds)),
  ]);
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const staffById = new Map(staffRows.map((s) => [s.id, s]));

  return intros.flatMap((i) => {
    const clientA = clientById.get(i.clientAId);
    const clientB = clientById.get(i.clientBId);
    if (!clientA || !clientB) return [];
    return [
      {
        ...i,
        clientA,
        clientB,
        initiatedByName: staffById.get(i.initiatedByStaffId)?.name ?? "Unknown",
      },
    ];
  });
}

export interface IntroDetail {
  intro: schema.Introduction;
  clientA: schema.Client;
  clientB: schema.Client;
  intakeA: Record<string, unknown>;
  intakeB: Record<string, unknown>;
  history: (schema.IntroStatusHistoryRow & { staffName: string })[];
  feedback: schema.Feedback[];
  initiatedByName: string;
}

export async function getIntroDetail(id: string): Promise<IntroDetail | null> {
  const intro = await db().query.introductions.findFirst({
    where: eq(schema.introductions.id, id),
  });
  if (!intro) return null;

  const [clientA, clientB, historyRows, feedbackRows, initiator] =
    await Promise.all([
      db().query.clients.findFirst({ where: eq(schema.clients.id, intro.clientAId) }),
      db().query.clients.findFirst({ where: eq(schema.clients.id, intro.clientBId) }),
      db()
        .select({ row: schema.introStatusHistory, staffName: schema.staff.name })
        .from(schema.introStatusHistory)
        .innerJoin(
          schema.staff,
          eq(schema.staff.id, schema.introStatusHistory.changedByStaffId),
        )
        .where(eq(schema.introStatusHistory.introductionId, id))
        .orderBy(schema.introStatusHistory.createdAt),
      db()
        .select()
        .from(schema.feedback)
        .where(eq(schema.feedback.introductionId, id)),
      db().query.staff.findFirst({
        where: eq(schema.staff.id, intro.initiatedByStaffId),
      }),
    ]);
  if (!clientA || !clientB) return null;

  const answers = await db()
    .select()
    .from(schema.intakeAnswers)
    .where(
      or(
        eq(schema.intakeAnswers.clientId, clientA.id),
        eq(schema.intakeAnswers.clientId, clientB.id),
      ),
    );
  const intakeA: Record<string, unknown> = {};
  const intakeB: Record<string, unknown> = {};
  for (const a of answers) {
    if (a.clientId === clientA.id) intakeA[a.questionKey] = a.value;
    else intakeB[a.questionKey] = a.value;
  }

  return {
    intro,
    clientA,
    clientB,
    intakeA,
    intakeB,
    history: historyRows.map((h) => ({ ...h.row, staffName: h.staffName })),
    feedback: feedbackRows,
    initiatedByName: initiator?.name ?? "Unknown",
  };
}
