CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"details" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"area_id" text,
	"area_name" text,
	"street_address" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"variant_key" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" text,
	"draft_id" text,
	"usage" text NOT NULL,
	"asset_kind" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by_user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"checksum_sha256" text,
	"image_width" integer,
	"image_height" integer,
	"video_duration_seconds" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "billing_events" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"event_type" text NOT NULL,
	"previous_status" text,
	"new_status" text,
	"previous_plan_id" text,
	"new_plan_id" text,
	"metadata" json DEFAULT '{}'::json,
	"actor_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biteship_areas" (
	"area_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subdistrict" text NOT NULL,
	"district" text NOT NULL,
	"city" text NOT NULL,
	"province" text NOT NULL,
	"postal_code" text NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "customer_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"order_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"scope" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"business_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"address_id" text,
	"is_wni" boolean DEFAULT true NOT NULL,
	"photo_asset_id" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fulfillments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"order_id" text NOT NULL,
	"type" text DEFAULT 'shipping' NOT NULL,
	"status" text DEFAULT 'unfulfilled' NOT NULL,
	"shipping_address" json,
	"courier" text,
	"service" text,
	"tracking_number" text,
	"package_details" json,
	"snapshot" json,
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"picked_up_at" timestamp,
	"pickup_notes" text,
	"recipient_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" real NOT NULL,
	"line_type" text DEFAULT 'product' NOT NULL,
	"tax_percent" real DEFAULT 0 NOT NULL,
	"total" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"order_id" text,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"percentage" real,
	"subtotal" real NOT NULL,
	"total" real NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"due_date" date NOT NULL,
	"payment_provider" text DEFAULT 'bank_transfer' NOT NULL,
	"issued_date" date DEFAULT now() NOT NULL,
	"payment_method_id" text,
	"paid_at" timestamp,
	"paid_by" text,
	"late_fee" real DEFAULT 0 NOT NULL,
	"notes" text,
	"midtrans_order_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp NOT NULL
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
CREATE TABLE "midtrans_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"order_id" text NOT NULL,
	"expected_amount" real NOT NULL,
	"gross_amount" real,
	"transaction_id" text,
	"transaction_status" text DEFAULT 'created' NOT NULL,
	"error_message" text,
	"failed_at" timestamp,
	"fraud_status" text,
	"payment_type" text,
	"settlement_time" timestamp,
	"refunded_amount" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "midtrans_transactions_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "order_line_item_addons" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"line_item_id" text NOT NULL,
	"product_addon_id" text,
	"name" text NOT NULL,
	"unit_surcharge" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text DEFAULT '' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" real NOT NULL,
	"total" real NOT NULL,
	"design_name" text,
	"notes" text,
	"asset_id" text,
	"production_days" integer DEFAULT 1 NOT NULL,
	"deadline" timestamp DEFAULT now() NOT NULL,
	"is_repeat_order" boolean DEFAULT false NOT NULL,
	"manual_deadline" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"customer_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"total" real DEFAULT 0 NOT NULL,
	"order_number" text,
	"order_token" text,
	"valid_until" timestamp,
	"shipping_address" json,
	"approved_at" timestamp,
	"approved_by" text,
	"rejected_at" timestamp,
	"rejected_by" text,
	"reject_reason" text,
	"courier" text,
	"tracking_number" text,
	"shipped_at" timestamp,
	"deadline" timestamp,
	"manual_deadline" boolean DEFAULT false NOT NULL,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_token_unique" UNIQUE("order_token")
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"metadata" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
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
CREATE TABLE "organization_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"display_name" text,
	"phone" text,
	"email" text,
	"logo_asset_id" text,
	"address_id" text,
	"late_fee_per_day" integer DEFAULT 0 NOT NULL,
	"midtrans_server_key" text,
	"midtrans_client_key" text,
	"midtrans_is_production" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_profiles_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'bank_transfer' NOT NULL,
	"bank_name" text,
	"account_number" text,
	"account_holder" text,
	"instructions" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"amount" real NOT NULL,
	"method" text DEFAULT 'bank_transfer' NOT NULL,
	"reference" text,
	"proof_asset_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"received_at" timestamp,
	"confirmed_at" timestamp,
	"confirmed_by" text,
	"rejected_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_plan_id" text,
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
CREATE TABLE "price_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"specification_id" text NOT NULL,
	"original_price" real NOT NULL,
	"override_price" real NOT NULL,
	"reason" text NOT NULL,
	"override_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_basis" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"product_id" text NOT NULL,
	"basis_type" text DEFAULT 'flat' NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"precision" integer DEFAULT 0 NOT NULL,
	"rounding_mode" text DEFAULT 'half_up' NOT NULL,
	"minimum_price" real,
	"approved" boolean DEFAULT false NOT NULL,
	"approved_at" timestamp,
	"approved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_basis_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "pricing_breakpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"product_id" text NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_extensions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"config" json DEFAULT '{}'::json NOT NULL,
	"effect_type" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"product_id" text NOT NULL,
	"effect_type" text NOT NULL,
	"name" text NOT NULL,
	"min_quantity" integer,
	"max_quantity" integer,
	"amount" real,
	"percentage" real,
	"field_key" text,
	"option_value" text,
	"condition" json,
	"is_setup" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_addons" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"unit_surcharge" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_constraints" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"product_id" text NOT NULL,
	"constraint_type" text NOT NULL,
	"name" text NOT NULL,
	"rule" json DEFAULT '{}'::json NOT NULL,
	"error_message" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"product_id" text NOT NULL,
	"field_type" text NOT NULL,
	"field_key" text NOT NULL,
	"label" text NOT NULL,
	"unit" text,
	"required" boolean DEFAULT false NOT NULL,
	"options" json DEFAULT '[]'::json,
	"validation_rules" json DEFAULT '{}'::json,
	"matrix" json,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"board" text DEFAULT 'pre_production' NOT NULL,
	"description" text,
	"need_approval" boolean DEFAULT false NOT NULL,
	"requirements" json DEFAULT '[]'::json NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"order_id" text NOT NULL,
	"board" text DEFAULT 'pre_production' NOT NULL,
	"stage_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"task_number" text,
	"line_item_id" text,
	"priority" boolean DEFAULT false NOT NULL,
	"context" json DEFAULT '{"productName":"","customerName":"","requirements":null}'::json,
	"assigned_to" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"priority" boolean DEFAULT false NOT NULL,
	"production_notes" text,
	"primary_image_asset_id" text,
	"base_price" integer DEFAULT 0 NOT NULL,
	"production_days" integer DEFAULT 1 NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"max_quantity" integer,
	"negotiate_above_quantity" integer,
	"repeat_order_unit_price" integer,
	"repeat_order_min_quantity" integer,
	"max_production_quantity" integer,
	"pricing_mode" text DEFAULT 'interpolated' NOT NULL,
	"category" text,
	"deleted_at" timestamp,
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
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shop_floor_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"secret_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"allowed_stage_ids" json DEFAULT '[]'::json,
	"last_active_at" timestamp,
	"registered_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "specification_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"specification_id" text NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"unit_price" real NOT NULL,
	"total_price" real NOT NULL,
	"quantity" integer NOT NULL,
	"breakdown" json DEFAULT '[]'::json NOT NULL,
	"is_overridden" boolean DEFAULT false NOT NULL,
	"override_id" text,
	"extension_statuses" json DEFAULT '[]'::json NOT NULL,
	"committed_at" timestamp,
	"committed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specification_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"specification_id" text NOT NULL,
	"product_snapshot" json NOT NULL,
	"field_values_snapshot" json NOT NULL,
	"price_snapshot" json NOT NULL,
	"quantity" integer NOT NULL,
	"committed_by" text NOT NULL,
	"committed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specifications" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"product_id" text NOT NULL,
	"order_id" text,
	"submitted_by" text NOT NULL,
	"submitted_by_role" text DEFAULT 'customer' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"field_values" json DEFAULT '{}'::json NOT NULL,
	"resolved_display" json DEFAULT '{}'::json,
	"quantity" integer DEFAULT 1 NOT NULL,
	"validation_errors" json DEFAULT '[]'::json,
	"pricing_status" text DEFAULT 'pending',
	"pricing_review_reason" text,
	"rejection_reason" text,
	"committed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'trialing' NOT NULL,
	"billing_cadence" text DEFAULT 'monthly' NOT NULL,
	"plan_snapshot" json DEFAULT 'null'::json,
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
CREATE TABLE "task_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"task_id" text NOT NULL,
	"type" text NOT NULL,
	"from_stage_id" text,
	"to_stage_id" text,
	"data" json DEFAULT '{}'::json,
	"actor_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_variants" ADD CONSTRAINT "asset_variants_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_actions" ADD CONSTRAINT "assistant_actions_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_accesses" ADD CONSTRAINT "channel_accesses_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_accesses" ADD CONSTRAINT "channel_accesses_connected_channel_id_connected_channels_id_fk" FOREIGN KEY ("connected_channel_id") REFERENCES "public"."connected_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_accesses" ADD CONSTRAINT "channel_accesses_messaging_identity_id_messaging_identities_id_fk" FOREIGN KEY ("messaging_identity_id") REFERENCES "public"."messaging_identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_migrations" ADD CONSTRAINT "compatibility_migrations_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compatibility_migrations" ADD CONSTRAINT "compatibility_migrations_source_template_id_business_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."business_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_elements" ADD CONSTRAINT "configuration_elements_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_elements" ADD CONSTRAINT "configuration_elements_config_id_organization_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."organization_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_elements" ADD CONSTRAINT "configuration_elements_source_template_id_business_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."business_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_channels" ADD CONSTRAINT "connected_channels_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tokens" ADD CONSTRAINT "customer_tokens_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tokens" ADD CONSTRAINT "customer_tokens_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_photo_asset_id_assets_id_fk" FOREIGN KEY ("photo_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "midtrans_transactions" ADD CONSTRAINT "midtrans_transactions_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "midtrans_transactions" ADD CONSTRAINT "midtrans_transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_item_addons" ADD CONSTRAINT "order_line_item_addons_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_item_addons" ADD CONSTRAINT "order_line_item_addons_line_item_id_order_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "public"."order_line_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_item_addons" ADD CONSTRAINT "order_line_item_addons_product_addon_id_product_addons_id_fk" FOREIGN KEY ("product_addon_id") REFERENCES "public"."product_addons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_configurations" ADD CONSTRAINT "organization_configurations_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_configurations" ADD CONSTRAINT "organization_configurations_source_template_id_business_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."business_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_exports" ADD CONSTRAINT "organization_exports_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_logo_asset_id_assets_id_fk" FOREIGN KEY ("logo_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_proof_asset_id_assets_id_fk" FOREIGN KEY ("proof_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admin_users" ADD CONSTRAINT "platform_admin_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_overrides" ADD CONSTRAINT "price_overrides_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_overrides" ADD CONSTRAINT "price_overrides_specification_id_specifications_id_fk" FOREIGN KEY ("specification_id") REFERENCES "public"."specifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_basis" ADD CONSTRAINT "pricing_basis_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_basis" ADD CONSTRAINT "pricing_basis_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_breakpoints" ADD CONSTRAINT "pricing_breakpoints_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_breakpoints" ADD CONSTRAINT "pricing_breakpoints_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_extensions" ADD CONSTRAINT "pricing_extensions_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_extensions" ADD CONSTRAINT "pricing_extensions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_constraints" ADD CONSTRAINT "product_constraints_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_constraints" ADD CONSTRAINT "product_constraints_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_fields" ADD CONSTRAINT "product_fields_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_fields" ADD CONSTRAINT "product_fields_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_stages" ADD CONSTRAINT "production_stages_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_stage_id_production_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."production_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_primary_image_asset_id_assets_id_fk" FOREIGN KEY ("primary_image_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_floor_devices" ADD CONSTRAINT "shop_floor_devices_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specification_prices" ADD CONSTRAINT "specification_prices_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specification_prices" ADD CONSTRAINT "specification_prices_specification_id_specifications_id_fk" FOREIGN KEY ("specification_id") REFERENCES "public"."specifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specification_prices" ADD CONSTRAINT "specification_prices_override_id_price_overrides_id_fk" FOREIGN KEY ("override_id") REFERENCES "public"."price_overrides"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specification_snapshots" ADD CONSTRAINT "specification_snapshots_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specification_snapshots" ADD CONSTRAINT "specification_snapshots_specification_id_specifications_id_fk" FOREIGN KEY ("specification_id") REFERENCES "public"."specifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specifications" ADD CONSTRAINT "specifications_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specifications" ADD CONSTRAINT "specifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specifications" ADD CONSTRAINT "specifications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_task_id_production_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."production_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_from_stage_id_production_stages_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "public"."production_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_to_stage_id_production_stages_id_fk" FOREIGN KEY ("to_stage_id") REFERENCES "public"."production_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_processed_updates" ADD CONSTRAINT "telegram_processed_updates_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_processed_updates" ADD CONSTRAINT "telegram_processed_updates_connected_channel_id_connected_channels_id_fk" FOREIGN KEY ("connected_channel_id") REFERENCES "public"."connected_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_upgrade_proposals" ADD CONSTRAINT "template_upgrade_proposals_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_upgrade_proposals" ADD CONSTRAINT "template_upgrade_proposals_source_template_id_business_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."business_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_upgrade_proposals" ADD CONSTRAINT "template_upgrade_proposals_target_template_id_business_templates_id_fk" FOREIGN KEY ("target_template_id") REFERENCES "public"."business_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assistant_actions_org_user_thread" ON "assistant_actions" USING btree ("org_id","user_id","thread_id");--> statement-breakpoint
CREATE INDEX "idx_assistant_actions_status" ON "assistant_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_assistant_actions_expires" ON "assistant_actions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_audit_events_actor" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_organization" ON "audit_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_action" ON "audit_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_events_created" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_billing_events_org" ON "billing_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_billing_events_subscription" ON "billing_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_billing_events_event_type" ON "billing_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_billing_events_created" ON "billing_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_business_templates_slug_version" ON "business_templates" USING btree ("slug","version");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_channel_accesses_channel_identity" ON "channel_accesses" USING btree ("connected_channel_id","messaging_identity_id");--> statement-breakpoint
CREATE INDEX "idx_channel_accesses_org_status" ON "channel_accesses" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_compatibility_migrations_status" ON "compatibility_migrations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_config_elements_org_type_key" ON "configuration_elements" USING btree ("org_id","element_type","element_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_connected_channels_org_type" ON "connected_channels" USING btree ("org_id","channel_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_connected_channels_webhook_secret" ON "connected_channels" USING btree ("webhook_secret");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_connected_channels_type_bot" ON "connected_channels" USING btree ("channel_type","telegram_bot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invoices_org_number" ON "invoices" USING btree ("org_id","invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_messaging_identities_provider" ON "messaging_identities" USING btree ("channel_type","provider_user_id");--> statement-breakpoint
CREATE INDEX "idx_midtrans_transactions_org_id" ON "midtrans_transactions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_midtrans_transactions_invoice_id" ON "midtrans_transactions" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_midtrans_transactions_status" ON "midtrans_transactions" USING btree ("transaction_status");--> statement-breakpoint
CREATE INDEX "idx_organization_exports_org" ON "organization_exports" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_payments_org_id" ON "payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_payments_invoice_id" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payments_midtrans_reference" ON "payments" USING btree ("org_id","invoice_id","reference") WHERE "payments"."method" = 'midtrans';--> statement-breakpoint
CREATE UNIQUE INDEX "idx_plans_slug_version" ON "plans" USING btree ("slug","version");--> statement-breakpoint
CREATE INDEX "idx_platform_admin_user" ON "platform_admin_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_platform_admin_active" ON "platform_admin_users" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "idx_pricing_basis_org_product" ON "pricing_basis" USING btree ("org_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_pricing_extensions_org_product" ON "pricing_extensions" USING btree ("org_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_pricing_rules_org_product" ON "pricing_rules" USING btree ("org_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_pricing_rules_product_type" ON "pricing_rules" USING btree ("product_id","effect_type");--> statement-breakpoint
CREATE INDEX "idx_product_constraints_org_product" ON "product_constraints" USING btree ("org_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_fields_product_key" ON "product_fields" USING btree ("product_id","field_key");--> statement-breakpoint
CREATE INDEX "idx_product_fields_org_product" ON "product_fields" USING btree ("org_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_retention_policies_target" ON "retention_policies" USING btree ("target_table");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_retention_policies_org_table" ON "retention_policies" USING btree ("org_id","target_table") WHERE "retention_policies"."org_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_shop_floor_devices_org_id" ON "shop_floor_devices" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_shop_floor_devices_code" ON "shop_floor_devices" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "idx_specifications_org_product" ON "specifications" USING btree ("org_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_specifications_org_status" ON "specifications" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_specifications_order" ON "specifications" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_telegram_updates_channel_update" ON "telegram_processed_updates" USING btree ("connected_channel_id","update_id");--> statement-breakpoint
CREATE INDEX "idx_telegram_updates_org" ON "telegram_processed_updates" USING btree ("org_id");