/**
 * v1/sprints.js — Workspace-Scoped Sprint / Cycle Management
 */

import { Router } from 'express';
import { prepare } from '../../db-adapter.js';

const router = Router();

const VALID_SPRINT_STATUSES = ['planning', 'active', 'completed', 'cancelled'];

/**
 * GET /api/v1/sprints
 * Query: ?workspace_id, ?status
 */
router.get('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const { status } = req.query;
    const wsId = req.query.workspace_id || workspaceId;

    if (!wsId) {
      return res.status(400).json({ error: 'workspace_id is required' });
    }

    // Verify workspace belongs to org
    const ws = await prepare('SELECT id FROM workspaces WHERE id = ? AND org_id = ?').get(wsId, orgId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    let sql = 'SELECT * FROM sprints WHERE workspace_id = ?';
    const params = [wsId];

    if (status && VALID_SPRINT_STATUSES.includes(status)) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY start_date DESC';
    const sprints = await prepare(sql).all(...params);
    res.json(sprints);
  } catch (err) {
    console.error('v1 Sprints fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/sprints
 */
router.post('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const { name, goal, start_date, end_date, workspace_id: bodyWsId } = req.body;
    const wsId = bodyWsId || workspaceId;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: 'name, start_date, and end_date are required' });
    }
    if (!wsId) {
      return res.status(400).json({ error: 'workspace_id is required' });
    }

    const ws = await prepare('SELECT id FROM workspaces WHERE id = ? AND org_id = ?').get(wsId, orgId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const result = await prepare(`
      INSERT INTO sprints (workspace_id, name, goal, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, 'planning')
    `).run(wsId, name, goal || '', start_date, end_date);

    const sprint = await prepare('SELECT * FROM sprints WHERE id = ?').get(result.lastInsertRowid);

    const io = req.app.get('io');
    if (io) io.to(`workspace:${wsId}`).emit('sprint:created', sprint);

    res.status(201).json(sprint);
  } catch (err) {
    console.error('v1 Sprint create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/sprints/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const { name, goal, start_date, end_date } = req.body;

    const sprint = await prepare(`
      SELECT s.* FROM sprints s
      JOIN workspaces w ON s.workspace_id = w.id
      WHERE s.id = ? AND w.org_id = ?
    `).get(req.params.id, orgId);

    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    await prepare(`
      UPDATE sprints SET
        name = COALESCE(?, name),
        goal = COALESCE(?, goal),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date)
      WHERE id = ?
    `).run(name ?? null, goal ?? null, start_date ?? null, end_date ?? null, req.params.id);

    const updated = await prepare('SELECT * FROM sprints WHERE id = ?').get(req.params.id);

    const io = req.app.get('io');
    if (io) io.to(`workspace:${sprint.workspace_id}`).emit('sprint:updated', updated);

    res.json(updated);
  } catch (err) {
    console.error('v1 Sprint update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/v1/sprints/:id/status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const { status, transferSprintId } = req.body;

    if (!status || !VALID_SPRINT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const sprint = await prepare(`
      SELECT s.* FROM sprints s
      JOIN workspaces w ON s.workspace_id = w.id
      WHERE s.id = ? AND w.org_id = ?
    `).get(req.params.id, orgId);

    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    // Handle rollover if sprint is completed
    if (status === 'completed') {
      let targetSprintId = null;
      if (transferSprintId) {
        const targetSprint = await prepare(
          'SELECT id FROM sprints WHERE id = ? AND workspace_id = ?'
        ).get(transferSprintId, sprint.workspace_id);
        if (targetSprint) {
          targetSprintId = targetSprint.id;
        }
      }

      // Bulk move tasks that are NOT done
      await prepare(`
        UPDATE tasks
        SET sprint_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE sprint_id = ?
          AND (
            (workflow_stage_id IS NOT NULL AND workflow_stage_id NOT IN (
              SELECT id FROM workflow_stages WHERE workspace_id = ? AND is_done_state = 1
            ))
            OR
            (workflow_stage_id IS NULL AND status != 'done')
          )
      `).run(targetSprintId, sprint.id, sprint.workspace_id);

      // Log activity
      const destName = targetSprintId ? `Sprint #${targetSprintId}` : 'backlog';
      await prepare(
        'INSERT INTO activities (user_id, action, details, org_id, workspace_id, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        req.user.id,
        'completed',
        `Sprint "${sprint.name}" completed. Incomplete tasks moved to ${destName}.`,
        orgId,
        sprint.workspace_id,
        'sprint',
        sprint.id
      );
    }

    await prepare('UPDATE sprints SET status = ? WHERE id = ?').run(status, req.params.id);
    const updated = await prepare('SELECT * FROM sprints WHERE id = ?').get(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${sprint.workspace_id}`).emit('sprint:updated', updated);
      // Trigger a task refresh for connected clients since tasks sprint_id changed
      io.to(`workspace:${sprint.workspace_id}`).emit('tasks:refresh');
    }

    res.json(updated);
  } catch (err) {
    console.error('v1 Sprint status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/sprints/:id/tasks
 */
router.get('/:id/tasks', async (req, res) => {
  try {
    const { orgId } = req.tenant;

    const sprint = await prepare(`
      SELECT s.id FROM sprints s
      JOIN workspaces w ON s.workspace_id = w.id
      WHERE s.id = ? AND w.org_id = ?
    `).get(req.params.id, orgId);

    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    const tasks = await prepare(`
      SELECT t.*, u.name as assigned_name, u.avatar_color
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.sprint_id = ? AND t.org_id = ?
      ORDER BY t.updated_at DESC
    `).all(req.params.id, orgId);

    res.json(tasks);
  } catch (err) {
    console.error('v1 Sprint tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
