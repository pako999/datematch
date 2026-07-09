"use client";

import { useActionState } from "react";
import { addStaffMember, type ActionResult } from "@/lib/staff/staff-actions";
import { ui } from "@/components/ui";

export function AddStaffForm() {
  const [state, formAction, pending] = useActionState(addStaffMember, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div>
        <label className={ui.label} htmlFor="new-staff-email">Email</label>
        <input id="new-staff-email" name="email" type="email" required className={ui.input} />
      </div>
      <div>
        <label className={ui.label} htmlFor="new-staff-name">Name</label>
        <input id="new-staff-name" name="name" required className={ui.input} />
      </div>
      <div>
        <label className={ui.label} htmlFor="new-staff-role">Role</label>
        <select id="new-staff-role" name="role" defaultValue="matchmaker" className={ui.input}>
          <option value="admin">admin</option>
          <option value="matchmaker">matchmaker</option>
          <option value="readonly">readonly</option>
        </select>
      </div>
      <button type="submit" disabled={pending} className={ui.btnPrimary}>
        {pending ? "Adding…" : "Add staff"}
      </button>
      {state &&
        (state.ok ? (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Added — they get access on first sign-in.
          </span>
        ) : (
          <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>
        ))}
    </form>
  );
}
