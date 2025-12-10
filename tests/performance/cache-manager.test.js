/**
 * Tests for CacheManager
 * Phase 6 P0: Performance Optimization
 */

const {
  CacheEntry,
  LRUCache,
  CacheManager,
  RequestCoalescer,
  CacheNamespace,
} = require('../../src/performance/cache-manager');

describe('CacheEntry', () => {
  describe('constructor', () => {
    it('should create entry with value', () => {
      const entry = new CacheEntry('test-value');
      expect(entry.value).toBe('test-value');
      expect(entry.accessCount).toBe(0);
      expect(entry.ttl).toBeNull();
    });

    it('should create entry with TTL', () => {
      const entry = new CacheEntry('test-value', 1000);
      expect(entry.ttl).toBe(1000);
    });
  });

  describe('isExpired', () => {
    it('should return false when no TTL', () => {
      const entry = new CacheEntry('test-value');
      expect(entry.isExpired()).toBe(false);
    });

    it('should return false when within TTL', () => {
      const entry = new CacheEntry('test-value', 10000);
      expect(entry.isExpired()).toBe(false);
    });

    it('should return true when expired', async () => {
      const entry = new CacheEntry('test-value', 10);
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(entry.isExpired()).toBe(true);
    });
  });

  describe('touch', () => {
    it('should update accessedAt and accessCount', () => {
      const entry = new CacheEntry('test-value');
      const initialAccessed = entry.accessedAt;

      entry.touch();

      expect(entry.accessCount).toBe(1);
      expect(entry.accessedAt).toBeGreaterThanOrEqual(initialAccessed);
    });
  });
});

describe('LRUCache', () => {
  let cache;

  beforeEach(() => {
    cache = new LRUCache(3);
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should support TTL', async () => {
      cache.set('key1', 'value1', 10);
      expect(cache.get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 20));
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when at capacity', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update LRU order on access', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1 to make it most recently used
      cache.get('key1');

      cache.set('key4', 'value4'); // Should evict key2

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for missing keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired keys', async () => {
      cache.set('key1', 'value1', 10);
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove keys', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return true when key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
    });

    it('should return false when key does not exist', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(3);
      expect(stats.totalAccess).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      cache.set('key1', 'value1', 10);
      cache.set('key2', 'value2'); // No TTL

      await new Promise(resolve => setTimeout(resolve, 20));
      const cleaned = cache.cleanup();

      expect(cleaned).toBe(1);
      expect(cache.size).toBe(1);
      expect(cache.get('key2')).toBe('value2');
    });
  });
});

