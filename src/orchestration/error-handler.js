/**
 * ErrorHandler - Comprehensive error handling patterns
 * Sprint 3.5: Advanced Workflows
 * 
 * Provides:
 * - Error classification and categorization
 * - Recovery strategies
 * - Error aggregation and reporting
 * - Circuit breaker pattern
 * - Graceful degradation
 */

const EventEmitter = require('events');

/**
 * Error severity levels
 */
const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Error categories
 */
const ErrorCategory = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  RATE_LIMIT: 'rate-limit',
  RESOURCE_NOT_FOUND: 'resource-not-found',
  CONFLICT: 'conflict',
  INTERNAL: 'internal',
  EXTERNAL_SERVICE: 'external-service',
  CONFIGURATION: 'configuration',
  USER_INPUT: 'user-input',
  UNKNOWN: 'unknown'
};

/**
 * Circuit breaker states
 */
const CircuitState = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half-open'
};

/**
 * Enhanced error with metadata
 */
class WorkflowError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'WorkflowError';
    this.code = options.code || 'WORKFLOW_ERROR';
    this.category = options.category || ErrorCategory.UNKNOWN;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.recoverable = options.recoverable !== false;
    this.retryable = options.retryable || false;
    this.context = options.context || {};
    this.cause = options.cause || null;
    this.timestamp = new Date().toISOString();
    this.suggestions = options.suggestions || [];
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      retryable: this.retryable,
      context: this.context,
      timestamp: this.timestamp,
      suggestions: this.suggestions,
      stack: this.stack
    };
  }
}

/**
 * Error classifier - categorizes errors based on patterns
 */
class ErrorClassifier {
  constructor() {
    this.patterns = this._initializePatterns();
  }

  _initializePatterns() {
    return [
      // Network errors
      {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        patterns: [
          /ECONNREFUSED/i,
          /ECONNRESET/i,
          /ENOTFOUND/i,
          /network/i,
          /connection failed/i,
          /socket hang up/i
        ]
      },
      // Timeout errors
      {
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        patterns: [
          /timeout/i,
          /ETIMEDOUT/i,
          /timed out/i,
          /deadline exceeded/i
        ]
      },
      // Rate limit errors
      {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.LOW,
        retryable: true,
        patterns: [
          /rate limit/i,
          /too many requests/i,
          /429/,
          /throttl/i
        ]
      },
      // Authentication errors
      {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        patterns: [
          /unauthorized/i,
          /authentication failed/i,
          /invalid token/i,
          /401/,
          /not authenticated/i
        ]
      },
      // Authorization errors
      {
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        patterns: [
          /forbidden/i,
          /access denied/i,
          /permission denied/i,
          /403/,
          /not authorized/i
        ]
      },
      // Resource not found
      {
        category: ErrorCategory.RESOURCE_NOT_FOUND,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        patterns: [
          /not found/i,
          /404/,
          /does not exist/i,
          /no such/i
        ]
      },
      // Validation errors
      {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
        patterns: [
          /validation/i,
          /invalid/i,
          /required field/i,
          /must be/i,
          /expected/i
        ]
      },
      // Conflict errors
      {
        category: ErrorCategory.CONFLICT,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        patterns: [
          /conflict/i,
          /already exists/i,
          /duplicate/i,
          /409/
        ]
      },
      // Configuration errors
      {
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        patterns: [
          /configuration/i,
          /config/i,
          /missing setting/i,
          /not configured/i
        ]
      }
    ];
  }

  /**
   * Classify an error
   */
  classify(error) {
    const errorString = `${error.message} ${error.code || ''} ${error.name || ''}`;
    
    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(errorString)) {
          return {
            category: pattern.category,
            severity: pattern.severity,
            retryable: pattern.retryable,
            recoverable: pattern.severity !== ErrorSeverity.CRITICAL
          };
        }
      }
    }

    return {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      recoverable: true
    };
  }

  /**
   * Enhance an error with classification metadata
   */
  enhance(error) {
    if (error instanceof WorkflowError) {
      return error;
    }

    const classification = this.classify(error);
    
    return new WorkflowError(error.message, {
      code: error.code || 'UNKNOWN_ERROR',
      category: classification.category,
      severity: classification.severity,
      retryable: classification.retryable,
      recoverable: classification.recoverable,
      cause: error,
      context: { originalName: error.name }
    });
  }

  /**
   * Add custom pattern
   */
  addPattern(pattern) {
    this.patterns.unshift(pattern); // Add to beginning for priority
  }
}

