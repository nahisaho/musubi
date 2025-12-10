/**
 * MUSUBI Cache Manager
 *
 * Caching layer for performance optimization.
 * Phase 6 P0: Performance Optimization
 *
 * Features:
 * - In-memory LRU cache
 * - TTL-based expiration
 * - Cache statistics
 * - Namespace isolation
 * - Cache-aside pattern support
 */

/**
 * Cache entry structure
 */
class CacheEntry {
  constructor(value, ttl = null) {
    this.value = value;
    this.createdAt = Date.now();
    this.accessedAt = Date.now();
    this.accessCount = 0;
    this.ttl = ttl;
  }

  isExpired() {
    if (this.ttl === null) return false;
    return Date.now() - this.createdAt > this.ttl;
  }

  touch() {
    this.accessedAt = Date.now();
    this.accessCount++;
  }
}

/**
 * LRU Cache implementation
 */
class LRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (entry.isExpired()) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    entry.touch();

    return entry.value;
  }

  set(key, value, ttl = null) {
    // Remove if exists to update position
    this.cache.delete(key);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, new CacheEntry(value, ttl));
  }

  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.isExpired()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalAccess = 0;
    let expiredCount = 0;
    const now = Date.now();
    let oldestEntry = now;

    for (const [, entry] of this.cache) {
      totalAccess += entry.accessCount;
      if (entry.isExpired()) expiredCount++;
      if (entry.createdAt < oldestEntry) oldestEntry = entry.createdAt;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalAccess,
      expiredCount,
      oldestEntryAge: now - oldestEntry,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    let cleaned = 0;
    for (const [key, entry] of this.cache) {
      if (entry.isExpired()) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }
}

/**
 * Cache Manager with namespaces
 */
class CacheManager {
  constructor(options = {}) {
    this.options = {
      defaultTTL: options.defaultTTL || 5 * 60 * 1000, // 5 minutes
      maxSize: options.maxSize || 1000,
      cleanupInterval: options.cleanupInterval || 60 * 1000, // 1 minute
      enableStats: options.enableStats !== false,
      ...options,
    };

    this.namespaces = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };

