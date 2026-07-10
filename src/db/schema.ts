import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const staffRoleEnum = pgEnum("staff_role", [
  "admin",
  "matchmaker",
  "readonly",
]);

export const clientStatusEnum = pgEnum("client_status", [
  "lead",
  "active",
  "paused",
  "matched",
  "churned",
]);

export const membershipTierEnum = pgEnum("membership_tier", [
  "standard",
  "premium",
  "elite",
]);

export const genderEnum = pgEnum("gender", [
  "woman",
  "man",
  "nonbinary",
  "other",
]);

export const introStatusEnum = pgEnum("intro_status", [
  "suggested",
  "proposed",
  "accepted_a",
  "accepted_b",
  "both_accepted",
  "date_scheduled",
  "met",
  "success",
  "declined",
  "no_match",
]);

export const sentimentEnum = pgEnum("sentiment", [
  "positive",
  "neutral",
  "negative",
]);

/* ------------------------------------------------------------------ */
/* Staff (id = Clerk user id)                                          */
/* ------------------------------------------------------------------ */

export const staff = pgTable("staff", {
  id: text("id").primaryKey(), // Clerk user id
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: staffRoleEnum("role").notNull().default("matchmaker"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Clients (the daters — records managed by staff, never end users)    */
/* ------------------------------------------------------------------ */

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * Set when the client self-registered through the portal (Clerk user
     * id). Null for records created by staff on the client's behalf.
     */
    clerkUserId: text("clerk_user_id").unique(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    birthdate: date("birthdate", { mode: "date" }).notNull(),
    gender: genderEnum("gender").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull().default("Slovenija"),
    // Derived from city+country via best-effort geocoding; never staff-entered.
    lat: numeric("lat", { precision: 9, scale: 6, mode: "number" }),
    lng: numeric("lng", { precision: 9, scale: 6, mode: "number" }),
    /* Physical & personal attributes (all optional; values are stable
     * keys — e.g. eyeColor "brown" — translated at display time). */
    heightCm: integer("height_cm"),
    weightKg: integer("weight_kg"),
    eyeColor: text("eye_color"),
    hairColor: text("hair_color"),
    bodyType: text("body_type"),
    education: text("education"),
    occupation: text("occupation"),
    status: clientStatusEnum("status").notNull().default("lead"),
    membershipTier: membershipTierEnum("membership_tier")
      .notNull()
      .default("standard"),
    assignedStaffId: text("assigned_staff_id").references(() => staff.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    bio: text("bio").notNull().default(""),
    /** Cached AI intake summary shown in the profile header (staff-facing). */
    intakeSummary: text("intake_summary"),
    // Bio embedding for semantic similarity (generated via Inngest on bio
    // change). 1024 dims = Voyage AI voyage-3.5 (Anthropic has no
    // embeddings endpoint; Voyage is its recommended partner).
    embedding: vector("embedding", { dimensions: 1024 }),
    consentToIntroduce: boolean("consent_to_introduce").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedByStaffId: text("updated_by_staff_id").references(() => staff.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  },
  (t) => [
    // Hot path: candidate pool lookup (status=active AND consent, then gender/age/geo).
    index("clients_candidate_pool_idx").on(
      t.status,
      t.consentToIntroduce,
      t.gender,
      t.birthdate,
    ),
    index("clients_city_idx").on(t.city),
    index("clients_assigned_staff_idx").on(t.assignedStaffId),
    // ANN search over bio embeddings (cosine).
    index("clients_embedding_hnsw_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* Client preferences (1:1 with client)                                */
/* ------------------------------------------------------------------ */

export const clientPreferences = pgTable("client_preferences", {
  clientId: uuid("client_id")
    .primaryKey()
    .references(() => clients.id, { onDelete: "cascade" }),
  interestedInGenders: genderEnum("interested_in_genders").array().notNull(),
  minAge: integer("min_age").notNull().default(18),
  maxAge: integer("max_age").notNull().default(99),
  maxDistanceKm: integer("max_distance_km"), // null = no distance constraint
  /**
   * Hard exclusions. Shape: Array<{ questionKey: string; disallowedValues: unknown[] }>
   * A candidate whose intake answer for questionKey matches any disallowed
   * value is filtered out entirely (score 0).
   */
  dealbreakers: jsonb("dealbreakers").notNull().default(sql`'[]'::jsonb`),
  /**
   * Soft requirements, scored (20% component). Shape:
   * Array<{ questionKey: string; acceptedValues: unknown[] }>
   */
  mustHaves: jsonb("must_haves").notNull().default(sql`'[]'::jsonb`),
});

/* ------------------------------------------------------------------ */
/* Intake questionnaire answers                                        */
/* ------------------------------------------------------------------ */

export const intakeAnswers = pgTable(
  "intake_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    questionKey: text("question_key").notNull(),
    value: jsonb("value").notNull(),
  },
  (t) => [
    uniqueIndex("intake_answers_client_question_uq").on(
      t.clientId,
      t.questionKey,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* Client photos (private — staff-viewable only, never public)         */
/* ------------------------------------------------------------------ */

export const clientPhotos = pgTable(
  "client_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    position: integer("position").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [index("client_photos_client_idx").on(t.clientId)],
);

/* ------------------------------------------------------------------ */
/* Internal notes timeline (also the audit trail of staff actions)     */
/* ------------------------------------------------------------------ */

export const clientNotes = pgTable(
  "client_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    staffId: text("staff_id")
      .notNull()
      .references(() => staff.id, { onUpdate: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("client_notes_client_created_idx").on(t.clientId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Match scores (pair stored canonically: clientAId < clientBId)       */
/* ------------------------------------------------------------------ */

export const matchScores = pgTable(
  "match_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientAId: uuid("client_a_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    clientBId: uuid("client_b_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    score: numeric("score", { precision: 5, scale: 2, mode: "number" }).notNull(),
    /** Full component breakdown from computePairScore (raw + weighted). */
    breakdown: jsonb("breakdown").notNull(),
    /** Cached staff-facing AI rationale (claude-generated, invalidated on recompute). */
    rationale: text("rationale"),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("match_scores_pair_uq").on(t.clientAId, t.clientBId),
    // Shortlist lookups come from either side of the pair.
    index("match_scores_a_score_idx").on(t.clientAId, t.score),
    index("match_scores_b_score_idx").on(t.clientBId, t.score),
  ],
);

/* ------------------------------------------------------------------ */
/* Introductions pipeline                                              */
/* ------------------------------------------------------------------ */

export const introductions = pgTable(
  "introductions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientAId: uuid("client_a_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    clientBId: uuid("client_b_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    initiatedByStaffId: text("initiated_by_staff_id")
      .notNull()
      .references(() => staff.id, { onUpdate: "cascade" }),
    status: introStatusEnum("status").notNull().default("suggested"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Kanban board: pipeline by status, freshest first.
    index("introductions_status_updated_idx").on(t.status, t.updatedAt),
    index("introductions_staff_idx").on(t.initiatedByStaffId),
    index("introductions_client_a_idx").on(t.clientAId),
    index("introductions_client_b_idx").on(t.clientBId),
  ],
);

/* ------------------------------------------------------------------ */
/* Intro status history (every transition logged, attributable)        */
/* ------------------------------------------------------------------ */

export const introStatusHistory = pgTable(
  "intro_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    introductionId: uuid("introduction_id")
      .notNull()
      .references(() => introductions.id, { onDelete: "cascade" }),
    fromStatus: introStatusEnum("from_status"),
    toStatus: introStatusEnum("to_status").notNull(),
    changedByStaffId: text("changed_by_staff_id")
      .notNull()
      .references(() => staff.id, { onUpdate: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("intro_status_history_intro_idx").on(t.introductionId, t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Feedback (collected by staff from each client after a date)         */
/* ------------------------------------------------------------------ */

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    introductionId: uuid("introduction_id")
      .notNull()
      .references(() => introductions.id, { onDelete: "cascade" }),
    fromClientId: uuid("from_client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    aboutClientId: uuid("about_client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1–5
    sentiment: sentimentEnum("sentiment").notNull(),
    notes: text("notes"),
    wantsSecondDate: boolean("wants_second_date").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("feedback_intro_idx").on(t.introductionId),
    index("feedback_sentiment_created_idx").on(t.sentiment, t.createdAt),
    // One feedback entry per side of an intro.
    uniqueIndex("feedback_intro_from_uq").on(t.introductionId, t.fromClientId),
  ],
);

/* ------------------------------------------------------------------ */
/* Match exclusions (never suggest this pair again)                    */
/* ------------------------------------------------------------------ */

export const matchExclusions = pgTable(
  "match_exclusions",
  {
    clientAId: uuid("client_a_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    clientBId: uuid("client_b_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clientAId, t.clientBId] })],
);

/* ------------------------------------------------------------------ */
/* Singles events (marketing — shown on the public homepage)           */
/* ------------------------------------------------------------------ */

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    /** Human location, e.g. "Pohorje, Slovenija" or "Hvar, Hrvaška". */
    location: text("location").notNull(),
    country: text("country").notNull().default("Slovenija"),
    /** Card icon shown on the homepage. */
    emoji: text("emoji"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    priceEur: numeric("price_eur", { precision: 8, scale: 2, mode: "number" }),
    capacity: integer("capacity"),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("events_published_starts_idx").on(t.published, t.startsAt)],
);

export const eventBookings = pgTable(
  "event_bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    bookedByStaffId: text("booked_by_staff_id")
      .notNull()
      .references(() => staff.id, { onUpdate: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("event_bookings_event_client_uq").on(t.eventId, t.clientId),
    index("event_bookings_client_idx").on(t.clientId),
  ],
);

export type EventRow = typeof events.$inferSelect;
export type EventBooking = typeof eventBookings.$inferSelect;

/* ------------------------------------------------------------------ */
/* Row types                                                           */
/* ------------------------------------------------------------------ */

export type Staff = typeof staff.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type ClientPreferencesRow = typeof clientPreferences.$inferSelect;
export type IntakeAnswer = typeof intakeAnswers.$inferSelect;
export type ClientPhoto = typeof clientPhotos.$inferSelect;
export type ClientNote = typeof clientNotes.$inferSelect;
export type MatchScore = typeof matchScores.$inferSelect;
export type Introduction = typeof introductions.$inferSelect;
export type IntroStatusHistoryRow = typeof introStatusHistory.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type MatchExclusion = typeof matchExclusions.$inferSelect;

export type StaffRole = (typeof staffRoleEnum.enumValues)[number];
export type ClientStatus = (typeof clientStatusEnum.enumValues)[number];
export type Gender = (typeof genderEnum.enumValues)[number];
export type IntroStatus = (typeof introStatusEnum.enumValues)[number];
export type Sentiment = (typeof sentimentEnum.enumValues)[number];
