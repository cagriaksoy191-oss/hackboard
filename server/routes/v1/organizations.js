/**
 * v1/organizations.js — Organization Management
 */

import { Router } from 'express';
import { prepare } from '../../db-adapter.js';
import { requireRole } from '../../auth/guards.js';

const router = Router();

/**
 * GET /api/v1/organizations/current
 * Get the current org context with member count
 */
router.get('/current', async (req, res) => {
  try {
    const org = await prepare('SELECT * FROM organizations WHERE id = ?').get(req.tenant.orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const memberCount = await prepare(
      'SELECT COUNT(*) as count FROM org_memberships WHERE org_id = ?'
    ).get(req.tenant.orgId);

    const workspaceCount = await prepare(
      'SELECT COUNT(*) as count FROM workspaces WHERE org_id = ?'
    ).get(req.tenant.orgId);

    res.json({
      ...org,
      memberCount: memberCount?.count || 0,
      workspaceCount: workspaceCount?.count || 0,
    });
  } catch (err) {
    console.error('v1 Org current error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/organizations/current
 * Update org settings (owner/admin only)
 */
router.put('/current', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { name, settings } = req.body;

    await prepare(
      'UPDATE organizations SET name = COALESCE(?, name), settings = COALESCE(?, settings), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name ?? null, settings ? JSON.stringify(settings) : null, req.tenant.orgId);

    const org = await prepare('SELECT * FROM organizations WHERE id = ?').get(req.tenant.orgId);
    res.json(org);
  } catch (err) {
    console.error('v1 Org update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/organizations/members
 * List org members with roles
 */
router.get('/members', async (req, res) => {
  try {
    const members = await prepare(`
      SELECT u.id, u.name, u.email, u.role, u.avatar_color, u.is_online, u.created_at,
             om.role as org_role, om.joined_at
      FROM org_memberships om
      JOIN users u ON om.user_id = u.id
      WHERE om.org_id = ? AND u.is_deleted = 0
      ORDER BY om.joined_at ASC
    `).all(req.tenant.orgId);

    res.json(members);
  } catch (err) {
    console.error('v1 Org members error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/v1/organizations/members/:userId/role
 * Change a member's role (owner only)
 */
router.patch('/members/:userId/role', requireRole(['owner']), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['owner', 'admin', 'member', 'viewer'];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Valid role is required' });
    }

    // Cannot change own role
    if (parseInt(req.params.userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const membership = await prepare(
      'SELECT id FROM org_memberships WHERE org_id = ? AND user_id = ?'
    ).get(req.tenant.orgId, req.params.userId);

    if (!membership) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await prepare(
      'UPDATE org_memberships SET role = ? WHERE org_id = ? AND user_id = ?'
    ).run(role, req.tenant.orgId, req.params.userId);

    res.json({ success: true, userId: parseInt(req.params.userId), role });
  } catch (err) {
    console.error('v1 Org member role error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/organizations/members/:userId
 * Remove a member (admin+ only)
 */
router.delete('/members/:userId', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    if (parseInt(req.params.userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    const membership = await prepare(
      'SELECT role FROM org_memberships WHERE org_id = ? AND user_id = ?'
    ).get(req.tenant.orgId, req.params.userId);

    if (!membership) return res.status(404).json({ error: 'Member not found' });
    if (membership.role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove an owner' });
    }

    await prepare(
      'DELETE FROM org_memberships WHERE org_id = ? AND user_id = ?'
    ).run(req.tenant.orgId, req.params.userId);

    res.json({ success: true });
  } catch (err) {
    console.error('v1 Org member remove error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
