import axios from 'axios';

const TOKEN_KEY = 'tracknow_token';
const USER_KEY = 'tracknow_user';
const LEGACY_TOKEN_KEY = 'silktrack_token';
const LEGACY_USER_KEY = 'silktrack_user';

function migrateLegacyStorage() {
  if (!localStorage.getItem(TOKEN_KEY) && localStorage.getItem(LEGACY_TOKEN_KEY)) {
    localStorage.setItem(TOKEN_KEY, localStorage.getItem(LEGACY_TOKEN_KEY));
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
  if (!localStorage.getItem(USER_KEY) && localStorage.getItem(LEGACY_USER_KEY)) {
    localStorage.setItem(USER_KEY, localStorage.getItem(LEGACY_USER_KEY));
    localStorage.removeItem(LEGACY_USER_KEY);
  }
}

migrateLegacyStorage();

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      clearSession();
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.replace('/admin/login');
      }
    }
    return Promise.reject(err);
  }
);

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

export async function logClick(action, page) {
  if (import.meta.env.VITE_DISABLE_CLICK_LOGS === 'true') return;
  const key = `tracknow_log_${page}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    await api.post('/logs', { action, type: 'click', page });
  } catch {
    sessionStorage.removeItem(key);
  }
}

export default api;
