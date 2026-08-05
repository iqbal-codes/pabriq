ALTER TABLE "products" ADD COLUMN "product_template_id" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "itemization_mode" text DEFAULT 'uniform' NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "configuration" json;
--> statement-breakpoint
UPDATE "products"
SET "product_template_id" = NULL,
    "itemization_mode" = 'uniform',
    "configuration" = NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_product_template_id_product_templates_id_fk" FOREIGN KEY ("product_template_id") REFERENCES "public"."product_templates"("id") ON DELETE set null ON UPDATE no action;