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
 *
 * `options` / `anchors` drive the intake forms (portal + staff) and the
 * settings screen; they have no effect on scoring.
 */

export type QuestionRuleType =
  | "similarity"
  | "complementarity"
  | "exact"
  | "overlap";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionRule {
  type: QuestionRuleType;
  /** Relative weight within the intake component. */
  weight: number;
  /** For likert rules: inclusive answer range. Defaults to 1–5. */
  scaleMin?: number;
  scaleMax?: number;
  /** Human label for the settings screen / rationale prompts. */
  label: string;
  /** For exact/overlap rules: the selectable answers (intake forms). */
  options?: QuestionOption[];
  /** For likert rules: labels of the low and high end of the scale. */
  anchors?: [string, string];
}

export const QUESTION_RULES: Record<string, QuestionRule> = {
  wants_children: {
    type: "exact",
    weight: 3,
    label: "Wants children",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unsure", label: "Not sure yet" },
    ],
  },
  relationship_goal: {
    type: "exact",
    weight: 3,
    label: "Relationship goal",
    options: [
      { value: "long_term", label: "Long-term relationship" },
      { value: "marriage", label: "Marriage" },
      { value: "open", label: "Open to see where it goes" },
    ],
  },
  religion_importance: {
    type: "similarity",
    weight: 2,
    scaleMin: 1,
    scaleMax: 5,
    label: "Importance of religion",
    anchors: ["Not important", "Very important"],
  },
  political_alignment: {
    type: "similarity",
    weight: 2,
    scaleMin: 1,
    scaleMax: 5,
    label: "Political alignment",
    anchors: ["Progressive", "Conservative"],
  },
  social_energy: {
    type: "similarity",
    weight: 1.5,
    scaleMin: 1,
    scaleMax: 5,
    label: "Social energy",
    anchors: ["Homebody", "Out every night"],
  },
  ambition: {
    type: "similarity",
    weight: 1.5,
    scaleMin: 1,
    scaleMax: 5,
    label: "Career ambition",
    anchors: ["Work to live", "Highly driven"],
  },
  tidiness: {
    type: "similarity",
    weight: 1,
    scaleMin: 1,
    scaleMax: 5,
    label: "Tidiness at home",
    anchors: ["Relaxed", "Everything in its place"],
  },
  talker_listener: {
    type: "complementarity",
    weight: 1,
    scaleMin: 1,
    scaleMax: 5,
    label: "Talker ↔ listener balance",
    anchors: ["Mostly listen", "Mostly talk"],
  },
  planner_spontaneous: {
    type: "complementarity",
    weight: 0.5,
    scaleMin: 1,
    scaleMax: 5,
    label: "Planner ↔ spontaneous balance",
    anchors: ["Plan everything", "Fully spontaneous"],
  },
  hobbies: {
    type: "overlap",
    weight: 2,
    label: "Hobbies & interests",
    options: [
      { value: "hiking", label: "Hiking & outdoors" },
      { value: "cooking", label: "Cooking" },
      { value: "film", label: "Film & cinema" },
      { value: "music", label: "Music & concerts" },
      { value: "dancing", label: "Dancing" },
      { value: "festivals", label: "Festivals" },
      { value: "yoga", label: "Yoga & wellness" },
      { value: "running", label: "Running" },
      { value: "cycling", label: "Cycling" },
      { value: "climbing", label: "Climbing" },
      { value: "reading", label: "Reading" },
      { value: "travel", label: "Travel" },
      { value: "museums", label: "Museums & art" },
      { value: "ceramics", label: "Crafts & making" },
      { value: "wine", label: "Wine & food culture" },
      { value: "photography", label: "Photography" },
      { value: "gaming", label: "Gaming" },
      { value: "volunteering", label: "Volunteering" },
    ],
  },
  weekend_style: {
    type: "overlap",
    weight: 1,
    label: "Preferred weekend",
    options: [
      { value: "nature", label: "Out in nature" },
      { value: "quiet-dinner", label: "Quiet dinner" },
      { value: "nightlife", label: "Nightlife" },
      { value: "events", label: "Concerts & events" },
      { value: "sport", label: "Sport & training" },
      { value: "hosting", label: "Hosting friends & family" },
      { value: "family", label: "Family time" },
      { value: "markets", label: "Markets & city strolls" },
    ],
  },
  smoking: {
    type: "exact",
    weight: 1.5,
    label: "Smoking habits",
    options: [
      { value: "never", label: "Never" },
      { value: "socially", label: "Socially" },
      { value: "regularly", label: "Regularly" },
    ],
  },
  drinking: {
    type: "similarity",
    weight: 1,
    scaleMin: 1,
    scaleMax: 5,
    label: "Drinking frequency",
    anchors: ["Never", "Most days"],
  },
  pets: {
    type: "overlap",
    weight: 0.5,
    label: "Pets owned or wanted",
    options: [
      { value: "dog", label: "Dog" },
      { value: "cat", label: "Cat" },
      { value: "small-pets", label: "Small pets" },
      { value: "none", label: "No pets" },
    ],
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
