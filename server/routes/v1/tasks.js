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
import { queueEmbedding } from '../../embedding-worker.js';

const router = Router();

// Helper: Sync Milestone status when a task is completed or moved
async function syncMilestoneStatus(taskId, status, orgId, io) {
  try {
    const isCompletedVal = status === 'done' ? 1 : 0;
    const milestone = await prepare('SELECT id, workspace_id FROM milestones WHERE task_id = ? AND org_id = ?').get(taskId, orgId);
    if (milestone) {
      await prepare('UPDATE milestones SET is_completed = ?, notified_overdue = 0 WHERE task_id = ? AND org_id = ?').run(isCompletedVal, taskId, orgId);
      if (io) {
        const room = milestone.workspace_id ? `workspace:${milestone.workspace_id}` : `tenant:${orgId}`;
        const updatedMilestones = await prepare('SELECT * FROM milestones WHERE workspace_id = ? AND org_id = ? ORDER BY target_time ASC').all(milestone.workspace_id, orgId);
        io.to(room).emit('milestone:updated', updatedMilestones);
      }
    }
  } catch (err) {
    console.error('Error syncing milestone status:', err);
  }
}

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
    if (req.body.workspace_id) {
      const ws = await prepare('SELECT id FROM workspaces WHERE id = ? AND org_id = ?').get(req.body.workspace_id, orgId);
      if (!ws) {
        return res.status(403).json({ error: 'Workspace not found or unauthorized' });
      }
    }
    if (sprint_id) {
      const sprint = await prepare('SELECT s.id FROM sprints s JOIN workspaces w ON s.workspace_id = w.id WHERE s.id = ? AND w.org_id = ?').get(sprint_id, orgId);
      if (!sprint) {
        return res.status(403).json({ error: 'Sprint not found or unauthorized' });
      }
    }
    if (workflow_stage_id) {
      const stage = await prepare('SELECT ws.id FROM workflow_stages ws JOIN workspaces w ON ws.workspace_id = w.id WHERE ws.id = ? AND w.org_id = ?').get(workflow_stage_id, orgId);
      if (!stage) {
        return res.status(403).json({ error: 'Workflow stage not found or unauthorized' });
      }
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

    // Queue new task for RAG indexing
    queueEmbedding('task', task.id).catch(() => {});

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
      estimated_hours, sprint_id, workflow_stage_id, content_type, version, workspace_id
    } = req.body;

    if (version === undefined || version === null || typeof version !== 'number') {
      return res.status(400).json({ error: 'version is required' });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    if (workspace_id) {
      const ws = await prepare('SELECT id FROM workspaces WHERE id = ? AND org_id = ?').get(workspace_id, orgId);
      if (!ws) {
        return res.status(403).json({ error: 'Workspace not found or unauthorized' });
      }
    }
    if (sprint_id) {
      const sprint = await prepare('SELECT s.id FROM sprints s JOIN workspaces w ON s.workspace_id = w.id WHERE s.id = ? AND w.org_id = ?').get(sprint_id, orgId);
      if (!sprint) {
        return res.status(403).json({ error: 'Sprint not found or unauthorized' });
      }
    }
    if (workflow_stage_id) {
      const stage = await prepare('SELECT ws.id FROM workflow_stages ws JOIN workspaces w ON ws.workspace_id = w.id WHERE ws.id = ? AND w.org_id = ?').get(workflow_stage_id, orgId);
      if (!stage) {
        return res.status(403).json({ error: 'Workflow stage not found or unauthorized' });
      }
    }

    const fieldsToUpdate = [];
    const params = [];

    const allowedFields = [
      'title',
      'description',
      'status',
      'priority',
      'assigned_to',
      'estimated_hours',
      'sprint_id',
      'workflow_stage_id',
      'content_type',
      'workspace_id'
    ];

    for (const field of allowedFields) {
      if (field in req.body) {
        fieldsToUpdate.push(`${field} = ?`);
        let val = req.body[field];
        if (field === 'assigned_to' || field === 'sprint_id' || field === 'workflow_stage_id' || field === 'workspace_id') {
          params.push(val === null || val === undefined ? null : Number(val));
        } else if (field === 'estimated_hours') {
          params.push(val === null || val === undefined ? 0 : Number(val));
        } else if (field === 'title') {
          params.push(val === null || val === undefined ? '' : String(val).trim());
        } else {
          params.push(val === null || val === undefined ? null : val);
        }
      }
    }

    fieldsToUpdate.push('version = version + 1');
    fieldsToUpdate.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `
      UPDATE tasks SET
        ${fieldsToUpdate.join(', ')}
      WHERE id = ? AND org_id = ? AND version = ?
    `;
    params.push(req.params.id, orgId, version);

    const result = await prepare(sql).run(...params);

    if (result.changes === 0) {
      const exists = await prepare('SELECT id FROM tasks WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
      if (!exists) {
        return res.status(404).json({ error: 'Task not found' });
      }
      const current = await prepare(`${TASK_SELECT} WHERE t.id = ?`).get(req.params.id);
      return res.status(409).json({
        conflict: true,
        message: 'Task was modified by another user',
        currentTask: current,
        yourVersion: version,
        currentVersion: current ? current.version : undefined
      });
    }

    const task = await prepare(`${TASK_SELECT} WHERE t.id = ?`).get(req.params.id);

    const io = req.app.get('io');
    if (io) {
      const room = task.workspace_id ? `workspace:${task.workspace_id}` : `tenant:${orgId}`;
      io.to(room).emit('task:updated', task);
    }

    // Sync Milestone status if linked
    if (task.status) {
      await syncMilestoneStatus(task.id, task.status, orgId, io);
    }

    // Queue for RAG re-indexing
    queueEmbedding('task', task.id).catch(() => {});

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

    if (version === undefined || version === null || typeof version !== 'number') {
      return res.status(400).json({ error: 'version is required' });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const result = await prepare(
      'UPDATE tasks SET status = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND org_id = ? AND version = ?'
    ).run(status, req.params.id, orgId, version);

    if (result.changes === 0) {
      const exists = await prepare('SELECT id FROM tasks WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
      if (!exists) {
        return res.status(404).json({ error: 'Task not found' });
      }
      const current = await prepare(`${TASK_SELECT} WHERE t.id = ?`).get(req.params.id);
      return res.status(409).json({
        conflict: true,
        message: 'Task was modified by another user',
        currentTask: current,
        yourVersion: version,
        currentVersion: current ? current.version : undefined
      });
    }

    // Sync workflow_stage_id if mapping exists
    let stageMatch = await prepare(
      'SELECT id FROM workflow_stages WHERE workspace_id = (SELECT workspace_id FROM tasks WHERE id = ?) AND slug = ?'
    ).get(req.params.id, status);

    if (!stageMatch) {
      const wsSub = '(SELECT workspace_id FROM tasks WHERE id = ?)';
      if (status === 'done') {
        stageMatch = await prepare(
          `SELECT id FROM workflow_stages WHERE workspace_id = ${wsSub} AND is_done_state = 1 ORDER BY position LIMIT 1`
        ).get(req.params.id);
      } else if (status === 'todo') {
        stageMatch = await prepare(
          `SELECT id FROM workflow_stages WHERE workspace_id = ${wsSub} AND (slug LIKE '%todo%' OR slug LIKE '%yapilacak%' OR slug LIKE '%yapilacaklar%') ORDER BY position LIMIT 1`
        ).get(req.params.id);
      } else if (status === 'testing') {
        stageMatch = await prepare(
          `SELECT id FROM workflow_stages WHERE workspace_id = ${wsSub} AND (slug LIKE '%test%' OR slug LIKE '%deneme%') ORDER BY position LIMIT 1`
        ).get(req.params.id);
      } else if (status === 'in-progress') {
        stageMatch = await prepare(
          `SELECT id FROM workflow_stages WHERE workspace_id = ${wsSub} AND (slug LIKE '%progress%' OR slug LIKE '%devam%' OR slug LIKE '%surec%' OR slug LIKE '%calisil%' OR slug LIKE '%active%') ORDER BY position LIMIT 1`
        ).get(req.params.id);
      }
    }

    if (stageMatch) {
      await prepare('UPDATE tasks SET workflow_stage_id = ? WHERE id = ?').run(stageMatch.id, req.params.id);
    }

    const task = await prepare(`${TASK_SELECT} WHERE t.id = ?`).get(req.params.id);

    // Log activity
    await prepare(
      'INSERT INTO activities (user_id, action, details, org_id, workspace_id, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, 'moved', `Task "${task.title}" → ${status}`, orgId, task.workspace_id, 'task', task.id);

    const io = req.app.get('io');
    if (io) {
      const room = task.workspace_id ? `workspace:${task.workspace_id}` : `tenant:${orgId}`;
      io.to(room).emit('task:moved', task);
    }

    // Sync Milestone status if linked
    if (task.status) {
      await syncMilestoneStatus(task.id, task.status, orgId, io);
    }

    // Queue for RAG re-indexing (status change affects search metadata)
    queueEmbedding('task', task.id).catch(() => {});

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

    // Queue comment for RAG vector indexing (explicit over implicit DEFAULT)
    queueEmbedding('comment', comment.id).catch(() => {});

    res.status(201).json(comment);
  } catch (err) {
    console.error('v1 Comment create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
