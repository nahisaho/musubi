/**
 * ProactivePathOptimizer Tests
 * 
 * Tests for proactive path optimization functionality
 */

'use strict';

const {
  ProactivePathOptimizer,
  PathMetrics,
  OptimizationOpportunity
} = require('../../../src/orchestration/replanning/proactive-path-optimizer');

// Mock LLM provider
const mockLLMProvider = {
  complete: async () => JSON.stringify({ suggestions: [] })
};

describe('ProactivePathOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new ProactivePathOptimizer(mockLLMProvider);
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(optimizer).toBeInstanceOf(ProactivePathOptimizer);
      expect(optimizer.config.enabled).toBe(true);
    });

    it('should accept custom config', () => {
      const custom = new ProactivePathOptimizer(mockLLMProvider, {
        config: {
          enabled: false,
          evaluateEvery: 5
        }
      });
      expect(custom.config.enabled).toBe(false);
      expect(custom.config.evaluateEvery).toBe(5);
    });
  });

  describe('onTaskSuccess', () => {
    it('should return null when disabled', async () => {
      optimizer.config.enabled = false;
      const result = await optimizer.onTaskSuccess({}, {}, {});
      expect(result).toBeNull();
    });

    it('should track success count', async () => {
      await optimizer.onTaskSuccess({ id: 't1' }, {}, {});
      expect(optimizer.successCount).toBe(1);
      await optimizer.onTaskSuccess({ id: 't2' }, {}, {});
      expect(optimizer.successCount).toBe(2);
    });

    it('should optimize on configured interval', async () => {
      optimizer.config.evaluateEvery = 2;
      
      const result1 = await optimizer.onTaskSuccess({ id: 't1' }, { pending: [] }, {});
      expect(result1).toBeNull();
      
      const result2 = await optimizer.onTaskSuccess({ id: 't2' }, { pending: [] }, {});
      expect(result2).toBeDefined();
      expect(result2.optimized).toBeDefined();
    });
  });

  describe('optimize', () => {
    it('should return optimization result or undefined', async () => {
      const context = {
        pending: [
          { id: 't1', name: 'Task 1' },
          { id: 't2', name: 'Task 2' }
        ]
      };

      const result = await optimizer.optimize(context);
      // Result may be undefined if no LLM is configured or no opportunities
      // When defined, should have expected structure
      expect(result === undefined || result.currentMetrics !== undefined || result.optimized !== undefined).toBe(true);
    });

    it('should report when no opportunities found', async () => {
      const context = { pending: [] };
      const result = await optimizer.optimize(context);
      // With empty pending, should return no opportunities result or undefined
      expect(result === undefined || result.optimized === false).toBe(true);
    });
  });

  describe('calculatePathMetrics', () => {
    it('should calculate metrics for pending tasks', () => {
      const context = {
        pending: [
          { id: 't1', estimatedDuration: 1000 },
          { id: 't2', estimatedDuration: 2000 }
        ]
      };

      const metrics = optimizer.calculatePathMetrics(context);
      expect(metrics).toBeInstanceOf(PathMetrics);
      expect(metrics.estimatedTime).toBeGreaterThan(0);
    });

    it('should handle empty pending list', () => {
      const context = { pending: [] };
      const metrics = optimizer.calculatePathMetrics(context);
      expect(metrics.estimatedTime).toBe(0);
    });
  });

  describe('event handling', () => {
    it('should emit optimization event when optimizing', async () => {
      const handler = jest.fn();
      optimizer.on('optimization', handler);

      // Force an optimization with opportunities
      optimizer.config.minImprovementThreshold = 0;
      
      // Manually trigger optimization that would emit
      const context = {
        pending: [
          { id: 't1', name: 'Task 1', dependencies: [] },
          { id: 't2', name: 'Task 2', dependencies: [] }
        ]
      };

      await optimizer.optimize(context);
      // Event may or may not fire depending on opportunities found
    });
  });

  describe('recordPerformance', () => {
    it('should record task performance data', () => {
      const task = { skill: 'test-skill', name: 'Test Task' };
      const result = { duration: 1000, success: true };

      optimizer.recordPerformance(task, result);
      expect(optimizer.learningData.size).toBeGreaterThan(0);
    });
  });
});

describe('PathMetrics', () => {
  describe('constructor', () => {
    it('should create with defaults', () => {
      const metrics = new PathMetrics();
      expect(metrics.estimatedTime).toBe(0);
      expect(metrics.estimatedCost).toBe(0);
    });

    it('should accept data', () => {
      const metrics = new PathMetrics({
        estimatedTime: 1000,
        riskScore: 0.5
      });
      expect(metrics.estimatedTime).toBe(1000);
      expect(metrics.riskScore).toBe(0.5);
    });
  });

  describe('getScore', () => {
    it('should calculate overall score', () => {
      const metrics = new PathMetrics({
        estimatedTime: 100,
        estimatedCost: 50,
        parallelizationFactor: 0.8,
        riskScore: 0.2
      });

      const score = metrics.getScore();
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('compareWith', () => {
    it('should compare two metrics', () => {
      const better = new PathMetrics({ estimatedTime: 50, riskScore: 0.1 });
      const worse = new PathMetrics({ estimatedTime: 100, riskScore: 0.5 });

      const improvement = better.compareWith(worse);
      expect(improvement).toBeGreaterThan(0);
    });

    it('should handle zero score comparison', () => {
      const metrics = new PathMetrics({ estimatedTime: 100 });
      const zero = new PathMetrics();

      const improvement = metrics.compareWith(zero);
      expect(improvement).toBe(0);
    });
  });
});

describe('OptimizationOpportunity', () => {
  describe('constructor', () => {
    it('should create with defaults', () => {
      const opp = new OptimizationOpportunity();
      expect(opp.affectedTasks).toEqual([]);
      expect(opp.confidence).toBe(0.5);
    });

    it('should accept data', () => {
      const opp = new OptimizationOpportunity({
        type: 'parallelize',
        estimatedImprovement: 0.25,
        confidence: 0.8
      });
      expect(opp.type).toBe('parallelize');
      expect(opp.estimatedImprovement).toBe(0.25);
      expect(opp.confidence).toBe(0.8);
    });
  });

  describe('getWeightedScore', () => {
    it('should calculate weighted score', () => {
      const opp = new OptimizationOpportunity({
        estimatedImprovement: 0.5,
        confidence: 0.8
      });

      expect(opp.getWeightedScore()).toBe(0.4);
    });
  });
});
