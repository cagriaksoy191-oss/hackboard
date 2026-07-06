import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { initDB, prepare } from '../../db-adapter.js';
import { runMigrations } from '../../migrate.js';
import seed from '../../seed.js';
import v1MessagesRouter from '../v1/messages.js';

test('v1 messages router thread reply socket test', async (t) => {
  await initDB();
  await runMigrations();
  await seed();

  const app = express();
  app.use(express.json());

  // Setup mock tenant and user middleware
  app.use((req, res, next) => {
    req.tenant = { orgId: 1, workspaceId: 1 };
    req.user = { id: 1 };
    next();
  });

  const emittedEvents = [];
  const mockIo = {
    to: (room) => {
      return {
        emit: (event, data) => {
          emittedEvents.push({ room, event, data });
        }
      };
    }
  };

  app.set('io', mockIo);
  app.use('/v1/messages', v1MessagesRouter);

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

  await t.test('POST /v1/messages emits thread:reply when thread_id is present', async () => {
    emittedEvents.length = 0; // Clear events

    // First insert a parent message
    const parentResult = await prepare(`
      INSERT INTO messages (user_id, content, org_id, workspace_id)
      VALUES (?, ?, ?, ?)
    `).run(1, 'Parent message content', 1, 1);
    const parentId = parentResult.lastInsertRowid;

    // Send a reply
    const replyResponse = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'This is a reply',
        thread_id: parentId,
        channel_id: null
      })
    });

    assert.strictEqual(replyResponse.status, 201);
    const replyData = await replyResponse.json();
    assert.strictEqual(replyData.thread_id, parentId);

    // Verify socket emission of thread:reply
    const threadReplyEvent = emittedEvents.find(e => e.event === 'thread:reply');
    assert.ok(threadReplyEvent, 'Expected thread:reply event to be emitted');
    assert.strictEqual(threadReplyEvent.room, 'channel:1');
    assert.strictEqual(threadReplyEvent.data.threadId, parentId);
    assert.strictEqual(threadReplyEvent.data.message.content, 'This is a reply');
  });
});
