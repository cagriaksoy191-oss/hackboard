-- Migration 012: Task Multiple Assignees & Due Date
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Backfill existing single assignees to the junction table
-- @sqlite-only
INSERT OR IGNORE INTO task_assignees (task_id, user_id)
SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL;

-- @pg-only
INSERT INTO task_assignees (task_id, user_id)
SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL ON CONFLICT DO NOTHING;

-- Add due_date to tasks table
ALTER TABLE tasks ADD COLUMN due_date DATETIME;
