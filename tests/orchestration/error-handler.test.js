/**
 * Tests for ErrorHandler
 * Sprint 3.5: Advanced Workflows
 */

const {
  ErrorHandler,
  ErrorClassifier,
  ErrorAggregator,
  CircuitBreaker,
  GracefulDegradation,
  WorkflowError,
  ErrorSeverity,
  ErrorCategory,
  CircuitState
} = require('../../src/orchestration/error-handler');

// Suppress console output during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.info = originalConsoleInfo;
});

describe('WorkflowError', () => {
  test('should create error with default values', () => {
    const error = new WorkflowError('Test error');
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('WORKFLOW_ERROR');
    expect(error.category).toBe(ErrorCategory.UNKNOWN);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.recoverable).toBe(true);
    expect(error.retryable).toBe(false);
  });

  test('should create error with custom options', () => {
    const error = new WorkflowError('Custom error', {
      code: 'CUSTOM_ERROR',
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      context: { key: 'value' },
      suggestions: ['Try again']
    });
    
    expect(error.code).toBe('CUSTOM_ERROR');
    expect(error.category).toBe(ErrorCategory.NETWORK);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.retryable).toBe(true);
    expect(error.context).toEqual({ key: 'value' });
    expect(error.suggestions).toContain('Try again');
  });

  test('should serialize to JSON', () => {
    const error = new WorkflowError('JSON error', {
      code: 'JSON_ERR',
      category: ErrorCategory.VALIDATION
    });
    
    const json = error.toJSON();
    
    expect(json.name).toBe('WorkflowError');
    expect(json.message).toBe('JSON error');
    expect(json.code).toBe('JSON_ERR');
    expect(json.category).toBe('validation');
    expect(json.timestamp).toBeDefined();
  });
});

