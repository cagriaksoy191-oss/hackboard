import { Router } from 'express';
import { prepare } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const users = prepare('SELECT * FROM users ORDER BY id').all();
  res.json(users);
});

router.patch('/:id/status', (req, res) => {
  const { is_online } = req.body;
  prepare('UPDATE users SET is_online = ? WHERE id = ?').run(is_online ? 1 : 0, req.params.id);
  const user = prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(user);
});

export default router;
