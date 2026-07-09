"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { requireStaffAction, type CurrentStaff } from "@/lib/auth";
import { capture } from "@/lib/analytics";
import { canonicalPair } from "@/lib/matching/score";
import { notifyStaffIntroUpdate, sendIntroEmail } from "@/lib/email";
import { canTransition } from "./intros";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function firstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}

async function logTransition(
  introId: string,
  from: schema.IntroStatus | null,
  to: schema.IntroStatus,
  staffId: string,
): Promise<void> {
  await db().insert(schema.introStatusHistory).values({
    introductionId: introId,
    fromStatus: from,
    toStatus: to,
    changedByStaffId: staffId,
  });
}

async function notifyAssignedStaff(
  intro: schema.Introduction,
  actor: CurrentStaff,
  headline: string,
  detail: string,
): Promise<void> {
  // Notify each involved client's assigned matchmaker (except the actor).
  const clients = await db()
    .select()
    .from(schema.clients)
    .where(
      or(
        eq(schema.clients.id, intro.clientAId),
        eq(schema.clients.id, intro.clientBId),
      ),
    );
  const staffIds = [
    ...new Set(
      clients
        .map((c) => c.assignedStaffId)
        .filter((id): id is string => Boolean(id) && id !== actor.id),
    ),
  ];
  if (staffIds.length === 0) return;
  const staffRows = await db()
    .select()
    .from(schema.staff)
    .where(or(...staffIds.map((id) => eq(schema.staff.id, id))));
  await Promise.all(
    staffRows.map((s) =>
      notifyStaffIntroUpdate({
        staffEmail: s.email,
        introId: intro.id,
        headline,
        detail,
      }),
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Propose (from a suggested match)                                    */
/* ------------------------------------------------------------------ */

export async function proposeIntroduction(
  clientAId: string,
  clientBId: string,
): Promise<void> {
  const staff = await requireStaffAction({ write: true });

  const [idA, idB] = canonicalPair(clientAId, clientBId);
  const existing = await db()
    .select()
    .from(schema.introductions)
    .where(
      and(
        eq(schema.introductions.clientAId, idA),
        eq(schema.introductions.clientBId, idB),
      ),
    );
  const open = existing.find(
    (i) => !["success", "declined", "no_match"].includes(i.status),
  );
  if (open) redirect(`/introductions/${open.id}`);

  const [intro] = await db()
    .insert(schema.introductions)
    .values({
      clientAId: idA,
      clientBId: idB,
      initiatedByStaffId: staff.id,
      status: "proposed",
    })
    .returning();
  await logTransition(intro!.id, null, "proposed", staff.id);

  capture("intro_proposed", staff.id, { introId: intro!.id });
  await notifyAssignedStaff(
    intro!,
    staff,
    "Predlagana nova predstavitev",
    `${staff.name} je predlagal/-a predstavitev, ki vključuje eno od vaših strank.`,
  );
  redirect(`/introductions/${intro!.id}`);
}

/* ------------------------------------------------------------------ */
/* Status transitions                                                  */
/* ------------------------------------------------------------------ */

export async function advanceIntroduction(
  introId: string,
  toStatus: schema.IntroStatus,
): Promise<ActionResult> {
  const staff = await requireStaffAction({ write: true });
  const intro = await db().query.introductions.findFirst({
    where: eq(schema.introductions.id, introId),
  });
  if (!intro) return { ok: false, error: "Introduction not found" };
  if (!canTransition(intro.status, toStatus)) {
    return {
      ok: false,
      error: `Can't move from "${intro.status}" to "${toStatus}"`,
    };
  }

  await db()
    .update(schema.introductions)
    .set({ status: toStatus, updatedAt: new Date() })
    .where(eq(schema.introductions.id, introId));
  await logTransition(introId, intro.status, toStatus, staff.id);

  if (toStatus === "both_accepted") {
    capture("intro_accepted", staff.id, { introId });
    // Optional agency-branded intro emails to both clients.
    const clients = await db()
      .select()
      .from(schema.clients)
      .where(
        or(
          eq(schema.clients.id, intro.clientAId),
          eq(schema.clients.id, intro.clientBId),
        ),
      );
    const a = clients.find((c) => c.id === intro.clientAId);
    const b = clients.find((c) => c.id === intro.clientBId);
    if (a && b) {
      await Promise.all([
        sendIntroEmail({
          toEmail: a.email,
          toFirstName: firstName(a.fullName),
          otherFirstName: firstName(b.fullName),
          matchmakerName: staff.name,
        }),
        sendIntroEmail({
          toEmail: b.email,
          toFirstName: firstName(b.fullName),
          otherFirstName: firstName(a.fullName),
          matchmakerName: staff.name,
        }),
      ]);
    }
    await notifyAssignedStaff(
      intro,
      staff,
      "Obe stranki sta sprejeli",
      "Obe strani sta rekli da — čas je za dogovor o prvem zmenku.",
    );
  }
  if (toStatus === "success") {
    capture("intro_success", staff.id, { introId });
  }

  revalidatePath("/introductions");
  revalidatePath(`/introductions/${introId}`);
  return { ok: true };
}

/** Record a one-sided acceptance ("A said yes"). */
export async function recordAcceptance(
  introId: string,
  side: "a" | "b",
): Promise<ActionResult> {
  const intro = await db().query.introductions.findFirst({
    where: eq(schema.introductions.id, introId),
  });
  if (!intro) return { ok: false, error: "Introduction not found" };
  let to: schema.IntroStatus;
  if (intro.status === "proposed") {
    to = side === "a" ? "accepted_a" : "accepted_b";
  } else if (
    (intro.status === "accepted_a" && side === "b") ||
    (intro.status === "accepted_b" && side === "a")
  ) {
    to = "both_accepted";
  } else {
    return { ok: false, error: `Already recorded from status "${intro.status}"` };
  }
  return advanceIntroduction(introId, to);
}

export async function scheduleDate(
  introId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const staff = await requireStaffAction({ write: true });
  const raw = String(formData.get("scheduledFor") ?? "");
  const when = new Date(raw);
  if (!raw || Number.isNaN(when.getTime())) {
    return { ok: false, error: "Pick a valid date and time" };
  }

  const intro = await db().query.introductions.findFirst({
    where: eq(schema.introductions.id, introId),
  });
  if (!intro) return { ok: false, error: "Introduction not found" };

  if (intro.status !== "date_scheduled") {
    if (!canTransition(intro.status, "date_scheduled")) {
      return { ok: false, error: `Can't schedule from "${intro.status}"` };
    }
    await logTransition(introId, intro.status, "date_scheduled", staff.id);
  }
  await db()
    .update(schema.introductions)
    .set({ status: "date_scheduled", scheduledFor: when, updatedAt: new Date() })
    .where(eq(schema.introductions.id, introId));

  capture("date_scheduled", staff.id, { introId, scheduledFor: when.toISOString() });
  revalidatePath(`/introductions/${introId}`);
  revalidatePath("/introductions");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Feedback (per side) + automatic outcome                             */
/* ------------------------------------------------------------------ */

export async function logFeedback(
  introId: string,
  fromClientId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const staff = await requireStaffAction({ write: true });
  const intro = await db().query.introductions.findFirst({
    where: eq(schema.introductions.id, introId),
  });
  if (!intro) return { ok: false, error: "Introduction not found" };
  if (intro.status !== "met" && intro.status !== "date_scheduled") {
    return { ok: false, error: "Feedback can be logged once the pair has met" };
  }
  if (fromClientId !== intro.clientAId && fromClientId !== intro.clientBId) {
    return { ok: false, error: "Client is not part of this introduction" };
  }

  const rating = Number(formData.get("rating"));
  const sentiment = String(formData.get("sentiment")) as schema.Sentiment;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Rating must be 1–5" };
  }
  if (!schema.sentimentEnum.enumValues.includes(sentiment)) {
    return { ok: false, error: "Pick a sentiment" };
  }
  const aboutClientId =
    fromClientId === intro.clientAId ? intro.clientBId : intro.clientAId;

  // If we're still at date_scheduled, logging feedback implies they met.
  if (intro.status === "date_scheduled") {
    await db()
      .update(schema.introductions)
      .set({ status: "met", updatedAt: new Date() })
      .where(eq(schema.introductions.id, introId));
    await logTransition(introId, "date_scheduled", "met", staff.id);
  }

  await db()
    .insert(schema.feedback)
    .values({
      introductionId: introId,
      fromClientId,
      aboutClientId,
      rating,
      sentiment,
      notes: String(formData.get("notes") ?? "").trim() || null,
      wantsSecondDate: formData.get("wantsSecondDate") === "on",
    })
    .onConflictDoUpdate({
      target: [schema.feedback.introductionId, schema.feedback.fromClientId],
      set: {
        rating,
        sentiment,
        notes: String(formData.get("notes") ?? "").trim() || null,
        wantsSecondDate: formData.get("wantsSecondDate") === "on",
      },
    });
  capture("feedback_logged", staff.id, { introId, sentiment, rating });

  // Automatic outcome once both sides are in:
  //   both positive → success; either negative → declined + exclusion.
  const allFeedback = await db()
    .select()
    .from(schema.feedback)
    .where(eq(schema.feedback.introductionId, introId));
  const bothIn = allFeedback.length >= 2;
  if (bothIn) {
    const anyNegative = allFeedback.some((f) => f.sentiment === "negative");
    const allPositive = allFeedback.every((f) => f.sentiment === "positive");
    if (anyNegative) {
      await advanceIntroduction(introId, "declined");
      const [idA, idB] = canonicalPair(intro.clientAId, intro.clientBId);
      await db()
        .insert(schema.matchExclusions)
        .values({
          clientAId: idA,
          clientBId: idB,
          reason: "Dated — negative feedback; never re-suggest",
        })
        .onConflictDoNothing();
      // Stored score for the pair is now moot.
      await db()
        .delete(schema.matchScores)
        .where(
          and(
            eq(schema.matchScores.clientAId, idA),
            eq(schema.matchScores.clientBId, idB),
          ),
        );
    } else if (allPositive) {
      await advanceIntroduction(introId, "success");
    }
    // Mixed neutral outcomes stay at "met" for a human call.
  }

  revalidatePath(`/introductions/${introId}`);
  revalidatePath("/introductions");
  revalidatePath("/feedback");
  return { ok: true };
}
