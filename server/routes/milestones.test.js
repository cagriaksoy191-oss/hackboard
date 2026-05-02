import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import milestonesRouter from './milestones.js';
import { initDB } from '../db.js';
import seed from '../seed.js';

describe('Milestones API Integration Tests', () => {
  let app;
  let server;
  let port;

  before(async () => {
    // Note: Database initialization and seeding are required for integration tests
    await initDB();
    seed();

    app = express();
    app.use(express.json());
    app.use('/milestones', milestonesRouter);

    // Attach dummy io object as required by the project's backend conventions
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

  describe('GET /milestones', () => {
    it('should return all milestones from seed data ordered by target_time ASC', async () => {
      const res = await fetch(`http://localhost:${port}/milestones`, { headers: { 'X-User-Id': '1' } });
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(Array.isArray(data), 'Response should be an array');
      assert.ok(data.length >= 5, 'Should return at least 5 seed milestones');

      // Verify ASC ordering by target_time
      for (let i = 1; i < data.length; i++) {
        const prevTime = new Date(data[i - 1].target_time).getTime();
        const currTime = new Date(data[i].target_time).getTime();
        assert.ok(currTime >= prevTime, `Milestone at index ${i} is not correctly ordered`);
      }
    });
  });

  describe('POST /milestones', () => {
    it('should return 400 if title is missing or invalid', async () => {
      const invalidMilestone = {
        description: 'No title',
        target_time: new Date().toISOString()
      };

      const res = await fetch(`http://localhost:${port}/milestones`, {
        method: 'POST',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidMilestone)
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Title is required'));
    });

    it('should return 400 if target_time is missing or invalid', async () => {
      const invalidMilestone = {
        title: 'No Target Time',
        description: 'Missing target time'
      };

      const res = await fetch(`http://localhost:${port}/milestones`, {
        method: 'POST',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidMilestone)
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('target_time is required'));
    });
    it('should create a new milestone with all fields and return 201', async () => {
      const newMilestone = {
        title: 'Integration Test Milestone',
        description: 'Testing the POST endpoint',
        target_time: new Date(Date.now() + 86400000).toISOString() // Tomorrow
      };

      const res = await fetch(`http://localhost:${port}/milestones`, {
        method: 'POST',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify(newMilestone)
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.ok(data.id, 'Should have an id');
      assert.strictEqual(data.title, newMilestone.title);
      assert.strictEqual(data.description, newMilestone.description);
      assert.strictEqual(data.is_completed, 0, 'Default is_completed should be 0');
    });

    it('should default description to an empty string if missing', async () => {
      const minimalMilestone = {
        title: 'Minimal Milestone',
        target_time: new Date().toISOString()
      };

      const res = await fetch(`http://localhost:${port}/milestones`, {
        method: 'POST',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify(minimalMilestone)
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.description, '', 'Description should default to empty string');
    });
  });

  describe('PUT /milestones/:id', () => {
    it('should return 400 if title is updated with invalid format', async () => {
      const invalidUpdate = { title: '' };

      const res = await fetch(`http://localhost:${port}/milestones/1`, {
        method: 'PUT',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidUpdate)
      });

      assert.strictEqual(res.status, 400);
    });

    it('should return 400 if target_time is updated with invalid format', async () => {
      const invalidUpdate = { target_time: 'not-a-date' };

      const res = await fetch(`http://localhost:${port}/milestones/1`, {
        method: 'PUT',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidUpdate)
      });

      assert.strictEqual(res.status, 400);
    });
    it('should update all fields of an existing milestone', async () => {
      // Milestone ID 1 is 'Planlama Tamamlandi' in seed
      const updateData = {
        title: 'Fully Updated Title',
        description: 'New Description',
        target_time: new Date().toISOString(),
        is_completed: 1
      };

      const res = await fetch(`http://localhost:${port}/milestones/1`, {
        method: 'PUT',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.id, 1);
      assert.strictEqual(data.title, updateData.title);
      assert.strictEqual(data.description, updateData.description);
      assert.strictEqual(data.is_completed, 1);
    });

    it('should partially update a milestone while preserving other fields (COALESCE)', async () => {
      // Create a fresh milestone to test partial update
      const createRes = await fetch(`http://localhost:${port}/milestones`, {
        method: 'POST',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Partial Update Test',
          description: 'Original Description',
          target_time: '2025-01-01T00:00:00.000Z'
        })
      });
      const created = await createRes.json();
      const milestoneId = created.id;

      // Update only the is_completed status
      const partialUpdate = { is_completed: 1 };
      const updateRes = await fetch(`http://localhost:${port}/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: { 'X-User-Id': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify(partialUpdate)
      });

      assert.strictEqual(updateRes.status, 200);
      const updated = await updateRes.json();

      assert.strictEqual(updated.id, milestoneId);
      assert.strictEqual(updated.is_completed, 1);
      // Other fields should remain unchanged from the 'created' state
      assert.strictEqual(updated.title, 'Partial Update Test');
      assert.strictEqual(updated.description, 'Original Description');
      assert.strictEqual(updated.target_time, '2025-01-01T00:00:00.000Z');
    });
  });
});
