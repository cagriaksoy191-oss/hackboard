import { Router } from 'express';
import { prepare } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const tasks = prepare(`
    SELECT t.*, u.name as assigned_name, u.avatar_color
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    ORDER BY t.updated_at DESC
  `).all();
  res.json(tasks);
});

router.post('/', (req, res) => {
  const { title, description, status, priority, assigned_to, estimated_hours, user_id } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const trimmedTitle = title.trim();

  const result = prepare(
    'INSERT INTO tasks (title, description, status, priority, assigned_to, estimated_hours) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(trimmedTitle, description || '', status || 'todo', priority || 'medium', assigned_to || null, estimated_hours || 0);

  prepare('INSERT INTO activities (user_id, action, details) VALUES (?, ?, ?)').run(
    user_id || assigned_to || 1, 'created', `Task: ${trimmedTitle}`
  );

  const task = prepare(`
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
});

router.put('/:id', (req, res) => {
  const { title, description, priority, assigned_to, estimated_hours } = req.body;

  const existing = prepare('SELECT updated_at FROM tasks WHERE id = ?').get(req.params.id);
  if (existing && req.body.updated_at && existing.updated_at > req.body.updated_at) {
    const current = prepare(`
      SELECT t.*, u.name as assigned_name, u.avatar_color
      FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
    `).get(req.params.id);
    return res.status(409).json({ conflict: true, currentTask: current });
  }

  prepare(
    'UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description), priority = COALESCE(?, priority), assigned_to = COALESCE(?, assigned_to), estimated_hours = COALESCE(?, estimated_hours), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(title, description, priority, assigned_to, estimated_hours, req.params.id);

  const task = prepare(`
    SELECT t.*, u.name as assigned_name, u.avatar_color
    FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
  `).get(req.params.id);

  const io = req.app.get('io');
  if (io) {
    io.emit('task:updated', task);
  }

  res.json(task);
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const existing = prepare('SELECT updated_at FROM tasks WHERE id = ?').get(req.params.id);
  if (existing && req.body.updated_at && existing.updated_at > req.body.updated_at) {
    const current = prepare(`
      SELECT t.*, u.name as assigned_name, u.avatar_color
      FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
    `).get(req.params.id);
    return res.status(409).json({ conflict: true, currentTask: current });
  }

  prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

  const task = prepare(`
    SELECT t.*, u.name as assigned_name, u.avatar_color
    FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
  `).get(req.params.id);

  res.json(task);
});

router.delete('/:id', (req, res) => {
  const task = prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  prepare('DELETE FROM subtasks WHERE task_id = ?').run(req.params.id);
  prepare('DELETE FROM comments WHERE task_id = ?').run(req.params.id);
  prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (task) {
    prepare('INSERT INTO activities (user_id, action, details) VALUES (?, ?, ?)').run(
      req.body.user_id || 1, 'deleted', `Task "${task.title}" deleted`
    );
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('task:deleted', { id: req.params.id });
  }

  res.json({ success: true });
});

router.get('/:id/subtasks', (req, res) => {
  const subtasks = prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY id').all(req.params.id);
  res.json(subtasks);
});

router.post('/:id/subtasks', (req, res) => {
  const { title } = req.body;
  const result = prepare('INSERT INTO subtasks (task_id, title) VALUES (?, ?)').run(req.params.id, title);
  const subtask = prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid);

  const io = req.app.get('io');
  if (io) {
    io.emit('subtask:created', { taskId: parseInt(req.params.id), subtask });
  }

  res.status(201).json(subtask);
});

router.get('/:id/comments', (req, res) => {
  const comments = prepare(`
    SELECT c.*, u.name, u.avatar_color
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

router.post('/:id/comments', (req, res) => {
  const { user_id, content } = req.body;
  const result = prepare('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)').run(req.params.id, user_id, content);
  const comment = prepare(`
    SELECT c.*, u.name, u.avatar_color
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(result.lastInsertRowid);

  const io = req.app.get('io');
  if (io) {
    io.emit('comment:added', { taskId: parseInt(req.params.id), comment });
  }

  res.status(201).json(comment);
});

router.patch('/subtasks/:id/toggle', (req, res) => {
  const subtask = prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);
  prepare('UPDATE subtasks SET is_completed = ? WHERE id = ?').run(subtask.is_completed ? 0 : 1, req.params.id);
  const updated = prepare('SELECT * FROM subtasks WHERE id = ?').get(req.params.id);

  const io = req.app.get('io');
  if (io) {
    io.emit('subtask:toggled', { taskId: subtask.task_id, subtaskId: subtask.id, is_completed: updated.is_completed });
  }

  res.json(updated);
});

export default router;
