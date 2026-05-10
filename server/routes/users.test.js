import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import usersRouter from './users.js';
import { initDB } from '../db.js';
import seed from '../seed.js';

describe('Users API', () => {
  let app;
  let server;
  let port;

  before(async () => {
    await initDB();
    seed();

    app = express();
    app.use(express.json());

    // We must mock the requireAuth behavior that we added in server.js to test users.js properly
    app.use((req, res, next) => {
      const userId = req.headers['x-user-id'];
      if (userId) {
        req.user_id = userId;
      }
      next();
    });

    app.use('/users', usersRouter);

    // Provide a dummy io object if any route uses it (users router doesn't currently, but good practice)
    app.set('io', { emit: () => {} });

    server = await new Promise((resolve) => {
      const srv = app.listen(0, () => resolve(srv));
    });
    port = server.address().port;
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  it('GET /users returns all users ordered by id', async () => {
    const res = await fetch(`http://localhost:${port}/users`, { headers: { 'X-User-Id': '1' } });
    assert.strictEqual(res.status, 200, 'Expected status code 200');

    const data = await res.json();
    assert.ok(Array.isArray(data), 'Expected data to be an array');
    assert.ok(data.length >= 4, 'Expected at least 4 users from seed data');

    // Check if the first user has expected properties
    const firstUser = data[0];
    assert.ok(firstUser.hasOwnProperty('id'));
    assert.ok(firstUser.hasOwnProperty('name'));
    assert.ok(firstUser.hasOwnProperty('is_online'));

    // Check if ordered by id
    const isOrdered = data.every((val, i, arr) => !i || (val.id >= arr[i - 1].id));
    assert.ok(isOrdered, 'Expected users to be ordered by id');
  });

  it('PATCH /users/:id/status updates the user online status to 1 when true', async () => {
    const res = await fetch(`http://localhost:${port}/users/1/status`, {
      method: 'PATCH',
      headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_online: true })
    });

    assert.strictEqual(res.status, 200, 'Expected status code 200');

    const data = await res.json();
    assert.strictEqual(data.id, 1, 'Expected user id to be 1');
    assert.strictEqual(data.is_online, 1, 'Expected is_online to be 1');
  });

  it('PATCH /users/:id/status updates the user online status to 0 when false', async () => {
    const res = await fetch(`http://localhost:${port}/users/1/status`, {
      method: 'PATCH',
      headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_online: false })
    });

    assert.strictEqual(res.status, 200, 'Expected status code 200');

    const data = await res.json();
    assert.strictEqual(data.id, 1, 'Expected user id to be 1');
    assert.strictEqual(data.is_online, 0, 'Expected is_online to be 0');
  });

  it('POST /users returns 400 when name is missing', async () => {
    const res = await fetch(`http://localhost:${port}/users`, {
      method: 'POST',
      headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Developer' })
    });

    assert.strictEqual(res.status, 400, 'Expected status code 400');
    const data = await res.json();
    assert.strictEqual(data.error, 'Name is required', 'Expected correct error message');
  });

  it('POST /users returns 400 when role is missing for authenticated users', async () => {
    const res = await fetch(`http://localhost:${port}/users`, {
      method: 'POST',
      headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John Doe' })
    });

    assert.strictEqual(res.status, 400, 'Expected status code 400');
    const data = await res.json();
    assert.strictEqual(data.error, 'Role is required', 'Expected correct error message');
  });

  it('POST /users strips role and sets to Guest for unauthenticated users', async () => {
    const res = await fetch(`http://localhost:${port}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker', role: 'Admin' })
    });

    assert.strictEqual(res.status, 201, 'Expected status code 201');
    const data = await res.json();
    assert.strictEqual(data.name, 'Hacker', 'Expected name to be set');
    assert.strictEqual(data.role, 'Guest', 'Expected role to be stripped to Guest');
  });

  it('POST /users creates user with provided role for authenticated users', async () => {
    const res = await fetch(`http://localhost:${port}/users`, {
      method: 'POST',
      headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Auth User', role: 'Admin' })
    });

    assert.strictEqual(res.status, 201, 'Expected status code 201');
    const data = await res.json();
    assert.strictEqual(data.name, 'Auth User', 'Expected name to be set');
    assert.strictEqual(data.role, 'Admin', 'Expected role to be used');
  });
});
