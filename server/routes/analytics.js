import { Router } from 'express';
import { prepare } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const taskStatusDist = prepare(`
    SELECT status, COUNT(*) as count FROM tasks GROUP BY status
  `).all();

  const tasksByUser = prepare(`
    SELECT u.name, u.id, COUNT(t.id) as total,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed
    FROM users u
    LEFT JOIN tasks t ON u.id = t.assigned_to
    WHERE u.is_deleted = 0
    GROUP BY u.id
  `).all();

  const hourlyProductivity = prepare(`
    SELECT
      strftime('%H', created_at) as hour,
      COUNT(*) as completed
    FROM tasks
    WHERE status = 'done'
    GROUP BY hour
    ORDER BY hour
  `).all();

  const totalTasks = prepare('SELECT COUNT(*) as total FROM tasks').get();
  const doneTasks = prepare("SELECT COUNT(*) as done FROM tasks WHERE status = 'done'").get();
  const progress = totalTasks.total > 0 ? Math.round((doneTasks.done / totalTasks.total) * 100) : 0;

  res.json({
    taskStatusDist,
    tasksByUser,
    hourlyProductivity,
    progress,
    totalTasks: totalTasks.total,
    doneTasks: doneTasks.done,
  });
});

export default router;
