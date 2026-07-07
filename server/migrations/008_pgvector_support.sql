-- Migration 008: pgvector Support + Embeddings Schema Extension
-- Adds pgvector native vector column and relaxes source_type constraint for activities.

-- 1. Extend source_type CHECK to include 'activity'
-- SQLite doesn't support ALTER CHECK, but new inserts still go through app validation.
-- For PostgreSQL, we drop and re-add the constraint:
-- (This is handled conditionally by the dialect translator in migrate.js)

-- 2. Add embedding_vec column for pgvector native storage
-- PostgreSQL mode: vector-store.js will ALTER TABLE to add vector(N) column via pgvector
-- SQLite mode: this column is TEXT (JSON fallback) — harmless no-op

-- Note: The actual pgvector extension enable (CREATE EXTENSION) and 
-- IVFFlat index creation are handled at runtime by vector-store.js initialize()
-- to allow graceful fallback when pgvector is not installed.

-- Add embedding_vec as TEXT for SQLite (pgvector will override type at runtime in PG mode)
-- @sqlite-only
ALTER TABLE embeddings ADD COLUMN embedding_vec TEXT;

-- Add search performance index on source + org for filtered vector search
CREATE INDEX IF NOT EXISTS idx_embeddings_org_source ON embeddings(org_id, source_type);
