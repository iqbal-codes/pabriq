ALTER TABLE "invoices" ADD COLUMN "late_fee" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deadline" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "manual_deadline" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD COLUMN "late_fee_per_day" integer DEFAULT 0 NOT NULL;