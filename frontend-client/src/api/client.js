import axios from 'axios';

const TOKEN_KEY = 'silktrack_token';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('silktrack_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem('silktrack_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('silktrack_user');
}

export async function logClick(action, page) {
  try {
    await api.post('/logs', { action, type: 'click', page });
  } catch {
    /* ignore */
  }
}

export default api;