/**
 * Circuit breaker for protecting against cascading failures
 */
class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 30000; // 30 seconds
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 1;

    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn) {
    if (this.state === CircuitState.OPEN) {
      // Check if we should transition to half-open
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this._transitionTo(CircuitState.HALF_OPEN);
      } else {
        throw new WorkflowError('Circuit breaker is open', {
          code: 'CIRCUIT_OPEN',
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.HIGH,
          retryable: true,
          context: { circuitName: this.name }
        });
      }
    }

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        throw new WorkflowError('Circuit breaker half-open limit reached', {
          code: 'CIRCUIT_HALF_OPEN_LIMIT',
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.MEDIUM,
          retryable: true
        });
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  _onSuccess() {
    this.failures = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this._transitionTo(CircuitState.CLOSED);
      }
    }
  }

  _onFailure(error) {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successes = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this._transitionTo(CircuitState.OPEN);
    } else if (this.failures >= this.failureThreshold) {
      this._transitionTo(CircuitState.OPEN);
    }

    this.emit('failure', { error, failures: this.failures });
  }

  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    
    if (newState === CircuitState.CLOSED) {
      this.failures = 0;
      this.successes = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.halfOpenCalls = 0;
      this.successes = 0;
    }

    this.emit('state-change', { from: oldState, to: newState });
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset() {
    this._transitionTo(CircuitState.CLOSED);
  }
}

/**
 * Error aggregator for collecting and analyzing errors
 */
class ErrorAggregator {
  constructor(options = {}) {
    this.maxErrors = options.maxErrors || 1000;
    this.errors = [];
    this.categoryCounts = new Map();
    this.severityCounts = new Map();
  }

  /**
   * Add an error to the aggregator
   */
  add(error, context = {}) {
    const enhanced = error instanceof WorkflowError ? error : 
      new ErrorClassifier().enhance(error);

    const entry = {
      error: enhanced.toJSON(),
      context,
      timestamp: new Date().toISOString()
    };

    this.errors.push(entry);
    
    // Trim if necessary
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Update counts
    this._incrementCount(this.categoryCounts, enhanced.category);
    this._incrementCount(this.severityCounts, enhanced.severity);

    return entry;
  }

  _incrementCount(map, key) {
    map.set(key, (map.get(key) || 0) + 1);
  }

  /**
   * Get error statistics
   */
  getStats() {
    return {
      totalErrors: this.errors.length,
      byCategory: Object.fromEntries(this.categoryCounts),
      bySeverity: Object.fromEntries(this.severityCounts),
      recentErrors: this.errors.slice(-10),
      mostCommonCategory: this._getMostCommon(this.categoryCounts),
      criticalCount: this.severityCounts.get(ErrorSeverity.CRITICAL) || 0
    };
  }

  _getMostCommon(map) {
    let maxKey = null;
    let maxCount = 0;
    for (const [key, count] of map) {
      if (count > maxCount) {
        maxKey = key;
        maxCount = count;
      }
    }
    return maxKey;
  }

  /**
   * Get errors by category
   */
  getByCategory(category) {
    return this.errors.filter(e => e.error.category === category);
  }

  /**
   * Get errors by severity
   */
  getBySeverity(severity) {
    return this.errors.filter(e => e.error.severity === severity);
  }

  /**
   * Get retryable errors
   */
  getRetryable() {
    return this.errors.filter(e => e.error.retryable);
  }

  /**
   * Clear all errors
   */
  clear() {
    this.errors = [];
    this.categoryCounts.clear();
    this.severityCounts.clear();
  }

