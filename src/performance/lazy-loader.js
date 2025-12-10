/**
 * MUSUBI Lazy Loader
 *
 * On-demand module loading for performance optimization.
 * Phase 6 P0: Performance Optimization
 *
 * Features:
 * - Dynamic imports for large modules
 * - Module preloading hints
 * - Load time tracking
 * - Memory-efficient loading
 */

/**
 * Module categories for lazy loading
 */
const ModuleCategory = {
  CORE: 'core', // Always loaded
  ANALYSIS: 'analysis', // Loaded on analysis operations
  ORCHESTRATION: 'orchestration', // Loaded on orchestration
  MONITORING: 'monitoring', // Loaded on monitoring
  INTEGRATION: 'integration', // Loaded on external integration
  GUI: 'gui', // Loaded on GUI start
};

/**
 * Module registry for lazy loading
 */
const MODULE_REGISTRY = {
  // Analysis modules (heavy)
  'large-project-analyzer': {
    path: '../analyzers/large-project-analyzer',
    category: ModuleCategory.ANALYSIS,
    exports: ['LargeProjectAnalyzer', 'THRESHOLDS', 'CHUNK_SIZE'],
    estimatedSize: 'large',
  },
  'complexity-analyzer': {
    path: '../analyzers/complexity-analyzer',
    category: ModuleCategory.ANALYSIS,
    exports: ['ComplexityAnalyzer', 'THRESHOLDS'],
    estimatedSize: 'medium',
  },
  'rust-migration-generator': {
    path: '../generators/rust-migration-generator',
    category: ModuleCategory.ANALYSIS,
    exports: ['RustMigrationGenerator', 'UNSAFE_PATTERNS', 'SECURITY_COMPONENTS'],
    estimatedSize: 'large',
  },

  // Orchestration modules
  'replanning-engine': {
    path: '../orchestration/replanning/replanning-engine',
    category: ModuleCategory.ORCHESTRATION,
    exports: ['ReplanningEngine'],
    estimatedSize: 'large',
  },
  'workflow-executor': {
    path: '../orchestration/workflow-executor',
    category: ModuleCategory.ORCHESTRATION,
    exports: ['WorkflowExecutor'],
    estimatedSize: 'medium',
  },

  // Monitoring modules
  'incident-manager': {
    path: '../monitoring/incident-manager',
    category: ModuleCategory.MONITORING,
    exports: ['IncidentManager'],
    estimatedSize: 'large',
  },
  'quality-dashboard': {
    path: '../monitoring/quality-dashboard',
    category: ModuleCategory.MONITORING,
    exports: ['QualityDashboard'],
    estimatedSize: 'medium',
  },

  // Integration modules
  'codegraph-mcp': {
    path: '../integrations/codegraph-mcp',
    category: ModuleCategory.INTEGRATION,
    exports: ['CodeGraphMCP'],
    estimatedSize: 'large',
    optional: true,
  },

  // GUI modules
  'gui-server': {
    path: '../gui/server',
    category: ModuleCategory.GUI,
    exports: ['default'],
    estimatedSize: 'large',
  },
};

/**
 * LazyLoader class for on-demand module loading
 */
class LazyLoader {
  constructor(options = {}) {
    this.cache = new Map();
    this.loadTimes = new Map();
    this.preloadHints = new Set();
    this.options = {
      enableCache: options.enableCache !== false,
      trackLoadTimes: options.trackLoadTimes !== false,
      preloadOnIdle: options.preloadOnIdle || false,
      ...options,
    };
  }

  /**
   * Load a module by name
   * @param {string} moduleName - Name of the module to load
   * @returns {Promise<Object>} - Loaded module exports
   */
  async load(moduleName) {
    // Check cache first
    if (this.options.enableCache && this.cache.has(moduleName)) {
      return this.cache.get(moduleName);
    }

    const registry = MODULE_REGISTRY[moduleName];
    if (!registry) {
      throw new Error(`Unknown module: ${moduleName}`);
    }

    const startTime = Date.now();

    try {
      // Use dynamic import for ES modules or require for CommonJS
      const loaded = require(registry.path);

      const loadTime = Date.now() - startTime;

      if (this.options.trackLoadTimes) {
        this.loadTimes.set(moduleName, loadTime);
      }

      if (this.options.enableCache) {
        this.cache.set(moduleName, loaded);
      }

      return loaded;
    } catch (error) {
      if (registry.optional) {
        return null;
      }
      throw new Error(`Failed to load module ${moduleName}: ${error.message}`);
    }
  }

