ALTER TABLE production_tasks ADD COLUMN task_number TEXT;--> statement-breakpoint
ALTER TABLE production_tasks ADD COLUMN line_item_id TEXT;--> statement-breakpoint
CREATE INDEX idx_task_number ON production_tasks(org_id, task_number);--> statement-breakpoint
