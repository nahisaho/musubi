/**
 * Error Recovery Handler
 * 
 * Provides recovery guidance for workflow failures.
 * 
 * Requirement: IMP-6.2-008-01
 * 
 * @module enterprise/error-recovery
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Error category enum
 */
const ERROR_CATEGORY = {
  TEST_FAILURE: 'test-failure',
  VALIDATION_ERROR: 'validation-error',
  BUILD_ERROR: 'build-error',
  LINT_ERROR: 'lint-error',
  TYPE_ERROR: 'type-error',
  DEPENDENCY_ERROR: 'dependency-error',
  CONFIGURATION_ERROR: 'configuration-error',
  RUNTIME_ERROR: 'runtime-error',
  UNKNOWN: 'unknown'
};

/**
 * Recovery action enum
 */
const RECOVERY_ACTION = {
  FIX_CODE: 'fix-code',
  UPDATE_TEST: 'update-test',
  INSTALL_DEPS: 'install-deps',
  UPDATE_CONFIG: 'update-config',
  ROLLBACK: 'rollback',
  MANUAL_REVIEW: 'manual-review',
  RETRY: 'retry'
};

/**
 * Error Recovery Handler
 */
class ErrorRecoveryHandler {
  /**
   * Create a new ErrorRecoveryHandler
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      storageDir: config.storageDir || 'storage/errors',
      maxHistorySize: config.maxHistorySize || 100,
      enableAutoAnalysis: config.enableAutoAnalysis !== false,
      ...config
    };

    this.errorHistory = [];
    this.recoveryPatterns = this.loadRecoveryPatterns();
  }

  /**
   * Load recovery patterns
   * @returns {Object} Recovery patterns
   */
  loadRecoveryPatterns() {
    return {
      [ERROR_CATEGORY.TEST_FAILURE]: {
        patterns: [
          { match: /expect.*toEqual/i, cause: 'Assertion mismatch', action: RECOVERY_ACTION.FIX_CODE },
          { match: /undefined is not/i, cause: 'Null reference', action: RECOVERY_ACTION.FIX_CODE },
          { match: /timeout/i, cause: 'Test timeout', action: RECOVERY_ACTION.UPDATE_TEST },
          { match: /cannot find module/i, cause: 'Missing import', action: RECOVERY_ACTION.INSTALL_DEPS }
        ],
        defaultAction: RECOVERY_ACTION.MANUAL_REVIEW
      },
      [ERROR_CATEGORY.VALIDATION_ERROR]: {
        patterns: [
          { match: /ears.*format/i, cause: 'EARS format violation', action: RECOVERY_ACTION.FIX_CODE },
          { match: /traceability/i, cause: 'Missing traceability', action: RECOVERY_ACTION.FIX_CODE },
          { match: /constitutional/i, cause: 'Constitutional violation', action: RECOVERY_ACTION.MANUAL_REVIEW }
        ],
        defaultAction: RECOVERY_ACTION.FIX_CODE
      },
      [ERROR_CATEGORY.BUILD_ERROR]: {
        patterns: [
          { match: /syntax.*error/i, cause: 'Syntax error', action: RECOVERY_ACTION.FIX_CODE },
          { match: /cannot resolve/i, cause: 'Module resolution failed', action: RECOVERY_ACTION.INSTALL_DEPS },
          { match: /out of memory/i, cause: 'Memory limit exceeded', action: RECOVERY_ACTION.UPDATE_CONFIG }
        ],
        defaultAction: RECOVERY_ACTION.FIX_CODE
      },
      [ERROR_CATEGORY.LINT_ERROR]: {
        patterns: [
          { match: /parsing error/i, cause: 'Parse error', action: RECOVERY_ACTION.FIX_CODE },
          { match: /no-unused/i, cause: 'Unused code', action: RECOVERY_ACTION.FIX_CODE },
          { match: /prefer-const/i, cause: 'Style violation', action: RECOVERY_ACTION.FIX_CODE }
        ],
        defaultAction: RECOVERY_ACTION.FIX_CODE
      },
      [ERROR_CATEGORY.TYPE_ERROR]: {
        patterns: [
          { match: /type.*not assignable/i, cause: 'Type mismatch', action: RECOVERY_ACTION.FIX_CODE },
          { match: /property.*does not exist/i, cause: 'Missing property', action: RECOVERY_ACTION.FIX_CODE },
          { match: /cannot find name/i, cause: 'Undefined identifier', action: RECOVERY_ACTION.FIX_CODE }
        ],
        defaultAction: RECOVERY_ACTION.FIX_CODE
      },
      [ERROR_CATEGORY.DEPENDENCY_ERROR]: {
        patterns: [
          { match: /peer dep/i, cause: 'Peer dependency conflict', action: RECOVERY_ACTION.INSTALL_DEPS },
          { match: /not found in npm registry/i, cause: 'Package not found', action: RECOVERY_ACTION.UPDATE_CONFIG },
          { match: /version.*incompatible/i, cause: 'Version conflict', action: RECOVERY_ACTION.INSTALL_DEPS }
        ],
        defaultAction: RECOVERY_ACTION.INSTALL_DEPS
      },
      [ERROR_CATEGORY.CONFIGURATION_ERROR]: {
        patterns: [
          { match: /invalid.*config/i, cause: 'Invalid configuration', action: RECOVERY_ACTION.UPDATE_CONFIG },
          { match: /missing.*required/i, cause: 'Missing required field', action: RECOVERY_ACTION.UPDATE_CONFIG }
        ],
        defaultAction: RECOVERY_ACTION.UPDATE_CONFIG
      },
      [ERROR_CATEGORY.RUNTIME_ERROR]: {
        patterns: [
          { match: /enoent/i, cause: 'File not found', action: RECOVERY_ACTION.FIX_CODE },
          { match: /eacces/i, cause: 'Permission denied', action: RECOVERY_ACTION.UPDATE_CONFIG },
          { match: /econnrefused/i, cause: 'Connection refused', action: RECOVERY_ACTION.RETRY }
        ],
        defaultAction: RECOVERY_ACTION.MANUAL_REVIEW
      }
    };
  }