describe('CacheManager', () => {
  let manager;

  beforeEach(() => {
    manager = new CacheManager({
      defaultTTL: 60000,
      maxSize: 100,
      cleanupInterval: 0, // Disable auto cleanup for tests
      enableStats: true,
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      manager.set('test', 'key1', 'value1');
      expect(manager.get('test', 'key1')).toBe('value1');
    });

    it('should support object keys', () => {
      const key = { id: 1, type: 'test' };
      manager.set('test', key, 'value1');
      expect(manager.get('test', key)).toBe('value1');
    });

    it('should track hits and misses', () => {
      manager.set('test', 'key1', 'value1');
      manager.get('test', 'key1'); // hit
      manager.get('test', 'key2'); // miss

      const stats = manager.getStats();
      expect(stats.global.hits).toBe(1);
      expect(stats.global.misses).toBe(1);
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      manager.set('test', 'key1', 'value1');
      expect(manager.has('test', 'key1')).toBe(true);
    });

    it('should return false for missing keys', () => {
      expect(manager.has('test', 'key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove keys', () => {
      manager.set('test', 'key1', 'value1');
      manager.delete('test', 'key1');
      expect(manager.get('test', 'key1')).toBeUndefined();
    });

    it('should track delete stats', () => {
      manager.set('test', 'key1', 'value1');
      manager.delete('test', 'key1');

      const stats = manager.getStats();
      expect(stats.global.deletes).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear specific namespace', () => {
      manager.set('ns1', 'key1', 'value1');
      manager.set('ns2', 'key1', 'value1');

      manager.clear('ns1');

      expect(manager.get('ns1', 'key1')).toBeUndefined();
      expect(manager.get('ns2', 'key1')).toBe('value1');
    });

    it('should clear all namespaces', () => {
      manager.set('ns1', 'key1', 'value1');
      manager.set('ns2', 'key1', 'value1');

      manager.clear();

      expect(manager.get('ns1', 'key1')).toBeUndefined();
      expect(manager.get('ns2', 'key1')).toBeUndefined();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      manager.set('test', 'key1', 'cached');

      const fetchFn = jest.fn().mockResolvedValue('fetched');
      const result = await manager.getOrSet('test', 'key1', fetchFn);

      expect(result).toBe('cached');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache if not exists', async () => {
      const fetchFn = jest.fn().mockResolvedValue('fetched');
      const result = await manager.getOrSet('test', 'key1', fetchFn);

      expect(result).toBe('fetched');
      expect(fetchFn).toHaveBeenCalled();
      expect(manager.get('test', 'key1')).toBe('fetched');
    });
  });

  describe('getOrSetSync', () => {
    it('should return cached value if exists', () => {
      manager.set('test', 'key1', 'cached');

      const fetchFn = jest.fn().mockReturnValue('fetched');
      const result = manager.getOrSetSync('test', 'key1', fetchFn);

      expect(result).toBe('cached');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache if not exists', () => {
      const fetchFn = jest.fn().mockReturnValue('fetched');
      const result = manager.getOrSetSync('test', 'key1', fetchFn);

      expect(result).toBe('fetched');
      expect(fetchFn).toHaveBeenCalled();
    });
  });

  describe('memoize', () => {
    it('should memoize function results', () => {
      const fn = jest.fn(x => x * 2);
      const memoized = manager.memoize('test', fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use custom key function', () => {
      const fn = jest.fn(obj => obj.value * 2);
      const keyFn = obj => obj.id;
      const memoized = manager.memoize('test', fn, keyFn);

      expect(memoized({ id: 1, value: 5 })).toBe(10);
      expect(memoized({ id: 1, value: 100 })).toBe(10); // Uses cached
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('memoizeAsync', () => {
    it('should memoize async function results', async () => {
      const fn = jest.fn(async x => x * 2);
      const memoized = manager.memoizeAsync('test', fn);

      expect(await memoized(5)).toBe(10);
      expect(await memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStats', () => {
    it('should return comprehensive statistics', () => {
      manager.set('ns1', 'key1', 'value1');
      manager.set('ns2', 'key1', 'value1');
      manager.get('ns1', 'key1');

      const stats = manager.getStats();

      expect(stats.global.hits).toBe(1);
      expect(stats.global.sets).toBe(2);
      expect(stats.global.totalSize).toBe(2);
      expect(stats.global.namespaceCount).toBe(2);
      expect(stats.namespaces.ns1).toBeDefined();
      expect(stats.namespaces.ns2).toBeDefined();
    });
  });
});

describe('RequestCoalescer', () => {
  let coalescer;

  beforeEach(() => {
    coalescer = new RequestCoalescer();
  });

  describe('coalesce', () => {
    it('should execute fetch function', async () => {
      const fetchFn = jest.fn().mockResolvedValue('result');
      const result = await coalescer.coalesce('key1', fetchFn);

      expect(result).toBe('result');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should coalesce duplicate requests', async () => {
      let resolvePromise;
      const fetchFn = jest.fn().mockImplementation(
        () =>
          new Promise(resolve => {
            resolvePromise = resolve;
          })
      );

      const promise1 = coalescer.coalesce('key1', fetchFn);
      const promise2 = coalescer.coalesce('key1', fetchFn);

      expect(coalescer.pendingCount).toBe(1);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      resolvePromise('result');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('result');
      expect(result2).toBe('result');
    });

    it('should handle errors', async () => {
      const fetchFn = jest.fn().mockRejectedValue(new Error('fetch error'));

      await expect(coalescer.coalesce('key1', fetchFn)).rejects.toThrow('fetch error');
      expect(coalescer.pendingCount).toBe(0);
    });

    it('should not coalesce different keys', async () => {
      const fetchFn = jest.fn().mockResolvedValue('result');

      await Promise.all([coalescer.coalesce('key1', fetchFn), coalescer.coalesce('key2', fetchFn)]);

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('clear', () => {
    it('should clear pending requests', () => {
      coalescer.coalesce(
        'key1',
        () =>
          new Promise(() => {
            /* never resolves */
          })
      );
      coalescer.clear();
      expect(coalescer.pendingCount).toBe(0);
    });
  });
});

describe('CacheNamespace', () => {
  it('should define all namespaces', () => {
    expect(CacheNamespace.ANALYSIS).toBe('analysis');
    expect(CacheNamespace.STEERING).toBe('steering');
    expect(CacheNamespace.LLM).toBe('llm');
    expect(CacheNamespace.CODEGRAPH).toBe('codegraph');
    expect(CacheNamespace.TEMPLATES).toBe('templates');
    expect(CacheNamespace.VALIDATION).toBe('validation');
  });
});