    // Start cleanup timer if interval is set
    if (this.options.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupAll();
      }, this.options.cleanupInterval);

      // Don't prevent process exit
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  /**
   * Get or create a namespace
   * @private
   */
  _getNamespace(namespace) {
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new LRUCache(this.options.maxSize));
    }
    return this.namespaces.get(namespace);
  }

  /**
   * Generate cache key
   * @private
   */
  _makeKey(namespace, key) {
    return `${namespace}:${typeof key === 'object' ? JSON.stringify(key) : key}`;
  }

  /**
   * Get a value from cache
   * @param {string} namespace - Cache namespace
   * @param {string|Object} key - Cache key
   * @returns {*} - Cached value or undefined
   */
  get(namespace, key) {
    const cache = this._getNamespace(namespace);
    const value = cache.get(this._makeKey(namespace, key));

    if (this.options.enableStats) {
      if (value !== undefined) {
        this.stats.hits++;
      } else {
        this.stats.misses++;
      }
    }

    return value;
  }

  /**
   * Set a value in cache
   * @param {string} namespace - Cache namespace
   * @param {string|Object} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl] - Time to live in ms
   */
  set(namespace, key, value, ttl = null) {
    const cache = this._getNamespace(namespace);
    cache.set(this._makeKey(namespace, key), value, ttl || this.options.defaultTTL);

    if (this.options.enableStats) {
      this.stats.sets++;
    }
  }

  /**
   * Check if a key exists in cache
   * @param {string} namespace - Cache namespace
   * @param {string|Object} key - Cache key
   * @returns {boolean}
   */
  has(namespace, key) {
    const cache = this._getNamespace(namespace);
    return cache.has(this._makeKey(namespace, key));
  }

  /**
   * Delete a key from cache
   * @param {string} namespace - Cache namespace
   * @param {string|Object} key - Cache key
   * @returns {boolean}
   */
  delete(namespace, key) {
    const cache = this._getNamespace(namespace);
    const result = cache.delete(this._makeKey(namespace, key));

    if (this.options.enableStats && result) {
      this.stats.deletes++;
    }

    return result;
  }

  /**
   * Clear a namespace or all namespaces
   * @param {string} [namespace] - Optional namespace to clear
   */
  clear(namespace) {
    if (namespace) {
      const cache = this.namespaces.get(namespace);
      if (cache) {
        cache.clear();
      }
    } else {
      for (const cache of this.namespaces.values()) {
        cache.clear();
      }
    }
  }

  /**
   * Get or set pattern (cache-aside)
   * @param {string} namespace - Cache namespace
   * @param {string|Object} key - Cache key
   * @param {Function} fetchFn - Function to fetch value if not cached
   * @param {number} [ttl] - Time to live in ms
   * @returns {Promise<*>} - Cached or fetched value
   */
  async getOrSet(namespace, key, fetchFn, ttl = null) {
    const cached = this.get(namespace, key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetchFn();
    this.set(namespace, key, value, ttl);
    return value;
  }

  /**
   * Synchronous get or set
   * @param {string} namespace - Cache namespace
   * @param {string|Object} key - Cache key
   * @param {Function} fetchFn - Function to fetch value if not cached
   * @param {number} [ttl] - Time to live in ms
   * @returns {*} - Cached or fetched value
   */
  getOrSetSync(namespace, key, fetchFn, ttl = null) {
    const cached = this.get(namespace, key);
    if (cached !== undefined) {
      return cached;
    }

    const value = fetchFn();
    this.set(namespace, key, value, ttl);
    return value;
  }

  /**
   * Memoize a function
   * @param {string} namespace - Cache namespace
   * @param {Function} fn - Function to memoize
   * @param {Function} [keyFn] - Function to generate cache key from args
   * @param {number} [ttl] - Time to live in ms
   * @returns {Function} - Memoized function
   */
  memoize(namespace, fn, keyFn = null, ttl = null) {
    const cache = this;
    const generateKey = keyFn || ((...args) => JSON.stringify(args));

    return function (...args) {
      const key = generateKey(...args);
      return cache.getOrSetSync(namespace, key, () => fn.apply(this, args), ttl);
    };
  }

  /**
   * Memoize an async function
   * @param {string} namespace - Cache namespace
   * @param {Function} fn - Async function to memoize
   * @param {Function} [keyFn] - Function to generate cache key from args
   * @param {number} [ttl] - Time to live in ms
   * @returns {Function} - Memoized async function
   */
  memoizeAsync(namespace, fn, keyFn = null, ttl = null) {
    const cache = this;
    const generateKey = keyFn || ((...args) => JSON.stringify(args));

    return async function (...args) {
      const key = generateKey(...args);
      return cache.getOrSet(namespace, key, () => fn.apply(this, args), ttl);
    };
  }

  /**
   * Clean up expired entries in all namespaces
   */
  cleanupAll() {
    let totalCleaned = 0;
    for (const cache of this.namespaces.values()) {
      totalCleaned += cache.cleanup();
    }
    return totalCleaned;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const namespaceStats = {};
    let totalSize = 0;

    for (const [name, cache] of this.namespaces) {
      const stats = cache.getStats();
      namespaceStats[name] = stats;
      totalSize += stats.size;
    }

    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
        : 0;

    return {
      global: {
        ...this.stats,
        hitRate: hitRate.toFixed(2) + '%',
        totalSize,
        namespaceCount: this.namespaces.size,
      },
      namespaces: namespaceStats,
    };
  }

  /**
   * Destroy the cache manager
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

/**
 * Request coalescing for duplicate requests
 */
class RequestCoalescer {
  constructor() {
    this.pending = new Map();
  }

  /**
   * Coalesce duplicate requests
   * @param {string} key - Request key
   * @param {Function} fetchFn - Async function to fetch data
   * @returns {Promise<*>} - Result
   */
  async coalesce(key, fetchFn) {
    // If there's already a pending request, wait for it
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    // Create new promise for this request
    const promise = fetchFn()
      .then(result => {
        this.pending.delete(key);
        return result;
      })
      .catch(error => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Get number of pending requests
   */
  get pendingCount() {
    return this.pending.size;
  }

  /**
   * Clear all pending requests (use with caution)
   */
  clear() {
    this.pending.clear();
  }
}

// Singleton instance
const defaultCacheManager = new CacheManager();

// Cache namespaces for MUSUBI
const CacheNamespace = {
  ANALYSIS: 'analysis', // Analysis results
  STEERING: 'steering', // Steering file contents
  LLM: 'llm', // LLM responses
  CODEGRAPH: 'codegraph', // CodeGraph queries
  TEMPLATES: 'templates', // Template contents
  VALIDATION: 'validation', // Validation results
};

module.exports = {
  CacheEntry,
  LRUCache,
  CacheManager,
  RequestCoalescer,
  CacheNamespace,
  defaultCacheManager,
};
