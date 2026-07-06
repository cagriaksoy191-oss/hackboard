import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { initDB, prepare, transaction } from '../../db-adapter.js';
import { runMigrations } from '../../migrate.js';
import searchRoutes from '../v1/search.js';
import { vectorStore } from '../../lib/vector-store.js';
import { startEmbeddingWorker, stopEmbeddingWorker } from '../../embedding-worker.js';

test('Milestone 4 Challenger Verification Tests', async (t) => {
  await initDB();
  await runMigrations();

  const app = express();
  app.use(express.json());

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
  });

  await t.test('1. Verify Hybrid Search RRF Ranking Logic', async () => {
    // We will insert 3 dummy tasks that will match the text query
    const orgSlug = `org-rrf-${Date.now()}`;
    const orgResult = await prepare("INSERT INTO organizations (name, slug) VALUES ('RRF Org', ?)").run(orgSlug);
    const orgId = orgResult.lastInsertRowid;

    const wsResult = await prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'RRF WS', 'rrfws')").run(orgId);
    const wsId = wsResult.lastInsertRowid;

    // Create 3 tasks with unique keywords in titles
    const t1 = await prepare(`
      INSERT INTO tasks (org_id, workspace_id, title, description, status, version)
      VALUES (?, ?, 'RRFTaskOne', 'Searchable description', 'todo', 1)
    `).run(orgId, wsId);
    const t1Id = t1.lastInsertRowid;

    const t2 = await prepare(`
      INSERT INTO tasks (org_id, workspace_id, title, description, status, version)
      VALUES (?, ?, 'RRFTaskTwo', 'Searchable description', 'todo', 1)
    `).run(orgId, wsId);
    const t2Id = t2.lastInsertRowid;

    const t3 = await prepare(`
      INSERT INTO tasks (org_id, workspace_id, title, description, status, version)
      VALUES (?, ?, 'RRFTaskThree', 'Searchable description', 'todo', 1)
    `).run(orgId, wsId);
    const t3Id = t3.lastInsertRowid;

    // Mock vectorStore.search to return specific mocked scores/ranks
    const originalSearch = vectorStore.search;
    vectorStore.search = async (queryVector, options) => {
      // Return semantic results in order: Task Three, Task Two, Task One
      return [
        {
          score: 0.99, // Task Three: Rank 1
          sourceType: 'task',
          sourceId: t3Id,
          chunkText: 'RRFTaskThree: Searchable description',
          chunkIndex: 0,
        },
        {
          score: 0.70, // Task Two: Rank 2
          sourceType: 'task',
          sourceId: t2Id,
          chunkText: 'RRFTaskTwo: Searchable description',
          chunkIndex: 0,
        },
        {
          score: 0.50, // Task One: Rank 5 (simulate other matches ahead)
          sourceType: 'task',
          sourceId: t1Id,
          chunkText: 'RRFTaskOne: Searchable description',
          chunkIndex: 0,
        }
      ];
    };

    try {
      currentTenant = { orgId, workspaceId: wsId };
      // Text search query 'RRFTask' will return:
      // Task One (match in title - boosted score 0.75 * 1.2 = 0.90, rank 1)
      // Task Two (match in title - boosted score 0.75 * 1.2 = 0.90, rank 2)
      // Task Three (match in title - boosted score 0.75 * 1.2 = 0.90, rank 3)
      // Let's verify text search rankings first.
      const textResponse = await fetch(`${baseUrl}/v1/search?q=RRFTask&mode=text`);
      const textData = await textResponse.json();
      
      // Let's check text ranking order
      assert.strictEqual(textData.results[0].entity.id, t1Id);
      assert.strictEqual(textData.results[1].entity.id, t2Id);
      assert.strictEqual(textData.results[2].entity.id, t3Id);

      // Now query in hybrid mode
      const hybridResponse = await fetch(`${baseUrl}/v1/search?q=RRFTask&mode=hybrid`);
      const hybridData = await hybridResponse.json();

      // RRF calculations:
      // Task 1: Text Rank 1, Semantic Rank 3. Score = 1/(60+1) + 1/(60+3) = 0.032266
      // Task 2: Text Rank 2, Semantic Rank 2. Score = 1/(60+2) + 1/(60+2) = 0.032258
      // Task 3: Text Rank 3, Semantic Rank 1. Score = 1/(60+3) + 1/(60+1) = 0.032266
      // Let's see how RRF resolves ties or orders them.
      // Task 1 and Task 3 have identical score (0.032), Task 2 is slightly lower (0.032).
      // Let's tweak our mock so Task 2 clearly wins!
      // If Task 1 is Rank 1 in Text, Rank 5 in Semantic: 1/61 + 1/65 = 0.031777
      // If Task 2 is Rank 2 in Text, Rank 2 in Semantic: 1/62 + 1/62 = 0.032258
      // If Task 3 is Rank 3 in Text, Rank 4 in Semantic: 1/63 + 1/64 = 0.031502
      // Let's update the mock to return:
      // Rank 1: some other item (not task 2 or 1)
      // Wait, we can just return Task 2 as Semantic Rank 2, Task 1 as Semantic Rank 5, Task 3 as Semantic Rank 4.
      vectorStore.search = async (queryVector, options) => {
        return [
          {
            score: 0.99, // Some other task to occupy Rank 1
            sourceType: 'task',
            sourceId: 99999,
            chunkText: 'Other task',
            chunkIndex: 0,
          },
          {
            score: 0.85, // Task Two: Rank 2
            sourceType: 'task',
            sourceId: t2Id,
            chunkText: 'RRFTaskTwo: Searchable description',
            chunkIndex: 0,
          },
          {
            score: 0.80, // Some other task to occupy Rank 3
            sourceType: 'task',
            sourceId: 99998,
            chunkText: 'Other task 2',
            chunkIndex: 0,
          },
          {
            score: 0.75, // Task Three: Rank 4
            sourceType: 'task',
            sourceId: t3Id,
            chunkText: 'RRFTaskThree: Searchable description',
            chunkIndex: 0,
          },
          {
            score: 0.70, // Task One: Rank 5
            sourceType: 'task',
            sourceId: t1Id,
            chunkText: 'RRFTaskOne: Searchable description',
            chunkIndex: 0,
          }
        ];
      };

      const hybridResponse2 = await fetch(`${baseUrl}/v1/search?q=RRFTask&mode=hybrid`);
      const hybridData2 = await hybridResponse2.json();

      // RRF scores:
      // Task 2: Text Rank 2, Semantic Rank 2. Score = 1/62 + 1/62 = 0.032
      // Task 1: Text Rank 1, Semantic Rank 5. Score = 1/61 + 1/65 = 0.0318 => 0.032 (due to rounding to 3 decimal places)
      // Wait, let's verify if Task 2 is ranked #1 of our three targets.
      // Expected RRF Scores (rounded to 3 decimal places in the API response):
      // Task 2: 0.032
      // Task 1: 0.032 (actually 0.03177)
      // Task 3: 0.032 (actually 0.03150)
      // Let's verify that Task 2 has a higher raw score in the Javascript representation or is sorted first.
      // Indeed, the API sorts them before rounding: `rrfResults.sort((a, b) => b.score - a.score)`.
      // So Task 2 MUST be first!
      const results = hybridData2.results.filter(r => r.entity && [t1Id, t2Id, t3Id].includes(r.entity.id));
      
      assert.strictEqual(results[0].entity.id, t2Id, 'Task 2 should rank first due to RRF rank fusion');
      assert.strictEqual(results[1].entity.id, t1Id, 'Task 1 should rank second');
      assert.strictEqual(results[2].entity.id, t3Id, 'Task 3 should rank third');
      
      console.log('✔ RRF ranking logic verified successfully (Task 2 ranked first: RRF uses ranks, not raw scores).');
    } finally {
      vectorStore.search = originalSearch;
    }
  });

  await t.test('2. Verify Workspace ID Scoping (Prevent Leakage)', async () => {
    const orgSlug = `org-scoping-${Date.now()}`;
    const orgResult = await prepare("INSERT INTO organizations (name, slug) VALUES ('Scoping Org', ?)").run(orgSlug);
    const orgId = orgResult.lastInsertRowid;

    // Two workspaces
    const ws1Result = await prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'WS 1', 'ws1')").run(orgId);
    const ws1Id = ws1Result.lastInsertRowid;

    const ws2Result = await prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'WS 2', 'ws2')").run(orgId);
    const ws2Id = ws2Result.lastInsertRowid;

    // Tasks
    await prepare(`
      INSERT INTO tasks (org_id, workspace_id, title, description, status, version)
      VALUES (?, ?, 'ScopingTask ws1', 'Task description', 'todo', 1)
    `).run(orgId, ws1Id);

    await prepare(`
      INSERT INTO tasks (org_id, workspace_id, title, description, status, version)
      VALUES (?, ?, 'ScopingTask ws2', 'Task description', 'todo', 1)
    `).run(orgId, ws2Id);

    // Messages
    const userResult = await prepare("INSERT INTO users (name, role, avatar_color) VALUES ('Scoping Tester', 'member', '#ef4444')").run();
    const userId = userResult.lastInsertRowid;

    await prepare(`
      INSERT INTO messages (user_id, content, org_id, workspace_id, channel_id, embedding_status)
      VALUES (?, 'ScopingMsg ws1', ?, ?, NULL, 'indexed')
    `).run(userId, orgId, ws1Id);

    await prepare(`
      INSERT INTO messages (user_id, content, org_id, workspace_id, channel_id, embedding_status)
      VALUES (?, 'ScopingMsg ws2', ?, ?, NULL, 'indexed')
    `).run(userId, orgId, ws2Id);

    // Test text search workspace scoping (WS1)
    currentTenant = { orgId, workspaceId: ws1Id };
    let response = await fetch(`${baseUrl}/v1/search?q=ScopingTask&mode=text`);
    let data = await response.json();
    assert.strictEqual(data.results.length, 1);
    assert.strictEqual(data.results[0].entity.title, 'ScopingTask ws1');

    response = await fetch(`${baseUrl}/v1/search?q=ScopingMsg&mode=text`);
    data = await response.json();
    assert.strictEqual(data.results.length, 1);
    assert.strictEqual(data.results[0].entity.content, 'ScopingMsg ws1');

    // Test text search workspace scoping (WS2)
    currentTenant = { orgId, workspaceId: ws2Id };
    response = await fetch(`${baseUrl}/v1/search?q=ScopingTask&mode=text`);
    data = await response.json();
    assert.strictEqual(data.results.length, 1);
    assert.strictEqual(data.results[0].entity.title, 'ScopingTask ws2');

    response = await fetch(`${baseUrl}/v1/search?q=ScopingMsg&mode=text`);
    data = await response.json();
    assert.strictEqual(data.results.length, 1);
    assert.strictEqual(data.results[0].entity.content, 'ScopingMsg ws2');

    console.log('✔ Workspace ID scoping verified successfully (No leak between workspaces).');
  });

  await t.test('3. Verify Background Worker setTimeout Loop & Concurrency Protection', async () => {
    // 1. Verify startEmbeddingWorker double invocation protection
    await startEmbeddingWorker(100);
    // Double start
    const originalConsoleWarn = console.warn;
    let warnCalled = false;
    console.warn = (msg) => {
      if (msg && msg.includes('Worker already running')) {
        warnCalled = true;
      }
    };
    await startEmbeddingWorker(100);
    console.warn = originalConsoleWarn;
    assert.ok(warnCalled, 'Double start should warn and exit early');

    // Stop it
    stopEmbeddingWorker();

    // 2. Verify no duplicates are created in SQLite embeddings table after multiple worker index cycles
    const orgSlug = `org-concurrent-${Date.now()}`;
    const orgResult = await prepare("INSERT INTO organizations (name, slug) VALUES ('Concurrent Org', ?)").run(orgSlug);
    const orgId = orgResult.lastInsertRowid;
    const wsResult = await prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'WS Concurrent', 'wsconcurrent')").run(orgId);
    const wsId = wsResult.lastInsertRowid;

    // Create multiple pending tasks
    const taskIds = [];
    for (let i = 0; i < 5; i++) {
      const res = await prepare(`
        INSERT INTO tasks (org_id, workspace_id, title, description, status, version, embedding_status)
        VALUES (?, ?, 'ConcurrentTask ' || ?, 'Task description', 'todo', 1, 'pending')
      `).run(orgId, wsId, i);
      taskIds.push(res.lastInsertRowid);
    }

    // Start worker and run multiple loops
    await startEmbeddingWorker(50);
    await new Promise(resolve => setTimeout(resolve, 300));
    stopEmbeddingWorker();

    // Verify all tasks were processed and their status is 'indexed'
    for (const id of taskIds) {
      const task = await prepare("SELECT embedding_status FROM tasks WHERE id = ?").get(id);
      assert.strictEqual(task.embedding_status, 'indexed');
    }

    // Verify no duplicates exist in the embeddings table
    const duplicates = await prepare(`
      SELECT source_type, source_id, chunk_index, COUNT(*) as cnt
      FROM embeddings
      WHERE source_type = 'task' AND source_id IN (?, ?, ?, ?, ?)
      GROUP BY source_type, source_id, chunk_index
      HAVING cnt > 1
    `).all(...taskIds);

    assert.strictEqual(duplicates.length, 0, 'No duplicate chunks should exist in embeddings table');
    console.log('✔ Concurrency and deduplication verified (no duplicate embedding chunks generated).');
  });
});
