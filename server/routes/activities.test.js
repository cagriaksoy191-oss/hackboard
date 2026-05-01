import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import activitiesRouter from './activities.js';
import { initDB } from '../db.js';
import seed from '../seed.js';

describe('Activities API', () => {
  let app;
  let server;
  let port;

  before(async () => {
    await initDB();
    seed();

    app = express();
    app.use(express.json());
    app.use('/activities', activitiesRouter);

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

  it('GET /activities returns recent activities', async () => {
    const res = await fetch(`http://localhost:${port}/activities`);
    assert.strictEqual(res.status, 200, 'Expected status code 200');

    const data = await res.json();
    assert.ok(Array.isArray(data), 'Expected data to be an array');
    assert.ok(data.length > 0, 'Expected some activities from seed data');
    assert.ok(data.length <= 50, 'Expected at most 50 activities');

    // Check if the first activity has expected properties including joined user properties
    const firstActivity = data[0];
    assert.ok(firstActivity.hasOwnProperty('id'));
    assert.ok(firstActivity.hasOwnProperty('user_id'));
    assert.ok(firstActivity.hasOwnProperty('action'));
    assert.ok(firstActivity.hasOwnProperty('details'));
    assert.ok(firstActivity.hasOwnProperty('created_at'));
    assert.ok(firstActivity.hasOwnProperty('name'), 'Expected joined user.name');
    assert.ok(firstActivity.hasOwnProperty('avatar_color'), 'Expected joined user.avatar_color');
  });
});
