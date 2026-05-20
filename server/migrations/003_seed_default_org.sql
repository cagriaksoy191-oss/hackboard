-- Migration 003: Seed Default Organization & Workspace for Existing Data
-- This migration creates the default tenant context and assigns all
-- existing records to it. Runs ONLY if organizations table is empty.
-- The migration runner handles the conditional check at JS level.

-- Note: This file is executed statement-by-statement by the migration runner.
-- Conditional logic (IF NOT EXISTS for data) is handled in migrate.js.
-- The statements below assume they only run when the default org doesn't exist.

INSERT INTO organizations (name, slug, plan) VALUES ('Default Organization', 'default', 'free');

INSERT INTO workspaces (org_id, name, slug, description)
VALUES (1, 'Default Workspace', 'default', 'Auto-created workspace for existing data');

-- Default workflow stages matching the original 4-column Kanban
INSERT INTO workflow_stages (workspace_id, name, slug, position, color, is_done_state) VALUES
(1, 'To Do',        'todo',        0, '#94a3b8', 0),
(1, 'In Progress',  'in-progress', 1, '#3b82f6', 0),
(1, 'Testing',      'testing',     2, '#f59e0b', 0),
(1, 'Done',         'done',        3, '#22c55e', 1);

-- Default chat channel
INSERT INTO channels (workspace_id, name, slug, description, is_default)
VALUES (1, 'General', 'general', 'Default team channel', 1);
