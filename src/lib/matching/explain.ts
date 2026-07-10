import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { QUESTION_RULES } from "./questions";
import { ageOn } from "./score";

const MODEL = "claude-sonnet-4-6";

function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic();
}

function describeIntake(intake: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, rule] of Object.entries(QUESTION_RULES)) {
    const value = intake[key];
    if (value === undefined) continue;
    lines.push(`- ${rule.label}: ${Array.isArray(value) ? value.join(", ") : String(value)}`);
  }
  return lines.length > 0 ? lines.join("\n") : "- (questionnaire not completed)";
}

function attributeLine(client: schema.Client): string {
  const parts = [
    client.heightCm ? `height ${client.heightCm} cm` : null,
    client.weightKg ? `weight ${client.weightKg} kg` : null,
    client.eyeColor ? `eyes ${client.eyeColor}` : null,
    client.hairColor ? `hair ${client.hairColor}` : null,
    client.bodyType ? `body type ${client.bodyType}` : null,
    client.education ? `education ${client.education}` : null,
    client.occupation ? `occupation ${client.occupation}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "(not provided)";
}

function profileBlock(
  client: schema.Client,
  intake: Record<string, unknown>,
): string {
  return [
    `Name: ${client.fullName}`,
    `Age: ${ageOn(client.birthdate, new Date())}, City: ${client.city}`,
    `Attributes: ${attributeLine(client)}`,
    `Bio: ${client.bio || "(none)"}`,
    `Questionnaire:\n${describeIntake(intake)}`,
  ].join("\n");
}

async function loadIntake(clientId: string): Promise<Record<string, unknown>> {
  const rows = await db()
    .select()
    .from(schema.intakeAnswers)
    .where(eq(schema.intakeAnswers.clientId, clientId));
  const intake: Record<string, unknown> = {};
  for (const r of rows) intake[r.questionKey] = r.value;
  return intake;
}

/**
 * Staff-facing 2–3 sentence rationale for a scored pair, written by
 * claude-sonnet-4-6 from both profiles + the score breakdown, framed the
 * way a human matchmaker would brief a colleague. Cached on
 * match_scores.rationale (cleared automatically on recompute).
 */
export async function generateRationale(
  matchScoreId: string,
): Promise<string | null> {
  const scoreRow = await db().query.matchScores.findFirst({
    where: eq(schema.matchScores.id, matchScoreId),
  });
  if (!scoreRow) return null;
  if (scoreRow.rationale) return scoreRow.rationale;

  const anthropic = getAnthropic();
  if (!anthropic) return null;

  const [clientA, clientB] = await Promise.all([
    db().query.clients.findFirst({ where: eq(schema.clients.id, scoreRow.clientAId) }),
    db().query.clients.findFirst({ where: eq(schema.clients.id, scoreRow.clientBId) }),
  ]);
  if (!clientA || !clientB) return null;

  const [intakeA, intakeB] = await Promise.all([
    loadIntake(clientA.id),
    loadIntake(clientB.id),
  ]);

  const prompt = `You are briefing a professional matchmaker colleague on a potential pairing. Based ONLY on the facts below, write a 2–3 sentence staff-facing rationale IN SLOVENIAN (the agency's working language): lead with the strongest concrete reasons this pairing could work, then end with one gentle risk flag starting with "Pozor:" — the thing an experienced human matchmaker would worry about here (differing energy, timelines, distance, lifestyle friction). Plain text, no preamble, no markdown. Never invent facts not present below; if data is thin, say so rather than embellish.

PROFILE A
${profileBlock(clientA, intakeA)}

PROFILE B
${profileBlock(clientB, intakeB)}

COMPUTED COMPATIBILITY
Score: ${scoreRow.score}/100
Component breakdown (raw 0–1 and points): ${JSON.stringify(scoreRow.breakdown)}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) return null;

  await db()
    .update(schema.matchScores)
    .set({ rationale: text })
    .where(eq(schema.matchScores.id, matchScoreId));
  return text;
}
