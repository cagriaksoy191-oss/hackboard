import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

// ─────────────────────────────────────────────
// Placeholder conversion:  ?  →  $1, $2, $3 …
// All SQL in the codebase is authored with "?"
// placeholders (SQLite-native). This function
// converts them to PostgreSQL numbered params.
// Safe because "?" only appears as a parameter
// placeholder in well-formed parameterized SQL.
// ─────────────────────────────────────────────
function toPgParams(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

// ─────────────────────────────────────────────
// Shared constants (mirrored from db.js)
// ─────────────────────────────────────────────
export const BACKUP_TABLES = Object.freeze([
  'users', 'tasks', 'subtasks', 'comments',
  'messages', 'activities', 'milestones',
]);

export const VALID_STATUSES = ['todo', 'in-progress', 'testing', 'done'];
export const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const TURKISH_CHAR_MAP = Object.freeze({
  'İ': 'I', 'i': 'i', 'ı': 'i', 'I': 'I',
});

const THEME_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#737373', '#a1a1aa',
];

const SEED_NAMES = Object.freeze(['Cagri', 'Talha', 'Ahmet', 'Alaettin']);
const NORMALIZED_SEED_NAMES = Object.freeze(
  SEED_NAMES.map((sn) => sn.toLowerCase().replace(/[^a-z]/g, ''))
);

// ─────────────────────────────────────────────
// Connection pool
// ─────────────────────────────────────────────
let pool = null;

