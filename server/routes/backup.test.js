import { test, before } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import backupRouter from './backup.js';
import { initDB } from '../db.js';
import seed from '../seed.js';

let port;
let server;

before(async () => {
    await initDB();
    seed();

    const app = express();
    app.use(express.json());
    // Mock the req.app.get('io') used in /import
    app.set('io', { emit: () => {} });
    app.use('/backup', backupRouter);

    server = app.listen(0);
    port = server.address().port;
});

test('GET /backup/export should return valid backup payload', async () => {
    const res = await fetch(`http://localhost:${port}/backup/export`, { headers: { 'X-User-Id': '1' } });
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

test('POST /backup/import with valid payload should restore database', async () => {
    // First export to get a valid payload
    const exportRes = await fetch(`http://localhost:${port}/backup/export`, { headers: { 'X-User-Id': '1' } });
    const validPayload = await exportRes.json();

    const res = await fetch(`http://localhost:${port}/backup/import`, {
        method: 'POST',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload)
    });

    assert.strictEqual(res.status, 200);
    const responseData = await res.json();
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.message, 'Backup restored successfully');
    assert.ok(responseData.tableCounts);
});

test('POST /backup/import without data section should return 400', async () => {
    const invalidPayload = { version: '1.0.0' }; // missing data

    const res = await fetch(`http://localhost:${port}/backup/import`, {
        method: 'POST',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload)
    });

    assert.strictEqual(res.status, 400);
    const responseData = await res.json();
    assert.strictEqual(responseData.error, 'Invalid backup payload: missing data section');
});

test('POST /backup/import with invalid table data should return 400', async () => {
    const exportRes = await fetch(`http://localhost:${port}/backup/export`, { headers: { 'X-User-Id': '1' } });
    const payload = await exportRes.json();

    // Corrupt the payload by removing users array
    delete payload.data.users;

    const res = await fetch(`http://localhost:${port}/backup/import`, {
        method: 'POST',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 400);
    const responseData = await res.json();
    assert.strictEqual(responseData.error, 'Missing or invalid table: users');
});

test('Cleanup test server', () => {
    server.close();
});
