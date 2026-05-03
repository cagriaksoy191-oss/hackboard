import { Router } from 'express';
import { prepare, VALID_STATUSES, VALID_PRIORITIES } from '../db-adapter.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const tasks = await prepare(`
      SELECT t.*, u.name as assigned_name, u.avatar_color
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      ORDER BY t.updated_at DESC
    `).all();
    res.json(tasks);
  } catch (err) {
    console.error('Tasks fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, status, priority, assigned_to, estimated_hours, user_id } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const trimmedTitle = title.trim();

    const result = await prepare(
      'INSERT INTO tasks (title, description, status, priority, assigned_to, estimated_hours) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(trimmedTitle, description || '', status || 'todo', priority || 'medium', assigned_to || null, estimated_hours || 0);

    await prepare('INSERT INTO activities (user_id, action, details) VALUES (?, ?, ?)').run(
      user_id || assigned_to || 1, 'created', `Task: ${trimmedTitle}`
    );

    const task = await prepare(`
      SELECT t.*, u.name as assigned_name, u.avatar_color
      FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
    `).get(result.lastInsertRowid);

    const io = req.app.get('io');
    if (io) {
      io.emit('task:created', task);
      if (assigned_to) {
        io.emit('notification:new', {
          id: Date.now(),
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `New task assigned: ${trimmedTitle}`,
          taskId: task.id,
          taskTitle: task.title,
          assignedTo: assigned_to,
          senderId: user_id || 1,
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    res.status(201).json(task);
  } catch (err) {
    console.error('Task create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, assigned_to, estimated_hours } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const existing = await prepare('SELECT updated_at FROM tasks WHERE id = ?').get(req.params.id);
    if (existing && req.body.updated_at && existing.updated_at > req.body.updated_at) {
      const current = await prepare(`
        SELECT t.*, u.name as assigned_name, u.avatar_color
        FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
      `).get(req.params.id);
      return res.status(409).json({ conflict: true, currentTask: current });
    }

    await prepare(
      'UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description), status = COALESCE(?, status), priority = COALESCE(?, priority), assigned_to = COALESCE(?, assigned_to), estimated_hours = COALESCE(?, estimated_hours), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(title ?? null, description ?? null, status ?? null, priority ?? null, assigned_to ?? null, estimated_hours ?? null, req.params.id);

    const task = await prepare(`
      SELECT t.*, u.name as assigned_name, u.avatar_color
      FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
    `).get(req.params.id);

    const io = req.app.get('io');
    if (io) io.emit('task:updated', task);

    res.json(task);
  } catch (err) {
    console.error('Task update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const existing = await prepare('SELECT updated_at FROM tasks WHERE id = ?').get(req.params.id);
    if (existing && req.body.updated_at && existing.updated_at > req.body.updated_at) {
      const current = await prepare(`
        SELECT t.*, u.name as assigned_name, u.avatar_color
        FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
      `).get(req.params.id);
      return res.status(409).json({ conflict: true, currentTask: current });
    }

    await prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

    const task = await prepare(`
      SELECT t.*, u.name as assigned_name, u.avatar_color
      FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
    `).get(req.params.id);

    res.json(task);
  } catch (err) {
    console.error('Task status update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const task = await prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    // Manual CASCADE for SQLite compat; PG ON DELETE CASCADE handles this too
    await prepare('DELETE FROM subtasks WHERE task_id = ?').run(req.params.id);
    await prepare('DELETE FROM comments WHERE task_id = ?').run(req.params.id);
    await prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    if (task) {
      await prepare('INSERT INTO activities (user_id, action, details) VALUES (?, ?, ?)').run(
        req.body.user_id || 1, 'deleted', `Task "${task.title}" deleted`
      );
    }

    const io = req.app.get('io');
    if (io) io.emit('task:deleted', { id: req.params.id });

    res.json({ success: true });
  } catch (err) {
    console.error('Task delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/subtasks', async (req, res) => {
  try {
    const subtasks = await prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY id').all(req.params.id);
    res.json(subtasks);
  } catch (err) {
    console.error('Subtasks fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/subtasks', async (req, res) => {
  try {
    const { title } = req.body;
    const result = await prepare('INSERT INTO subtasks (task_id, title) VALUES (?, ?)').run(req.params.id, title);
    const subtask = await prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid);

    const io = req.app.get('io');
    if (io) io.emit('subtask:created', { taskId: parseInt(req.params.id), subtask });

    res.status(201).json(subtask);
  } catch (err) {
    console.error('Subtask create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await prepare(`
      SELECT c.*, u.name, u.avatar_color
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json(comments);
  } catch (err) {
    console.error('Comments fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const { user_id, content } = req.body;
    const result = await prepare('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)').run(req.params.id, user_id, content);
    const comment = await prepare(`
      SELECT c.*, u.name, u.avatar_color
      FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
    `).get(result.lastInsertRowid);

    const io = req.app.get('io');
    if (io) io.emit('comment:added', { taskId: parseInt(req.params.id), comment });

    res.status(201).json(comment);
  } catch (err) {
    console.error('Comment create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/subtasks/:id/toggle', async (req, res) => {
  try {
    const subtask = await prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);
    await prepare('UPDATE subtasks SET is_completed = ? WHERE id = ?').run(subtask.is_completed ? 0 : 1, req.params.id);
    const updated = await prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);

    const io = req.app.get('io');
    if (io) io.emit('subtask:toggled', { taskId: subtask.task_id, subtaskId: subtask.id, is_completed: updated.is_completed });

    res.json(updated);
  } catch (err) {
    console.error('Subtask toggle error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
