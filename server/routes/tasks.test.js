import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import tasksRouter from './tasks.js';
import { initDB } from '../db.js';

test('PATCH /tasks/:id/status missing status returns 400', async () => {
    await initDB();
    const app = express();
    app.use(express.json());
    app.use('/tasks', tasksRouter);

    const server = app.listen(0);
    const port = server.address().port;

    const res = await fetch(`http://localhost:${port}/tasks/1/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Status is required');

    server.close();
});