  /**
   * Synchronous load for compatibility
   * @param {string} moduleName - Name of the module to load
   * @returns {Object} - Loaded module exports
   */
  loadSync(moduleName) {
    // Check cache first
    if (this.options.enableCache && this.cache.has(moduleName)) {
      return this.cache.get(moduleName);
    }

    const registry = MODULE_REGISTRY[moduleName];
    if (!registry) {
      throw new Error(`Unknown module: ${moduleName}`);
    }

    const startTime = Date.now();

    try {
      const loaded = require(registry.path);

      const loadTime = Date.now() - startTime;

      if (this.options.trackLoadTimes) {
        this.loadTimes.set(moduleName, loadTime);
      }

      if (this.options.enableCache) {
        this.cache.set(moduleName, loaded);
      }

      return loaded;
    } catch (error) {
      if (registry.optional) {
        return null;
      }
      throw new Error(`Failed to load module ${moduleName}: ${error.message}`);
    }
  }

  /**
   * Load all modules in a category
   * @param {string} category - Module category
   * @returns {Promise<Map<string, Object>>} - Map of loaded modules
   */
  async loadCategory(category) {
    const modules = new Map();

    for (const [name, registry] of Object.entries(MODULE_REGISTRY)) {
      if (registry.category === category) {
        try {
          const loaded = await this.load(name);
          if (loaded) {
            modules.set(name, loaded);
          }
        } catch (error) {
          console.warn(`Failed to load ${name}: ${error.message}`);
        }
      }
    }

    return modules;
  }

  /**
   * Add preload hint for a module
   * @param {string} moduleName - Name of the module to preload
   */
  hint(moduleName) {
    if (MODULE_REGISTRY[moduleName]) {
      this.preloadHints.add(moduleName);
    }
  }

  /**
   * Preload hinted modules (call during idle time)
   * @returns {Promise<void>}
   */
  async preload() {
    const promises = [];

    for (const moduleName of this.preloadHints) {
      if (!this.cache.has(moduleName)) {
        promises.push(
          this.load(moduleName).catch(err => {
            console.warn(`Preload failed for ${moduleName}: ${err.message}`);
          })
        );
      }
    }

    await Promise.all(promises);
    this.preloadHints.clear();
  }

  /**
   * Clear the module cache
   * @param {string} [moduleName] - Optional specific module to clear
   */
  clearCache(moduleName) {
    if (moduleName) {
      this.cache.delete(moduleName);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get load time statistics
   * @returns {Object} - Load time statistics
   */
  getLoadStats() {
    const stats = {
      totalModules: this.loadTimes.size,
      cachedModules: this.cache.size,
      loadTimes: Object.fromEntries(this.loadTimes),
      averageLoadTime: 0,
      totalLoadTime: 0,
    };

    if (this.loadTimes.size > 0) {
      const times = Array.from(this.loadTimes.values());
      stats.totalLoadTime = times.reduce((a, b) => a + b, 0);
      stats.averageLoadTime = Math.round(stats.totalLoadTime / times.length);
    }

    return stats;
  }

  /**
   * Check if a module is loaded
   * @param {string} moduleName - Name of the module
   * @returns {boolean} - True if loaded
   */
  isLoaded(moduleName) {
    return this.cache.has(moduleName);
  }

  /**
   * Get list of available modules
   * @param {string} [category] - Optional category filter
   * @returns {string[]} - List of module names
   */
  getAvailableModules(category) {
    if (category) {
      return Object.entries(MODULE_REGISTRY)
        .filter(([, reg]) => reg.category === category)
        .map(([name]) => name);
    }
    return Object.keys(MODULE_REGISTRY);
  }
}

/**
 * Create a lazy proxy for a module
 * @param {string} moduleName - Name of the module
 * @param {LazyLoader} loader - LazyLoader instance
 * @returns {Proxy} - Lazy proxy object
 */
function createLazyProxy(moduleName, loader) {
  let module = null;

  return new Proxy(
    {},
    {
      get(target, prop) {
        if (!module) {
          module = loader.loadSync(moduleName);
        }
        return module ? module[prop] : undefined;
      },
      has(target, prop) {
        if (!module) {
          module = loader.loadSync(moduleName);
        }
        return module ? prop in module : false;
      },
    }
  );
}

// Singleton instance
const defaultLoader = new LazyLoader();

module.exports = {
  LazyLoader,
  ModuleCategory,
  MODULE_REGISTRY,
  createLazyProxy,
  defaultLoader,
};
