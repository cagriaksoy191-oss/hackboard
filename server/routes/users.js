import { Router } from 'express';
import { prepare } from '../db-adapter.js';

const router = Router();

const avatarColors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', 
  '#ec4899', '#f43f5e', '#64748b', '#737373', '#a1a1aa'
];

router.get('/', async (req, res) => {
  try {
    const users = await prepare('SELECT * FROM users WHERE is_deleted = 0 ORDER BY id').all();
    res.json(users);
  } catch (err) {
    console.error('Users fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, role, avatar_color } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }
    const color = avatar_color || avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const result = await prepare('INSERT INTO users (name, role, avatar_color, is_online) VALUES (?, ?, ?, 1)').run(name, role, color);
    const user = await prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    
    const io = req.app.get('io');
    if (io) io.emit('user:created', user);

    res.status(201).json(user);
  } catch (err) {
    console.error('User create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    await prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.params.id);
    const user = await prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    
    const io = req.app.get('io');
    if (io) io.emit('user:updated', user);

    res.json(user);
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    // Soft delete user
    await prepare('UPDATE users SET is_deleted = 1, is_online = 0 WHERE id = ?').run(userId);
    // Unassign tasks assigned to this user
    await prepare('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = ?').run(userId);
    
    const io = req.app.get('io');
    if (io) {
      io.emit('user:deleted', { id: parseInt(userId) });
      // Notify clients that some tasks might have been updated (unassigned)
      io.emit('tasks:refresh');
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { is_online } = req.body;
    await prepare('UPDATE users SET is_online = ? WHERE id = ?').run(is_online ? 1 : 0, req.params.id);
    const user = await prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  } catch (err) {
    console.error('User status update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
