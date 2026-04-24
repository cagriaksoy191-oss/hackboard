import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import tasksRouter from '../tasks.js';
import { initDB } from '../../db.js';

test('POST /tasks missing title returns 400', async () => {
    await initDB();
    const app = express();
    app.use(express.json());
    app.use('/tasks', tasksRouter);

    const server = app.listen(0);
    const port = server.address().port;

    const res = await fetch(`http://localhost:${port}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'test task' })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Title is required');

    server.close();
});

test('POST /tasks empty title returns 400', async () => {
    await initDB();
    const app = express();
    app.use(express.json());
    app.use('/tasks', tasksRouter);

    const server = app.listen(0);
    const port = server.address().port;

    const res = await fetch(`http://localhost:${port}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '   ', description: 'test task' })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Title is required');

    server.close();
});
