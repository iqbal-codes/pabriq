ALTER TABLE "orders" ADD COLUMN "order_token" TEXT UNIQUE;
ALTER TABLE "order_line_items" ADD COLUMN "name" TEXT;
ALTER TABLE "order_line_items" ADD COLUMN "asset_id" TEXT REFERENCES "assets"("id") ON DELETE SET NULL;
