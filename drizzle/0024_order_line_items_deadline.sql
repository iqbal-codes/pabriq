-- Migration: Add deadline and production_days to order_line_items
-- Default production_days to 1 for existing rows
-- Default deadline to now() for existing rows (will be recalculated when order is updated)

ALTER TABLE order_line_items ADD COLUMN production_days integer NOT NULL DEFAULT 1;
ALTER TABLE order_line_items ADD COLUMN deadline timestamp NOT NULL DEFAULT NOW();