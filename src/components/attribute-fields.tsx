"use client";

import { useDict } from "@/components/locale-provider";
import {
  BODY_TYPES,
  EDUCATIONS,
  EYE_COLORS,
  HAIR_COLORS,
  HEIGHT_MAX,
  HEIGHT_MIN,
  WEIGHT_MAX,
  WEIGHT_MIN,
} from "@/lib/attributes";

export interface AttributeInitial {
  heightCm: number | null;
  weightKg: number | null;
  eyeColor: string | null;
  hairColor: string | null;
  bodyType: string | null;
  education: string | null;
  occupation: string | null;
}

/**
 * The shared appearance/personal fields (height, weight, eye & hair
 * color, body type, education, occupation) used by both the portal and
 * the staff basics forms. All optional.
 */
export function AttributeFields({
  initial,
  inputCls,
  labelCls,
}: {
  initial: AttributeInitial | null;
  inputCls: string;
  labelCls: string;
}) {
  const { t } = useDict();
  const a = t.attributes;

  const select = (
    name: keyof AttributeInitial,
    label: string,
    options: readonly string[],
    translations: Record<string, string>,
  ) => (
    <div>
      <label className={labelCls} htmlFor={`attr-${name}`}>{label}</label>
      <select
        id={`attr-${name}`}
        name={name}
        defaultValue={(initial?.[name] as string | null) ?? ""}
        className={inputCls}
      >
        <option value="">{t.common.none}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {translations[o] ?? o}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelCls} htmlFor="attr-heightCm">{a.heightCm}</label>
        <input
          id="attr-heightCm"
          name="heightCm"
          type="number"
          min={HEIGHT_MIN}
          max={HEIGHT_MAX}
          defaultValue={initial?.heightCm ?? ""}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="attr-weightKg">{a.weightKg}</label>
        <input
          id="attr-weightKg"
          name="weightKg"
          type="number"
          min={WEIGHT_MIN}
          max={WEIGHT_MAX}
          defaultValue={initial?.weightKg ?? ""}
          className={inputCls}
        />
      </div>
      {select("eyeColor", a.eyeColor, EYE_COLORS, a.eyeColors)}
      {select("hairColor", a.hairColor, HAIR_COLORS, a.hairColors)}
      {select("bodyType", a.bodyType, BODY_TYPES, a.bodyTypes)}
      {select("education", a.education, EDUCATIONS, a.educations)}
      <div className="sm:col-span-2">
        <label className={labelCls} htmlFor="attr-occupation">{a.occupation}</label>
        <input
          id="attr-occupation"
          name="occupation"
          defaultValue={initial?.occupation ?? ""}
          className={inputCls}
          maxLength={200}
        />
      </div>
    </div>
  );
}
