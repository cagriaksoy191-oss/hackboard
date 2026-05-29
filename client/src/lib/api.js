import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hackboard-token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});



api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('hackboard-token');
      localStorage.removeItem('hackboard-user');
      // Dispatch custom event to trigger app-wide logout state or redirect
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

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
  login: (userId) => api.post('/users/login', { userId }),
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateStatus: (id, isOnline) => api.patch(`/users/${id}/status`, { is_online: isOnline }),
};

export const messagesAPI = {
  getAll: (params) => api.get('/v1/messages', { params }),
  create: (data) => api.post('/v1/messages', data),
  getThread: (messageId) => api.get(`/v1/messages/${messageId}/thread`),
};

export const channelsAPI = {
  getAll: (params) => api.get('/v1/channels', { params }),
  create: (data) => api.post('/v1/channels', data),
  delete: (id) => api.delete(`/v1/channels/${id}`),
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

export const sprintsAPI = {
  getAll: (params) => api.get('/v1/sprints', { params }),
  create: (data) => api.post('/v1/sprints', data),
  update: (id, data) => api.put(`/v1/sprints/${id}`, data),
  updateStatus: (id, status) => api.patch(`/v1/sprints/${id}/status`, { status }),
  getTasks: (id) => api.get(`/v1/sprints/${id}/tasks`),
  addTask: (id, data) => api.post(`/v1/sprints/${id}/tasks`, data),
};

export const workflowsAPI = {
  getAll: (params) => api.get('/v1/workflows', { params }),
  create: (data) => api.post('/v1/workflows', data),
  update: (id, data) => api.put(`/v1/workflows/${id}`, data),
  reorder: (data) => api.patch('/v1/workflows/reorder', data),
  delete: (id) => api.delete(`/v1/workflows/${id}`),
};

export const backupAPI = {
  exportData: () => api.get('/backup/export'),
  getHealth: () => api.get('/backup/health'),
  importData: (data) => api.post('/backup/import', data),
};

export default api;
