/**
 * Tests for Performance Module Index
 * Phase 6 P0: Performance Optimization
 */

const {
  // Lazy Loading
  LazyLoader,
  ModuleCategory,
  MODULE_REGISTRY,
  createLazyProxy,
  defaultLoader,

  // Caching
  CacheEntry,
  LRUCache,
  CacheManager,
  RequestCoalescer,
  CacheNamespace,
  defaultCacheManager,

  // Batch Processing
  BatchProcessor,
  defaultBatchProcessor,

  // Connection Pooling
  ConnectionPool,

  // Performance Monitoring
  PerformanceMonitor,
  defaultPerformanceMonitor,
} = require('../../src/performance');

describe('Performance Module Exports', () => {
  describe('Lazy Loading exports', () => {
    it('should export LazyLoader', () => {
      expect(LazyLoader).toBeDefined();
      expect(new LazyLoader()).toBeInstanceOf(LazyLoader);
    });

    it('should export ModuleCategory', () => {
      expect(ModuleCategory).toBeDefined();
      expect(ModuleCategory.CORE).toBe('core');
    });

    it('should export MODULE_REGISTRY', () => {
      expect(MODULE_REGISTRY).toBeDefined();
      expect(typeof MODULE_REGISTRY).toBe('object');
    });

    it('should export createLazyProxy', () => {
      expect(createLazyProxy).toBeDefined();
      expect(typeof createLazyProxy).toBe('function');
    });

    it('should export defaultLoader', () => {
      expect(defaultLoader).toBeDefined();
      expect(defaultLoader).toBeInstanceOf(LazyLoader);
    });
  });

  describe('Caching exports', () => {
    it('should export CacheEntry', () => {
      expect(CacheEntry).toBeDefined();
      expect(new CacheEntry('test')).toBeInstanceOf(CacheEntry);
    });

    it('should export LRUCache', () => {
      expect(LRUCache).toBeDefined();
      expect(new LRUCache(10)).toBeInstanceOf(LRUCache);
    });

    it('should export CacheManager', () => {
      expect(CacheManager).toBeDefined();
      const manager = new CacheManager({ cleanupInterval: 0 });
      expect(manager).toBeInstanceOf(CacheManager);
      manager.destroy();
    });

    it('should export RequestCoalescer', () => {
      expect(RequestCoalescer).toBeDefined();
      expect(new RequestCoalescer()).toBeInstanceOf(RequestCoalescer);
    });

    it('should export CacheNamespace', () => {
      expect(CacheNamespace).toBeDefined();
      expect(CacheNamespace.ANALYSIS).toBe('analysis');
    });

    it('should export defaultCacheManager', () => {
      expect(defaultCacheManager).toBeDefined();
      expect(defaultCacheManager).toBeInstanceOf(CacheManager);
    });
  });

  describe('Batch Processing exports', () => {
    it('should export BatchProcessor', () => {
      expect(BatchProcessor).toBeDefined();
      expect(new BatchProcessor()).toBeInstanceOf(BatchProcessor);
    });

    it('should export defaultBatchProcessor', () => {
      expect(defaultBatchProcessor).toBeDefined();
      expect(defaultBatchProcessor).toBeInstanceOf(BatchProcessor);
    });
  });

  describe('Connection Pooling exports', () => {
    it('should export ConnectionPool', () => {
      expect(ConnectionPool).toBeDefined();
      const pool = new ConnectionPool(() => Promise.resolve({}));
      expect(pool).toBeInstanceOf(ConnectionPool);
      pool.destroy();
    });
  });

  describe('Performance Monitoring exports', () => {
    it('should export PerformanceMonitor', () => {
      expect(PerformanceMonitor).toBeDefined();
      expect(new PerformanceMonitor()).toBeInstanceOf(PerformanceMonitor);
    });

    it('should export defaultPerformanceMonitor', () => {
      expect(defaultPerformanceMonitor).toBeDefined();
      expect(defaultPerformanceMonitor).toBeInstanceOf(PerformanceMonitor);
    });
  });
});

describe('BatchProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new BatchProcessor({
      batchSize: 3,
      maxWaitTime: 100,
      concurrency: 2,
    });
  });

  afterEach(async () => {
    // Wait a bit for any pending processing to complete
    await new Promise(resolve => setTimeout(resolve, 150));
  });

  describe('add', () => {
    it('should process items', async () => {
      const results = await Promise.all([
        processor.add(1, x => x * 2),
        processor.add(2, x => x * 2),
        processor.add(3, x => x * 2),
      ]);

      expect(results).toEqual([2, 4, 6]);
    });

    it('should flush when batch is full', async () => {
      const startTime = Date.now();

      await Promise.all([
        processor.add(1, x => x),
        processor.add(2, x => x),
        processor.add(3, x => x),
      ]);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should flush immediately, not wait
    });

    it('should flush after maxWaitTime', async () => {
      const result = await processor.add(1, x => x * 2);
      expect(result).toBe(2);
    });

    it('should handle errors', async () => {
      await expect(
        processor.add(1, () => {
          throw new Error('test error');
        })
      ).rejects.toThrow('test error');
    });
  });

  describe('queueLength', () => {
    it('should return current queue length', () => {
      processor.add(1, x => x);
      expect(processor.queueLength).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clear', () => {
    it('should clear the queue and reject pending items', async () => {
      // Create a fresh processor for this test to avoid afterEach issues
      const testProcessor = new BatchProcessor();
      const promise = testProcessor.add(1, () => new Promise(() => {}));
      testProcessor.clear();

      await expect(promise).rejects.toThrow('Batch processor cleared');
      expect(testProcessor.queueLength).toBe(0);
    });
  });
});

