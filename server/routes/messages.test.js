import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import messagesRouter from './messages.js';
import { initDB } from '../db.js';
import seed from '../seed.js';

describe('Messages API', () => {
  let app;
  let server;
  let port;

  before(async () => {
    await initDB();
    seed();

    app = express();
    app.use(express.json());
    app.use('/messages', messagesRouter);

    app.set('io', { emit: () => {} });

    server = await new Promise((resolve) => {
      const srv = app.listen(0, () => resolve(srv));
    });
    port = server.address().port;
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  it('GET /messages returns all messages ordered by created_at', async () => {
    const res = await fetch(`http://localhost:${port}/messages`);
    assert.strictEqual(res.status, 200, 'Expected status code 200');

    const data = await res.json();
    assert.ok(Array.isArray(data), 'Expected data to be an array');
    assert.ok(data.length > 0, 'Expected messages from seed data');

    const firstMessage = data[0];
    assert.ok(firstMessage.hasOwnProperty('id'));
    assert.ok(firstMessage.hasOwnProperty('content'));
    assert.ok(firstMessage.hasOwnProperty('user_id'));
    assert.ok(firstMessage.hasOwnProperty('name'));
    assert.ok(firstMessage.hasOwnProperty('avatar_color'));
    assert.ok(firstMessage.hasOwnProperty('created_at'));

    // Verify ordering
    const isOrdered = data.every((val, i, arr) =>
      !i || new Date(val.created_at) >= new Date(arr[i - 1].created_at)
    );
    assert.ok(isOrdered, 'Expected messages to be ordered by created_at ASC');
  });

  it('POST /messages creates a new message and returns it with user info', async () => {
    const payload = {
      user_id: 1,
      content: 'This is a test message'
    };

    const res = await fetch(`http://localhost:${port}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 201, 'Expected status code 201');

    const data = await res.json();
    assert.ok(data.id, 'Expected new message to have an id');
    assert.strictEqual(data.content, 'This is a test message', 'Expected content to match');
    assert.strictEqual(data.user_id, 1, 'Expected user_id to match');

    // Check if JOIN fields exist
    assert.ok(data.hasOwnProperty('name'));
    assert.ok(data.hasOwnProperty('avatar_color'));
  });
});
