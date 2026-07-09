import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/auth";
import { getIntroDetail } from "@/lib/staff/intros";
import {
  FeedbackForm,
  ScheduleForm,
  TransitionButtons,
} from "@/components/intro-detail-forms";
import {
  Card,
  EmptyState,
  IntroStatusBadge,
  formatDateTime,
} from "@/components/ui";
import { QUESTION_RULES } from "@/lib/matching/questions";
import { ageOn } from "@/lib/matching/score";
import type { Client } from "@/db/schema";

function toLocalInputValue(d: Date | null): string | null {
  if (!d) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ProfileCard({
  label,
  client,
  intake,
}: {
  label: string;
  client: Client;
  intake: Record<string, unknown>;
}) {
  return (
    <Card title={`${label} — ${client.fullName}`}>
      <p className="text-sm text-muted-foreground">
        {ageOn(client.birthdate, new Date())} · {client.gender} · {client.city} ·{" "}
        {client.membershipTier}
      </p>
      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed">
        {client.bio || "No bio."}
      </p>
      <dl className="mt-3 space-y-1 text-sm">
        {Object.entries(QUESTION_RULES).map(([key, rule]) => {
          const value = intake[key];
          if (value === undefined) return null;
          return (
            <div key={key} className="flex gap-2">
              <dt className="w-44 shrink-0 text-muted-foreground">{rule.label}</dt>
              <dd>{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
            </div>
          );
        })}
      </dl>
      <Link href={`/clients/${client.id}`} className="mt-3 inline-block text-sm underline">
        Full profile →
      </Link>
    </Card>
  );
}

export default async function IntroDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaffPage();
  const { id } = await params;
  const detail = await getIntroDetail(id);
  if (!detail) notFound();
  const { intro, clientA, clientB, intakeA, intakeB, history, feedback, initiatedByName } = detail;
  const writable = staff.role !== "readonly";

  const feedbackFrom = (clientId: string) =>
    feedback.find((f) => f.fromClientId === clientId) ?? null;
  const canLogFeedback =
    intro.status === "met" || intro.status === "date_scheduled";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {clientA.fullName} × {clientB.fullName}
            </h1>
            <IntroStatusBadge status={intro.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Initiated by {initiatedByName} · created {formatDateTime(intro.createdAt)}
            {intro.scheduledFor
              ? ` · date: ${formatDateTime(intro.scheduledFor)}`
              : ""}
          </p>
        </div>
        <Link href="/introductions" className="text-sm hover:underline">
          ← Pipeline
        </Link>
      </div>

      {writable && (
        <Card title="Actions">
          <TransitionButtons
            introId={intro.id}
            status={intro.status}
            aName={clientA.fullName.split(" ")[0] ?? "A"}
            bName={clientB.fullName.split(" ")[0] ?? "B"}
          />
          {["both_accepted", "date_scheduled"].includes(intro.status) && (
            <div className="mt-4">
              <ScheduleForm
                introId={intro.id}
                current={toLocalInputValue(intro.scheduledFor)}
              />
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileCard label="Client A" client={clientA} intake={intakeA} />
        <ProfileCard label="Client B" client={clientB} intake={intakeB} />
      </div>

      {writable && canLogFeedback && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[clientA, clientB].map((c) => {
            const existing = feedbackFrom(c.id);
            return (
              <Card key={c.id}>
                <FeedbackForm
                  introId={intro.id}
                  fromClientId={c.id}
                  fromName={c.fullName}
                  existing={
                    existing
                      ? {
                          rating: existing.rating,
                          sentiment: existing.sentiment,
                          notes: existing.notes ?? "",
                          wantsSecondDate: existing.wantsSecondDate,
                        }
                      : null
                  }
                />
              </Card>
            );
          })}
        </div>
      )}

      {feedback.length > 0 && !canLogFeedback && (
        <Card title="Feedback">
          <ul className="space-y-3">
            {feedback.map((f) => {
              const from = f.fromClientId === clientA.id ? clientA : clientB;
              return (
                <li key={f.id} className="text-sm">
                  <span className="font-medium">{from.fullName}</span>: {f.rating}/5,{" "}
                  {f.sentiment}
                  {f.wantsSecondDate ? ", wants a second date" : ""}
                  {f.notes ? ` — “${f.notes}”` : ""}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card title="Status history">
        {history.length === 0 ? (
          <EmptyState>No transitions recorded.</EmptyState>
        ) : (
          <ol className="space-y-1.5">
            {history.map((h) => (
              <li key={h.id} className="text-sm">
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(h.createdAt)}
                </span>{" "}
                {h.fromStatus ? `${h.fromStatus} → ` : ""}
                <span className="font-medium">{h.toStatus}</span>{" "}
                <span className="text-xs text-muted-foreground">by {h.staffName}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        Outcomes are automatic once both sides&apos; feedback is in: both
        positive → success; any negative → declined and the pair is
        permanently excluded from future suggestions. Mixed/neutral stays at
        &ldquo;met&rdquo; for your judgement.
      </p>
    </div>
  );
}
