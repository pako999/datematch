CREATE TABLE "event_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"booked_by_staff_id" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"location" text NOT NULL,
	"country" text DEFAULT 'Slovenija' NOT NULL,
	"emoji" text,
	"starts_at" timestamp with time zone NOT NULL,
	"price_eur" numeric(8, 2),
	"capacity" integer,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_booked_by_staff_id_staff_id_fk" FOREIGN KEY ("booked_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "event_bookings_event_client_uq" ON "event_bookings" USING btree ("event_id","client_id");--> statement-breakpoint
CREATE INDEX "event_bookings_client_idx" ON "event_bookings" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "events_published_starts_idx" ON "events" USING btree ("published","starts_at");