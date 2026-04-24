import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import taskRoutes from '../tasks.js';
import { initDB } from '../../db.js';

test('tasks router validation test', async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/tasks', taskRoutes);

  await initDB();

  let server;
  let baseUrl;

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });

  t.after(() => {
    if (server) {
      server.close();
    }
  });

  await t.test('POST /tasks handles missing title validation gracefully', async () => {
    const response = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.strictEqual(response.status, 400);
    const data = await response.json();
    assert.strictEqual(data.error, 'Title is required');
  });

  await t.test('POST /tasks handles empty title validation gracefully', async () => {
    const response = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ' })
    });

    assert.strictEqual(response.status, 400);
    const data = await response.json();
    assert.strictEqual(data.error, 'Title is required');
  });

  await t.test('POST /tasks creates task with valid title', async () => {
    const response = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'A valid title' })
    });

    assert.strictEqual(response.status, 201);
    const data = await response.json();
    assert.strictEqual(data.title, 'A valid title');
    assert.ok(data.id);
  });
});
