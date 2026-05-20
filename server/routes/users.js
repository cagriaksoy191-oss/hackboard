import { Router } from 'express';
import { prepare } from '../db-adapter.js';
import { generateAccessToken, generateRefreshToken } from '../auth/tokens.js';



const router = Router();

const avatarColors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', 
  '#ec4899', '#f43f5e', '#64748b', '#737373', '#a1a1aa'
];


router.post('/login', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const user = await prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user || user.is_deleted) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    // Get org membership for token
    const membership = await prepare('SELECT org_id FROM org_memberships WHERE user_id = ? ORDER BY joined_at LIMIT 1').get(user.id);
    const token = generateAccessToken({ userId: user.id, orgId: membership?.org_id || null });
    res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const users = await prepare('SELECT * FROM users WHERE is_deleted = 0 ORDER BY id').all();
    res.json(users);
  } catch (err) {
    console.error('Users fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, role, avatar_color } = req.body;

    // Require name
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // If authenticated, use the provided role (if any, otherwise fail).
    // If unauthenticated, force the role to 'Guest' to prevent privilege escalation.
    let finalRole = role;
    if (!req.user_id) {
      finalRole = 'Guest';
    } else if (!finalRole) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const color = avatar_color || avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const result = await prepare('INSERT INTO users (name, role, avatar_color, is_online) VALUES (?, ?, ?, 1)').run(name, finalRole, color);
    const user = await prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    
    const io = req.app.get('io');
    if (io) io.emit('user:created', user);


    // Get or auto-assign org membership
    const membership = await prepare('SELECT org_id FROM org_memberships WHERE user_id = ? ORDER BY joined_at LIMIT 1').get(user.id);
    let orgId = membership?.org_id || null;

    // If no membership, join default org
    if (!orgId) {
      const defaultOrg = await prepare('SELECT id FROM organizations WHERE slug = ?').get('default');
      if (defaultOrg) {
        await prepare('INSERT INTO org_memberships (org_id, user_id, role) VALUES (?, ?, ?)').run(defaultOrg.id, user.id, 'member');
        orgId = defaultOrg.id;
      }
    }

    const token = generateAccessToken({ userId: user.id, orgId });
    res.status(201).json({ user, token });

  } catch (err) {
    console.error('User create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    await prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.params.id);
    const user = await prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    
    const io = req.app.get('io');
    if (io) io.emit('user:updated', user);

    res.json(user);
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    // Soft delete user
    await prepare('UPDATE users SET is_deleted = 1, is_online = 0 WHERE id = ?').run(userId);
    // Unassign tasks assigned to this user
    await prepare('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = ?').run(userId);
    
    const io = req.app.get('io');
    if (io) {
      io.emit('user:deleted', { id: parseInt(userId) });
      // Notify clients that some tasks might have been updated (unassigned)
      io.emit('tasks:refresh');
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { is_online } = req.body;
    await prepare('UPDATE users SET is_online = ? WHERE id = ?').run(is_online ? 1 : 0, req.params.id);
    const user = await prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  } catch (err) {
    console.error('User status update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
