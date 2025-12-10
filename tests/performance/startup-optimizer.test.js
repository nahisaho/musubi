/**
 * Startup Optimizer Tests
 *
 * Phase 6 P2: Startup Time Improvement
 */

'use strict';

const {
  InitStage,
  InitState,
  InitModule,
  StartupOptimizer,
  WarmupCache,
  InitProfiler,
} = require('../../src/performance/startup-optimizer');

describe('Startup Optimizer Module', () => {
  // ============================================================
  // InitStage Tests
  // ============================================================
  describe('InitStage', () => {
    it('should define all initialization stages', () => {
      expect(InitStage.CORE).toBe('core');
      expect(InitStage.EXTENDED).toBe('extended');
      expect(InitStage.OPTIONAL).toBe('optional');
      expect(InitStage.ON_DEMAND).toBe('on-demand');
    });
  });

  // ============================================================
  // InitState Tests
  // ============================================================
  describe('InitState', () => {
    it('should define all initialization states', () => {
      expect(InitState.PENDING).toBe('pending');
      expect(InitState.LOADING).toBe('loading');
      expect(InitState.READY).toBe('ready');
      expect(InitState.ERROR).toBe('error');
    });
  });

  // ============================================================
  // InitModule Tests
  // ============================================================
  describe('InitModule', () => {
    it('should create module with default options', () => {
      const initializer = jest.fn().mockResolvedValue('result');
      const module = new InitModule('test', initializer);

      expect(module.name).toBe('test');
      expect(module.stage).toBe(InitStage.EXTENDED);
      expect(module.dependencies).toEqual([]);
      expect(module.priority).toBe(0);
      expect(module.state).toBe(InitState.PENDING);
    });

    it('should create module with custom options', () => {
      const initializer = jest.fn();
      const module = new InitModule('test', initializer, {
        stage: InitStage.CORE,
        dependencies: ['dep1', 'dep2'],
        priority: 10,
      });

      expect(module.stage).toBe(InitStage.CORE);
      expect(module.dependencies).toEqual(['dep1', 'dep2']);
      expect(module.priority).toBe(10);
    });

    it('should initialize module successfully', async () => {
      const initializer = jest.fn().mockResolvedValue('test-result');
      const module = new InitModule('test', initializer);

      const result = await module.initialize();

      expect(result).toBe('test-result');
      expect(module.state).toBe(InitState.READY);
      expect(module.result).toBe('test-result');
      expect(module.duration).toBeGreaterThanOrEqual(0);
    });

    it('should return cached result on subsequent initialize calls', async () => {
      const initializer = jest.fn().mockResolvedValue('cached');
      const module = new InitModule('test', initializer);

      await module.initialize();
      const result = await module.initialize();

      expect(result).toBe('cached');
      expect(initializer).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Init failed');
      const initializer = jest.fn().mockRejectedValue(error);
      const module = new InitModule('test', initializer);

      await expect(module.initialize()).rejects.toThrow('Init failed');
      expect(module.state).toBe(InitState.ERROR);
      expect(module.error).toBe(error);
    });

    it('should reset module state', async () => {
      const initializer = jest.fn().mockResolvedValue('result');
      const module = new InitModule('test', initializer);

      await module.initialize();
      module.reset();

      expect(module.state).toBe(InitState.PENDING);
      expect(module.result).toBeNull();
      expect(module.startTime).toBeNull();
    });

    it('should return null duration when not initialized', () => {
      const module = new InitModule('test', jest.fn());
      expect(module.duration).toBeNull();
    });
  });

  // ============================================================
  // StartupOptimizer Tests
  // ============================================================
  describe('StartupOptimizer', () => {
    let optimizer;

    beforeEach(() => {
      optimizer = new StartupOptimizer();
    });

    describe('Module Registration', () => {
      it('should register modules', () => {
        const initializer = jest.fn();
        optimizer.register('test', initializer);

        expect(optimizer.modules.size).toBe(1);
        expect(optimizer.getModule('test')).toBeDefined();
      });

      it('should support chained registration', () => {
        optimizer
          .register('mod1', jest.fn())
          .register('mod2', jest.fn())
          .register('mod3', jest.fn());

        expect(optimizer.modules.size).toBe(3);
      });

      it('should register modules with options', () => {
        optimizer.register('core-mod', jest.fn(), {
          stage: InitStage.CORE,
          priority: 100,
          dependencies: ['other'],
        });

        const module = optimizer.getModule('core-mod');
        expect(module.stage).toBe(InitStage.CORE);
        expect(module.priority).toBe(100);
        expect(module.dependencies).toEqual(['other']);
      });
    });

    describe('Module Status', () => {
      it('should check if module is ready', async () => {
        optimizer.register('test', jest.fn().mockResolvedValue('ok'));

        expect(optimizer.isReady('test')).toBe(false);
        await optimizer.get('test');
        expect(optimizer.isReady('test')).toBe(true);
      });

      it('should get module result', async () => {
        optimizer.register('test', jest.fn().mockResolvedValue('result'));

        const result = await optimizer.get('test');
        expect(result).toBe('result');
      });

      it('should throw for unregistered module', async () => {
        await expect(optimizer.get('nonexistent')).rejects.toThrow(
          "Module 'nonexistent' not registered"
        );
      });
    });

    describe('Dependency Resolution', () => {
      it('should initialize dependencies first', async () => {
        const order = [];

        optimizer.register('dep', async () => {
          order.push('dep');
          return 'dep-result';
        });

        optimizer.register(
          'main',
          async () => {
            order.push('main');
            return 'main-result';
          },
          { dependencies: ['dep'] }
        );

        await optimizer.get('main');

        expect(order).toEqual(['dep', 'main']);
      });

      it('should handle nested dependencies', async () => {
        const order = [];

        optimizer
          .register('a', async () => order.push('a'))
          .register('b', async () => order.push('b'), { dependencies: ['a'] })
          .register('c', async () => order.push('c'), { dependencies: ['b'] });

        await optimizer.get('c');

        expect(order).toEqual(['a', 'b', 'c']);
      });
    });

    describe('Stage Initialization', () => {
      it('should initialize core modules first', async () => {
        const order = [];

        optimizer
          .register('core1', async () => order.push('core1'), {
            stage: InitStage.CORE,
          })
          .register('ext1', async () => order.push('ext1'), {
            stage: InitStage.EXTENDED,
          })
          .register('core2', async () => order.push('core2'), {
            stage: InitStage.CORE,
          });

        await optimizer.initialize(InitStage.EXTENDED);

        // Core modules should be initialized before extended
        const coreIndices = [order.indexOf('core1'), order.indexOf('core2')];
        const extIndex = order.indexOf('ext1');

        expect(coreIndices.every(i => i < extIndex)).toBe(true);
      });

      it('should respect priority within stage', async () => {
        const order = [];

        optimizer
          .register('low', async () => order.push('low'), {
            stage: InitStage.CORE,
            priority: 1,
          })
          .register('high', async () => order.push('high'), {
            stage: InitStage.CORE,
            priority: 100,
          })
          .register('medium', async () => order.push('medium'), {
            stage: InitStage.CORE,
            priority: 50,
          });

        // With parallel limit of 1, order should be by priority
        optimizer.options.parallelLimit = 1;
        await optimizer.initialize(InitStage.CORE);

        expect(order).toEqual(['high', 'medium', 'low']);
      });

      it('should return initialization results', async () => {
        optimizer
          .register('mod1', async () => 'result1', { stage: InitStage.CORE })
          .register('mod2', async () => 'result2', { stage: InitStage.CORE });

        const { results, errors, duration } = await optimizer.initialize(
          InitStage.CORE
        );

        expect(results.mod1).toBe('result1');
        expect(results.mod2).toBe('result2');
        expect(Object.keys(errors)).toHaveLength(0);
        expect(duration).toBeGreaterThanOrEqual(0);
      });

      it('should capture errors during initialization', async () => {
        optimizer
          .register('good', async () => 'ok', { stage: InitStage.CORE })
          .register(
            'bad',
            async () => {
              throw new Error('Failed');
            },
            { stage: InitStage.CORE }
          );

        const { results, errors } = await optimizer.initialize(InitStage.CORE);

        expect(results.good).toBe('ok');
        expect(errors.bad).toBeDefined();
        expect(errors.bad.message).toBe('Failed');
      });
    });

    describe('Parallel Initialization', () => {
      it('should respect parallel limit', async () => {
        let concurrent = 0;
        let maxConcurrent = 0;

        const createSlowInit = () => async () => {
          concurrent++;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await new Promise(r => setTimeout(r, 20));
          concurrent--;
          return 'done';
        };

        optimizer.options.parallelLimit = 2;

        optimizer
          .register('m1', createSlowInit(), { stage: InitStage.CORE })
          .register('m2', createSlowInit(), { stage: InitStage.CORE })
          .register('m3', createSlowInit(), { stage: InitStage.CORE })
          .register('m4', createSlowInit(), { stage: InitStage.CORE });

        await optimizer.initialize(InitStage.CORE);

        expect(maxConcurrent).toBeLessThanOrEqual(2);
      });
    });

    describe('Profiling', () => {
      it('should record initialization profile', async () => {
        optimizer
          .register('fast', async () => 'fast', { stage: InitStage.CORE })
          .register(
            'slow',
            async () => {
              await new Promise(r => setTimeout(r, 10));
              return 'slow';
            },
            { stage: InitStage.CORE }
          );

        await optimizer.initialize(InitStage.CORE);
        const profile = optimizer.getProfile();

        expect(profile.moduleCount).toBe(2);
        expect(profile.totalDuration).toBeGreaterThan(0);
        expect(profile.byStage[InitStage.CORE].count).toBe(2);
        expect(profile.slowest.length).toBeLessThanOrEqual(5);
      });

      it('should disable profiling when configured', async () => {
        optimizer = new StartupOptimizer({ profileEnabled: false });
        optimizer.register('test', async () => 'ok', { stage: InitStage.CORE });

        await optimizer.initialize(InitStage.CORE);

        expect(optimizer.profile).toEqual([]);
      });
    });

    describe('Statistics', () => {
      it('should return accurate statistics', async () => {
        optimizer
          .register('ready', async () => 'ok', { stage: InitStage.CORE })
          .register('pending', jest.fn(), { stage: InitStage.OPTIONAL });

        await optimizer.initialize(InitStage.CORE);
        const stats = optimizer.getStats();

        expect(stats.moduleCount).toBe(2);
        expect(stats.states.ready).toBe(1);
        expect(stats.states.pending).toBe(1);
        expect(stats.initialized).toBe(true);
      });
    });

    describe('Reset', () => {
      it('should reset all modules', async () => {
        optimizer.register('test', async () => 'ok', { stage: InitStage.CORE });
        await optimizer.initialize(InitStage.CORE);

        optimizer.reset();

        expect(optimizer.initialized).toBe(false);
        expect(optimizer.isReady('test')).toBe(false);
        expect(optimizer.profile).toEqual([]);
      });
    });
  });

  // ============================================================
  // WarmupCache Tests
  // ============================================================
  describe('WarmupCache', () => {
    let cache;

    beforeEach(() => {
      cache = new WarmupCache();
    });

    it('should register warmup functions', () => {
      cache.register('key1', async () => 'value1');
      cache.register('key2', async () => 'value2');

      const stats = cache.getStats();
      expect(stats.registeredCount).toBe(2);
      expect(stats.cachedCount).toBe(0);
    });

    it('should support chained registration', () => {
      cache
        .register('a', async () => 1)
        .register('b', async () => 2)
        .register('c', async () => 3);

      expect(cache.getStats().registeredCount).toBe(3);
    });

    it('should warmup all registered functions', async () => {
      cache
        .register('num', async () => 42)
        .register('str', async () => 'hello')
        .register('obj', async () => ({ foo: 'bar' }));

      const { results, errors, duration } = await cache.warmup();

      expect(results.num).toBe(true);
      expect(results.str).toBe(true);
      expect(results.obj).toBe(true);
      expect(Object.keys(errors)).toHaveLength(0);
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(cache.warmedUp).toBe(true);
    });

    it('should capture warmup errors', async () => {
      cache
        .register('good', async () => 'ok')
        .register('bad', async () => {
          throw new Error('Warmup failed');
        });

      const { results, errors } = await cache.warmup();

      expect(results.good).toBe(true);
      expect(errors.bad).toBeDefined();
    });

    it('should get cached values', async () => {
      cache.register('key', async () => 'cached-value');
      await cache.warmup();

      expect(cache.get('key')).toBe('cached-value');
      expect(cache.has('key')).toBe(true);
    });

    it('should return undefined for uncached keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should clear cache', async () => {
      cache.register('key', async () => 'value');
      await cache.warmup();

      cache.clear();

      expect(cache.has('key')).toBe(false);
      expect(cache.warmedUp).toBe(false);
      expect(cache.getStats().cachedCount).toBe(0);
    });

    it('should return accurate statistics', async () => {
      cache.register('a', async () => 1).register('b', async () => 2);

      let stats = cache.getStats();
      expect(stats.registeredCount).toBe(2);
      expect(stats.cachedCount).toBe(0);
      expect(stats.warmedUp).toBe(false);

      await cache.warmup();

      stats = cache.getStats();
      expect(stats.cachedCount).toBe(2);
      expect(stats.warmedUp).toBe(true);
    });
  });

  // ============================================================
  // InitProfiler Tests
  // ============================================================
  describe('InitProfiler', () => {
    let profiler;

    beforeEach(() => {
      profiler = new InitProfiler();
    });

    it('should mark points in time', () => {
      profiler.mark('start');
      profiler.mark('end');

      expect(profiler.marks.size).toBe(2);
      expect(profiler.marks.has('start')).toBe(true);
      expect(profiler.marks.has('end')).toBe(true);
    });

    it('should measure between marks', async () => {
      profiler.mark('start');
      await new Promise(r => setTimeout(r, 10));
      profiler.mark('end');

      const measure = profiler.measure('test-duration', 'start', 'end');

      expect(measure.name).toBe('test-duration');
      expect(measure.startMark).toBe('start');
      expect(measure.endMark).toBe('end');
      expect(measure.durationMs).toBeGreaterThan(0);
      expect(measure.durationNs).toBeGreaterThan(0);
    });

    it('should return null for missing marks', () => {
      profiler.mark('start');

      const measure = profiler.measure('test', 'start', 'nonexistent');
      expect(measure).toBeNull();
    });

    it('should get all measures sorted by duration', async () => {
      profiler.mark('a');
      await new Promise(r => setTimeout(r, 5));
      profiler.mark('b');
      await new Promise(r => setTimeout(r, 15));
      profiler.mark('c');

      profiler.measure('short', 'a', 'b');
      profiler.measure('long', 'b', 'c');

      const measures = profiler.getMeasures();
      expect(measures[0].name).toBe('long');
      expect(measures[1].name).toBe('short');
    });

    it('should get summary', async () => {
      profiler.mark('s1');
      await new Promise(r => setTimeout(r, 5));
      profiler.mark('e1');
      profiler.mark('s2');
      await new Promise(r => setTimeout(r, 5));
      profiler.mark('e2');

      profiler.measure('m1', 's1', 'e1');
      profiler.measure('m2', 's2', 'e2');

      const summary = profiler.getSummary();

      expect(summary.measureCount).toBe(2);
      expect(summary.totalDurationMs).toBeGreaterThan(0);
      expect(summary.measures.length).toBe(2);
      expect(summary.slowest.length).toBeLessThanOrEqual(5);
    });

    it('should clear marks and measures', () => {
      profiler.mark('start');
      profiler.mark('end');
      profiler.measure('test', 'start', 'end');

      profiler.clear();

      expect(profiler.marks.size).toBe(0);
      expect(profiler.getMeasures()).toEqual([]);
    });
  });

  // ============================================================
  // Default Instances Tests
  // ============================================================
  describe('Default Instances', () => {
    it('should export default startup optimizer', () => {
      const {
        defaultStartupOptimizer,
      } = require('../../src/performance/startup-optimizer');
      expect(defaultStartupOptimizer).toBeInstanceOf(StartupOptimizer);
    });

    it('should export default warmup cache', () => {
      const {
        defaultWarmupCache,
      } = require('../../src/performance/startup-optimizer');
      expect(defaultWarmupCache).toBeInstanceOf(WarmupCache);
    });

    it('should export default init profiler', () => {
      const {
        defaultInitProfiler,
      } = require('../../src/performance/startup-optimizer');
      expect(defaultInitProfiler).toBeInstanceOf(InitProfiler);
    });
  });

  // ============================================================
  // Integration Tests
  // ============================================================
  describe('Integration', () => {
    it('should work together for complete startup optimization', async () => {
      const optimizer = new StartupOptimizer({ parallelLimit: 2 });
      const warmupCache = new WarmupCache();
      const profiler = new InitProfiler();

      // Register modules
      optimizer
        .register('config', async () => ({ setting: true }), {
          stage: InitStage.CORE,
          priority: 100,
        })
        .register('logger', async () => ({ log: () => {} }), {
          stage: InitStage.CORE,
          priority: 90,
        })
        .register('database', async () => ({ connected: true }), {
          stage: InitStage.EXTENDED,
          dependencies: ['config'],
        })
        .register('cache', async () => ({ ready: true }), {
          stage: InitStage.EXTENDED,
        });

      // Register warmup data
      warmupCache
        .register('userData', async () => ({ users: [] }))
        .register('settings', async () => ({ theme: 'dark' }));

      // Profile startup
      profiler.mark('startup-begin');

      // Initialize core
      profiler.mark('core-begin');
      await optimizer.initialize(InitStage.CORE);
      profiler.mark('core-end');

      // Warmup cache in parallel
      profiler.mark('warmup-begin');
      await warmupCache.warmup();
      profiler.mark('warmup-end');

      // Initialize extended
      profiler.mark('extended-begin');
      await optimizer.initialize(InitStage.EXTENDED);
      profiler.mark('extended-end');

      profiler.mark('startup-end');

      // Create measures
      profiler.measure('core-init', 'core-begin', 'core-end');
      profiler.measure('cache-warmup', 'warmup-begin', 'warmup-end');
      profiler.measure('extended-init', 'extended-begin', 'extended-end');
      profiler.measure('total-startup', 'startup-begin', 'startup-end');

      // Verify results
      expect(optimizer.isReady('config')).toBe(true);
      expect(optimizer.isReady('database')).toBe(true);
      expect(warmupCache.has('userData')).toBe(true);
      expect(warmupCache.has('settings')).toBe(true);

      const summary = profiler.getSummary();
      expect(summary.measureCount).toBe(4);
      expect(summary.totalDurationMs).toBeGreaterThan(0);
    });
  });
});
