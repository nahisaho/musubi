/**
 * Context Optimizer
 * 
 * Optimizes context for LLM consumption by intelligently selecting
 * and prioritizing relevant code and documentation.
 * 
 * Part of MUSUBI v5.0.0 - Codebase Intelligence
 * 
 * @module analyzers/context-optimizer
 * @version 1.0.0
 * 
 * @traceability
 * - Requirement: REQ-P4-003 (Context Optimization)
 * - Design: docs/design/tdd-musubi-v5.0.0.md#2.3
 * - Test: tests/analyzers/context-optimizer.test.js
 */

const { EventEmitter } = require('events');
const {  createRepositoryMap } = require('./repository-map');
const {  createASTExtractor } = require('./ast-extractor');

/**
 * @typedef {Object} ContextRequest
 * @property {string} query - User query or intent
 * @property {string[]} [focusFiles] - Files to focus on
 * @property {string[]} [focusSymbols] - Symbols to focus on
 * @property {string} [task] - Task type (implement, debug, review, explain)
 * @property {number} [maxTokens=8000] - Maximum token budget
 * @property {boolean} [includeTests=false] - Include test files
 * @property {boolean} [includeComments=true] - Include comments
 */

/**
 * @typedef {Object} ContextItem
 * @property {string} type - Item type (file, symbol, import, doc)
 * @property {string} path - File path
 * @property {string} content - Content or summary
 * @property {number} relevance - Relevance score (0-1)
 * @property {number} tokens - Estimated token count
 * @property {Object} metadata - Additional metadata
 */

/**
 * @typedef {Object} OptimizedContext
 * @property {ContextItem[]} items - Context items in priority order
 * @property {number} totalTokens - Total estimated tokens
 * @property {string} formatted - Formatted context string
 * @property {Object} stats - Context statistics
 */

/**
 * Token estimation constants
 */
const CHARS_PER_TOKEN = 4; // Approximate
const TOKEN_OVERHEAD = {
  fileHeader: 50,
  symbolHeader: 20,
  separator: 10
};

/**
 * Task-specific weight configurations
 */
const TASK_WEIGHTS = {
  implement: {
    entryPoints: 0.9,
    relatedFiles: 0.8,
    interfaces: 0.85,
    tests: 0.3,
    docs: 0.5
  },
  debug: {
    errorLocation: 1.0,
    callStack: 0.9,
    relatedFiles: 0.7,
    tests: 0.6,
    docs: 0.4
  },
  review: {
    changedFiles: 1.0,
    relatedFiles: 0.7,
    interfaces: 0.6,
    tests: 0.8,
    docs: 0.5
  },
  explain: {
    targetFile: 1.0,
    imports: 0.8,
    relatedFiles: 0.6,
    tests: 0.4,
    docs: 0.7
  },
  refactor: {
    targetFile: 1.0,
    usages: 0.9,
    interfaces: 0.8,
    tests: 0.7,
    docs: 0.5
  }
};

/**
 * Context Optimizer class
 * @extends EventEmitter
 */
class ContextOptimizer extends EventEmitter {
  /**
   * Create context optimizer
   * @param {Object} options - Configuration options
   * @param {string} options.rootPath - Repository root path
   * @param {number} [options.maxTokens=8000] - Default max tokens
   * @param {number} [options.maxFiles=20] - Max files in context
   * @param {boolean} [options.useAST=true] - Use AST for analysis
   * @param {boolean} [options.cache=true] - Enable caching
   */
  constructor(options = {}) {
    super();
    this.rootPath = options.rootPath || process.cwd();
    this.maxTokens = options.maxTokens ?? 8000;
    this.maxFiles = options.maxFiles ?? 20;
    this.useAST = options.useAST ?? true;
    this.cacheEnabled = options.cache ?? true;
    
    // Components
    this.repoMap = null;
    this.astExtractor = null;
    
    // Caches
    this.relevanceCache = new Map();
    this.astCache = new Map();
    
    // State
    this.initialized = false;
  }
  
  /**
   * Initialize optimizer with repository analysis
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;
    
    this.emit('init:start');
    
    // Create repository map
    this.repoMap = createRepositoryMap({ rootPath: this.rootPath });
    await this.repoMap.generate();
    
    // Create AST extractor
    if (this.useAST) {
      this.astExtractor = createASTExtractor();
    }
    
    this.initialized = true;
    this.emit('init:complete', { 
      files: this.repoMap.stats.totalFiles,
      entryPoints: this.repoMap.entryPoints.length
    });
  }
  
  /**
   * Optimize context for a query
   * @param {ContextRequest} request - Context request
   * @returns {Promise<OptimizedContext>}
   */
  async optimize(request) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    this.emit('optimize:start', request);
    
