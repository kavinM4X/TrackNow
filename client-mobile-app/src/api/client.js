import axios from 'axios';
import { Platform } from 'react-native';
import storage from '../utils/storage';

const TOKEN_KEY = 'tracknow_token';
const USER_KEY = 'tracknow_user';

// Determine appropriate API base URL
let defaultBaseURL = 'https://tracknow-backend-api.onrender.com/api';
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  defaultBaseURL = window.location.origin.includes('localhost') ? '/api' : 'https://tracknow-backend-api.onrender.com/api';
}

const api = axios.create({
  baseURL: defaultBaseURL,
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      clearSession();
    }
    return Promise.reject(err);
  }
);

const inFlightRequests = new Map();
const responseCache = new Map();

/**
 * Deduplicated & Cached GET request wrapper.
 * Prevents redundant fetches and duplicate component mounts.
 */
export function deduplicatedGet(url, options = {}, cacheTtlMs = 0) {
  const cacheKey = typeof url === 'string' ? url : JSON.stringify(url);

  if (cacheTtlMs > 0) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return Promise.resolve(cached.data);
    }
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = api
    .get(url, options)
    .then((res) => {
      if (cacheTtlMs > 0) {
        responseCache.set(cacheKey, {
          data: res,
          expiresAt: Date.now() + cacheTtlMs
        });
      }
      return res;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

export function invalidateClientCache(urlPrefix = '') {
  if (!urlPrefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(urlPrefix)) {
      responseCache.delete(key);
    }
  }
}

export function getToken() {
  return storage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = storage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  invalidateClientCache();
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
}

export function logClick(action, page) {
  api.post('/logs', { action, type: 'click', page }).catch(() => {});
}

export default api;
