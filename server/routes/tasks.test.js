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
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
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
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 200);
    let data = await res.json();
    assert.strictEqual(data.is_completed, 1);

    // Toggle back to 0
    res = await fetch(`http://localhost:${port}/tasks/subtasks/${subtaskId}/toggle`, {
        method: 'PATCH',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 200);
    data = await res.json();
    assert.strictEqual(data.is_completed, 0);

    server.close();
});

test('PATCH /tasks/:id/status invalid status returns 400', async () => {
    await initDB();
    const app = express();
    app.use(express.json());
    app.use('/tasks', tasksRouter);

    const server = app.listen(0);
    const port = server.address().port;

    try {
        const res = await fetch(`http://localhost:${port}/tasks/1/status`, {
            method: 'PATCH',
            headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'invalid-status' })
        });

        assert.strictEqual(res.status, 400);
        const data = await res.json();
        assert.strictEqual(data.error, 'Invalid status');
    } finally {
        server.close();
    }
});

test('PUT /tasks/:id updates status properly', async () => {
    await initDB();
    const { prepare } = await import('../db.js');

    // Create a task
    const taskResult = prepare('INSERT INTO tasks (title, status) VALUES (?, ?)').run('Update Status Test', 'todo');
    const taskId = taskResult.lastInsertRowid;

    const app = express();
    app.use(express.json());
    app.set('io', { emit: () => {} });
    app.use('/tasks', tasksRouter);

    const server = app.listen(0);
    const port = server.address().port;

    try {
        const res = await fetch(`http://localhost:${port}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'in-progress' })
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.status, 'in-progress');

        // Verify via DB
        const updatedTask = prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        assert.strictEqual(updatedTask.status, 'in-progress');
    } finally {
        server.close();
    }
});

test('PUT /tasks/:id returns 409 conflict when updated_at is older', async () => {
    await initDB();
    const { prepare } = await import('../db.js');

    // Create a task
    const taskResult = prepare('INSERT INTO tasks (title, status, updated_at) VALUES (?, ?, ?)').run('Conflict Test Task', 'todo', '2025-05-01 12:00:00');
    const taskId = taskResult.lastInsertRowid;

    const app = express();
    app.use(express.json());
    app.set('io', { emit: () => {} });
    app.use('/tasks', tasksRouter);

    const server = app.listen(0);
    const port = server.address().port;

    try {
        const res = await fetch(`http://localhost:${port}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Updated Title',
                updated_at: '2025-01-01 10:00:00' // Older than the DB value
            })
        });

        assert.strictEqual(res.status, 409);
        const data = await res.json();
        assert.strictEqual(data.conflict, true);
        assert.ok(data.currentTask, 'Should return currentTask');
        assert.strictEqual(data.currentTask.title, 'Conflict Test Task');
    } finally {
        server.close();
    }
});
