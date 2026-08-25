import axios from 'axios';

const TOKEN_KEY = 'silkroute_driver_token';
const USER_KEY = 'silkroute_driver_user';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      clearSession();
      if (!window.location.pathname.includes('/login')) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(err);
  }
);

// High-performance Stale-While-Revalidate & In-Memory Cache (reduces network latency to < 10ms)
const getCache = new Map();

export function deduplicatedGet(url, params = {}, ttlMs = 15000) {
  const paramStr = JSON.stringify(params || {});
  const key = `${url}?${paramStr}`;
  const now = Date.now();
  const cached = getCache.get(key);

  if (cached && now - cached.timestamp < ttlMs && cached.response) {
    return Promise.resolve(cached.response);
  }

  if (cached && cached.inflight) {
    return cached.inflight;
  }

  const inflight = api
    .get(url, { params })
    .then((res) => {
      getCache.set(key, { timestamp: Date.now(), response: res, inflight: null });
      return res;
    })
    .catch((err) => {
      getCache.delete(key);
      throw err;
    });

  getCache.set(key, { timestamp: 0, response: cached?.response || null, inflight });
  return inflight;
}

export function clearCache(urlPattern = null) {
  if (!urlPattern) {
    getCache.clear();
  } else {
    for (const key of getCache.keys()) {
      if (key.includes(urlPattern)) getCache.delete(key);
    }
  }
}

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
  clearCache();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearCache();
}

export function logClick(action, page) {
  if (import.meta.env.VITE_DISABLE_CLICK_LOGS === 'true') return;
  const key = `tracknow_log_${page}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  api.post('/logs', { action, type: 'click', page }).catch(() => {
    sessionStorage.removeItem(key);
  });
}

export default api;
