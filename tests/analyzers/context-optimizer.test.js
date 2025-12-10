/**
 * Context Optimizer Tests
 * 
 * Part of MUSUBI v4.1.0 - Codebase Intelligence
 * @trace REQ-P4-003
 * @requirement REQ-P4-003 Context Optimization
 */

const {
  ContextOptimizer,
  createContextOptimizer,
  optimizeContext,
  TASK_WEIGHTS,
  CHARS_PER_TOKEN
} = require('../../src/analyzers/context-optimizer');

const path = require('path');
const fs = require('fs');
const os = require('os');

describe('ContextOptimizer', () => {
  let testDir;
  
  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `musubi-ctx-${Date.now()}`);
    await fs.promises.mkdir(testDir, { recursive: true });
    
    // Create test structure
    await fs.promises.mkdir(path.join(testDir, 'src'), { recursive: true });
    await fs.promises.mkdir(path.join(testDir, 'tests'), { recursive: true });
    
    await fs.promises.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0' })
    );
    
    await fs.promises.writeFile(
      path.join(testDir, 'src', 'index.js'),
      `const utils = require('./utils');
function main() { return utils.helper(); }
module.exports = { main };`
    );
    
    await fs.promises.writeFile(
      path.join(testDir, 'src', 'utils.js'),
      `function helper() { return 'help'; }
module.exports = { helper };`
    );
    
    await fs.promises.writeFile(
      path.join(testDir, 'tests', 'index.test.js'),
      `describe('main', () => { it('works', () => {}); });`
    );
  });
  
  afterEach(async () => {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });
  
  describe('constructor', () => {
    it('should create with default options', () => {
      const optimizer = new ContextOptimizer();
      
      expect(optimizer.rootPath).toBe(process.cwd());
      expect(optimizer.maxTokens).toBe(8000);
      expect(optimizer.maxFiles).toBe(20);
      expect(optimizer.useAST).toBe(true);
    });
    
    it('should accept custom options', () => {
      const optimizer = new ContextOptimizer({
        rootPath: '/custom/path',
        maxTokens: 4000,
        maxFiles: 10,
        useAST: false,
        cache: false
      });
      
      expect(optimizer.rootPath).toBe('/custom/path');
      expect(optimizer.maxTokens).toBe(4000);
      expect(optimizer.maxFiles).toBe(10);
      expect(optimizer.useAST).toBe(false);
      expect(optimizer.cacheEnabled).toBe(false);
    });
  });
  
  describe('initialize', () => {
    it('should initialize repository map', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      
      await optimizer.initialize();
      
      expect(optimizer.initialized).toBe(true);
      expect(optimizer.repoMap).toBeDefined();
      expect(optimizer.repoMap.stats.totalFiles).toBeGreaterThan(0);
    });
    
    it('should emit events during initialization', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      const events = [];
      
      optimizer.on('init:start', () => events.push('start'));
      optimizer.on('init:complete', () => events.push('complete'));
      
      await optimizer.initialize();
      
      expect(events).toContain('start');
      expect(events).toContain('complete');
    });
    
    it('should only initialize once', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      
      await optimizer.initialize();
      const firstFiles = optimizer.repoMap.stats.totalFiles;
      
      await optimizer.initialize();
      
      expect(optimizer.repoMap.stats.totalFiles).toBe(firstFiles);
    });
  });
  
  describe('optimize', () => {
    it('should return optimized context', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      
      const result = await optimizer.optimize({
        query: 'main function',
        task: 'implement'
      });
      
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.formatted).toContain('Optimized Context');
      expect(result.stats).toBeDefined();
    });
    
    it('should prioritize focus files', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      
      const result = await optimizer.optimize({
        query: 'utils',
        focusFiles: ['src/utils.js'],
        task: 'explain'
      });
      
      const utilsItem = result.items.find(i => i.path.includes('utils.js'));
      expect(utilsItem).toBeDefined();
      expect(utilsItem.relevance).toBeGreaterThan(0.5);
    });
    
    it('should respect token budget', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      
      const result = await optimizer.optimize({
        query: 'test',
        maxTokens: 500
      });
      
      expect(result.totalTokens).toBeLessThanOrEqual(500 + 100); // Allow some overhead
    });
    
    it('should include tests when requested', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      
      const result = await optimizer.optimize({
        query: 'main',
        includeTests: true
      });
      
      const testItem = result.items.find(i => i.path.includes('test'));
      expect(testItem).toBeDefined();
    });
    
    it('should apply task-specific weights', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      
      const debugResult = await optimizer.optimize({
        query: 'error',
        task: 'debug'
      });
      
      const reviewResult = await optimizer.optimize({
        query: 'code',
        task: 'review'
      });
      
      // Both should produce valid results with different weightings
      expect(debugResult.items.length).toBeGreaterThan(0);
      expect(reviewResult.items.length).toBeGreaterThan(0);
    });
  });
  
  describe('extractKeywords', () => {
    it('should extract meaningful keywords', () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      
      // Access private method through instance
      const keywords = optimizer.extractKeywords('implement user authentication with JWT');
      
      expect(keywords).toContain('user');
      expect(keywords).toContain('authentication');
      expect(keywords).toContain('jwt');
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('with');
    });
    
    it('should filter stop words', () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      
      const keywords = optimizer.extractKeywords('this is a test of the function');
      
      expect(keywords).not.toContain('this');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('of');
    });
  });
  
  describe('estimateTokens', () => {
    it('should estimate tokens from bytes', () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      
      const tokens = optimizer.estimateTokens(1000);
      
      expect(tokens).toBe(Math.ceil(1000 / CHARS_PER_TOKEN));
    });
  });
  
  describe('buildFocusedContext', () => {
    it('should build context for specific files', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      await optimizer.initialize();
      
      const context = await optimizer.buildFocusedContext(
        ['src/index.js'],
        { maxTokens: 2000 }
      );
      
      expect(context).toContain('src/index.js');
      expect(context).toContain('main');
    });
    
    it('should truncate to fit token limit', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      await optimizer.initialize();
      
      const context = await optimizer.buildFocusedContext(
        ['src/index.js', 'src/utils.js'],
        { maxTokens: 100 }
      );
      
      // Should handle both files or truncate
      expect(context.length).toBeGreaterThan(0);
    });
    
    it('should include AST symbols when enabled', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir, useAST: true });
      await optimizer.initialize();
      
      const context = await optimizer.buildFocusedContext(
        ['src/index.js'],
        { includeAST: true }
      );
      
      expect(context).toContain('Symbols');
    });
  });
  
  describe('getStats', () => {
    it('should return optimizer statistics', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      await optimizer.initialize();
      
      const stats = optimizer.getStats();
      
      expect(stats.initialized).toBe(true);
      expect(stats.repoFiles).toBeGreaterThan(0);
      expect(typeof stats.astCacheSize).toBe('number');
    });
    
    it('should return zeros when not initialized', () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      
      const stats = optimizer.getStats();
      
      expect(stats.initialized).toBe(false);
      expect(stats.repoFiles).toBe(0);
    });
  });
  
  describe('clearCaches', () => {
    it('should clear all caches', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      await optimizer.initialize();
      await optimizer.optimize({ query: 'test' });
      
      optimizer.clearCaches();
      
      expect(optimizer.astCache.size).toBe(0);
      expect(optimizer.relevanceCache.size).toBe(0);
    });
  });
  
  describe('reset', () => {
    it('should reset optimizer state', async () => {
      const optimizer = new ContextOptimizer({ rootPath: testDir });
      await optimizer.initialize();
      
      optimizer.reset();
      
      expect(optimizer.initialized).toBe(false);
      expect(optimizer.repoMap).toBeNull();
      expect(optimizer.astExtractor).toBeNull();
    });
  });
});

