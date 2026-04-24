import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import tasksRouter from './tasks.js';
import { initDB, prepare } from '../db.js';

test('DELETE /:id - non-existent task returns 404', async (t) => {
  await initDB();

  const app = express();
  app.use(express.json());
  app.use('/tasks', tasksRouter);

  app.set('io', { emit: () => {} });

  const server = app.listen(0);
  const port = server.address().port;

  try {
    const response = await fetch(`http://localhost:${port}/tasks/999999`, {
      method: 'DELETE'
    });

    assert.strictEqual(response.status, 404, 'Should return 404 for non-existent task');
    const body = await response.json();
    assert.strictEqual(body.error, 'Task not found');
  } finally {
    server.close();
  }
});

test('DELETE /:id - existing task returns 200 and deletes task', async (t) => {
  await initDB();

  const app = express();
  app.use(express.json());
  app.use('/tasks', tasksRouter);

  app.set('io', { emit: () => {} });

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Create a task first
    const createRes = await fetch(`http://localhost:${port}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Task to delete' })
    });
    const createdTask = await createRes.json();
    const taskId = createdTask.id;

    // Delete the task
    const response = await fetch(`http://localhost:${port}/tasks/${taskId}`, {
      method: 'DELETE'
    });

    assert.strictEqual(response.status, 200, 'Should return 200 for existing task');
    const body = await response.json();
    assert.strictEqual(body.success, true);

    // Verify it's actually deleted
    const taskInDb = prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    assert.strictEqual(taskInDb, null, 'Task should be deleted from DB (sql.js returns null for no row)');
  } finally {
    server.close();
  }
});
