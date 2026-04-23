import test, { beforeEach } from 'node:test';
import assert from 'node:assert';
import { evaluateRecovery } from './recovery.js';

// Simple localStorage mock
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key) => { delete store[key]; }
  };
})();

global.localStorage = localStorageMock;

beforeEach(() => {
  localStorage.clear();
});

test('returns false if snap or health is missing', () => {
  assert.strictEqual(evaluateRecovery(null, {}), false);
  assert.strictEqual(evaluateRecovery({}, null), false);
});

test('returns false if fingerprints are missing', () => {
  assert.strictEqual(evaluateRecovery({ meta: {} }, { fingerprint: 'f1' }), false);
  assert.strictEqual(evaluateRecovery({ meta: { fingerprint: 'f1' } }, {}), false);
});

test('returns false if fingerprints match', () => {
  const snap = { meta: { fingerprint: 'match' } };
  const health = { fingerprint: 'match' };
  assert.strictEqual(evaluateRecovery(snap, health), false);
});

test('returns false if recovery is dismissed', () => {
  const snap = { meta: { fingerprint: 'snap1' } };
  const health = { fingerprint: 'server1' };
  const dismissKey = `hackboard-dismiss:server1:snap1`;
  localStorage.setItem(dismissKey, 'true');
  assert.strictEqual(evaluateRecovery(snap, health), false);
});

test('returns true if serverTotal is 0 and snapTotal > 0', () => {
  const snap = { meta: { fingerprint: 'snap1', totalRecords: 10 } };
  const health = { fingerprint: 'server1', totalRecords: 0 };
  assert.strictEqual(evaluateRecovery(snap, health), true);
});

test('returns true if serverLooksSeed is true and snapTotal > 0', () => {
  const snap = { meta: { fingerprint: 'snap1', totalRecords: 10 } };
  const health = { fingerprint: 'server1', totalRecords: 5, looksLikeSeedData: true };
  assert.strictEqual(evaluateRecovery(snap, health), true);
});

test('returns true if snapshot is newer and snapTotal >= serverTotal', () => {
  const now = new Date();
  const older = new Date(now.getTime() - 10000);
  const snap = {
    meta: { fingerprint: 'snap1', totalRecords: 10 },
    exportedAt: now.toISOString()
  };
  const health = {
    fingerprint: 'server1',
    totalRecords: 10,
    latestDataAt: older.toISOString()
  };
  assert.strictEqual(evaluateRecovery(snap, health), true);
});

test('returns true if snapTotal > serverTotal', () => {
  const snap = { meta: { fingerprint: 'snap1', totalRecords: 20 } };
  const health = { fingerprint: 'server1', totalRecords: 10 };
  assert.strictEqual(evaluateRecovery(snap, health), true);
});

test('returns false if none of the recovery conditions are met', () => {
  const now = new Date();
  const newer = new Date(now.getTime() + 10000);
  const snap = {
    meta: { fingerprint: 'snap1', totalRecords: 5 },
    exportedAt: now.toISOString()
  };
  const health = {
    fingerprint: 'server1',
    totalRecords: 10,
    latestDataAt: newer.toISOString()
  };
  assert.strictEqual(evaluateRecovery(snap, health), false);
});
