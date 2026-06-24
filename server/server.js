import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { initDB, prepare, flushSave, closePool, DB_MODE, VALID_STATUSES, VALID_PRIORITIES } from './db-adapter.js';
import seed from './seed.js';
import { runMigrations, backfillMemberships } from './migrate.js';
import { legacyAuth } from './auth/guards.js';
import { verifyAccessToken } from './auth/tokens.js';

import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import activityRoutes from './routes/activities.js';
import analyticsRoutes from './routes/analytics.js';
import milestoneRoutes from './routes/milestones.js';
import notificationRoutes from './routes/notifications.js';
import backupRoutes from './routes/backup.js';
import v1Routes from './routes/v1/index.js';
import { startEmbeddingWorker, queueEmbedding } from './embedding-worker.js';

const app = express();
const server = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3001'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

app.use('/api', apiLimiter);

// Authentication middleware (legacy routes use legacyAuth from auth/guards.js)
// v1 routes handle their own auth via requireAuth + requireTenant
app.use('/api/v1', v1Routes);
app.use('/api', legacyAuth);


const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

await initDB();
await runMigrations();
await seed();
await backfillMemberships();

// Start RAG embedding background worker (initializes vector store adapter)
try {
  await startEmbeddingWorker();
} catch (err) {
  console.warn('[Server] Embedding worker startup warning:', err.message);
}

// Legacy routes with deprecation headers (migrate to /api/v1)
const deprecationMiddleware = (req, res, next) => {
  res.set('X-API-Deprecated', 'true');
  res.set('X-API-Migration', 'Use /api/v1/ prefix for new API');
  res.set('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString());
  next();
};

app.use('/api/tasks', deprecationMiddleware, taskRoutes);
app.use('/api/users', deprecationMiddleware, userRoutes);
app.use('/api/messages', deprecationMiddleware, messageRoutes);
app.use('/api/activities', deprecationMiddleware, activityRoutes);
app.use('/api/analytics', deprecationMiddleware, analyticsRoutes);
app.use('/api/milestones', deprecationMiddleware, milestoneRoutes);
app.use('/api/notifications', deprecationMiddleware, notificationRoutes);
app.use('/api/backup', deprecationMiddleware, backupRoutes);

const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});


io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Unauthorized: Missing token in socket auth'));
  }

  try {
    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.userId) {
      return next(new Error('Unauthorized: Invalid Token payload'));
    }

    const user = await prepare('SELECT id FROM users WHERE id = ?').get(decoded.userId);
    if (!user) {
      return next(new Error('Unauthorized: Invalid User ID'));
    }

    socket.user_id = decoded.userId;
    socket.org_id = decoded.orgId;

    // Join tenant room for isolated broadcasts
    if (decoded.orgId) {
      socket.join(`tenant:${decoded.orgId}`);

      try {
        // Auto-join workspaces under this organization to fix real-time updates!
        const workspaces = await prepare('SELECT id FROM workspaces WHERE org_id = ?').all(decoded.orgId);
        for (const ws of workspaces) {
          socket.join(`workspace:${ws.id}`);

          // Auto-join all channels of these workspaces as well for instant chat sync!
          const channels = await prepare('SELECT id FROM channels WHERE workspace_id = ?').all(ws.id);
          for (const ch of channels) {
            socket.join(`channel:${ch.id}`);
          }
        }
      } catch (err) {
        console.error('Socket room auto-join error:', err);
      }
    }

    next();
  } catch (err) {
    next(new Error('Auth error: ' + err.message));
  }
});