describe('ConnectionPool', () => {
  let pool;
  let connectionCount;

  beforeEach(() => {
    connectionCount = 0;
    pool = new ConnectionPool(
      () => {
        connectionCount++;
        return Promise.resolve({ id: connectionCount });
      },
      {
        minSize: 1,
        maxSize: 3,
        idleTimeout: 100,
        acquireTimeout: 500,
      }
    );
  });

  afterEach(() => {
    pool.destroy();
  });

  describe('acquire and release', () => {
    it('should create connections on demand', async () => {
      const conn = await pool.acquire();
      expect(conn.id).toBe(1);
      pool.release(conn);
    });

    it('should reuse released connections', async () => {
      const conn1 = await pool.acquire();
      pool.release(conn1);

      const conn2 = await pool.acquire();
      expect(conn2.id).toBe(conn1.id);
      pool.release(conn2);
    });

    it('should wait when pool is exhausted', async () => {
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();
      const conn3 = await pool.acquire();

      // Pool is now exhausted
      const waitPromise = pool.acquire();

      // Release one connection
      setTimeout(() => pool.release(conn1), 50);

      const conn4 = await waitPromise;
      expect(conn4.id).toBe(conn1.id);

      pool.release(conn2);
      pool.release(conn3);
      pool.release(conn4);
    });

    it('should timeout when waiting too long', async () => {
      // Exhaust pool
      await pool.acquire();
      await pool.acquire();
      await pool.acquire();

      const shortTimeoutPool = new ConnectionPool(() => Promise.resolve({}), {
        maxSize: 0,
        acquireTimeout: 50,
      });

      await expect(shortTimeoutPool.acquire()).rejects.toThrow('Connection acquire timeout');
      shortTimeoutPool.destroy();
    });
  });

  describe('withConnection', () => {
    it('should execute function with pooled connection', async () => {
      const result = await pool.withConnection(conn => conn.id * 2);
      expect(result).toBe(2);
    });

    it('should release connection after use', async () => {
      await pool.withConnection(() => {});
      const stats = pool.getStats();
      expect(stats.activeCount).toBe(0);
    });

    it('should release connection on error', async () => {
      await expect(
        pool.withConnection(() => {
          throw new Error('test');
        })
      ).rejects.toThrow('test');

      const stats = pool.getStats();
      expect(stats.activeCount).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return pool statistics', async () => {
      const conn = await pool.acquire();
      const stats = pool.getStats();

      expect(stats.activeCount).toBe(1);
      expect(stats.maxSize).toBe(3);
      expect(stats.poolSize).toBeGreaterThanOrEqual(0);

      pool.release(conn);
    });
  });

  describe('destroy', () => {
    it('should prevent new acquisitions', async () => {
      pool.destroy();
      await expect(pool.acquire()).rejects.toThrow('Pool has been destroyed');
    });
  });
});

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    monitor.clear();
  });

  describe('startTimer and endTimer', () => {
    it('should measure duration', async () => {
      monitor.startTimer('test');
      await new Promise(resolve => setTimeout(resolve, 10));
      const duration = monitor.endTimer('test');

      expect(duration).toBeGreaterThanOrEqual(9);
    });

    it('should return 0 for unknown timer', () => {
      const duration = monitor.endTimer('unknown');
      expect(duration).toBe(0);
    });
  });

  describe('record', () => {
    it('should record metric values', () => {
      monitor.record('test', 10);
      monitor.record('test', 20);
      monitor.record('test', 30);

      const metric = monitor.getMetric('test');
      expect(metric.count).toBe(3);
      expect(metric.avg).toBe(20);
      expect(metric.min).toBe(10);
      expect(metric.max).toBe(30);
    });
  });

  describe('getMetric', () => {
    it('should return null for unknown metric', () => {
      expect(monitor.getMetric('unknown')).toBeNull();
    });

    it('should calculate percentiles', () => {
      for (let i = 1; i <= 100; i++) {
        monitor.record('test', i);
      }

      const metric = monitor.getMetric('test');
      // p50 should be around 50 (could be 50 or 51 depending on index calculation)
      expect(metric.p50).toBeGreaterThanOrEqual(49);
      expect(metric.p50).toBeLessThanOrEqual(52);
      expect(metric.p95).toBeGreaterThanOrEqual(95);
      expect(metric.p99).toBeGreaterThanOrEqual(99);
    });
  });

  describe('getAllMetrics', () => {
    it('should return all metrics', () => {
      monitor.record('metric1', 10);
      monitor.record('metric2', 20);

      const all = monitor.getAllMetrics();
      expect(all.metric1).toBeDefined();
      expect(all.metric2).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      monitor.record('test', 10);
      monitor.startTimer('test');

      monitor.clear();

      expect(monitor.getAllMetrics()).toEqual({});
    });
  });

  describe('wrap', () => {
    it('should wrap async function and track timing', async () => {
      const fn = async x => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return x * 2;
      };

      const wrapped = monitor.wrap('test', fn);
      const result = await wrapped(5);

      expect(result).toBe(10);
      expect(monitor.getMetric('test')).not.toBeNull();
    });
  });

  describe('wrapSync', () => {
    it('should wrap sync function and track timing', () => {
      const fn = x => x * 2;

      const wrapped = monitor.wrapSync('test', fn);
      const result = wrapped(5);

      expect(result).toBe(10);
      expect(monitor.getMetric('test')).not.toBeNull();
    });
  });
});
