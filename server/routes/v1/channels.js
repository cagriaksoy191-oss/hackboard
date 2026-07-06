/**
 * v1/channels.js — Workspace-Scoped Chat Channels
 */

import { Router } from 'express';
import { prepare } from '../../db-adapter.js';
import { requireRole } from '../../auth/guards.js';

const router = Router();

/**
 * GET /api/v1/channels
 * List channels for the current workspace
 */
router.get('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    let wsId = req.query.workspace_id || workspaceId;

    if (!wsId) {
      // Fallback to first workspace of the organization
      const defaultWorkspace = await prepare(
        'SELECT id FROM workspaces WHERE org_id = ? ORDER BY id LIMIT 1'
      ).get(orgId);
      if (defaultWorkspace) {
        wsId = defaultWorkspace.id;
      } else {
        return res.status(400).json({ error: 'workspace_id is required' });
      }
    }

    const ws = await prepare('SELECT id FROM workspaces WHERE id = ? AND org_id = ?').get(wsId, orgId);
    if (!ws) {
      return res.status(403).json({ error: 'Workspace access denied' });
    }

    const channels = await prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM messages m WHERE m.channel_id = c.id) as message_count,
        (SELECT MAX(m.created_at) FROM messages m WHERE m.channel_id = c.id) as last_message_at
      FROM channels c
      WHERE c.workspace_id = ?
      ORDER BY c.is_default DESC, c.name ASC
    `).all(wsId);

    res.json(channels);
  } catch (err) {
    console.error('v1 Channels fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/channels
 * Create a new channel (admin+)
 */
router.post('/', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const { name, description, workspace_id: bodyWsId } = req.body;
    let wsId = bodyWsId || workspaceId;

    if (!wsId) {
      // Fallback to first workspace of the organization
      const defaultWorkspace = await prepare(
        'SELECT id FROM workspaces WHERE org_id = ? ORDER BY id LIMIT 1'
      ).get(orgId);
      if (defaultWorkspace) {
        wsId = defaultWorkspace.id;
      }
    }

    if (!name || !wsId) {
      return res.status(400).json({ error: 'name and workspace_id are required' });
    }

    const ws = await prepare('SELECT id FROM workspaces WHERE id = ? AND org_id = ?').get(wsId, orgId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9\u00e7\u015f\u011f\u00fc\u00f6\u0131]+/g, '-').replace(/^-|-$/g, '');

    // Check for duplicate slug
    const existing = await prepare('SELECT id FROM channels WHERE workspace_id = ? AND slug = ?').get(wsId, slug);
    if (existing) {
      return res.status(409).json({ error: 'Channel with this name already exists' });
    }

    const result = await prepare(
      'INSERT INTO channels (workspace_id, name, slug, description, is_default, created_by) VALUES (?, ?, ?, ?, 0, ?)'
    ).run(wsId, name.trim(), slug, description || '', req.user.id);

    const channel = await prepare('SELECT * FROM channels WHERE id = ?').get(result.lastInsertRowid);

    const io = req.app.get('io');
    if (io) io.to(`workspace:${wsId}`).emit('channel:created', channel);

    res.status(201).json(channel);
  } catch (err) {
    console.error('v1 Channel create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/channels/:id
 * Delete a channel (cannot delete default)
 */
router.delete('/:id', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { orgId } = req.tenant;

    const channel = await prepare(`
      SELECT c.* FROM channels c
      JOIN workspaces w ON c.workspace_id = w.id
      WHERE c.id = ? AND w.org_id = ?
    `).get(req.params.id, orgId);

    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (channel.is_default) return res.status(400).json({ error: 'Cannot delete the default channel' });

    await prepare('DELETE FROM channels WHERE id = ?').run(req.params.id);

    const io = req.app.get('io');
    if (io) io.to(`workspace:${channel.workspace_id}`).emit('channel:deleted', { id: channel.id });

    res.json({ success: true });
  } catch (err) {
    console.error('v1 Channel delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