export async function initDB() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,   // 10s — handles Supabase cold starts
    ssl: { rejectUnauthorized: false },
    keepAlive: true,                  // prevents firewall idle-drops
    keepAliveInitialDelayMillis: 10000,
  });

  // Surface pool-level errors (prevents unhandled rejections)
  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });

  // Retry connection up to 3 times (cold start resilience)
  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        console.info(`PostgreSQL connection verified (attempt ${attempt}/${MAX_RETRIES}).`);
      } finally {
        client.release();
      }
      // Connection successful — run startup tasks and return
      await normalizeUserColors();
      return;
    } catch (err) {
      lastError = err;
      console.warn(`PostgreSQL connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        const delay = attempt * 2000; // 2s, 4s
        console.info(`Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw new Error(`PostgreSQL connection failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

export function getPool() {
  if (!pool) throw new Error('PostgreSQL pool not initialized');
  return pool;
}

// ─────────────────────────────────────────────
// Core query helpers
// Uses "?" placeholders → auto-converted to $N
// ─────────────────────────────────────────────

/**
 * prepare(sql) — returns an object matching the
 * old sql.js interface but async.
 *
 *   .run(params)  → { lastInsertRowid }
 *   .get(params)  → row | null
 *   .all(params)  → [rows]
 */
export function prepare(sql) {
  const pgSql = toPgParams(sql);

  return {
    async run(...params) {
      const flatParams =
        params.length === 1 && Array.isArray(params[0])
          ? params[0]
          : params;

      // For INSERT statements, append RETURNING id to capture lastInsertRowid
      const isInsert = /^\s*INSERT\s/i.test(pgSql);
      let finalSql = pgSql;
      if (isInsert && !/RETURNING\s/i.test(pgSql)) {
        finalSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
      }

      const result = await pool.query(finalSql, flatParams);
      const lastInsertRowid =
        result.rows && result.rows.length > 0 && result.rows[0].id != null
          ? result.rows[0].id
          : 0;
      return { lastInsertRowid, changes: result.rowCount };
    },

    async get(...params) {
      const flatParams =
        params.length === 1 && Array.isArray(params[0])
          ? params[0]
          : params;
      const result = await pool.query(pgSql, flatParams);
      return result.rows[0] || null;
    },

    async all(...params) {
      const flatParams =
        params.length === 1 && Array.isArray(params[0])
          ? params[0]
          : params;
      const result = await pool.query(pgSql, flatParams);
      return result.rows;
    },
  };
}

/**
 * execRaw(sql) — run raw SQL without parameters.
 * Returns array of row objects.
 */
export async function execRaw(sql) {
  const result = await pool.query(sql);
  return result.rows;
}

/**
 * transaction(fn) — execute fn inside a real
 * PostgreSQL transaction (BEGIN / COMMIT / ROLLBACK).
 * fn receives a dedicated client and must return a
 * value (awaitable).
 */
export function transaction(fn) {
  return async (...args) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(...args);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };
}

// ─────────────────────────────────────────────
// Flush / save stubs (no-op for PostgreSQL;
// persistence is inherent)
// ─────────────────────────────────────────────
export async function flushSave() {
  /* no-op — PostgreSQL writes are durable by default */
}

// ─────────────────────────────────────────────
// Color normalization (startup migration)
// ─────────────────────────────────────────────
const hexToRgb = (hex) => {
  if (!hex || hex.length !== 7) return [0, 0, 0];
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
};

const getClosestColor = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  let minDist = Infinity;
  let closest = THEME_COLORS[0];
  for (const tc of THEME_COLORS) {
    const [tr, tg, tb] = hexToRgb(tc);
    const d = (r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2;
    if (d < minDist) { minDist = d; closest = tc; }
  }
  return closest;
};

async function normalizeUserColors() {
  const { rows } = await pool.query('SELECT id, avatar_color FROM users');
  for (const row of rows) {
    if (!THEME_COLORS.includes(row.avatar_color)) {
      const closest = getClosestColor(row.avatar_color);
      await pool.query(
        'UPDATE users SET avatar_color = $1 WHERE id = $2',
        [closest, row.id]
      );
    }
  }
}

// ─────────────────────────────────────────────
// Backup: Export
// ─────────────────────────────────────────────
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k]));
  return '{' + pairs.join(',') + '}';
}

function computeFingerprint(dataObj) {
  return crypto.createHash('sha256').update(stableStringify(dataObj)).digest('hex');
}

async function queryAllRows(sql) {
  const { rows } = await pool.query(sql);
  return rows;
}

async function buildFingerprintData() {
  const users = await queryAllRows('SELECT * FROM users ORDER BY id');
  const normalizedUsers = users.map((u) => ({ ...u, is_online: 0 }));
  return {
    users: normalizedUsers,
    tasks: await queryAllRows('SELECT * FROM tasks ORDER BY id'),
    subtasks: await queryAllRows('SELECT * FROM subtasks ORDER BY id'),
    comments: await queryAllRows('SELECT * FROM comments ORDER BY id'),
    messages: await queryAllRows('SELECT * FROM messages ORDER BY id'),
    activities: await queryAllRows('SELECT * FROM activities ORDER BY id'),
    milestones: await queryAllRows('SELECT * FROM milestones ORDER BY id'),
  };
}

async function buildExportData() {
  return {
    users: await queryAllRows('SELECT * FROM users ORDER BY id'),
    tasks: await queryAllRows('SELECT * FROM tasks ORDER BY id'),
    subtasks: await queryAllRows('SELECT * FROM subtasks ORDER BY id'),
    comments: await queryAllRows('SELECT * FROM comments ORDER BY id'),
    messages: await queryAllRows('SELECT * FROM messages ORDER BY id'),
    activities: await queryAllRows('SELECT * FROM activities ORDER BY id'),
    milestones: await queryAllRows('SELECT * FROM milestones ORDER BY id'),
  };
}

export async function buildExportPayload() {
  const dataObj = await buildExportData();
  const fingerprintData = await buildFingerprintData();

  const tableCounts = {};
  for (const t of BACKUP_TABLES) tableCounts[t] = dataObj[t].length;
  const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);

  const allDates = [
    ...dataObj.tasks.map((t) => t.updated_at || t.created_at),
    ...dataObj.messages.map((m) => m.created_at),
    ...dataObj.activities.map((a) => a.created_at),
    ...dataObj.comments.map((c) => c.created_at),
    ...dataObj.milestones.map((m) => m.target_time),
  ].filter(Boolean).sort();

  const latestDataAt = allDates.length > 0 ? allDates[allDates.length - 1] : null;
  const fingerprint = computeFingerprint(fingerprintData);

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: dataObj,
    meta: { tableCounts, totalRecords, latestDataAt, fingerprint },
  };
}

// ─────────────────────────────────────────────
// Backup: Import / Restore
// ─────────────────────────────────────────────
function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object')
    return { valid: false, error: 'Payload is not a valid object' };
  if (payload.version !== '1.0.0')
    return { valid: false, error: 'Unsupported backup version. Expected 1.0.0, got: ' + (payload.version || 'unknown') };
  if (!payload.data || typeof payload.data !== 'object')
    return { valid: false, error: 'Missing data section in payload' };

  for (const table of BACKUP_TABLES) {
    if (!Array.isArray(payload.data[table]))
      return { valid: false, error: 'Missing or invalid table: ' + table };
  }

  const userIds = new Set(payload.data.users.map((u) => u.id));
  const taskIds = new Set(payload.data.tasks.map((t) => t.id));

  for (const task of payload.data.tasks) {
    if (!task.title || typeof task.title !== 'string')
      return { valid: false, error: 'Task missing title: ' + JSON.stringify(task) };
    if (!VALID_STATUSES.includes(task.status))
      return { valid: false, error: 'Invalid task status: ' + task.status };
    if (!VALID_PRIORITIES.includes(task.priority))
      return { valid: false, error: 'Invalid task priority: ' + task.priority };
    if (task.assigned_to != null && !userIds.has(task.assigned_to))
      return { valid: false, error: 'Task assigned_to references non-existent user: ' + task.assigned_to };
  }

  for (const sub of payload.data.subtasks) {
    if (!sub.title || typeof sub.title !== 'string')
      return { valid: false, error: 'Subtask missing title' };
    if (!taskIds.has(sub.task_id))
      return { valid: false, error: 'Subtask references non-existent task_id: ' + sub.task_id };
  }

  for (const comment of payload.data.comments) {
    if (!comment.content || typeof comment.content !== 'string')
      return { valid: false, error: 'Comment missing content' };
    if (!taskIds.has(comment.task_id))
      return { valid: false, error: 'Comment references non-existent task_id: ' + comment.task_id };
    if (!userIds.has(comment.user_id))
      return { valid: false, error: 'Comment references non-existent user_id: ' + comment.user_id };
  }

  for (const msg of payload.data.messages) {
    if (!msg.content || typeof msg.content !== 'string')
      return { valid: false, error: 'Message missing content' };
    if (!userIds.has(msg.user_id))
      return { valid: false, error: 'Message references non-existent user_id: ' + msg.user_id };
  }

  for (const act of payload.data.activities) {
    if (!act.action || typeof act.action !== 'string')
      return { valid: false, error: 'Activity missing action' };
    if (act.user_id != null && !userIds.has(act.user_id))
      return { valid: false, error: 'Activity references non-existent user_id: ' + act.user_id };
  }

  return { valid: true, error: null };
}

export async function restoreBackupData(payload) {
  const validation = validateBackupPayload(payload);
  if (!validation.valid) throw new Error(validation.error);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear all tables in FK-safe order
    await client.query('DELETE FROM activities');
    await client.query('DELETE FROM comments');
    await client.query('DELETE FROM subtasks');
    await client.query('DELETE FROM messages');
    await client.query('DELETE FROM milestones');
    await client.query('DELETE FROM tasks');
    await client.query('DELETE FROM users');

    const { data } = payload;

    // Restore in FK-safe order
    for (const u of data.users) {
      await client.query(
        'INSERT INTO users (id, name, role, avatar_color, is_online, is_deleted, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [u.id, u.name, u.role, u.avatar_color, 0, u.is_deleted || 0, u.created_at]
      );
    }
    for (const t of data.tasks) {
      await client.query(
        'INSERT INTO tasks (id, title, description, status, priority, assigned_to, estimated_hours, actual_hours, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [t.id, t.title, t.description || '', t.status, t.priority, t.assigned_to, t.estimated_hours, t.actual_hours, t.created_at, t.updated_at]
      );
    }
    for (const s of data.subtasks) {
      await client.query(
        'INSERT INTO subtasks (id, task_id, title, is_completed) VALUES ($1,$2,$3,$4)',
        [s.id, s.task_id, s.title, s.is_completed]
      );
    }
    for (const c of data.comments) {
      await client.query(
        'INSERT INTO comments (id, task_id, user_id, content, created_at) VALUES ($1,$2,$3,$4,$5)',
        [c.id, c.task_id, c.user_id, c.content, c.created_at]
      );
    }
    for (const m of data.messages) {
      await client.query(
        'INSERT INTO messages (id, user_id, content, created_at) VALUES ($1,$2,$3,$4)',
        [m.id, m.user_id, m.content, m.created_at]
      );
    }
    for (const a of data.activities) {
      await client.query(
        'INSERT INTO activities (id, user_id, action, details, created_at) VALUES ($1,$2,$3,$4,$5)',
        [a.id, a.user_id, a.action, a.details, a.created_at]
      );
    }
    for (const m of data.milestones) {
      await client.query(
        'INSERT INTO milestones (id, title, description, target_time, is_completed) VALUES ($1,$2,$3,$4,$5)',
        [m.id, m.title, m.description || '', m.target_time, m.is_completed]
      );
    }

    // Reset sequences to max id so new inserts get correct IDs
    for (const table of BACKUP_TABLES) {
      await client.query(`SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`);
    }

    // Verify
    const userCount = (await client.query('SELECT COUNT(*) as count FROM users')).rows[0].count;
    const taskCount = (await client.query('SELECT COUNT(*) as count FROM tasks')).rows[0].count;
    if (parseInt(userCount) !== data.users.length || parseInt(taskCount) !== data.tasks.length) {
      throw new Error('Verification failed: record count mismatch after import');
    }

    await client.query('COMMIT');

    // Build result
    const tableCounts = {};
    for (const t of BACKUP_TABLES) {
      const r = await pool.query(`SELECT COUNT(*) as count FROM ${t}`);
      tableCounts[t] = parseInt(r.rows[0].count);
    }
    const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);

    return {
      success: true,
      restoredAt: new Date().toISOString(),
      tableCounts,
      totalRecords,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// Health summary
// ─────────────────────────────────────────────
export async function getHealthSummary() {
  const tableCounts = {};
  let totalRecords = 0;

  for (const t of BACKUP_TABLES) {
    const r = await pool.query(`SELECT COUNT(*) as count FROM ${t}`);
    const count = parseInt(r.rows[0].count);
    tableCounts[t] = count;
    totalRecords += count;
  }

  const dateResult = await pool.query(
    "SELECT GREATEST(MAX(t.updated_at), MAX(m.created_at), MAX(a.created_at), MAX(c.created_at)) as latest FROM tasks t, messages m, activities a, comments c"
  ).catch(() => ({ rows: [{ latest: null }] }));
  const latestDataAt = dateResult.rows[0]?.latest || null;

  const fingerprintData = await buildFingerprintData();
  const fingerprint = computeFingerprint(fingerprintData);

  const userResult = await pool.query('SELECT name FROM users ORDER BY id');
  const userNames = userResult.rows.map((u) =>
    u.name.replace(/[İiıI]/g, (m) => TURKISH_CHAR_MAP[m] || m)
  );

  let hasOnlySeedUsers = false;
  if (userNames.length === 4) {
    const normalizedUserNames = userNames.map((un) =>
      un.toLowerCase().replace(/[^a-z]/g, '')
    );
    hasOnlySeedUsers = NORMALIZED_SEED_NAMES.every((nsn) =>
      normalizedUserNames.includes(nsn)
    );
  }

  const looksLikeSeedData =
    hasOnlySeedUsers && tableCounts.tasks <= 12 && tableCounts.messages <= 8;

  return {
    version: '1.0.0',
    tableCounts,
    totalRecords,
    latestDataAt,
    fingerprint,
    looksLikeSeedData,
  };
}

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────
export function assertValidTable(tableName) {
  if (!BACKUP_TABLES.includes(tableName)) {
    throw new Error('Security Error: Invalid table name: ' + tableName);
  }
}

// Graceful pool shutdown
export async function closePool() {
  if (pool) await pool.end();
}
