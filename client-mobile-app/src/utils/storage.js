import { Platform } from 'react-native';

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

const memoryFallback = new MemoryStorage();

export const storage = {
  getItem: (key) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryFallback.getItem(key);
    } catch {
      return memoryFallback.getItem(key);
    }
  },
  setItem: (key, value) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      memoryFallback.setItem(key, value);
    } catch {
      memoryFallback.setItem(key, value);
    }
  },
  removeItem: (key) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      memoryFallback.removeItem(key);
    } catch {
      memoryFallback.removeItem(key);
    }
  },
  clear: () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      memoryFallback.clear();
    } catch {
      memoryFallback.clear();
    }
  }
};

export default storage;
