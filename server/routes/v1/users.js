/**
 * v1/users.js — Tenant-Isolated User & Organization Member Management
 *
 * Ensures organization members are isolated and users cannot see/modify members
 * of other organizations.
 */

import { Router } from 'express';
import { prepare } from '../../db-adapter.js';
import { requireRole } from '../../auth/guards.js';
import { hashPassword } from '../../auth/password.js';

const router = Router();

/**
 * GET /api/v1/users
 * Returns list of members belonging to the current organization.
 */
router.get('/', async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const users = await prepare(`
      SELECT u.id, u.name, u.role, u.avatar_color, u.is_online, u.email, u.created_at, om.role as org_role
      FROM users u
      JOIN org_memberships om ON u.id = om.user_id
      WHERE om.org_id = ? AND u.is_deleted = 0
      ORDER BY u.name ASC
    `).all(orgId);
    res.json(users);
  } catch (err) {
    console.error('v1 Users fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/users
 * Creates a new user and adds them to the current organization (admin+).
 */
router.post('/', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const { name, role, avatar_color, email, password } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const color = avatar_color || '#6366f1';
    const userRole = role || 'Member';
    let passwordHash = null;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    // Verify email isn't taken globally if provided
    if (email) {
      const existing = await prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    const result = await prepare(
      'INSERT INTO users (name, role, avatar_color, is_online, email, password_hash) VALUES (?, ?, ?, 1, ?, ?)'
    ).run(name.trim(), userRole, color, email ? email.toLowerCase().trim() : null, passwordHash);

    const user = await prepare('SELECT id, name, role, avatar_color, email, is_online, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    // Add to organization membership
    await prepare('INSERT INTO org_memberships (org_id, user_id, role) VALUES (?, ?, ?)').run(orgId, user.id, 'member');

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${orgId}`).emit('user:created', user);
    }

    res.status(201).json(user);
  } catch (err) {
    console.error('v1 User create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/users/:id
 * Updates user details. Only self or admin+ can execute.
 */
router.put('/:id', async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const targetUserId = parseInt(req.params.id);

    const isSelf = req.user.id === targetUserId;
    const isAdmin = ['owner', 'admin'].includes(req.tenant.role);

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { name, role, avatar_color } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check target user belongs to this org
    const membership = await prepare('SELECT id FROM org_memberships WHERE org_id = ? AND user_id = ?').get(orgId, targetUserId);
    if (!membership) {
      return res.status(404).json({ error: 'User not found in this organization' });
    }

    await prepare(
      'UPDATE users SET name = ?, role = COALESCE(?, role), avatar_color = COALESCE(?, avatar_color) WHERE id = ?'
    ).run(name.trim(), role || null, avatar_color || null, targetUserId);

    const user = await prepare('SELECT id, name, role, avatar_color, email, is_online, created_at FROM users WHERE id = ?').get(targetUserId);

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${orgId}`).emit('user:updated', user);
    }

    res.json(user);
  } catch (err) {
    console.error('v1 User update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/users/:id
 * Soft deletes user and unassigns their tasks (admin+).
 */
router.delete('/:id', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const targetUserId = parseInt(req.params.id);

    if (req.user.id === targetUserId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Verify membership
    const membership = await prepare('SELECT id FROM org_memberships WHERE org_id = ? AND user_id = ?').get(orgId, targetUserId);
    if (!membership) {
      return res.status(404).json({ error: 'User not found in this organization' });
    }

    // Soft delete user globally
    await prepare('UPDATE users SET is_deleted = 1, is_online = 0 WHERE id = ?').run(targetUserId);
    // Remove task associations in this org
    await prepare('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = ? AND org_id = ?').run(targetUserId, orgId);

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${orgId}`).emit('user:deleted', { id: targetUserId });
      io.to(`tenant:${orgId}`).emit('tasks:refresh');
    }

    res.json({ success: true });
  } catch (err) {
    console.error('v1 User delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/v1/users/:id/status
 * Updates user online status.
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { orgId } = req.tenant;
    const targetUserId = parseInt(req.params.id);
    const { is_online } = req.body;

    // Check target user belongs to this org
    const membership = await prepare('SELECT id FROM org_memberships WHERE org_id = ? AND user_id = ?').get(orgId, targetUserId);
    if (!membership) {
      return res.status(404).json({ error: 'User not found in this organization' });
    }

    await prepare('UPDATE users SET is_online = ? WHERE id = ?').run(is_online ? 1 : 0, targetUserId);
    const user = await prepare('SELECT id, name, role, avatar_color, email, is_online, created_at FROM users WHERE id = ?').get(targetUserId);

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${orgId}`).emit('user:status', { user_id: targetUserId, is_online: !!is_online });
    }

    res.json(user);
  } catch (err) {
    console.error('v1 User status update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
