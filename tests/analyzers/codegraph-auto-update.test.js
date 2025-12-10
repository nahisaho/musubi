/**
 * CodeGraph Auto-Update Tests
 * 
 * @trace REQ-P4-001
 * @requirement REQ-P4-001 Repository Map Generation
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  CodeGraphAutoUpdate,
  createCodeGraphAutoUpdate,
  TRIGGER,
  TARGET
} = require('../../src/analyzers/codegraph-auto-update');

describe('CodeGraphAutoUpdate', () => {
  let testDir;
  let autoUpdate;
  
  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `musubi-codegraph-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create test file structure
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.mcp'), { recursive: true });
    
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({ 
        name: 'test-project', 
        version: '1.0.0',
        dependencies: { lodash: '^4.17.0' },
        devDependencies: { jest: '^29.0.0' }
      })
    );
    
    fs.writeFileSync(
      path.join(testDir, 'src', 'index.js'),
      `class TestClass {
        constructor() {}
      }
      
      function testFunction() {
        return 42;
      }
      
      const helper = () => {};
      
      module.exports = { TestClass, testFunction, helper };`
    );
    
    fs.writeFileSync(
      path.join(testDir, '.mcp', 'config.json'),
      JSON.stringify({
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['test-server.js']
          }
        }
      })
    );
    
    autoUpdate = new CodeGraphAutoUpdate({
      cacheDir: '.musubi/cache',
      watchFiles: false,  // Disable for tests
      watchMcp: false,
      debounceMs: 10
    });
  });
  
  afterEach(async () => {
    if (autoUpdate) {
      autoUpdate.stop();
    }
    
    // Cleanup
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });
  
  describe('constructor', () => {
    it('should create instance with default options', () => {
      const instance = new CodeGraphAutoUpdate();
      
      expect(instance.cacheDir).toBe('.musubi/cache');
      expect(instance.debounceMs).toBe(500);
      expect(instance.maxCacheAge).toBe(3600000);
    });
    
    it('should accept custom options', () => {
      const instance = new CodeGraphAutoUpdate({
        cacheDir: 'custom/cache',
        debounceMs: 1000,
        maxCacheAge: 7200000
      });
      
      expect(instance.cacheDir).toBe('custom/cache');
      expect(instance.debounceMs).toBe(1000);
      expect(instance.maxCacheAge).toBe(7200000);
    });
    
    it('should initialize empty state', () => {
      const instance = new CodeGraphAutoUpdate();
      
      expect(instance.fileHashes.size).toBe(0);
      expect(instance.cache.size).toBe(0);
      expect(instance.updateHistory).toEqual([]);
    });
  });
  
  describe('initialize()', () => {
    it('should initialize with project root', async () => {
      const events = [];
      autoUpdate.on('initialized', (e) => events.push(e));
      
      await autoUpdate.initialize(testDir);
      
      expect(events.length).toBe(1);
      expect(events[0].projectRoot).toBe(testDir);
    });
    
    it('should create cache directory', async () => {
      await autoUpdate.initialize(testDir);
      
      const cacheDir = path.join(testDir, '.musubi/cache');
      expect(fs.existsSync(cacheDir)).toBe(true);
    });
    
    it('should perform initial scan on startup', async () => {
      const events = [];
      autoUpdate.on('update-complete', (e) => events.push(e));
      
      await autoUpdate.initialize(testDir);
      
      // Should have updates for repository-map and mcp-registry
      expect(events.length).toBeGreaterThanOrEqual(2);
    });
  });
  
  describe('triggerUpdate()', () => {
    beforeEach(async () => {
      await autoUpdate.initialize(testDir);
    });
    
    it('should update repository map', async () => {
      const results = await autoUpdate.triggerUpdate(TRIGGER.MANUAL, {
        targets: [TARGET.REPOSITORY_MAP]
      });
      
      expect(results.length).toBe(1);
      expect(results[0].target).toBe(TARGET.REPOSITORY_MAP);
      expect(results[0].success).toBe(true);
    });
    
    it('should update symbol index', async () => {
      const results = await autoUpdate.triggerUpdate(TRIGGER.MANUAL, {
        targets: [TARGET.SYMBOL_INDEX]
      });
      
      expect(results.length).toBe(1);
      expect(results[0].target).toBe(TARGET.SYMBOL_INDEX);
      expect(results[0].success).toBe(true);
    });
    
    it('should update dependency graph', async () => {
      const results = await autoUpdate.triggerUpdate(TRIGGER.MANUAL, {
        targets: [TARGET.DEPENDENCY_GRAPH]
      });
      
      expect(results.length).toBe(1);
      expect(results[0].target).toBe(TARGET.DEPENDENCY_GRAPH);
      expect(results[0].success).toBe(true);
      
      const cache = autoUpdate.getCache(TARGET.DEPENDENCY_GRAPH);
      expect(cache.dependencies).toContain('lodash');
      expect(cache.devDependencies).toContain('jest');
    });
    
    it('should update MCP registry', async () => {
      const results = await autoUpdate.triggerUpdate(TRIGGER.MANUAL, {
        targets: [TARGET.MCP_REGISTRY]
      });
      
      expect(results.length).toBe(1);
      expect(results[0].target).toBe(TARGET.MCP_REGISTRY);
      expect(results[0].success).toBe(true);
      
      const servers = autoUpdate.getMcpServers();
      expect(servers.length).toBe(1);
      expect(servers[0].name).toBe('test-server');
    });
    
    it('should emit events during update', async () => {
      const events = {
        start: [],
        complete: [],
        batchComplete: []
      };
      
      autoUpdate.on('update-start', (e) => events.start.push(e));
      autoUpdate.on('update-complete', (e) => events.complete.push(e));
      autoUpdate.on('update-batch-complete', (e) => events.batchComplete.push(e));
      
      await autoUpdate.triggerUpdate(TRIGGER.MANUAL, {
        targets: [TARGET.REPOSITORY_MAP]
      });
      
      expect(events.start.length).toBe(1);
      expect(events.complete.length).toBe(1);
      expect(events.batchComplete.length).toBe(1);
    });
    
    it('should record update history', async () => {
      await autoUpdate.triggerUpdate(TRIGGER.MANUAL, {
        targets: [TARGET.REPOSITORY_MAP]
      });
      
      expect(autoUpdate.updateHistory.length).toBeGreaterThan(0);
      
      const lastUpdate = autoUpdate.updateHistory[autoUpdate.updateHistory.length - 1];
      expect(lastUpdate.trigger).toBe(TRIGGER.MANUAL);
      expect(lastUpdate.target).toBe(TARGET.REPOSITORY_MAP);
    });
  });
  
  describe('TRIGGER types', () => {
    beforeEach(async () => {
      await autoUpdate.initialize(testDir);
    });
    
    it('should select correct targets for FILE_CHANGE', async () => {
      const results = await autoUpdate.triggerUpdate(TRIGGER.FILE_CHANGE);
      
      const targets = results.map(r => r.target);
      expect(targets).toContain(TARGET.REPOSITORY_MAP);
      expect(targets).toContain(TARGET.SYMBOL_INDEX);
    });
    
    it('should select correct targets for GIT_COMMIT', async () => {
      const results = await autoUpdate.triggerUpdate(TRIGGER.GIT_COMMIT);
      
      const targets = results.map(r => r.target);
      expect(targets).toContain(TARGET.REPOSITORY_MAP);
      expect(targets).toContain(TARGET.DEPENDENCY_GRAPH);
    });
    
    it('should select correct targets for MCP_CONFIG_CHANGE', async () => {
      const results = await autoUpdate.triggerUpdate(TRIGGER.MCP_CONFIG_CHANGE);
      
      const targets = results.map(r => r.target);
      expect(targets).toContain(TARGET.MCP_REGISTRY);
      expect(targets).not.toContain(TARGET.REPOSITORY_MAP);
    });
    
    it('should select correct targets for DEPENDENCY_INSTALL', async () => {
      const results = await autoUpdate.triggerUpdate(TRIGGER.DEPENDENCY_INSTALL);
      
      const targets = results.map(r => r.target);
      expect(targets).toContain(TARGET.DEPENDENCY_GRAPH);
      expect(targets).toContain(TARGET.SYMBOL_INDEX);
    });
  });
  
  describe('incremental updates', () => {
    beforeEach(async () => {
      await autoUpdate.initialize(testDir);
    });
    
    it('should detect added files', async () => {
      // Add a new file
      fs.writeFileSync(
        path.join(testDir, 'src', 'new-file.js'),
        'function newFunc() {}'
      );
      
      const results = await autoUpdate.triggerUpdate(TRIGGER.FILE_CHANGE);
      
      expect(results[0].success).toBe(true);
    });
    
    it('should detect modified files', async () => {
      // Modify existing file
      fs.writeFileSync(
        path.join(testDir, 'src', 'index.js'),
        'function modifiedFunc() { return "modified"; }'
      );
      
      const results = await autoUpdate.triggerUpdate(TRIGGER.FILE_CHANGE);
      
      expect(results[0].success).toBe(true);
    });
    
    it('should detect deleted files', async () => {
      // Create and then delete a file
      const tempFile = path.join(testDir, 'src', 'temp.js');
      fs.writeFileSync(tempFile, 'const temp = 1;');
      
      await autoUpdate.triggerUpdate(TRIGGER.FILE_CHANGE);
      
      fs.unlinkSync(tempFile);
      
      const results = await autoUpdate.triggerUpdate(TRIGGER.FILE_CHANGE);
      
      expect(results[0].success).toBe(true);
    });
  });
  
  describe('cache management', () => {
    beforeEach(async () => {
      await autoUpdate.initialize(testDir);
    });
    
    it('should save cache to disk', async () => {
      await autoUpdate.triggerUpdate(TRIGGER.MANUAL, {
        targets: [TARGET.REPOSITORY_MAP]
      });
      
      const cacheFile = path.join(testDir, '.musubi/cache', 'codegraph-cache.json');
      expect(fs.existsSync(cacheFile)).toBe(true);
    });
    
    it('should load cache from disk', async () => {
      await autoUpdate.triggerUpdate(TRIGGER.MANUAL, {
        targets: [TARGET.MCP_REGISTRY]
      });
      
      // Create new instance and load cache
      const newInstance = new CodeGraphAutoUpdate({
        watchFiles: false,
        watchMcp: false
      });
      
      await newInstance.initialize(testDir);
      
      const servers = newInstance.getMcpServers();
      expect(servers.length).toBe(1);
      
      newInstance.stop();
    });
    
    it('should invalidate old cache entries', async () => {
      // Set very short cache age
      autoUpdate.maxCacheAge = 1;
      
      await autoUpdate.triggerUpdate(TRIGGER.MANUAL, {
        targets: [TARGET.REPOSITORY_MAP]
      });
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const results = await autoUpdate.triggerUpdate(TRIGGER.SCHEDULED);
      
      const cacheUpdate = results.find(r => r.target === TARGET.CONTEXT_CACHE);
      expect(cacheUpdate).toBeDefined();
    });
  });
  
  describe('getStatistics()', () => {
    beforeEach(async () => {
      await autoUpdate.initialize(testDir);
    });
    
    it('should return statistics', async () => {
      await autoUpdate.triggerUpdate(TRIGGER.MANUAL, {
        targets: [TARGET.REPOSITORY_MAP]
      });
      
      const stats = autoUpdate.getStatistics();
      
      expect(stats.totalUpdates).toBeGreaterThan(0);
      expect(stats.successRate).toBeDefined();
      expect(stats.averageDuration).toBeDefined();
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
      expect(stats.filesTracked).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('forceRefresh()', () => {
    beforeEach(async () => {
      await autoUpdate.initialize(testDir);
    });
    
    it('should clear all caches and refresh', async () => {
      // First update
      await autoUpdate.triggerUpdate(TRIGGER.MANUAL, {
        targets: [TARGET.REPOSITORY_MAP]
      });
      
      const initialFileCount = autoUpdate.fileHashes.size;
      
      // Force refresh
      const results = await autoUpdate.forceRefresh();
      
      expect(results.length).toBe(Object.values(TARGET).length);
      expect(results.every(r => r.success)).toBe(true);
    });
  });
  
  describe('stop()', () => {
    it('should stop all watchers', async () => {
      const instance = new CodeGraphAutoUpdate({
        watchFiles: true,
        watchMcp: true
      });
      
      await instance.initialize(testDir);
      
      const events = [];
      instance.on('stopped', () => events.push('stopped'));
      
      instance.stop();
      
      expect(events).toContain('stopped');
      expect(instance.fileWatcher).toBeNull();
      expect(instance.mcpWatcher).toBeNull();
    });
  });
  
  describe('ignore patterns', () => {
    it('should ignore node_modules', async () => {
      fs.mkdirSync(path.join(testDir, 'node_modules', 'test-pkg'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'node_modules', 'test-pkg', 'index.js'),
        'module.exports = {};'
      );
      
      await autoUpdate.initialize(testDir);
      
      const cache = autoUpdate.getCache(TARGET.REPOSITORY_MAP);
      const files = cache?.files || [];
      
      const nodeModulesFiles = files.filter(([path]) => path.includes('node_modules'));
      expect(nodeModulesFiles.length).toBe(0);
    });
    
    it('should ignore .git directory', async () => {
      fs.mkdirSync(path.join(testDir, '.git', 'objects'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, '.git', 'config'),
        '[core]\n  bare = false'
      );
      
      await autoUpdate.initialize(testDir);
      
      const cache = autoUpdate.getCache(TARGET.REPOSITORY_MAP);
      const files = cache?.files || [];
      
      const gitFiles = files.filter(([path]) => path.includes('.git'));
      expect(gitFiles.length).toBe(0);
    });
  });
});

describe('createCodeGraphAutoUpdate()', () => {
  it('should create instance', () => {
    const instance = createCodeGraphAutoUpdate();
    
    expect(instance).toBeInstanceOf(CodeGraphAutoUpdate);
  });
  
  it('should pass options', () => {
    const instance = createCodeGraphAutoUpdate({
      cacheDir: 'custom/path'
    });
    
    expect(instance.cacheDir).toBe('custom/path');
  });
});

describe('TRIGGER enum', () => {
  it('should have all trigger types', () => {
    expect(TRIGGER.FILE_CHANGE).toBe('file-change');
    expect(TRIGGER.GIT_COMMIT).toBe('git-commit');
    expect(TRIGGER.BRANCH_SWITCH).toBe('branch-switch');
    expect(TRIGGER.DEPENDENCY_INSTALL).toBe('dependency-install');
    expect(TRIGGER.MCP_CONFIG_CHANGE).toBe('mcp-config-change');
    expect(TRIGGER.MANUAL).toBe('manual');
    expect(TRIGGER.SCHEDULED).toBe('scheduled');
    expect(TRIGGER.STARTUP).toBe('startup');
  });
});

describe('TARGET enum', () => {
  it('should have all target types', () => {
    expect(TARGET.REPOSITORY_MAP).toBe('repository-map');
    expect(TARGET.SYMBOL_INDEX).toBe('symbol-index');
    expect(TARGET.DEPENDENCY_GRAPH).toBe('dependency-graph');
    expect(TARGET.MCP_REGISTRY).toBe('mcp-registry');
    expect(TARGET.CONTEXT_CACHE).toBe('context-cache');
  });
});
