CREATE TABLE "midtrans_transactions" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "invoice_id" text NOT NULL,
  "order_id" text NOT NULL,
  "expected_amount" real NOT NULL,
  "gross_amount" real,
  "transaction_id" text,
  "transaction_status" text DEFAULT 'created' NOT NULL,
  "error_message" text,
  "failed_at" timestamp,
  "fraud_status" text,
  "payment_type" text,
  "settlement_time" timestamp,
  "refunded_amount" real DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "midtrans_transactions_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
ALTER TABLE "midtrans_transactions" ADD CONSTRAINT "midtrans_transactions_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "midtrans_transactions" ADD CONSTRAINT "midtrans_transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_midtrans_transactions_org_id" ON "midtrans_transactions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_midtrans_transactions_invoice_id" ON "midtrans_transactions" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_midtrans_transactions_status" ON "midtrans_transactions" USING btree ("transaction_status");
--> statement-breakpoint
INSERT INTO "midtrans_transactions" (
  "id", "org_id", "invoice_id", "order_id", "expected_amount",
  "transaction_status", "error_message", "created_at", "updated_at"
)
SELECT
  md5(i."id" || ':' || i."midtrans_order_id"),
  i."org_id",
  i."id",
  CASE
    WHEN count(*) OVER (PARTITION BY i."midtrans_order_id") = 1
      THEN i."midtrans_order_id"
    ELSE i."midtrans_order_id" || '-legacy-' || substr(md5(i."id"), 1, 8)
  END,
  round(i."total"),
  CASE
    WHEN count(*) OVER (PARTITION BY i."midtrans_order_id") = 1
      THEN 'pending'
    ELSE 'orphaned'
  END,
  CASE
    WHEN count(*) OVER (PARTITION BY i."midtrans_order_id") = 1
      THEN NULL
    ELSE 'Legacy Midtrans order ID was shared by multiple invoices'
  END,
  i."created_at",
  i."updated_at"
FROM "invoices" i
WHERE i."midtrans_order_id" IS NOT NULL;