import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const tasksAPI = {
  getAll: () => api.get('/tasks'),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  getSubtasks: (taskId) => api.get(`/tasks/${taskId}/subtasks`),
  createSubtask: (taskId, data) => api.post(`/tasks/${taskId}/subtasks`, data),
  toggleSubtask: (subtaskId) => api.patch(`/subtasks/${subtaskId}/toggle`),
  getComments: (taskId) => api.get(`/tasks/${taskId}/comments`),
  createComment: (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateStatus: (id, isOnline) => api.patch(`/users/${id}/status`, { is_online: isOnline }),
};

export const messagesAPI = {
  getAll: () => api.get('/messages'),
  create: (data) => api.post('/messages', data),
};

export const activitiesAPI = {
  getAll: () => api.get('/activities'),
};

export const analyticsAPI = {
  get: () => api.get('/analytics'),
};

export const milestonesAPI = {
  getAll: () => api.get('/milestones'),
  create: (data) => api.post('/milestones', data),
  update: (id, data) => api.put(`/milestones/${id}`, data),
};

export const backupAPI = {
  exportData: () => api.get('/backup/export'),
  getHealth: () => api.get('/backup/health'),
  importData: (data) => api.post('/backup/import', data),
};

export default api;
