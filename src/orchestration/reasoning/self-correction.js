/**
 * @file self-correction.js
 * @description Self-correction and error recovery system for agentic coding
 * @version 1.0.0
 */

'use strict';

const { EventEmitter } = require('events');

/**
 * Error severity levels
 * @enum {string}
 */
const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Correction strategy types
 * @enum {string}
 */
const CORRECTION_STRATEGY = {
  RETRY: 'retry',
  FALLBACK: 'fallback',
  DECOMPOSE: 'decompose',
  SIMPLIFY: 'simplify',
  ESCALATE: 'escalate',
  SKIP: 'skip',
  ROLLBACK: 'rollback'
};

/**
 * @typedef {Object} ErrorPattern
 * @property {string} pattern - Error pattern (regex or string)
 * @property {string} type - Error type classification
 * @property {string} strategy - Recommended correction strategy
 * @property {string} description - Human-readable description
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} CorrectionAttempt
 * @property {string} id - Attempt identifier
 * @property {string} errorId - Original error ID
 * @property {string} strategy - Strategy used
 * @property {boolean} successful - Whether correction succeeded
 * @property {string} [result] - Correction result
 * @property {number} timestamp - Attempt timestamp
 * @property {number} duration - Time taken
 */

/**
 * @typedef {Object} ErrorRecord
 * @property {string} id - Error identifier
 * @property {string} message - Error message
 * @property {string} type - Error type
 * @property {string} severity - Error severity
 * @property {string} context - Error context
 * @property {CorrectionAttempt[]} attempts - Correction attempts
 * @property {boolean} resolved - Whether error is resolved
 * @property {number} timestamp - Error timestamp
 */

/**
 * @typedef {Object} SelfCorrectionOptions
 * @property {number} [maxRetries=3] - Maximum retry attempts
 * @property {number} [retryDelay=1000] - Delay between retries in ms
 * @property {boolean} [exponentialBackoff=true] - Use exponential backoff
 * @property {number} [maxBackoff=30000] - Maximum backoff delay
 * @property {boolean} [learnFromErrors=true] - Learn from error patterns
 * @property {number} [memorySize=100] - Error memory size
 */

/**
 * Default error patterns
 */
const DEFAULT_PATTERNS = [
  {
    pattern: /syntax\s*error/i,
    type: 'syntax',
    strategy: CORRECTION_STRATEGY.SIMPLIFY,
    description: 'Syntax error in code'
  },
  {
    pattern: /undefined|not\s*defined/i,
    type: 'reference',
    strategy: CORRECTION_STRATEGY.FALLBACK,
    description: 'Undefined reference'
  },
  {
    pattern: /timeout|timed?\s*out/i,
    type: 'timeout',
    strategy: CORRECTION_STRATEGY.RETRY,
    description: 'Operation timed out'
  },
  {
    pattern: /permission|access\s*denied|forbidden/i,
    type: 'permission',
    strategy: CORRECTION_STRATEGY.ESCALATE,
    description: 'Permission denied'
  },
  {
    pattern: /not\s*found|missing|does\s*not\s*exist/i,
    type: 'not-found',
    strategy: CORRECTION_STRATEGY.FALLBACK,
    description: 'Resource not found'
  },
  {
    pattern: /out\s*of\s*memory|heap|allocation/i,
    type: 'memory',
    strategy: CORRECTION_STRATEGY.DECOMPOSE,
    description: 'Memory allocation error'
  },
  {
    pattern: /network|connection|socket/i,
    type: 'network',
    strategy: CORRECTION_STRATEGY.RETRY,
    description: 'Network error'
  },
  {
    pattern: /invalid|malformed|corrupt/i,
    type: 'validation',
    strategy: CORRECTION_STRATEGY.SIMPLIFY,
    description: 'Invalid input or data'
  },
  {
    pattern: /deadlock|race\s*condition/i,
    type: 'concurrency',
    strategy: CORRECTION_STRATEGY.RETRY,
    description: 'Concurrency issue'
  },
  {
    pattern: /assertion|expect|test.*fail/i,
    type: 'test',
    strategy: CORRECTION_STRATEGY.FALLBACK,
    description: 'Test assertion failure'
  }
];

