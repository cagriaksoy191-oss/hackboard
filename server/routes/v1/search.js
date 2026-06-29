/**
 * v1/search.js — Semantic Search API (RAG-Powered)
 *
 * Provides full-text and semantic search across tasks, messages, and comments.
 * Uses the embedding worker's cosine similarity engine for relevance ranking.
 */

import { Router } from 'express';
import { prepare } from '../../db-adapter.js';
import { semanticSearch } from '../../embedding-worker.js';

const router = Router();

/**
 * GET /api/v1/search
 * Query params:
 *   q          - Search query (required)
 *   type       - Filter by source type: task | message | comment | activity (optional)
 *   mode       - 'semantic' (default) | 'text' — search mode
 *   limit      - Max results (default 20, max 50)
 */
router.get('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const { q, type, mode = 'semantic', limit: rawLimit } = req.query;
    const limit = Math.min(parseInt(rawLimit) || 20, 50);

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query (q) must be at least 2 characters' });
    }

    const query = q.trim();
    const likeQuery = `%${query}%`;
    const textResults = [];

    // 1. Execute SQL LIKE text search
    // Search tasks
    if (!type || type === 'task') {
      const tasks = await prepare(`
        SELECT t.id, t.title, t.description, t.status, t.priority, t.assigned_to, u.name as assignee_name
        FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.org_id = ? AND (t.title LIKE ? OR t.description LIKE ?)
        LIMIT ?
      `).all(orgId, likeQuery, likeQuery, limit);

      tasks.forEach(t => {
        let score = 0.75;
        if (t.title.toLowerCase().includes(query.toLowerCase())) {
          score *= 1.2;
        }
        textResults.push({
          sourceType: 'task',
          sourceId: t.id,
          score,
          chunkText: t.title + ': ' + (t.description || ''),
          entity: t,
        });
      });
    }

    // Search messages
    if (!type || type === 'message') {
      const messages = await prepare(`
        SELECT m.id, m.content, m.user_id, m.channel_id, m.created_at, u.name as user_name, c.name as channel_name
        FROM messages m JOIN users u ON m.user_id = u.id
        JOIN channels c ON m.channel_id = c.id
        WHERE m.org_id = ? AND m.content LIKE ?
        LIMIT ?
      `).all(orgId, likeQuery, limit);

      messages.forEach(m => {
        let score = 0.75;
        if (m.channel_name && m.channel_name.toLowerCase().includes(query.toLowerCase())) {
          score *= 1.2;
        }
        textResults.push({
          sourceType: 'message',
          sourceId: m.id,
          score,
          chunkText: m.content,
          entity: m,
        });
      });
    }

    // Search comments
    if (!type || type === 'comment') {
      const comments = await prepare(`
        SELECT c.id, c.content, c.task_id, c.user_id, c.created_at, u.name as user_name
        FROM comments c JOIN users u ON c.user_id = u.id
        JOIN tasks t ON c.task_id = t.id
        WHERE t.org_id = ? AND c.content LIKE ?
        LIMIT ?
      `).all(orgId, likeQuery, limit);

      comments.forEach(c => {
        textResults.push({
          sourceType: 'comment',
          sourceId: c.id,
          score: 0.75,
          chunkText: c.content,
          entity: c,
        });
      });
    }

    // Search activities
    if (!type || type === 'activity') {
      const activities = await prepare(`
        SELECT a.id, a.action, a.details, a.entity_type, a.entity_id, a.metadata, a.created_at, u.name as user_name
        FROM activities a LEFT JOIN users u ON a.user_id = u.id
        WHERE a.org_id = ? AND a.details LIKE ?
        LIMIT ?
      `).all(orgId, likeQuery, limit);

      activities.forEach(a => {
        textResults.push({
          sourceType: 'activity',
          sourceId: a.id,
          score: 0.75,
          chunkText: a.details,
          entity: a,
        });
      });
    }

    // 2. Execute Vector Semantic Search if enabled
    let vectorResults = [];
    if (mode === 'semantic' || mode === 'hybrid') {
      try {
        vectorResults = await semanticSearch(query, {
          orgId,
          workspaceId,
          sourceType: type || undefined,
          limit,
        });
      } catch (err) {
        console.warn('[Search] Vector search failed or unconfigured, relying on SQL LIKE:', err.message);
      }
    }

    const enrichedVector = await Promise.all(
      vectorResults.map(async (r) => {
        let entity = null;
        if (r.sourceType === 'task') {
          entity = await prepare(`
            SELECT t.id, t.title, t.description, t.status, t.priority, t.assigned_to, u.name as assignee_name
            FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.id = ? AND t.org_id = ?
          `).get(r.sourceId, orgId);
        } else if (r.sourceType === 'message') {
          entity = await prepare(`
            SELECT m.id, m.content, m.user_id, m.channel_id, m.thread_id, m.created_at, u.name as user_name
            FROM messages m JOIN users u ON m.user_id = u.id
            WHERE m.id = ? AND m.org_id = ?
          `).get(r.sourceId, orgId);
        } else if (r.sourceType === 'comment') {
          entity = await prepare(`
            SELECT c.id, c.content, c.task_id, c.user_id, c.created_at, u.name as user_name
            FROM comments c JOIN users u ON c.user_id = u.id
            JOIN tasks t ON c.task_id = t.id
            WHERE c.id = ? AND t.org_id = ?
          `).get(r.sourceId, orgId);
        } else if (r.sourceType === 'activity') {
          entity = await prepare(`
            SELECT a.id, a.action, a.details, a.entity_type, a.entity_id, a.metadata, a.created_at, u.name as user_name
            FROM activities a LEFT JOIN users u ON a.user_id = u.id
            WHERE a.id = ? AND a.org_id = ?
          `).get(r.sourceId, orgId);
        }
        return {
          sourceType: r.sourceType,
          sourceId: r.sourceId,
          score: r.score,
          chunkText: r.chunkText,
          entity,
        };
      })
    );

    // 3. Deduplicate and merge results based on normalized scores
    const combinedMap = new Map();
    const addResult = (res) => {
      if (!res.entity) return;
      const key = `${res.sourceType}:${res.sourceId}`;
      const existing = combinedMap.get(key);
      if (!existing || res.score > existing.score) {
        combinedMap.set(key, res);
      }
    };

    enrichedVector.forEach(addResult);
    textResults.forEach(addResult);

    const results = Array.from(combinedMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => ({
        type: r.sourceType,
        score: Math.round(r.score * 100) / 100,
        highlight: r.chunkText,
        entity: r.entity,
      }));

    res.json({
      query,
      mode: mode === 'text' ? 'text' : 'hybrid',
      total: results.length,
      results,
    });
  } catch (err) {
    console.error('v1 Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/search/reindex
 * Trigger re-indexing of all entities (admin only)
 */
router.post('/reindex', async (req, res) => {
  try {
    const { orgId } = req.tenant;

    // Reset all task embedding statuses to pending
    const taskResult = await prepare(
      "UPDATE tasks SET embedding_status = 'pending' WHERE org_id = ?"
    ).run(orgId);

    // Reset all comment embedding statuses to pending
    const commentResult = await prepare(
      "UPDATE comments SET embedding_status = 'pending' WHERE id IN (SELECT c.id FROM comments c JOIN tasks t ON c.task_id = t.id WHERE t.org_id = ?)"
    ).run(orgId);

    // Reset all activity embedding statuses to pending
    const activityResult = await prepare(
      "UPDATE activities SET embedding_status = 'pending' WHERE org_id = ?"
    ).run(orgId);

    res.json({
      success: true,
      queued: {
        tasks: taskResult.changes || 0,
        comments: commentResult.changes || 0,
        activities: activityResult.changes || 0,
      },
      message: 'Re-indexing queued. Background worker will process entities.',
    });
  } catch (err) {
    console.error('v1 Reindex error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/search/stats
 * Returns vector store diagnostics (mode, index type, vector counts)
 */
router.get('/stats', async (req, res) => {
  try {
    const { vectorStore } = await import('../../lib/vector-store.js');
    const stats = await vectorStore.getStats();
    res.json(stats);
  } catch (err) {
    console.error('v1 Search stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