describe('ErrorClassifier', () => {
  let classifier;

  beforeEach(() => {
    classifier = new ErrorClassifier();
  });

  describe('classify', () => {
    test('should classify network errors', () => {
      const error = new Error('ECONNREFUSED connection failed');
      const classification = classifier.classify(error);
      
      expect(classification.category).toBe(ErrorCategory.NETWORK);
      expect(classification.retryable).toBe(true);
    });

    test('should classify timeout errors', () => {
      const error = new Error('Request timeout exceeded');
      const classification = classifier.classify(error);
      
      expect(classification.category).toBe(ErrorCategory.TIMEOUT);
      expect(classification.retryable).toBe(true);
    });

    test('should classify rate limit errors', () => {
      const error = new Error('Rate limit exceeded - 429');
      const classification = classifier.classify(error);
      
      expect(classification.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(classification.retryable).toBe(true);
    });

    test('should classify authentication errors', () => {
      const error = new Error('401 Unauthorized - invalid token');
      const classification = classifier.classify(error);
      
      expect(classification.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(classification.retryable).toBe(false);
    });

    test('should classify authorization errors', () => {
      const error = new Error('403 Forbidden - access denied');
      const classification = classifier.classify(error);
      
      expect(classification.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(classification.retryable).toBe(false);
    });

    test('should classify not found errors', () => {
      const error = new Error('Resource not found - 404');
      const classification = classifier.classify(error);
      
      expect(classification.category).toBe(ErrorCategory.RESOURCE_NOT_FOUND);
      expect(classification.retryable).toBe(false);
    });

    test('should classify validation errors', () => {
      const error = new Error('Validation failed: required field missing');
      const classification = classifier.classify(error);
      
      expect(classification.category).toBe(ErrorCategory.VALIDATION);
      expect(classification.severity).toBe(ErrorSeverity.LOW);
    });

    test('should classify conflict errors', () => {
      const error = new Error('409 Conflict - resource already exists');
      const classification = classifier.classify(error);
      
      expect(classification.category).toBe(ErrorCategory.CONFLICT);
    });

    test('should classify configuration errors', () => {
      const error = new Error('Service not configured properly');
      const classification = classifier.classify(error);
      
      expect(classification.category).toBe(ErrorCategory.CONFIGURATION);
      expect(classification.severity).toBe(ErrorSeverity.HIGH);
    });

    test('should return unknown for unrecognized errors', () => {
      const error = new Error('xyz123abc random gibberish xyz789');
      const classification = classifier.classify(error);
      
      expect(classification.category).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('enhance', () => {
    test('should enhance plain error to WorkflowError', () => {
      const plainError = new Error('Network connection failed');
      const enhanced = classifier.enhance(plainError);
      
      expect(enhanced).toBeInstanceOf(WorkflowError);
      expect(enhanced.category).toBe(ErrorCategory.NETWORK);
      expect(enhanced.cause).toBe(plainError);
    });

    test('should return WorkflowError unchanged', () => {
      const workflowError = new WorkflowError('Already enhanced', {
        category: ErrorCategory.INTERNAL
      });
      const result = classifier.enhance(workflowError);
      
      expect(result).toBe(workflowError);
    });
  });

  describe('addPattern', () => {
    test('should add custom pattern with priority', () => {
      classifier.addPattern({
        category: 'custom-category',
        severity: ErrorSeverity.CRITICAL,
        retryable: false,
        patterns: [/CUSTOM_ERR/i]
      });

      const error = new Error('CUSTOM_ERR: Something custom happened');
      const classification = classifier.classify(error);
      
      expect(classification.category).toBe('custom-category');
      expect(classification.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });
});

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test-service',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100
    });
  });

  test('should start in closed state', () => {
    expect(breaker.getState().state).toBe(CircuitState.CLOSED);
  });

  test('should execute function successfully when closed', async () => {
    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');
  });

  test('should open after reaching failure threshold', async () => {
    const failingFn = async () => { throw new Error('fail'); };

    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(failingFn);
      } catch (e) {
        // Expected
      }
    }

    expect(breaker.getState().state).toBe(CircuitState.OPEN);
  });

  test('should throw when circuit is open', async () => {
    // Force open
    breaker.state = CircuitState.OPEN;
    breaker.lastFailureTime = Date.now();

    await expect(breaker.execute(async () => 'test')).rejects.toThrow('Circuit breaker is open');
  });

  test('should transition to half-open after timeout', async () => {
    // Force open with old failure time
    breaker.state = CircuitState.OPEN;
    breaker.lastFailureTime = Date.now() - 200; // Older than timeout

    // Should transition to half-open and execute
    const result = await breaker.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(breaker.getState().state).toBe(CircuitState.HALF_OPEN);
  });

  test('should close after success threshold in half-open', async () => {
    // Create breaker with higher halfOpenMaxCalls
    breaker = new CircuitBreaker({
      name: 'test-service',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100,
      halfOpenMaxCalls: 5
    });
    
    breaker.state = CircuitState.HALF_OPEN;
    breaker.halfOpenCalls = 0;

    await breaker.execute(async () => 'success1');
    await breaker.execute(async () => 'success2');

    expect(breaker.getState().state).toBe(CircuitState.CLOSED);
  });

  test('should emit state-change event', async () => {
    let stateChange = null;
    breaker.on('state-change', (event) => {
      stateChange = event;
    });

    // Trigger failures to open circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => { throw new Error('fail'); });
      } catch (e) {
        // Expected
      }
    }

    expect(stateChange).toEqual({ from: CircuitState.CLOSED, to: CircuitState.OPEN });
  });

  test('should reset circuit breaker', () => {
    breaker.state = CircuitState.OPEN;
    breaker.failures = 10;

    breaker.reset();

    expect(breaker.getState().state).toBe(CircuitState.CLOSED);
    expect(breaker.failures).toBe(0);
  });
});

