/**
 * v1/messages.js — Tenant-Aware Messages with Channel + Thread Support
 *
 * Messages are scoped by org_id and optionally by channel_id and thread_id.
 * Room-scoped Socket.IO broadcasts.
 */

import { Router } from 'express';
import { prepare } from '../../db-adapter.js';
import { queueEmbedding } from '../../embedding-worker.js';

const router = Router();

/**
 * GET /api/v1/messages
 * Query params: ?channel_id, ?thread_id, ?limit, ?before_id
 */
router.get('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const { channel_id, thread_id, limit, before_id } = req.query;

    let sql = `
      SELECT m.*, u.name, u.avatar_color
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.org_id = ?
    `;
    const params = [orgId];

    if (workspaceId) {
      sql += ' AND m.workspace_id = ?';
      params.push(workspaceId);
    }
    if (channel_id) {
      sql += ' AND m.channel_id = ?';
      params.push(channel_id);
    }
    if (thread_id) {
      // Get thread replies
      sql += ' AND m.thread_id = ?';
      params.push(thread_id);
    } else {
      // Only top-level messages (not thread replies)
      sql += ' AND m.thread_id IS NULL';
    }
    if (before_id) {
      sql += ' AND m.id < ?';
      params.push(before_id);
    }

    sql += ` ORDER BY m.created_at ${thread_id ? 'ASC' : 'DESC'}`;
    sql += ` LIMIT ${parseInt(limit) || 50}`;

    const messages = await prepare(sql).all(...params);

    // If DESC order (main feed), reverse for chronological display
    if (!thread_id) messages.reverse();

    res.json(messages);
  } catch (err) {
    console.error('v1 Messages fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/messages
 * Body: { content, channel_id?, thread_id? }
 */
router.post('/', async (req, res) => {
  try {
    const { orgId, workspaceId } = req.tenant;
    const { content, channel_id, thread_id } = req.body;

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (channel_id) {
      const ch = await prepare('SELECT c.id FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.id = ? AND w.org_id = ?').get(channel_id, orgId);
      if (!ch) {
        return res.status(403).json({ error: 'Channel access denied' });
      }
    }

    // Resolve default channel if none specified
    let resolvedChannelId = channel_id;
    if (!resolvedChannelId && workspaceId) {
      const defaultChannel = await prepare(
        'SELECT id FROM channels WHERE workspace_id = ? AND is_default = 1 LIMIT 1'
      ).get(workspaceId);
      resolvedChannelId = defaultChannel?.id || null;
    }

    // If replying to a thread, verify parent message exists and belongs to tenant
    if (thread_id) {
      const parent = await prepare('SELECT id, org_id FROM messages WHERE id = ?').get(thread_id);
      if (!parent || parent.org_id !== orgId) {
        return res.status(404).json({ error: 'Parent message not found' });
      }
    }

    const result = await prepare(`
      INSERT INTO messages (user_id, content, org_id, workspace_id, channel_id, thread_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, content.trim(), orgId, workspaceId || null, resolvedChannelId || null, thread_id || null);

    const message = await prepare(`
      SELECT m.*, u.name, u.avatar_color
      FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
    `).get(result.lastInsertRowid);

    // Room-scoped broadcast
    const io = req.app.get('io');
    if (io) {
      const room = resolvedChannelId
        ? `channel:${resolvedChannelId}`
        : (workspaceId ? `workspace:${workspaceId}` : `tenant:${orgId}`);
      io.to(room).emit('message:new', message);

      if (thread_id) {
        io.to(room).emit('thread:reply', { threadId: thread_id, message });
      }

      // Notification to others
      const user = await prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
      const userName = user?.name || 'Unknown';
      const truncatedContent = content.length > 50 ? `${content.substring(0, 50)}...` : content;

      const notifRoom = workspaceId ? `workspace:${workspaceId}` : `tenant:${orgId}`;
      io.to(notifRoom).emit('notification:new', {
        id: Date.now(),
        type: thread_id ? 'thread_reply' : 'message',
        title: thread_id ? 'Thread Reply' : 'New Message',
        message: `${userName}: ${truncatedContent}`,
        senderId: req.user.id,
        channelId: resolvedChannelId,
        threadId: thread_id,
        read: false,
        created_at: new Date().toISOString(),
      });
    }

    // Queue message for RAG vector indexing
    queueEmbedding('message', message.id).catch(() => {});

    res.status(201).json(message);
  } catch (err) {
    console.error('v1 Message create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/messages/:id/thread
 * Get all replies in a thread
 */
router.get('/:id/thread', async (req, res) => {
  try {
    const { orgId } = req.tenant;

    // Get parent message
    const parent = await prepare(`
      SELECT m.*, u.name, u.avatar_color
      FROM messages m JOIN users u ON m.user_id = u.id
      WHERE m.id = ? AND m.org_id = ?
    `).get(req.params.id, orgId);

    if (!parent) return res.status(404).json({ error: 'Message not found' });

    // Get replies
    const replies = await prepare(`
      SELECT m.*, u.name, u.avatar_color
      FROM messages m JOIN users u ON m.user_id = u.id
      WHERE m.thread_id = ? AND m.org_id = ?
      ORDER BY m.created_at ASC
    `).all(req.params.id, orgId);

    res.json({ parent, replies, replyCount: replies.length });
  } catch (err) {
    console.error('v1 Thread fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
