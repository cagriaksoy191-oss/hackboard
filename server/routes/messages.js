import { Router } from 'express';
import { prepare } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const messages = prepare(`
    SELECT m.*, u.name, u.avatar_color
    FROM messages m
    JOIN users u ON m.user_id = u.id
    ORDER BY m.created_at ASC
  `).all();
  res.json(messages);
});

router.post('/', (req, res) => {
  const { user_id, content } = req.body;

  if (!user_id || !Number.isInteger(user_id)) {
    return res.status(400).json({ error: 'Valid user_id is required' });
  }

  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'Valid content is required' });
  }

  const result = prepare('INSERT INTO messages (user_id, content) VALUES (?, ?)').run(user_id, content);
  const message = prepare(`
    SELECT m.*, u.name, u.avatar_color
    FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(message);
});

export default router;
