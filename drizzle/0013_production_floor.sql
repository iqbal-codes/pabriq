ALTER TABLE workflow_stages RENAME TO production_stages;--> statement-breakpoint
ALTER TABLE production_stages ADD COLUMN description TEXT;--> statement-breakpoint
ALTER TABLE production_stages ADD COLUMN need_approval BOOLEAN NOT NULL DEFAULT FALSE;--> statement-breakpoint
ALTER TABLE production_stages ADD COLUMN requirements JSON NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE production_tasks ALTER COLUMN stage_id DROP NOT NULL;--> statement-breakpoint
ALTER TABLE production_tasks DROP CONSTRAINT production_tasks_stage_id_workflow_stages_id_fk;--> statement-breakpoint
ALTER TABLE production_tasks ADD CONSTRAINT production_tasks_stage_id_production_stages_id_fk FOREIGN KEY (stage_id) REFERENCES production_stages(id) ON DELETE RESTRICT;--> statement-breakpoint
CREATE TABLE task_activity (id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE, task_id TEXT NOT NULL REFERENCES production_tasks(id) ON DELETE CASCADE, type TEXT NOT NULL, from_stage_id TEXT REFERENCES production_stages(id) ON DELETE SET NULL, to_stage_id TEXT REFERENCES production_stages(id) ON DELETE SET NULL, data JSON DEFAULT '{}', actor_id TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);--> statement-breakpoint
CREATE INDEX idx_task_activity_task ON task_activity(task_id);--> statement-breakpoint
CREATE INDEX idx_task_activity_order ON task_activity(org_id, created_at DESC);--> statement-breakpoint
