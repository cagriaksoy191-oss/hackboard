import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import request from 'supertest';
import activitiesRouter from './activities.js';
import { initDB } from '../db.js';
import seed from '../seed.js';

describe('Activities Route API', () => {
  let app;

  before(async () => {
    // Initialize in-memory database and seed it
    await initDB();
    seed();

    // Setup Express app with the router
    app = express();
    app.use('/activities', activitiesRouter);
  });

  test('GET /activities - should return a 200 OK status', async () => {
    await request(app)
      .get('/activities')
      .expect('Content-Type', /json/)
      .expect(200);
  });

  test('GET /activities - should return an array of activities', async () => {
    const response = await request(app).get('/activities');
    assert.strictEqual(Array.isArray(response.body), true, 'Response body should be an array');
  });

  test('GET /activities - should return joined user data (name and avatar_color)', async () => {
    const response = await request(app).get('/activities');

    // Seed data should populate activities
    assert.ok(response.body.length > 0, 'Should return at least one activity');

    const activity = response.body[0];
    assert.ok(activity.hasOwnProperty('id'), 'Activity should have an id');
    assert.ok(activity.hasOwnProperty('action'), 'Activity should have an action');
    assert.ok(activity.hasOwnProperty('user_id'), 'Activity should have a user_id');

    // Check for JOINed fields
    assert.ok(activity.hasOwnProperty('name'), 'Activity should contain the joined user name');
    assert.strictEqual(typeof activity.name, 'string', 'Joined user name should be a string');
    assert.ok(activity.hasOwnProperty('avatar_color'), 'Activity should contain the joined avatar_color');
  });

  test('GET /activities - should return activities ordered by created_at DESC', async () => {
    const response = await request(app).get('/activities');
    const activities = response.body;

    if (activities.length > 1) {
      for (let i = 0; i < activities.length - 1; i++) {
        const date1 = new Date(activities[i].created_at).getTime();
        const date2 = new Date(activities[i+1].created_at).getTime();
        assert.ok(date1 >= date2, 'Activities should be ordered by created_at DESC');
      }
    }
  });

  test('GET /activities - should limit the results to 50', async () => {
    const response = await request(app).get('/activities');
    assert.ok(response.body.length <= 50, 'Response should contain no more than 50 activities');
  });
});
