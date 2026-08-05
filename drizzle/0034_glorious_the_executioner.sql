DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "products" p
    JOIN "product_templates" t ON t."id" = p."product_template_id"
    WHERE p."product_template_id" IS NOT NULL
      AND p."org_id" <> t."org_id"
  ) THEN
    RAISE EXCEPTION 'Cross-organization product template references must be repaired before migration';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_product_template_id_product_templates_id_fk";
--> statement-breakpoint
DROP INDEX "idx_product_templates_org_business_template";
--> statement-breakpoint
ALTER TABLE "product_templates" ADD COLUMN "business_template_item_key" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_templates_org_business_template_item" ON "product_templates" USING btree ("org_id","business_template_id","business_template_item_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_templates_id_org_id" ON "product_templates" USING btree ("id","org_id");
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_product_template_org_id_fk" FOREIGN KEY ("product_template_id","org_id") REFERENCES "public"."product_templates"("id","org_id") ON DELETE restrict ON UPDATE no action;