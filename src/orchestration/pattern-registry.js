/**
 * PatternRegistry - Registry for orchestration patterns
 * 
 * Manages pattern lifecycle and provides pattern discovery
 */

const { PatternType } = require('./orchestration-engine');

/**
 * Pattern metadata
 */
class PatternMetadata {
  constructor(options = {}) {
    this.name = options.name || '';
    this.type = options.type || PatternType.SEQUENTIAL;
    this.description = options.description || '';
    this.version = options.version || '1.0.0';
    this.author = options.author || 'MUSUBI';
    this.tags = options.tags || [];
    this.useCases = options.useCases || [];
    this.complexity = options.complexity || 'medium'; // low, medium, high
    this.supportsParallel = options.supportsParallel || false;
    this.requiresHuman = options.requiresHuman || false;
  }

  matches(criteria = {}) {
    if (criteria.type && this.type !== criteria.type) return false;
    if (criteria.complexity && this.complexity !== criteria.complexity) return false;
    if (criteria.supportsParallel !== undefined && 
        this.supportsParallel !== criteria.supportsParallel) return false;
    if (criteria.requiresHuman !== undefined && 
        this.requiresHuman !== criteria.requiresHuman) return false;
    if (criteria.tags && criteria.tags.length > 0) {
      if (!criteria.tags.some(t => this.tags.includes(t))) return false;
    }
    return true;
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      description: this.description,
      version: this.version,
      author: this.author,
      tags: this.tags,
      useCases: this.useCases,
      complexity: this.complexity,
      supportsParallel: this.supportsParallel,
      requiresHuman: this.requiresHuman
    };
  }
}

/**
 * Base pattern class
 */
class BasePattern {
  constructor(metadata = {}) {
    this.metadata = new PatternMetadata(metadata);
  }

  /**
   * Execute the pattern
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {Promise<any>} Execution result
   */
  async execute(_context, _engine) {
    throw new Error('Pattern must implement execute method');
  }

  /**
   * Validate pattern can execute with given context
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {object} Validation result
   */
  validate(_context, _engine) {
    return { valid: true, errors: [] };
  }

  /**
   * Get pattern name
   * @returns {string} Pattern name
   */
  getName() {
    return this.metadata.name;
  }

  /**
   * Get pattern metadata
   * @returns {PatternMetadata} Pattern metadata
   */
  getMetadata() {
    return this.metadata;
  }
}

/**
 * PatternRegistry - Central registry for patterns
 */
class PatternRegistry {
  constructor() {
    this.patterns = new Map();
    this.metadata = new Map();
  }

  /**
   * Register a pattern
   * @param {string} name - Pattern name
   * @param {BasePattern|object} pattern - Pattern implementation
   * @param {object} metadata - Optional metadata override
   * @returns {PatternRegistry} This registry for chaining
   */
  register(name, pattern, metadata = {}) {
    if (!pattern) {
      throw new Error(`Pattern '${name}' cannot be null`);
    }

    // Validate pattern has execute method
    if (typeof pattern.execute !== 'function') {
      throw new Error(`Pattern '${name}' must have an execute method`);
    }

    this.patterns.set(name, pattern);

    // Extract or create metadata
    const patternMeta = pattern.metadata || pattern.getMetadata?.() || {};
    this.metadata.set(name, new PatternMetadata({
      name,
      ...patternMeta,
      ...metadata
    }));

    return this;
  }

  /**
   * Unregister a pattern
   * @param {string} name - Pattern name
   * @returns {boolean} True if pattern was removed
   */
  unregister(name) {
    this.metadata.delete(name);
    return this.patterns.delete(name);
  }

  /**
   * Get a pattern by name
   * @param {string} name - Pattern name
   * @returns {object|null} Pattern or null
   */
  get(name) {
    return this.patterns.get(name) || null;
  }

  /**
   * Check if a pattern exists
   * @param {string} name - Pattern name
   * @returns {boolean} True if pattern exists
   */
  has(name) {
    return this.patterns.has(name);
  }

