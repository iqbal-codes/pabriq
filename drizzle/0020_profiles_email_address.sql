-- Add email and address_id to organization_profiles
ALTER TABLE "organization_profiles"
ADD COLUMN "email" text;

ALTER TABLE "organization_profiles"
ADD COLUMN "address_id" text;

ALTER TABLE "organization_profiles"
ADD CONSTRAINT "organization_profiles_address_id_addresses_id_fk"
FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id")
ON DELETE set null ON UPDATE no action;

-- Add tax_percent to invoice_line_items
ALTER TABLE "invoice_line_items"
ADD COLUMN "tax_percent" real DEFAULT 0 NOT NULL;
