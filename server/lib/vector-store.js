/**
 * vector-store.js — Dual-Mode Vector Store Abstraction
 *
 * Provides a unified API for vector embedding storage and similarity search
 * that adapts to the active database engine:
 *
 *   ┌────────────────────────────────────┐
 *   │        VectorStore (API)           │
 *   ├──────────────┬─────────────────────┤
 *   │  SQLite Mode │  PostgreSQL Mode    │
 *   │  (in-memory  │  (pgvector ext.     │
 *   │   cosine)    │   DB-level ANN)     │
 *   └──────────────┴─────────────────────┘
 *
 * SQLite mode:
 *   - Stores embeddings as JSON text in the `embedding` column
 *   - Computes cosine similarity in Node.js memory
 *   - Suitable for development/small datasets (< 10K vectors)
 *
 * PostgreSQL mode:
 *   - Uses pgvector extension with native `vector` column type
 *   - Cosine distance computed at DB level via `<=>` operator
 *   - IVFFlat index for approximate nearest neighbor (ANN)
 *   - Handles 100K+ vectors efficiently
 *
 * Usage:
 *   import { vectorStore } from './lib/vector-store.js';
 *   await vectorStore.initialize();
 *   await vectorStore.upsert({ orgId, sourceType, sourceId, chunkIndex, chunkText, embedding, model, tokenCount });
 *   const results = await vectorStore.search(queryVector, { orgId, sourceType, limit });
 */

import { prepare, execRaw, DB_MODE } from '../db-adapter.js';

/* ──────────────────────────────────────────────
   Configuration
   ────────────────────────────────────────────── */
const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS) || 768;
const SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.3;
const ANN_PROBES = parseInt(process.env.PGVECTOR_PROBES) || 10; // IVFFlat probes for recall/speed tradeoff

/* ──────────────────────────────────────────────
   Cosine Similarity (in-memory — SQLite fallback)
   ────────────────────────────────────────────── */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/* ══════════════════════════════════════════════
   SQLite Vector Store — In-Memory Cosine
   ══════════════════════════════════════════════ */
