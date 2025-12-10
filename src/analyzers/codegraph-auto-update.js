/**
 * @file codegraph-auto-update.js
 * @description Automatic CodeGraph and MCP Index update engine
 * @version 1.0.0
 * 
 * Part of MUSUBI v5.1.0 - Codebase Intelligence Auto-Update
 * 
 * @trace REQ-P4-001
 * @requirement REQ-P4-001 Repository Map Generation
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const crypto = require('crypto');

/**
 * Update trigger types for CodeGraph
 * @enum {string}
 */
const TRIGGER = {
  FILE_CHANGE: 'file-change',
  GIT_COMMIT: 'git-commit',
  BRANCH_SWITCH: 'branch-switch',
  DEPENDENCY_INSTALL: 'dependency-install',
  MCP_CONFIG_CHANGE: 'mcp-config-change',
  MANUAL: 'manual',
  SCHEDULED: 'scheduled',
  STARTUP: 'startup'
};

/**
 * Update target types
 * @enum {string}
 */
const TARGET = {
  REPOSITORY_MAP: 'repository-map',
  SYMBOL_INDEX: 'symbol-index',
  DEPENDENCY_GRAPH: 'dependency-graph',
  MCP_REGISTRY: 'mcp-registry',
  CONTEXT_CACHE: 'context-cache'
};

/**
 * @typedef {Object} FileHash
 * @property {string} path - File path
 * @property {string} hash - Content hash
 * @property {number} mtime - Modification time
 * @property {number} size - File size
 */

/**
 * @typedef {Object} UpdateResult
 * @property {string} id - Update ID
 * @property {string} target - Updated target
 * @property {string} trigger - Trigger type
 * @property {boolean} success - Success status
 * @property {number} filesUpdated - Number of files updated
 * @property {number} duration - Duration in ms
 * @property {Date} timestamp - Update timestamp
 * @property {string[]} changes - List of changes
 */

/**
 * @typedef {Object} CodeGraphAutoUpdateOptions
 * @property {string} [cacheDir='.musubi/cache'] - Cache directory
 * @property {number} [debounceMs=500] - Debounce time for file changes
 * @property {boolean} [watchFiles=true] - Enable file watching
 * @property {boolean} [watchMcp=true] - Enable MCP config watching
 * @property {string[]} [ignorePatterns] - Patterns to ignore
 * @property {number} [maxCacheAge=3600000] - Max cache age in ms (1 hour)
 */

/**
 * Default ignore patterns
 */
const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.musubi/cache',
  '*.log',
  '*.tmp'
];

/**
 * CodeGraph Auto-Update Engine
 * @extends EventEmitter
 */
class CodeGraphAutoUpdate extends EventEmitter {
  /**
   * @param {CodeGraphAutoUpdateOptions} [options={}]
   */
  constructor(options = {}) {
    super();
    
    this.cacheDir = options.cacheDir || '.musubi/cache';
    this.debounceMs = options.debounceMs || 500;
    this.watchFiles = options.watchFiles !== false;
    this.watchMcp = options.watchMcp !== false;
    this.ignorePatterns = options.ignorePatterns || DEFAULT_IGNORE;
    this.maxCacheAge = options.maxCacheAge || 3600000;
    
    // State
    /** @type {Map<string, FileHash>} */
    this.fileHashes = new Map();
    
    /** @type {Map<string, Object>} */
    this.cache = new Map();
    
    /** @type {Map<string, number>} */
    this.cacheTimestamps = new Map();
    
    /** @type {Set<string>} */
    this.pendingUpdates = new Set();
    
    /** @type {UpdateResult[]} */
    this.updateHistory = [];
    
    /** @type {NodeJS.Timeout|null} */
    this.debounceTimer = null;
    
    /** @type {fs.FSWatcher|null} */
    this.fileWatcher = null;
    
    /** @type {fs.FSWatcher|null} */
    this.mcpWatcher = null;
    
    this.updateCounter = 0;
    this.isUpdating = false;
    this.projectRoot = process.cwd();
  }

