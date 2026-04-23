import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTaskStats } from './taskStats.js';

test('calculateTaskStats - should return 0 for all stats when tasks array is empty', () => {
  const result = calculateTaskStats([]);
  assert.deepEqual(result, { total: 0, done: 0, inProgress: 0, todo: 0 });
});

test('calculateTaskStats - should ignore unknown statuses and sum known statuses correctly', () => {
  const tasks = [
    { status: 'done' },
    { status: 'in-progress' },
    { status: 'todo' },
    { status: 'testing' }, // unknown/ignored
    { status: 'done' },
    { status: 'archived' }, // unknown/ignored
  ];
  const result = calculateTaskStats(tasks);
  assert.deepEqual(result, { total: 6, done: 2, inProgress: 1, todo: 1 });
});

test('calculateTaskStats - should handle missing or undefined status gracefully', () => {
  const tasks = [
    { id: 1 },
    { status: 'done' },
    { status: null },
    { status: undefined }
  ];
  const result = calculateTaskStats(tasks);
  assert.deepEqual(result, { total: 4, done: 1, inProgress: 0, todo: 0 });
});

test('calculateTaskStats - should handle null or undefined input array gracefully', () => {
  assert.deepEqual(calculateTaskStats(null), { total: 0, done: 0, inProgress: 0, todo: 0 });
  assert.deepEqual(calculateTaskStats(undefined), { total: 0, done: 0, inProgress: 0, todo: 0 });
});
