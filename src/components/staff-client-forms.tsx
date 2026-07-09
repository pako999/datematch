"use client";

import { useActionState } from "react";
import { ui } from "@/components/ui";
import { QUESTION_RULES } from "@/lib/matching/questions";
import type { ActionResult } from "@/lib/staff/actions";

type BoundAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

const GENDERS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "nonbinary", label: "Non-binary" },
  { value: "other", label: "Other" },
] as const;

function Status({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return state.ok ? (
    <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</span>
  ) : (
    <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>
  );
}

/* ------------------------------------------------------------------ */
/* Basics (create + edit)                                              */
/* ------------------------------------------------------------------ */

export interface StaffBasicsInitial {
  fullName: string;
  email: string;
  phone: string;
  birthdate: string;
  gender: string;
  city: string;
  lat: string;
  lng: string;
  bio: string;
}

export function StaffBasicsForm({
  action,
  initial,
  submitLabel,
}: {
  action: BoundAction;
  initial: StaffBasicsInitial | null;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={ui.label} htmlFor="fullName">Full name</label>
          <input id="fullName" name="fullName" required defaultValue={initial?.fullName} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required defaultValue={initial?.email} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="phone">Phone</label>
          <input id="phone" name="phone" defaultValue={initial?.phone} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="birthdate">Birthdate</label>
          <input id="birthdate" name="birthdate" type="date" required defaultValue={initial?.birthdate} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="gender">Gender</label>
          <select id="gender" name="gender" required defaultValue={initial?.gender ?? ""} className={ui.input}>
            <option value="" disabled>Select…</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={ui.label} htmlFor="city">City</label>
          <input id="city" name="city" required defaultValue={initial?.city} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="lat">Latitude (optional)</label>
          <input id="lat" name="lat" defaultValue={initial?.lat} className={ui.input} placeholder="46.0569" />
        </div>
        <div>
          <label className={ui.label} htmlFor="lng">Longitude (optional)</label>
          <input id="lng" name="lng" defaultValue={initial?.lng} className={ui.input} placeholder="14.5058" />
        </div>
      </div>
      <div>
        <label className={ui.label} htmlFor="bio">Bio (client&apos;s own words — drives semantic matching)</label>
        <textarea id="bio" name="bio" rows={4} defaultValue={initial?.bio} className={ui.input} />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={ui.btnPrimary}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Management (status / tier / assignment / consent)                   */
/* ------------------------------------------------------------------ */

export function StaffManagementForm({
  action,
  initial,
  staffOptions,
}: {
  action: BoundAction;
  initial: {
    status: string;
    membershipTier: string;
    assignedStaffId: string;
    consentToIntroduce: boolean;
  };
  staffOptions: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={ui.label} htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={initial.status} className={ui.input}>
            {["lead", "active", "paused", "matched", "churned"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={ui.label} htmlFor="membershipTier">Tier</label>
          <select id="membershipTier" name="membershipTier" defaultValue={initial.membershipTier} className={ui.input}>
            {["standard", "premium", "elite"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={ui.label} htmlFor="assignedStaffId">Assigned to</label>
          <select id="assignedStaffId" name="assignedStaffId" defaultValue={initial.assignedStaffId} className={ui.input}>
            <option value="">Unassigned</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="consentToIntroduce" defaultChecked={initial.consentToIntroduce} />
        Consent to introductions (required before appearing in any shortlist)
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={ui.btnPrimary}>
          {pending ? "Saving…" : "Save"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Preferences (staff — includes advanced rule editors)                */
/* ------------------------------------------------------------------ */

export function StaffPreferencesForm({
  action,
  initial,
}: {
  action: BoundAction;
  initial: {
    interestedInGenders: string[];
    minAge: number;
    maxAge: number;
    maxDistanceKm: number | null;
    dealbreakersJson: string;
    mustHavesJson: string;
  } | null;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <span className={ui.label}>Interested in</span>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          {GENDERS.map((g) => (
            <label key={g.value} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="interestedInGenders"
                value={g.value}
                defaultChecked={initial?.interestedInGenders.includes(g.value)}
              />
              {g.label}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={ui.label} htmlFor="minAge">Min age</label>
          <input id="minAge" name="minAge" type="number" min={18} max={99} required defaultValue={initial?.minAge ?? 18} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="maxAge">Max age</label>
          <input id="maxAge" name="maxAge" type="number" min={18} max={99} required defaultValue={initial?.maxAge ?? 99} className={ui.input} />
        </div>
        <div>
          <label className={ui.label} htmlFor="maxDistanceKm">Max distance km</label>
          <input id="maxDistanceKm" name="maxDistanceKm" type="number" min={1} placeholder="No limit" defaultValue={initial?.maxDistanceKm ?? ""} className={ui.input} />
        </div>
      </div>
      <div>
        <label className={ui.label} htmlFor="dealbreakers">
          Dealbreakers (JSON — hard filter)
        </label>
        <textarea
          id="dealbreakers"
          name="dealbreakers"
          rows={3}
          defaultValue={initial?.dealbreakersJson ?? "[]"}
          className={`${ui.input} font-mono text-xs`}
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {'e.g. [{"questionKey":"smoking","disallowedValues":["regularly"]}]'}
        </p>
      </div>
      <div>
        <label className={ui.label} htmlFor="mustHaves">
          Must-haves (JSON — scored, 20% component)
        </label>
        <textarea
          id="mustHaves"
          name="mustHaves"
          rows={3}
          defaultValue={initial?.mustHavesJson ?? "[]"}
          className={`${ui.input} font-mono text-xs`}
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {'e.g. [{"questionKey":"wants_children","acceptedValues":["yes"]}]'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={ui.btnPrimary}>
          {pending ? "Saving…" : "Save preferences"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Photo upload (Vercel Blob)                                          */
/* ------------------------------------------------------------------ */

export function StaffPhotoUploadForm({ action }: { action: BoundAction }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
        aria-label="Photo file"
        className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background hover:file:opacity-90"
      />
      <button type="submit" disabled={pending} className={ui.btnSecondary}>
        {pending ? "Uploading…" : "Upload"}
      </button>
      <Status state={state} />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Intake questionnaire (staff-entered)                                */
/* ------------------------------------------------------------------ */

export function StaffIntakeForm({
  action,
  initial,
}: {
  action: BoundAction;
  initial: Record<string, unknown>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-5">
      {Object.entries(QUESTION_RULES).map(([key, rule]) => {
        const value = initial[key];
        if (rule.type === "similarity" || rule.type === "complementarity") {
          const min = rule.scaleMin ?? 1;
          const max = rule.scaleMax ?? 5;
          return (
            <div key={key}>
              <span className={ui.label}>{rule.label}</span>
              <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <span className="w-28 text-right">{rule.anchors?.[0]}</span>
                <div className="flex gap-3">
                  {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((p) => (
                    <label key={p} className="flex flex-col items-center gap-0.5">
                      <input type="radio" name={key} value={p} defaultChecked={value === p} />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
                <span className="w-28">{rule.anchors?.[1]}</span>
              </div>
            </div>
          );
        }
        if (rule.type === "exact") {
          return (
            <div key={key}>
              <span className={ui.label}>{rule.label}</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                {rule.options?.map((o) => (
                  <label key={o.value} className="flex items-center gap-1.5 text-sm">
                    <input type="radio" name={key} value={o.value} defaultChecked={value === o.value} />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          );
        }
        const selected = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div key={key}>
            <span className={ui.label}>{rule.label}</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 sm:grid-cols-4">
              {rule.options?.map((o) => (
                <label key={o.value} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name={key} value={o.value} defaultChecked={selected.includes(o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={ui.btnPrimary}>
          {pending ? "Saving…" : "Save questionnaire"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
