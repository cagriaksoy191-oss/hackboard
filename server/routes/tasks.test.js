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

test('POST /api/v1/tasks - validates workspace_id, sprint_id, workflow_stage_id belong to user organization', async () => {
    await initDB();
    const { runMigrations } = await import('../migrate.js');
    await runMigrations();
    const { prepare } = await import('../db.js');

    // Create a different organization and workspace
    const orgResult = prepare("INSERT INTO organizations (name, slug) VALUES ('Other Org', 'other')").run();
    const otherOrgId = orgResult.lastInsertRowid;
    const wsResult = prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'Other Workspace', 'other-ws')").run(otherOrgId);
    const otherWsId = wsResult.lastInsertRowid;

    // Create user's organization and workspace
    const myOrgResult = prepare("INSERT INTO organizations (name, slug) VALUES ('My Org', 'myorg')").run();
    const myOrgId = myOrgResult.lastInsertRowid;
    const myWsResult = prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'My Workspace', 'my-ws')").run(myOrgId);
    const myWsId = myWsResult.lastInsertRowid;

    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.tenant = { orgId: myOrgId, workspaceId: myWsId };
        req.user = { id: 1 };
        next();
    });
    const v1TasksRouter = (await import('./v1/tasks.js')).default;
    app.use('/v1/tasks', v1TasksRouter);

    const server = app.listen(0);
    const port = server.address().port;

    try {
        // Try creating a task in other workspace (should return 403)
        const res = await fetch(`http://localhost:${port}/v1/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Test Task', workspace_id: otherWsId })
        });
        assert.strictEqual(res.status, 403);

        // Try creating with a valid workspace
        const res2 = await fetch(`http://localhost:${port}/v1/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Test Task 2', workspace_id: myWsId })
        });
        assert.strictEqual(res2.status, 201);
    } finally {
        server.close();
    }
});

test('PUT /api/v1/tasks/:id - validates workspace_id, sprint_id, workflow_stage_id belong to user organization', async () => {
    await initDB();
    const { runMigrations } = await import('../migrate.js');
    await runMigrations();
    const { prepare } = await import('../db.js');

    // Create a different organization and workspace
    const orgResult = prepare("INSERT INTO organizations (name, slug) VALUES ('Other Org 2', 'other2')").run();
    const otherOrgId = orgResult.lastInsertRowid;
    const wsResult = prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'Other Workspace 2', 'other-ws2')").run(otherOrgId);
    const otherWsId = wsResult.lastInsertRowid;

    // Create user's organization and workspace
    const myOrgResult = prepare("INSERT INTO organizations (name, slug) VALUES ('My Org 2', 'myorg2')").run();
    const myOrgId = myOrgResult.lastInsertRowid;
    const myWsResult = prepare("INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'My Workspace 2', 'my-ws2')").run(myOrgId);
    const myWsId = myWsResult.lastInsertRowid;

    // Create a task belonging to my organization
    const taskResult = prepare("INSERT INTO tasks (org_id, workspace_id, title) VALUES (?, ?, 'My Task')").run(myOrgId, myWsId);
    const taskId = taskResult.lastInsertRowid;

    const realApp = express();
    realApp.use(express.json());
    realApp.use((req, res, next) => {
        req.tenant = { orgId: myOrgId, workspaceId: myWsId };
        req.user = { id: 1 };
        next();
    });
    const v1TasksRouter = (await import('./v1/tasks.js')).default;
    realApp.use('/v1/tasks', v1TasksRouter);

    const server = realApp.listen(0);
    const port = server.address().port;

    try {
        // Try updating the task with workspace_id of other org (should return 403)
        const res = await fetch(`http://localhost:${port}/v1/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Updated Title', workspace_id: otherWsId, version: 1 })
        });
        assert.strictEqual(res.status, 403);
    } finally {
        server.close();
    }
});

test('PATCH /api/v1/tasks/:id/status - updates workflow_stage_id using status-to-stage sync fallback logic', async () => {
    await initDB();
    const { runMigrations } = await import('../migrate.js');
    await runMigrations();
    const { prepare } = await import('../db.js');

    // Create an organization, workspace
    const suffix = Math.random().toString(36).substring(7);
    const orgResult = prepare(`INSERT INTO organizations (name, slug) VALUES ('Test Org', 'testorg-${suffix}')`).run();
    const orgId = orgResult.lastInsertRowid;
    const wsResult = prepare(`INSERT INTO workspaces (org_id, name, slug) VALUES (?, 'Test Workspace', 'testws-${suffix}')`).run(orgId);
    const wsId = wsResult.lastInsertRowid;

    // Create a workflow stage with is_done_state = 1
    const stageResult = prepare(`INSERT INTO workflow_stages (workspace_id, name, slug, position, color, is_done_state) VALUES (?, 'Done Stage', 'done-stage-slug-${suffix}', 1, '#10b981', 1)`).run(wsId);
    const doneStageId = stageResult.lastInsertRowid;

    // Create a workflow stage with slug containing 'todo'
    const stageResult2 = prepare(`INSERT INTO workflow_stages (workspace_id, name, slug, position, color, is_done_state) VALUES (?, 'Yapilacaklar Stage', 'yapilacaklar-slug-${suffix}', 2, '#ef4444', 0)`).run(wsId);
    const todoStageId = stageResult2.lastInsertRowid;

    // Create a task
    const taskResult = prepare("INSERT INTO tasks (org_id, workspace_id, title, status, version) VALUES (?, ?, 'Test Task', 'in-progress', 1)").run(orgId, wsId);
    const taskId = taskResult.lastInsertRowid;

    const realApp = express();
    realApp.use(express.json());
    realApp.use((req, res, next) => {
        req.tenant = { orgId, workspaceId: wsId };
        req.user = { id: 1 };
        next();
    });
    const v1TasksRouter = (await import('./v1/tasks.js')).default;
    realApp.use('/v1/tasks', v1TasksRouter);

    const server = realApp.listen(0);
    const port = server.address().port;

    try {
        // PATCH status to 'done' (should match by is_done_state = 1)
        const res = await fetch(`http://localhost:${port}/v1/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'done', version: 1 })
        });
        assert.strictEqual(res.status, 200);
        const task1 = await res.json();
        assert.strictEqual(task1.workflow_stage_id, doneStageId);

        // PATCH status to 'todo' (should match by slug LIKE '%yapilacaklar%')
        const res2 = await fetch(`http://localhost:${port}/v1/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'todo', version: 2 })
        });
        assert.strictEqual(res2.status, 200);
        const task2 = await res2.json();
        assert.strictEqual(task2.workflow_stage_id, todoStageId);
    } finally {
        server.close();
    }
});
