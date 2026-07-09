import { Inngest, eventType } from "inngest";
import { z } from "zod";

/** Anything scoring-relevant changed on a client (prefs, intake, status,
 *  consent, bio). bioChanged additionally re-embeds before recompute. */
export const clientChangedEvent = eventType("app/client.changed", {
  schema: z.object({
    clientId: z.string(),
    bioChanged: z.boolean(),
  }),
});

/** GDPR hard-delete happened in the DB; clean up external systems. */
export const clientDeletedEvent = eventType("app/client.deleted", {
  schema: z.object({
    clientId: z.string(),
    email: z.string(),
  }),
});

export const inngest = new Inngest({ id: "datematch" });

/**
 * Fire-and-forget event sends from server actions. Swallow errors (and
 * the missing-key case in local dev) so a down Inngest never blocks a
 * staff workflow — the inline fallbacks in refresh.ts already did the
 * urgent work, and crons pick up the rest.
 */
async function safeSend(event: Parameters<typeof inngest.send>[0]): Promise<void> {
  try {
    await inngest.send(event);
  } catch (err) {
    console.warn("inngest send failed:", err);
  }
}

export async function sendClientChanged(data: {
  clientId: string;
  bioChanged: boolean;
}): Promise<void> {
  await safeSend(clientChangedEvent.create(data));
}

export async function sendClientDeleted(data: {
  clientId: string;
  email: string;
}): Promise<void> {
  await safeSend(clientDeletedEvent.create(data));
}
