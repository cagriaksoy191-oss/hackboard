import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret');
if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined.");
  process.exit(1);
}

import { initDB, prepare, flushSave, closePool, DB_MODE, VALID_STATUSES, VALID_PRIORITIES } from './db-adapter.js';
import seed from './seed.js';

import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import activityRoutes from './routes/activities.js';
import analyticsRoutes from './routes/analytics.js';
import milestoneRoutes from './routes/milestones.js';
import notificationRoutes from './routes/notifications.js';
import backupRoutes from './routes/backup.js';

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

// Authentication middleware
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      if (decoded && decoded.userId) {
        const user = await prepare('SELECT id FROM users WHERE id = ?').get(decoded.userId);
        if (user) {
          req.user_id = decoded.userId;
        }
      }
    } catch (err) {
      console.error('Auth middleware token/db error:', err);
    }
  }

  // Allow all requests to /api/users to pass without authentication
  // so the login screen works. This allows creating, editing, and deleting characters before login.
  if (req.originalUrl.startsWith('/api/users')) {
    return next();
  }

  if (!req.user_id) {
    return res.status(401).json({ error: 'Unauthorized: Missing or Invalid Token' });
  }

  next();
};

app.use('/api', requireAuth);


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
await seed();

app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/backup', backupRoutes);

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
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (!decoded || !decoded.userId) {
      return next(new Error('Unauthorized: Invalid Token payload'));
    }

    const user = await prepare('SELECT id FROM users WHERE id = ?').get(decoded.userId);
    if (!user) {
      return next(new Error('Unauthorized: Invalid User ID'));
    }

    socket.user_id = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Auth error: ' + err.message));
  }
});

io.on('connection', (socket) => {

  console.info('Client connected:', socket.id);

  socket.on('message:send', async (data) => {
    try {
      const result = await prepare('INSERT INTO messages (user_id, content) VALUES (?, ?)').run(data.user_id, data.content);
      const message = await prepare(`
        SELECT m.*, u.name, u.avatar_color
        FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
      `).get(result.lastInsertRowid);
      io.emit('message:new', message);

      const user = await prepare('SELECT name FROM users WHERE id = ?').get(data.user_id);
      const userName = user?.name || 'Unknown';
      const truncatedContent = data.content.length > 50
        ? `${data.content.substring(0, 50)}...`
        : data.content;

      socket.broadcast.emit('notification:new', {
        id: Date.now(),
        type: 'message',
        title: 'New Message',
        message: `${userName}: ${truncatedContent}`,
        senderId: data.user_id,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Socket message:send error:', err);
    }
  });

  socket.on('task:update', async (data) => {
    try {
      if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
        console.error(`Socket task:update error: Invalid priority "${data.priority}"`);
        return;
      }
      await prepare(
        'UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description), priority = COALESCE(?, priority), assigned_to = COALESCE(?, assigned_to), estimated_hours = COALESCE(?, estimated_hours), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(data.title, data.description, data.priority, data.assigned_to, data.estimated_hours, data.id);
      const task = await prepare(`
        SELECT t.*, u.name as assigned_name, u.avatar_color
        FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
      `).get(data.id);
      io.emit('task:updated', task);
    } catch (err) {
      console.error('Socket task:update error:', err);
    }
  });

  socket.on('task:move', async (data) => {
    try {
      if (data.status && !VALID_STATUSES.includes(data.status)) {
        console.error(`Socket task:move error: Invalid status "${data.status}"`);
        return;
      }
      await prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(data.status, data.id);
      const task = await prepare(`
        SELECT t.*, u.name as assigned_name, u.avatar_color
        FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
      `).get(data.id);
      await prepare('INSERT INTO activities (user_id, action, details) VALUES (?, ?, ?)').run(
        data.user_id || 1, 'moved', `Task "${task.title}" to ${data.status}`
      );
      io.emit('task:moved', task);
      io.emit('activity:new', {
        user_id: data.user_id || 1,
        action: 'moved',
        details: `Task "${task.title}" to ${data.status}`,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Socket task:move error:', err);
    }
  });

  socket.on('task:delete', async (data) => {
    try {
      // Manual CASCADE for SQLite compat; PG ON DELETE CASCADE handles this too
      await prepare('DELETE FROM subtasks WHERE task_id = ?').run(data.id);
      await prepare('DELETE FROM comments WHERE task_id = ?').run(data.id);
      await prepare('DELETE FROM tasks WHERE id = ?').run(data.id);
      await prepare('INSERT INTO activities (user_id, action, details) VALUES (?, ?, ?)').run(
        data.user_id || 1, 'deleted', `Task deleted (id: ${data.id})`
      );
      io.emit('task:deleted', { id: data.id });
    } catch (err) {
      console.error('Socket task:delete error:', err);
    }
  });

  socket.on('timer:start', (data) => {
    socket.broadcast.emit('timer:start', data);
  });

  socket.on('timer:stop', async (data) => {
    try {
      await prepare('UPDATE tasks SET actual_hours = ? WHERE id = ?').run(data.actualHours, data.taskId);
      socket.broadcast.emit('timer:stop', data);
    } catch (err) {
      console.error('Socket timer:stop error:', err);
    }
  });

  socket.on('user:status', async (data) => {
    try {
      await prepare('UPDATE users SET is_online = ? WHERE id = ?').run(data.is_online ? 1 : 0, data.user_id);
      io.emit('user:status', data);
    } catch (err) {
      console.error('Socket user:status error:', err);
    }
  });

  socket.on('typing:start', (data) => {
    socket.broadcast.emit('typing:start', data);
  });

  socket.on('typing:stop', (data) => {
    socket.broadcast.emit('typing:stop', data);
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
