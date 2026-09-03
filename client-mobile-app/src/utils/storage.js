import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

const memoryCache = new MemoryStorage();

// Known keys used for session and auth
const MANAGED_KEYS = ['tracknow_token', 'tracknow_user'];

// Initialize memory cache from hardware-encrypted SecureStore on native app launch
async function initSecureStoreCache() {
  if (Platform.OS === 'web') return;

  for (const k of MANAGED_KEYS) {
    try {
      const val = await SecureStore.getItemAsync(k);
      if (val !== null && val !== undefined) {
        memoryCache.setItem(k, val);
      }
    } catch (e) {
      // Fallback to memory
    }
  }
}

// Trigger initial cache population
initSecureStoreCache();

export const storage = {
  getItem: (key) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryCache.getItem(key);
    } catch {
      return memoryCache.getItem(key);
    }
  },

  getItemAsync: async (key) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      const val = await SecureStore.getItemAsync(key);
      if (val !== null && val !== undefined) {
        memoryCache.setItem(key, val);
      }
      return val;
    } catch {
      return memoryCache.getItem(key);
    }
  },

  setItem: (key, value) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(value));
      } else {
        SecureStore.setItemAsync(key, String(value)).catch(() => {});
      }
      memoryCache.setItem(key, value);
    } catch {
      memoryCache.setItem(key, value);
    }
  },

  setItemAsync: async (key, value) => {
    try {
      memoryCache.setItem(key, value);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(value));
      } else {
        await SecureStore.setItemAsync(key, String(value));
      }
    } catch {
      memoryCache.setItem(key, value);
    }
  },

  removeItem: (key) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      } else {
        SecureStore.deleteItemAsync(key).catch(() => {});
      }
      memoryCache.removeItem(key);
    } catch {
      memoryCache.removeItem(key);
    }
  },

  removeItemAsync: async (key) => {
    try {
      memoryCache.removeItem(key);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      memoryCache.removeItem(key);
    }
  },

  clear: () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      } else {
        for (const k of MANAGED_KEYS) {
          SecureStore.deleteItemAsync(k).catch(() => {});
        }
      }
      memoryCache.clear();
    } catch {
      memoryCache.clear();
    }
  }
};

export default storage;