/**
 * Self-Correction class for error recovery
 * @extends EventEmitter
 */
class SelfCorrection extends EventEmitter {
  /**
   * Create self-correction system
   * @param {SelfCorrectionOptions} [options={}] - System options
   */
  constructor(options = {}) {
    super();
    
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
    this.exponentialBackoff = options.exponentialBackoff ?? true;
    this.maxBackoff = options.maxBackoff ?? 30000;
    this.learnFromErrors = options.learnFromErrors ?? true;
    this.memorySize = options.memorySize ?? 100;
    
    // State
    this.patterns = [...DEFAULT_PATTERNS];
    this.errorMemory = [];
    this.corrections = new Map();
    this.successPatterns = new Map();
    this.errorCounter = 0;
    
    // Handlers
    this.strategyHandlers = new Map();
    this.registerDefaultHandlers();
  }
  
  /**
   * Register default strategy handlers
   * @private
   */
  registerDefaultHandlers() {
    this.strategyHandlers.set(CORRECTION_STRATEGY.RETRY, this.handleRetry.bind(this));
    this.strategyHandlers.set(CORRECTION_STRATEGY.FALLBACK, this.handleFallback.bind(this));
    this.strategyHandlers.set(CORRECTION_STRATEGY.DECOMPOSE, this.handleDecompose.bind(this));
    this.strategyHandlers.set(CORRECTION_STRATEGY.SIMPLIFY, this.handleSimplify.bind(this));
    this.strategyHandlers.set(CORRECTION_STRATEGY.ESCALATE, this.handleEscalate.bind(this));
    this.strategyHandlers.set(CORRECTION_STRATEGY.SKIP, this.handleSkip.bind(this));
    this.strategyHandlers.set(CORRECTION_STRATEGY.ROLLBACK, this.handleRollback.bind(this));
  }
  
  /**
   * Analyze an error
   * @param {Error|string} error - Error to analyze
   * @param {Object} [context={}] - Error context
   * @returns {ErrorRecord}
   */
  analyzeError(error, context = {}) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : null;
    
    // Classify error
    const classification = this.classifyError(message);
    
    const record = {
      id: `err-${++this.errorCounter}`,
      message,
      type: classification.type,
      severity: this.determineSeverity(classification.type),
      context: JSON.stringify(context),
      stack,
      strategy: classification.strategy,
      description: classification.description,
      attempts: [],
      resolved: false,
      timestamp: Date.now()
    };
    
    // Store in memory
    this.errorMemory.push(record);
    if (this.errorMemory.length > this.memorySize) {
      this.errorMemory.shift();
    }
    
    this.emit('error:analyzed', { record });
    
