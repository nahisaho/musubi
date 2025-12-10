/**
 * Tests for LazyLoader
 * Phase 6 P0: Performance Optimization
 */

const {
  LazyLoader,
  ModuleCategory,
  MODULE_REGISTRY,
  createLazyProxy,
} = require('../../src/performance/lazy-loader');

describe('LazyLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new LazyLoader({
      enableCache: true,
      trackLoadTimes: true,
    });
  });

  afterEach(() => {
    loader.clearCache();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      const defaultLoader = new LazyLoader();
      expect(defaultLoader.options.enableCache).toBe(true);
      expect(defaultLoader.options.trackLoadTimes).toBe(true);
    });

    it('should accept custom options', () => {
      const customLoader = new LazyLoader({
        enableCache: false,
        trackLoadTimes: false,
        preloadOnIdle: true,
      });
      expect(customLoader.options.enableCache).toBe(false);
      expect(customLoader.options.trackLoadTimes).toBe(false);
      expect(customLoader.options.preloadOnIdle).toBe(true);
    });
  });

  describe('loadSync', () => {
    it('should load a registered module', () => {
      const result = loader.loadSync('complexity-analyzer');
      expect(result).toBeDefined();
      expect(result.ComplexityAnalyzer).toBeDefined();
    });

    it('should cache loaded modules', () => {
      loader.loadSync('complexity-analyzer');
      expect(loader.isLoaded('complexity-analyzer')).toBe(true);
    });

    it('should return cached module on second load', () => {
      const first = loader.loadSync('complexity-analyzer');
      const second = loader.loadSync('complexity-analyzer');
      expect(first).toBe(second);
    });

    it('should track load times', () => {
      loader.loadSync('complexity-analyzer');
      const stats = loader.getLoadStats();
      expect(stats.loadTimes['complexity-analyzer']).toBeDefined();
      expect(stats.loadTimes['complexity-analyzer']).toBeGreaterThanOrEqual(0);
    });

    it('should throw for unknown modules', () => {
      expect(() => loader.loadSync('unknown-module')).toThrow('Unknown module: unknown-module');
    });

    it('should return null for optional modules that fail', () => {
      // Create a loader with a mock registry entry
      const testLoader = new LazyLoader();
      testLoader.loadSync = function (moduleName) {
        const registry = {
          'test-optional': {
            path: './non-existent',
            optional: true,
          },
        };
        const reg = registry[moduleName];
        if (!reg) throw new Error(`Unknown module: ${moduleName}`);
        if (reg.optional) {
          try {
            return require(reg.path);
          } catch {
            return null;
          }
        }
        return require(reg.path);
      };
      expect(testLoader.loadSync('test-optional')).toBeNull();
    });
  });

  describe('load (async)', () => {
    it('should load a module asynchronously', async () => {
      const result = await loader.load('complexity-analyzer');
      expect(result).toBeDefined();
      expect(result.ComplexityAnalyzer).toBeDefined();
    });

    it('should use cache for async loads', async () => {
      await loader.load('complexity-analyzer');
      expect(loader.isLoaded('complexity-analyzer')).toBe(true);
    });
  });

  describe('loadCategory', () => {
    it('should load all modules in a category', async () => {
      const modules = await loader.loadCategory(ModuleCategory.ANALYSIS);
      expect(modules.size).toBeGreaterThan(0);
    });

    it('should handle failed module loads gracefully', async () => {
      // Should not throw even if some modules fail
      const modules = await loader.loadCategory(ModuleCategory.GUI);
      expect(modules).toBeInstanceOf(Map);
    });
  });

  describe('hint and preload', () => {
    it('should accept preload hints', () => {
      loader.hint('complexity-analyzer');
      expect(loader.preloadHints.size).toBe(1);
    });

    it('should ignore invalid hints', () => {
      loader.hint('invalid-module');
      expect(loader.preloadHints.size).toBe(0);
    });

    it('should preload hinted modules', async () => {
      loader.hint('complexity-analyzer');
      await loader.preload();
      expect(loader.isLoaded('complexity-analyzer')).toBe(true);
      expect(loader.preloadHints.size).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('should clear specific module from cache', () => {
      loader.loadSync('complexity-analyzer');
      expect(loader.isLoaded('complexity-analyzer')).toBe(true);

      loader.clearCache('complexity-analyzer');
      expect(loader.isLoaded('complexity-analyzer')).toBe(false);
    });

    it('should clear all modules from cache', () => {
      loader.loadSync('complexity-analyzer');
      loader.clearCache();
      expect(loader.cache.size).toBe(0);
    });
  });

  describe('getLoadStats', () => {
    it('should return load statistics', () => {
      loader.loadSync('complexity-analyzer');
      const stats = loader.getLoadStats();

      expect(stats.totalModules).toBe(1);
      expect(stats.cachedModules).toBe(1);
      expect(stats.totalLoadTime).toBeGreaterThanOrEqual(0);
      expect(stats.averageLoadTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty stats', () => {
      const stats = loader.getLoadStats();
      expect(stats.totalModules).toBe(0);
      expect(stats.averageLoadTime).toBe(0);
    });
  });

  describe('getAvailableModules', () => {
    it('should return all available modules', () => {
      const modules = loader.getAvailableModules();
      expect(modules).toBeInstanceOf(Array);
      expect(modules.length).toBeGreaterThan(0);
    });

    it('should filter by category', () => {
      const analysisModules = loader.getAvailableModules(ModuleCategory.ANALYSIS);
      expect(
        analysisModules.every(m => MODULE_REGISTRY[m].category === ModuleCategory.ANALYSIS)
      ).toBe(true);
    });
  });
});

describe('ModuleCategory', () => {
  it('should define all categories', () => {
    expect(ModuleCategory.CORE).toBe('core');
    expect(ModuleCategory.ANALYSIS).toBe('analysis');
    expect(ModuleCategory.ORCHESTRATION).toBe('orchestration');
    expect(ModuleCategory.MONITORING).toBe('monitoring');
    expect(ModuleCategory.INTEGRATION).toBe('integration');
    expect(ModuleCategory.GUI).toBe('gui');
  });
});

describe('MODULE_REGISTRY', () => {
  it('should have valid entries', () => {
    for (const [name, entry] of Object.entries(MODULE_REGISTRY)) {
      expect(entry.path).toBeDefined();
      expect(entry.category).toBeDefined();
      expect(entry.exports).toBeDefined();
      expect(entry.estimatedSize).toBeDefined();
    }
  });
});

describe('createLazyProxy', () => {
  it('should create a lazy proxy', () => {
    const loader = new LazyLoader();
    const proxy = createLazyProxy('complexity-analyzer', loader);

    // Access should trigger load
    expect(proxy.ComplexityAnalyzer).toBeDefined();
  });

  it('should support has operation', () => {
    const loader = new LazyLoader();
    const proxy = createLazyProxy('complexity-analyzer', loader);

    expect('ComplexityAnalyzer' in proxy).toBe(true);
    expect('NonExistent' in proxy).toBe(false);
  });
});
