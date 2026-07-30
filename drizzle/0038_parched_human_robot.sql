CREATE TABLE "compatibility_migrations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"source_template_id" text NOT NULL,
	"source_template_version" integer NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"report" json DEFAULT '{}'::json NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "compatibility_migrations_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
ALTER TABLE "compatibility_migrations" ADD CONSTRAINT "compatibility_migrations_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_migrations" ADD CONSTRAINT "compatibility_migrations_source_template_id_business_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."business_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_compatibility_migrations_status" ON "compatibility_migrations" USING btree ("status");