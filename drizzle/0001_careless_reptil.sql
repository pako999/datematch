ALTER TABLE "clients" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_clerk_user_id_unique" UNIQUE("clerk_user_id");