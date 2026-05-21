/**
 * v1/tags.js — Org-Scoped Tag Management
 */

import { Router } from 'express';
import { prepare } from '../../db-adapter.js';

const router = Router();

/**
 * GET /api/v1/tags
 */
router.get('/', async (req, res) => {
  try {
    const tags = await prepare(
      'SELECT * FROM tags WHERE org_id = ? ORDER BY name'
    ).all(req.tenant.orgId);
    res.json(tags);
  } catch (err) {
    console.error('v1 Tags fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/tags
 */
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check uniqueness within org
    const existing = await prepare(
      'SELECT id FROM tags WHERE org_id = ? AND name = ?'
    ).get(req.tenant.orgId, name.trim());
    if (existing) {
      return res.status(409).json({ error: 'Tag already exists' });
    }

    const result = await prepare(
      'INSERT INTO tags (org_id, name, color) VALUES (?, ?, ?)'
    ).run(req.tenant.orgId, name.trim(), color || '#6366f1');

    const tag = await prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(tag);
  } catch (err) {
    console.error('v1 Tag create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/tags/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const tag = await prepare(
      'SELECT id FROM tags WHERE id = ? AND org_id = ?'
    ).get(req.params.id, req.tenant.orgId);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });

    await prepare('DELETE FROM task_tags WHERE tag_id = ?').run(req.params.id);
    await prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error('v1 Tag delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/tags/:tagId/tasks/:taskId
 * Attach a tag to a task
 */
router.post('/:tagId/tasks/:taskId', async (req, res) => {
  try {
    const tag = await prepare('SELECT id FROM tags WHERE id = ? AND org_id = ?').get(req.params.tagId, req.tenant.orgId);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });

    const task = await prepare('SELECT id FROM tasks WHERE id = ? AND org_id = ?').get(req.params.taskId, req.tenant.orgId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Idempotent: ignore duplicate
    try {
      await prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(req.params.taskId, req.params.tagId);
    } catch (err) {
      if (!err.message?.includes('UNIQUE') && !err.message?.includes('duplicate')) throw err;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('v1 Tag attach error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/tags/:tagId/tasks/:taskId
 * Detach a tag from a task
 */
router.delete('/:tagId/tasks/:taskId', async (req, res) => {
  try {
    await prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?').run(req.params.taskId, req.params.tagId);
    res.json({ success: true });
  } catch (err) {
    console.error('v1 Tag detach error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
