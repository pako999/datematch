CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('lead', 'active', 'paused', 'matched', 'churned');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('woman', 'man', 'nonbinary', 'other');--> statement-breakpoint
CREATE TYPE "public"."intro_status" AS ENUM('suggested', 'proposed', 'accepted_a', 'accepted_b', 'both_accepted', 'date_scheduled', 'met', 'success', 'declined', 'no_match');--> statement-breakpoint
CREATE TYPE "public"."membership_tier" AS ENUM('standard', 'premium', 'elite');--> statement-breakpoint
CREATE TYPE "public"."sentiment" AS ENUM('positive', 'neutral', 'negative');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('admin', 'matchmaker', 'readonly');--> statement-breakpoint
CREATE TABLE "client_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"staff_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_preferences" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"interested_in_genders" "gender"[] NOT NULL,
	"min_age" integer DEFAULT 18 NOT NULL,
	"max_age" integer DEFAULT 99 NOT NULL,
	"max_distance_km" integer,
	"dealbreakers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"must_haves" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"birthdate" date NOT NULL,
	"gender" "gender" NOT NULL,
	"city" text NOT NULL,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"status" "client_status" DEFAULT 'lead' NOT NULL,
	"membership_tier" "membership_tier" DEFAULT 'standard' NOT NULL,
	"assigned_staff_id" text,
	"bio" text DEFAULT '' NOT NULL,
	"embedding" vector(1536),
	"consent_to_introduce" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_staff_id" text
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_id" uuid NOT NULL,
	"from_client_id" uuid NOT NULL,
	"about_client_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"sentiment" "sentiment" NOT NULL,
	"notes" text,
	"wants_second_date" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"question_key" text NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intro_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduction_id" uuid NOT NULL,
	"from_status" "intro_status",
	"to_status" "intro_status" NOT NULL,
	"changed_by_staff_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "introductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_a_id" uuid NOT NULL,
	"client_b_id" uuid NOT NULL,
	"initiated_by_staff_id" text NOT NULL,
	"status" "intro_status" DEFAULT 'suggested' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_exclusions" (
	"client_a_id" uuid NOT NULL,
	"client_b_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_exclusions_client_a_id_client_b_id_pk" PRIMARY KEY("client_a_id","client_b_id")
);
--> statement-breakpoint
CREATE TABLE "match_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_a_id" uuid NOT NULL,
	"client_b_id" uuid NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"breakdown" jsonb NOT NULL,
	"rationale" text,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "staff_role" DEFAULT 'matchmaker' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_photos" ADD CONSTRAINT "client_photos_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_preferences" ADD CONSTRAINT "client_preferences_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_staff_id_staff_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_updated_by_staff_id_staff_id_fk" FOREIGN KEY ("updated_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_introduction_id_introductions_id_fk" FOREIGN KEY ("introduction_id") REFERENCES "public"."introductions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_from_client_id_clients_id_fk" FOREIGN KEY ("from_client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_about_client_id_clients_id_fk" FOREIGN KEY ("about_client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_answers" ADD CONSTRAINT "intake_answers_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intro_status_history" ADD CONSTRAINT "intro_status_history_introduction_id_introductions_id_fk" FOREIGN KEY ("introduction_id") REFERENCES "public"."introductions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intro_status_history" ADD CONSTRAINT "intro_status_history_changed_by_staff_id_staff_id_fk" FOREIGN KEY ("changed_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_client_a_id_clients_id_fk" FOREIGN KEY ("client_a_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_client_b_id_clients_id_fk" FOREIGN KEY ("client_b_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_initiated_by_staff_id_staff_id_fk" FOREIGN KEY ("initiated_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_exclusions" ADD CONSTRAINT "match_exclusions_client_a_id_clients_id_fk" FOREIGN KEY ("client_a_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_exclusions" ADD CONSTRAINT "match_exclusions_client_b_id_clients_id_fk" FOREIGN KEY ("client_b_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_client_a_id_clients_id_fk" FOREIGN KEY ("client_a_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_scores" ADD CONSTRAINT "match_scores_client_b_id_clients_id_fk" FOREIGN KEY ("client_b_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_notes_client_created_idx" ON "client_notes" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE INDEX "client_photos_client_idx" ON "client_photos" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "clients_candidate_pool_idx" ON "clients" USING btree ("status","consent_to_introduce","gender","birthdate");--> statement-breakpoint
CREATE INDEX "clients_city_idx" ON "clients" USING btree ("city");--> statement-breakpoint
CREATE INDEX "clients_assigned_staff_idx" ON "clients" USING btree ("assigned_staff_id");--> statement-breakpoint
CREATE INDEX "clients_embedding_hnsw_idx" ON "clients" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "feedback_intro_idx" ON "feedback" USING btree ("introduction_id");--> statement-breakpoint
CREATE INDEX "feedback_sentiment_created_idx" ON "feedback" USING btree ("sentiment","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_intro_from_uq" ON "feedback" USING btree ("introduction_id","from_client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intake_answers_client_question_uq" ON "intake_answers" USING btree ("client_id","question_key");--> statement-breakpoint
CREATE INDEX "intro_status_history_intro_idx" ON "intro_status_history" USING btree ("introduction_id","created_at");--> statement-breakpoint
CREATE INDEX "introductions_status_updated_idx" ON "introductions" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "introductions_staff_idx" ON "introductions" USING btree ("initiated_by_staff_id");--> statement-breakpoint
CREATE INDEX "introductions_client_a_idx" ON "introductions" USING btree ("client_a_id");--> statement-breakpoint
CREATE INDEX "introductions_client_b_idx" ON "introductions" USING btree ("client_b_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_scores_pair_uq" ON "match_scores" USING btree ("client_a_id","client_b_id");--> statement-breakpoint
CREATE INDEX "match_scores_a_score_idx" ON "match_scores" USING btree ("client_a_id","score");--> statement-breakpoint
CREATE INDEX "match_scores_b_score_idx" ON "match_scores" USING btree ("client_b_id","score");