import { Router } from 'express';
import { prepare } from '../db-adapter.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const notifications = await prepare(`
      SELECT a.*, u.name
      FROM activities a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(limit);

    const formatted = notifications.map((n) => {
      let type = 'activity';
      let title = 'Activity';
      if (n.action === 'created') {
        type = 'task_created';
        title = 'New Task';
      } else if (n.action === 'moved') {
        type = 'task_moved';
        title = 'Task Moved';
      } else if (n.action === 'deleted') {
        type = 'task_deleted';
        title = 'Task Deleted';
      }
      return {
        id: n.id,
        type,
        title,
        message: n.details,
        user_name: n.name,
        read: false,
        created_at: n.created_at,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Notifications fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/read', (req, res) => {
  res.json({ success: true });
});

export default router;
