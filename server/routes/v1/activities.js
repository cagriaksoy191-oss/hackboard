/**
 * v1/activities.js — Tenant-Scoped Activity Feed with Entity Metadata
 */

import { Router } from 'express';
import { prepare } from '../../db-adapter.js';

const router = Router();

/**
 * GET /api/v1/activities
 * Query: ?workspace_id, ?entity_type, ?entity_id, ?limit
 */
router.get('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const { entity_type, entity_id, limit } = req.query;
    const wsId = req.query.workspace_id || workspaceId;

    let sql = `
      SELECT a.*, u.name, u.avatar_color
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.org_id = ?
    `;
    const params = [orgId];

    if (wsId) {
      sql += ' AND a.workspace_id = ?';
      params.push(wsId);
    }
    if (entity_type) {
      sql += ' AND a.entity_type = ?';
      params.push(entity_type);
    }
    if (entity_id) {
      sql += ' AND a.entity_id = ?';
      params.push(entity_id);
    }

    sql += ` ORDER BY a.created_at DESC LIMIT ${parseInt(limit) || 50}`;

    const activities = await prepare(sql).all(...params);
    res.json(activities);
  } catch (err) {
    console.error('v1 Activities fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
