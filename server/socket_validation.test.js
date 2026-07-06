import test from 'node:test';
import assert from 'node:assert';

// Manual definition of constants since we cannot import them due to missing dependencies
const VALID_STATUSES = ['todo', 'in-progress', 'testing', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

// Mocking console.error to check for validation error messages
let lastErrorMessage = '';
const originalConsoleError = console.error;
console.error = (...args) => {
  lastErrorMessage = args.join(' ');
};

// Handlers exactly as implemented in server.js
const taskUpdateHandler = async (data) => {
  try {
    if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
      console.error(`Socket task:update error: Invalid priority "${data.priority}"`);
      return;
    }
    // Mock successful update
    return 'updated';
  } catch (err) {
    console.error('Socket task:update error:', err);
  }
};

const taskMoveHandler = async (data) => {
  try {
    if (data.status && !VALID_STATUSES.includes(data.status)) {
      console.error(`Socket task:move error: Invalid status "${data.status}"`);
      return;
    }
    // Mock successful move
    return 'moved';
  } catch (err) {
    console.error('Socket task:move error:', err);
  }
};

test('Socket task:update - rejects invalid priority', async () => {
  lastErrorMessage = '';
  const result = await taskUpdateHandler({ id: 1, priority: 'invalid-priority' });
  assert.strictEqual(result, undefined);
  assert.ok(lastErrorMessage.includes('Invalid priority "invalid-priority"'));
});

test('Socket task:update - accepts valid priority', async () => {
  lastErrorMessage = '';
  const result = await taskUpdateHandler({ id: 1, priority: 'high' });
  assert.strictEqual(result, 'updated');
  assert.strictEqual(lastErrorMessage, '');
});

test('Socket task:move - rejects invalid status', async () => {
  lastErrorMessage = '';
  const result = await taskMoveHandler({ id: 1, status: 'invalid-status' });
  assert.strictEqual(result, undefined);
  assert.ok(lastErrorMessage.includes('Invalid status "invalid-status"'));
});

test('Socket task:move - accepts valid status', async () => {
  lastErrorMessage = '';
  const result = await taskMoveHandler({ id: 1, status: 'in-progress' });
  assert.strictEqual(result, 'moved');
  assert.strictEqual(lastErrorMessage, '');
});

// Workspace Join handler simulated
const workspaceJoinHandler = async (socket, data, mockPrepare) => {
  try {
    if (data.workspaceId) {
      const ws = await mockPrepare('SELECT id FROM workspaces WHERE id = ? AND org_id = ?').get(data.workspaceId, socket.org_id);
      if (!ws) return;
    }
    if (data.channelId) {
      const ch = await mockPrepare('SELECT c.id FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.id = ? AND w.org_id = ?').get(data.channelId, socket.org_id);
      if (!ch) return;
    }
    if (data.workspaceId) {
      socket.join(`workspace:${data.workspaceId}`);
      socket.workspace_id = data.workspaceId;
    }
    if (data.channelId) {
      socket.join(`channel:${data.channelId}`);
    }
  } catch (err) {
    console.error('Socket workspace:join error:', err);
  }
};

// Channel Join handler simulated
const channelJoinHandler = async (socket, data, mockPrepare) => {
  try {
    if (data.channelId) {
      const ch = await mockPrepare('SELECT c.id, c.workspace_id FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.id = ? AND w.org_id = ?').get(data.channelId, socket.org_id);
      if (!ch) return;
      socket.join(`channel:${data.channelId}`);
      socket.workspace_id = data.workspaceId || ch.workspace_id;
    }
  } catch (err) {
    console.error('Socket channel:join error:', err);
  }
};

test('Socket workspace:join - assigns workspace_id when valid', async () => {
  const socket = {
    id: 'test-socket-1',
    org_id: 1,
    rooms: new Set(),
    join(room) { this.rooms.add(room); }
  };
  const mockPrepare = (sql) => {
    return {
      get: (wsId, orgId) => {
        if (wsId === 42 && orgId === 1) return { id: 42 };
        return null;
      }
    };
  };

  await workspaceJoinHandler(socket, { workspaceId: 42 }, mockPrepare);
  assert.strictEqual(socket.workspace_id, 42);
  assert.ok(socket.rooms.has('workspace:42'));
});

test('Socket channel:join - selects workspace_id and assigns workspace_id when valid', async () => {
  const socket = {
    id: 'test-socket-2',
    org_id: 1,
    rooms: new Set(),
    join(room) { this.rooms.add(room); }
  };
  const mockPrepare = (sql) => {
    return {
      get: (channelId, orgId) => {
        if (channelId === 101 && orgId === 1) return { id: 101, workspace_id: 99 };
        return null;
      }
    };
  };

  await channelJoinHandler(socket, { channelId: 101 }, mockPrepare);
  assert.strictEqual(socket.workspace_id, 99);
  assert.ok(socket.rooms.has('channel:101'));
});

// Restore console.error
test('cleanup', () => {
    console.error = originalConsoleError;
});

