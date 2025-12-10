/**
 * MUSUBI Performance Module
 *
 * Phase 6 P0: Performance Optimization
 *
 * Exports:
 * - LazyLoader: On-demand module loading
 * - CacheManager: In-memory caching with LRU eviction
 * - RequestCoalescer: Duplicate request deduplication
 * - BatchProcessor: Bulk operation support
 */

const {
  LazyLoader,
  ModuleCategory,
  MODULE_REGISTRY,
  createLazyProxy,
  defaultLoader,
} = require('./lazy-loader');

const {
  CacheEntry,
  LRUCache,
  CacheManager,
  RequestCoalescer,
  CacheNamespace,
  defaultCacheManager,
} = require('./cache-manager');

const {
  MemoryPressure,
  ObjectPool,
  WeakCache,
  MemoryMonitor,
  StreamingBuffer,
  MemoryOptimizer,
  defaultOptimizer,
} = require('./memory-optimizer');

const {
  InitStage,
  InitState,
  InitModule,
  StartupOptimizer,
  WarmupCache,
  InitProfiler,
  defaultStartupOptimizer,
  defaultWarmupCache,
  defaultInitProfiler,
} = require('./startup-optimizer');

/**
 * BatchProcessor for bulk operations
 */
class BatchProcessor {
  constructor(options = {}) {
    this.options = {
      batchSize: options.batchSize || 100,
      maxWaitTime: options.maxWaitTime || 50, // ms
      concurrency: options.concurrency || 4,
      ...options,
    };

    this.queue = [];
    this.timer = null;
    this.processing = false;
  }

  /**
   * Add an item to the batch
   * @param {*} item - Item to process
   * @param {Function} processor - Function to process item
   * @returns {Promise<*>} - Processing result
   */
  add(item, processor) {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, processor, resolve, reject });

      // Start timer if not already running
      if (!this.timer && !this.processing) {
        this.timer = setTimeout(() => {
          this.flush();
        }, this.options.maxWaitTime);
      }

      // Flush if batch is full
      if (this.queue.length >= this.options.batchSize) {
        this.flush();
      }
    });
  }

  /**
   * Process all queued items
   */
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0 || this.processing) {
      return;
    }

    this.processing = true;
    const batch = this.queue.splice(0, this.options.batchSize);

    try {
      // Process in parallel with concurrency limit
      const chunks = [];
      for (let i = 0; i < batch.length; i += this.options.concurrency) {
        chunks.push(batch.slice(i, i + this.options.concurrency));
      }

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(async ({ item, processor, resolve, reject }) => {
            try {
              const result = await processor(item);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          })
        );
      }
    } finally {
      this.processing = false;

      // Process remaining items
      if (this.queue.length > 0) {
        this.flush();
      }
    }
  }

  /**
   * Get queue length
   */
  get queueLength() {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clear() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Reject all pending items
    for (const { reject } of this.queue) {
      reject(new Error('Batch processor cleared'));
    }
    this.queue = [];
  }
}

/**
 * Connection pool for reusing connections
 */
class ConnectionPool {
  constructor(factory, options = {}) {
    this.factory = factory;
    this.options = {
      minSize: options.minSize || 1,
      maxSize: options.maxSize || 10,
      idleTimeout: options.idleTimeout || 30000, // 30 seconds
      acquireTimeout: options.acquireTimeout || 5000, // 5 seconds
      ...options,
    };

    this.pool = [];
    this.waiting = [];
    this.activeCount = 0;
    this.destroyed = false;
  }

