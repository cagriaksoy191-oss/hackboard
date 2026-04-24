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

test('PATCH /subtasks/:id/toggle toggles the is_completed status', async () => {
    await initDB();
    const { prepare } = await import('../db.js');

    // Setup task and subtask using prepare
    const taskResult = prepare('INSERT INTO tasks (title) VALUES (?)').run('Test Task');
    const taskId = taskResult.lastInsertRowid;

    const subtaskResult = prepare('INSERT INTO subtasks (task_id, title) VALUES (?, ?)').run(taskId, 'Test Subtask');
    const subtaskId = subtaskResult.lastInsertRowid;

    const app = express();
    app.use(express.json());
    // Since we don't have io attached, we need a dummy io object on app to prevent errors
    app.set('io', { emit: () => {} });
    app.use('/tasks', tasksRouter);

    const server = app.listen(0);
    const port = server.address().port;

    // Toggle to 1
    let res = await fetch(`http://localhost:${port}/tasks/subtasks/${subtaskId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 200);
    let data = await res.json();
    assert.strictEqual(data.is_completed, 1);

    // Toggle back to 0
    res = await fetch(`http://localhost:${port}/tasks/subtasks/${subtaskId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 200);
    data = await res.json();
    assert.strictEqual(data.is_completed, 0);

    server.close();
});
