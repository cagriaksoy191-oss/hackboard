import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { io as ioClient } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
const dbFile = path.join(process.cwd(), `hackboard.test.m3.${process.pid}.db`);
process.env.DATABASE_PATH = dbFile;

const { initDB, prepare, flushSave } = await import('../../db-adapter.js');
const { runMigrations } = await import('../../migrate.js');

const JWT_SECRET = 'test-secret-key-12345';
const PORT = 3015;
const BASE_URL = `http://localhost:${PORT}`;

function generateToken(userId, orgId) {
  return jwt.sign({ userId, orgId }, JWT_SECRET, { expiresIn: '15m', algorithm: 'HS256' });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn('node', ['server/server.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: PORT.toString(),
        JWT_SECRET: JWT_SECRET,
        NODE_ENV: 'test',
        DATABASE_PATH: dbFile
      }
    });

    let started = false;

    serverProcess.stdout.on('data', (data) => {
      const str = data.toString().trim();
      console.log(`[Server Stdout] ${str}`);
      if (str.includes('running on port') || str.includes('running on') || str.includes('running')) {
        if (!started) {
          started = true;
          setTimeout(() => resolve(serverProcess), 200);
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Stderr] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
      if (!started) reject(err);
    });

    serverProcess.on('exit', (code) => {
      if (!started) reject(new Error(`Server exited early with code ${code}`));
    });
  });
}

const connectSocket = (userId, orgId) => {
  return new Promise((resolve, reject) => {
    const token = generateToken(userId, orgId);
    const socket = ioClient(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true
    });
    socket.on('connect', () => {
      console.log(`[Client Test] Connected user ${userId}, org ${orgId} with ID: ${socket.id}`);
      resolve(socket);
    });
    socket.on('connect_error', (err) => reject(err));
  });
};

const waitForEvent = (socket, eventName, timeoutMs = 2000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName);
      reject(new Error(`Timeout waiting for event ${eventName}`));
    }, timeoutMs);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
};

