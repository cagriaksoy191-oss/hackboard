/**
 * auth.js — Authentication Routes (v1)
 *
 * POST /api/v1/auth/register  — Create account with email + password
 * POST /api/v1/auth/login     — Login with email + password
 * POST /api/v1/auth/refresh   — Rotate refresh token
 * POST /api/v1/auth/logout    — Revoke all refresh tokens
 * POST /api/v1/auth/legacy-login — Backward compat: login by user ID (no password)
 */

import { Router } from 'express';
import { prepare } from '../../db-adapter.js';
import { hashPassword, verifyPassword } from '../../auth/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeAllTokens,
} from '../../auth/tokens.js';

const router = Router();

const avatarColors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#737373', '#a1a1aa'
];

/**
 * POST /api/v1/auth/register
 * Body: { name, email, password, role?, avatar_color? }
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, avatar_color } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existing = await prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const color = avatar_color || avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const userRole = role || 'Member';

    // Create user
    const result = await prepare(
      'INSERT INTO users (name, role, avatar_color, is_online, email, password_hash, email_verified) VALUES (?, ?, ?, 1, ?, ?, 0)'
    ).run(name.trim(), userRole, color, email.toLowerCase().trim(), passwordHash);

    const user = await prepare('SELECT id, name, role, avatar_color, email, is_online, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    // Auto-create org + workspace for new user, OR join default org
    let orgId;
    const defaultOrg = await prepare('SELECT id FROM organizations WHERE slug = ?').get('default');

    if (defaultOrg) {
      orgId = defaultOrg.id;
      // Add to default org as member
      await prepare('INSERT INTO org_memberships (org_id, user_id, role) VALUES (?, ?, ?)').run(orgId, user.id, 'member');
    } else {
      // Create personal org
      const orgResult = await prepare(
        'INSERT INTO organizations (name, slug) VALUES (?, ?)'
      ).run(`${name.trim()}'s Organization`, `org-${user.id}`);
      orgId = orgResult.lastInsertRowid;

      // Create default workspace
      await prepare(
        'INSERT INTO workspaces (org_id, name, slug) VALUES (?, ?, ?)'
      ).run(orgId, 'Default Workspace', 'default');

      // Add user as owner
      await prepare('INSERT INTO org_memberships (org_id, user_id, role) VALUES (?, ?, ?)').run(orgId, user.id, 'owner');

      // Create default workflow stages
      await prepare(
        "INSERT INTO workflow_stages (workspace_id, name, slug, position, color, is_done_state) VALUES (1, 'To Do', 'todo', 0, '#94a3b8', 0)"
      ).run();
      await prepare(
        "INSERT INTO workflow_stages (workspace_id, name, slug, position, color, is_done_state) VALUES (1, 'In Progress', 'in-progress', 1, '#3b82f6', 0)"
      ).run();
      await prepare(
        "INSERT INTO workflow_stages (workspace_id, name, slug, position, color, is_done_state) VALUES (1, 'Testing', 'testing', 2, '#f59e0b', 0)"
      ).run();
      await prepare(
        "INSERT INTO workflow_stages (workspace_id, name, slug, position, color, is_done_state) VALUES (1, 'Done', 'done', 3, '#22c55e', 1)"
      ).run();

      // Create default channel
      await prepare(
        "INSERT INTO channels (workspace_id, name, slug, is_default) VALUES (1, 'General', 'general', 1)"
      ).run();
    }

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, orgId });
    const refreshToken = await generateRefreshToken(user.id);

    // Broadcast user creation
    const io = req.app.get('io');
    if (io) io.emit('user:created', user);

    res.status(201).json({
      user: { ...user, orgId },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await prepare(
      'SELECT id, name, role, avatar_color, email, is_online, password_hash, is_deleted, created_at FROM users WHERE email = ?'
    ).get(email.toLowerCase().trim());

    if (!user || user.is_deleted) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // If user has no password_hash (legacy user), deny login
    if (!user.password_hash) {
      return res.status(401).json({
        error: 'This account needs to set a password. Please use the legacy login or contact admin.',
        needsPasswordSetup: true,
        userId: user.id,
      });
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get org membership
    const membership = await prepare(
      'SELECT org_id, role FROM org_memberships WHERE user_id = ? ORDER BY joined_at LIMIT 1'
    ).get(user.id);

    const orgId = membership?.org_id || null;

    // Set online
    await prepare('UPDATE users SET is_online = 1 WHERE id = ?').run(user.id);

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, orgId });
    const refreshToken = await generateRefreshToken(user.id);

    // Remove sensitive fields from response
    const { password_hash, is_deleted, ...safeUser } = user;

    res.json({
      user: { ...safeUser, orgId, is_online: 1 },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Body: { refreshToken }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await rotateRefreshToken(refreshToken);
    if (!result) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/auth/logout
 * Requires auth. Revokes all refresh tokens for the user.
 */
router.post('/logout', async (req, res) => {
  try {
    // Extract userId from token (even if expired, we try)
    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.decode(token);
        userId = decoded?.userId;
      } catch { /* ignore */ }
    }

    // Also accept userId from body (legacy compat)
    userId = userId || req.body.userId;

    if (userId) {
      await revokeAllTokens(userId);
      await prepare('UPDATE users SET is_online = 0 WHERE id = ?').run(userId);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/auth/legacy-login
 * Body: { userId }
 * Backward compatibility: login by selecting a user from the list.
 * Issues tokens for the selected user without password verification.
 */
router.post('/legacy-login', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prepare('SELECT * FROM users WHERE id = ? AND is_deleted = 0').get(userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    // Get org membership
    const membership = await prepare(
      'SELECT org_id, role FROM org_memberships WHERE user_id = ? ORDER BY joined_at LIMIT 1'
    ).get(user.id);

    const orgId = membership?.org_id || null;

    // Set online
    await prepare('UPDATE users SET is_online = 1 WHERE id = ?').run(user.id);

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, orgId });
    const refreshToken = await generateRefreshToken(user.id);

    // Remove sensitive fields
    const { password_hash, ...safeUser } = user;

    res.json({
      user: { ...safeUser, orgId, is_online: 1 },
      token: accessToken,         // Legacy field name (backward compat)
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Legacy login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/auth/set-password
 * Body: { userId, password }
 * Allows legacy users (without password_hash) to set their password.
 * No auth required — only works for users with null password_hash.
 */
router.post('/set-password', async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password || password.length < 6) {
      return res.status(400).json({ error: 'User ID and password (min 6 chars) required' });
    }

    const user = await prepare('SELECT id, password_hash FROM users WHERE id = ? AND is_deleted = 0').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.password_hash) {
      return res.status(400).json({ error: 'Password already set. Use login instead.' });
    }

    const hash = await hashPassword(password);
    await prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);

    res.json({ success: true, message: 'Password set successfully. You can now log in with email.' });
  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
