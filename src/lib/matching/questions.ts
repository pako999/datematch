/**
 * Compatibility questionnaire configuration.
 *
 * Each intake question has a scoring rule that says HOW two answers are
 * compared and how much the question matters. Rules:
 *
 * - "similarity"      — closer answers score higher (likert scales:
 *                       1 - |a-b| / range). E.g. "how important is religion".
 * - "complementarity" — differing answers score higher (|a-b| / range).
 *                       E.g. "talker vs listener".
 * - "exact"           — 1 if equal, 0 otherwise. E.g. "wants children".
 * - "overlap"         — Jaccard overlap of two multi-select answers.
 *                       E.g. shared hobbies.
 *
 * Weights are relative within the intake component (normalized at scoring
 * time), so adding a question never silently deflates the others.
 */

export type QuestionRuleType =
  | "similarity"
  | "complementarity"
  | "exact"
  | "overlap";

export interface QuestionRule {
  type: QuestionRuleType;
  /** Relative weight within the intake component. */
  weight: number;
  /** For likert rules: inclusive answer range. Defaults to 1–5. */
  scaleMin?: number;
  scaleMax?: number;
  /** Human label for the settings screen / rationale prompts. */
  label: string;
}

export const QUESTION_RULES: Record<string, QuestionRule> = {
  wants_children: {
    type: "exact",
    weight: 3,
    label: "Wants children",
  },
  relationship_goal: {
    type: "exact",
    weight: 3,
    label: "Relationship goal (long-term / marriage / open)",
  },
  religion_importance: {
    type: "similarity",
    weight: 2,
    scaleMin: 1,
    scaleMax: 5,
    label: "Importance of religion",
  },
  political_alignment: {
    type: "similarity",
    weight: 2,
    scaleMin: 1,
    scaleMax: 5,
    label: "Political alignment",
  },
  social_energy: {
    type: "similarity",
    weight: 1.5,
    scaleMin: 1,
    scaleMax: 5,
    label: "Social energy (homebody ↔ out every night)",
  },
  ambition: {
    type: "similarity",
    weight: 1.5,
    scaleMin: 1,
    scaleMax: 5,
    label: "Career ambition",
  },
  tidiness: {
    type: "similarity",
    weight: 1,
    scaleMin: 1,
    scaleMax: 5,
    label: "Tidiness at home",
  },
  talker_listener: {
    type: "complementarity",
    weight: 1,
    scaleMin: 1,
    scaleMax: 5,
    label: "Talker ↔ listener balance",
  },
  planner_spontaneous: {
    type: "complementarity",
    weight: 0.5,
    scaleMin: 1,
    scaleMax: 5,
    label: "Planner ↔ spontaneous balance",
  },
  hobbies: {
    type: "overlap",
    weight: 2,
    label: "Shared hobbies & interests",
  },
  weekend_style: {
    type: "overlap",
    weight: 1,
    label: "Preferred weekend activities",
  },
  smoking: {
    type: "exact",
    weight: 1.5,
    label: "Smoking habits",
  },
  drinking: {
    type: "similarity",
    weight: 1,
    scaleMin: 1,
    scaleMax: 5,
    label: "Drinking frequency",
  },
  pets: {
    type: "overlap",
    weight: 0.5,
    label: "Pets owned / wanted",
  },
};

/** Top-level component weights of the pair score. Must sum to 1. */
export const COMPONENT_WEIGHTS = {
  intake: 0.4,
  semantic: 0.25,
  mustHaves: 0.2,
  proximity: 0.15,
} as const;

export type ComponentKey = keyof typeof COMPONENT_WEIGHTS;
