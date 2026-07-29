-- Product Fields (configurable typed fields per product)
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
ALTER TABLE "product_fields" ADD CONSTRAINT "product_fields_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_fields" ADD CONSTRAINT "product_fields_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_fields_product_key" ON "product_fields" USING btree ("product_id","field_key");
--> statement-breakpoint
CREATE INDEX "idx_product_fields_org_product" ON "product_fields" USING btree ("org_id","product_id");
--> statement-breakpoint

-- Product Constraints (declarative validation rules)
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
ALTER TABLE "product_constraints" ADD CONSTRAINT "product_constraints_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_constraints" ADD CONSTRAINT "product_constraints_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_product_constraints_org_product" ON "product_constraints" USING btree ("org_id","product_id");
--> statement-breakpoint

-- Specifications (customer/staff submissions)
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
ALTER TABLE "specifications" ADD CONSTRAINT "specifications_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "specifications" ADD CONSTRAINT "specifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "specifications" ADD CONSTRAINT "specifications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_specifications_org_product" ON "specifications" USING btree ("org_id","product_id");
--> statement-breakpoint
CREATE INDEX "idx_specifications_org_status" ON "specifications" USING btree ("org_id","status");
--> statement-breakpoint
CREATE INDEX "idx_specifications_order" ON "specifications" USING btree ("order_id");
--> statement-breakpoint

-- Specification Snapshots (immutable committed state)
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
ALTER TABLE "specification_snapshots" ADD CONSTRAINT "specification_snapshots_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "specification_snapshots" ADD CONSTRAINT "specification_snapshots_specification_id_specifications_id_fk" FOREIGN KEY ("specification_id") REFERENCES "public"."specifications"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- Pricing Basis (approved pricing foundation per product)
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
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pricing_basis" ADD CONSTRAINT "pricing_basis_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pricing_basis" ADD CONSTRAINT "pricing_basis_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pricing_basis_product" ON "pricing_basis" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX "idx_pricing_basis_org_product" ON "pricing_basis" USING btree ("org_id","product_id");
--> statement-breakpoint

-- Pricing Rules (quantity breaks and effects)
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
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_pricing_rules_org_product" ON "pricing_rules" USING btree ("org_id","product_id");
--> statement-breakpoint
CREATE INDEX "idx_pricing_rules_product_type" ON "pricing_rules" USING btree ("product_id","effect_type");
--> statement-breakpoint

-- Pricing Extensions (versioned, deterministic add-ons)
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
ALTER TABLE "pricing_extensions" ADD CONSTRAINT "pricing_extensions_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pricing_extensions" ADD CONSTRAINT "pricing_extensions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_pricing_extensions_org_product" ON "pricing_extensions" USING btree ("org_id","product_id");
--> statement-breakpoint

-- Price Overrides (audited manual adjustments)
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
ALTER TABLE "price_overrides" ADD CONSTRAINT "price_overrides_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "price_overrides" ADD CONSTRAINT "price_overrides_specification_id_specifications_id_fk" FOREIGN KEY ("specification_id") REFERENCES "public"."specifications"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- Specification Prices (committed price breakdown)
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
ALTER TABLE "specification_prices" ADD CONSTRAINT "specification_prices_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "specification_prices" ADD CONSTRAINT "specification_prices_specification_id_specifications_id_fk" FOREIGN KEY ("specification_id") REFERENCES "public"."specifications"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "specification_prices" ADD CONSTRAINT "specification_prices_override_id_price_overrides_id_fk" FOREIGN KEY ("override_id") REFERENCES "public"."price_overrides"("id") ON DELETE set null ON UPDATE no action;
