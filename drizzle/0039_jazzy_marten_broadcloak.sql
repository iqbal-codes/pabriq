CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"organization_id" text,
	"organization_name" text,
	"action" text NOT NULL,
	"reason" text,
	"details" json DEFAULT '{}'::json,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"granted_by" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admin_users_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admin_users" ADD CONSTRAINT "platform_admin_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_events_actor" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_organization" ON "audit_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_action" ON "audit_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_events_created" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_platform_admin_user" ON "platform_admin_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_platform_admin_active" ON "platform_admin_users" USING btree ("user_id","revoked_at");