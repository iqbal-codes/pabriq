# ADR 0001: Drop and recreate invoices/payments tables

## Status

Accepted

## Context

Migration `0002_graceful_vampiro.sql` created early stub tables for `invoices` and `payments`. When spec 13 (Invoices & Manual Payments) was designed, the schema no longer matched:

- `invoices` was missing ~7 columns (`invoice_number`, `customer_id`, `customer_name`, `subtotal`, `issued_date`, `notes`, `payment_instructions`) and had `order_id` as NOT NULL instead of nullable
- `payments` was built for multiple payments per invoice with a separate `method` column
- No `invoice_line_items` table existed

Two options:
1. **ALTER TABLE** — add columns, drop NOT NULL, alter types
2. **DROP + CREATE** — drop both tables, recreate from scratch

## Decision

Drop both `invoices` and `payments` tables and recreate with the new schema. No data exists on these tables (they were stubs never used in production).

## Rationale

- Cleaner migration output — no chains of ALTER statements
- The original spec assumed a payments-table design (multiple payments per invoice, partia ll y_paid state). We simplified to 1 invoice = 1 payment with payment data on the invoice row. The old `payments` table structure has no overlap with the new model.
- No production data to migrate — zero risk

## Consequences

- Migration `0019` will contain `DROP TABLE payments, invoices CASCADE` + `CREATE TABLE invoices, invoice_line_items, payment_methods`
- Must update PGlite seed DDL if it references these tables
- Existing foreign key references from `payments` to `invoices` are dropped (no real data affected)

## Alternatives considered

**ALTER TABLE approach:** Would require ~7 ALTER TABLE ADD COLUMN + ALTER TABLE ALTER COLUMN + CREATE TABLE statements. More risk of missed columns and harder to review. Not worth the complexity given zero data.