  /**
   * Acquire a connection from the pool
   * @returns {Promise<*>} - Connection
   */
  async acquire() {
    if (this.destroyed) {
      throw new Error('Pool has been destroyed');
    }

    // Try to get an idle connection
    const connection = this.pool.shift();
    if (connection) {
      this.activeCount++;
      return connection.resource;
    }

    // Create a new connection if under max
    if (this.activeCount < this.options.maxSize) {
      this.activeCount++;
      try {
        return await this.factory();
      } catch (error) {
        this.activeCount--;
        throw error;
      }
    }

    // Wait for a connection to be released
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waiting.indexOf(waiter);
        if (index !== -1) {
          this.waiting.splice(index, 1);
        }
        reject(new Error('Connection acquire timeout'));
      }, this.options.acquireTimeout);

      const waiter = { resolve, reject, timeout };
      this.waiting.push(waiter);
    });
  }

  /**
   * Release a connection back to the pool
   * @param {*} resource - Connection to release
   */
  release(resource) {
    // Check if someone is waiting
    if (this.waiting.length > 0) {
      const waiter = this.waiting.shift();
      clearTimeout(waiter.timeout);
      waiter.resolve(resource);
      return;
    }

    // Return to pool if under max
    if (this.pool.length < this.options.maxSize) {
      this.pool.push({
        resource,
        idleSince: Date.now(),
      });
    }

    this.activeCount--;

    // Clean up idle connections
    this._cleanupIdle();
  }

  /**
   * Clean up idle connections
   * @private
   */
  _cleanupIdle() {
    const now = Date.now();
    while (this.pool.length > this.options.minSize) {
      const oldest = this.pool[0];
      if (now - oldest.idleSince > this.options.idleTimeout) {
        this.pool.shift();
      } else {
        break;
      }
    }
  }

  /**
   * Execute a function with a pooled connection
   * @param {Function} fn - Function to execute
   * @returns {Promise<*>} - Result
   */
  async withConnection(fn) {
    const connection = await this.acquire();
    try {
      return await fn(connection);
    } finally {
      this.release(connection);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      poolSize: this.pool.length,
      activeCount: this.activeCount,
      waitingCount: this.waiting.length,
      maxSize: this.options.maxSize,
    };
  }

  /**
   * Destroy the pool
   */
  destroy() {
    this.destroyed = true;

    // Reject all waiting
    for (const { reject, timeout } of this.waiting) {
      clearTimeout(timeout);
      reject(new Error('Pool destroyed'));
    }
    this.waiting = [];

    // Clear pool
    this.pool = [];
    this.activeCount = 0;
  }
}

/**
 * Performance monitor for tracking metrics
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.timers = new Map();
  }

  /**
   * Start a timer
   * @param {string} name - Timer name
   */
  startTimer(name) {
    this.timers.set(name, process.hrtime.bigint());
  }

  /**
   * End a timer and record the duration
   * @param {string} name - Timer name
   * @returns {number} - Duration in ms
   */
  endTimer(name) {
    const start = this.timers.get(name);
    if (!start) return 0;

    const end = process.hrtime.bigint();
    const durationNs = Number(end - start);
    const durationMs = durationNs / 1_000_000;

    this.timers.delete(name);
    this.record(name, durationMs);

    return durationMs;
  }

  /**
   * Record a metric value
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   */
  record(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        values: [],
      });
    }

    const metric = this.metrics.get(name);
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);

    // Keep last 100 values for percentile calculation
    metric.values.push(value);
    if (metric.values.length > 100) {
      metric.values.shift();
    }
  }

  /**
   * Get metric statistics
   * @param {string} name - Metric name
   * @returns {Object} - Statistics
   */
  getMetric(name) {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    const sorted = [...metric.values].sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      count: metric.count,
      avg: metric.sum / metric.count,
      min: metric.min,
      max: metric.max,
      p50: sorted[p50Index] || 0,
      p95: sorted[p95Index] || sorted[sorted.length - 1] || 0,
      p99: sorted[p99Index] || sorted[sorted.length - 1] || 0,
    };
  }

  /**
   * Get all metrics
   * @returns {Object} - All metrics
   */
  getAllMetrics() {
    const result = {};
    for (const name of this.metrics.keys()) {
      result[name] = this.getMetric(name);
    }
    return result;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
    this.timers.clear();
  }

  /**
   * Create a wrapped function that tracks timing
   * @param {string} name - Metric name
   * @param {Function} fn - Function to wrap
   * @returns {Function} - Wrapped function
   */
  wrap(name, fn) {
    const monitor = this;
    return async function (...args) {
      monitor.startTimer(name);
      try {
        return await fn.apply(this, args);
      } finally {
        monitor.endTimer(name);
      }
    };
  }

  /**
   * Create a wrapped sync function that tracks timing
   * @param {string} name - Metric name
   * @param {Function} fn - Function to wrap
   * @returns {Function} - Wrapped function
   */
  wrapSync(name, fn) {
    const monitor = this;
    return function (...args) {
      monitor.startTimer(name);
      try {
        return fn.apply(this, args);
      } finally {
        monitor.endTimer(name);
      }
    };
  }
}

// Singleton instances
const defaultBatchProcessor = new BatchProcessor();
const defaultPerformanceMonitor = new PerformanceMonitor();

module.exports = {
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

  // Memory Optimization (Phase 6 P1)
  MemoryPressure,
  ObjectPool,
  WeakCache,
  MemoryMonitor,
  StreamingBuffer,
  MemoryOptimizer,
  defaultOptimizer,

  // Startup Optimization (Phase 6 P2)
  InitStage,
  InitState,
  InitModule,
  StartupOptimizer,
  WarmupCache,
  InitProfiler,
  defaultStartupOptimizer,
  defaultWarmupCache,
  defaultInitProfiler,
};
