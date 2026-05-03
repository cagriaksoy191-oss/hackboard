import { Router } from 'express';
import { prepare, DB_MODE } from '../db-adapter.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const taskStatusDist = await prepare(`
      SELECT status, COUNT(*) as count FROM tasks GROUP BY status
    `).all();

    const tasksByUser = await prepare(`
      SELECT u.name, u.id, COUNT(t.id) as total,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to
      WHERE u.is_deleted = 0
      GROUP BY u.id
    `).all();

    // strftime is SQLite-only; EXTRACT is PostgreSQL-native
    const hourExpr = DB_MODE === 'postgresql'
      ? "EXTRACT(HOUR FROM created_at)::int"
      : "strftime('%H', created_at)";

    const hourlyProductivity = await prepare(`
      SELECT
        ${hourExpr} as hour,
        COUNT(*) as completed
      FROM tasks
      WHERE status = 'done'
      GROUP BY hour
      ORDER BY hour
    `).all();

    const taskStats = await prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done FROM tasks"
    ).get();

    const totalTasksCount = parseInt(taskStats.total) || 0;
    const doneTasksCount = parseInt(taskStats.done) || 0;
    const progress = totalTasksCount > 0 ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0;

    res.json({
      taskStatusDist,
      tasksByUser,
      hourlyProductivity,
      progress,
      totalTasks: totalTasksCount,
      doneTasks: doneTasksCount,
    });
  } catch (err) {
    console.error('Analytics fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
