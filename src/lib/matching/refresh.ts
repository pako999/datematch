import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { embedText } from "@/lib/embeddings";
import { sendClientChanged } from "@/inngest/client";
import { recomputeScoresForClient } from "./candidates";

/**
 * Run after any scoring-relevant change to a client (bio, preferences,
 * intake, status, consent, location). Does the work inline when possible
 * (small pools, and the console works without an Inngest runner) and
 * also emits the Inngest event so background retries/batching cover
 * anything that failed inline.
 */
export async function afterClientChange(
  clientId: string,
  opts: { bioChanged?: boolean } = {},
): Promise<void> {
  if (opts.bioChanged) {
    try {
      const client = await db().query.clients.findFirst({
        where: eq(schema.clients.id, clientId),
        columns: { bio: true },
      });
      const embedding = client ? await embedText(client.bio) : null;
      if (embedding) {
        await db()
          .update(schema.clients)
          .set({ embedding })
          .where(eq(schema.clients.id, clientId));
      }
    } catch (err) {
      console.warn("inline embedding failed (Inngest will retry):", err);
    }
  }

  try {
    await recomputeScoresForClient(clientId);
  } catch (err) {
    console.warn("inline recompute failed (Inngest will retry):", err);
  }

  await sendClientChanged({
    clientId,
    bioChanged: Boolean(opts.bioChanged),
  });
}
