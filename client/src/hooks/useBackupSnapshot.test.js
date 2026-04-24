import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// 1. Setup DOM *before* any other imports run
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  writable: true,
  configurable: true,
});

global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value.toString(); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

// Use dynamic imports to ensure they evaluate AFTER the DOM is initialized
const { default: socket } = await import('../lib/socket.js');
const { backupAPI } = await import('../lib/api.js');
const { renderHook, act, cleanup } = await import('@testing-library/react');
const { useBackupSnapshot } = await import('./useBackupSnapshot.js');

const SNAPSHOT_KEY = 'hackboard-snapshot:v1';

describe('useBackupSnapshot', () => {
  beforeEach(() => {
    localStorage.clear();
    mock.method(backupAPI, 'exportData', async () => ({ data: { meta: { fingerprint: 'snap-123', totalRecords: 10 } } }));
    mock.method(backupAPI, 'getHealth', async () => ({ data: { fingerprint: 'server-123', totalRecords: 15, looksLikeSeedData: false } }));
  });

  afterEach(() => {
    cleanup();
    mock.restoreAll();
  });

  test('loads initial state correctly', async () => {
    const { result, unmount } = renderHook(() => useBackupSnapshot());

    assert.equal(result.current.snapshot, null);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    assert.ok(result.current.serverHealth);
    assert.equal(result.current.serverHealth.fingerprint, 'server-123');

    assert.ok(result.current.snapshot);
    assert.equal(result.current.snapshot.meta.fingerprint, 'snap-123');

    unmount();
    if (socket.disconnect) socket.disconnect();
  });

  test('loads snapshot from storage if available', async () => {
    const mockSnap = { meta: { fingerprint: 'stored-snap', totalRecords: 10 } };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(mockSnap));

    const { result, unmount } = renderHook(() => useBackupSnapshot());

    assert.equal(result.current.snapshot.meta.fingerprint, 'stored-snap');

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    assert.equal(result.current.snapshot.meta.fingerprint, 'stored-snap');

    unmount();
    if (socket.disconnect) socket.disconnect();
  });

  test('dismissRecovery logic works', async () => {
    const mockSnap = { meta: { fingerprint: 'snap1', totalRecords: 10 } };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(mockSnap));
    mock.method(backupAPI, 'getHealth', async () => ({ data: { fingerprint: 'server1', totalRecords: 0, looksLikeSeedData: true } }));

    const { result, unmount } = renderHook(() => useBackupSnapshot());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    assert.equal(result.current.showRecovery, true);

    await act(async () => {
      result.current.dismissRecovery();
    });

    assert.equal(result.current.showRecovery, false);
    assert.ok(localStorage.getItem('hackboard-dismiss:server1:snap1'));

    unmount();
    if (socket.disconnect) socket.disconnect();
  });

  test('triggers auto snapshot on socket events after debounce', async () => {
    const handlers = {};
    mock.method(socket, 'on', (event, handler) => { handlers[event] = handler; });
    mock.method(socket, 'off', () => {});

    // Use fake timers to fast-forward the 5 second debounce safely
    mock.timers.enable();

    const { result, unmount } = renderHook(() => useBackupSnapshot());

    await act(async () => {
      // Allow initial effects to settle
      await Promise.resolve();
    });

    mock.method(backupAPI, 'exportData', async () => ({ data: { meta: { fingerprint: 'new-auto-snap' } } }));

    await act(async () => {
      // Simulate the socket event firing
      if (handlers['task:created']) {
        handlers['task:created']();
      }

      // Advance timers by the 5000ms debounce
      mock.timers.tick(5000);

      // Give promises a chance to resolve
      await Promise.resolve();
    });

    assert.equal(result.current.snapshot.meta.fingerprint, 'new-auto-snap');

    unmount();
    // Disable timers to prevent hanging the rest of the node process
    mock.timers.reset();
    if (socket.disconnect) socket.disconnect();
  });
});
