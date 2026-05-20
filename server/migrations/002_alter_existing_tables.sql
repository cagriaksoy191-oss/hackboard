-- Migration 002: Alter Existing Tables for Multi-Tenancy + Auth + RAG
-- Adds org_id, workspace_id, and enterprise columns to existing tables.
-- SQLite does not support ADD CONSTRAINT or CHECK on ALTER TABLE,
-- so constraints are documented but enforced at application level.

-- ─── users: Auth columns ───
ALTER TABLE users ADD COLUMN email           TEXT UNIQUE;
ALTER TABLE users ADD COLUMN password_hash   TEXT;
ALTER TABLE users ADD COLUMN email_verified  INTEGER NOT NULL DEFAULT 0;

-- ─── tasks: Multi-tenant + Sprint + Workflow + RAG columns ───
ALTER TABLE tasks ADD COLUMN org_id            INTEGER REFERENCES organizations(id);
ALTER TABLE tasks ADD COLUMN workspace_id      INTEGER REFERENCES workspaces(id);
ALTER TABLE tasks ADD COLUMN sprint_id         INTEGER REFERENCES sprints(id);
ALTER TABLE tasks ADD COLUMN workflow_stage_id  INTEGER REFERENCES workflow_stages(id);
ALTER TABLE tasks ADD COLUMN content_type      TEXT NOT NULL DEFAULT 'plain';
ALTER TABLE tasks ADD COLUMN embedding_status  TEXT DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN version           INTEGER NOT NULL DEFAULT 1;

-- ─── messages: Multi-tenant + Channel + Thread columns ───
ALTER TABLE messages ADD COLUMN org_id         INTEGER REFERENCES organizations(id);
ALTER TABLE messages ADD COLUMN workspace_id   INTEGER REFERENCES workspaces(id);
ALTER TABLE messages ADD COLUMN channel_id     INTEGER REFERENCES channels(id);
ALTER TABLE messages ADD COLUMN thread_id      INTEGER REFERENCES messages(id);

-- ─── activities: Multi-tenant + Structured metadata ───
ALTER TABLE activities ADD COLUMN org_id         INTEGER REFERENCES organizations(id);
ALTER TABLE activities ADD COLUMN workspace_id   INTEGER REFERENCES workspaces(id);
ALTER TABLE activities ADD COLUMN entity_type    TEXT;
ALTER TABLE activities ADD COLUMN entity_id      INTEGER;
ALTER TABLE activities ADD COLUMN metadata       TEXT DEFAULT '{}';

-- ─── comments: RAG metadata ───
ALTER TABLE comments ADD COLUMN content_type     TEXT NOT NULL DEFAULT 'plain';
ALTER TABLE comments ADD COLUMN embedding_status TEXT DEFAULT 'pending';

-- ─── milestones: Multi-tenant + Sprint link ───
ALTER TABLE milestones ADD COLUMN org_id         INTEGER REFERENCES organizations(id);
ALTER TABLE milestones ADD COLUMN workspace_id   INTEGER REFERENCES workspaces(id);
ALTER TABLE milestones ADD COLUMN sprint_id      INTEGER REFERENCES sprints(id);

-- ─── subtasks: Version column ───
ALTER TABLE subtasks ADD COLUMN assigned_to      INTEGER REFERENCES users(id);
ALTER TABLE subtasks ADD COLUMN due_date         DATETIME;
