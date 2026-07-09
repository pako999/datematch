ALTER TABLE "client_notes" DROP CONSTRAINT "client_notes_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "clients" DROP CONSTRAINT "clients_assigned_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "clients" DROP CONSTRAINT "clients_updated_by_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "intro_status_history" DROP CONSTRAINT "intro_status_history_changed_by_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "introductions" DROP CONSTRAINT "introductions_initiated_by_staff_id_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "embedding" SET DATA TYPE vector(1024);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "intake_summary" text;--> statement-breakpoint
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_staff_id_staff_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_updated_by_staff_id_staff_id_fk" FOREIGN KEY ("updated_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "intro_status_history" ADD CONSTRAINT "intro_status_history_changed_by_staff_id_staff_id_fk" FOREIGN KEY ("changed_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "introductions" ADD CONSTRAINT "introductions_initiated_by_staff_id_staff_id_fk" FOREIGN KEY ("initiated_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE cascade;