    return record;
  }
  
  /**
   * Classify error based on patterns
   * @private
   */
  classifyError(message) {
    // Check learned patterns first
    for (const [pattern, info] of this.successPatterns) {
      if (message.includes(pattern)) {
        return info;
      }
    }
    
    // Check default patterns
    for (const pattern of this.patterns) {
      const regex = pattern.pattern instanceof RegExp 
        ? pattern.pattern 
        : new RegExp(pattern.pattern, 'i');
      
      if (regex.test(message)) {
        return {
          type: pattern.type,
          strategy: pattern.strategy,
          description: pattern.description
        };
      }
    }
    
    // Default classification
    return {
      type: 'unknown',
      strategy: CORRECTION_STRATEGY.RETRY,
      description: 'Unknown error'
    };
  }
  
  /**
   * Determine severity based on error type
   * @private
   */
  determineSeverity(type) {
    const severities = {
      syntax: SEVERITY.ERROR,
      reference: SEVERITY.ERROR,
      timeout: SEVERITY.WARNING,
      permission: SEVERITY.CRITICAL,
      'not-found': SEVERITY.WARNING,
      memory: SEVERITY.CRITICAL,
      network: SEVERITY.WARNING,
      validation: SEVERITY.ERROR,
      concurrency: SEVERITY.ERROR,
      test: SEVERITY.INFO,
      unknown: SEVERITY.ERROR
    };
    
    return severities[type] || SEVERITY.ERROR;
  }
  
  /**
   * Attempt to correct an error
   * @param {ErrorRecord} record - Error record
   * @param {Function} operation - Original operation to retry
   * @param {Object} [options={}] - Correction options
   * @returns {Promise<Object>}
   */
  async correct(record, operation, options = {}) {
    const startTime = Date.now();
    
    this.emit('correction:start', { errorId: record.id, strategy: record.strategy });
    
    const handler = this.strategyHandlers.get(record.strategy);
    if (!handler) {
      throw new Error(`No handler for strategy: ${record.strategy}`);
    }
    
    const attempt = {
      id: `attempt-${record.attempts.length + 1}`,
      errorId: record.id,
      strategy: record.strategy,
      successful: false,
      result: null,
      timestamp: Date.now(),
      duration: 0
    };
    
    try {
      const result = await handler(record, operation, options);
      
      attempt.successful = true;
      attempt.result = 'Correction successful';
      record.resolved = true;
      
      // Learn from success
      if (this.learnFromErrors) {
        this.learnSuccess(record);
      }
      
      this.emit('correction:success', { errorId: record.id, attempt });
      
      return { success: true, result, attempt };
      
    } catch (correctionError) {
      attempt.successful = false;
      attempt.result = correctionError.message;
      
      this.emit('correction:failure', { 
        errorId: record.id, 
        attempt, 
        error: correctionError.message 
      });
      
      return { 
        success: false, 
        error: correctionError, 
        attempt,
        canRetry: record.attempts.length < this.maxRetries
      };
      
    } finally {
      attempt.duration = Date.now() - startTime;
      record.attempts.push(attempt);
      this.corrections.set(record.id, record);
    }
  }
  
  /**
   * Handle retry strategy
   * @private
   */
  async handleRetry(record, operation, _options) {
    const attemptNumber = record.attempts.length;
    
    // Calculate delay
    let delay = this.retryDelay;
    if (this.exponentialBackoff) {
      delay = Math.min(this.retryDelay * Math.pow(2, attemptNumber), this.maxBackoff);
    }
    
    // Wait before retry
    await this.delay(delay);
    
    // Retry the operation
    return operation();
  }
  
  /**
   * Handle fallback strategy
   * @private
   */
  async handleFallback(record, operation, options) {
    const fallback = options.fallback;
    
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback(record);
      }
      return fallback;
    }
    
    // Try simpler version of operation
    if (options.simplifiedOperation) {
      return options.simplifiedOperation();
    }
    
    throw new Error('No fallback available');
  }
  
  /**
   * Handle decompose strategy
   * @private
   */
  async handleDecompose(record, operation, options) {
    const decomposer = options.decompose;
    
    if (!decomposer) {
      throw new Error('No decomposer provided');
    }
    
    // Decompose into smaller operations
    const subOperations = await decomposer(record);
    
    // Execute sub-operations
    const results = [];
    for (const subOp of subOperations) {
      try {
        const result = await subOp();
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    
    return { results, successful: results.every(r => r.success) };
  }
  
  /**
   * Handle simplify strategy
   * @private
   */
  async handleSimplify(record, operation, options) {
    const simplifier = options.simplify;
    
    if (simplifier) {
      const simplified = await simplifier(record);
      return simplified;
    }
    
    // Default simplification: retry with reduced scope
    if (options.simplifiedOperation) {
      return options.simplifiedOperation();
    }
    
    throw new Error('Cannot simplify operation');
  }
  
  /**
   * Handle escalate strategy
   * @private
   */
  async handleEscalate(record, operation, options) {
    const escalationHandler = options.escalate;
    
    this.emit('correction:escalated', { record });
    
    if (escalationHandler) {
      return escalationHandler(record);
    }
    
    // Mark as requiring human intervention
    record.escalated = true;
    throw new Error('Error escalated - requires human intervention');
  }
  
  /**
   * Handle skip strategy
   * @private
   */
  async handleSkip(record, _operation, _options) {
    this.emit('correction:skipped', { record });
    
    return { skipped: true, reason: record.message };
  }
  
  /**
   * Handle rollback strategy
   * @private
   */
  async handleRollback(record, operation, options) {
    const rollbackHandler = options.rollback;
    
    if (!rollbackHandler) {
      throw new Error('No rollback handler provided');
    }
    
    this.emit('correction:rollback', { record });
    
    return rollbackHandler(record);
  }
  
  /**
   * Learn from successful correction
   * @private
   */
  learnSuccess(record) {
    // Extract key part of error message
    const key = this.extractErrorSignature(record.message);
    
    if (key) {
      this.successPatterns.set(key, {
        type: record.type,
        strategy: record.strategy,
        description: record.description
      });
    }
  }
  
  /**
   * Extract error signature for learning
   * @private
   */
  extractErrorSignature(message) {
    // Remove variable parts (numbers, paths, etc.)
    return message
      .replace(/\d+/g, 'N')
      .replace(/['"][^'"]+['"]/g, '"X"')
      .replace(/\/[^\s]+/g, '/PATH')
      .substring(0, 50);
  }
  
  /**
   * Add custom error pattern
   * @param {ErrorPattern} pattern - Pattern definition
   */
  addPattern(pattern) {
    this.patterns.unshift(pattern);
  }
  
  /**
   * Register custom strategy handler
   * @param {string} strategy - Strategy name
   * @param {Function} handler - Handler function
   */
  registerHandler(strategy, handler) {
    this.strategyHandlers.set(strategy, handler);
  }
  
  /**
   * Get error by ID
   * @param {string} errorId - Error identifier
   * @returns {ErrorRecord|null}
   */
  getError(errorId) {
    return this.corrections.get(errorId) || 
           this.errorMemory.find(e => e.id === errorId) || 
           null;
  }
  
  /**
   * Get recent errors
   * @param {number} [count=10] - Number of errors to return
   * @returns {ErrorRecord[]}
   */
  getRecentErrors(count = 10) {
    return this.errorMemory.slice(-count);
  }
  
  /**
   * Get unresolved errors
   * @returns {ErrorRecord[]}
   */
  getUnresolvedErrors() {
    return this.errorMemory.filter(e => !e.resolved);
  }
  
  /**
   * Get error statistics
   * @returns {Object}
   */
  getStats() {
    const total = this.errorMemory.length;
    const resolved = this.errorMemory.filter(e => e.resolved).length;
    const byType = {};
    const bySeverity = {};
    const byStrategy = {};
    
    for (const error of this.errorMemory) {
      byType[error.type] = (byType[error.type] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      byStrategy[error.strategy] = (byStrategy[error.strategy] || 0) + 1;
    }
    
    // Calculate success rates by strategy
    const strategySuccess = {};
    for (const [, record] of this.corrections) {
      const strategy = record.strategy;
      if (!strategySuccess[strategy]) {
        strategySuccess[strategy] = { success: 0, total: 0 };
      }
      strategySuccess[strategy].total++;
      if (record.resolved) {
        strategySuccess[strategy].success++;
      }
    }
    
    return {
      total,
      resolved,
      unresolved: total - resolved,
      resolutionRate: total > 0 ? resolved / total : 0,
      byType,
      bySeverity,
      byStrategy,
      strategySuccess,
      learnedPatterns: this.successPatterns.size
    };
  }
  
  /**
   * Get correction recommendations for an error
   * @param {ErrorRecord} record - Error record
   * @returns {Object}
   */
  getRecommendations(record) {
    const recommendations = [];
    
    // Based on error type
    const typeRecs = {
      syntax: ['Check for typos', 'Verify code structure', 'Use linter'],
      reference: ['Check variable declarations', 'Verify imports', 'Check scope'],
      timeout: ['Increase timeout', 'Optimize operation', 'Check network'],
      permission: ['Check credentials', 'Verify access rights', 'Request permissions'],
      'not-found': ['Verify path/name', 'Check existence', 'Create resource'],
      memory: ['Reduce data size', 'Process in chunks', 'Increase memory'],
      network: ['Check connection', 'Retry request', 'Check firewall'],
      validation: ['Verify input format', 'Check data types', 'Validate schema'],
      concurrency: ['Add locking', 'Use queue', 'Retry with backoff'],
      test: ['Review test logic', 'Check expected values', 'Update assertions']
    };
    
    recommendations.push(...(typeRecs[record.type] || ['Review error details']));
    
    // Based on similar past errors
    const similar = this.findSimilarErrors(record);
    if (similar.length > 0 && similar[0].resolved) {
      recommendations.push(`Similar error resolved using: ${similar[0].strategy}`);
    }
    
    return {
      primaryStrategy: record.strategy,
      alternatives: this.getAlternativeStrategies(record.strategy),
      actionItems: recommendations
    };
  }
  
  /**
   * Find similar past errors
   * @private
   */
  findSimilarErrors(record) {
    return this.errorMemory
      .filter(e => e.id !== record.id && e.type === record.type)
      .slice(-5);
  }
  
  /**
   * Get alternative strategies
   * @private
   */
  getAlternativeStrategies(primaryStrategy) {
    const all = Object.values(CORRECTION_STRATEGY);
    return all.filter(s => s !== primaryStrategy);
  }
  
  /**
   * Delay helper
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Clear error memory
   */
  clearMemory() {
    this.errorMemory = [];
    this.corrections.clear();
    this.errorCounter = 0;
  }
  
  /**
   * Reset learned patterns
   */
  resetLearning() {
    this.successPatterns.clear();
  }
  
  /**
   * Export error report
   * @returns {string}
   */
  exportReport() {
    const stats = this.getStats();
    
    let report = `# Error Correction Report\n\n`;
    report += `## Summary\n`;
    report += `- Total Errors: ${stats.total}\n`;
    report += `- Resolved: ${stats.resolved} (${(stats.resolutionRate * 100).toFixed(1)}%)\n`;
    report += `- Learned Patterns: ${stats.learnedPatterns}\n\n`;
    
    report += `## Errors by Type\n`;
    for (const [type, count] of Object.entries(stats.byType)) {
      report += `- ${type}: ${count}\n`;
    }
    
    report += `\n## Errors by Severity\n`;
    for (const [severity, count] of Object.entries(stats.bySeverity)) {
      report += `- ${severity}: ${count}\n`;
    }
    
    report += `\n## Strategy Effectiveness\n`;
    for (const [strategy, data] of Object.entries(stats.strategySuccess)) {
      const rate = data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0;
      report += `- ${strategy}: ${rate}% success (${data.success}/${data.total})\n`;
    }
    
    report += `\n## Recent Errors\n`;
    for (const error of this.getRecentErrors(5)) {
      const status = error.resolved ? '✅' : '❌';
      report += `- ${status} [${error.type}] ${error.message.substring(0, 50)}...\n`;
    }
    
    return report;
  }
}

/**
 * Create self-correction system
 * @param {SelfCorrectionOptions} [options={}] - System options
 * @returns {SelfCorrection}
 */
function createSelfCorrection(options = {}) {
  return new SelfCorrection(options);
}

/**
 * Analyze and attempt to correct an error
 * @param {Error|string} error - Error to correct
 * @param {Function} operation - Operation to retry
 * @param {Object} [options={}] - Correction options
 * @returns {Promise<Object>}
 */
async function correctError(error, operation, options = {}) {
  const corrector = createSelfCorrection(options);
  const record = corrector.analyzeError(error, options.context || {});
  return corrector.correct(record, operation, options);
}

module.exports = {
  SelfCorrection,
  createSelfCorrection,
  correctError,
  SEVERITY,
  CORRECTION_STRATEGY,
  DEFAULT_PATTERNS
};
