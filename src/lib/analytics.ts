import "server-only";
import { PostHog } from "posthog-node";

/**
 * Internal usage analytics (matchmaker throughput, funnel success rates).
 * Events are captured server-side from server actions — reliable and no
 * client bundle cost. No-ops when PostHog isn't configured.
 */

export type AnalyticsEvent =
  | "client_created"
  | "intake_completed"
  | "suggestions_viewed"
  | "intro_proposed"
  | "intro_accepted"
  | "date_scheduled"
  | "intro_success"
  | "feedback_logged";

let _client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (_client !== undefined) return _client;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    _client = null;
    return null;
  }
  _client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    // Serverless-friendly: don't buffer events across invocations.
    flushAt: 1,
    flushInterval: 0,
  });
  return _client;
}

export function capture(
  event: AnalyticsEvent,
  staffOrActorId: string,
  properties: Record<string, unknown> = {},
): void {
  const client = getClient();
  if (!client) return;
  try {
    client.capture({ distinctId: staffOrActorId, event, properties });
  } catch {
    // Analytics must never break a workflow.
  }
}
