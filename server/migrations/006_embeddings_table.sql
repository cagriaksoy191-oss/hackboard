-- Migration 006: Embeddings Table for RAG Vector Store
-- Stores text chunks and their embedding vectors for semantic search.
-- Supports multiple source types (task, comment, message).

CREATE TABLE IF NOT EXISTS embeddings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id          INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id    INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    source_type     TEXT NOT NULL CHECK (source_type IN ('task', 'comment', 'message', 'activity')),
    source_id       INTEGER NOT NULL,
    chunk_index     INTEGER NOT NULL DEFAULT 0,
    chunk_text      TEXT NOT NULL,
    embedding       TEXT,
    model           TEXT DEFAULT 'text-embedding-004',
    token_count     INTEGER DEFAULT 0,
    metadata        TEXT DEFAULT '{}',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_type, source_id, chunk_index)
);

-- Index for fast retrieval by source
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);
-- Index for workspace-scoped search
CREATE INDEX IF NOT EXISTS idx_embeddings_workspace ON embeddings(workspace_id);
-- Index for org-scoped search
CREATE INDEX IF NOT EXISTS idx_embeddings_org ON embeddings(org_id);
