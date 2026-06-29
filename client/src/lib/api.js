import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Setup clean instance for refreshing to avoid interceptor loop
const refreshApi = axios.create({
  baseURL: '/api',
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hackboard-token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Inject tenant (X-Org-ID) and workspace (X-Workspace-ID) if available
  const userStr = localStorage.getItem('hackboard-user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.orgId) {
        config.headers['X-Org-ID'] = String(user.orgId);
      }
      
      const activeWorkspaceId = localStorage.getItem('hackboard-active-workspace-id');
      if (activeWorkspaceId) {
        config.headers['X-Workspace-ID'] = String(activeWorkspaceId);
      } else {
        // Default to workspace 1 if not explicitly set
        config.headers['X-Workspace-ID'] = '1';
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent loop on auth routes
    if (
      originalRequest.url.includes('/v1/auth/refresh') ||
      originalRequest.url.includes('/v1/auth/login') ||
      originalRequest.url.includes('/v1/auth/legacy-login')
    ) {
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('hackboard-refresh-token');
      if (refreshToken) {
        try {
          const res = await refreshApi.post('/v1/auth/refresh', { refreshToken });
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = res.data;

          localStorage.setItem('hackboard-token', newAccessToken);
          localStorage.setItem('hackboard-refresh-token', newRefreshToken);

          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

          // Force socket reconnect with new token
          import('./socket').then(({ default: socket }) => {
            socket.auth = { token: newAccessToken };
            socket.disconnect();
            socket.connect();
          });

          processQueue(null, newAccessToken);
          isRefreshing = false;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;

          // Clear auth and dispatch logout event
          localStorage.removeItem('hackboard-token');
          localStorage.removeItem('hackboard-refresh-token');
          localStorage.removeItem('hackboard-user');
          window.dispatchEvent(new Event('auth:unauthorized'));

          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem('hackboard-token');
        localStorage.removeItem('hackboard-refresh-token');
        localStorage.removeItem('hackboard-user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export const tasksAPI = {
  getAll: (params) => api.get('/v1/tasks', { params }),
  create: (data) => api.post('/v1/tasks', data),
  update: (id, data) => api.put(`/v1/tasks/${id}`, data),
  delete: (id) => api.delete(`/v1/tasks/${id}`),
  updateStatus: (id, status, version) => api.patch(`/v1/tasks/${id}/status`, { status, version }),
  getSubtasks: (taskId) => api.get(`/v1/tasks/${taskId}/subtasks`),
  createSubtask: (taskId, data) => api.post(`/v1/tasks/${taskId}/subtasks`, data),
  toggleSubtask: (subtaskId) => api.patch(`/v1/tasks/subtasks/${subtaskId}/toggle`),
  getComments: (taskId) => api.get(`/v1/tasks/${taskId}/comments`),
  createComment: (taskId, data) => api.post(`/v1/tasks/${taskId}/comments`, data),
};

export const usersAPI = {
  login: (userId) => api.post('/v1/auth/legacy-login', { userId }),
  getAll: () => api.get('/v1/users'),
  create: (data) => api.post('/v1/users', data),
  update: (id, data) => api.put(`/v1/users/${id}`, data),
  delete: (id) => api.delete(`/v1/users/${id}`),
  updateStatus: (id, isOnline) => api.patch(`/v1/users/${id}/status`, { is_online: isOnline }),
};

export const publicUsersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
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

export const searchAPI = {
  query: (params) => api.get('/v1/search', { params }),
  reindex: () => api.post('/v1/search/reindex'),
};

export const activitiesAPI = {
  getAll: () => api.get('/v1/activities'),
};

export const analyticsAPI = {
  get: () => api.get('/v1/analytics'),
};

export const milestonesAPI = {
  getAll: () => api.get('/v1/milestones'),
  create: (data) => api.post('/v1/milestones', data),
  update: (id, data) => api.put(`/v1/milestones/${id}`, data),
};

export const sprintsAPI = {
  getAll: (params) => api.get('/v1/sprints', { params }),
  create: (data) => api.post('/v1/sprints', data),
  update: (id, data) => api.put(`/v1/sprints/${id}`, data),
  updateStatus: (id, status, transferSprintId) => api.patch(`/v1/sprints/${id}/status`, { status, transferSprintId }),
  getTasks: (id) => api.get(`/v1/sprints/${id}/tasks`),
  addTask: (id, data) => api.post(`/v1/sprints/${id}/tasks`, data),
};

export const workflowsAPI = {
  getAll: (params) => api.get('/v1/workflows', { params }),
  create: (data) => api.post('/v1/workflows', data),
  update: (id, data) => api.put(`/v1/workflows/${id}`, data),
  reorder: (data) => api.patch('/v1/workflows/reorder', data),
  delete: (id, transferStageId) => {
    const url = transferStageId ? `/v1/workflows/${id}?transfer_stage_id=${transferStageId}` : `/v1/workflows/${id}`;
    return api.delete(url);
  },
};

export const backupAPI = {
  exportData: () => api.get('/backup/export'),
  getHealth: () => api.get('/backup/health'),
  importData: (data) => api.post('/backup/import', data),
};

export default api;
