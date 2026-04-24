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

  await t.test('DELETE /tasks/:id cascading deletes', async () => {
    // 1. Create a task
    const createRes = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Task to Delete' })
    });
    const task = await createRes.json();
    const taskId = task.id;

    // 2. Create a subtask
    const createSubRes = await fetch(`${baseUrl}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'A Subtask' })
    });
    const subtask = await createSubRes.json();

    // 3. Create a comment
    const createComRes = await fetch(`${baseUrl}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 1, content: 'A Comment' })
    });
    const comment = await createComRes.json();

    // Ensure they exist
    const subRes = await fetch(`${baseUrl}/tasks/${taskId}/subtasks`);
    const subData = await subRes.json();
    assert.strictEqual(subData.length, 1);

    const comRes = await fetch(`${baseUrl}/tasks/${taskId}/comments`);
    const comData = await comRes.json();
    assert.strictEqual(comData.length, 1);

    // 4. Delete the task
    const delRes = await fetch(`${baseUrl}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 1 })
    });
    assert.strictEqual(delRes.status, 200);

    // 5. Verify the cascade delete happened
    const checkSubRes = await fetch(`${baseUrl}/tasks/${taskId}/subtasks`);
    const checkSubData = await checkSubRes.json();
    assert.strictEqual(checkSubData.length, 0);

    const checkComRes = await fetch(`${baseUrl}/tasks/${taskId}/comments`);
    const checkComData = await checkComRes.json();
    assert.strictEqual(checkComData.length, 0);
  });
});