io.on('connection', (socket) => {

  console.info('Client connected:', socket.id, `[tenant:${socket.org_id || 'none'}]`);

  // ── Workspace Room Management ──
  socket.on('workspace:join', (data) => {
    if (data.workspaceId) {
      socket.join(`workspace:${data.workspaceId}`);
      console.info(`Socket ${socket.id} joined workspace:${data.workspaceId}`);
    }
    if (data.channelId) {
      socket.join(`channel:${data.channelId}`);
    }
  });

  socket.on('workspace:leave', (data) => {
    if (data.workspaceId) {
      socket.leave(`workspace:${data.workspaceId}`);
    }
    if (data.channelId) {
      socket.leave(`channel:${data.channelId}`);
    }
  });

  // ── Channel Room Management ──
  socket.on('channel:join', (data) => {
    if (data.channelId) {
      socket.join(`channel:${data.channelId}`);
    }
  });

  socket.on('channel:leave', (data) => {
    if (data.channelId) {
      socket.leave(`channel:${data.channelId}`);
    }
  });

  // Helper: get the best room for broadcast
  function getTenantRoom() {
    return socket.org_id ? `tenant:${socket.org_id}` : null;
  }

  // ── Messages ──
  socket.on('message:send', async (data) => {
    try {
      const channelId = data.channel_id || null;
      const threadId = data.thread_id || null;
      const workspaceId = socket.workspace_id || null;

      // If replying to a thread, verify parent exists
      if (threadId) {
        const parent = await prepare('SELECT id FROM messages WHERE id = ?').get(threadId);
        if (!parent) return;
      }

      const result = await prepare(
        'INSERT INTO messages (user_id, content, org_id, workspace_id, channel_id, thread_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(data.user_id, data.content, socket.org_id || null, workspaceId, channelId, threadId);

      const message = await prepare(`
        SELECT m.*, u.name, u.avatar_color
        FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
      `).get(result.lastInsertRowid);

      // Room-scoped broadcast
      if (channelId) {
        // Channel-scoped: broadcast to channel room
        io.to(`channel:${channelId}`).emit('message:new', message);
      } else {
        const room = getTenantRoom();
        if (room) {
          io.to(room).emit('message:new', message);
        } else {
          io.emit('message:new', message);
        }
      }

      // Thread reply notification
      if (threadId) {
        const room = channelId ? `channel:${channelId}` : getTenantRoom();
        if (room) {
          io.to(room).emit('thread:reply', { threadId, message });
        }
      }

      // Notification
      const user = await prepare('SELECT name FROM users WHERE id = ?').get(data.user_id);
      const userName = user?.name || 'Unknown';
      const truncatedContent = data.content.length > 50
        ? `${data.content.substring(0, 50)}...`
        : data.content;

      const notifPayload = {
        id: Date.now(),
        type: threadId ? 'thread_reply' : 'message',
        title: threadId ? 'Thread Reply' : 'New Message',
        message: `${userName}: ${truncatedContent}`,
        senderId: data.user_id,
        channelId,
        threadId,
        read: false,
        created_at: new Date().toISOString(),
      };

      const notifRoom = getTenantRoom();
      if (notifRoom) {
        socket.to(notifRoom).emit('notification:new', notifPayload);
      } else {
        socket.broadcast.emit('notification:new', notifPayload);
      }

      // Queue message for RAG vector indexing
      queueEmbedding('message', message.id).catch(() => {});
    } catch (err) {
      console.error('Socket message:send error:', err);
    }
  });

  // ── Task Updates ──
  socket.on('task:update', async (data) => {
    try {
      if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
        console.error(`Socket task:update error: Invalid priority "${data.priority}"`);
        return;
      }
      await prepare(
        'UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description), priority = COALESCE(?, priority), assigned_to = COALESCE(?, assigned_to), estimated_hours = COALESCE(?, estimated_hours), version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(data.title, data.description, data.priority, data.assigned_to, data.estimated_hours, data.id);
      const task = await prepare(`
        SELECT t.*, u.name as assigned_name, u.avatar_color
        FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
      `).get(data.id);

      const room = task?.workspace_id ? `workspace:${task.workspace_id}` : getTenantRoom();
      if (room) {
        io.to(room).emit('task:updated', task);
      } else {
        io.emit('task:updated', task);
      }

      // Queue for RAG re-indexing if content changed
      if (data.title || data.description) {
        queueEmbedding('task', data.id).catch(() => {});
      }
    } catch (err) {
      console.error('Socket task:update error:', err);
    }
  });

  // ── Task Move (Status Change) ──
  socket.on('task:move', async (data) => {
    try {
      if (data.status && !VALID_STATUSES.includes(data.status)) {
        console.error(`Socket task:move error: Invalid status "${data.status}"`);
        return;
      }
      await prepare('UPDATE tasks SET status = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(data.status, data.id);
      const task = await prepare(`
        SELECT t.*, u.name as assigned_name, u.avatar_color
        FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
      `).get(data.id);
      await prepare('INSERT INTO activities (user_id, action, details, org_id, workspace_id, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        data.user_id || 1, 'moved', `Task "${task.title}" to ${data.status}`,
        socket.org_id || null, task?.workspace_id || null, 'task', task?.id
      );

      const room = task?.workspace_id ? `workspace:${task.workspace_id}` : getTenantRoom();
      if (room) {
        io.to(room).emit('task:moved', task);
        io.to(room).emit('activity:new', {
          user_id: data.user_id || 1,
          action: 'moved',
          details: `Task "${task.title}" to ${data.status}`,
          created_at: new Date().toISOString(),
        });
      } else {
        io.emit('task:moved', task);
        io.emit('activity:new', {
          user_id: data.user_id || 1,
          action: 'moved',
          details: `Task "${task.title}" to ${data.status}`,
          created_at: new Date().toISOString(),
        });
      }

      // Queue for RAG re-indexing (status metadata affects search results)
      queueEmbedding('task', data.id).catch(() => {});
    } catch (err) {
      console.error('Socket task:move error:', err);
    }
  });

  // ── Task Delete ──
  socket.on('task:delete', async (data) => {
    try {
      const task = await prepare('SELECT * FROM tasks WHERE id = ?').get(data.id);
      // Manual CASCADE for SQLite compat
      await prepare('DELETE FROM subtasks WHERE task_id = ?').run(data.id);
      await prepare('DELETE FROM comments WHERE task_id = ?').run(data.id);
      await prepare('DELETE FROM task_tags WHERE task_id = ?').run(data.id);
      await prepare('DELETE FROM tasks WHERE id = ?').run(data.id);
      await prepare('INSERT INTO activities (user_id, action, details, org_id, workspace_id, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        data.user_id || 1, 'deleted', `Task deleted (id: ${data.id})`,
        socket.org_id || null, task?.workspace_id || null, 'task', data.id
      );

      const room = task?.workspace_id ? `workspace:${task.workspace_id}` : getTenantRoom();
      if (room) {
        io.to(room).emit('task:deleted', { id: data.id });
      } else {
        io.emit('task:deleted', { id: data.id });
      }
    } catch (err) {
      console.error('Socket task:delete error:', err);
    }
  });

  // ── Timer Events ──
  socket.on('timer:start', (data) => {
    const room = getTenantRoom();
    if (room) {
      socket.to(room).emit('timer:start', data);
    } else {
      socket.broadcast.emit('timer:start', data);
    }
  });

  socket.on('timer:stop', async (data) => {
    try {
      await prepare('UPDATE tasks SET actual_hours = ? WHERE id = ?').run(data.actualHours, data.taskId);
      const room = getTenantRoom();
      if (room) {
        socket.to(room).emit('timer:stop', data);
      } else {
        socket.broadcast.emit('timer:stop', data);
      }
    } catch (err) {
      console.error('Socket timer:stop error:', err);
    }
  });

  // ── User Status ──
  socket.on('user:status', async (data) => {
    try {
      await prepare('UPDATE users SET is_online = ? WHERE id = ?').run(data.is_online ? 1 : 0, data.user_id);
      const room = getTenantRoom();
      if (room) {
        io.to(room).emit('user:status', data);
      } else {
        io.emit('user:status', data);
      }
    } catch (err) {
      console.error('Socket user:status error:', err);
    }
  });

  // ── Typing Indicators ──
  socket.on('typing:start', (data) => {
    const room = getTenantRoom();
    if (room) {
      socket.to(room).emit('typing:start', data);
    } else {
      socket.broadcast.emit('typing:start', data);
    }
  });

  socket.on('typing:stop', (data) => {
    const room = getTenantRoom();
    if (room) {
      socket.to(room).emit('typing:stop', data);
    } else {
      socket.broadcast.emit('typing:stop', data);
    }
  });

  socket.on('disconnect', () => {
    console.info('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.info(`\nReceived ${signal}. Shutting down gracefully...`);
  try {
    if (DB_MODE === 'sqlite') {
      console.info('Flushing pending database writes...');
      await flushSave();
      console.info('Database flushed successfully.');
    } else {
      console.info('Closing PostgreSQL connection pool...');
      await closePool();
      console.info('Pool closed successfully.');
    }
  } catch (error) {
    console.error('Error during shutdown:', error);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

server.listen(PORT, () => {
  console.info(`HackBoard server running on port ${PORT} [${DB_MODE}]`);
});
