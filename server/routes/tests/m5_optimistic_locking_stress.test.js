import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { initDB, prepare } from '../../db.js';

test('Optimistic Locking Stress Test - 15 Concurrent updates', async () => {
  await initDB();
  const { runMigrations } = await import('../../migrate.js');
  await runMigrations();

  // Create organization and workspace
  const suffix = Math.random().toString(36).substring(7);
  const orgResult = prepare(`INSERT INTO organizations (name, slug) VALUES ('Stress Org', 'stressorg-${suffix}')`).run();
  const orgId = orgResult.lastInsertRowid;
  const wsResult = prepare(`INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'Stress Workspace', 'stressws-${suffix}')`).run(orgId);
  const wsId = wsResult.lastInsertRowid;

  // Insert a task with initial version = 1
  const taskResult = prepare("INSERT INTO tasks (org_id, workspace_id, title, status, version) VALUES (?, ?, 'Stress Task', 'todo', 1)").run(orgId, wsId);
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

  // Mock socket io
  app.set('io', {
    to: () => ({ emit: () => {} }),
    emit: () => {}
  });

  const server = app.listen(0);
  const port = server.address().port;

  try {
    const concurrency = 15;
    const requests = [];

    // Send 15 parallel status update requests all pointing to version = 1
    for (let i = 0; i < concurrency; i++) {
      requests.push(
        fetch(`http://localhost:${port}/tasks/${taskId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'testing', version: 1 })
        })
      );
    }

    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status);

    // Filter successful (200) and conflict (409) statuses
    const successCount = statuses.filter(s => s === 200).length;
    const conflictCount = statuses.filter(s => s === 409).length;

    assert.strictEqual(successCount, 1, 'Exactly one concurrent request must succeed');
    assert.strictEqual(conflictCount, concurrency - 1, `Exactly ${concurrency - 1} requests must conflict (409)`);

    // Verify task version is exactly 2 in DB
    const finalTask = await prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
    assert.strictEqual(finalTask.version, 2, 'The version must be incremented exactly once');
  } finally {
    server.close();
  }
});
