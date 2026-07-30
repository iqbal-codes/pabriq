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
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_floor_devices" ADD CONSTRAINT "shop_floor_devices_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_shop_floor_devices_org_id" ON "shop_floor_devices" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_shop_floor_devices_code" ON "shop_floor_devices" USING btree ("org_id","code");