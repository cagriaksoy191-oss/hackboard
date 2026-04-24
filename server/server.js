import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import cors from 'cors';
import { initDB, prepare, flushSave } from './db.js';
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

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
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
seed();

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

io.on('connection', (socket) => {
  console.info('Client connected:', socket.id);

  socket.on('message:send', (data) => {
    const result = prepare('INSERT INTO messages (user_id, content) VALUES (?, ?)').run(data.user_id, data.content);
    const message = prepare(`
      SELECT m.*, u.name, u.avatar_color
      FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
    `).get(result.lastInsertRowid);
    io.emit('message:new', message);

    const user = prepare('SELECT name FROM users WHERE id = ?').get(data.user_id);
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
  });

  socket.on('task:update', (data) => {
    prepare(
      'UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description), priority = COALESCE(?, priority), assigned_to = COALESCE(?, assigned_to), estimated_hours = COALESCE(?, estimated_hours), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(data.title, data.description, data.priority, data.assigned_to, data.estimated_hours, data.id);
    const task = prepare(`
      SELECT t.*, u.name as assigned_name, u.avatar_color
      FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
    `).get(data.id);
    io.emit('task:updated', task);
  });

  socket.on('task:move', async (data) => {
    prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(data.status, data.id);
    const task = prepare(`
      SELECT t.*, u.name as assigned_name, u.avatar_color
      FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?
    `).get(data.id);
    prepare('INSERT INTO activities (user_id, action, details) VALUES (?, ?, ?)').run(
      data.user_id || 1, 'moved', `Task "${task.title}" to ${data.status}`
    );
    io.emit('task:moved', task);
    io.emit('activity:new', {
      user_id: data.user_id || 1,
      action: 'moved',
      details: `Task "${task.title}" to ${data.status}`,
      created_at: new Date().toISOString(),
    });
  });

  socket.on('task:delete', (data) => {
    prepare('DELETE FROM subtasks WHERE task_id = ?').run(data.id);
    prepare('DELETE FROM comments WHERE task_id = ?').run(data.id);
    prepare('DELETE FROM tasks WHERE id = ?').run(data.id);
    prepare('INSERT INTO activities (user_id, action, details) VALUES (?, ?, ?)').run(
      data.user_id || 1, 'deleted', `Task deleted (id: ${data.id})`
    );
    io.emit('task:deleted', { id: data.id });
  });

  socket.on('timer:start', (data) => {
    socket.broadcast.emit('timer:start', data);
  });

  socket.on('timer:stop', (data) => {
    prepare('UPDATE tasks SET actual_hours = ? WHERE id = ?').run(data.actualHours, data.taskId);
    socket.broadcast.emit('timer:stop', data);
  });

  socket.on('user:status', (data) => {
    prepare('UPDATE users SET is_online = ? WHERE id = ?').run(data.is_online ? 1 : 0, data.user_id);
    io.emit('user:status', data);
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

// Graceful shutdown to ensure database is written to disk
async function gracefulShutdown(signal) {
  console.info(`\nReceived ${signal}. Shutting down gracefully...`);
  try {
    console.info('Flushing pending database writes...');
    await flushSave();
    console.info('Database flushed successfully.');
  } catch (error) {
    console.error('Error during database flush:', error);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

server.listen(PORT, () => {

  console.info(`HackBoard server running on port ${PORT}`);
});
