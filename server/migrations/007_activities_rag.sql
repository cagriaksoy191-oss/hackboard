-- Migration 007: Activities RAG Support
-- Adds embedding_status column to activities table for RAG indexing.
-- Enriches metadata structure for semantic search.

ALTER TABLE activities ADD COLUMN embedding_status TEXT DEFAULT 'pending';
ALTER TABLE activities ADD COLUMN content_type    TEXT NOT NULL DEFAULT 'plain';

-- Index for worker polling
CREATE INDEX IF NOT EXISTS idx_activities_embedding_status ON activities(embedding_status);
-- Index for entity-scoped search
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
