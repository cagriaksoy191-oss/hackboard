/**
 * guards.js — Authentication & Authorization Middleware
 *
 * Three middleware layers:
 * 1. requireAuth    — Verifies JWT, attaches req.user
 * 2. requireTenant  — Resolves org context, attaches req.tenant
 * 3. requireRole    — Checks RBAC role against org membership
 *
 * All guard middleware are composable:
 *   router.post('/tasks', requireAuth, requireTenant, requireRole(['admin', 'member']), handler)
 */

import { verifyAccessToken } from './tokens.js';
import { prepare } from '../db-adapter.js';

/**
 * Verify JWT from Authorization header.
 * Attaches req.user = { id, orgId }.
 *
 * Falls back to legacy behavior: if no token but userId in body,
 * treat as unauthenticated (for backward compat during migration).
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (decoded) {
      // Verify user still exists
      const user = await prepare('SELECT id, is_deleted FROM users WHERE id = ?').get(decoded.userId);
      if (user && !user.is_deleted) {
        req.user = { id: decoded.userId, orgId: decoded.orgId };
        return next();
      }
    }
  }

  // Allow unauthenticated access to specific public endpoints
  // (handled by route-level exclusions, not here)
  return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
}

/**
 * Resolve organization context from:
 * 1. X-Org-ID header (explicit)
 * 2. req.user.orgId from JWT (default)
 * 3. Query param ?org_id (fallback)
 *
 * Verifies user is a member of the organization.
 * Attaches req.tenant = { orgId, workspaceId, role }.
 */
export async function requireTenant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required before tenant resolution' });
  }

  const orgId = parseInt(
    req.headers['x-org-id'] ||
    req.user.orgId ||
    req.query.org_id
  );

  if (!orgId || isNaN(orgId)) {
    return res.status(400).json({ error: 'Organization context required (X-Org-ID header or org_id param)' });
  }

  // Verify membership
  const membership = await prepare(
    'SELECT role FROM org_memberships WHERE org_id = ? AND user_id = ?'
  ).get(orgId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this organization' });
  }

  // Resolve workspace (optional, from header or query)
  const workspaceId = parseInt(req.headers['x-workspace-id'] || req.query.workspace_id) || null;

  // If workspace specified, verify it belongs to this org
  if (workspaceId) {
    const workspace = await prepare(
      'SELECT id FROM workspaces WHERE id = ? AND org_id = ?'
    ).get(workspaceId, orgId);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found in this organization' });
    }
  }

  req.tenant = {
    orgId,
    workspaceId,
    role: membership.role,
  };

  next();
}

/**
 * Check if user has one of the required roles in the current org.
 * Must be used AFTER requireTenant.
 *
 * @param {string[]} allowedRoles - e.g., ['owner', 'admin', 'member']
 * @returns {Function} Express middleware
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(500).json({ error: 'requireRole must be used after requireTenant' });
    }

    if (!allowedRoles.includes(req.tenant.role)) {
      return res.status(403).json({
        error: `Insufficient permissions. Required: ${allowedRoles.join(' or ')}. Current: ${req.tenant.role}`
      });
    }

    next();
  };
}

/**
 * Legacy auth middleware for backward compatibility.
 * Supports both new JWT auth AND the old userId-from-login flow.
 * Used during the transition period on /api routes (non-v1).
 */
export async function legacyAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (decoded) {
      const user = await prepare('SELECT id FROM users WHERE id = ?').get(decoded.userId);
      if (user) {
        req.user_id = decoded.userId;
        req.user = { id: decoded.userId, orgId: decoded.orgId };

        // Auto-resolve default tenant for legacy routes
        const membership = await prepare(
          'SELECT org_id, role FROM org_memberships WHERE user_id = ? ORDER BY joined_at LIMIT 1'
        ).get(decoded.userId);

        if (membership) {
          const workspace = await prepare(
            'SELECT id FROM workspaces WHERE org_id = ? ORDER BY id LIMIT 1'
          ).get(membership.org_id);

          req.tenant = {
            orgId: membership.org_id,
            workspaceId: workspace?.id || null,
            role: membership.role,
          };
        }
      }
    }
  }

  // Allow all requests to /api/users to pass without authentication
  // so the login screen works.
  if (req.originalUrl.startsWith('/api/users')) {
    return next();
  }

  if (!req.user_id) {
    return res.status(401).json({ error: 'Unauthorized: Missing or Invalid Token' });
  }

  next();
}