describe('createContextOptimizer', () => {
  it('should create optimizer instance', () => {
    const optimizer = createContextOptimizer();
    expect(optimizer).toBeInstanceOf(ContextOptimizer);
  });
  
  it('should pass options', () => {
    const optimizer = createContextOptimizer({ maxTokens: 5000 });
    expect(optimizer.maxTokens).toBe(5000);
  });
});

describe('optimizeContext', () => {
  it('should optimize context for path', async () => {
    const testDir = path.join(os.tmpdir(), `musubi-optctx-${Date.now()}`);
    await fs.promises.mkdir(testDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(testDir, 'test.js'),
      'function test() {}'
    );
    
    try {
      const result = await optimizeContext(testDir, {
        query: 'test function'
      });
      
      expect(result.items.length).toBeGreaterThan(0);
    } finally {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });
});

describe('Constants', () => {
  it('should have task weights', () => {
    expect(TASK_WEIGHTS.implement).toBeDefined();
    expect(TASK_WEIGHTS.debug).toBeDefined();
    expect(TASK_WEIGHTS.review).toBeDefined();
    expect(TASK_WEIGHTS.explain).toBeDefined();
    expect(TASK_WEIGHTS.refactor).toBeDefined();
  });
  
  it('should have valid weight values', () => {
    for (const [_task, weights] of Object.entries(TASK_WEIGHTS)) {
      expect(weights.entryPoints || weights.errorLocation || weights.changedFiles || weights.targetFile).toBeDefined();
      expect(weights.tests).toBeDefined();
    }
  });
  
  it('should have chars per token constant', () => {
    expect(CHARS_PER_TOKEN).toBe(4);
  });
});
