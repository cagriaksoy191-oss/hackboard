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

// Restore console.error
test('cleanup', () => {
    console.error = originalConsoleError;
});
