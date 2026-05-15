CREATE TABLE IF NOT EXISTS "payments" (
    "id" text PRIMARY KEY NOT NULL,
    "org_id" text NOT NULL,
    "invoice_id" text NOT NULL,
    "amount" real NOT NULL,
    "method" text DEFAULT 'bank_transfer' NOT NULL,
    "reference" text,
    "proof_asset_id" text,
    "status" text DEFAULT 'pending' NOT NULL,
    "received_at" timestamp,
    "confirmed_at" timestamp,
    "confirmed_by" text,
    "rejected_reason" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_proof_asset_id_assets_id_fk" FOREIGN KEY ("proof_asset_id") REFERENCES "assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_org_id" ON "payments" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_invoice_id" ON "payments" USING btree ("invoice_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments" USING btree ("status");
--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD COLUMN "line_type" text DEFAULT 'product' NOT NULL;