  /**
   * Get pattern metadata
   * @param {string} name - Pattern name
   * @returns {PatternMetadata|null} Metadata or null
   */
  getMetadata(name) {
    return this.metadata.get(name) || null;
  }

  /**
   * List all pattern names
   * @returns {string[]} Pattern names
   */
  list() {
    return Array.from(this.patterns.keys());
  }

  /**
   * Find patterns matching criteria
   * @param {object} criteria - Search criteria
   * @returns {object[]} Matching patterns with metadata
   */
  find(criteria = {}) {
    const results = [];
    
    for (const [name, pattern] of this.patterns) {
      const meta = this.metadata.get(name);
      if (meta && meta.matches(criteria)) {
        results.push({
          name,
          pattern,
          metadata: meta
        });
      }
    }
    
    return results;
  }

  /**
   * Find the best pattern for a task
   * @param {string} task - Task description
   * @returns {string|null} Best pattern name
   */
  findBestPattern(task) {
    const taskLower = task.toLowerCase();
    
    // Check for parallel keywords
    if (taskLower.includes('parallel') || 
        taskLower.includes('concurrent') ||
        taskLower.includes('simultaneous')) {
      const swarm = this.find({ supportsParallel: true });
      if (swarm.length > 0) return swarm[0].name;
    }
    
    // Check for sequential keywords
    if (taskLower.includes('sequential') || 
        taskLower.includes('step by step') ||
        taskLower.includes('one by one')) {
      if (this.has(PatternType.SEQUENTIAL)) return PatternType.SEQUENTIAL;
    }
    
    // Check for collaboration keywords
    if (taskLower.includes('discuss') || 
        taskLower.includes('review') ||
        taskLower.includes('collaborate')) {
      if (this.has(PatternType.GROUP_CHAT)) return PatternType.GROUP_CHAT;
    }
    
    // Check for nested/hierarchical keywords
    if (taskLower.includes('break down') || 
        taskLower.includes('decompose') ||
        taskLower.includes('hierarchical')) {
      if (this.has(PatternType.NESTED)) return PatternType.NESTED;
    }
    
    // Check for human validation keywords
    if (taskLower.includes('validate') || 
        taskLower.includes('approve') ||
        taskLower.includes('review')) {
      if (this.has(PatternType.HUMAN_IN_LOOP)) return PatternType.HUMAN_IN_LOOP;
    }
    
    // Default to auto pattern
    if (this.has(PatternType.AUTO)) return PatternType.AUTO;
    
    // Fall back to sequential
    if (this.has(PatternType.SEQUENTIAL)) return PatternType.SEQUENTIAL;
    
    // Return first available pattern
    const patterns = this.list();
    return patterns.length > 0 ? patterns[0] : null;
  }

  /**
   * Register all patterns with an orchestration engine
   * @param {OrchestrationEngine} engine - Engine to register with
   */
  registerWithEngine(engine) {
    for (const [name, pattern] of this.patterns) {
      engine.registerPattern(name, pattern);
    }
  }

  /**
   * Get registry summary
   * @returns {object} Summary of registered patterns
   */
  getSummary() {
    const summary = {
      total: this.patterns.size,
      patterns: [],
      byType: {},
      byComplexity: {}
    };

    for (const [_name, meta] of this.metadata) {
      summary.patterns.push(meta.toJSON());
      
      // Count by type
      summary.byType[meta.type] = (summary.byType[meta.type] || 0) + 1;
      
      // Count by complexity
      summary.byComplexity[meta.complexity] = 
        (summary.byComplexity[meta.complexity] || 0) + 1;
    }

    return summary;
  }

  /**
   * Clear all patterns
   */
  clear() {
    this.patterns.clear();
    this.metadata.clear();
  }
}

/**
 * Create a default registry with built-in patterns
 * @returns {PatternRegistry} Registry with default patterns
 */
function createDefaultRegistry() {
  return new PatternRegistry();
}

module.exports = {
  PatternRegistry,
  PatternMetadata,
  BasePattern,
  createDefaultRegistry
};
