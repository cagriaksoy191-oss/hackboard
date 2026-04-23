import test from 'node:test';
import assert from 'node:assert';
import { assertValidTable, BACKUP_TABLES, MAX_ID_QUERY_BY_TABLE, COUNT_QUERY_BY_TABLE } from './db.js';

test('assertValidTable - accepts valid tables from allowlist', () => {
  for (const table of BACKUP_TABLES) {
    assert.doesNotThrow(() => assertValidTable(table), 'Should not throw for valid table: ' + table);
  }
});

test('assertValidTable - throws on invalid tables (SQL injection attempts)', () => {
  const invalidTables = [
    'users; DROP TABLE users;',
    'tasks" OR 1=1--',
    'non_existent_table',
    '',
    null,
    undefined,
    123
  ];

  for (const invalidTable of invalidTables) {
    assert.throws(
      () => assertValidTable(invalidTable),
      {
        message: new RegExp('Security Error: Invalid table name provided for query execution: ' + invalidTable)
      },
      'Should throw for invalid table: ' + invalidTable
    );
  }
});

test('query maps construct safe SQL', () => {
  assert.strictEqual(MAX_ID_QUERY_BY_TABLE['users'], 'SELECT MAX(id) FROM "users"');
  assert.strictEqual(COUNT_QUERY_BY_TABLE['tasks'], 'SELECT COUNT(*) FROM "tasks"');

  // ensure no undefined keys were created
  for (const table of BACKUP_TABLES) {
    assert.ok(MAX_ID_QUERY_BY_TABLE[table]);
    assert.ok(COUNT_QUERY_BY_TABLE[table]);
  }
});
