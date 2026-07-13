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
      
      const updatedMilestones = await prepare('SELECT * FROM milestones WHERE workspace_id = ? AND org_id = ? ORDER BY target_time ASC').all(existing.workspace_id, orgId);
      io.to(room).emit('milestone:updated', updatedMilestones); // Send full list
    }

    // Auto-sync back to task
    if (milestone.task_id) {
      const statusStr = milestone.is_completed === 1 ? 'done' : 'in-progress';
      const wsSub = '(SELECT workspace_id FROM tasks WHERE id = ?)';
      let stageMatch = await prepare(
        `SELECT id FROM workflow_stages WHERE workspace_id = ${wsSub} AND slug = ?`
      ).get(milestone.task_id, statusStr);
      
      if (!stageMatch) {
        if (statusStr === 'done') {
          stageMatch = await prepare(
            `SELECT id FROM workflow_stages WHERE workspace_id = ${wsSub} AND is_done_state = 1 ORDER BY position LIMIT 1`
          ).get(milestone.task_id);
        } else {
          stageMatch = await prepare(
            `SELECT id FROM workflow_stages WHERE workspace_id = ${wsSub} AND (slug LIKE '%progress%' OR slug LIKE '%devam%' OR slug LIKE '%surec%' OR slug LIKE '%calisil%' OR slug LIKE '%active%') ORDER BY position LIMIT 1`
          ).get(milestone.task_id);
        }
      }

      const workflowStageSql = stageMatch ? `, workflow_stage_id = ${stageMatch.id}` : '';

      await prepare(`
        UPDATE tasks SET
          title = ?,
          description = ?,
          due_date = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
          ${workflowStageSql}
        WHERE id = ? AND org_id = ?
      `).run(
        milestone.title,
        milestone.description || '',
        milestone.target_time,
        statusStr,
        milestone.task_id,
        orgId
      );

      // Emit socket update for the task
      const task = await prepare('SELECT * FROM tasks WHERE id = ?').get(milestone.task_id);
      if (io && task) {
        const assignees = await prepare(`
          SELECT u.id, u.name, u.avatar_color, u.role
          FROM task_assignees ta
          JOIN users u ON ta.user_id = u.id
          WHERE ta.task_id = ?
        `).all(task.id);
        task.assignees = assignees;

        const room = task.workspace_id ? `workspace:${task.workspace_id}` : `tenant:${orgId}`;
        io.to(room).emit('task:updated', task);
      }
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
      const updatedMilestones = await prepare('SELECT * FROM milestones WHERE workspace_id = ? AND org_id = ? ORDER BY target_time ASC').all(existing.workspace_id, orgId);
      io.to(room).emit('milestone:updated', updatedMilestones);
    }

    // Auto-sync: delete linked task
    if (existing.task_id) {
      await prepare('DELETE FROM subtasks WHERE task_id = ?').run(existing.task_id);
      await prepare('DELETE FROM comments WHERE task_id = ?').run(existing.task_id);
      await prepare('DELETE FROM task_tags WHERE task_id = ?').run(existing.task_id);
      await prepare('DELETE FROM task_assignees WHERE task_id = ?').run(existing.task_id);
      await prepare('DELETE FROM tasks WHERE id = ?').run(existing.task_id);

      if (io) {
        const room = existing.workspace_id ? `workspace:${existing.workspace_id}` : `tenant:${orgId}`;
        io.to(room).emit('task:deleted', { id: existing.task_id });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('v1 Milestone delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
