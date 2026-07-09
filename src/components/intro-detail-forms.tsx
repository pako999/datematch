"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { IntroStatus, Sentiment } from "@/db/schema";
import {
  advanceIntroduction,
  logFeedback,
  recordAcceptance,
  scheduleDate,
  type ActionResult,
} from "@/lib/staff/intro-actions";
import { ui } from "@/components/ui";
import { useDict } from "@/components/locale-provider";
import { fill } from "@/lib/i18n/dictionaries";

function Status({ state }: { state: ActionResult | null }) {
  const { t } = useDict();
  if (!state) return null;
  return state.ok ? (
    <span className="text-sm text-emerald-600 dark:text-emerald-400">
      {t.common.saved}
    </span>
  ) : (
    <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>
  );
}

/** One-click transition buttons with inline error reporting. */
export function TransitionButtons({
  introId,
  status,
  aName,
  bName,
}: {
  introId: string;
  status: IntroStatus;
  aName: string;
  bName: string;
}) {
  const { t } = useDict();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? t.staff.moveNotAllowed);
      router.refresh();
    });
  }

  const acceptable = ["proposed", "accepted_a", "accepted_b"].includes(status);
  const buttons: { label: string; onClick: () => void; danger?: boolean }[] = [];

  if (status === "suggested") {
    buttons.push({
      label: t.staff.proposeToClients,
      onClick: () => run(() => advanceIntroduction(introId, "proposed")),
    });
  }
  if (acceptable) {
    if (status !== "accepted_a") {
      buttons.push({
        label: fill(t.staff.acceptedBtn, { name: aName }),
        onClick: () => run(() => recordAcceptance(introId, "a")),
      });
    }
    if (status !== "accepted_b") {
      buttons.push({
        label: fill(t.staff.acceptedBtn, { name: bName }),
        onClick: () => run(() => recordAcceptance(introId, "b")),
      });
    }
  }
  if (status === "date_scheduled") {
    buttons.push({
      label: t.staff.theyMet,
      onClick: () => run(() => advanceIntroduction(introId, "met")),
    });
  }
  if (status === "met") {
    buttons.push({
      label: t.staff.markSuccess,
      onClick: () => run(() => advanceIntroduction(introId, "success")),
    });
  }
  if (!["success", "declined", "no_match"].includes(status)) {
    buttons.push({
      label: t.staff.declinedBtn,
      danger: true,
      onClick: () => run(() => advanceIntroduction(introId, "declined")),
    });
    buttons.push({
      label: t.staff.noMatchBtn,
      danger: true,
      onClick: () => run(() => advanceIntroduction(introId, "no_match")),
    });
  }

  if (buttons.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            disabled={pending}
            onClick={b.onClick}
            className={b.danger ? ui.btnDanger : ui.btnSecondary}
          >
            {b.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function ScheduleForm({
  introId,
  current,
}: {
  introId: string;
  current: string | null; // datetime-local value
}) {
  const { t } = useDict();
  const [state, formAction, pending] = useActionState(
    scheduleDate.bind(null, introId),
    null,
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div>
        <label className={ui.label} htmlFor="scheduledFor">
          {t.staff.dateTime}
        </label>
        <input
          id="scheduledFor"
          name="scheduledFor"
          type="datetime-local"
          defaultValue={current ?? ""}
          className={ui.input}
        />
      </div>
      <button type="submit" disabled={pending} className={ui.btnPrimary}>
        {pending ? t.common.saving : t.staff.scheduleDateBtn}
      </button>
      <Status state={state} />
    </form>
  );
}

export function FeedbackForm({
  introId,
  fromClientId,
  fromName,
  existing,
}: {
  introId: string;
  fromClientId: string;
  fromName: string;
  existing: {
    rating: number;
    sentiment: Sentiment;
    notes: string;
    wantsSecondDate: boolean;
  } | null;
}) {
  const { t } = useDict();
  const [state, formAction, pending] = useActionState(
    logFeedback.bind(null, introId, fromClientId),
    null,
  );
  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm font-medium">
        {fill(t.staff.feedbackFrom, { name: fromName })}
      </p>
      <div className="flex flex-wrap gap-3">
        <div>
          <label className={ui.label} htmlFor={`rating-${fromClientId}`}>
            {t.staff.rating}
          </label>
          <select
            id={`rating-${fromClientId}`}
            name="rating"
            defaultValue={existing?.rating ?? ""}
            required
            className={ui.input}
          >
            <option value="" disabled>–</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <span className={ui.label}>{t.staff.sentimentLabel}</span>
          <div className="flex gap-3 pt-1.5">
            {(["positive", "neutral", "negative"] as const).map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="sentiment"
                  value={s}
                  required
                  defaultChecked={existing?.sentiment === s}
                />
                {t.sentiment[s]}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-1.5 self-end pb-2 text-sm">
          <input
            type="checkbox"
            name="wantsSecondDate"
            defaultChecked={existing?.wantsSecondDate}
          />
          {t.staff.wantsSecondDate}
        </label>
      </div>
      <textarea
        name="notes"
        rows={2}
        placeholder={t.staff.whatDidTheySay}
        defaultValue={existing?.notes}
        className={ui.input}
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={ui.btnPrimary}>
          {pending
            ? t.common.saving
            : existing
              ? t.staff.updateFeedback
              : t.staff.logFeedback}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
