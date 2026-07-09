"use client";

import { useActionState } from "react";
import {
  saveBasics,
  saveConsent,
  savePreferences,
  saveQuestionnaire,
  uploadMyPhoto,
  type ActionResult,
} from "@/lib/portal/actions";
import { QUESTION_RULES } from "@/lib/matching/questions";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const GENDER_OPTIONS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "nonbinary", label: "Non-binary" },
  { value: "other", label: "Other" },
] as const;

const inputCls =
  "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50";
const labelCls = "block text-sm font-medium";
const fieldCls = "space-y-1.5";

function SaveButton({ pending, label }: { pending: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Saving…" : (label ?? "Save")}
    </button>
  );
}

function FormStatus({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return state.ok ? (
    <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
  ) : (
    <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
  );
}

/* ------------------------------------------------------------------ */
/* Basics                                                              */
/* ------------------------------------------------------------------ */

export interface BasicsInitial {
  fullName: string;
  phone: string;
  birthdate: string; // yyyy-mm-dd
  gender: string;
  city: string;
  bio: string;
}

export function BasicsForm({ initial }: { initial: BasicsInitial | null }) {
  const [state, action, pending] = useActionState(saveBasics, null);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldCls}>
          <label htmlFor="fullName" className={labelCls}>
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            defaultValue={initial?.fullName}
            className={inputCls}
            autoComplete="name"
          />
        </div>
        <div className={fieldCls}>
          <label htmlFor="phone" className={labelCls}>
            Phone <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={initial?.phone}
            className={inputCls}
            autoComplete="tel"
          />
        </div>
        <div className={fieldCls}>
          <label htmlFor="birthdate" className={labelCls}>
            Date of birth
          </label>
          <input
            id="birthdate"
            name="birthdate"
            type="date"
            required
            defaultValue={initial?.birthdate}
            className={inputCls}
          />
        </div>
        <div className={fieldCls}>
          <label htmlFor="gender" className={labelCls}>
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            required
            defaultValue={initial?.gender ?? ""}
            className={inputCls}
          >
            <option value="" disabled>
              Select…
            </option>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className={`${fieldCls} sm:col-span-2`}>
          <label htmlFor="city" className={labelCls}>
            City
          </label>
          <input
            id="city"
            name="city"
            required
            defaultValue={initial?.city}
            className={inputCls}
            autoComplete="address-level2"
          />
        </div>
      </div>
      <div className={fieldCls}>
        <label htmlFor="bio" className={labelCls}>
          About you
        </label>
        <p className="text-xs text-muted-foreground">
          Tell us about yourself in your own words — your lifestyle, what
          matters to you, and what you&apos;re looking for. Your matchmaker
          reads this, and it genuinely improves your matches.
        </p>
        <textarea
          id="bio"
          name="bio"
          rows={5}
          defaultValue={initial?.bio}
          className={inputCls}
        />
      </div>
      <div className="flex items-center gap-4">
        <SaveButton pending={pending} label="Save details" />
        <FormStatus state={state} />
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Preferences                                                         */
/* ------------------------------------------------------------------ */

export interface PreferencesInitial {
  interestedInGenders: string[];
  minAge: number;
  maxAge: number;
  maxDistanceKm: number | null;
  noSmokers: boolean;
  partnerMustWantChildren: boolean;
}

export function PreferencesForm({
  initial,
  disabled,
}: {
  initial: PreferencesInitial | null;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(savePreferences, null);

  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={disabled} className="space-y-4 disabled:opacity-50">
        <div className={fieldCls}>
          <span className={labelCls}>I&apos;d like to meet</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            {GENDER_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="interestedInGenders"
                  value={o.value}
                  defaultChecked={initial?.interestedInGenders.includes(o.value)}
                />
                {o.label === "Woman" ? "Women" : o.label === "Man" ? "Men" : o.label}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className={fieldCls}>
            <label htmlFor="minAge" className={labelCls}>
              Age from
            </label>
            <input
              id="minAge"
              name="minAge"
              type="number"
              min={18}
              max={99}
              required
              defaultValue={initial?.minAge ?? 18}
              className={inputCls}
            />
          </div>
          <div className={fieldCls}>
            <label htmlFor="maxAge" className={labelCls}>
              Age to
            </label>
            <input
              id="maxAge"
              name="maxAge"
              type="number"
              min={18}
              max={99}
              required
              defaultValue={initial?.maxAge ?? 99}
              className={inputCls}
            />
          </div>
          <div className={fieldCls}>
            <label htmlFor="maxDistanceKm" className={labelCls}>
              Max distance (km)
            </label>
            <input
              id="maxDistanceKm"
              name="maxDistanceKm"
              type="number"
              min={1}
              max={1000}
              placeholder="No limit"
              defaultValue={initial?.maxDistanceKm ?? ""}
              className={inputCls}
            />
          </div>
        </div>
        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="noSmokers"
              defaultChecked={initial?.noSmokers}
            />
            Please don&apos;t match me with smokers
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="partnerMustWantChildren"
              defaultChecked={initial?.partnerMustWantChildren}
            />
            My partner should want children
          </label>
          <p className="text-xs text-muted-foreground">
            Anything more specific? Mention it in “About you” — your
            matchmaker can set further requirements with you.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SaveButton pending={pending} label="Save preferences" />
          <FormStatus state={state} />
        </div>
      </fieldset>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Questionnaire                                                       */
/* ------------------------------------------------------------------ */

export function QuestionnaireForm({
  initial,
  disabled,
}: {
  initial: Record<string, unknown>;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(saveQuestionnaire, null);

  return (
    <form action={action} className="space-y-6">
      <fieldset disabled={disabled} className="space-y-6 disabled:opacity-50">
        {Object.entries(QUESTION_RULES).map(([key, rule]) => {
          const value = initial[key];

          if (rule.type === "similarity" || rule.type === "complementarity") {
            const min = rule.scaleMin ?? 1;
            const max = rule.scaleMax ?? 5;
            const points = Array.from({ length: max - min + 1 }, (_, i) => min + i);
            return (
              <div key={key} className={fieldCls}>
                <span className={labelCls}>{rule.label}</span>
                <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                  <span className="w-24 text-right">{rule.anchors?.[0]}</span>
                  <div className="flex gap-4">
                    {points.map((p) => (
                      <label key={p} className="flex flex-col items-center gap-1">
                        <input
                          type="radio"
                          name={key}
                          value={p}
                          defaultChecked={value === p}
                        />
                        <span>{p}</span>
                      </label>
                    ))}
                  </div>
                  <span className="w-24">{rule.anchors?.[1]}</span>
                </div>
              </div>
            );
          }

          if (rule.type === "exact") {
            return (
              <div key={key} className={fieldCls}>
                <span className={labelCls}>{rule.label}</span>
                <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                  {rule.options?.map((o) => (
                    <label key={o.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={key}
                        value={o.value}
                        defaultChecked={value === o.value}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          }

          // overlap → multi-select checkboxes
          const selected = Array.isArray(value) ? (value as string[]) : [];
          return (
            <div key={key} className={fieldCls}>
              <span className={labelCls}>{rule.label}</span>
              <div className="grid grid-cols-2 gap-x-5 gap-y-2 pt-1 sm:grid-cols-3">
                {rule.options?.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={key}
                      value={o.value}
                      defaultChecked={selected.includes(o.value)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-4">
          <SaveButton pending={pending} label="Save answers" />
          <FormStatus state={state} />
        </div>
      </fieldset>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Photo upload                                                        */
/* ------------------------------------------------------------------ */

export function PhotoUploadForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(uploadMyPhoto, null);
  return (
    <form action={action} className="space-y-3">
      <fieldset disabled={disabled} className="space-y-3 disabled:opacity-50">
        <div className={fieldCls}>
          <label htmlFor="photo" className={labelCls}>
            Add a photo <span className="text-muted-foreground">(JPEG, PNG or WebP, max 5 MB)</span>
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background hover:file:opacity-90"
          />
        </div>
        <div className="flex items-center gap-4">
          <SaveButton pending={pending} label="Upload photo" />
          <FormStatus state={state} />
        </div>
      </fieldset>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Consent                                                             */
/* ------------------------------------------------------------------ */

export function ConsentForm({
  initial,
  disabled,
}: {
  initial: boolean;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(saveConsent, null);

  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={disabled} className="space-y-4 disabled:opacity-50">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consentToIntroduce"
            defaultChecked={initial}
            className="mt-0.5"
          />
          <span>
            I consent to the agency considering me for introductions and
            sharing my profile (excluding contact details) with potential
            matches. I can withdraw this at any time by unticking this box or
            contacting the agency.
          </span>
        </label>
        <div className="flex items-center gap-4">
          <SaveButton pending={pending} label="Save consent" />
          <FormStatus state={state} />
        </div>
      </fieldset>
    </form>
  );
}
