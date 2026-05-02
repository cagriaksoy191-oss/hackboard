import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import analyticsRouter from './analytics.js';
import { initDB } from '../db.js';
import seed from '../seed.js';

test('GET / returns analytics data with expected structure', async () => {
    await initDB();
    seed(); // Populate database with initial data

    const app = express();
    app.use('/analytics', analyticsRouter);

    const server = app.listen(0);
    const port = server.address().port;

    try {
        const res = await fetch(`http://localhost:${port}/analytics`, { headers: { 'X-User-Id': '1' } });
        assert.strictEqual(res.status, 200, 'Expected status 200');

        const data = await res.json();

        // Assert the presence of expected properties
        assert.ok(Array.isArray(data.taskStatusDist), 'Expected taskStatusDist to be an array');
        assert.ok(Array.isArray(data.tasksByUser), 'Expected tasksByUser to be an array');
        assert.ok(Array.isArray(data.hourlyProductivity), 'Expected hourlyProductivity to be an array');
        assert.strictEqual(typeof data.progress, 'number', 'Expected progress to be a number');
        assert.strictEqual(typeof data.totalTasks, 'number', 'Expected totalTasks to be a number');
        assert.strictEqual(typeof data.doneTasks, 'number', 'Expected doneTasks to be a number');

    } finally {
        server.close();
    }
});