const sqliteStore = {
  _initialized: false,

  async initialize() {
    if (this._initialized) return;
    console.info('[VectorStore] SQLite mode — in-memory cosine similarity');
    this._initialized = true;
  },

  async upsert({ orgId, workspaceId, sourceType, sourceId, chunkIndex, chunkText, embedding, model, tokenCount, metadata }) {
    // Delete existing chunk for this source
    await prepare(
      'DELETE FROM embeddings WHERE source_type = ? AND source_id = ? AND chunk_index = ?'
    ).run(sourceType, sourceId, chunkIndex);

    // Insert with JSON-serialized embedding
    await prepare(`
      INSERT INTO embeddings (org_id, workspace_id, source_type, source_id, chunk_index, chunk_text, embedding, model, token_count, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orgId || null,
      workspaceId || null,
      sourceType,
      sourceId,
      chunkIndex,
      chunkText,
      JSON.stringify(embedding),
      model,
      tokenCount,
      metadata ? JSON.stringify(metadata) : '{}'
    );
  },

  async deleteBySource(sourceType, sourceId) {
    await prepare('DELETE FROM embeddings WHERE source_type = ? AND source_id = ?').run(sourceType, sourceId);
  },

  async search(queryVector, options = {}) {
    const { orgId, workspaceId, sourceType, limit = 10 } = options;

    // Build filtered query
    let sql = 'SELECT * FROM embeddings WHERE 1=1';
    const params = [];
    if (orgId) { sql += ' AND org_id = ?'; params.push(orgId); }
    if (workspaceId) { sql += ' AND workspace_id = ?'; params.push(workspaceId); }
    if (sourceType) { sql += ' AND source_type = ?'; params.push(sourceType); }

    const rows = await prepare(sql).all(...params);

    // In-memory cosine similarity computation
    const results = rows
      .map(row => {
        const embVector = JSON.parse(row.embedding);
        const score = cosineSimilarity(queryVector, embVector);
        return {
          score,
          sourceType: row.source_type,
          sourceId: row.source_id,
          chunkText: row.chunk_text,
          chunkIndex: row.chunk_index,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
        };
      })
      .filter(r => r.score > SIMILARITY_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 2); // Over-fetch for dedup headroom

    return deduplicateResults(results, limit);
  },

  async getStats() {
    const total = await prepare('SELECT COUNT(*) as count FROM embeddings').get();
    const byType = await prepare(
      'SELECT source_type, COUNT(*) as count FROM embeddings GROUP BY source_type'
    ).all();
    return { total: total?.count || 0, byType, mode: 'sqlite', indexType: 'in-memory' };
  },
};

/* ══════════════════════════════════════════════
   PostgreSQL Vector Store — pgvector Extension
   ══════════════════════════════════════════════ */
const pgvectorStore = {
  _initialized: false,
  _pgvectorAvailable: false,
  _dimensions: EMBEDDING_DIMENSIONS,

  async initialize() {
    if (this._initialized) return;

    // Step 1: Try to enable pgvector extension
    try {
      await execRaw('CREATE EXTENSION IF NOT EXISTS vector');
      console.info('[VectorStore] pgvector extension enabled');
      this._pgvectorAvailable = true;
    } catch (err) {
      console.warn(`[VectorStore] pgvector extension not available: ${err.message}`);
      console.warn('[VectorStore] Falling back to JSON + in-memory cosine (PG mode)');
      this._pgvectorAvailable = false;
      this._initialized = true;
      return;
    }

    // Step 2: Add native vector column if pgvector is available
    try {
      const { getPool } = await import('../db-pg.js');
      const pool = getPool();
      const colCheck = await pool.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'embeddings' AND column_name = 'embedding_vec'
      `);
      if (colCheck.rows.length > 0) {
        const type = colCheck.rows[0].data_type;
        if (type !== 'USER-DEFINED') {
          console.warn(`[VectorStore] embedding_vec column has invalid type '${type}', recreating as vector...`);
          await execRaw('ALTER TABLE embeddings DROP COLUMN embedding_vec');
          await execRaw(`ALTER TABLE embeddings ADD COLUMN embedding_vec vector(${this._dimensions})`);
        }
      } else {
        await execRaw(`ALTER TABLE embeddings ADD COLUMN embedding_vec vector(${this._dimensions})`);
      }
      console.info(`[VectorStore] embedding_vec column ready (${this._dimensions} dimensions)`);
    } catch (err) {
      console.warn(`[VectorStore] embedding_vec column setup error: ${err.message}`);
    }

    // Step 3: Create IVFFlat index for cosine distance (ANN)
    // IVFFlat requires at least (lists * 10) rows to build effectively.
    // We use lists=100 as a safe starting point; can be tuned later.
    try {
      await execRaw(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_vec_cosine
        ON embeddings USING ivfflat (embedding_vec vector_cosine_ops)
        WITH (lists = 100)
      `);
      console.info('[VectorStore] IVFFlat cosine index ready');
    } catch (err) {
      // Index creation may fail if not enough data — it's OK, queries still work (seq scan)
      console.warn(`[VectorStore] IVFFlat index: ${err.message}`);
    }

    this._initialized = true;
    console.info('[VectorStore] PostgreSQL pgvector mode initialized');
  },

  async upsert({ orgId, workspaceId, sourceType, sourceId, chunkIndex, chunkText, embedding, model, tokenCount, metadata }) {
    // Delete existing chunk for this source
    await prepare(
      'DELETE FROM embeddings WHERE source_type = ? AND source_id = ? AND chunk_index = ?'
    ).run(sourceType, sourceId, chunkIndex);

    if (this._pgvectorAvailable) {
      // Store both JSON text (backward compat) and native vector
      const vecLiteral = `[${embedding.join(',')}]`;
      await prepare(`
        INSERT INTO embeddings (org_id, workspace_id, source_type, source_id, chunk_index, chunk_text, embedding, embedding_vec, model, token_count, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?::vector, ?, ?, ?)
      `).run(
        orgId || null,
        workspaceId || null,
        sourceType,
        sourceId,
        chunkIndex,
        chunkText,
        JSON.stringify(embedding),
        vecLiteral,
        model,
        tokenCount,
        metadata ? JSON.stringify(metadata) : '{}'
      );
    } else {
      // pgvector not available — store as JSON text only
      await prepare(`
        INSERT INTO embeddings (org_id, workspace_id, source_type, source_id, chunk_index, chunk_text, embedding, model, token_count, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orgId || null,
        workspaceId || null,
        sourceType,
        sourceId,
        chunkIndex,
        chunkText,
        JSON.stringify(embedding),
        model,
        tokenCount,
        metadata ? JSON.stringify(metadata) : '{}'
      );
    }
  },

  async deleteBySource(sourceType, sourceId) {
    await prepare('DELETE FROM embeddings WHERE source_type = ? AND source_id = ?').run(sourceType, sourceId);
  },

  async search(queryVector, options = {}) {
    const { orgId, workspaceId, sourceType, limit = 10 } = options;

    if (this._pgvectorAvailable) {
      return this._pgvectorSearch(queryVector, options);
    }
    // Fallback: PG without pgvector → use same in-memory approach as SQLite
    return sqliteStore.search.call({ ...sqliteStore, _initialized: true }, queryVector, options);
  },

  /**
   * Native pgvector search — cosine distance at DB level
   * Uses `<=>` operator for cosine distance (1 - cosine_similarity)
   * ORDER BY distance ASC → most similar first
   */
  async _pgvectorSearch(queryVector, options = {}) {
    const { orgId, workspaceId, sourceType, limit = 10 } = options;

    const { getPool } = await import('../db-pg.js');
    const pool = getPool();

    // Set IVFFlat probes for this session (recall/speed tradeoff)
    await pool.query(`SET ivfflat.probes = ${ANN_PROBES}`);

    const vecLiteral = `[${queryVector.join(',')}]`;

    // Build parameterized query with pgvector cosine distance
    let conditions = ['embedding_vec IS NOT NULL'];
    let params = [vecLiteral]; // $1 = query vector
    let paramIdx = 2;

    if (orgId) {
      conditions.push(`org_id = $${paramIdx++}`);
      params.push(orgId);
    }
    if (workspaceId) {
      conditions.push(`workspace_id = $${paramIdx++}`);
      params.push(workspaceId);
    }
    if (sourceType) {
      conditions.push(`source_type = $${paramIdx++}`);
      params.push(sourceType);
    }

    // Cosine distance threshold: pgvector <=> returns 0..2 (0 = identical)
    const distanceThreshold = 1 - SIMILARITY_THRESHOLD;
    conditions.push(`(embedding_vec <=> $1::vector) < $${paramIdx++}`);
    params.push(distanceThreshold);

    const overFetchLimit = limit * 2;
    params.push(overFetchLimit);

    const sql = `
      SELECT
        source_type,
        source_id,
        chunk_text,
        chunk_index,
        metadata,
        1 - (embedding_vec <=> $1::vector) as score
      FROM embeddings
      WHERE ${conditions.join(' AND ')}
      ORDER BY embedding_vec <=> $1::vector ASC
      LIMIT $${paramIdx}
    `;

    const queryResult = await pool.query(sql, params);

    const results = queryResult.rows.map(row => ({
      score: parseFloat(row.score),
      sourceType: row.source_type,
      sourceId: row.source_id,
      chunkText: row.chunk_text,
      chunkIndex: row.chunk_index,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : {},
    }));

    return deduplicateResults(results, limit);
  },

  async getStats() {
    const total = await prepare('SELECT COUNT(*) as count FROM embeddings').get();
    const byType = await prepare(
      'SELECT source_type, COUNT(*) as count FROM embeddings GROUP BY source_type'
    ).all();
    const vecCount = this._pgvectorAvailable
      ? (await prepare('SELECT COUNT(*) as count FROM embeddings WHERE embedding_vec IS NOT NULL').get())?.count || 0
      : 0;
    return {
      total: total?.count || 0,
      byType,
      mode: 'postgresql',
      indexType: this._pgvectorAvailable ? 'pgvector-ivfflat' : 'json-fallback',
      vectorizedCount: vecCount,
      dimensions: this._dimensions,
    };
  },
};

/* ──────────────────────────────────────────────
   Shared Helpers
   ────────────────────────────────────────────── */
function deduplicateResults(results, limit) {
  const seen = new Set();
  return results.filter(r => {
    const key = `${r.sourceType}:${r.sourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

/* ──────────────────────────────────────────────
   Factory Export — Single Instance
   ────────────────────────────────────────────── */
export const vectorStore = DB_MODE === 'postgresql' ? pgvectorStore : sqliteStore;

// Re-export cosine similarity for external use (e.g., tests)
export { cosineSimilarity };
