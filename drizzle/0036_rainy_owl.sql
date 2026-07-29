CREATE TABLE "business_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"category" text,
	"capabilities" json DEFAULT '{}'::json NOT NULL,
	"config_snapshot" json DEFAULT '{}'::json NOT NULL,
	"published_at" timestamp,
	"retired_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuration_elements" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"config_id" text NOT NULL,
	"element_type" text NOT NULL,
	"element_key" text NOT NULL,
	"provenance" text DEFAULT 'inherited' NOT NULL,
	"source_template_id" text,
	"source_template_version" integer,
	"data" json DEFAULT '{}'::json NOT NULL,
	"original_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_configurations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"source_template_id" text NOT NULL,
	"source_template_version" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"lineage" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_configurations_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"description" text,
	"entitlements" json NOT NULL,
	"monthly_price_cents" integer DEFAULT 0 NOT NULL,
	"annual_price_cents" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'trialing' NOT NULL,
	"billing_cadence" text DEFAULT 'monthly' NOT NULL,
	"trial_starts_at" timestamp,
	"trial_ends_at" timestamp,
	"current_period_starts_at" timestamp,
	"current_period_ends_at" timestamp,
	"canceled_at" timestamp,
	"suspended_at" timestamp,
	"grace_period_ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "template_upgrade_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"source_template_id" text NOT NULL,
	"source_template_version" integer NOT NULL,
	"target_template_id" text NOT NULL,
	"target_template_version" integer NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"preview" json DEFAULT '{}'::json NOT NULL,
	"conflicts" json DEFAULT '[]'::json NOT NULL,
	"additions" json DEFAULT '[]'::json NOT NULL,
	"removals" json DEFAULT '[]'::json NOT NULL,
	"semantic_changes" json DEFAULT '[]'::json NOT NULL,
	"rejected_at" timestamp,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "configuration_elements" ADD CONSTRAINT "configuration_elements_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_elements" ADD CONSTRAINT "configuration_elements_config_id_organization_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."organization_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_elements" ADD CONSTRAINT "configuration_elements_source_template_id_business_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."business_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_configurations" ADD CONSTRAINT "organization_configurations_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_configurations" ADD CONSTRAINT "organization_configurations_source_template_id_business_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."business_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_upgrade_proposals" ADD CONSTRAINT "template_upgrade_proposals_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_upgrade_proposals" ADD CONSTRAINT "template_upgrade_proposals_source_template_id_business_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."business_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_upgrade_proposals" ADD CONSTRAINT "template_upgrade_proposals_target_template_id_business_templates_id_fk" FOREIGN KEY ("target_template_id") REFERENCES "public"."business_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_business_templates_slug_version" ON "business_templates" USING btree ("slug","version");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_config_elements_org_type_key" ON "configuration_elements" USING btree ("org_id","element_type","element_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_plans_slug_version" ON "plans" USING btree ("slug","version");