-- Migration 004: Backfill Existing Data with Default Tenant Context
-- Assigns org_id=1 and workspace_id=1 to all existing records that lack them.
-- Creates org_memberships for existing non-deleted users.
-- Maps existing task statuses to workflow_stage_id.

-- Assign default org/workspace to all existing tasks
UPDATE tasks SET org_id = 1, workspace_id = 1 WHERE org_id IS NULL;

-- Assign default org/workspace to all existing messages
UPDATE messages SET org_id = 1, workspace_id = 1 WHERE org_id IS NULL;

-- Assign default channel to all existing messages
UPDATE messages SET channel_id = 1 WHERE channel_id IS NULL;

-- Assign default org/workspace to all existing activities
UPDATE activities SET org_id = 1, workspace_id = 1 WHERE org_id IS NULL;

-- Assign default org/workspace to all existing milestones
UPDATE milestones SET org_id = 1, workspace_id = 1 WHERE org_id IS NULL;

-- Map existing task status slugs to workflow_stage_id
-- This uses a CASE expression since SQLite doesn't support UPDATE FROM
UPDATE tasks SET workflow_stage_id = CASE status
    WHEN 'todo'        THEN 1
    WHEN 'in-progress' THEN 2
    WHEN 'testing'     THEN 3
    WHEN 'done'        THEN 4
    ELSE NULL
END
WHERE workflow_stage_id IS NULL;
