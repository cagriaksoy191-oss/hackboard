/**
 * v1/analytics.js — Workspace-Scoped Analytics with Sprint Support
 */

import { Router } from 'express';
import { prepare, DB_MODE } from '../../db-adapter.js';

const router = Router();

/**
 * GET /api/v1/analytics
 * Query: ?workspace_id, ?sprint_id
 */
router.get('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const wsId = req.query.workspace_id || workspaceId;
    const sprintId = req.query.sprint_id;

    // Base filter
    let taskFilter = 'WHERE t.org_id = ?';
    const filterParams = [orgId];

    if (wsId) {
      taskFilter += ' AND t.workspace_id = ?';
      filterParams.push(wsId);
    }
    if (sprintId) {
      taskFilter += ' AND t.sprint_id = ?';
      filterParams.push(sprintId);
    }

    // Task status distribution
    const taskStatusDist = await prepare(`
      SELECT status, COUNT(*) as count FROM tasks t ${taskFilter} GROUP BY status
    `).all(...filterParams);

    // Tasks by user
    const tasksByUser = await prepare(`
      SELECT u.name, u.id, COUNT(t.id) as total,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to AND t.org_id = ?
      ${wsId ? 'AND t.workspace_id = ?' : ''}
      ${sprintId ? 'AND t.sprint_id = ?' : ''}
      WHERE u.is_deleted = 0
      GROUP BY u.id
    `).all(...filterParams);

    // Hourly productivity
    const hourExpr = DB_MODE === 'postgresql'
      ? "EXTRACT(HOUR FROM t.created_at)::int"
      : "strftime('%H', t.created_at)";

    const hourlyProductivity = await prepare(`
      SELECT ${hourExpr} as hour, COUNT(*) as completed
      FROM tasks t ${taskFilter} AND t.status = 'done'
      GROUP BY hour ORDER BY hour
    `).all(...filterParams);

    // Task stats
    const taskStats = await prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done
      FROM tasks t ${taskFilter}
    `).get(...filterParams);

    const totalTasksCount = parseInt(taskStats?.total) || 0;
    const doneTasksCount = parseInt(taskStats?.done) || 0;
    const progress = totalTasksCount > 0 ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0;

    // Workflow stage distribution (if workspace specified)
    let workflowDist = [];
    if (wsId) {
      workflowDist = await prepare(`
        SELECT ws.name, ws.color, ws.position, COUNT(t.id) as count
        FROM workflow_stages ws
        LEFT JOIN tasks t ON t.workflow_stage_id = ws.id AND t.org_id = ?
        WHERE ws.workspace_id = ?
        GROUP BY ws.id
        ORDER BY ws.position
      `).all(orgId, wsId);
    }

    // Sprint burndown (if sprint specified)
    let sprintBurndown = null;
    if (sprintId) {
      const sprint = await prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId);
      if (sprint) {
        sprintBurndown = {
          sprint,
          totalTasks: totalTasksCount,
          completedTasks: doneTasksCount,
          remainingTasks: totalTasksCount - doneTasksCount,
        };
      }
    }

    res.json({
      taskStatusDist,
      tasksByUser,
      hourlyProductivity,
      progress,
      totalTasks: totalTasksCount,
      doneTasks: doneTasksCount,
      workflowDist,
      sprintBurndown,
    });
  } catch (err) {
    console.error('v1 Analytics fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
