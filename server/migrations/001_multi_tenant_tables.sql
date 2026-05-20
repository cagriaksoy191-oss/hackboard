-- Migration 001: Multi-Tenant Core Tables
-- Creates organizations, workspaces, memberships, and supporting tables

-- ─── Organizations (Tenant) ───
CREATE TABLE IF NOT EXISTS organizations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    plan            TEXT NOT NULL DEFAULT 'free',
    settings        TEXT DEFAULT '{}',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Workspaces ───
CREATE TABLE IF NOT EXISTS workspaces (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id          INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    settings        TEXT DEFAULT '{}',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, slug)
);

-- ─── Organization Memberships ───
CREATE TABLE IF NOT EXISTS org_memberships (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id          INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    invited_by      INTEGER REFERENCES users(id),
    joined_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, user_id)
);

-- ─── Tags (RAG-ready categorization) ───
CREATE TABLE IF NOT EXISTS tags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id          INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    color           TEXT DEFAULT '#6366f1',
    UNIQUE(org_id, name)
);

-- ─── Task-Tag Relationship ───
CREATE TABLE IF NOT EXISTS task_tags (
    task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id          INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY(task_id, tag_id)
);

-- ─── Sprints / Cycles ───
CREATE TABLE IF NOT EXISTS sprints (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id    INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    goal            TEXT DEFAULT '',
    start_date      DATETIME NOT NULL,
    end_date        DATETIME NOT NULL,
    status          TEXT NOT NULL DEFAULT 'planning'
                    CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Custom Workflow Stages ───
CREATE TABLE IF NOT EXISTS workflow_stages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id    INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    position        INTEGER NOT NULL DEFAULT 0,
    color           TEXT DEFAULT '#6366f1',
    is_done_state   INTEGER NOT NULL DEFAULT 0,
    UNIQUE(workspace_id, slug)
);

-- ─── Chat Channels ───
CREATE TABLE IF NOT EXISTS channels (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id    INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    is_default      INTEGER NOT NULL DEFAULT 0,
    created_by      INTEGER REFERENCES users(id),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, slug)
);

-- ─── Refresh Tokens ───
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,
    expires_at      DATETIME NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Migrations Tracker ───
CREATE TABLE IF NOT EXISTS _migrations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,
    applied_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