  /**
   * Initialize the auto-update engine
   * @param {string} [projectRoot] - Project root directory
   * @returns {Promise<void>}
   */
  async initialize(projectRoot) {
    this.projectRoot = projectRoot || process.cwd();
    
    // Ensure cache directory exists
    const cacheFullPath = path.join(this.projectRoot, this.cacheDir);
    await this._ensureDir(cacheFullPath);
    
    // Load existing cache
    await this._loadCache();
    
    // Start watchers
    if (this.watchFiles) {
      this._startFileWatcher();
    }
    
    if (this.watchMcp) {
      this._startMcpWatcher();
    }
    
    // Initial scan
    await this.triggerUpdate(TRIGGER.STARTUP, {
      targets: [TARGET.REPOSITORY_MAP, TARGET.MCP_REGISTRY]
    });
    
    this.emit('initialized', { projectRoot: this.projectRoot });
  }

  /**
   * Trigger an update
   * @param {string} trigger - Trigger type
   * @param {Object} [context={}] - Update context
   * @returns {Promise<UpdateResult[]>}
   */
  async triggerUpdate(trigger, context = {}) {
    const targets = context.targets || this._getTargetsForTrigger(trigger);
    const results = [];
    
    this.isUpdating = true;
    this.emit('update-start', { trigger, targets });
    
    for (const target of targets) {
      const startTime = Date.now();
      const updateId = `update-${++this.updateCounter}`;
      
      try {
        const result = await this._updateTarget(target, trigger, context);
        
        const updateResult = {
          id: updateId,
          target,
          trigger,
          success: true,
          filesUpdated: result.filesUpdated || 0,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          changes: result.changes || []
        };
        
        results.push(updateResult);
        this.updateHistory.push(updateResult);
        this.emit('update-complete', updateResult);
        
      } catch (error) {
        const updateResult = {
          id: updateId,
          target,
          trigger,
          success: false,
          filesUpdated: 0,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          changes: [],
          error: error.message
        };
        
        results.push(updateResult);
        this.updateHistory.push(updateResult);
        this.emit('update-error', { ...updateResult, error });
      }
    }
    
    this.isUpdating = false;
    this.emit('update-batch-complete', { trigger, results });
    
    // Persist cache
    await this._saveCache();
    
    return results;
  }

  /**
   * Get targets for a specific trigger
   * @private
   */
  _getTargetsForTrigger(trigger) {
    switch (trigger) {
      case TRIGGER.FILE_CHANGE:
        return [TARGET.REPOSITORY_MAP, TARGET.SYMBOL_INDEX];
      
      case TRIGGER.GIT_COMMIT:
      case TRIGGER.BRANCH_SWITCH:
        return [TARGET.REPOSITORY_MAP, TARGET.SYMBOL_INDEX, TARGET.DEPENDENCY_GRAPH];
      
      case TRIGGER.DEPENDENCY_INSTALL:
        return [TARGET.DEPENDENCY_GRAPH, TARGET.SYMBOL_INDEX];
      
      case TRIGGER.MCP_CONFIG_CHANGE:
        return [TARGET.MCP_REGISTRY];
      
      case TRIGGER.STARTUP:
      case TRIGGER.MANUAL:
        return [TARGET.REPOSITORY_MAP, TARGET.SYMBOL_INDEX, TARGET.MCP_REGISTRY];
      
      case TRIGGER.SCHEDULED:
        return [TARGET.REPOSITORY_MAP, TARGET.CONTEXT_CACHE];
      
      default:
        return [TARGET.REPOSITORY_MAP];
    }
  }

  /**
   * Update a specific target
   * @private
   */
  async _updateTarget(target, trigger, context) {
    switch (target) {
      case TARGET.REPOSITORY_MAP:
        return this._updateRepositoryMap(context);
      
      case TARGET.SYMBOL_INDEX:
        return this._updateSymbolIndex(context);
      
      case TARGET.DEPENDENCY_GRAPH:
        return this._updateDependencyGraph(context);
      
      case TARGET.MCP_REGISTRY:
        return this._updateMcpRegistry(context);
      
      case TARGET.CONTEXT_CACHE:
        return this._updateContextCache(context);
      
      default:
        return { filesUpdated: 0, changes: [] };
    }
  }

