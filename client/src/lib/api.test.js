import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import api, {
  tasksAPI,
  usersAPI,
  messagesAPI,
  activitiesAPI,
  analyticsAPI,
  milestonesAPI,
  backupAPI,
} from './api.js';

describe('API Client', () => {
  beforeEach(() => {
    // We spy on the underlying methods of the api (axios) instance
    mock.method(api, 'get', async () => ({ data: 'mock-get' }));
    mock.method(api, 'post', async () => ({ data: 'mock-post' }));
    mock.method(api, 'put', async () => ({ data: 'mock-put' }));
    mock.method(api, 'patch', async () => ({ data: 'mock-patch' }));
    mock.method(api, 'delete', async () => ({ data: 'mock-delete' }));
  });

  afterEach(() => {
    mock.restoreAll();
  });

  test('api instance should have /api as baseURL', () => {
    assert.equal(api.defaults.baseURL, '/api');
  });

  describe('tasksAPI', () => {
    test('getAll should call GET /v1/tasks', async () => {
      await tasksAPI.getAll();
      assert.equal(api.get.mock.calls.length, 1);
      assert.deepEqual(api.get.mock.calls[0].arguments, ['/v1/tasks', { params: undefined }]);
    });

    test('create should call POST /v1/tasks with data', async () => {
      const data = { title: 'Test Task' };
      await tasksAPI.create(data);
      assert.equal(api.post.mock.calls.length, 1);
      assert.deepEqual(api.post.mock.calls[0].arguments, ['/v1/tasks', data]);
    });

    test('update should call PUT /v1/tasks/:id with data', async () => {
      const id = 1;
      const data = { title: 'Updated Task' };
      await tasksAPI.update(id, data);
      assert.equal(api.put.mock.calls.length, 1);
      assert.deepEqual(api.put.mock.calls[0].arguments, [`/v1/tasks/${id}`, data]);
    });

    test('delete should call DELETE /v1/tasks/:id', async () => {
      const id = 1;
      await tasksAPI.delete(id);
      assert.equal(api.delete.mock.calls.length, 1);
      assert.deepEqual(api.delete.mock.calls[0].arguments, [`/v1/tasks/${id}`]);
    });

    test('updateStatus should call PATCH /v1/tasks/:id/status with status', async () => {
      const id = 1;
      const status = 'completed';
      await tasksAPI.updateStatus(id, status);
      assert.equal(api.patch.mock.calls.length, 1);
      assert.deepEqual(api.patch.mock.calls[0].arguments, [`/v1/tasks/${id}/status`, { status, version: undefined }]);
    });

    test('getSubtasks should call GET /v1/tasks/:taskId/subtasks', async () => {
      const taskId = 1;
      await tasksAPI.getSubtasks(taskId);
      assert.equal(api.get.mock.calls.length, 1);
      assert.deepEqual(api.get.mock.calls[0].arguments, [`/v1/tasks/${taskId}/subtasks`]);
    });

    test('createSubtask should call POST /v1/tasks/:taskId/subtasks with data', async () => {
      const taskId = 1;
      const data = { title: 'Test Subtask' };
      await tasksAPI.createSubtask(taskId, data);
      assert.equal(api.post.mock.calls.length, 1);
      assert.deepEqual(api.post.mock.calls[0].arguments, [`/v1/tasks/${taskId}/subtasks`, data]);
    });

    test('toggleSubtask should call PATCH /v1/tasks/subtasks/:subtaskId/toggle', async () => {
      const subtaskId = 2;
      await tasksAPI.toggleSubtask(subtaskId);
      assert.equal(api.patch.mock.calls.length, 1);
      assert.deepEqual(api.patch.mock.calls[0].arguments, [`/v1/tasks/subtasks/${subtaskId}/toggle`]);
    });

    test('getComments should call GET /v1/tasks/:taskId/comments', async () => {
      const taskId = 1;
      await tasksAPI.getComments(taskId);
      assert.equal(api.get.mock.calls.length, 1);
      assert.deepEqual(api.get.mock.calls[0].arguments, [`/v1/tasks/${taskId}/comments`]);
    });

    test('createComment should call POST /v1/tasks/:taskId/comments with data', async () => {
      const taskId = 1;
      const data = { content: 'Test comment' };
      await tasksAPI.createComment(taskId, data);
      assert.equal(api.post.mock.calls.length, 1);
      assert.deepEqual(api.post.mock.calls[0].arguments, [`/v1/tasks/${taskId}/comments`, data]);
    });

    test('getAll should propagate errors correctly', async () => {
      const error = new Error('Network Error');
      mock.method(api, 'get', async () => { throw error; });

      await assert.rejects(
        async () => await tasksAPI.getAll(),
        (err) => {
          assert.strictEqual(err, error);
          return true;
        }
      );
    });
  });

  describe('usersAPI', () => {
    test('getAll should call GET /v1/users', async () => {
      await usersAPI.getAll();
      assert.equal(api.get.mock.calls.length, 1);
      assert.deepEqual(api.get.mock.calls[0].arguments, ['/v1/users']);
    });

    test('updateStatus should call PATCH /v1/users/:id/status with is_online', async () => {
      const id = 1;
      const isOnline = true;
      await usersAPI.updateStatus(id, isOnline);
      assert.equal(api.patch.mock.calls.length, 1);
      assert.deepEqual(api.patch.mock.calls[0].arguments, [`/v1/users/${id}/status`, { is_online: isOnline }]);
    });
  });

  describe('messagesAPI', () => {
    test('getAll should call GET /v1/messages', async () => {
      await messagesAPI.getAll();
      assert.equal(api.get.mock.calls.length, 1);
      assert.deepEqual(api.get.mock.calls[0].arguments, ['/v1/messages', { params: undefined }]);
    });

    test('create should call POST /v1/messages with data', async () => {
      const data = { content: 'Test Message' };
      await messagesAPI.create(data);
      assert.equal(api.post.mock.calls.length, 1);
      assert.deepEqual(api.post.mock.calls[0].arguments, ['/v1/messages', data]);
    });
  });

  describe('activitiesAPI', () => {
    test('getAll should call GET /v1/activities', async () => {
      await activitiesAPI.getAll();
      assert.equal(api.get.mock.calls.length, 1);
      assert.deepEqual(api.get.mock.calls[0].arguments, ['/v1/activities']);
    });
  });

  describe('analyticsAPI', () => {
    test('get should call GET /v1/analytics', async () => {
      await analyticsAPI.get();
      assert.equal(api.get.mock.calls.length, 1);
      assert.deepEqual(api.get.mock.calls[0].arguments, ['/v1/analytics']);
    });
  });

  describe('milestonesAPI', () => {
    test('getAll should call GET /v1/milestones', async () => {
      await milestonesAPI.getAll();
      assert.equal(api.get.mock.calls.length, 1);
      assert.deepEqual(api.get.mock.calls[0].arguments, ['/v1/milestones']);
    });

    test('create should call POST /v1/milestones with data', async () => {
      const data = { title: 'Test Milestone' };
      await milestonesAPI.create(data);
      assert.equal(api.post.mock.calls.length, 1);
      assert.deepEqual(api.post.mock.calls[0].arguments, ['/v1/milestones', data]);
    });

    test('update should call PUT /v1/milestones/:id with data', async () => {
      const id = 1;
      const data = { title: 'Updated Milestone' };
      await milestonesAPI.update(id, data);
      assert.equal(api.put.mock.calls.length, 1);
      assert.deepEqual(api.put.mock.calls[0].arguments, [`/v1/milestones/${id}`, data]);
    });
  });

  describe('backupAPI', () => {
    test('exportData should call GET /backup/export', async () => {
      await backupAPI.exportData();
      assert.equal(api.get.mock.calls.length, 1);
      assert.deepEqual(api.get.mock.calls[0].arguments, ['/backup/export']);
    });

    test('getHealth should call GET /backup/health', async () => {
      await backupAPI.getHealth();
      assert.equal(api.get.mock.calls.length, 1);
      assert.deepEqual(api.get.mock.calls[0].arguments, ['/backup/health']);
    });

    test('importData should call POST /backup/import with data', async () => {
      const data = { backup_data: '...' };
      await backupAPI.importData(data);
      assert.equal(api.post.mock.calls.length, 1);
      assert.deepEqual(api.post.mock.calls[0].arguments, ['/backup/import', data]);
    });
  });
});
