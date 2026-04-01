import { Router } from 'express';
import { prepare } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const activities = prepare(`
    SELECT a.*, u.name, u.avatar_color
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 50
  `).all();
  res.json(activities);
});

export default router;
