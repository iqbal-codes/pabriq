-- Drop existing tables (order matters for FK)
DROP TABLE IF EXISTS "payments" CASCADE;
DROP TABLE IF EXISTS "invoices" CASCADE;

-- Create payment_methods table
CREATE TABLE "payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'bank_transfer' NOT NULL,
	"bank_name" text,
	"account_number" text,
	"account_holder" text,
	"instructions" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create new invoices table
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"order_id" text,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"percentage" real,
	"subtotal" real NOT NULL,
	"total" real NOT NULL,
	"due_date" date NOT NULL,
	"issued_date" date DEFAULT CURRENT_DATE NOT NULL,
	"payment_method_id" text,
	"paid_at" timestamp,
	"paid_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create invoice_line_items table
CREATE TABLE "invoice_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" real NOT NULL,
	"total" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add constraints for payment_methods
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;

-- Add constraints for invoices
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE set null ON UPDATE no action;

-- Add constraints for invoice_line_items
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;

-- Create unique index for invoice number per org
CREATE UNIQUE INDEX "idx_invoices_org_number" ON "invoices" ("org_id", "invoice_number");
