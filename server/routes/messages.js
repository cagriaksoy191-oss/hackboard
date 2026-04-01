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
  const result = prepare('INSERT INTO messages (user_id, content) VALUES (?, ?)').run(user_id, content);
  const message = prepare(`
    SELECT m.*, u.name, u.avatar_color
    FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(message);
});

export default router;
