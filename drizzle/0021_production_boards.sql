-- Add board to production_stages (pre_production | production)
ALTER TABLE "production_stages"
ADD COLUMN "board" text NOT NULL DEFAULT 'pre_production';

-- Add board to production_tasks (pre_production | production)
ALTER TABLE "production_tasks"
ADD COLUMN "board" text NOT NULL DEFAULT 'pre_production';

-- Add delivery fields to orders
ALTER TABLE "orders"
ADD COLUMN "courier" text;

ALTER TABLE "orders"
ADD COLUMN "tracking_number" text;

ALTER TABLE "orders"
ADD COLUMN "shipped_at" timestamp;

ALTER TABLE "orders"
ADD COLUMN "delivered_at" timestamp;

-- Add index on board for faster board-filtered queries
CREATE INDEX "idx_production_stages_board" ON "production_stages" ("board");
CREATE INDEX "idx_production_tasks_board" ON "production_tasks" ("board");
CREATE INDEX "idx_production_tasks_order_board" ON "production_tasks" ("order_id", "board");