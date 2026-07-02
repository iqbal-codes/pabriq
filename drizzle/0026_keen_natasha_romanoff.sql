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
ALTER TABLE "product_variants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workflow_stages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "product_variants" CASCADE;--> statement-breakpoint
DROP TABLE "workflow_stages" CASCADE;--> statement-breakpoint
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_area_id_biteship_areas_area_id_fk";
--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "order_line_items" DROP CONSTRAINT "order_line_items_variant_id_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "pricing_breakpoints" DROP CONSTRAINT "pricing_breakpoints_variant_id_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "production_tasks" DROP CONSTRAINT "production_tasks_stage_id_workflow_stages_id_fk";
--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'unpaid';--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "due_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "due_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "production_tasks" ALTER COLUMN "stage_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "production_tasks" ALTER COLUMN "status" SET DEFAULT 'queued';--> statement-breakpoint
ALTER TABLE "production_tasks" ALTER COLUMN "context" SET DEFAULT '{"productName":"","customerName":"","requirements":null}'::json;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "photo_asset_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "invoice_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "percentage" real;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "subtotal" real NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "issued_date" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_method_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "paid_by" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD COLUMN "design_name" text;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD COLUMN "asset_id" text;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD COLUMN "production_days" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD COLUMN "deadline" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD COLUMN "is_repeat_order" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD COLUMN "manual_deadline" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_token" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rejected_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "rejected_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reject_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "courier" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipped_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD COLUMN "address_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "proof_asset_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "received_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "confirmed_by" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "rejected_reason" text;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD COLUMN "board" text DEFAULT 'pre_production' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD COLUMN "task_number" text;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD COLUMN "line_item_id" text;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD COLUMN "priority" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "priority" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "primary_image_asset_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "base_price" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "production_days" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "min_quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "max_quantity" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "negotiate_above_quantity" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "repeat_order_unit_price" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "repeat_order_min_quantity" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "max_production_quantity" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pricing_mode" text DEFAULT 'interpolated' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_item_addons" ADD CONSTRAINT "order_line_item_addons_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_item_addons" ADD CONSTRAINT "order_line_item_addons_line_item_id_order_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "public"."order_line_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_item_addons" ADD CONSTRAINT "order_line_item_addons_product_addon_id_product_addons_id_fk" FOREIGN KEY ("product_addon_id") REFERENCES "public"."product_addons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_stages" ADD CONSTRAINT "production_stages_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_task_id_production_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."production_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_from_stage_id_production_stages_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "public"."production_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_to_stage_id_production_stages_id_fk" FOREIGN KEY ("to_stage_id") REFERENCES "public"."production_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_photo_asset_id_assets_id_fk" FOREIGN KEY ("photo_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_proof_asset_id_assets_id_fk" FOREIGN KEY ("proof_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_stage_id_production_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."production_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_primary_image_asset_id_assets_id_fk" FOREIGN KEY ("primary_image_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invoices_org_number" ON "invoices" USING btree ("org_id","invoice_number");--> statement-breakpoint
CREATE INDEX "idx_payments_org_id" ON "payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_payments_invoice_id" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
ALTER TABLE "order_line_items" DROP COLUMN "variant_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "quote_number";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "logo";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "payment_date";--> statement-breakpoint
ALTER TABLE "pricing_breakpoints" DROP COLUMN "variant_id";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_token_unique" UNIQUE("order_token");