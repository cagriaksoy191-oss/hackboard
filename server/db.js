import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'hackboard.db');

let db = null;
let SQL = null;

export async function initDB() {
  SQL = await initSqlJs();

  let data = null;
  if (fs.existsSync(DB_PATH)) {
    try {
      data = fs.readFileSync(DB_PATH);
    } catch (e) {
      data = null;
    }
  }

  if (data && data.length > 0) {
    try {
      db = new SQL.Database(data);
    } catch (e) {
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  createSchema(db);

  saveDB();
}

function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function prepare(sql) {
  const database = getDB();
  return {
    run(...params) {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      database.run(sql, flatParams);
      const result = database.exec('SELECT last_insert_rowid()');
      const lastInsertRowid = result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : 0;
      saveDB();
      return { lastInsertRowid };
    },
    get(...params) {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const stmt = database.prepare(sql);
      if (flatParams.length > 0) stmt.bind(flatParams);
      let row = null;
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
      stmt.free();
      return row || null;
    },
    all(...params) {
      const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      const stmt = database.prepare(sql);
      if (flatParams.length > 0) stmt.bind(flatParams);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    },
  };
}

export function execRaw(sql) {
  const database = getDB();
  const results = database.exec(sql);
  if (results.length === 0) return [];
  const { columns, values } = results[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

export function transaction(fn) {
  return (...args) => {
    const result = fn(...args);
    saveDB();
    return result;
  };
}

export function createSchema(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#7c3aed',
      is_online INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      assigned_to INTEGER REFERENCES users(id),
      estimated_hours REAL DEFAULT 0,
      actual_hours REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id),
      title TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      target_time DATETIME NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0
    )
  `);
}

function queryAll(database, sql) {
  const results = database.exec(sql);
  if (results.length === 0) return [];
  const { columns, values } = results[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  const pairs = keys.map((key) => JSON.stringify(key) + ':' + stableStringify(value[key]));
  return '{' + pairs.join(',') + '}';
}

function buildFingerprintData(database) {
  const users = queryAll(database, "SELECT * FROM users ORDER BY id");
  const normalizedUsers = users.map((u) => ({ ...u, is_online: 0 }));
  return {
    users: normalizedUsers,
    tasks: queryAll(database, "SELECT * FROM tasks ORDER BY id"),
    subtasks: queryAll(database, "SELECT * FROM subtasks ORDER BY id"),
    comments: queryAll(database, "SELECT * FROM comments ORDER BY id"),
    messages: queryAll(database, "SELECT * FROM messages ORDER BY id"),
    activities: queryAll(database, "SELECT * FROM activities ORDER BY id"),
    milestones: queryAll(database, "SELECT * FROM milestones ORDER BY id"),
  };
}

function buildExportData(database) {
  return {
    users: queryAll(database, "SELECT * FROM users ORDER BY id"),
    tasks: queryAll(database, "SELECT * FROM tasks ORDER BY id"),
    subtasks: queryAll(database, "SELECT * FROM subtasks ORDER BY id"),
    comments: queryAll(database, "SELECT * FROM comments ORDER BY id"),
    messages: queryAll(database, "SELECT * FROM messages ORDER BY id"),
    activities: queryAll(database, "SELECT * FROM activities ORDER BY id"),
    milestones: queryAll(database, "SELECT * FROM milestones ORDER BY id"),
  };
}

function computeFingerprint(dataObj) {
  const canonical = stableStringify(dataObj);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export function buildExportPayload() {
  const database = getDB();

  const dataObj = buildExportData(database);
  const fingerprintData = buildFingerprintData(database);

  const tableCounts = {
    users: dataObj.users.length,
    tasks: dataObj.tasks.length,
    subtasks: dataObj.subtasks.length,
    comments: dataObj.comments.length,
    messages: dataObj.messages.length,
    activities: dataObj.activities.length,
    milestones: dataObj.milestones.length,
  };

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
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    data: dataObj,
    meta: {
      tableCounts,
      totalRecords,
      latestDataAt,
      fingerprint,
    },
  };
}

const VALID_STATUSES = ['todo', 'in-progress', 'testing', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload is not a valid object' };
  }

  if (payload.version !== '1.0.0') {
    return { valid: false, error: 'Unsupported backup version. Expected 1.0.0, got: ' + (payload.version || 'unknown') };
  }

  if (!payload.data || typeof payload.data !== 'object') {
    return { valid: false, error: 'Missing data section in payload' };
  }

  const requiredTables = ['users', 'tasks', 'subtasks', 'comments', 'messages', 'activities', 'milestones'];
  for (const table of requiredTables) {
    if (!Array.isArray(payload.data[table])) {
      return { valid: false, error: 'Missing or invalid table: ' + table };
    }
  }

  const userIds = new Set(payload.data.users.map((u) => u.id));
  const taskIds = new Set(payload.data.tasks.map((t) => t.id));

  for (const task of payload.data.tasks) {
    if (!task.title || typeof task.title !== 'string') {
      return { valid: false, error: 'Task missing title: ' + JSON.stringify(task) };
    }
    if (!VALID_STATUSES.includes(task.status)) {
      return { valid: false, error: 'Invalid task status: ' + task.status };
    }
    if (!VALID_PRIORITIES.includes(task.priority)) {
      return { valid: false, error: 'Invalid task priority: ' + task.priority };
    }
    if (task.assigned_to != null && !userIds.has(task.assigned_to)) {
      return { valid: false, error: 'Task assigned_to references non-existent user: ' + task.assigned_to };
    }
  }

  for (const sub of payload.data.subtasks) {
    if (!sub.title || typeof sub.title !== 'string') {
      return { valid: false, error: 'Subtask missing title' };
    }
    if (!taskIds.has(sub.task_id)) {
      return { valid: false, error: 'Subtask references non-existent task_id: ' + sub.task_id };
    }
  }

  for (const comment of payload.data.comments) {
    if (!comment.content || typeof comment.content !== 'string') {
      return { valid: false, error: 'Comment missing content' };
    }
    if (!taskIds.has(comment.task_id)) {
      return { valid: false, error: 'Comment references non-existent task_id: ' + comment.task_id };
    }
    if (!userIds.has(comment.user_id)) {
      return { valid: false, error: 'Comment references non-existent user_id: ' + comment.user_id };
    }
  }

  for (const msg of payload.data.messages) {
    if (!msg.content || typeof msg.content !== 'string') {
      return { valid: false, error: 'Message missing content' };
    }
    if (!userIds.has(msg.user_id)) {
      return { valid: false, error: 'Message references non-existent user_id: ' + msg.user_id };
    }
  }

  for (const act of payload.data.activities) {
    if (!act.action || typeof act.action !== 'string') {
      return { valid: false, error: 'Activity missing action' };
    }
    if (act.user_id != null && !userIds.has(act.user_id)) {
      return { valid: false, error: 'Activity references non-existent user_id: ' + act.user_id };
    }
  }

  return { valid: true, error: null };
}

export async function restoreBackupData(payload) {
  const validation = validateBackupPayload(payload);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (!SQL) {
    SQL = await initSqlJs();
  }

  const tempDB = new SQL.Database();
  try {
    createSchema(tempDB);

    const { data } = payload;

    for (const user of data.users) {
      tempDB.run(
        'INSERT INTO users (id, name, role, avatar_color, is_online, created_at) VALUES (?, ?, ?, ?, 0, ?)',
        [user.id, user.name, user.role, user.avatar_color, user.created_at]
      );
    }

    for (const task of data.tasks) {
      tempDB.run(
        'INSERT INTO tasks (id, title, description, status, priority, assigned_to, estimated_hours, actual_hours, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [task.id, task.title, task.description || '', task.status, task.priority, task.assigned_to, task.estimated_hours, task.actual_hours, task.created_at, task.updated_at]
      );
    }

    for (const sub of data.subtasks) {
      tempDB.run(
        'INSERT INTO subtasks (id, task_id, title, is_completed) VALUES (?, ?, ?, ?)',
        [sub.id, sub.task_id, sub.title, sub.is_completed]
      );
    }

    for (const comment of data.comments) {
      tempDB.run(
        'INSERT INTO comments (id, task_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
        [comment.id, comment.task_id, comment.user_id, comment.content, comment.created_at]
      );
    }

    for (const msg of data.messages) {
      tempDB.run(
        'INSERT INTO messages (id, user_id, content, created_at) VALUES (?, ?, ?, ?)',
        [msg.id, msg.user_id, msg.content, msg.created_at]
      );
    }

    for (const act of data.activities) {
      tempDB.run(
        'INSERT INTO activities (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)',
        [act.id, act.user_id, act.action, act.details, act.created_at]
      );
    }

    for (const ms of data.milestones) {
      tempDB.run(
        'INSERT INTO milestones (id, title, description, target_time, is_completed) VALUES (?, ?, ?, ?, ?)',
        [ms.id, ms.title, ms.description || '', ms.target_time, ms.is_completed]
      );
    }

    const verifyUsers = tempDB.exec('SELECT COUNT(*) FROM users');
    const verifyTasks = tempDB.exec('SELECT COUNT(*) FROM tasks');
    const expectedUsers = data.users.length;
    const expectedTasks = data.tasks.length;
    const actualUsers = verifyUsers.length > 0 && verifyUsers[0].values.length > 0 ? verifyUsers[0].values[0][0] : 0;
    const actualTasks = verifyTasks.length > 0 && verifyTasks[0].values.length > 0 ? verifyTasks[0].values[0][0] : 0;

    if (actualUsers !== expectedUsers || actualTasks !== expectedTasks) {
      throw new Error('Verification failed: record count mismatch after import');
    }

    const tablesToResetSequence = ['users', 'tasks', 'subtasks', 'comments', 'messages', 'activities', 'milestones'];
    for (const tableName of tablesToResetSequence) {
      const maxResult = tempDB.exec('SELECT MAX(id) FROM ' + tableName);
      const maxId = maxResult.length > 0 && maxResult[0].values.length > 0 && maxResult[0].values[0][0] != null ? maxResult[0].values[0][0] : 0;
      tempDB.run('DELETE FROM sqlite_sequence WHERE name = ?', [tableName]);
      if (maxId > 0) {
        tempDB.run('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)', [tableName, maxId]);
      }
    }

    db = tempDB;
    saveDB();

    const tableCounts = {};
    for (const tableName of tablesToResetSequence) {
      const countResult = tempDB.exec('SELECT COUNT(*) FROM ' + tableName);
      tableCounts[tableName] = countResult.length > 0 && countResult[0].values.length > 0 ? countResult[0].values[0][0] : 0;
    }

    const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);

    return {
      success: true,
      restoredAt: new Date().toISOString(),
      tableCounts,
      totalRecords,
    };
  } catch (error) {
    throw error;
  }
}

export function getHealthSummary() {
  const database = getDB();

  const tableCounts = {};
  const tables = ["users", "tasks", "subtasks", "comments", "messages", "activities", "milestones"];
  let totalRecords = 0;
  let latestDataAt = null;

  for (const tableName of tables) {
    const countResult = database.exec("SELECT COUNT(*) FROM " + tableName);
    const count = countResult.length > 0 && countResult[0].values.length > 0 ? countResult[0].values[0][0] : 0;
    tableCounts[tableName] = count;
    totalRecords += count;
  }

  const dateResult = database.exec(
    "SELECT MAX(latest) FROM (SELECT MAX(updated_at) as latest FROM tasks UNION ALL SELECT MAX(created_at) FROM messages UNION ALL SELECT MAX(created_at) FROM activities UNION ALL SELECT MAX(created_at) FROM comments)"
  );
  if (dateResult.length > 0 && dateResult[0].values.length > 0 && dateResult[0].values[0][0]) {
    latestDataAt = dateResult[0].values[0][0];
  }

  const dataObj = buildFingerprintData(database);
  const fingerprint = computeFingerprint(dataObj);

  const users = queryAll(database, "SELECT name FROM users ORDER BY id");
  const seedNames = ["Cagri", "Talha", "Ahmet", "Alaettin"];
  const userNames = users.map((u) => u.name.replace(/[İiıI]/g, (m) => {
    const map = { "İ": "I", "i": "i", "ı": "i", "I": "I" };
    return map[m] || m;
  }));
  const hasOnlySeedUsers = userNames.length === 4 && seedNames.every((sn) => userNames.some((un) => un.toLowerCase().replace(/[^a-z]/g, "") === sn.toLowerCase().replace(/[^a-z]/g, "")));
  const looksLikeSeedData = hasOnlySeedUsers && tableCounts.tasks <= 12 && tableCounts.messages <= 8;

  return {
    version: "1.0.0",
    tableCounts,
    totalRecords,
    latestDataAt,
    fingerprint,
    looksLikeSeedData,
  };
}
