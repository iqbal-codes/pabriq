ALTER TABLE "products" ADD COLUMN "priority" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "production_tasks" ADD COLUMN "priority" boolean DEFAULT false NOT NULL;
