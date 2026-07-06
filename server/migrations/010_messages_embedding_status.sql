-- Migration 010: Messages Embedding Status
-- Adds embedding_status column to messages table for RAG indexing.

ALTER TABLE messages ADD COLUMN embedding_status TEXT DEFAULT 'pending';

-- Index for background worker polling
CREATE INDEX IF NOT EXISTS idx_messages_embedding_status ON messages(embedding_status);
