ALTER TABLE "organization_profiles" ADD COLUMN "midtrans_server_key" text;
ALTER TABLE "organization_profiles" ADD COLUMN "midtrans_client_key" text;
ALTER TABLE "organization_profiles" ADD COLUMN "midtrans_is_production" boolean DEFAULT false NOT NULL;
ALTER TABLE "invoices" ADD COLUMN "payment_provider" text DEFAULT 'bank_transfer' NOT NULL;
UPDATE "invoices" SET "payment_provider" = 'midtrans', "payment_method_id" = NULL WHERE "payment_method_id" IN (SELECT "id" FROM "payment_methods" WHERE "type" = 'payment_gateway');
UPDATE "payments" SET "method" = 'midtrans' WHERE "method" = 'payment_gateway';
DELETE FROM "payment_methods" WHERE "type" = 'payment_gateway';
