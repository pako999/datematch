import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage, canManageClient } from "@/lib/auth";
import { getClientDetail, listStaff } from "@/lib/staff/clients";
import { getSuggestionsForClient } from "@/lib/matching/candidates";
import { capture } from "@/lib/analytics";
import {
  addClientNote,
  addClientPhoto,
  deleteClientHard,
  deleteClientPhoto,
  generateRationaleAction,
  recomputeClientScores,
  regenerateIntakeSummary,
  updateClientManagement,
} from "@/lib/staff/actions";
import { proposeIntroduction } from "@/lib/staff/intro-actions";
import { StaffManagementForm } from "@/components/staff-client-forms";
import {
  Card,
  ClientStatusBadge,
  EmptyState,
  IntroStatusBadge,
  ScoreBadge,
  formatDate,
  formatDateTime,
  ui,
} from "@/components/ui";
import { QUESTION_RULES } from "@/lib/matching/questions";
import { ageOn } from "@/lib/matching/score";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaffPage();
  const { id } = await params;
  const detail = await getClientDetail(id);
  if (!detail) notFound();

  const { client, assignedStaff, preferences, intake, photos, notes, intros } = detail;
  const writable = canManageClient(staff, client);
  const suggestions = client.status === "active" && client.consentToIntroduce
    ? await getSuggestionsForClient(id)
    : [];
  if (suggestions.length > 0) {
    capture("suggestions_viewed", staff.id, { clientId: id, count: suggestions.length });
  }
  const staffList = await listStaff();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{client.fullName}</h1>
            <ClientStatusBadge status={client.status} />
            <span className="text-xs text-muted-foreground">{client.membershipTier}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {ageOn(client.birthdate, new Date())} · {client.gender} · {client.city} ·{" "}
            {client.email}
            {client.phone ? ` · ${client.phone}` : ""} · Matchmaker:{" "}
            {assignedStaff?.name ?? "Unassigned"}
            {client.clerkUserId ? " · self-registered" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {writable && (
            <>
              <Link href={`/clients/${id}/edit`} className={ui.btnSecondary}>
                Edit profile
              </Link>
              <form action={recomputeClientScores.bind(null, id)}>
                <button type="submit" className={ui.btnSecondary}>
                  Recompute matches
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Intake summary */}
      <Card
        title="Intake summary"
        action={
          writable ? (
            <form action={regenerateIntakeSummary.bind(null, id)}>
              <button type="submit" className={ui.btnSecondary}>
                {client.intakeSummary ? "Regenerate" : "Generate with AI"}
              </button>
            </form>
          ) : undefined
        }
      >
        {client.intakeSummary ? (
          <p className="text-sm leading-relaxed">{client.intakeSummary}</p>
        ) : (
          <EmptyState>
            No summary yet. Generate one from the questionnaire, bio, and notes.
          </EmptyState>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Suggested matches */}
        <Card title="Suggested matches" className="lg:col-span-2">
          {suggestions.length === 0 ? (
            <EmptyState>
              {client.status !== "active" || !client.consentToIntroduce
                ? "Client must be active with consent before matches are suggested."
                : "No eligible matches stored yet — try “Recompute matches”."}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {suggestions.map((s) => (
                <li key={s.scoreId} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-48">
                    <Link href={`/clients/${s.other.id}`} className="font-medium hover:underline">
                      {s.other.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {ageOn(s.other.birthdate, new Date())} · {s.other.city} · {s.other.membershipTier}
                    </p>
                  </div>
                  <ScoreBadge score={s.score} />
                  {s.isStretchPick && (
                    <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300" title="Bios resonate strongly despite a lower structured score — a matchmaker's wildcard.">
                      Wildcard
                    </span>
                  )}
                  <div className="min-w-0 flex-1 basis-64">
                    {s.rationale ? (
                      <p className="text-sm text-muted-foreground">{s.rationale}</p>
                    ) : writable ? (
                      <form action={generateRationaleAction.bind(null, s.scoreId, id)}>
                        <button type="submit" className="text-xs underline text-muted-foreground hover:text-foreground">
                          Generate AI rationale
                        </button>
                      </form>
                    ) : null}
                  </div>
                  {writable && (
                    s.hasOpenIntro ? (
                      <span className="text-xs text-muted-foreground">Intro in progress</span>
                    ) : (
                      <form action={proposeIntroduction.bind(null, id, s.other.id)}>
                        <button type="submit" className={ui.btnPrimary}>
                          Propose introduction
                        </button>
                      </form>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Preferences */}
        <Card title="Preferences">
          {preferences ? (
            <dl className="space-y-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground">Interested in</dt>
                <dd>{preferences.interestedInGenders.join(", ")}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground">Age range</dt>
                <dd>{preferences.minAge}–{preferences.maxAge}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground">Max distance</dt>
                <dd>{preferences.maxDistanceKm ? `${preferences.maxDistanceKm} km` : "No limit"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground">Dealbreakers</dt>
                <dd className="font-mono text-xs">{JSON.stringify(preferences.dealbreakers)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground">Must-haves</dt>
                <dd className="font-mono text-xs">{JSON.stringify(preferences.mustHaves)}</dd>
              </div>
            </dl>
          ) : (
            <EmptyState>No preferences yet.</EmptyState>
          )}
        </Card>

        {/* Questionnaire */}
        <Card title="Questionnaire">
          {Object.keys(intake).length === 0 ? (
            <EmptyState>Not completed.</EmptyState>
          ) : (
            <dl className="space-y-1.5 text-sm">
              {Object.entries(QUESTION_RULES).map(([key, rule]) => {
                const value = intake[key];
                if (value === undefined) return null;
                return (
                  <div key={key} className="flex gap-2">
                    <dt className="w-48 shrink-0 text-muted-foreground">{rule.label}</dt>
                    <dd>{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
                  </div>
                );
              })}
            </dl>
          )}
        </Card>

        {/* Bio */}
        <Card title="Bio">
          {client.bio ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{client.bio}</p>
          ) : (
            <EmptyState>No bio.</EmptyState>
          )}
        </Card>

        {/* Photos (staff-only, private) */}
        <Card title="Photos (private)">
          {photos.length === 0 ? (
            <EmptyState>No photos.</EmptyState>
          ) : (
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <figure key={p.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`${client.fullName}${p.isPrimary ? " (primary)" : ""}`}
                    className="h-28 w-28 rounded-md object-cover"
                  />
                  {writable && (
                    <form action={deleteClientPhoto.bind(null, id, p.id)} className="absolute right-1 top-1">
                      <button type="submit" className="rounded bg-black/60 px-1.5 text-xs text-white" title="Remove photo">
                        ×
                      </button>
                    </form>
                  )}
                </figure>
              ))}
            </div>
          )}
          {writable && (
            <form action={addClientPhoto.bind(null, id)} className="mt-3 flex gap-2">
              <input name="url" placeholder="https://… image URL" className={ui.input} />
              <button type="submit" className={ui.btnSecondary}>Add</button>
            </form>
          )}
        </Card>

        {/* Introductions */}
        <Card title="Introductions">
          {intros.length === 0 ? (
            <EmptyState>No introductions yet.</EmptyState>
          ) : (
            <ul className="space-y-2 text-sm">
              {intros.map((i) => (
                <li key={i.id} className="flex items-center gap-2">
                  <IntroStatusBadge status={i.status} />
                  <Link href={`/introductions/${i.id}`} className="hover:underline">
                    with {i.otherName}
                  </Link>
                  <span className="text-xs text-muted-foreground">{formatDate(i.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Notes timeline */}
        <Card title="Notes" className="lg:col-span-2">
          {writable && (
            <form action={addClientNote.bind(null, id)} className="mb-3 flex gap-2">
              <input name="body" placeholder="Add a note…" className={ui.input} />
              <button type="submit" className={ui.btnSecondary}>Add</button>
            </form>
          )}
          {notes.length === 0 ? (
            <EmptyState>No notes yet.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="text-sm">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(n.createdAt)} · {n.staffName}
                  </span>
                  <p>{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Management */}
        <Card title="Management" className="lg:col-span-2">
          {writable ? (
            <StaffManagementForm
              action={updateClientManagement.bind(null, id)}
              initial={{
                status: client.status,
                membershipTier: client.membershipTier,
                assignedStaffId: client.assignedStaffId ?? "",
                consentToIntroduce: client.consentToIntroduce,
              }}
              staffOptions={staffList
                .filter((s) => !s.id.startsWith("pending:"))
                .map((s) => ({ id: s.id, name: s.name }))}
            />
          ) : (
            <EmptyState>Read-only access.</EmptyState>
          )}
          {staff.role === "admin" && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400">
                Danger zone: permanently delete (GDPR)
              </summary>
              <form action={deleteClientHard.bind(null, id)} className="mt-2 flex gap-2">
                <input
                  name="confirmName"
                  placeholder={`Type "${client.fullName}" to confirm`}
                  className={ui.input}
                />
                <button type="submit" className={ui.btnDanger}>
                  Delete forever
                </button>
              </form>
              <p className="mt-1 text-xs text-muted-foreground">
                Removes the client and cascades to scores, introductions,
                feedback, notes, and photos. This cannot be undone.
              </p>
            </details>
          )}
        </Card>
      </div>
    </div>
  );
}
