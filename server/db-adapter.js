/**
 * db-adapter.js — Dual-Mode Database Adapter
 *
 * DATABASE_URL env var varsa  → PostgreSQL  (db-pg.js)
 * DATABASE_URL env var yoksa  → SQLite      (db.js)
 *
 * Tüm route dosyaları BU modülden import eder.
 * Placeholder formatı her iki modda da "?" olarak yazılır;
 * PG modu "?" → "$1,$2…" dönüşümünü kendi içinde yapar.
 *
 * ─── ÖNEMLİ ───
 * PG modunda prepare().run / .get / .all ASYNC'tir.
 * Bu nedenle tüm route handler'lar "await" kullanmalıdır.
 * SQLite modunda da aynı fonksiyonlar çağrılabilir
 * ancak orijinal db.js senkrondur — adapter onu
 * async-sarmalayıcıya alarak API uyumunu sağlar.
 */

const USE_PG = !!process.env.DATABASE_URL;

let mod;

if (USE_PG) {
  mod = await import('./db-pg.js');
  console.info('[db-adapter] Mode: PostgreSQL (Supabase)');
} else {
  // Wrap synchronous sql.js functions so the public API is always async.
  const sqlite = await import('./db.js');

  const asyncPrepare = (sql) => {
    const stmt = sqlite.prepare(sql);
    return {
      async run(...params) { return stmt.run(...params); },
      async get(...params) { return stmt.get(...params); },
      async all(...params) { return stmt.all(...params); },
    };
  };

  mod = {
    ...sqlite,
    prepare: asyncPrepare,
    execRaw: async (sql) => sqlite.execRaw(sql),
    buildExportPayload: async () => sqlite.buildExportPayload(),
    restoreBackupData: async (p) => sqlite.restoreBackupData(p),
    getHealthSummary: async () => sqlite.getHealthSummary(),
    transaction: (fn) => {
      const wrapped = sqlite.transaction(fn);
      return async (...args) => wrapped(...args);
    },
    closePool: async () => { /* no-op for SQLite */ },
  };
  console.info('[db-adapter] Mode: SQLite (local fallback)');
}

// Re-export everything through a single, stable public API
export const initDB          = mod.initDB;
export const prepare         = mod.prepare;
export const execRaw         = mod.execRaw;
export const flushSave       = mod.flushSave;
export const transaction     = mod.transaction;
export const buildExportPayload = mod.buildExportPayload;
export const restoreBackupData  = mod.restoreBackupData;
export const getHealthSummary   = mod.getHealthSummary;
export const assertValidTable   = mod.assertValidTable;
export const closePool          = mod.closePool;

export const BACKUP_TABLES   = mod.BACKUP_TABLES;
export const VALID_STATUSES  = mod.VALID_STATUSES;
export const VALID_PRIORITIES = mod.VALID_PRIORITIES;

// Expose the mode flag for diagnostic purposes
export const DB_MODE = USE_PG ? 'postgresql' : 'sqlite';
