-- Migration 011: Milestone-Task Linkage & Notifications
ALTER TABLE milestones ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE milestones ADD COLUMN notified_overdue INTEGER NOT NULL DEFAULT 0;
