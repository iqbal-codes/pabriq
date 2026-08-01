CREATE TYPE "public"."billing_event_type" AS ENUM('plan_changed', 'status_transitioned', 'trial_started', 'trial_ended', 'billing_period_renewed', 'payment_received', 'payment_failed', 'downgrade_attempted', 'subscription_canceled', 'subscription_reinstated');--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"event_type" "billing_event_type" NOT NULL,
	"previous_status" text,
	"new_status" text,
	"previous_plan_id" text,
	"new_plan_id" text,
	"metadata" json DEFAULT '{}'::json,
	"actor_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_exports" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"format" text DEFAULT 'json' NOT NULL,
	"r2_key" text,
	"file_size_bytes" integer,
	"included_data" json DEFAULT '[]'::json NOT NULL,
	"requested_by" text NOT NULL,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text,
	"target_table" text NOT NULL,
	"retention_days" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_exports" ADD CONSTRAINT "organization_exports_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_billing_events_org" ON "billing_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_billing_events_subscription" ON "billing_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_billing_events_event_type" ON "billing_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_billing_events_created" ON "billing_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_organization_exports_org" ON "organization_exports" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_retention_policies_target" ON "retention_policies" USING btree ("target_table");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_retention_policies_org_table" ON "retention_policies" USING btree ("org_id","target_table") WHERE "org_id" IS NOT NULL;