    const maxTokens = request.maxTokens ?? this.maxTokens;
    const task = request.task || 'implement';
    const weights = TASK_WEIGHTS[task] || TASK_WEIGHTS.implement;
    
    // Step 1: Collect candidate files
    const candidates = await this.collectCandidates(request);
    
    // Step 2: Score candidates by relevance
    const scored = await this.scoreRelevance(candidates, request, weights);
    
    // Step 3: Sort by relevance
    scored.sort((a, b) => b.relevance - a.relevance);
    
    // Step 4: Select items within token budget
    const selected = this.selectWithinBudget(scored, maxTokens);
    
    // Step 5: Build formatted context
    const formatted = this.formatContext(selected, request);
    
    const result = {
      items: selected,
      totalTokens: selected.reduce((sum, item) => sum + item.tokens, 0),
      formatted,
      stats: {
        candidateCount: candidates.length,
        selectedCount: selected.length,
        tokenBudget: maxTokens,
        tokensUsed: selected.reduce((sum, item) => sum + item.tokens, 0)
      }
    };
    
    this.emit('optimize:complete', result.stats);
    return result;
  }
  
  /**
   * Collect candidate files for context
   * @param {ContextRequest} request - Context request
   * @returns {Promise<ContextItem[]>}
   * @private
   */
  async collectCandidates(request) {
    const candidates = [];
    
    // Add focus files with high priority
    if (request.focusFiles?.length > 0) {
      for (const pattern of request.focusFiles) {
        const matches = this.repoMap.searchFiles(pattern);
        for (const file of matches) {
          candidates.push({
            type: 'file',
            path: file.path,
            content: '',
            relevance: 1.0,
            tokens: this.estimateTokens(file.size),
            metadata: { source: 'focus', file }
          });
        }
      }
    }
    
    // Add entry points
    for (const entry of this.repoMap.entryPoints.slice(0, 5)) {
      const file = this.repoMap.files.find(f => f.path === entry);
      if (file) {
        candidates.push({
          type: 'file',
          path: file.path,
          content: '',
          relevance: 0.8,
          tokens: this.estimateTokens(file.size),
          metadata: { source: 'entryPoint', file }
        });
      }
    }
    
    // Add files matching query keywords
    if (request.query) {
      const keywords = this.extractKeywords(request.query);
      for (const keyword of keywords) {
        const matches = this.repoMap.searchFiles(keyword);
        for (const file of matches.slice(0, 5)) {
          if (!candidates.find(c => c.path === file.path)) {
            candidates.push({
              type: 'file',
              path: file.path,
              content: '',
              relevance: 0.6,
              tokens: this.estimateTokens(file.size),
              metadata: { source: 'keyword', keyword, file }
            });
          }
        }
      }
    }
    
    // Add related files based on imports (if AST enabled)
    if (this.useAST && candidates.length > 0) {
      const imports = await this.collectImports(candidates.slice(0, 5));
      for (const imp of imports.slice(0, 10)) {
        if (!candidates.find(c => c.path === imp.path)) {
          candidates.push({
            type: 'file',
            path: imp.path,
            content: '',
            relevance: 0.5,
            tokens: this.estimateTokens(imp.size),
            metadata: { source: 'import', file: imp }
          });
        }
      }
    }
    
    // Add test files if requested
    if (request.includeTests) {
      const testFiles = this.repoMap.files.filter(f => 
        f.path.includes('test') || f.path.includes('spec')
      );
      for (const file of testFiles.slice(0, 5)) {
        if (!candidates.find(c => c.path === file.path)) {
          candidates.push({
            type: 'file',
            path: file.path,
            content: '',
            relevance: 0.4,
            tokens: this.estimateTokens(file.size),
            metadata: { source: 'test', file }
          });
        }
      }
    }
    
    return candidates;
  }
  
  /**
   * Collect imports from candidate files
   * @param {ContextItem[]} candidates - Candidate items
   * @returns {Promise<Object[]>}
   * @private
   */
  async collectImports(candidates) {
    const imports = [];
    const path = require('path');
    
    for (const candidate of candidates) {
      if (candidate.metadata.file?.language === 'unknown') continue;
      
      try {
        const filePath = path.join(this.rootPath, candidate.path);
        const ast = await this.astExtractor.extractFromFile(filePath);
        
        for (const imp of ast.imports) {
          // Resolve relative imports
          if (imp.source.startsWith('.')) {
            const dir = path.dirname(candidate.path);
            let resolved = path.join(dir, imp.source);
            
            // Try common extensions
            for (const ext of ['.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts']) {
              const withExt = resolved + ext;
              const file = this.repoMap.files.find(f => 
                f.path === withExt || f.path === resolved.replace(/\\/g, '/')
              );
              if (file) {
                imports.push(file);
                break;
              }
            }
          }
        }
      } catch {
        // Skip files that can't be parsed
      }
    }
    
    return imports;
  }
  
  /**
   * Score relevance of candidates
   * @param {ContextItem[]} candidates - Candidate items
   * @param {ContextRequest} request - Context request
   * @param {Object} weights - Task weights
   * @returns {Promise<ContextItem[]>}
   * @private
   */
  async scoreRelevance(candidates, request, weights) {
    for (const candidate of candidates) {
      let score = candidate.relevance;
      
      // Adjust by source
      switch (candidate.metadata.source) {
        case 'focus':
          score *= 1.0;
          break;
        case 'entryPoint':
          score *= weights.entryPoints;
          break;
        case 'keyword':
          score *= weights.relatedFiles;
          break;
        case 'import':
          score *= weights.relatedFiles * 0.8;
          break;
        case 'test':
          score *= weights.tests;
          break;
      }
      
      // Boost for focus symbols if present
      if (request.focusSymbols?.length > 0 && this.useAST) {
        try {
          const path = require('path');
          const filePath = path.join(this.rootPath, candidate.path);
          const ast = await this.getOrExtractAST(filePath);
          
          const hasSymbol = ast.symbols.some(s => 
            request.focusSymbols.some(fs => 
              s.name.toLowerCase().includes(fs.toLowerCase())
            )
          );
          
          if (hasSymbol) {
            score *= 1.5;
          }
        } catch {
          // Skip
        }
      }
      
      // Penalize very large files
      if (candidate.tokens > 2000) {
        score *= 0.7;
      }
      
      // Boost for exports (more important modules)
      if (candidate.metadata.file?.exports?.length > 3) {
        score *= 1.2;
      }
      
      candidate.relevance = Math.min(score, 1.0);
    }
    
    return candidates;
  }
  
  /**
   * Get or extract AST with caching
   * @param {string} filePath - File path
   * @returns {Promise<Object>}
   * @private
   */
  async getOrExtractAST(filePath) {
    if (this.cacheEnabled && this.astCache.has(filePath)) {
      return this.astCache.get(filePath);
    }
    
    const ast = await this.astExtractor.extractFromFile(filePath);
    
    if (this.cacheEnabled) {
      this.astCache.set(filePath, ast);
    }
    
    return ast;
  }
  
  /**
   * Select items within token budget
   * @param {ContextItem[]} scored - Scored items
   * @param {number} maxTokens - Maximum tokens
   * @returns {ContextItem[]}
   * @private
   */
  selectWithinBudget(scored, maxTokens) {
    const selected = [];
    let tokensUsed = 0;
    
    for (const item of scored) {
      const itemTokens = item.tokens + TOKEN_OVERHEAD.fileHeader;
      
      if (tokensUsed + itemTokens <= maxTokens) {
        selected.push(item);
        tokensUsed += itemTokens;
      }
      
      if (selected.length >= this.maxFiles) {
        break;
      }
    }
    
    return selected;
  }
  
  /**
   * Format context for LLM consumption
   * @param {ContextItem[]} items - Selected items
   * @param {ContextRequest} request - Original request
   * @returns {string}
   * @private
   */
  formatContext(items, request) {
    let context = `# Optimized Context\n\n`;
    context += `Task: ${request.task || 'implementation'}\n`;
    context += `Query: ${request.query || 'N/A'}\n`;
    context += `Files: ${items.length}\n\n`;
    
    context += `---\n\n`;
    
    for (const item of items) {
      context += `## ${item.path}\n\n`;
      context += `- Type: ${item.type}\n`;
      context += `- Relevance: ${(item.relevance * 100).toFixed(0)}%\n`;
      context += `- Source: ${item.metadata.source}\n`;
      
      if (item.metadata.file?.exports?.length > 0) {
        context += `- Exports: ${item.metadata.file.exports.slice(0, 5).join(', ')}`;
        if (item.metadata.file.exports.length > 5) {
          context += ` (+${item.metadata.file.exports.length - 5} more)`;
        }
        context += '\n';
      }
      
      context += '\n';
    }
    
    // Add repository overview
    if (this.repoMap) {
      context += `---\n\n`;
      context += `## Repository Overview\n\n`;
      context += `- Total Files: ${this.repoMap.stats.totalFiles}\n`;
      context += `- Languages: ${Object.keys(this.repoMap.stats.byLanguage).slice(0, 5).join(', ')}\n`;
      context += `- Entry Points: ${this.repoMap.entryPoints.slice(0, 3).join(', ')}\n`;
    }
    
    return context;
  }
  
  /**
   * Extract keywords from query
   * @param {string} query - User query
   * @returns {string[]}
   * @private
   */
  extractKeywords(query) {
    // Remove common words and extract meaningful terms
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
      'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
      'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
      'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and',
      'but', 'if', 'or', 'because', 'until', 'while', 'although', 'though',
      'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
      'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
      'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
      'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them',
      'their', 'theirs', 'themselves', 'create', 'add', 'fix', 'implement',
      'change', 'update', 'modify', 'file', 'code', 'function', 'class'
    ]);
    
    const words = query
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
    
    // Also extract CamelCase and snake_case identifiers
    const identifiers = query.match(/[A-Z][a-z]+|[a-z]+_[a-z]+/g) || [];
    
    return [...new Set([...words, ...identifiers.map(i => i.toLowerCase())])];
  }
  
  /**
   * Estimate tokens from bytes
   * @param {number} bytes - File size in bytes
   * @returns {number}
   * @private
   */
  estimateTokens(bytes) {
    return Math.ceil(bytes / CHARS_PER_TOKEN);
  }
  
  /**
   * Build focused context for specific files
   * @param {string[]} filePaths - File paths to include
   * @param {Object} options - Options
   * @returns {Promise<string>}
   */
  async buildFocusedContext(filePaths, options = {}) {
    const fs = require('fs');
    const path = require('path');
    const { maxTokens = 4000, includeAST = true } = options;
    
    let context = '';
    let tokensUsed = 0;
    
    for (const filePath of filePaths) {
      const absPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.rootPath, filePath);
      
      try {
        const content = await fs.promises.readFile(absPath, 'utf-8');
        const tokens = this.estimateTokens(content.length);
        
        if (tokensUsed + tokens > maxTokens) {
          // Truncate to fit
          const remaining = maxTokens - tokensUsed;
          const chars = remaining * CHARS_PER_TOKEN;
          context += `\n## ${filePath} (truncated)\n\n\`\`\`\n`;
          context += content.slice(0, chars);
          context += '\n...(truncated)\n```\n';
          break;
        }
        
        context += `\n## ${filePath}\n\n`;
        
        // Add AST summary if enabled
        if (includeAST && this.useAST) {
          try {
            const ast = await this.getOrExtractAST(absPath);
            if (ast.symbols.length > 0) {
              context += '**Symbols:**\n';
              for (const sym of ast.symbols.slice(0, 10)) {
                context += `- ${sym.type}: ${sym.name}\n`;
              }
              context += '\n';
            }
          } catch {
            // Skip AST
          }
        }
        
        context += '```\n' + content + '\n```\n';
        tokensUsed += tokens;
        
      } catch (error) {
        context += `\n## ${filePath}\n\n*Error reading file: ${error.message}*\n`;
      }
    }
    
    return context;
  }
  
  /**
   * Get optimization statistics
   * @returns {Object}
   */
  getStats() {
    return {
      initialized: this.initialized,
      repoFiles: this.repoMap?.stats?.totalFiles || 0,
      repoEntryPoints: this.repoMap?.entryPoints?.length || 0,
      astCacheSize: this.astCache.size,
      relevanceCacheSize: this.relevanceCache.size
    };
  }
  
  /**
   * Clear all caches
   */
  clearCaches() {
    this.astCache.clear();
    this.relevanceCache.clear();
  }
  
  /**
   * Reset optimizer state
   */
  reset() {
    this.clearCaches();
    this.repoMap = null;
    this.astExtractor = null;
    this.initialized = false;
  }
}

/**
 * Create context optimizer
 * @param {Object} options - Options
 * @returns {ContextOptimizer}
 */
function createContextOptimizer(options = {}) {
  return new ContextOptimizer(options);
}

/**
 * Optimize context for query
 * @param {string} rootPath - Repository root
 * @param {ContextRequest} request - Context request
 * @returns {Promise<OptimizedContext>}
 */
async function optimizeContext(rootPath, request) {
  const optimizer = createContextOptimizer({ rootPath });
  return optimizer.optimize(request);
}

module.exports = {
  ContextOptimizer,
  createContextOptimizer,
  optimizeContext,
  TASK_WEIGHTS,
  CHARS_PER_TOKEN
};
