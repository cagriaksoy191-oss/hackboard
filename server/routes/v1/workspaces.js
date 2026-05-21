/**
 * v1/workspaces.js — Org-Scoped Workspace Management
 */

import { Router } from 'express';
import { prepare } from '../../db-adapter.js';
import { requireRole } from '../../auth/guards.js';

const router = Router();

/**
 * GET /api/v1/workspaces
 */
router.get('/', async (req, res) => {
  try {
    const workspaces = await prepare(
      'SELECT * FROM workspaces WHERE org_id = ? ORDER BY id'
    ).all(req.tenant.orgId);
    res.json(workspaces);
  } catch (err) {
    console.error('v1 Workspaces fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/workspaces/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const ws = await prepare(
      'SELECT * FROM workspaces WHERE id = ? AND org_id = ?'
    ).get(req.params.id, req.tenant.orgId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });
    res.json(ws);
  } catch (err) {
    console.error('v1 Workspace fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/workspaces
 * Requires admin+ role
 */
router.post('/', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check slug uniqueness within org
    const existing = await prepare(
      'SELECT id FROM workspaces WHERE org_id = ? AND slug = ?'
    ).get(req.tenant.orgId, slug);
    if (existing) {
      return res.status(409).json({ error: 'Workspace with this name already exists' });
    }

    const result = await prepare(
      'INSERT INTO workspaces (org_id, name, slug, description) VALUES (?, ?, ?, ?)'
    ).run(req.tenant.orgId, name.trim(), slug, description || '');

    const ws = await prepare('SELECT * FROM workspaces WHERE id = ?').get(result.lastInsertRowid);

    // Create default workflow stages for new workspace
    const defaultStages = [
      { name: 'To Do', slug: 'todo', position: 0, color: '#94a3b8', is_done_state: 0 },
      { name: 'In Progress', slug: 'in-progress', position: 1, color: '#3b82f6', is_done_state: 0 },
      { name: 'Testing', slug: 'testing', position: 2, color: '#f59e0b', is_done_state: 0 },
      { name: 'Done', slug: 'done', position: 3, color: '#22c55e', is_done_state: 1 },
    ];

    for (const stage of defaultStages) {
      await prepare(
        'INSERT INTO workflow_stages (workspace_id, name, slug, position, color, is_done_state) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(ws.id, stage.name, stage.slug, stage.position, stage.color, stage.is_done_state);
    }

    // Create default channel
    await prepare(
      'INSERT INTO channels (workspace_id, name, slug, is_default, created_by) VALUES (?, ?, ?, 1, ?)'
    ).run(ws.id, 'General', 'general', req.user.id);

    const io = req.app.get('io');
    if (io) io.to(`tenant:${req.tenant.orgId}`).emit('workspace:created', ws);

    res.status(201).json(ws);
  } catch (err) {
    console.error('v1 Workspace create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/workspaces/:id
 */
router.put('/:id', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { name, description } = req.body;

    const ws = await prepare(
      'SELECT * FROM workspaces WHERE id = ? AND org_id = ?'
    ).get(req.params.id, req.tenant.orgId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    await prepare(
      'UPDATE workspaces SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?'
    ).run(name ?? null, description ?? null, req.params.id);

    const updated = await prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);

    const io = req.app.get('io');
    if (io) io.to(`tenant:${req.tenant.orgId}`).emit('workspace:updated', updated);

    res.json(updated);
  } catch (err) {
    console.error('v1 Workspace update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/workspaces/:id/workflow-stages
 */
router.get('/:id/workflow-stages', async (req, res) => {
  try {
    const ws = await prepare(
      'SELECT id FROM workspaces WHERE id = ? AND org_id = ?'
    ).get(req.params.id, req.tenant.orgId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const stages = await prepare(
      'SELECT * FROM workflow_stages WHERE workspace_id = ? ORDER BY position'
    ).all(req.params.id);

    res.json(stages);
  } catch (err) {
    console.error('v1 Workflow stages fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/workspaces/:id/channels
 */
router.get('/:id/channels', async (req, res) => {
  try {
    const ws = await prepare(
      'SELECT id FROM workspaces WHERE id = ? AND org_id = ?'
    ).get(req.params.id, req.tenant.orgId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const channels = await prepare(
      'SELECT * FROM channels WHERE workspace_id = ? ORDER BY is_default DESC, name ASC'
    ).all(req.params.id);

    res.json(channels);
  } catch (err) {
    console.error('v1 Channels fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