  /**
   * Update repository map incrementally
   * @private
   */
  async _updateRepositoryMap(context) {
    const changes = [];
    let filesUpdated = 0;
    
    // Get changed files since last update
    const changedFiles = context.changedFiles || await this._detectChangedFiles();
    
    if (changedFiles.added.length > 0) {
      changes.push(`Added ${changedFiles.added.length} files`);
      filesUpdated += changedFiles.added.length;
    }
    
    if (changedFiles.modified.length > 0) {
      changes.push(`Modified ${changedFiles.modified.length} files`);
      filesUpdated += changedFiles.modified.length;
    }
    
    if (changedFiles.deleted.length > 0) {
      changes.push(`Deleted ${changedFiles.deleted.length} files`);
      filesUpdated += changedFiles.deleted.length;
    }
    
    // Update file hashes
    for (const file of [...changedFiles.added, ...changedFiles.modified]) {
      const hash = await this._computeFileHash(file);
      this.fileHashes.set(file, hash);
    }
    
    for (const file of changedFiles.deleted) {
      this.fileHashes.delete(file);
    }
    
    // Update cache
    this.cache.set(TARGET.REPOSITORY_MAP, {
      files: Array.from(this.fileHashes.entries()),
      updatedAt: new Date().toISOString()
    });
    this.cacheTimestamps.set(TARGET.REPOSITORY_MAP, Date.now());
    
    return { filesUpdated, changes };
  }

  /**
   * Update symbol index incrementally
   * @private
   */
  async _updateSymbolIndex(context) {
    const changes = [];
    let filesUpdated = 0;
    
    const changedFiles = context.changedFiles || await this._detectChangedFiles();
    const codeFiles = [...changedFiles.added, ...changedFiles.modified]
      .filter(f => this._isCodeFile(f));
    
    for (const file of codeFiles) {
      const symbols = await this._extractSymbols(file);
      if (symbols.length > 0) {
        changes.push(`Indexed ${symbols.length} symbols in ${path.basename(file)}`);
        filesUpdated++;
      }
    }
    
    // Remove symbols from deleted files
    for (const file of changedFiles.deleted) {
      if (this._isCodeFile(file)) {
        changes.push(`Removed symbols from ${path.basename(file)}`);
      }
    }
    
    this.cacheTimestamps.set(TARGET.SYMBOL_INDEX, Date.now());
    
    return { filesUpdated, changes };
  }

