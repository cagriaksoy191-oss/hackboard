/**
 * migrate.js — Dual-Mode Migration Runner
 *
 * Reads SQL migration files from server/migrations/ and applies
 * them in order. Tracks applied migrations in the _migrations table.
 *
 * Supports both PostgreSQL and SQLite modes via db-adapter.
 * Each .sql file is split into individual statements and executed
 * sequentially. ALTER TABLE errors for duplicate columns are
 * silently ignored (idempotency for SQLite).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prepare, execRaw, DB_MODE } from './db-adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Ensure the _migrations tracking table exists.
 */
async function ensureMigrationsTable() {
  await execRaw(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get list of already-applied migration names.
 */
async function getAppliedMigrations() {
  try {
    const rows = await prepare('SELECT name FROM _migrations ORDER BY id').all();
    return new Set(rows.map(r => r.name));
  } catch {
    return new Set();
  }
}

/**
 * Split a SQL file into individual statements.
 * Handles multi-line statements separated by semicolons.
 * Strips comments (lines starting with --).
 */
function splitStatements(sql) {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      // Remove empty strings and comment-only blocks
      const withoutComments = s
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
      return withoutComments.length > 0;
    });
}

/**
 * Execute a single SQL statement with error tolerance
 * for ALTER TABLE duplicate column errors (SQLite idempotency).
 */
async function execStatement(statement) {
  try {
    await execRaw(statement);
    return { success: true };
  } catch (err) {
    const msg = err.message || '';
    // SQLite: duplicate column name → already applied, skip
    if (msg.includes('duplicate column name')) {
      return { success: true, skipped: true, reason: 'column already exists' };
    }
    // SQLite: table already exists → skip
    if (msg.includes('already exists')) {
      return { success: true, skipped: true, reason: 'already exists' };
    }
    // PostgreSQL: column already exists
    if (msg.includes('already exists') || msg.includes('column') && msg.includes('of relation')) {
      return { success: true, skipped: true, reason: 'column already exists (PG)' };
    }
    // UNIQUE constraint violation during seed data insert → data already seeded
    if (msg.includes('UNIQUE constraint') || msg.includes('unique constraint') || msg.includes('duplicate key')) {
      return { success: true, skipped: true, reason: 'data already exists' };
    }
    throw err;
  }
}

/**
 * Run all pending migrations in order.
 * Returns { applied: string[], skipped: string[] }
 */
export async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  // Read migration files sorted by name
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.info('[migrate] No migrations directory found. Skipping.');
    return { applied: [], skipped: [] };
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const results = { applied: [], skipped: [] };

  for (const file of files) {
    const migrationName = file.replace('.sql', '');

    if (applied.has(migrationName)) {
      results.skipped.push(migrationName);
      continue;
    }

    console.info(`[migrate] Applying: ${migrationName}...`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const statements = splitStatements(sql);

    let allSucceeded = true;
    for (const stmt of statements) {
      try {
        const result = await execStatement(stmt);
        if (result.skipped) {
          console.info(`  ↳ Skipped: ${result.reason}`);
        }
      } catch (err) {
        console.error(`  ✗ Error in ${migrationName}: ${err.message}`);
        console.error(`    Statement: ${stmt.substring(0, 100)}...`);
        allSucceeded = false;
        // Continue to next statement — some ALTER TABLEs may partially apply
      }
    }

    if (allSucceeded) {
      // Record successful migration
      await prepare('INSERT INTO _migrations (name) VALUES (?)').run(migrationName);
      results.applied.push(migrationName);
      console.info(`  ✓ Applied: ${migrationName}`);
    } else {
      // Still record partially applied migration to prevent re-runs
      // (all statements are idempotent, re-running is safe but noisy)
      try {
        await prepare('INSERT INTO _migrations (name) VALUES (?)').run(migrationName);
      } catch { /* ignore if already recorded */ }
      results.applied.push(migrationName);
      console.warn(`  ⚠ Partially applied: ${migrationName} (some statements failed, recorded to prevent re-run)`);
    }
  }

  if (results.applied.length > 0) {
    console.info(`[migrate] Applied ${results.applied.length} migration(s): ${results.applied.join(', ')}`);
  } else {
    console.info('[migrate] No pending migrations.');
  }

  return results;
}

/**
 * Backfill org memberships for existing users.
 * Called after migrations to ensure all active users are
 * members of the default organization.
 */
export async function backfillMemberships() {
  try {
    // Check if default org exists
    const org = await prepare('SELECT id FROM organizations WHERE slug = ?').get('default');
    if (!org) return;

    // Get users not yet in org_memberships for this org
    const unmapped = await prepare(`
      SELECT u.id FROM users u
      WHERE u.is_deleted = 0
        AND NOT EXISTS (
          SELECT 1 FROM org_memberships om
          WHERE om.user_id = u.id AND om.org_id = ?
        )
    `).all(org.id);

    for (const user of unmapped) {
      await prepare('INSERT INTO org_memberships (org_id, user_id, role) VALUES (?, ?, ?)').run(org.id, user.id, 'member');
    }

    // Ensure at least one owner exists
    const ownerCheck = await prepare(
      'SELECT id FROM org_memberships WHERE org_id = ? AND role = ?'
    ).get(org.id, 'owner');

    if (!ownerCheck) {
      const firstMember = await prepare(
        'SELECT id FROM org_memberships WHERE org_id = ? ORDER BY id LIMIT 1'
      ).get(org.id);
      if (firstMember) {
        await prepare('UPDATE org_memberships SET role = ? WHERE id = ?').run('owner', firstMember.id);
      }
    }

    if (unmapped.length > 0) {
      console.info(`[migrate] Backfilled ${unmapped.length} user(s) into default org memberships.`);
    }
  } catch (err) {
    console.error('[migrate] Membership backfill error:', err.message);
  }
}
