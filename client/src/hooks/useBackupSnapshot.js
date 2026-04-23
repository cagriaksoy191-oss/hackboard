import { useState, useEffect, useRef, useCallback } from 'react';
import { backupAPI } from '../lib/api';
import socket from '../lib/socket';
import { evaluateRecovery, DISMISS_KEY_PREFIX } from '../lib/recovery';

const SNAPSHOT_KEY = 'hackboard-snapshot:v1';
const MAX_SNAPSHOT_SIZE = 4 * 1024 * 1024;

export function useBackupSnapshot() {
  const [snapshot, setSnapshot] = useState(null);
  const [serverHealth, setServerHealth] = useState(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const debounceTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const serverHealthRef = useRef(null);

  const loadSnapshot = useCallback(() => {
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const saveSnapshot = useCallback((data) => {
    try {
      const raw = JSON.stringify(data);
      if (raw.length > MAX_SNAPSHOT_SIZE) {
        return { saved: false, reason: 'too_large', size: raw.length };
      }
      localStorage.setItem(SNAPSHOT_KEY, raw);
      if (isMountedRef.current) {
        setSnapshot(data);
      }
      return { saved: true, size: raw.length };
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        return { saved: false, reason: 'quota_exceeded' };
      }
      return { saved: false, reason: 'write_error' };
    }
  }, []);

  const fetchAndSaveSnapshot = useCallback(async () => {
    try {
      const res = await backupAPI.exportData();
      return saveSnapshot(res.data);
    } catch {
      return { saved: false, reason: 'fetch_error' };
    }
  }, [saveSnapshot]);

  const fetchServerHealth = useCallback(async () => {
    try {
      const res = await backupAPI.getHealth();
      const health = res.data;
      serverHealthRef.current = health;
      if (isMountedRef.current) {
        setServerHealth(health);
      }
      return health;
    } catch {
      return null;
    }
  }, []);

  const dismissRecovery = useCallback(() => {
    const snap = loadSnapshot();
    const health = serverHealthRef.current;
    if (snap?.meta?.fingerprint && health?.fingerprint) {
      const dismissKey = DISMISS_KEY_PREFIX + health.fingerprint + ':' + snap.meta.fingerprint;
      localStorage.setItem(dismissKey, Date.now().toString());
    }
    setShowRecovery(false);
  }, [loadSnapshot]);

  const triggerAutoSnapshot = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchAndSaveSnapshot();
    }, 5000);
  }, [fetchAndSaveSnapshot]);

  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      const snap = loadSnapshot();
      if (isMountedRef.current) {
        setSnapshot(snap);
      }
      const health = await fetchServerHealth();
      if (!snap && health && isMountedRef.current) {
        const result = await fetchAndSaveSnapshot();
        if (!result.saved) {
          console.warn('Initial snapshot failed:', result.reason);
        }
      }
      if (isMountedRef.current) {
        const currentSnap = loadSnapshot();
        if (currentSnap && health) {
          const shouldShow = evaluateRecovery(currentSnap, health);
          setShowRecovery(shouldShow);
        }
      }
    };

    init();

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [loadSnapshot, fetchServerHealth, fetchAndSaveSnapshot]);

  useEffect(() => {
    const events = [
      'task:created',
      'task:updated',
      'task:moved',
      'task:deleted',
      'message:new',
      'subtask:created',
      'subtask:toggled',
      'comment:added',
      'activity:new',
    ];

    const handlers = {};
    for (const event of events) {
      handlers[event] = () => {
        triggerAutoSnapshot();
      };
      socket.on(event, handlers[event]);
    }

    const handleStorageSnapshot = () => {
      const updated = loadSnapshot();
      if (isMountedRef.current) {
        setSnapshot(updated);
      }
    };
    window.addEventListener('hackboard-snapshot-updated', handleStorageSnapshot);

    return () => {
      for (const event of events) {
        socket.off(event, handlers[event]);
      }
      window.removeEventListener('hackboard-snapshot-updated', handleStorageSnapshot);
    };
  }, [triggerAutoSnapshot, loadSnapshot]);

  return {
    snapshot,
    serverHealth,
    showRecovery,
    fetchAndSaveSnapshot,
    fetchServerHealth,
    dismissRecovery,
    saveSnapshot,
    loadSnapshot,
  };
}
