/**
 * v1/tasks.js — Tenant-Aware Task CRUD with Optimistic Locking
 *
 * All queries filter by req.tenant.orgId.
 * Optional workspace_id filter via req.tenant.workspaceId or query param.
 * Version-based optimistic locking on PUT/PATCH.
 * Room-scoped Socket.IO broadcasts.
 */

import { Router } from 'express';
import { prepare, VALID_STATUSES, VALID_PRIORITIES } from '../../db-adapter.js';

const router = Router();

// Helper: get tenant-scoped task with joins
const TASK_SELECT = `
  SELECT t.*, u.name as assigned_name, u.avatar_color,
         ws.name as workflow_stage_name, ws.color as workflow_stage_color
  FROM tasks t
  LEFT JOIN users u ON t.assigned_to = u.id
  LEFT JOIN workflow_stages ws ON t.workflow_stage_id = ws.id
`;

/**
 * GET /api/v1/tasks
 * Query params: ?workspace_id, ?sprint_id, ?status, ?assigned_to, ?embedding_status
 */
router.get('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const { sprint_id, status, assigned_to, embedding_status } = req.query;

    let sql = `${TASK_SELECT} WHERE t.org_id = ?`;
    const params = [orgId];

    const wsId = req.query.workspace_id || workspaceId;
    if (wsId) {
      sql += ' AND t.workspace_id = ?';
      params.push(wsId);
    }
    if (sprint_id) {
      sql += ' AND t.sprint_id = ?';
      params.push(sprint_id);
    }
    if (status && VALID_STATUSES.includes(status)) {
      sql += ' AND t.status = ?';
      params.push(status);
    }
    if (assigned_to) {
      sql += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }
    if (embedding_status) {
      sql += ' AND t.embedding_status = ?';
      params.push(embedding_status);
    }

    sql += ' ORDER BY t.updated_at DESC';

    const tasks = await prepare(sql).all(...params);
    res.json(tasks);
  } catch (err) {
    console.error('v1 Tasks fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/tasks/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const task = await prepare(
      `${TASK_SELECT} WHERE t.id = ? AND t.org_id = ?`
    ).get(req.params.id, req.tenant.orgId);

    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    console.error('v1 Task fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/tasks
 */
router.post('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const {
      title, description, status, priority, assigned_to,
      estimated_hours, sprint_id, workflow_stage_id, content_type
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const wsId = workspaceId || req.body.workspace_id;

    const result = await prepare(`
      INSERT INTO tasks (title, description, status, priority, assigned_to, estimated_hours,
                         org_id, workspace_id, sprint_id, workflow_stage_id, content_type, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      title.trim(), description || '', status || 'todo', priority || 'medium',
      assigned_to || null, estimated_hours || 0,
      orgId, wsId || null, sprint_id || null, workflow_stage_id || null,
      content_type || 'plain'
    );

    // Log activity with entity metadata
    await prepare(
      'INSERT INTO activities (user_id, action, details, org_id, workspace_id, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, 'created', `Task: ${title.trim()}`, orgId, wsId || null, 'task', result.lastInsertRowid);

    const task = await prepare(
      `${TASK_SELECT} WHERE t.id = ?`
    ).get(result.lastInsertRowid);

    // Room-scoped broadcast
    const io = req.app.get('io');
    if (io) {
      const room = wsId ? `workspace:${wsId}` : `tenant:${orgId}`;
      io.to(room).emit('task:created', task);

      if (assigned_to) {
        io.to(room).emit('notification:new', {
          id: Date.now(),
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `New task assigned: ${title.trim()}`,
          taskId: task.id,
          assignedTo: assigned_to,
          senderId: req.user.id,
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    res.status(201).json(task);
  } catch (err) {
    console.error('v1 Task create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/tasks/:id
 * Optimistic locking via version field
 */
router.put('/:id', async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const {
      title, description, status, priority, assigned_to,
      estimated_hours, sprint_id, workflow_stage_id, content_type, version
    } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    // Tenant check
    const existing = await prepare(
      'SELECT id, version FROM tasks WHERE id = ? AND org_id = ?'
    ).get(req.params.id, orgId);

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Optimistic lock check
    if (version !== undefined && version !== null && existing.version !== version) {
      const current = await prepare(`${TASK_SELECT} WHERE t.id = ?`).get(req.params.id);
      return res.status(409).json({
        conflict: true,
        message: 'Task was modified by another user',
        currentTask: current,
        yourVersion: version,
        currentVersion: existing.version
      });
    }

    await prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        assigned_to = COALESCE(?, assigned_to),
        estimated_hours = COALESCE(?, estimated_hours),
        sprint_id = COALESCE(?, sprint_id),
        workflow_stage_id = COALESCE(?, workflow_stage_id),
        content_type = COALESCE(?, content_type),
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND org_id = ?
    `).run(
      title ?? null, description ?? null, status ?? null, priority ?? null,
      assigned_to ?? null, estimated_hours ?? null,
      sprint_id ?? null, workflow_stage_id ?? null, content_type ?? null,
      req.params.id, orgId
    );

    const task = await prepare(`${TASK_SELECT} WHERE t.id = ?`).get(req.params.id);

    const io = req.app.get('io');
    if (io) {
      const room = task.workspace_id ? `workspace:${task.workspace_id}` : `tenant:${orgId}`;
      io.to(room).emit('task:updated', task);
    }

    res.json(task);
  } catch (err) {
    console.error('v1 Task update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/v1/tasks/:id/status
 * Quick status change with optimistic locking
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const { status, version } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const existing = await prepare(
      'SELECT id, version, title FROM tasks WHERE id = ? AND org_id = ?'
    ).get(req.params.id, orgId);

    if (!existing) return res.status(404).json({ error: 'Task not found' });

    if (version !== undefined && version !== null && existing.version !== version) {
      const current = await prepare(`${TASK_SELECT} WHERE t.id = ?`).get(req.params.id);
      return res.status(409).json({ conflict: true, currentTask: current });
    }

    await prepare(
      'UPDATE tasks SET status = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND org_id = ?'
    ).run(status, req.params.id, orgId);

    // Sync workflow_stage_id if mapping exists
    const stageMatch = await prepare(
      'SELECT id FROM workflow_stages WHERE workspace_id = (SELECT workspace_id FROM tasks WHERE id = ?) AND slug = ?'
    ).get(req.params.id, status);
    if (stageMatch) {
      await prepare('UPDATE tasks SET workflow_stage_id = ? WHERE id = ?').run(stageMatch.id, req.params.id);
    }

    const task = await prepare(`${TASK_SELECT} WHERE t.id = ?`).get(req.params.id);

    // Log activity
    await prepare(
      'INSERT INTO activities (user_id, action, details, org_id, workspace_id, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, 'moved', `Task "${existing.title}" → ${status}`, orgId, task.workspace_id, 'task', task.id);

    const io = req.app.get('io');
    if (io) {
      const room = task.workspace_id ? `workspace:${task.workspace_id}` : `tenant:${orgId}`;
      io.to(room).emit('task:moved', task);
    }

    res.json(task);
  } catch (err) {
    console.error('v1 Task status update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/tasks/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const task = await prepare('SELECT * FROM tasks WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Manual CASCADE for SQLite compat
    await prepare('DELETE FROM subtasks WHERE task_id = ?').run(req.params.id);
    await prepare('DELETE FROM comments WHERE task_id = ?').run(req.params.id);
    await prepare('DELETE FROM task_tags WHERE task_id = ?').run(req.params.id);
    await prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);

    await prepare(
      'INSERT INTO activities (user_id, action, details, org_id, workspace_id, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, 'deleted', `Task "${task.title}" deleted`, orgId, task.workspace_id, 'task', task.id);

    const io = req.app.get('io');
    if (io) {
      const room = task.workspace_id ? `workspace:${task.workspace_id}` : `tenant:${orgId}`;
      io.to(room).emit('task:deleted', { id: req.params.id });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('v1 Task delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Subtasks ───

router.get('/:id/subtasks', async (req, res) => {
  try {
    // Verify task belongs to tenant
    const task = await prepare('SELECT id FROM tasks WHERE id = ? AND org_id = ?').get(req.params.id, req.tenant.orgId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const subtasks = await prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY id').all(req.params.id);
    res.json(subtasks);
  } catch (err) {
    console.error('v1 Subtasks fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/subtasks', async (req, res) => {
  try {
    const task = await prepare('SELECT id, workspace_id FROM tasks WHERE id = ? AND org_id = ?').get(req.params.id, req.tenant.orgId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { title, assigned_to, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const result = await prepare(
      'INSERT INTO subtasks (task_id, title, assigned_to, due_date) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, title, assigned_to || null, due_date || null);

    const subtask = await prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid);

    const io = req.app.get('io');
    if (io) {
      const room = task.workspace_id ? `workspace:${task.workspace_id}` : `tenant:${req.tenant.orgId}`;
      io.to(room).emit('subtask:created', { taskId: parseInt(req.params.id), subtask });
    }

    res.status(201).json(subtask);
  } catch (err) {
    console.error('v1 Subtask create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/subtasks/:id/toggle', async (req, res) => {
  try {
    const subtask = await prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);
    if (!subtask) return res.status(404).json({ error: 'Subtask not found' });

    // Verify parent task belongs to tenant
    const task = await prepare('SELECT id, workspace_id FROM tasks WHERE id = ? AND org_id = ?').get(subtask.task_id, req.tenant.orgId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await prepare('UPDATE subtasks SET is_completed = ? WHERE id = ?').run(subtask.is_completed ? 0 : 1, req.params.id);
    const updated = await prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);

    const io = req.app.get('io');
    if (io) {
      const room = task.workspace_id ? `workspace:${task.workspace_id}` : `tenant:${req.tenant.orgId}`;
      io.to(room).emit('subtask:toggled', { taskId: subtask.task_id, subtaskId: subtask.id, is_completed: updated.is_completed });
    }

    res.json(updated);
  } catch (err) {
    console.error('v1 Subtask toggle error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Comments ───

router.get('/:id/comments', async (req, res) => {
  try {
    const task = await prepare('SELECT id FROM tasks WHERE id = ? AND org_id = ?').get(req.params.id, req.tenant.orgId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const comments = await prepare(`
      SELECT c.*, u.name, u.avatar_color
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ? ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json(comments);
  } catch (err) {
    console.error('v1 Comments fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const task = await prepare('SELECT id, workspace_id FROM tasks WHERE id = ? AND org_id = ?').get(req.params.id, req.tenant.orgId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { content, content_type } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const result = await prepare(
      'INSERT INTO comments (task_id, user_id, content, content_type) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, req.user.id, content, content_type || 'plain');

    const comment = await prepare(`
      SELECT c.*, u.name, u.avatar_color
      FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
    `).get(result.lastInsertRowid);

    const io = req.app.get('io');
    if (io) {
      const room = task.workspace_id ? `workspace:${task.workspace_id}` : `tenant:${req.tenant.orgId}`;
      io.to(room).emit('comment:added', { taskId: parseInt(req.params.id), comment });
    }

    res.status(201).json(comment);
  } catch (err) {
    console.error('v1 Comment create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
