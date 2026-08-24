/**
 * Lightweight In-Memory TTL Cache for TrackNow API
 * Zero external dependencies (No Redis required for single-instance Node server).
 */

class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value, ttlMs = 30000) {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
  }

  delete(key) {
    this.store.delete(key);
  }

  invalidatePrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }
}

const cache = new MemoryCache();

module.exports = cache;
