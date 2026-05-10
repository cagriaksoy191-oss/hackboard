import { test, before } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import backupRouter from './backup.js';
import { initDB, prepare } from '../db-adapter.js';
import seed from '../seed.js';

let port;
let server;

before(async () => {
    await initDB();
    seed();

    const app = express();
    app.use(express.json());

    // Mock authentication middleware to mimic server.js behavior
    app.use((req, res, next) => {
        const userId = req.headers['x-user-id'];
        if (userId) {
            req.user_id = userId;
        }
        next();
    });

    // Mock the req.app.get('io') used in /import
    app.set('io', { emit: () => {} });
    app.use('/backup', backupRouter);

    server = app.listen(0);
    port = server.address().port;
});

test('GET /backup/export should return 401 when unauthorized', async () => {
    const res = await fetch(`http://localhost:${port}/backup/export`);
    assert.strictEqual(res.status, 401);
});

test('GET /backup/export should return 403 when user is not Admin', async () => {
    // Seed adds a Project Manager with ID 4, which is not 'Admin'
    const res = await fetch(`http://localhost:${port}/backup/export`, { headers: { 'X-User-Id': '4' } });
    assert.strictEqual(res.status, 403);
});

test('GET /backup/export should return valid backup payload when user is Admin', async () => {
    // Add an Admin user
    const result = await prepare("INSERT INTO users (name, role, avatar_color, is_online) VALUES ('Security Guy', 'Admin', '#000000', 1)").run();
    const adminId = result.lastInsertRowid.toString();

    // Now make the request as Admin
    const res = await fetch(`http://localhost:${port}/backup/export`, { headers: { 'X-User-Id': adminId } });
    assert.strictEqual(res.status, 200);
    const payload = await res.json();

    assert.strictEqual(payload.version, '1.0.0');
    assert.ok(payload.data, 'Payload should contain a data section');
    assert.ok(Array.isArray(payload.data.users), 'Should contain users array');
    assert.ok(Array.isArray(payload.data.tasks), 'Should contain tasks array');
});

test('GET /backup/health should return health summary', async () => {
    const res = await fetch(`http://localhost:${port}/backup/health`, { headers: { 'X-User-Id': '1' } });
    assert.strictEqual(res.status, 200);
    const summary = await res.json();

    assert.strictEqual(summary.version, '1.0.0');
    assert.ok(summary.tableCounts, 'Should contain tableCounts');
    assert.ok(typeof summary.totalRecords === 'number', 'Should have totalRecords');
    assert.ok(typeof summary.looksLikeSeedData === 'boolean', 'Should have looksLikeSeedData boolean');
});

test('POST /backup/import should return 401 when unauthorized', async () => {
    const invalidPayload = { version: '1.0.0', data: {} };
    const res = await fetch(`http://localhost:${port}/backup/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload)
    });
    assert.strictEqual(res.status, 401);
});

test('POST /backup/import should return 403 when user is not Admin', async () => {
    const invalidPayload = { version: '1.0.0', data: {} };
    const res = await fetch(`http://localhost:${port}/backup/import`, {
        method: 'POST',
        headers: { 'X-User-Id': '4', 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload)
    });
    assert.strictEqual(res.status, 403);
});

test('POST /backup/import with valid payload should restore database when user is Admin', async () => {
    const adminId = await prepare("SELECT id FROM users WHERE role = 'Admin' LIMIT 1").get().then(r => r.id.toString());
    // First export to get a valid payload
    const exportRes = await fetch(`http://localhost:${port}/backup/export`, { headers: { 'X-User-Id': adminId } });
    const validPayload = await exportRes.json();

    const res = await fetch(`http://localhost:${port}/backup/import`, {
        method: 'POST',
        headers: { 'X-User-Id': adminId, 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload)
    });

    assert.strictEqual(res.status, 200);
    const responseData = await res.json();
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.message, 'Backup restored successfully');
    assert.ok(responseData.tableCounts);
});

test('POST /backup/import without data section should return 400', async () => {
    const adminId = await prepare("SELECT id FROM users WHERE role = 'Admin' LIMIT 1").get().then(r => r.id.toString());
    const invalidPayload = { version: '1.0.0' }; // missing data

    const res = await fetch(`http://localhost:${port}/backup/import`, {
        method: 'POST',
        headers: { 'X-User-Id': adminId, 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload)
    });

    assert.strictEqual(res.status, 400);
    const responseData = await res.json();
    assert.strictEqual(responseData.error, 'Invalid backup payload: missing data section');
});

test('POST /backup/import with invalid table data should return 400', async () => {
    const adminId = await prepare("SELECT id FROM users WHERE role = 'Admin' LIMIT 1").get().then(r => r.id.toString());
    const exportRes = await fetch(`http://localhost:${port}/backup/export`, { headers: { 'X-User-Id': adminId } });
    const payload = await exportRes.json();

    // Corrupt the payload by removing users array
    delete payload.data.users;

    const res = await fetch(`http://localhost:${port}/backup/import`, {
        method: 'POST',
        headers: { 'X-User-Id': adminId, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 400);
    const responseData = await res.json();
    assert.strictEqual(responseData.error, 'Missing or invalid table: users');
});

test('Cleanup test server', () => {
    server.close();
});