describe('ErrorAggregator', () => {
  let aggregator;

  beforeEach(() => {
    aggregator = new ErrorAggregator({ maxErrors: 100 });
  });

  test('should add and track errors', () => {
    const error = new WorkflowError('Test error', { category: ErrorCategory.NETWORK });
    
    aggregator.add(error, { step: 'step1' });
    
    const stats = aggregator.getStats();
    expect(stats.totalErrors).toBe(1);
  });

  test('should enhance plain errors', () => {
    const plainError = new Error('Connection timeout');
    
    aggregator.add(plainError);
    
    const stats = aggregator.getStats();
    expect(stats.byCategory[ErrorCategory.TIMEOUT]).toBe(1);
  });

  test('should count errors by category', () => {
    aggregator.add(new WorkflowError('Error 1', { category: ErrorCategory.NETWORK }));
    aggregator.add(new WorkflowError('Error 2', { category: ErrorCategory.NETWORK }));
    aggregator.add(new WorkflowError('Error 3', { category: ErrorCategory.TIMEOUT }));
    
    const stats = aggregator.getStats();
    expect(stats.byCategory[ErrorCategory.NETWORK]).toBe(2);
    expect(stats.byCategory[ErrorCategory.TIMEOUT]).toBe(1);
  });

  test('should count errors by severity', () => {
    aggregator.add(new WorkflowError('Error 1', { severity: ErrorSeverity.HIGH }));
    aggregator.add(new WorkflowError('Error 2', { severity: ErrorSeverity.HIGH }));
    aggregator.add(new WorkflowError('Error 3', { severity: ErrorSeverity.CRITICAL }));
    
    const stats = aggregator.getStats();
    expect(stats.bySeverity[ErrorSeverity.HIGH]).toBe(2);
    expect(stats.criticalCount).toBe(1);
  });

  test('should limit stored errors', () => {
    const agg = new ErrorAggregator({ maxErrors: 5 });
    
    for (let i = 0; i < 10; i++) {
      agg.add(new WorkflowError(`Error ${i}`));
    }
    
    const stats = agg.getStats();
    expect(stats.totalErrors).toBe(5);
    expect(stats.recentErrors[0].error.message).toBe('Error 5');
  });

  test('should get errors by category', () => {
    aggregator.add(new WorkflowError('Network 1', { category: ErrorCategory.NETWORK }));
    aggregator.add(new WorkflowError('Auth 1', { category: ErrorCategory.AUTHENTICATION }));
    
    const networkErrors = aggregator.getByCategory(ErrorCategory.NETWORK);
    expect(networkErrors).toHaveLength(1);
    expect(networkErrors[0].error.message).toBe('Network 1');
  });

  test('should get retryable errors', () => {
    aggregator.add(new WorkflowError('Retryable', { retryable: true }));
    aggregator.add(new WorkflowError('Not retryable', { retryable: false }));
    
    const retryable = aggregator.getRetryable();
    expect(retryable).toHaveLength(1);
  });

  test('should generate report with recommendations', () => {
    aggregator.add(new WorkflowError('Critical!', { 
      severity: ErrorSeverity.CRITICAL 
    }));
    aggregator.add(new WorkflowError('Auth fail', { 
      category: ErrorCategory.AUTHENTICATION 
    }));
    
    for (let i = 0; i < 6; i++) {
      aggregator.add(new WorkflowError('Network', { 
        category: ErrorCategory.NETWORK 
      }));
    }
    
    const report = aggregator.generateReport();
    
    expect(report.summary.critical).toBe(1);
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations.some(r => r.message.includes('critical'))).toBe(true);
    expect(report.recommendations.some(r => r.message.includes('Authentication'))).toBe(true);
    expect(report.recommendations.some(r => r.message.includes('network'))).toBe(true);
  });

  test('should clear all errors', () => {
    aggregator.add(new WorkflowError('Error 1'));
    aggregator.add(new WorkflowError('Error 2'));
    
    aggregator.clear();
    
    const stats = aggregator.getStats();
    expect(stats.totalErrors).toBe(0);
  });
});

describe('GracefulDegradation', () => {
  let degradation;

  beforeEach(() => {
    degradation = new GracefulDegradation();
  });

  test('should return primary result when successful', async () => {
    const result = await degradation.execute(
      'test-service',
      async () => 'primary-result'
    );
    
    expect(result.result).toBe('primary-result');
    expect(result.degraded).toBe(false);
  });

  test('should use fallback when primary fails', async () => {
    degradation.registerFallback('test-service', async () => 'fallback-result');
    
    const result = await degradation.execute(
      'test-service',
      async () => { throw new Error('Primary failed'); }
    );
    
    expect(result.result).toBe('fallback-result');
    expect(result.degraded).toBe(true);
    expect(result.source).toBe('fallback');
  });

  test('should use cached result when available', async () => {
    degradation.registerFallback('test-service', async () => 'fallback', { ttl: 5000 });
    
    // First call succeeds
    await degradation.execute('test-service', async () => 'cached-value');
    
    // Second call fails but uses cache
    const result = await degradation.execute(
      'test-service',
      async () => { throw new Error('Failed'); }
    );
    
    expect(result.result).toBe('cached-value');
    expect(result.source).toBe('cache');
  });

  test('should throw when both primary and fallback fail', async () => {
    degradation.registerFallback('test-service', async () => {
      throw new Error('Fallback also failed');
    });
    
    await expect(
      degradation.execute('test-service', async () => {
        throw new Error('Primary failed');
      })
    ).rejects.toThrow('Primary and fallback both failed');
  });

  test('should track degraded services', async () => {
    degradation.registerFallback('service-a', async () => 'fallback');
    degradation.registerFallback('service-b', async () => 'fallback');
    
    await degradation.execute('service-a', async () => { throw new Error(); });
    
    expect(degradation.isDegraded('service-a')).toBe(true);
    expect(degradation.isDegraded('service-b')).toBe(false);
    expect(degradation.getDegradedServices()).toContain('service-a');
  });

  test('should recover when service starts working', async () => {
    degradation.registerFallback('test-service', async () => 'fallback');
    
    // Fail first
    await degradation.execute('test-service', async () => { throw new Error(); });
    expect(degradation.isDegraded('test-service')).toBe(true);
    
    // Succeed
    await degradation.execute('test-service', async () => 'success');
    expect(degradation.isDegraded('test-service')).toBe(false);
  });
});

