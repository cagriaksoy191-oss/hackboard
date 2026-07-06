import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { initDB, prepare, transaction } from '../../db-adapter.js';
import { runMigrations } from '../../migrate.js';
import searchRoutes from '../v1/search.js';
import { startEmbeddingWorker, stopEmbeddingWorker, queueEmbedding } from '../../embedding-worker.js';

test('Milestone 4 RAG & Search Integration Tests', async (t) => {
  await initDB();
  await runMigrations();

  const app = express();
  app.use(express.json());

  // Dynamic tenant context middleware for tests
  let currentTenant = { orgId: 1, workspaceId: 1 };
  app.use((req, res, next) => {
    req.tenant = currentTenant;
    req.user = { id: 1 };
    next();
  });

  app.use('/v1/search', searchRoutes);

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
    stopEmbeddingWorker();
  });

  await t.test('Task 1: Verify workspace scoping in text search (Prevent Leakage)', async () => {
    // 1. Create a dummy organization
    const orgSlug = `org-m4-${Date.now()}`;
    const orgResult = await prepare("INSERT INTO organizations (name, slug) VALUES ('M4 Org', ?)").run(orgSlug);
    const orgId = orgResult.lastInsertRowid;

    // 2. Create two workspaces under the same organization
    const ws1Result = await prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'WS 1', 'ws1')").run(orgId);
    const ws1Id = ws1Result.lastInsertRowid;

    const ws2Result = await prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'WS 2', 'ws2')").run(orgId);
    const ws2Id = ws2Result.lastInsertRowid;

    // 3. Create a task in WS 1 and WS 2 with similar titles
    await prepare(`
      INSERT INTO tasks (org_id, workspace_id, title, description, status, version)
      VALUES (?, ?, 'UniqueTaskSearchTitle ws1', 'Task description', 'todo', 1)
    `).run(orgId, ws1Id);

    await prepare(`
      INSERT INTO tasks (org_id, workspace_id, title, description, status, version)
      VALUES (?, ?, 'UniqueTaskSearchTitle ws2', 'Task description', 'todo', 1)
    `).run(orgId, ws2Id);

    // Test A: Search scoped to WS 1
    currentTenant = { orgId, workspaceId: ws1Id };
    let response = await fetch(`${baseUrl}/v1/search?q=UniqueTaskSearchTitle&mode=text`);
    assert.strictEqual(response.status, 200);
    let data = await response.json();
    
    // Should only contain ws1 task
    assert.strictEqual(data.results.length, 1);
    assert.strictEqual(data.results[0].entity.title, 'UniqueTaskSearchTitle ws1');

    // Test B: Search scoped to WS 2
    currentTenant = { orgId, workspaceId: ws2Id };
    response = await fetch(`${baseUrl}/v1/search?q=UniqueTaskSearchTitle&mode=text`);
    assert.strictEqual(response.status, 200);
    data = await response.json();

    // Should only contain ws2 task
    assert.strictEqual(data.results.length, 1);
    assert.strictEqual(data.results[0].entity.title, 'UniqueTaskSearchTitle ws2');
  });

  await t.test('Task 2: Verify channel-less messages are returned (LEFT JOIN channels)', async () => {
    // 1. Create a dummy organization and workspace
    const orgSlug = `org-msg-${Date.now()}`;
    const orgResult = await prepare("INSERT INTO organizations (name, slug) VALUES ('Msg Org', ?)").run(orgSlug);
    const orgId = orgResult.lastInsertRowid;

    const wsResult = await prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'Msg WS', 'msgws')").run(orgId);
    const wsId = wsResult.lastInsertRowid;

    // Insert user
    const userResult = await prepare("INSERT INTO users (name, role, avatar_color) VALUES ('M4 Tester', 'member', '#ef4444')").run();
    const userId = userResult.lastInsertRowid;

    // 2. Insert a message with channel_id = NULL
    const msgResult = await prepare(`
      INSERT INTO messages (user_id, content, org_id, workspace_id, channel_id, embedding_status)
      VALUES (?, 'SuperSecretChannelLessMessageContent', ?, ?, NULL, 'indexed')
    `).run(userId, orgId, wsId);

    // Search for message
    currentTenant = { orgId, workspaceId: wsId };
    const response = await fetch(`${baseUrl}/v1/search?q=SuperSecretChannelLessMessageContent&mode=text`);
    assert.strictEqual(response.status, 200);
    const data = await response.json();

    assert.strictEqual(data.results.length, 1);
    assert.strictEqual(data.results[0].entity.content, 'SuperSecretChannelLessMessageContent');
    assert.strictEqual(data.results[0].entity.channel_name, null); // Left join should keep channel_name as null
  });

  await t.test('Task 3: Verify RRF scoring and sorting logic', async () => {
    // We will verify the API responds and ranks appropriately
    currentTenant = { orgId: 1, workspaceId: 1 };
    const response = await fetch(`${baseUrl}/v1/search?q=test&mode=hybrid`);
    assert.strictEqual(response.status, 200);
    const data = await response.json();
    assert.ok(Array.isArray(data.results));
    
    // Validate score sorting order (descending)
    let lastScore = Infinity;
    for (const res of data.results) {
      assert.ok(res.score <= lastScore, `Scores not in descending order: ${res.score} after ${lastScore}`);
      lastScore = res.score;
    }
  });

  await t.test('Task 4: Background worker message embedding queue integration', async () => {
    // Insert a new message with pending status
    const orgSlug = `org-worker-${Date.now()}`;
    const orgResult = await prepare("INSERT INTO organizations (name, slug) VALUES ('Worker Org', ?)").run(orgSlug);
    const orgId = orgResult.lastInsertRowid;

    const wsResult = await prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'Worker WS', 'workerws')").run(orgId);
    const wsId = wsResult.lastInsertRowid;

    const userResult = await prepare("INSERT INTO users (name, role, avatar_color) VALUES ('Worker Tester', 'member', '#ef4444')").run();
    const userId = userResult.lastInsertRowid;

    const msgResult = await prepare(`
      INSERT INTO messages (user_id, content, org_id, workspace_id, channel_id, embedding_status)
      VALUES (?, 'Message to be indexed by worker', ?, ?, NULL, 'pending')
    `).run(userId, orgId, wsId);
    const messageId = msgResult.lastInsertRowid;

    // Start worker
    await startEmbeddingWorker(100); // 100ms interval for tests

    // Wait a brief moment for worker to poll and index message
    await new Promise(resolve => setTimeout(resolve, 800));

    // Stop worker
    stopEmbeddingWorker();

    // Check if status updated to 'indexed'
    const updatedMsg = await prepare("SELECT embedding_status FROM messages WHERE id = ?").get(messageId);
    assert.strictEqual(updatedMsg.embedding_status, 'indexed');
  });
});
