CREATE SCHEMA IF NOT EXISTS "mastra";
--> statement-breakpoint
DO $$
DECLARE
	mastra_table record;
BEGIN
	FOR mastra_table IN
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public'
			AND table_name LIKE 'mastra\_%' ESCAPE '\'
		ORDER BY table_name
	LOOP
		IF NOT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = 'mastra'
				AND table_name = mastra_table.table_name
		) THEN
			EXECUTE format(
				'ALTER TABLE %I.%I SET SCHEMA %I',
				'public',
				mastra_table.table_name,
				'mastra'
			);
		END IF;
	END LOOP;
END
$$;
--> statement-breakpoint
CREATE TABLE "channel_accesses" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"connected_channel_id" text NOT NULL,
	"messaging_identity_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"revoked_at" timestamp,
	"started_connection_version" integer,
	"started_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connected_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"channel_type" text DEFAULT 'telegram' NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"telegram_bot_id" text NOT NULL,
	"telegram_bot_username" text,
	"telegram_bot_name" text NOT NULL,
	"bot_token" text NOT NULL,
	"webhook_secret" text NOT NULL,
	"connection_version" integer DEFAULT 1 NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"disconnected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_type" text DEFAULT 'telegram' NOT NULL,
	"provider_user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"username" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_processed_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"connected_channel_id" text NOT NULL,
	"update_id" text NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_accesses" ADD CONSTRAINT "channel_accesses_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_accesses" ADD CONSTRAINT "channel_accesses_connected_channel_id_connected_channels_id_fk" FOREIGN KEY ("connected_channel_id") REFERENCES "public"."connected_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_accesses" ADD CONSTRAINT "channel_accesses_messaging_identity_id_messaging_identities_id_fk" FOREIGN KEY ("messaging_identity_id") REFERENCES "public"."messaging_identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_channels" ADD CONSTRAINT "connected_channels_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_processed_updates" ADD CONSTRAINT "telegram_processed_updates_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_processed_updates" ADD CONSTRAINT "telegram_processed_updates_connected_channel_id_connected_channels_id_fk" FOREIGN KEY ("connected_channel_id") REFERENCES "public"."connected_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_channel_accesses_channel_identity" ON "channel_accesses" USING btree ("connected_channel_id","messaging_identity_id");--> statement-breakpoint
CREATE INDEX "idx_channel_accesses_org_status" ON "channel_accesses" USING btree ("org_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_connected_channels_org_type" ON "connected_channels" USING btree ("org_id","channel_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_connected_channels_webhook_secret" ON "connected_channels" USING btree ("webhook_secret");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_connected_channels_type_bot" ON "connected_channels" USING btree ("channel_type","telegram_bot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_messaging_identities_provider" ON "messaging_identities" USING btree ("channel_type","provider_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_telegram_updates_channel_update" ON "telegram_processed_updates" USING btree ("connected_channel_id","update_id");--> statement-breakpoint
CREATE INDEX "idx_telegram_updates_org" ON "telegram_processed_updates" USING btree ("org_id");