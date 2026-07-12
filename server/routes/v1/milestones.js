/**
 * v1/milestones.js — Tenant-Scoped Milestone CRUD with Sprint Link
 */

import { Router } from 'express';
import { prepare } from '../../db-adapter.js';

const router = Router();

/**
 * GET /api/v1/milestones
 * Query: ?workspace_id, ?sprint_id
 */
router.get('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const wsId = req.query.workspace_id || workspaceId;
    const { sprint_id } = req.query;

    let sql = 'SELECT * FROM milestones WHERE org_id = ?';
    const params = [orgId];

    if (wsId) {
      sql += ' AND workspace_id = ?';
      params.push(wsId);
    }
    if (sprint_id) {
      sql += ' AND sprint_id = ?';
      params.push(sprint_id);
    }

    sql += ' ORDER BY target_time ASC';
    const milestones = await prepare(sql).all(...params);
    res.json(milestones);
  } catch (err) {
    console.error('v1 Milestones fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/milestones
 */
router.post('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const { title, description, target_time, sprint_id, task_id } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!target_time || isNaN(Date.parse(target_time))) {
      return res.status(400).json({ error: 'Valid target_time is required' });
    }

    const wsId = workspaceId || req.body.workspace_id;

    const result = await prepare(
      'INSERT INTO milestones (title, description, target_time, org_id, workspace_id, sprint_id, task_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(title.trim(), description || '', target_time, orgId, wsId || null, sprint_id || null, task_id || null);

    const milestone = await prepare('SELECT * FROM milestones WHERE id = ?').get(result.lastInsertRowid);

    const io = req.app.get('io');
    if (io) {
      const room = wsId ? `workspace:${wsId}` : `tenant:${orgId}`;
      io.to(room).emit('milestone:created', milestone);
    }

    res.status(201).json(milestone);
  } catch (err) {
    console.error('v1 Milestone create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/milestones/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const { title, description, target_time, is_completed, sprint_id, task_id, notified_overdue } = req.body;

    const existing = await prepare(
      'SELECT * FROM milestones WHERE id = ? AND org_id = ?'
    ).get(req.params.id, orgId);
    if (!existing) return res.status(404).json({ error: 'Milestone not found' });

    await prepare(`
      UPDATE milestones SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        target_time = COALESCE(?, target_time),
        is_completed = COALESCE(?, is_completed),
        sprint_id = COALESCE(?, sprint_id),
        task_id = COALESCE(?, task_id),
        notified_overdue = COALESCE(?, notified_overdue)
      WHERE id = ? AND org_id = ?
    `).run(
      title ?? null, description ?? null, target_time ?? null,
      is_completed ?? null, sprint_id ?? null, task_id ?? null, notified_overdue ?? null,
      req.params.id, orgId
    );

    const milestone = await prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);

    const io = req.app.get('io');
    if (io) {
      const room = existing.workspace_id ? `workspace:${existing.workspace_id}` : `tenant:${orgId}`;
      io.to(room).emit('milestone:updated', milestone);
    }

    res.json(milestone);
  } catch (err) {
    console.error('v1 Milestone update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/milestones/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const existing = await prepare(
      'SELECT * FROM milestones WHERE id = ? AND org_id = ?'
    ).get(req.params.id, orgId);
    if (!existing) return res.status(404).json({ error: 'Milestone not found' });

    await prepare('DELETE FROM milestones WHERE id = ?').run(req.params.id);

    const io = req.app.get('io');
    if (io) {
      const room = existing.workspace_id ? `workspace:${existing.workspace_id}` : `tenant:${orgId}`;
      io.to(room).emit('milestone:deleted', { id: req.params.id });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('v1 Milestone delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
