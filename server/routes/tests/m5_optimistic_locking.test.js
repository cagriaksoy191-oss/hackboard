import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { initDB } from '../../db.js';
import { prepare } from '../../db.js';

test('Optimistic Locking - PUT /:id and PATCH /:id/status validation', async () => {
  await initDB();
  const { runMigrations } = await import('../../migrate.js');
  await runMigrations();

  // Create a clean organization and workspace
  const suffix = Math.random().toString(36).substring(7);
  const orgResult = prepare(`INSERT INTO organizations (name, slug) VALUES ('Locking Org', 'lockingorg-${suffix}')`).run();
  const orgId = orgResult.lastInsertRowid;
  const wsResult = prepare(`INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'Locking Workspace', 'lockingws-${suffix}')`).run(orgId);
  const wsId = wsResult.lastInsertRowid;

  // Insert a task
  const taskResult = prepare("INSERT INTO tasks (org_id, workspace_id, title, status, version) VALUES (?, ?, 'Initial Task', 'todo', 1)").run(orgId, wsId);
  const taskId = taskResult.lastInsertRowid;

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.tenant = { orgId, workspaceId: wsId };
    req.user = { id: 1 };
    next();
  });

  const tasksRouter = (await import('../v1/tasks.js')).default;
  app.use('/tasks', tasksRouter);

  // Attach dummy io object supporting .to().emit()
  app.set('io', {
    to: () => ({
      emit: () => {}
    }),
    emit: () => {}
  });

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 1. Missing version in PUT
    const res1 = await fetch(`http://localhost:${port}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title' })
    });
    assert.strictEqual(res1.status, 400);
    const data1 = await res1.json();
    assert.strictEqual(data1.error, 'version is required');

    // 2. Non-numeric version in PUT
    const res2 = await fetch(`http://localhost:${port}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title', version: 'one' })
    });
    assert.strictEqual(res2.status, 400);

    // 3. Missing version in PATCH status
    const res3 = await fetch(`http://localhost:${port}/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in-progress' })
    });
    assert.strictEqual(res3.status, 400);

    // 4. Correct version update (succeeds, bumps version to 2)
    const res4 = await fetch(`http://localhost:${port}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Title Correct', version: 1 })
    });
    assert.strictEqual(res4.status, 200);
    const data4 = await res4.json();
    assert.strictEqual(data4.version, 2);

    // 5. Conflicting version update (returns 409)
    const res5 = await fetch(`http://localhost:${port}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Conflicting Title', version: 1 })
    });
    assert.strictEqual(res5.status, 409);
    const data5 = await res5.json();
    assert.strictEqual(data5.conflict, true);

    // 6. Non-existent task ID (returns 404)
    const res6 = await fetch(`http://localhost:${port}/tasks/999999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Non-existent Task', version: 1 })
    });
    assert.strictEqual(res6.status, 404);
  } finally {
    server.close();
  }
});

test('Optimistic Locking - Parallel Conflicting Updates & Atomicity', async () => {
  await initDB();
  const { runMigrations } = await import('../../migrate.js');
  await runMigrations();

  const suffix = Math.random().toString(36).substring(7);
  const orgResult = prepare(`INSERT INTO organizations (name, slug) VALUES ('Parallel Org', 'parallelorg-${suffix}')`).run();
  const orgId = orgResult.lastInsertRowid;
  const wsResult = prepare(`INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'Parallel Workspace', 'parallelws-${suffix}')`).run(orgId);
  const wsId = wsResult.lastInsertRowid;

  const taskResult = prepare("INSERT INTO tasks (org_id, workspace_id, title, status, version) VALUES (?, ?, 'Parallel Task', 'todo', 1)").run(orgId, wsId);
  const taskId = taskResult.lastInsertRowid;

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.tenant = { orgId, workspaceId: wsId };
    req.user = { id: 1 };
    next();
  });

  const tasksRouter = (await import('../v1/tasks.js')).default;
  app.use('/tasks', tasksRouter);
  
  app.set('io', {
    to: () => ({
      emit: () => {}
    }),
    emit: () => {}
  });

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Fire two concurrent status update requests with the same version (1)
    const [resA, resB] = await Promise.all([
      fetch(`http://localhost:${port}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in-progress', version: 1 })
      }),
      fetch(`http://localhost:${port}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'testing', version: 1 })
      })
    ]);

    // One of them must succeed (200), and the other must fail with conflict (409)
    const statuses = [resA.status, resB.status];
    assert.ok(statuses.includes(200), 'At least one request should succeed');
    assert.ok(statuses.includes(409), 'One request should fail with conflict 409');

    // Verify task version in DB is exactly 2, and status is either 'in-progress' or 'testing'
    const finalTask = await prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
    assert.strictEqual(finalTask.version, 2);
    assert.ok(['in-progress', 'testing'].includes(finalTask.status));
  } finally {
    server.close();
  }
});
