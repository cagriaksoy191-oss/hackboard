import { Router } from 'express';
import { prepare } from '../db-adapter.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const messages = await prepare(`
      SELECT m.*, u.name, u.avatar_color
      FROM messages m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at ASC
    `).all();
    res.json(messages);
  } catch (err) {
    console.error('Messages fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { user_id, content } = req.body;

    if (!user_id || !Number.isInteger(user_id)) {
      return res.status(400).json({ error: 'Valid user_id is required' });
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ error: 'Valid content is required' });
    }

    const result = await prepare('INSERT INTO messages (user_id, content) VALUES (?, ?)').run(user_id, content);
    const message = await prepare(`
      SELECT m.*, u.name, u.avatar_color
      FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(message);
  } catch (err) {
    console.error('Message create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
