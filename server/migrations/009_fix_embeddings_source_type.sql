-- Migration 009: Fix embeddings source_type CHECK constraint
-- Adds 'activity' to the allowed source_type values in the embeddings table.
--
-- Background:
--   Migration 006 created embeddings with:
--     CHECK (source_type IN ('task', 'comment', 'message'))
--   Phase 5.3 added 'activity' as a RAG-indexable entity type, but the
--   CHECK constraint was never updated. This causes INSERT failures
--   when the embedding worker tries to index activity logs.
--
-- Strategy:
--   PostgreSQL: ALTER TABLE DROP/ADD CONSTRAINT (native support)
--   SQLite:     DROP + recreate table (SQLite cannot ALTER CHECK constraints)
--               Embedding data loss is acceptable — worker will re-index automatically.

-- ═══════════════════════════════════════════════
--  PostgreSQL Path: Constraint manipulation
-- ═══════════════════════════════════════════════

-- @pg-only
ALTER TABLE embeddings DROP CONSTRAINT IF EXISTS embeddings_source_type_check;

-- @pg-only
ALTER TABLE embeddings ADD CONSTRAINT embeddings_source_type_check CHECK (source_type IN ('task', 'comment', 'message', 'activity'));

-- ═══════════════════════════════════════════════
--  SQLite Path: Table recreation
--  (SQLite cannot modify CHECK constraints via ALTER TABLE)
--  Embedding vectors are ephemeral and will be regenerated
--  by the background worker automatically.
-- ═══════════════════════════════════════════════

-- @sqlite-only
DROP TABLE IF EXISTS embeddings;

-- @sqlite-only
CREATE TABLE IF NOT EXISTS embeddings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id          INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id    INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    source_type     TEXT NOT NULL CHECK (source_type IN ('task', 'comment', 'message', 'activity')),
    source_id       INTEGER NOT NULL,
    chunk_index     INTEGER NOT NULL DEFAULT 0,
    chunk_text      TEXT NOT NULL,
    embedding       TEXT,
    embedding_vec   TEXT,
    model           TEXT DEFAULT 'text-embedding-004',
    token_count     INTEGER DEFAULT 0,
    metadata        TEXT DEFAULT '{}',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_type, source_id, chunk_index)
);

-- @sqlite-only
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);

-- @sqlite-only
CREATE INDEX IF NOT EXISTS idx_embeddings_workspace ON embeddings(workspace_id);

-- @sqlite-only
CREATE INDEX IF NOT EXISTS idx_embeddings_org ON embeddings(org_id);

-- @sqlite-only
CREATE INDEX IF NOT EXISTS idx_embeddings_org_source ON embeddings(org_id, source_type);

-- ═══════════════════════════════════════════════
--  Post-migration: Reset embedding statuses to trigger re-indexing
--  (Both engines — ensures worker picks up all entities)
-- ═══════════════════════════════════════════════

UPDATE tasks SET embedding_status = 'pending' WHERE embedding_status = 'indexed';

UPDATE comments SET embedding_status = 'pending' WHERE embedding_status = 'indexed';

UPDATE activities SET embedding_status = 'pending' WHERE embedding_status IS NOT NULL AND embedding_status = 'indexed';
