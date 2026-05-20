import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear tokens and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('user');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData)
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, passwordData) => api.put(`/users/${id}/reset-password`, passwordData),
  getStats: () => api.get('/users/stats')
};

// Bookings API
export const bookingsAPI = {
  getAll: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (bookingData) => api.post('/bookings', bookingData),
  update: (id, bookingData) => api.put(`/bookings/${id}`, bookingData),
  delete: (id) => api.delete(`/bookings/${id}`),
  updateLocation: (id, locationData) => api.put(`/bookings/${id}/location`, locationData),
  getStats: () => api.get('/bookings/stats')
};

// Batches API
export const batchesAPI = {
  getAll: (params) => api.get('/batches', { params }),
  getById: (id) => api.get(`/batches/${id}`),
  create: (batchData) => api.post('/batches', batchData),
  update: (id, batchData) => api.put(`/batches/${id}`, batchData),
  delete: (id) => api.delete(`/batches/${id}`),
  getStats: () => api.get('/batches/stats')
};

// Market Rates API
export const marketRatesAPI = {
  getAll: (params) => api.get('/marketrates', { params }),
  getById: (id) => api.get(`/marketrates/${id}`),
  create: (rateData) => api.post('/marketrates', rateData),
  update: (id, rateData) => api.put(`/marketrates/${id}`, rateData),
  delete: (id) => api.delete(`/marketrates/${id}`),
  getLatest: (params) => api.get('/marketrates/latest', { params }),
  getTrends: (params) => api.get('/marketrates/trends', { params })
};

// Tracker API
export const trackerAPI = {
  getAll: (params) => api.get('/tracker', { params }),
  getById: (id) => api.get(`/tracker/${id}`),
  create: (trackerData) => api.post('/tracker', trackerData),
  update: (id, trackerData) => api.put(`/tracker/${id}`, trackerData),
  delete: (id) => api.delete(`/tracker/${id}`),
  updateLocation: (id, locationData) => api.put(`/tracker/${id}/location`, locationData),
  getRoute: (id) => api.get(`/tracker/${id}/route`),
  toggleTracking: (data) => api.post('/tracker/toggle', data)
};

// Logs API
export const logsAPI = {
  getAll: (params) => api.get('/logs', { params }),
  getById: (id) => api.get(`/logs/${id}`),
  getStats: () => api.get('/logs/stats'),
  clearOldLogs: (data) => api.post('/logs/clear', data)
};

export default api;
