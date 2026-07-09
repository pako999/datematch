import "server-only";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export interface MyProfile {
  client: schema.Client | null;
  preferences: schema.ClientPreferencesRow | null;
  intake: Record<string, unknown>;
}

/** Load the signed-in portal user's client record (null pre-intake). */
export async function getMyProfile(): Promise<MyProfile> {
  const { userId } = await auth();
  if (!userId) {
    return { client: null, preferences: null, intake: {} };
  }

  const client = await db().query.clients.findFirst({
    where: eq(schema.clients.clerkUserId, userId),
  });
  if (!client) {
    return { client: null, preferences: null, intake: {} };
  }

  const [preferences, answers] = await Promise.all([
    db().query.clientPreferences.findFirst({
      where: eq(schema.clientPreferences.clientId, client.id),
    }),
    db().query.intakeAnswers.findMany({
      where: eq(schema.intakeAnswers.clientId, client.id),
    }),
  ]);

  const intake: Record<string, unknown> = {};
  for (const a of answers) intake[a.questionKey] = a.value;

  return { client, preferences: preferences ?? null, intake };
}