  /**
   * Update dependency graph
   * @private
   */
  async _updateDependencyGraph(context) {
    const changes = [];
    let filesUpdated = 0;
    
    // Check package.json for dependency changes
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const currentHash = await this._computeFileHash(packageJsonPath);
      const cachedHash = this.fileHashes.get(packageJsonPath);
      
      if (!cachedHash || cachedHash.hash !== currentHash.hash) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const deps = Object.keys(pkg.dependencies || {});
        const devDeps = Object.keys(pkg.devDependencies || {});
        
        changes.push(`Dependencies: ${deps.length} production, ${devDeps.length} dev`);
        filesUpdated = 1;
        
        this.cache.set(TARGET.DEPENDENCY_GRAPH, {
          dependencies: deps,
          devDependencies: devDeps,
          updatedAt: new Date().toISOString()
        });
        
        this.fileHashes.set(packageJsonPath, currentHash);
      }
    }
    
    this.cacheTimestamps.set(TARGET.DEPENDENCY_GRAPH, Date.now());
    
    return { filesUpdated, changes };
  }

  /**
   * Update MCP registry
   * @private
   */
  async _updateMcpRegistry(context) {
    const changes = [];
    let filesUpdated = 0;
    
    const mcpConfigs = [
      '.mcp/config.json',
      '.mcp.json',
      'mcp.config.json'
    ];
    
    const servers = [];
    
    for (const configFile of mcpConfigs) {
      const configPath = path.join(this.projectRoot, configFile);
      
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          const mcpServers = config.mcpServers || config.servers || {};
          
          for (const [name, serverConfig] of Object.entries(mcpServers)) {
            servers.push({ name, ...serverConfig });
          }
          
          changes.push(`Loaded ${Object.keys(mcpServers).length} servers from ${configFile}`);
          filesUpdated++;
          
        } catch (error) {
          changes.push(`Error parsing ${configFile}: ${error.message}`);
        }
      }
    }
    
    this.cache.set(TARGET.MCP_REGISTRY, {
      servers,
      updatedAt: new Date().toISOString()
    });
    this.cacheTimestamps.set(TARGET.MCP_REGISTRY, Date.now());
    
    this.emit('mcp-registry-updated', { servers });
    
    return { filesUpdated, changes };
  }

  /**
   * Update context cache
   * @private
   */
  async _updateContextCache(context) {
    const changes = [];
    let filesUpdated = 0;
    
    // Invalidate old cache entries
    const now = Date.now();
    
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.maxCacheAge) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
        changes.push(`Invalidated cache: ${key}`);
        filesUpdated++;
      }
    }
    
    return { filesUpdated, changes };
  }

  /**
   * Detect changed files since last update
   * @private
   */
  async _detectChangedFiles() {
    const added = [];
    const modified = [];
    const deleted = [];
    
    const currentFiles = await this._scanDirectory(this.projectRoot);
    const knownFiles = new Set(this.fileHashes.keys());
    
    for (const file of currentFiles) {
      if (this._shouldIgnore(file)) continue;
      
      const relativePath = path.relative(this.projectRoot, file);
      
      if (!knownFiles.has(relativePath)) {
        added.push(relativePath);
      } else {
        const currentHash = await this._computeFileHash(relativePath);
        const cachedHash = this.fileHashes.get(relativePath);
        
        if (cachedHash && cachedHash.hash !== currentHash.hash) {
          modified.push(relativePath);
        }
        
        knownFiles.delete(relativePath);
      }
    }
    
    // Remaining known files are deleted
    for (const file of knownFiles) {
      deleted.push(file);
    }
    
    return { added, modified, deleted };
  }

  /**
   * Scan directory recursively
   * @private
   */
  async _scanDirectory(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (this._shouldIgnore(fullPath)) continue;
      
      if (entry.isDirectory()) {
        await this._scanDirectory(fullPath, files);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Compute file hash
   * @private
   */
  async _computeFileHash(filePath) {
    const fullPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(this.projectRoot, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    
    const stats = fs.statSync(fullPath);
    const content = fs.readFileSync(fullPath);
    const hash = crypto.createHash('md5').update(content).digest('hex');
    
    return {
      path: filePath,
      hash,
      mtime: stats.mtimeMs,
      size: stats.size
    };
  }

  /**
   * Extract symbols from a code file
   * @private
   */
  async _extractSymbols(filePath) {
    const symbols = [];
    const fullPath = path.join(this.projectRoot, filePath);
    
    if (!fs.existsSync(fullPath)) return symbols;
    
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Extract function declarations
      const funcMatches = content.matchAll(/(?:function|const|let|var)\s+(\w+)\s*[=(]/g);
      for (const match of funcMatches) {
        symbols.push({ name: match[1], type: 'function', file: filePath });
      }
      
      // Extract class declarations
      const classMatches = content.matchAll(/class\s+(\w+)/g);
      for (const match of classMatches) {
        symbols.push({ name: match[1], type: 'class', file: filePath });
      }
      
      // Extract exports
      const exportMatches = content.matchAll(/module\.exports\s*=\s*{([^}]+)}/g);
      for (const match of exportMatches) {
        const exports = match[1].split(',').map(e => e.trim().split(':')[0].trim());
        for (const exp of exports) {
          if (exp) symbols.push({ name: exp, type: 'export', file: filePath });
        }
      }
      
    } catch (error) {
      // Ignore parse errors
    }
    
    return symbols;
  }

  /**
   * Check if file is a code file
   * @private
   */
  _isCodeFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java'].includes(ext);
  }

  /**
   * Check if path should be ignored
   * @private
   */
  _shouldIgnore(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    
    for (const pattern of this.ignorePatterns) {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        if (regex.test(relativePath)) return true;
      } else {
        if (relativePath.includes(pattern)) return true;
      }
    }
    
    return false;
  }

  /**
   * Start file watcher
   * @private
   */
  _startFileWatcher() {
    try {
      this.fileWatcher = fs.watch(
        this.projectRoot,
        { recursive: true },
        (eventType, filename) => {
          if (!filename || this._shouldIgnore(filename)) return;
          
          this.pendingUpdates.add(filename);
          this._debouncedUpdate(TRIGGER.FILE_CHANGE);
        }
      );
      
      this.emit('watcher-started', { type: 'file' });
    } catch (error) {
      this.emit('watcher-error', { type: 'file', error });
    }
  }

  /**
   * Start MCP config watcher
   * @private
   */
  _startMcpWatcher() {
    const mcpDir = path.join(this.projectRoot, '.mcp');
    
    if (!fs.existsSync(mcpDir)) {
      return;
    }
    
    try {
      this.mcpWatcher = fs.watch(mcpDir, (eventType, filename) => {
        if (filename && filename.endsWith('.json')) {
          this._debouncedUpdate(TRIGGER.MCP_CONFIG_CHANGE);
        }
      });
      
      this.emit('watcher-started', { type: 'mcp' });
    } catch (error) {
      this.emit('watcher-error', { type: 'mcp', error });
    }
  }

  /**
   * Debounced update trigger
   * @private
   */
  _debouncedUpdate(trigger) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(async () => {
      const changedFiles = Array.from(this.pendingUpdates);
      this.pendingUpdates.clear();
      
      await this.triggerUpdate(trigger, {
        changedFiles: {
          added: [],
          modified: changedFiles,
          deleted: []
        }
      });
    }, this.debounceMs);
  }

  /**
   * Load cache from disk
   * @private
   */
  async _loadCache() {
    const cacheFile = path.join(this.projectRoot, this.cacheDir, 'codegraph-cache.json');
    
    if (fs.existsSync(cacheFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        
        if (data.fileHashes) {
          this.fileHashes = new Map(data.fileHashes);
        }
        if (data.cache) {
          this.cache = new Map(Object.entries(data.cache));
        }
        if (data.cacheTimestamps) {
          this.cacheTimestamps = new Map(Object.entries(data.cacheTimestamps));
        }
        
        this.emit('cache-loaded', { entries: this.cache.size });
      } catch (error) {
        this.emit('cache-error', { action: 'load', error });
      }
    }
  }

  /**
   * Save cache to disk
   * @private
   */
  async _saveCache() {
    const cacheFile = path.join(this.projectRoot, this.cacheDir, 'codegraph-cache.json');
    
    try {
      await this._ensureDir(path.dirname(cacheFile));
      
      const data = {
        fileHashes: Array.from(this.fileHashes.entries()),
        cache: Object.fromEntries(this.cache),
        cacheTimestamps: Object.fromEntries(this.cacheTimestamps),
        savedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
      this.emit('cache-saved', { entries: this.cache.size });
    } catch (error) {
      this.emit('cache-error', { action: 'save', error });
    }
  }

  /**
   * Ensure directory exists
   * @private
   */
  async _ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Get cache entry
   * @param {string} target - Cache target
   * @returns {Object|null}
   */
  getCache(target) {
    return this.cache.get(target) || null;
  }

  /**
   * Get MCP servers from cache
   * @returns {Object[]}
   */
  getMcpServers() {
    const registry = this.cache.get(TARGET.MCP_REGISTRY);
    return registry?.servers || [];
  }

  /**
   * Get update statistics
   * @returns {Object}
   */
  getStatistics() {
    const recentUpdates = this.updateHistory.slice(-100);
    
    return {
      totalUpdates: this.updateHistory.length,
      successRate: recentUpdates.filter(u => u.success).length / Math.max(recentUpdates.length, 1),
      averageDuration: recentUpdates.reduce((sum, u) => sum + u.duration, 0) / Math.max(recentUpdates.length, 1),
      cacheSize: this.cache.size,
      filesTracked: this.fileHashes.size,
      lastUpdate: recentUpdates[recentUpdates.length - 1]?.timestamp || null
    };
  }

  /**
   * Force full refresh of all targets
   * @returns {Promise<UpdateResult[]>}
   */
  async forceRefresh() {
    // Clear all caches
    this.fileHashes.clear();
    this.cache.clear();
    this.cacheTimestamps.clear();
    
    return this.triggerUpdate(TRIGGER.MANUAL, {
      targets: Object.values(TARGET)
    });
  }

  /**
   * Start watchers (alias for initialize without initial scan)
   * Used by Phase5Integration for consistent API
   */
  start() {
    if (this.watchFiles && !this.fileWatcher) {
      this._startFileWatcher();
    }
    
    if (this.watchMcp && !this.mcpWatcher) {
      this._startMcpWatcher();
    }
    
    this.emit('started');
  }

  /**
   * Stop all watchers and cleanup
   */
  stop() {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
    
    if (this.mcpWatcher) {
      this.mcpWatcher.close();
      this.mcpWatcher = null;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.emit('stopped');
  }
}

/**
 * Create CodeGraph auto-update instance
 * @param {CodeGraphAutoUpdateOptions} [options={}]
 * @returns {CodeGraphAutoUpdate}
 */
function createCodeGraphAutoUpdate(options = {}) {
  return new CodeGraphAutoUpdate(options);
}

module.exports = {
  CodeGraphAutoUpdate,
  createCodeGraphAutoUpdate,
  TRIGGER,
  TARGET
};
