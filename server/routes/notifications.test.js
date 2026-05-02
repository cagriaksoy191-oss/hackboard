import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import notificationsRouter from './notifications.js';
import { initDB } from '../db.js';
import seed from '../seed.js';

test('GET /notifications returns formatted activities', async () => {
    await initDB();
    await seed(); // Populate database

    const app = express();
    app.use(express.json());
    app.use('/notifications', notificationsRouter);

    const server = app.listen(0);
    const port = server.address().port;

    try {
        const res = await fetch(`http://localhost:${port}/notifications`, { headers: { 'X-User-Id': '1' } });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(Array.isArray(data));
        assert.ok(data.length > 0);

        // Test the specific formatting requirements
        const firstNotification = data[0];
        assert.ok('id' in firstNotification);
        assert.ok('type' in firstNotification);
        assert.ok('title' in firstNotification);
        assert.ok('message' in firstNotification);
        assert.ok('user_name' in firstNotification);
        assert.strictEqual(firstNotification.read, false);
        assert.ok('created_at' in firstNotification);
    } finally {
        server.close();
    }
});

test('GET /notifications handles limit parameter', async () => {
    await initDB();
    await seed(); // Populate database

    const app = express();
    app.use(express.json());
    app.use('/notifications', notificationsRouter);

    const server = app.listen(0);
    const port = server.address().port;

    try {
        const res = await fetch(`http://localhost:${port}/notifications?limit=2`, { headers: { 'X-User-Id': '1' } });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(Array.isArray(data));
        assert.ok(data.length <= 2);
    } finally {
        server.close();
    }
});

test('PATCH /notifications/:id/read returns success true', async () => {
    await initDB();
    const app = express();
    app.use(express.json());
    app.use('/notifications', notificationsRouter);

    const server = app.listen(0);
    const port = server.address().port;

    try {
        const res = await fetch(`http://localhost:${port}/notifications/1/read`, {
            method: 'PATCH',
            headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' }
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
    } finally {
        server.close();
    }
});

test('POST /notifications returns 404 (endpoint not implemented)', async () => {
    await initDB();
    const app = express();
    app.use(express.json());
    app.use('/notifications', notificationsRouter);

    const server = app.listen(0);
    const port = server.address().port;

    try {
        const res = await fetch(`http://localhost:${port}/notifications`, {
            method: 'POST',
            headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'test' })
        });

        // The route does not exist in notifications.js currently,
        // asserting 404 is the expected behavior based on current code.
        assert.strictEqual(res.status, 404);
    } finally {
        server.close();
    }
});
