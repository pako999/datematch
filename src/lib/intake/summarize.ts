import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { QUESTION_RULES } from "@/lib/matching/questions";
import { ageOn } from "@/lib/matching/score";

const MODEL = "claude-sonnet-4-6";

/**
 * Turn raw intake answers + recent notes into a tidy staff summary for
 * the client profile header. Cached on clients.intake_summary; call with
 * force=true to regenerate after material changes.
 */
export async function generateIntakeSummary(
  clientId: string,
  force = false,
): Promise<string | null> {
  const client = await db().query.clients.findFirst({
    where: eq(schema.clients.id, clientId),
  });
  if (!client) return null;
  if (client.intakeSummary && !force) return client.intakeSummary;
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const [answers, notes] = await Promise.all([
    db()
      .select()
      .from(schema.intakeAnswers)
      .where(eq(schema.intakeAnswers.clientId, clientId)),
    db()
      .select()
      .from(schema.clientNotes)
      .where(eq(schema.clientNotes.clientId, clientId))
      .orderBy(desc(schema.clientNotes.createdAt))
      .limit(10),
  ]);

  const answerLines = answers
    .map((a) => {
      const rule = QUESTION_RULES[a.questionKey];
      const label = rule?.label ?? a.questionKey;
      const value = Array.isArray(a.value) ? a.value.join(", ") : String(a.value);
      return `- ${label}: ${value}`;
    })
    .join("\n");
  const noteLines = notes.map((n) => `- ${n.body}`).join("\n");

  const prompt = `You are preparing a concise intake summary for a matchmaking agency's staff console. Based ONLY on the facts below, write 3–5 sentences IN SLOVENIAN (the agency's working language) that a matchmaker can skim before a call: who this client is, what they're genuinely looking for, their strongest compatibility signals, and anything a matchmaker should handle with care. Plain text, no preamble, no markdown, no invented facts.

CLIENT
Name: ${client.fullName}
Age: ${ageOn(client.birthdate, new Date())}, Gender: ${client.gender}, City: ${client.city}
Attributes: ${[
    client.heightCm ? `height ${client.heightCm} cm` : null,
    client.weightKg ? `weight ${client.weightKg} kg` : null,
    client.eyeColor ? `eyes ${client.eyeColor}` : null,
    client.hairColor ? `hair ${client.hairColor}` : null,
    client.bodyType ? `body type ${client.bodyType}` : null,
    client.education ? `education ${client.education}` : null,
    client.occupation ? `occupation ${client.occupation}` : null,
  ]
    .filter(Boolean)
    .join(", ") || "(not provided)"}
Status: ${client.status}, Tier: ${client.membershipTier}
Bio (their own words): ${client.bio || "(none)"}

QUESTIONNAIRE
${answerLines || "(not completed)"}

RECENT STAFF NOTES
${noteLines || "(none)"}`;

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) return null;

  await db()
    .update(schema.clients)
    .set({ intakeSummary: text })
    .where(eq(schema.clients.id, clientId));
  return text;
}