test('Milestone 3 Integration Tests', async (t) => {
  // 1. Seed database with additional test data before spawning server
  await initDB();
  await runMigrations();
  
  // Insert test organization 2
  await prepare("INSERT INTO organizations (name, slug, plan) VALUES ('Org 2', 'org-2', 'free') ON CONFLICT(slug) DO UPDATE SET name=name").run();
  const org2 = await prepare("SELECT id FROM organizations WHERE slug = 'org-2'").get();
  const org2Id = org2.id;
  
  // Insert test workspace 2
  await prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'Workspace 2', 'workspace-2') ON CONFLICT(org_id, slug) DO UPDATE SET name=name").run(org2Id);
  const ws2 = await prepare("SELECT id FROM workspaces WHERE org_id = ? AND slug = 'workspace-2'").get(org2Id);
  const ws2Id = ws2.id;
  
  // Insert test channel 2
  await prepare("INSERT INTO channels (workspace_id, name, slug, is_default) VALUES (?, 'General 2', 'general-2', 1) ON CONFLICT(workspace_id, slug) DO UPDATE SET name=name").run(ws2Id);
  const ch2 = await prepare("SELECT id FROM channels WHERE workspace_id = ? AND slug = 'general-2'").get(ws2Id);
  const ch2Id = ch2.id;
  
  // Add membership for User 3 (Ahmet) in Org 2
  await prepare("INSERT OR IGNORE INTO org_memberships (org_id, user_id, role) VALUES (?, 3, 'member')").run(org2Id);
  
  await flushSave();

  console.log(`[Test Seeding] Resolved org2Id: ${org2Id}, ws2Id: ${ws2Id}, ch2Id: ${ch2Id}`);

  // 2. Start the real server
  console.log('Spawning server process...');
  const serverProcess = await startServer();
  console.log('Server process started successfully.');

  t.after(() => {
    console.log('Shutting down server process...');
    serverProcess.kill('SIGKILL');
    try {
      if (fs.existsSync(dbFile)) {
        fs.unlinkSync(dbFile);
      }
    } catch (e) {
      console.warn('Failed to clean up test database file:', e.message);
    }
  });

  await t.test('Task 1: Verify socket room isolation prevents message leakage across workspaces/channels', async () => {
    let socketA, socketB;
    try {
      // Socket A: User 1 in Org 1
      socketA = await connectSocket(1, 1);
      // Socket B: User 3 in Org 2
      socketB = await connectSocket(3, org2Id);

      // Socket A joins Workspace 1, Channel 1
      socketA.emit('workspace:join', { workspaceId: 1, channelId: 1 });
      // Socket B joins Workspace 2, Channel 2
      socketB.emit('workspace:join', { workspaceId: ws2Id, channelId: ch2Id });

      // Wait for server to process join events
      await new Promise(r => setTimeout(r, 100));

      // Verify room isolation from Org 1 -> Org 2
      let bReceived = false;
      socketB.on('message:new', () => { bReceived = true; });

      const msgPromiseA = waitForEvent(socketA, 'message:new');
      socketA.emit('message:send', { content: 'Leak test message from A', channel_id: 1 });
      const msgA = await msgPromiseA;
      assert.strictEqual(msgA.content, 'Leak test message from A');

      await new Promise(r => setTimeout(r, 300));
      assert.strictEqual(bReceived, false, 'Socket B (in Org 2) should NOT receive messages from Channel 1 (in Org 1)');

      // Verify room isolation from Org 2 -> Org 1
      let aReceived = false;
      socketA.on('message:new', (m) => { if (m.content === 'Leak test message from B') aReceived = true; });

      const msgPromiseB = waitForEvent(socketB, 'message:new');
      socketB.emit('message:send', { content: 'Leak test message from B', channel_id: ch2Id });
      const msgB = await msgPromiseB;
      assert.strictEqual(msgB.content, 'Leak test message from B');

      await new Promise(r => setTimeout(r, 300));
      assert.strictEqual(aReceived, false, 'Socket A (in Org 1) should NOT receive messages from Channel 2 (in Org 2)');
    } catch (err) {
      console.error('--- TEST 1 FAILED ---', err);
      throw err;
    } finally {
      if (socketA) socketA.disconnect();
      if (socketB) socketB.disconnect();
    }
  });

  await t.test('Task 2: Verify thread replies on HTTP POST correctly reach subscribed clients', async () => {
    let socketA, socketC;
    try {
      socketA = await connectSocket(1, 1);
      socketC = await connectSocket(4, 1); // User 4 in Org 1

      socketA.emit('workspace:join', { workspaceId: 1, channelId: 1 });
      socketC.emit('workspace:join', { workspaceId: 1, channelId: 1 });

      await new Promise(r => setTimeout(r, 100));

      // Post a parent message using HTTP POST
      const tokenA = generateToken(1, 1);
      const parentRes = await fetch(`${BASE_URL}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenA}`,
          'X-Org-ID': '1',
          'X-Workspace-ID': '1',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: 'Parent Message for Thread Test'
        })
      });
      assert.strictEqual(parentRes.status, 201);
      const parentMsg = await parentRes.json();
      const parentId = parentMsg.id;

      // Post a thread reply using HTTP POST
      const replyPromise = waitForEvent(socketC, 'thread:reply');
      const replyRes = await fetch(`${BASE_URL}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenA}`,
          'X-Org-ID': '1',
          'X-Workspace-ID': '1',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: 'HTTP thread reply content',
          thread_id: parentId,
          channel_id: 1
        })
      });
      assert.strictEqual(replyRes.status, 201);
      const replyMsg = await replyRes.json();
      assert.strictEqual(replyMsg.thread_id, parentId);

      // Wait and verify Socket C received the 'thread:reply' event
      const threadReplyEvent = await replyPromise;
      assert.strictEqual(threadReplyEvent.threadId, parentId);
      assert.strictEqual(threadReplyEvent.message.content, 'HTTP thread reply content');
    } catch (err) {
      console.error('--- TEST 2 FAILED ---', err);
      throw err;
    } finally {
      if (socketA) socketA.disconnect();
      if (socketC) socketC.disconnect();
    }
  });

  await t.test('Task 3: Test edge cases - invalid thread IDs, missing workspace IDs, and connection drops', async () => {
    let socketA, socketC;
    try {
      socketA = await connectSocket(1, 1);
      socketC = await connectSocket(4, 1);

      socketA.emit('workspace:join', { workspaceId: 1, channelId: 1 });
      socketC.emit('workspace:join', { workspaceId: 1, channelId: 1 });
      await new Promise(r => setTimeout(r, 100));

      const tokenA = generateToken(1, 1);

      // 3.1 HTTP POST with invalid thread ID
      const badReplyRes = await fetch(`${BASE_URL}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenA}`,
          'X-Org-ID': '1',
          'X-Workspace-ID': '1',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: 'Reply with invalid thread',
          thread_id: 999999,
          channel_id: 1
        })
      });
      assert.strictEqual(badReplyRes.status, 404);
      const errorData = await badReplyRes.json();
      assert.strictEqual(errorData.error, 'Parent message not found');

      // 3.2 Socket emit with invalid thread ID
      let socketAReceived = false;
      socketA.on('message:new', () => { socketAReceived = true; });
      socketA.emit('message:send', { content: 'Invalid thread msg via socket', thread_id: 999999, channel_id: 1 });
      await new Promise(r => setTimeout(r, 300));
      assert.strictEqual(socketAReceived, false, 'Message with invalid thread ID on socket should be ignored');

      // 3.3 HTTP POST with missing workspace ID (broadcasts to tenant room)
      const noWorkspacePromise = waitForEvent(socketA, 'message:new');
      const noWorkspaceRes = await fetch(`${BASE_URL}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenA}`,
          'X-Org-ID': '1',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: 'Message without Workspace ID'
        })
      });
      assert.strictEqual(noWorkspaceRes.status, 201);
      const receivedMsg = await noWorkspacePromise;
      assert.strictEqual(receivedMsg.content, 'Message without Workspace ID');
      assert.strictEqual(receivedMsg.workspace_id, null);

      // 3.4 Socket connection drop during typing indicator
      socketA.emit('typing:start', { channel_id: 1, username: 'Çağrı' });
      const typingStartData = await waitForEvent(socketC, 'typing:start');
      assert.strictEqual(typingStartData.username, 'Çağrı');

      // Abruptly disconnect Socket A
      socketA.disconnect();
      await new Promise(r => setTimeout(r, 100));

      // Verify Socket C is still healthy and can communicate
      socketC.emit('typing:start', { channel_id: 1, username: 'Talha' });
    } catch (err) {
      console.error('--- TEST 3 FAILED ---', err);
      throw err;
    } finally {
      if (socketA) socketA.disconnect();
      if (socketC) socketC.disconnect();
    }
  });
});
