/**
 * v1/workflows.js — Workspace-Scoped Workflow Stage Management
 */

import { Router } from 'express';
import { prepare } from '../../db-adapter.js';
import { requireRole } from '../../auth/guards.js';

const router = Router();

/**
 * GET /api/v1/workflows
 * Query: ?workspace_id
 */
router.get('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const wsId = req.query.workspace_id || workspaceId;

    if (!wsId) {
      return res.status(400).json({ error: 'workspace_id is required' });
    }

    const ws = await prepare('SELECT id FROM workspaces WHERE id = ? AND org_id = ?').get(wsId, orgId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const stages = await prepare(
      'SELECT * FROM workflow_stages WHERE workspace_id = ? ORDER BY position'
    ).all(wsId);

    res.json(stages);
  } catch (err) {
    console.error('v1 Workflows fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/workflows
 * Create a new workflow stage (admin+)
 */
router.post('/', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const { name, color, is_done_state, workspace_id: bodyWsId } = req.body;
    const wsId = bodyWsId || workspaceId;

    if (!name || !wsId) {
      return res.status(400).json({ error: 'name and workspace_id are required' });
    }

    const ws = await prepare('SELECT id FROM workspaces WHERE id = ? AND org_id = ?').get(wsId, orgId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Get max position
    const maxPos = await prepare(
      'SELECT MAX(position) as max_pos FROM workflow_stages WHERE workspace_id = ?'
    ).get(wsId);
    const nextPosition = (maxPos?.max_pos ?? -1) + 1;

    const result = await prepare(
      'INSERT INTO workflow_stages (workspace_id, name, slug, position, color, is_done_state) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(wsId, name.trim(), slug, nextPosition, color || '#6366f1', is_done_state ? 1 : 0);

    const stage = await prepare('SELECT * FROM workflow_stages WHERE id = ?').get(result.lastInsertRowid);

    const io = req.app.get('io');
    if (io) io.to(`workspace:${wsId}`).emit('workflow:created', stage);

    res.status(201).json(stage);
  } catch (err) {
    console.error('v1 Workflow create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/workflows/:id
 */
router.put('/:id', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const { name, color, is_done_state } = req.body;

    const stage = await prepare(`
      SELECT ws.* FROM workflow_stages ws
      JOIN workspaces w ON ws.workspace_id = w.id
      WHERE ws.id = ? AND w.org_id = ?
    `).get(req.params.id, orgId);

    if (!stage) return res.status(404).json({ error: 'Workflow stage not found' });

    await prepare(
      'UPDATE workflow_stages SET name = COALESCE(?, name), color = COALESCE(?, color), is_done_state = COALESCE(?, is_done_state) WHERE id = ?'
    ).run(name ?? null, color ?? null, is_done_state !== undefined ? (is_done_state ? 1 : 0) : null, req.params.id);

    const updated = await prepare('SELECT * FROM workflow_stages WHERE id = ?').get(req.params.id);

    const io = req.app.get('io');
    if (io) io.to(`workspace:${stage.workspace_id}`).emit('workflow:updated', updated);

    res.json(updated);
  } catch (err) {
    console.error('v1 Workflow update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/v1/workflows/reorder
 * Body: { workspace_id, order: [{ id, position }] }
 */
router.patch('/reorder', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const { workspace_id, order } = req.body;

    if (!workspace_id || !Array.isArray(order)) {
      return res.status(400).json({ error: 'workspace_id and order array required' });
    }

    const ws = await prepare('SELECT id FROM workspaces WHERE id = ? AND org_id = ?').get(workspace_id, orgId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    for (const item of order) {
      await prepare(
        'UPDATE workflow_stages SET position = ? WHERE id = ? AND workspace_id = ?'
      ).run(item.position, item.id, workspace_id);
    }

    const stages = await prepare(
      'SELECT * FROM workflow_stages WHERE workspace_id = ? ORDER BY position'
    ).all(workspace_id);

    const io = req.app.get('io');
    if (io) io.to(`workspace:${workspace_id}`).emit('workflow:reordered', stages);

    res.json(stages);
  } catch (err) {
    console.error('v1 Workflow reorder error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/workflows/:id
 * Cannot delete if tasks are using this stage
 */
router.delete('/:id', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { orgId } = req.tenant;

    const stage = await prepare(`
      SELECT ws.* FROM workflow_stages ws
      JOIN workspaces w ON ws.workspace_id = w.id
      WHERE ws.id = ? AND w.org_id = ?
    `).get(req.params.id, orgId);

    if (!stage) return res.status(404).json({ error: 'Workflow stage not found' });

    // Check if tasks reference this stage
    const taskCount = await prepare(
      'SELECT COUNT(*) as count FROM tasks WHERE workflow_stage_id = ?'
    ).get(req.params.id);

    if (taskCount?.count > 0) {
      return res.status(409).json({
        error: 'Cannot delete stage with assigned tasks',
        taskCount: taskCount.count
      });
    }

    await prepare('DELETE FROM workflow_stages WHERE id = ?').run(req.params.id);

    const io = req.app.get('io');
    if (io) io.to(`workspace:${stage.workspace_id}`).emit('workflow:deleted', { id: req.params.id });

    res.json({ success: true });
  } catch (err) {
    console.error('v1 Workflow delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