  /**
   * Analyze error and provide recovery guidance
   * @param {Error|Object} error - Error object
   * @param {Object} context - Error context
   * @returns {Object} Analysis result with recovery guidance
   */
  analyze(error, context = {}) {
    const errorInfo = this.normalizeError(error);
    const category = this.categorizeError(errorInfo, context);
    const rootCause = this.identifyRootCause(errorInfo, category);
    const remediation = this.generateRemediation(category, rootCause, context);

    const analysis = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      error: errorInfo,
      category,
      rootCause,
      remediation,
      context,
      confidence: this.calculateConfidence(rootCause)
    };

    // Record in history
    this.recordError(analysis);

    return analysis;
  }

  /**
   * Normalize error object
   * @param {Error|Object} error - Error input
   * @returns {Object} Normalized error
   */
  normalizeError(error) {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: error.code
      };
    }
    return {
      message: error.message || String(error),
      name: error.name || 'Error',
      stack: error.stack || '',
      code: error.code || ''
    };
  }

  /**
   * Categorize error
   * @param {Object} errorInfo - Error info
   * @param {Object} context - Error context
   * @returns {string} Error category
   */
  categorizeError(errorInfo, context) {
    const message = errorInfo.message.toLowerCase();
    const name = errorInfo.name.toLowerCase();

    // Context-based categorization
    if (context.stage === 'test') return ERROR_CATEGORY.TEST_FAILURE;
    if (context.stage === 'validation') return ERROR_CATEGORY.VALIDATION_ERROR;
    if (context.stage === 'build') return ERROR_CATEGORY.BUILD_ERROR;
    if (context.stage === 'lint') return ERROR_CATEGORY.LINT_ERROR;

    // Message-based categorization
    if (message.includes('assert') || name.includes('assert')) return ERROR_CATEGORY.TEST_FAILURE;
    if (message.includes('type') || name.includes('type')) return ERROR_CATEGORY.TYPE_ERROR;
    if (message.includes('lint') || message.includes('eslint')) return ERROR_CATEGORY.LINT_ERROR;
    if (message.includes('dependency') || message.includes('npm') || message.includes('package')) {
      return ERROR_CATEGORY.DEPENDENCY_ERROR;
    }
    if (message.includes('config')) return ERROR_CATEGORY.CONFIGURATION_ERROR;
    if (message.includes('build') || message.includes('compile')) return ERROR_CATEGORY.BUILD_ERROR;
    if (errorInfo.code?.startsWith('E')) return ERROR_CATEGORY.RUNTIME_ERROR;

    return ERROR_CATEGORY.UNKNOWN;
  }

  /**
   * Identify root cause
   * @param {Object} errorInfo - Error info
   * @param {string} category - Error category
   * @returns {Object} Root cause analysis
   */
  identifyRootCause(errorInfo, category) {
    const patterns = this.recoveryPatterns[category];
    
    if (!patterns) {
      return {
        cause: 'Unknown error',
        action: RECOVERY_ACTION.MANUAL_REVIEW,
        matched: false
      };
    }

    const message = errorInfo.message;
    
    for (const pattern of patterns.patterns) {
      if (pattern.match.test(message)) {
        return {
          cause: pattern.cause,
          action: pattern.action,
          matched: true,
          pattern: pattern.match.toString()
        };
      }
    }

    return {
      cause: 'Unrecognized error pattern',
      action: patterns.defaultAction,
      matched: false
    };
  }

  /**
   * Generate remediation steps
   * @param {string} category - Error category
   * @param {Object} rootCause - Root cause info
   * @param {Object} context - Error context
   * @returns {Object} Remediation guidance
   */
  generateRemediation(category, rootCause, context) {
    const steps = [];
    const commands = [];

    switch (rootCause.action) {
      case RECOVERY_ACTION.FIX_CODE:
        steps.push('1. Locate the error in the source file');
        steps.push(`2. Fix the issue: ${rootCause.cause}`);
        steps.push('3. Run tests to verify the fix');
        if (context.file) {
          steps.push(`4. Target file: ${context.file}`);
        }
        commands.push('npm test');
        break;

      case RECOVERY_ACTION.UPDATE_TEST:
        steps.push('1. Review the failing test case');
        steps.push('2. Update test expectations if behavior changed');
        steps.push('3. Consider increasing timeout if needed');
        commands.push('npm test -- --verbose');
        break;

      case RECOVERY_ACTION.INSTALL_DEPS:
        steps.push('1. Check package.json for missing dependencies');
        steps.push('2. Run npm install to update packages');
        steps.push('3. Clear npm cache if issues persist');
        commands.push('npm install');
        commands.push('npm cache clean --force');
        break;

      case RECOVERY_ACTION.UPDATE_CONFIG:
        steps.push('1. Review configuration file');
        steps.push('2. Validate JSON/YAML syntax');
        steps.push('3. Check for missing required fields');
        break;

      case RECOVERY_ACTION.ROLLBACK:
        steps.push('1. Identify the last known good state');
        steps.push('2. Use rollback manager to revert changes');
        steps.push('3. Verify system stability after rollback');
        commands.push('git log --oneline -10');
        break;

      case RECOVERY_ACTION.RETRY:
        steps.push('1. Wait a moment and retry the operation');
        steps.push('2. Check network connectivity');
        steps.push('3. Verify external service availability');
        break;

      case RECOVERY_ACTION.MANUAL_REVIEW:
      default:
        steps.push('1. Review the error message and stack trace');
        steps.push('2. Search for similar issues in documentation');
        steps.push('3. Consult with team if needed');
        break;
    }

    return {
      action: rootCause.action,
      steps,
      commands,
      estimatedTime: this.estimateRecoveryTime(rootCause.action),
      priority: this.determinePriority(category, context)
    };
  }

  /**
   * Estimate recovery time
   * @param {string} action - Recovery action
   * @returns {string} Time estimate
   */
  estimateRecoveryTime(action) {
    const estimates = {
      [RECOVERY_ACTION.FIX_CODE]: '15-30 minutes',
      [RECOVERY_ACTION.UPDATE_TEST]: '10-20 minutes',
      [RECOVERY_ACTION.INSTALL_DEPS]: '5-10 minutes',
      [RECOVERY_ACTION.UPDATE_CONFIG]: '5-15 minutes',
      [RECOVERY_ACTION.ROLLBACK]: '10-30 minutes',
      [RECOVERY_ACTION.RETRY]: '1-5 minutes',
      [RECOVERY_ACTION.MANUAL_REVIEW]: '30-60 minutes'
    };
    return estimates[action] || 'Unknown';
  }

  /**
   * Determine priority
   * @param {string} category - Error category
   * @param {Object} context - Context
   * @returns {string} Priority level
   */
  determinePriority(category, context) {
    if (context.blocking) return 'critical';
    
    const highPriority = [ERROR_CATEGORY.BUILD_ERROR, ERROR_CATEGORY.TEST_FAILURE];
    const mediumPriority = [ERROR_CATEGORY.TYPE_ERROR, ERROR_CATEGORY.LINT_ERROR];
    
    if (highPriority.includes(category)) return 'high';
    if (mediumPriority.includes(category)) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence score
   * @param {Object} rootCause - Root cause info
   * @returns {number} Confidence (0-1)
   */
  calculateConfidence(rootCause) {
    if (rootCause.matched) return 0.9;
    return 0.5;
  }

  /**
   * Record error in history
   * @param {Object} analysis - Error analysis
   */
  recordError(analysis) {
    this.errorHistory.unshift(analysis);
    
    // Trim history
    if (this.errorHistory.length > this.config.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.config.maxHistorySize);
    }
  }

  /**
   * Get error history
   * @param {Object} filter - Filter options
   * @returns {Array} Filtered history
   */
  getHistory(filter = {}) {
    let history = [...this.errorHistory];

    if (filter.category) {
      history = history.filter(e => e.category === filter.category);
    }
    if (filter.since) {
      const since = new Date(filter.since);
      history = history.filter(e => new Date(e.timestamp) >= since);
    }
    if (filter.limit) {
      history = history.slice(0, filter.limit);
    }

    return history;
  }

  /**
   * Save error analysis to file
   * @param {Object} analysis - Error analysis
   * @returns {Promise<string>} File path
   */
  async saveAnalysis(analysis) {
    await this.ensureStorageDir();
    
    const fileName = `error-${analysis.id}.json`;
    const filePath = path.join(this.config.storageDir, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(analysis, null, 2), 'utf-8');
    return filePath;
  }

  /**
   * Load error analysis from file
   * @param {string} id - Error ID
   * @returns {Promise<Object|null>} Analysis or null
   */
  async loadAnalysis(id) {
    const fileName = `error-${id}.json`;
    const filePath = path.join(this.config.storageDir, fileName);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Ensure storage directory exists
   * @returns {Promise<void>}
   */
  async ensureStorageDir() {
    await fs.mkdir(this.config.storageDir, { recursive: true });
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate recovery report
   * @param {Object} analysis - Error analysis
   * @returns {string} Markdown report
   */
  generateReport(analysis) {
    const lines = [];

    lines.push('# Error Recovery Report');
    lines.push('');
    lines.push(`**Error ID**: ${analysis.id}`);
    lines.push(`**Timestamp**: ${analysis.timestamp}`);
    lines.push(`**Category**: ${analysis.category}`);
    lines.push(`**Confidence**: ${(analysis.confidence * 100).toFixed(0)}%`);
    lines.push('');

    lines.push('## Error Details');
    lines.push('');
    lines.push(`**Name**: ${analysis.error.name}`);
    lines.push(`**Message**: ${analysis.error.message}`);
    lines.push('');

    lines.push('## Root Cause Analysis');
    lines.push('');
    lines.push(`**Identified Cause**: ${analysis.rootCause.cause}`);
    lines.push(`**Pattern Matched**: ${analysis.rootCause.matched ? 'Yes' : 'No'}`);
    lines.push('');

    lines.push('## Remediation');
    lines.push('');
    lines.push(`**Recommended Action**: ${analysis.remediation.action}`);
    lines.push(`**Priority**: ${analysis.remediation.priority}`);
    lines.push(`**Estimated Time**: ${analysis.remediation.estimatedTime}`);
    lines.push('');

    lines.push('### Steps');
    lines.push('');
    for (const step of analysis.remediation.steps) {
      lines.push(step);
    }
    lines.push('');

    if (analysis.remediation.commands.length > 0) {
      lines.push('### Commands');
      lines.push('');
      lines.push('```bash');
      for (const cmd of analysis.remediation.commands) {
        lines.push(cmd);
      }
      lines.push('```');
    }

    return lines.join('\n');
  }
}

/**
 * Create a new ErrorRecoveryHandler instance
 * @param {Object} config - Configuration options
 * @returns {ErrorRecoveryHandler}
 */
function createErrorRecoveryHandler(config = {}) {
  return new ErrorRecoveryHandler(config);
}

module.exports = {
  ErrorRecoveryHandler,
  createErrorRecoveryHandler,
  ERROR_CATEGORY,
  RECOVERY_ACTION
};
