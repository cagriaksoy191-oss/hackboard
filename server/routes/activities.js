import { Router } from 'express';
import { prepare } from '../db-adapter.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const activities = await prepare(`
      SELECT a.*, u.name, u.avatar_color
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 50
    `).all();
    res.json(activities);
  } catch (err) {
    console.error('Activities fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