  /**
   * Generate error report
   */
  generateReport() {
    const stats = this.getStats();
    
    return {
      summary: {
        total: stats.totalErrors,
        critical: stats.criticalCount,
        mostCommonCategory: stats.mostCommonCategory
      },
      breakdown: {
        byCategory: stats.byCategory,
        bySeverity: stats.bySeverity
      },
      recentErrors: stats.recentErrors.map(e => ({
        message: e.error.message,
        category: e.error.category,
        severity: e.error.severity,
        timestamp: e.timestamp
      })),
      recommendations: this._generateRecommendations(stats)
    };
  }

  _generateRecommendations(stats) {
    const recommendations = [];

    if (stats.criticalCount > 0) {
      recommendations.push({
        priority: 'high',
        message: `${stats.criticalCount} critical errors require immediate attention`
      });
    }

    const networkErrors = this.categoryCounts.get(ErrorCategory.NETWORK) || 0;
    if (networkErrors > 5) {
      recommendations.push({
        priority: 'medium',
        message: 'Multiple network errors detected. Check connectivity and service availability.'
      });
    }

    const authErrors = this.categoryCounts.get(ErrorCategory.AUTHENTICATION) || 0;
    if (authErrors > 0) {
      recommendations.push({
        priority: 'high',
        message: 'Authentication errors detected. Verify credentials and tokens.'
      });
    }

    const rateLimitErrors = this.categoryCounts.get(ErrorCategory.RATE_LIMIT) || 0;
    if (rateLimitErrors > 3) {
      recommendations.push({
        priority: 'medium',
        message: 'Rate limiting detected. Consider implementing backoff or reducing request frequency.'
      });
    }

    return recommendations;
  }
}

/**
 * Graceful degradation manager
 */
class GracefulDegradation {
  constructor() {
    this.fallbacks = new Map();
    this.degradedServices = new Set();
  }

  /**
   * Register a fallback for a service
   */
  registerFallback(serviceName, fallbackFn, options = {}) {
    this.fallbacks.set(serviceName, {
      fn: fallbackFn,
      ttl: options.ttl || 60000, // 1 minute default cache
      lastResult: null,
      lastResultTime: null
    });
  }

  /**
   * Execute with graceful degradation
   */
  async execute(serviceName, primaryFn, _options = {}) {
    try {
      const result = await primaryFn();
      
      // Service recovered
      if (this.degradedServices.has(serviceName)) {
        this.degradedServices.delete(serviceName);
      }
      
      // Cache successful result for fallback
      const fallback = this.fallbacks.get(serviceName);
      if (fallback) {
        fallback.lastResult = result;
        fallback.lastResultTime = Date.now();
      }
      
      return { result, degraded: false };
      
    } catch (error) {
      const fallback = this.fallbacks.get(serviceName);
      
      if (!fallback) {
        throw error;
      }

      this.degradedServices.add(serviceName);

      // Try cached result first
      if (fallback.lastResult && 
          (Date.now() - fallback.lastResultTime) < fallback.ttl) {
        return {
          result: fallback.lastResult,
          degraded: true,
          source: 'cache',
          error: error.message
        };
      }

      // Execute fallback function
      try {
        const fallbackResult = await fallback.fn(error);
        return {
          result: fallbackResult,
          degraded: true,
          source: 'fallback',
          error: error.message
        };
      } catch (fallbackError) {
        // Both primary and fallback failed
        throw new WorkflowError('Primary and fallback both failed', {
          code: 'DEGRADATION_FAILED',
          category: ErrorCategory.INTERNAL,
          severity: ErrorSeverity.CRITICAL,
          cause: error,
          context: {
            serviceName,
            primaryError: error.message,
            fallbackError: fallbackError.message
          }
        });
      }
    }
  }

  /**
   * Get degraded services
   */
  getDegradedServices() {
    return [...this.degradedServices];
  }

  /**
   * Check if service is degraded
   */
  isDegraded(serviceName) {
    return this.degradedServices.has(serviceName);
  }
}

/**
 * Main error handler combining all strategies
 */
class ErrorHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.classifier = new ErrorClassifier();
    this.aggregator = new ErrorAggregator(options.aggregator);
    this.degradation = new GracefulDegradation();
    this.circuitBreakers = new Map();
    this.globalRetryPolicy = options.retryPolicy || {
      maxRetries: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
      maxBackoffMs: 30000
    };
  }

  /**
   * Get or create circuit breaker for a service
   */
  getCircuitBreaker(serviceName, options = {}) {
    if (!this.circuitBreakers.has(serviceName)) {
      const breaker = new CircuitBreaker({ name: serviceName, ...options });
      breaker.on('state-change', (event) => {
        this.emit('circuit-state-change', { service: serviceName, ...event });
      });
      this.circuitBreakers.set(serviceName, breaker);
    }
    return this.circuitBreakers.get(serviceName);
  }

  /**
   * Handle an error with full error handling pipeline
   */
  handle(error, context = {}) {
    // Classify and enhance error
    const enhanced = this.classifier.enhance(error);
    
    // Add to aggregator
    this.aggregator.add(enhanced, context);
    
    // Emit error event
    this.emit('error', { error: enhanced, context });

    // Log based on severity
    this._logError(enhanced, context);

    // Return enhanced error with handling suggestions
    return {
      error: enhanced,
      handled: true,
      suggestions: this._getSuggestions(enhanced)
    };
  }

  _logError(error, context) {
    const logData = {
      message: error.message,
      category: error.category,
      severity: error.severity,
      context: { ...error.context, ...context }
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('[CRITICAL]', JSON.stringify(logData));
        break;
      case ErrorSeverity.HIGH:
        console.error('[ERROR]', JSON.stringify(logData));
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('[WARN]', JSON.stringify(logData));
        break;
      default:
        console.info('[INFO]', JSON.stringify(logData));
    }
  }

  _getSuggestions(error) {
    const suggestions = [...(error.suggestions || [])];

    switch (error.category) {
      case ErrorCategory.NETWORK:
        suggestions.push('Check network connectivity');
        suggestions.push('Verify service endpoints are accessible');
        break;
      case ErrorCategory.AUTHENTICATION:
        suggestions.push('Verify credentials are correct');
        suggestions.push('Check if tokens have expired');
        break;
      case ErrorCategory.RATE_LIMIT:
        suggestions.push('Implement exponential backoff');
        suggestions.push('Consider caching responses');
        break;
      case ErrorCategory.TIMEOUT:
        suggestions.push('Increase timeout values');
        suggestions.push('Consider breaking operation into smaller chunks');
        break;
      case ErrorCategory.CONFIGURATION:
        suggestions.push('Review configuration settings');
        suggestions.push('Check environment variables');
        break;
    }

    if (error.retryable) {
      suggestions.push('This error may be resolved by retrying');
    }

    return suggestions;
  }

  /**
   * Execute with retry
   */
  async executeWithRetry(fn, options = {}) {
    const policy = { ...this.globalRetryPolicy, ...options };
    let lastError;
    let currentBackoff = policy.backoffMs;

    for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const enhanced = this.classifier.enhance(error);

        if (!enhanced.retryable || attempt >= policy.maxRetries) {
          await this.handle(enhanced, { attempt, maxRetries: policy.maxRetries });
          throw enhanced;
        }

        this.emit('retry', { 
          attempt: attempt + 1, 
          maxRetries: policy.maxRetries,
          backoffMs: currentBackoff,
          error: enhanced.message
        });

        await this._sleep(currentBackoff);
        currentBackoff = Math.min(
          currentBackoff * policy.backoffMultiplier,
          policy.maxBackoffMs
        );
      }
    }

    throw lastError;
  }

  /**
   * Get error report
   */
  getReport() {
    return {
      ...this.aggregator.generateReport(),
      circuitBreakers: Object.fromEntries(
        [...this.circuitBreakers].map(([name, breaker]) => [name, breaker.getState()])
      ),
      degradedServices: this.degradation.getDegradedServices()
    };
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = {
  ErrorHandler,
  ErrorClassifier,
  ErrorAggregator,
  CircuitBreaker,
  GracefulDegradation,
  WorkflowError,
  ErrorSeverity,
  ErrorCategory,
  CircuitState
};
