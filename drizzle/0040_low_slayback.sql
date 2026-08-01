ALTER TABLE "plans" ADD COLUMN "parent_plan_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "plan_snapshot" json DEFAULT 'null'::json;