/**
 * @file self-correction.test.js
 * @description Tests for SelfCorrection
 */

'use strict';

const { 
  SelfCorrection, 
  createSelfCorrection, 
  correctError,
  SEVERITY,
  CORRECTION_STRATEGY,
  DEFAULT_PATTERNS
} = require('../../../src/orchestration/reasoning/self-correction');

describe('SelfCorrection', () => {
  let corrector;
  
  beforeEach(() => {
    corrector = new SelfCorrection();
  });
  
  describe('constructor', () => {
    it('should create with default options', () => {
      expect(corrector.maxRetries).toBe(3);
      expect(corrector.retryDelay).toBe(1000);
      expect(corrector.exponentialBackoff).toBe(true);
      expect(corrector.learnFromErrors).toBe(true);
    });
    
    it('should accept custom options', () => {
      const custom = new SelfCorrection({
        maxRetries: 5,
        retryDelay: 500,
        exponentialBackoff: false
      });
      
      expect(custom.maxRetries).toBe(5);
      expect(custom.retryDelay).toBe(500);
      expect(custom.exponentialBackoff).toBe(false);
    });
  });
  
  describe('analyzeError', () => {
    it('should analyze error string', () => {
      const record = corrector.analyzeError('Syntax error at line 5');
      
      expect(record).toBeDefined();
      expect(record.id).toMatch(/^err-/);
      expect(record.message).toBe('Syntax error at line 5');
      expect(record.type).toBe('syntax');
      expect(record.severity).toBe(SEVERITY.ERROR);
      expect(record.strategy).toBe(CORRECTION_STRATEGY.SIMPLIFY);
    });
    
    it('should analyze Error object', () => {
      const error = new Error('Variable is not defined');
      const record = corrector.analyzeError(error);
      
      expect(record.message).toBe('Variable is not defined');
      expect(record.type).toBe('reference');
      expect(record.stack).toBeDefined();
    });
    
    it('should classify timeout errors', () => {
      const record = corrector.analyzeError('Connection timed out after 30s');
      
      expect(record.type).toBe('timeout');
      expect(record.strategy).toBe(CORRECTION_STRATEGY.RETRY);
    });
    
    it('should classify permission errors', () => {
      const record = corrector.analyzeError('Access denied to resource');
      
      expect(record.type).toBe('permission');
      expect(record.severity).toBe(SEVERITY.CRITICAL);
      expect(record.strategy).toBe(CORRECTION_STRATEGY.ESCALATE);
    });
    
    it('should classify not found errors', () => {
      const record = corrector.analyzeError('File not found: test.js');
      
      expect(record.type).toBe('not-found');
      expect(record.strategy).toBe(CORRECTION_STRATEGY.FALLBACK);
    });
    
    it('should store errors in memory', () => {
      corrector.analyzeError('Error 1');
      corrector.analyzeError('Error 2');
      
      expect(corrector.getRecentErrors(10).length).toBe(2);
    });
    
    it('should emit events', () => {
      const events = [];
      corrector.on('error:analyzed', (e) => events.push(e));
      
      corrector.analyzeError('Test error');
      
      expect(events.length).toBe(1);
      expect(events[0].record).toBeDefined();
    });
  });
  
  describe('correct', () => {
    it('should attempt correction with retry strategy', async () => {
      corrector.retryDelay = 10; // Fast for testing
      corrector.maxRetries = 3;
      
      const record = corrector.analyzeError('Network timeout');
      let attempts = 0;
      
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        return 'success';
      });
      
      const result = await corrector.correct(record, operation);
      
      // Retry strategy should eventually succeed
      expect(result.success).toBe(true);
      expect(attempts).toBeGreaterThanOrEqual(1);
    });
    
    it('should handle fallback strategy', async () => {
      const record = corrector.analyzeError('File not found');
      
      const result = await corrector.correct(
        record, 
        () => { throw new Error('Failed'); },
        { fallback: 'default value' }
      );
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('default value');
    });
    
    it('should handle skip strategy', async () => {
      const record = corrector.analyzeError('Test error');
      record.strategy = CORRECTION_STRATEGY.SKIP;
      
      const result = await corrector.correct(record, () => {});
      
      expect(result.success).toBe(true);
      expect(result.result.skipped).toBe(true);
    });
    
    it('should record correction attempts', async () => {
      corrector.retryDelay = 10;
      const record = corrector.analyzeError('Test error');
      
      await corrector.correct(record, () => 'done');
      
      expect(record.attempts.length).toBe(1);
      expect(record.attempts[0].successful).toBe(true);
      expect(record.attempts[0].duration).toBeGreaterThanOrEqual(0);
    });
    
    it('should emit events during correction', async () => {
      const events = [];
      
      corrector.on('correction:start', (e) => events.push({ type: 'start', ...e }));
      corrector.on('correction:success', (e) => events.push({ type: 'success', ...e }));
      
      const record = corrector.analyzeError('Test');
      record.strategy = CORRECTION_STRATEGY.SKIP;
      
      await corrector.correct(record, () => {});
      
      expect(events.some(e => e.type === 'start')).toBe(true);
      expect(events.some(e => e.type === 'success')).toBe(true);
    });
    
    it('should learn from successful corrections', async () => {
      corrector.learnFromErrors = true;
      
      const record = corrector.analyzeError('Custom error type XYZ');
      record.strategy = CORRECTION_STRATEGY.SKIP;
      
      await corrector.correct(record, () => {});
      
      // Should have learned the pattern
      expect(corrector.successPatterns.size).toBeGreaterThan(0);
    });
  });
  
  describe('error retrieval', () => {
    it('should get error by ID', () => {
      const record = corrector.analyzeError('Test');
      
      expect(corrector.getError(record.id)).toEqual(record);
    });
    
    it('should return null for missing error', () => {
      expect(corrector.getError('non-existent')).toBeNull();
    });
    
    it('should get recent errors', () => {
      corrector.analyzeError('Error 1');
      corrector.analyzeError('Error 2');
      corrector.analyzeError('Error 3');
      
      const recent = corrector.getRecentErrors(2);
      expect(recent.length).toBe(2);
    });
    
    it('should get unresolved errors', () => {
      const r1 = corrector.analyzeError('Error 1');
      corrector.analyzeError('Error 2');
      r1.resolved = true;
      
      const unresolved = corrector.getUnresolvedErrors();
      expect(unresolved.length).toBe(1);
    });
  });
  
  describe('statistics', () => {
    it('should return stats', () => {
      corrector.analyzeError('Syntax error');
      corrector.analyzeError('Network timeout');
      
      const stats = corrector.getStats();
      
      expect(stats.total).toBe(2);
      expect(stats.byType).toBeDefined();
      expect(stats.bySeverity).toBeDefined();
    });
    
    it('should track resolution rate', () => {
      const r1 = corrector.analyzeError('Error 1');
      corrector.analyzeError('Error 2');
      r1.resolved = true;
      
      const stats = corrector.getStats();
      expect(stats.resolved).toBe(1);
      expect(stats.resolutionRate).toBe(0.5);
    });
  });
  
  describe('recommendations', () => {
    it('should get recommendations for error', () => {
      const record = corrector.analyzeError('Syntax error in code');
      
      const recs = corrector.getRecommendations(record);
      
      expect(recs.primaryStrategy).toBe(CORRECTION_STRATEGY.SIMPLIFY);
      expect(recs.alternatives.length).toBeGreaterThan(0);
      expect(recs.actionItems.length).toBeGreaterThan(0);
    });
  });
  
  describe('pattern management', () => {
    it('should add custom pattern', () => {
      corrector.addPattern({
        pattern: /custom-error/i,
        type: 'custom',
        strategy: CORRECTION_STRATEGY.RETRY,
        description: 'Custom error type'
      });
      
      const record = corrector.analyzeError('custom-error occurred');
      expect(record.type).toBe('custom');
    });
    
    it('should register custom handler', async () => {
      const customHandler = jest.fn().mockResolvedValue('custom result');
      corrector.registerHandler('custom', customHandler);
      
      const record = corrector.analyzeError('Test');
      record.strategy = 'custom';
      
      const result = await corrector.correct(record, () => {});
      
      expect(customHandler).toHaveBeenCalled();
      expect(result.result).toBe('custom result');
    });
  });
  
  describe('memory management', () => {
    it('should respect memory size limit', () => {
      corrector.memorySize = 3;
      
      for (let i = 0; i < 5; i++) {
        corrector.analyzeError(`Error ${i}`);
      }
      
      expect(corrector.getRecentErrors(10).length).toBe(3);
    });
    
    it('should clear memory', () => {
      corrector.analyzeError('Error');
      corrector.clearMemory();
      
      expect(corrector.getRecentErrors(10).length).toBe(0);
    });
    
    it('should reset learning', () => {
      corrector.successPatterns.set('test', {});
      corrector.resetLearning();
      
      expect(corrector.successPatterns.size).toBe(0);
    });
  });
  
  describe('exportReport', () => {
    it('should export error report', () => {
      corrector.analyzeError('Syntax error');
      corrector.analyzeError('Network timeout');
      
      const report = corrector.exportReport();
      
      expect(report).toContain('# Error Correction Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('## Errors by Type');
      expect(report).toContain('## Recent Errors');
    });
  });
});