describe('ErrorHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new ErrorHandler();
    // Add error listener to prevent EventEmitter from throwing
    handler.on('error', () => {});
  });

  test('should handle and classify errors', () => {
    const error = new Error('Connection timeout');
    
    const result = handler.handle(error, { step: 'step1' });
    
    expect(result.handled).toBe(true);
    expect(result.error.category).toBe(ErrorCategory.TIMEOUT);
  });

  test('should emit error event', () => {
    let emittedError = null;
    handler.on('error', ({ error }) => {
      emittedError = error;
    });

    handler.handle(new Error('Test error'));
    
    expect(emittedError).not.toBeNull();
  });

  test('should provide suggestions based on category', () => {
    const networkError = new Error('ECONNREFUSED');
    const result = handler.handle(networkError);
    
    expect(result.suggestions.some(s => s.includes('connectivity'))).toBe(true);
  });

  test('should manage circuit breakers', () => {
    const breaker1 = handler.getCircuitBreaker('service-1');
    const breaker2 = handler.getCircuitBreaker('service-1');
    
    expect(breaker1).toBe(breaker2); // Same instance
    expect(breaker1.name).toBe('service-1');
  });

  test('should execute with retry', async () => {
    let attempts = 0;
    
    const result = await handler.executeWithRetry(
      async () => {
        attempts++;
        if (attempts < 2) {
          const err = new Error('Temporary network error');
          throw err;
        }
        return 'success';
      },
      { maxRetries: 3, backoffMs: 10 }
    );
    
    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  test('should emit retry events', async () => {
    const retryEvents = [];
    handler.on('retry', (event) => retryEvents.push(event));

    let attempts = 0;
    await handler.executeWithRetry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network timeout');
        }
        return 'done';
      },
      { maxRetries: 3, backoffMs: 10 }
    );
    
    expect(retryEvents).toHaveLength(2);
  });

  test('should throw after max retries exceeded', async () => {
    await expect(
      handler.executeWithRetry(
        async () => { throw new Error('Always fails timeout'); },
        { maxRetries: 2, backoffMs: 10 }
      )
    ).rejects.toThrow('Always fails');
  });

  test('should generate comprehensive report', () => {
    // Add some errors
    handler.handle(new Error('Network error 1'));
    handler.handle(new Error('401 Unauthorized'));
    
    // Create a circuit breaker
    handler.getCircuitBreaker('test-service');
    
    const report = handler.getReport();
    
    expect(report.summary).toBeDefined();
    expect(report.breakdown).toBeDefined();
    expect(report.circuitBreakers['test-service']).toBeDefined();
    expect(report.degradedServices).toBeDefined();
  });
});

describe('ErrorSeverity Constants', () => {
  test('should have all severity levels defined', () => {
    expect(ErrorSeverity.LOW).toBe('low');
    expect(ErrorSeverity.MEDIUM).toBe('medium');
    expect(ErrorSeverity.HIGH).toBe('high');
    expect(ErrorSeverity.CRITICAL).toBe('critical');
  });
});

describe('ErrorCategory Constants', () => {
  test('should have all categories defined', () => {
    expect(ErrorCategory.VALIDATION).toBe('validation');
    expect(ErrorCategory.AUTHENTICATION).toBe('authentication');
    expect(ErrorCategory.AUTHORIZATION).toBe('authorization');
    expect(ErrorCategory.NETWORK).toBe('network');
    expect(ErrorCategory.TIMEOUT).toBe('timeout');
    expect(ErrorCategory.RATE_LIMIT).toBe('rate-limit');
    expect(ErrorCategory.RESOURCE_NOT_FOUND).toBe('resource-not-found');
    expect(ErrorCategory.CONFLICT).toBe('conflict');
    expect(ErrorCategory.INTERNAL).toBe('internal');
    expect(ErrorCategory.EXTERNAL_SERVICE).toBe('external-service');
    expect(ErrorCategory.CONFIGURATION).toBe('configuration');
    expect(ErrorCategory.USER_INPUT).toBe('user-input');
    expect(ErrorCategory.UNKNOWN).toBe('unknown');
  });
});

describe('CircuitState Constants', () => {
  test('should have all states defined', () => {
    expect(CircuitState.CLOSED).toBe('closed');
    expect(CircuitState.OPEN).toBe('open');
    expect(CircuitState.HALF_OPEN).toBe('half-open');
  });
});
