/**
 * Startup Optimizer
 *
 * Phase 6 P2: Startup Time Improvement
 *
 * Optimizes MUSUBI startup time through:
 * - Deferred initialization
 * - Parallel module loading
 * - Warm-up caching
 * - Initialization profiling
 *
 * @module src/performance/startup-optimizer
 */

'use strict';

/**
 * Initialization stages
 */
const InitStage = {
  CORE: 'core', // Essential for basic operation
  EXTENDED: 'extended', // Important but can wait
  OPTIONAL: 'optional', // Nice to have, load in background
  ON_DEMAND: 'on-demand', // Only when explicitly needed
};

/**
 * Initialization state
 */
const InitState = {
  PENDING: 'pending',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
};

/**
 * Represents a module to be initialized
 */
class InitModule {
  /**
   * @param {string} name - Module name
   * @param {Function} initializer - Async initialization function
   * @param {Object} options
   * @param {string} options.stage - Initialization stage
   * @param {string[]} options.dependencies - Module dependencies
   * @param {number} options.priority - Priority within stage (higher = earlier)
   */
  constructor(name, initializer, options = {}) {
    this.name = name;
    this.initializer = initializer;
    this.stage = options.stage || InitStage.EXTENDED;
    this.dependencies = options.dependencies || [];
    this.priority = options.priority || 0;
    this.state = InitState.PENDING;
    this.result = null;
    this.error = null;
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Get initialization duration in ms
   */
  get duration() {
    if (this.startTime && this.endTime) {
      return this.endTime - this.startTime;
    }
    return null;
  }

  /**
   * Initialize this module
   * @returns {Promise<*>}
   */
  async initialize() {
    if (this.state === InitState.READY) {
      return this.result;
    }

    if (this.state === InitState.LOADING) {
      // Wait for existing initialization
      return new Promise((resolve, reject) => {
        const check = setInterval(() => {
          if (this.state === InitState.READY) {
            clearInterval(check);
            resolve(this.result);
          } else if (this.state === InitState.ERROR) {
            clearInterval(check);
            reject(this.error);
          }
        }, 10);
      });
    }

    this.state = InitState.LOADING;
    this.startTime = Date.now();

    try {
      this.result = await this.initializer();
      this.state = InitState.READY;
      this.endTime = Date.now();
      return this.result;
    } catch (error) {
      this.state = InitState.ERROR;
      this.error = error;
      this.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Reset module state
   */
  reset() {
    this.state = InitState.PENDING;
    this.result = null;
    this.error = null;
    this.startTime = null;
    this.endTime = null;
  }
}

/**
 * Startup Optimizer - Manages module initialization
 */
class StartupOptimizer {
  constructor(options = {}) {
    this.modules = new Map();
    this.stageOrder = [InitStage.CORE, InitStage.EXTENDED, InitStage.OPTIONAL, InitStage.ON_DEMAND];
    this.initialized = false;
    this.profile = [];
    this.options = {
      parallelLimit: options.parallelLimit || 4,
      deferOptional: options.deferOptional !== false,
      profileEnabled: options.profileEnabled !== false,
      ...options,
    };
  }

  /**
   * Register a module for initialization
   * @param {string} name - Module name
   * @param {Function} initializer - Async initialization function
   * @param {Object} options - Module options
   * @returns {StartupOptimizer}
   */
  register(name, initializer, options = {}) {
    this.modules.set(name, new InitModule(name, initializer, options));
    return this;
  }

  /**
   * Get a registered module
   * @param {string} name
   * @returns {InitModule|undefined}
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * Check if a module is ready
   * @param {string} name
   * @returns {boolean}
   */
  isReady(name) {
    const module = this.modules.get(name);
    return module && module.state === InitState.READY;
  }

  /**
   * Get module result (initialize if needed)
   * @param {string} name
   * @returns {Promise<*>}
   */
  async get(name) {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module '${name}' not registered`);
    }

    // Initialize dependencies first
    for (const dep of module.dependencies) {
      await this.get(dep);
    }

    return module.initialize();
  }

  /**
   * Initialize all modules up to a given stage
   * @param {string} upToStage - Stage to initialize up to
   * @returns {Promise<Object>} - Initialization results
   */
  async initialize(upToStage = InitStage.EXTENDED) {
    const startTime = Date.now();
    const results = {};
    const errors = {};

    // Get stages to initialize
    const stageIndex = this.stageOrder.indexOf(upToStage);
    const stagesToInit = this.stageOrder.slice(0, stageIndex + 1);

    // Initialize each stage in order
    for (const stage of stagesToInit) {
      const stageResult = await this._initializeStage(stage);
      Object.assign(results, stageResult.results);
      Object.assign(errors, stageResult.errors);
    }

    // Optionally defer optional modules
    if (this.options.deferOptional && upToStage !== InitStage.ON_DEMAND) {
      // Schedule optional initialization in background
      setImmediate(() => {
        this._initializeStage(InitStage.OPTIONAL).catch(() => {});
      });
    }

    this.initialized = true;
    const endTime = Date.now();

    // Record profile
    if (this.options.profileEnabled) {
      this._recordProfile(startTime, endTime);
    }

    return {
      results,
      errors,
      duration: endTime - startTime,
      profile: this.profile,
    };
  }

  /**
   * Initialize a single stage
   * @private
   */
  async _initializeStage(stage) {
    const modules = Array.from(this.modules.values())
      .filter(m => m.stage === stage)
      .sort((a, b) => b.priority - a.priority);

    const results = {};
    const errors = {};

    // Initialize in parallel with limit
    const chunks = [];
    for (let i = 0; i < modules.length; i += this.options.parallelLimit) {
      chunks.push(modules.slice(i, i + this.options.parallelLimit));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async module => {
          // Initialize dependencies first
          for (const dep of module.dependencies) {
            await this.get(dep);
          }
          return module.initialize();
        })
      );

      chunk.forEach((module, i) => {
        const result = chunkResults[i];
        if (result.status === 'fulfilled') {
          results[module.name] = result.value;
        } else {
          errors[module.name] = result.reason;
        }
      });
    }

    return { results, errors };
  }

  /**
   * Record initialization profile
   * @private
   */
  _recordProfile(startTime, endTime) {
    this.profile = Array.from(this.modules.values())
      .filter(m => m.duration !== null)
      .map(m => ({
        name: m.name,
        stage: m.stage,
        duration: m.duration,
        state: m.state,
      }))
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * Get initialization profile
   * @returns {Object}
   */
  getProfile() {
    const totalDuration = this.profile.reduce((sum, m) => sum + m.duration, 0);
    const byStage = {};

    for (const stage of this.stageOrder) {
      const stageModules = this.profile.filter(m => m.stage === stage);
      byStage[stage] = {
        count: stageModules.length,
        duration: stageModules.reduce((sum, m) => sum + m.duration, 0),
        modules: stageModules,
      };
    }

    return {
      totalDuration,
      moduleCount: this.profile.length,
      byStage,
      slowest: this.profile.slice(0, 5),
    };
  }

  /**
   * Reset all modules
   */
  reset() {
    for (const module of this.modules.values()) {
      module.reset();
    }
    this.initialized = false;
    this.profile = [];
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const states = { pending: 0, loading: 0, ready: 0, error: 0 };
    for (const module of this.modules.values()) {
      states[module.state]++;
    }

    return {
      moduleCount: this.modules.size,
      states,
      initialized: this.initialized,
      profile: this.getProfile(),
    };
  }
}

/**
 * Warm-up Cache - Pre-computes frequently accessed data
 */
class WarmupCache {
  constructor() {
    this.cache = new Map();
    this.warmupFunctions = new Map();
    this.warmedUp = false;
  }

  /**
   * Register a warm-up function
   * @param {string} key - Cache key
   * @param {Function} fn - Async function to compute value
   * @param {Object} options
   */
  register(key, fn, options = {}) {
    this.warmupFunctions.set(key, { fn, options });
    return this;
  }

  /**
   * Warm up all registered functions
   * @returns {Promise<Object>}
   */
  async warmup() {
    const startTime = Date.now();
    const results = {};
    const errors = {};

    const entries = Array.from(this.warmupFunctions.entries());

    await Promise.allSettled(
      entries.map(async ([key, { fn }]) => {
        try {
          const value = await fn();
          this.cache.set(key, value);
          results[key] = true;
        } catch (error) {
          errors[key] = error;
        }
      })
    );

    this.warmedUp = true;

    return {
      results,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get a cached value
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Check if a key is cached
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Clear the cache
   */
  clear() {
    this.cache.clear();
    this.warmedUp = false;
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    return {
      registeredCount: this.warmupFunctions.size,
      cachedCount: this.cache.size,
      warmedUp: this.warmedUp,
    };
  }
}

/**
 * Initialization Profiler - Tracks startup performance
 */
class InitProfiler {
  constructor() {
    this.marks = new Map();
    this.measures = [];
  }

  /**
   * Mark a point in time
   * @param {string} name
   */
  mark(name) {
    this.marks.set(name, {
      name,
      timestamp: Date.now(),
      hrtime: process.hrtime.bigint(),
    });
  }

  /**
   * Measure between two marks
   * @param {string} name - Measure name
   * @param {string} startMark - Start mark name
   * @param {string} endMark - End mark name
   * @returns {Object}
   */
  measure(name, startMark, endMark) {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);

    if (!start || !end) {
      return null;
    }

    const durationNs = Number(end.hrtime - start.hrtime);
    const durationMs = durationNs / 1_000_000;

    const measurement = {
      name,
      startMark,
      endMark,
      durationMs,
      durationNs,
    };

    this.measures.push(measurement);
    return measurement;
  }

  /**
   * Get all measures
   * @returns {Object[]}
   */
  getMeasures() {
    return [...this.measures].sort((a, b) => b.durationMs - a.durationMs);
  }

  /**
   * Get summary
   * @returns {Object}
   */
  getSummary() {
    const total = this.measures.reduce((sum, m) => sum + m.durationMs, 0);

    return {
      measureCount: this.measures.length,
      totalDurationMs: total,
      measures: this.getMeasures(),
      slowest: this.measures.slice(0, 5),
    };
  }

  /**
   * Clear all marks and measures
   */
  clear() {
    this.marks.clear();
    this.measures = [];
  }
}

// Default instances
const defaultStartupOptimizer = new StartupOptimizer();
const defaultWarmupCache = new WarmupCache();
const defaultInitProfiler = new InitProfiler();

module.exports = {
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
