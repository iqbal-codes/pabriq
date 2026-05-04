ALTER TABLE orders ADD COLUMN approved_at TIMESTAMP;--> statement-breakpoint
ALTER TABLE orders ADD COLUMN approved_by TEXT;--> statement-breakpoint
ALTER TABLE orders ADD COLUMN rejected_at TIMESTAMP;--> statement-breakpoint
ALTER TABLE orders ADD COLUMN rejected_by TEXT;--> statement-breakpoint
ALTER TABLE orders ADD COLUMN reject_reason TEXT;--> statement-breakpoint
