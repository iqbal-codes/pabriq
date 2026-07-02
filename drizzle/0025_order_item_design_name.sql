ALTER TABLE "order_line_items" RENAME COLUMN "name" TO "design_name";

UPDATE "production_tasks" AS pt
SET "context" = (
  COALESCE(pt."context", '{}'::json)::jsonb ||
  jsonb_build_object(
    'productName', p."name",
    'designName', NULLIF(NULLIF(BTRIM(oli."design_name"), ''), p."name")
  )
)::json
FROM "order_line_items" AS oli
JOIN "products" AS p
  ON p."id" = oli."product_id"
 AND p."org_id" = oli."org_id"
WHERE pt."line_item_id" = oli."id";
