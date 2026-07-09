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
  uploadClientPhoto,
} from "@/lib/staff/actions";
import { proposeIntroduction } from "@/lib/staff/intro-actions";
import {
  StaffManagementForm,
  StaffPhotoUploadForm,
} from "@/components/staff-client-forms";
import {
  Card,
  ClientStatusBadge,
  EmptyState,
  IntroStatusBadge,
  ScoreBadge,
  formatDate,
  formatDateTime,
  scoreTier,
  ui,
} from "@/components/ui";
import { QUESTION_RULES } from "@/lib/matching/questions";
import { ageOn } from "@/lib/matching/score";
import { getI18n } from "@/lib/i18n";
import { fill, questionLabel } from "@/lib/i18n/dictionaries";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaffPage();
  const { t } = await getI18n();
  const { id } = await params;
  const detail = await getClientDetail(id);
  if (!detail) notFound();

  const { client, assignedStaff, preferences, intake, photos, notes, intros } = detail;
  const writable = canManageClient(staff, client);
  const suggestions =
    client.status === "active" && client.consentToIntroduce
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
            <ClientStatusBadge status={client.status} label={t.clientStatus[client.status]} />
            <span className="text-xs text-muted-foreground">{client.membershipTier}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {ageOn(client.birthdate, new Date())} · {t.genders[client.gender]} ·{" "}
            {client.city}, {client.country} · {client.email}
            {client.phone ? ` · ${client.phone}` : ""} · {t.common.matchmaker}:{" "}
            {assignedStaff?.name ?? t.common.unassigned}
            {client.clerkUserId ? ` · ${t.staff.selfRegistered}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {writable && (
            <>
              <Link href={`/clients/${id}/edit`} className={ui.btnSecondary}>
                {t.staff.editProfileBtn}
              </Link>
              <form action={recomputeClientScores.bind(null, id)}>
                <button type="submit" className={ui.btnSecondary}>
                  {t.staff.recomputeMatches}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Intake summary */}
      <Card
        title={t.staff.intakeSummary}
        action={
          writable ? (
            <form action={regenerateIntakeSummary.bind(null, id)}>
              <button type="submit" className={ui.btnSecondary}>
                {client.intakeSummary ? t.staff.regenerate : t.staff.generateWithAI}
              </button>
            </form>
          ) : undefined
        }
      >
        {client.intakeSummary ? (
          <p className="text-sm leading-relaxed">{client.intakeSummary}</p>
        ) : (
          <EmptyState>{t.staff.noSummary}</EmptyState>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Suggested matches */}
        <Card title={t.staff.suggestedMatches} className="lg:col-span-2">
          {suggestions.length === 0 ? (
            <EmptyState>
              {client.status !== "active" || !client.consentToIntroduce
                ? t.staff.noMatchesInactive
                : t.staff.noMatchesYet}
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
                      {ageOn(s.other.birthdate, new Date())} · {s.other.city} ·{" "}
                      {s.other.membershipTier}
                    </p>
                  </div>
                  <ScoreBadge score={s.score} label={t.scoreTiers[scoreTier(s.score).key]} />
                  {s.isStretchPick && (
                    <span
                      className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"
                      title={t.scoreTiers.wildcardTitle}
                    >
                      {t.scoreTiers.wildcard}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 basis-64">
                    {s.rationale ? (
                      <p className="text-sm text-muted-foreground">{s.rationale}</p>
                    ) : writable ? (
                      <form action={generateRationaleAction.bind(null, s.scoreId, id)}>
                        <button
                          type="submit"
                          className="text-xs text-muted-foreground underline hover:text-foreground"
                        >
                          {t.staff.generateRationale}
                        </button>
                      </form>
                    ) : null}
                  </div>
                  {writable &&
                    (s.hasOpenIntro ? (
                      <span className="text-xs text-muted-foreground">
                        {t.staff.introInProgress}
                      </span>
                    ) : (
                      <form action={proposeIntroduction.bind(null, id, s.other.id)}>
                        <button type="submit" className={ui.btnPrimary}>
                          {t.staff.proposeIntroduction}
                        </button>
                      </form>
                    ))}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Preferences */}
        <Card title={t.staff.preferences}>
          {preferences ? (
            <dl className="space-y-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground">{t.staff.interestedIn}</dt>
                <dd>
                  {preferences.interestedInGenders
                    .map((g) => t.genders[g])
                    .join(", ")}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground">{t.staff.ageRange}</dt>
                <dd>{preferences.minAge}–{preferences.maxAge}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground">{t.staff.maxDistanceLabel}</dt>
                <dd>
                  {preferences.maxDistanceKm
                    ? `${preferences.maxDistanceKm} km`
                    : t.portal.noLimit}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground">{t.staff.dealbreakers}</dt>
                <dd className="font-mono text-xs">{JSON.stringify(preferences.dealbreakers)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 text-muted-foreground">{t.staff.mustHaves}</dt>
                <dd className="font-mono text-xs">{JSON.stringify(preferences.mustHaves)}</dd>
              </div>
            </dl>
          ) : (
            <EmptyState>{t.staff.noPreferences}</EmptyState>
          )}
        </Card>

        {/* Questionnaire */}
        <Card title={t.staff.questionnaire}>
          {Object.keys(intake).length === 0 ? (
            <EmptyState>{t.staff.notCompleted}</EmptyState>
          ) : (
            <dl className="space-y-1.5 text-sm">
              {Object.entries(QUESTION_RULES).map(([key, rule]) => {
                const value = intake[key];
                if (value === undefined) return null;
                return (
                  <div key={key} className="flex gap-2">
                    <dt className="w-48 shrink-0 text-muted-foreground">
                      {questionLabel(t, key, rule.label)}
                    </dt>
                    <dd>{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
                  </div>
                );
              })}
            </dl>
          )}
        </Card>

        {/* Bio */}
        <Card title={t.staff.bio}>
          {client.bio ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{client.bio}</p>
          ) : (
            <EmptyState>{t.staff.noBio}</EmptyState>
          )}
        </Card>

        {/* Photos (staff-only, private) */}
        <Card title={t.staff.photosPrivate}>
          {photos.length === 0 ? (
            <EmptyState>{t.staff.noPhotos}</EmptyState>
          ) : (
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <figure key={p.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={client.fullName}
                    className="h-28 w-28 rounded-md object-cover"
                  />
                  {writable && (
                    <form action={deleteClientPhoto.bind(null, id, p.id)} className="absolute right-1 top-1">
                      <button
                        type="submit"
                        className="rounded bg-black/60 px-1.5 text-xs text-white"
                        title={t.common.remove}
                      >
                        ×
                      </button>
                    </form>
                  )}
                </figure>
              ))}
            </div>
          )}
          {writable && (
            <div className="mt-3 space-y-2">
              <StaffPhotoUploadForm action={uploadClientPhoto.bind(null, id)} />
              <form action={addClientPhoto.bind(null, id)} className="flex gap-2">
                <input name="url" placeholder={t.staff.orPasteUrl} className={ui.input} />
                <button type="submit" className={ui.btnSecondary}>{t.staff.addUrl}</button>
              </form>
            </div>
          )}
        </Card>

        {/* Introductions */}
        <Card title={t.staff.introductions}>
          {intros.length === 0 ? (
            <EmptyState>{t.staff.noIntros}</EmptyState>
          ) : (
            <ul className="space-y-2 text-sm">
              {intros.map((i) => (
                <li key={i.id} className="flex items-center gap-2">
                  <IntroStatusBadge status={i.status} label={t.introStatus[i.status]} />
                  <Link href={`/introductions/${i.id}`} className="hover:underline">
                    {t.staff.with} {i.otherName}
                  </Link>
                  <span className="text-xs text-muted-foreground">{formatDate(i.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Notes timeline */}
        <Card title={t.staff.notes} className="lg:col-span-2">
          {writable && (
            <form action={addClientNote.bind(null, id)} className="mb-3 flex gap-2">
              <input name="body" placeholder={t.staff.addNote} className={ui.input} />
              <button type="submit" className={ui.btnSecondary}>{t.common.add}</button>
            </form>
          )}
          {notes.length === 0 ? (
            <EmptyState>{t.staff.noNotes}</EmptyState>
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
        <Card title={t.staff.management} className="lg:col-span-2">
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
            <EmptyState>{t.staff.readonlyAccess}</EmptyState>
          )}
          {staff.role === "admin" && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400">
                {t.staff.dangerZone}
              </summary>
              <form action={deleteClientHard.bind(null, id)} className="mt-2 flex gap-2">
                <input
                  name="confirmName"
                  placeholder={fill(t.staff.deleteConfirmPlaceholder, {
                    name: client.fullName,
                  })}
                  className={ui.input}
                />
                <button type="submit" className={ui.btnDanger}>
                  {t.staff.deleteForever}
                </button>
              </form>
              <p className="mt-1 text-xs text-muted-foreground">{t.staff.deleteNote}</p>
            </details>
          )}
        </Card>
      </div>
    </div>
  );
}
