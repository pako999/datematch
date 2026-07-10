"use client";

import { useActionState } from "react";
import {
  addStaffMember,
  backfillEmbeddings,
  loadDemoData,
  type ActionResult,
} from "@/lib/staff/staff-actions";
import { ui } from "@/components/ui";
import { useDict } from "@/components/locale-provider";

export function LoadDemoDataForm() {
  const { t } = useDict();
  const [state, formAction, pending] = useActionState(loadDemoData, null);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className={ui.btnPrimary}>
        {pending ? t.staff.loadingDemoData : t.staff.loadDemoData}
      </button>
      {state &&
        (state.ok ? (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            {t.staff.demoLoaded}
          </span>
        ) : (
          <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>
        ))}
    </form>
  );
}

export function BackfillEmbeddingsForm() {
  const { t } = useDict();
  const [state, formAction, pending] = useActionState(backfillEmbeddings, null);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className={ui.btnPrimary}>
        {pending ? t.staff.backfillingEmbeddings : t.staff.backfillEmbeddings}
      </button>
      {state &&
        (state.ok ? (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            {state.info}
          </span>
        ) : (
          <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>
        ))}
    </form>
  );
}

export function AddStaffForm() {
  const { t } = useDict();
  const [state, formAction, pending] = useActionState(addStaffMember, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div>
        <label className={ui.label} htmlFor="new-staff-email">{t.common.email}</label>
        <input id="new-staff-email" name="email" type="email" required className={ui.input} />
      </div>
      <div>
        <label className={ui.label} htmlFor="new-staff-name">{t.common.name}</label>
        <input id="new-staff-name" name="name" required className={ui.input} />
      </div>
      <div>
        <label className={ui.label} htmlFor="new-staff-role">{t.staff.role}</label>
        <select id="new-staff-role" name="role" defaultValue="matchmaker" className={ui.input}>
          <option value="admin">admin</option>
          <option value="matchmaker">matchmaker</option>
          <option value="readonly">readonly</option>
        </select>
      </div>
      <button type="submit" disabled={pending} className={ui.btnPrimary}>
        {pending ? t.staff.adding : t.staff.addStaff}
      </button>
      {state &&
        (state.ok ? (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            {t.staff.staffAdded}
          </span>
        ) : (
          <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>
        ))}
    </form>
  );
}