describe('createSelfCorrection', () => {
  it('should create corrector instance', () => {
    const corrector = createSelfCorrection();
    expect(corrector).toBeInstanceOf(SelfCorrection);
  });
  
  it('should pass options', () => {
    const corrector = createSelfCorrection({ maxRetries: 5 });
    expect(corrector.maxRetries).toBe(5);
  });
});

describe('correctError', () => {
  it('should analyze and correct error', async () => {
    const result = await correctError(
      'Test error',
      () => 'success',
      { retryDelay: 10 }
    );
    
    expect(result.success).toBe(true);
  });
});

describe('Constants', () => {
  it('should have severity levels', () => {
    expect(SEVERITY.INFO).toBe('info');
    expect(SEVERITY.WARNING).toBe('warning');
    expect(SEVERITY.ERROR).toBe('error');
    expect(SEVERITY.CRITICAL).toBe('critical');
  });
  
  it('should have correction strategies', () => {
    expect(CORRECTION_STRATEGY.RETRY).toBe('retry');
    expect(CORRECTION_STRATEGY.FALLBACK).toBe('fallback');
    expect(CORRECTION_STRATEGY.DECOMPOSE).toBe('decompose');
    expect(CORRECTION_STRATEGY.SIMPLIFY).toBe('simplify');
    expect(CORRECTION_STRATEGY.ESCALATE).toBe('escalate');
  });
  
  it('should have default patterns', () => {
    expect(Array.isArray(DEFAULT_PATTERNS)).toBe(true);
    expect(DEFAULT_PATTERNS.length).toBeGreaterThan(0);
    expect(DEFAULT_PATTERNS[0].pattern).toBeDefined();
    expect(DEFAULT_PATTERNS[0].strategy).toBeDefined();
  });
});
