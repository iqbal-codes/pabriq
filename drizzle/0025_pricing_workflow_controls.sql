-- Migration: Add 3D rubber pricing workflow controls
-- Extends products with negotiated/repeat/production-cap fields
-- Adds product_addons table for per-product surcharges
-- Extends order_line_items with repeat/manual-deadline flags
-- Adds order_line_item_addons table to snapshot selected addons

-- Product pricing metadata
ALTER TABLE products ADD COLUMN negotiate_above_quantity integer;
ALTER TABLE products ADD COLUMN repeat_order_unit_price integer;
ALTER TABLE products ADD COLUMN repeat_order_min_quantity integer;
ALTER TABLE products ADD COLUMN max_production_quantity integer;

-- Product addons
CREATE TABLE product_addons (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organization(id) ON DELETE cascade,
  product_id text NOT NULL REFERENCES products(id) ON DELETE cascade,
  name text NOT NULL,
  unit_surcharge real NOT NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

-- Order line item repeat/manual-deadline flags
ALTER TABLE order_line_items ADD COLUMN is_repeat_order boolean NOT NULL DEFAULT false;
ALTER TABLE order_line_items ADD COLUMN manual_deadline boolean NOT NULL DEFAULT false;

-- Order line item addon snapshots
CREATE TABLE order_line_item_addons (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organization(id) ON DELETE cascade,
  line_item_id text NOT NULL REFERENCES order_line_items(id) ON DELETE cascade,
  product_addon_id text REFERENCES product_addons(id) ON DELETE set null,
  name text NOT NULL,
  unit_surcharge real NOT NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);
