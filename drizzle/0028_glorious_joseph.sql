CREATE TABLE "assistant_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" json NOT NULL,
	"result_order_id" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assistant_actions" ADD CONSTRAINT "assistant_actions_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assistant_actions_org_user_thread" ON "assistant_actions" USING btree ("org_id","user_id","thread_id");--> statement-breakpoint
CREATE INDEX "idx_assistant_actions_status" ON "assistant_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_assistant_actions_expires" ON "assistant_actions" USING btree ("expires_at");