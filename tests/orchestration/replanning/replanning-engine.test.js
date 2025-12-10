/**
 * @fileoverview Tests for MUSUBI Replanning Engine
 */

'use strict';

const {
  ReplanningEngine,
  PlanMonitor,
  PlanEvaluator,
  AlternativeGenerator,
  ReplanHistory,
  ReplanTrigger,
  ReplanDecision,
  _mergeReplanningConfig
} = require('../../../src/orchestration/replanning');

const { MockLLMProvider } = require('../../../src/llm-providers');

describe('ReplanningEngine', () => {
  let engine;
  let mockLLM;

  beforeEach(() => {
    mockLLM = new MockLLMProvider({
      responses: [
        {
          content: JSON.stringify({
            analysis: 'Task failed due to missing dependency',
            goal: 'Complete the task successfully',
            alternatives: [
              {
                id: 'alt-1',
                description: 'Use alternative approach',
                task: { name: 'alt-task', skill: 'alt-skill', parameters: {} },
                confidence: 0.85,
                reasoning: 'This approach avoids the problematic dependency',
                risks: ['May take longer']
              }
            ]
          })
        }
      ]
    });

    engine = new ReplanningEngine(null, {
      llmProvider: mockLLM,
      config: {
        enabled: true,
        triggers: {
          enabled: [ReplanTrigger.TASK_FAILED, ReplanTrigger.TIMEOUT],
          failureThreshold: 1
        },
        alternatives: {
          maxAlternatives: 3,
          minConfidence: 0.5,
          humanApprovalThreshold: 0.7
        },
        humanInLoop: {
          enabled: false
        }
      }
    });
  });

  afterEach(() => {
    engine.monitor.clear();
  });

  describe('Initialization', () => {
    it('should create engine with default config', () => {
      const defaultEngine = new ReplanningEngine();
      expect(defaultEngine).toBeDefined();
      expect(defaultEngine.config.enabled).toBe(true);
    });

    it('should merge custom config with defaults', () => {
      const customEngine = new ReplanningEngine(null, {
        config: {
          alternatives: {
            maxAlternatives: 5
          }
        }
      });
      expect(customEngine.config.alternatives.maxAlternatives).toBe(5);
      expect(customEngine.config.alternatives.minConfidence).toBe(0.5);
    });

    it('should have all components initialized', () => {
      expect(engine.monitor).toBeInstanceOf(PlanMonitor);
      expect(engine.evaluator).toBeInstanceOf(PlanEvaluator);
      expect(engine.generator).toBeInstanceOf(AlternativeGenerator);
      expect(engine.history).toBeInstanceOf(ReplanHistory);
    });
  });

  describe('Plan Normalization', () => {
    it('should normalize plan with ID', () => {
      const plan = { tasks: [{ skill: 'test' }] };
      const normalized = engine.normalizePlan(plan);
      
      expect(normalized.id).toBeDefined();
      expect(normalized.id).toMatch(/^plan-\d+$/);
    });

    it('should normalize tasks with IDs', () => {
      const plan = { 
        tasks: [
          { skill: 'skill1' },
          { skill: 'skill2', name: 'Task 2' }
        ] 
      };
      const normalized = engine.normalizePlan(plan);
      
      expect(normalized.tasks[0].id).toBe('task-0');
      expect(normalized.tasks[1].id).toBe('task-1');
      expect(normalized.tasks[0].name).toBe('skill1');
      expect(normalized.tasks[1].name).toBe('Task 2');
    });

    it('should preserve existing task IDs', () => {
      const plan = { 
        tasks: [
          { id: 'custom-id', skill: 'skill1' }
        ] 
      };
      const normalized = engine.normalizePlan(plan);
      
      expect(normalized.tasks[0].id).toBe('custom-id');
    });
  });

  describe('Plan Modification', () => {
    beforeEach(() => {
      engine.currentPlan = { id: 'test-plan' };
      engine.executionContext = {
        pending: [
          { id: 'task-1', skill: 'skill1' },
          { id: 'task-2', skill: 'skill2' }
        ]
      };
      engine.planVersion = 0;
    });

    it('should add task at end', () => {
      engine.addTask({ id: 'task-3', skill: 'skill3' }, 'end');
      
      expect(engine.executionContext.pending).toHaveLength(3);
      expect(engine.executionContext.pending[2].id).toBe('task-3');
      expect(engine.planVersion).toBe(1);
    });

    it('should add task at start', () => {
      engine.addTask({ id: 'task-0', skill: 'skill0' }, 'start');
      
      expect(engine.executionContext.pending).toHaveLength(3);
      expect(engine.executionContext.pending[0].id).toBe('task-0');
    });

    it('should add task after specific task', () => {
      engine.addTask({ id: 'task-1.5', skill: 'skill1.5' }, 'task-1');
      
      expect(engine.executionContext.pending).toHaveLength(3);
      expect(engine.executionContext.pending[1].id).toBe('task-1.5');
    });

    it('should remove task', () => {
      const removed = engine.removeTask('task-1');
      
      expect(removed).toBe(true);
      expect(engine.executionContext.pending).toHaveLength(1);
      expect(engine.executionContext.pending[0].id).toBe('task-2');
    });

    it('should return false when removing non-existent task', () => {
      const removed = engine.removeTask('non-existent');
      
      expect(removed).toBe(false);
      expect(engine.executionContext.pending).toHaveLength(2);
    });

    it('should reorder tasks', () => {
      engine.reorderTasks(['task-2', 'task-1']);
      
      expect(engine.executionContext.pending[0].id).toBe('task-2');
      expect(engine.executionContext.pending[1].id).toBe('task-1');
    });

    it('should modify task', () => {
      const modified = engine.modifyTask('task-1', { priority: 'P0' });
      
      expect(modified).toBe(true);
      expect(engine.executionContext.pending[0].priority).toBe('P0');
    });
  });

  describe('History Export', () => {
    beforeEach(() => {
      engine.history.record({
        trigger: ReplanTrigger.TASK_FAILED,
        decision: ReplanDecision.REPLACE,
        planId: 'test-plan',
        failedTask: { name: 'failed-task' },
        outcome: { success: true }
      });
    });

    it('should export history as markdown', () => {
      const md = engine.exportHistory('markdown');
      
      expect(md).toContain('# Replanning History Report');
      expect(md).toContain('task-failed');
    });

    it('should export history as JSON', () => {
      const json = engine.exportHistory('json');
      const data = JSON.parse(json);
      
      expect(data.events).toHaveLength(1);
      expect(data.metrics.totalReplans).toBe(1);
    });
  });
});

describe('PlanMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PlanMonitor({
      config: {
        triggers: {
          enabled: [ReplanTrigger.TASK_FAILED, ReplanTrigger.TIMEOUT],
          failureThreshold: 2
        }
      }
    });
  });

  afterEach(() => {
    monitor.clear();
  });

  describe('Watching', () => {
    it('should start watching a context', () => {
      monitor.watch('ctx-1', { plan: { id: 'plan-1' } });
      
      expect(monitor.isWatching).toBe(true);
      expect(monitor.getStats().activeContexts).toBe(1);
    });

    it('should stop watching a context', () => {
      monitor.watch('ctx-1', { plan: { id: 'plan-1' } });
      monitor.unwatch('ctx-1');
      
      expect(monitor.isWatching).toBe(false);
      expect(monitor.getStats().activeContexts).toBe(0);
    });

    it('should emit watch events', () => {
      const startHandler = jest.fn();
      const stopHandler = jest.fn();
      
      monitor.on('watch:started', startHandler);
      monitor.on('watch:stopped', stopHandler);
      
      monitor.watch('ctx-1', { plan: { id: 'plan-1' } });
      monitor.unwatch('ctx-1');
      
      expect(startHandler).toHaveBeenCalledTimes(1);
      expect(stopHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Trigger Detection', () => {
    beforeEach(() => {
      monitor.watch('ctx-1', { 
        plan: { id: 'plan-1' },
        startTime: Date.now()
      });
    });

    it('should not trigger on first failure with threshold 2', () => {
      const trigger = monitor.reportResult('ctx-1', {
        taskId: 'task-1',
        status: 'failed',
        error: new Error('First failure')
      });
      
      expect(trigger).toBeNull();
    });

    it('should trigger on second failure with threshold 2', () => {
      monitor.reportResult('ctx-1', {
        taskId: 'task-1',
        status: 'failed',
        error: new Error('First failure')
      });
      
      const trigger = monitor.reportResult('ctx-1', {
        taskId: 'task-2',
        status: 'failed',
        error: new Error('Second failure')
      });
      
      expect(trigger).not.toBeNull();
      expect(trigger.type).toBe(ReplanTrigger.TASK_FAILED);
    });

    it('should trigger on timeout', () => {
      const trigger = monitor.reportResult('ctx-1', {
        taskId: 'task-1',
        status: 'timeout'
      });
      
      expect(trigger).not.toBeNull();
      expect(trigger.type).toBe(ReplanTrigger.TIMEOUT);
    });

    it('should not trigger on success', () => {
      const trigger = monitor.reportResult('ctx-1', {
        taskId: 'task-1',
        status: 'success',
        output: 'result'
      });
      
      expect(trigger).toBeNull();
    });
  });

  describe('Manual Replan Request', () => {
    it('should emit trigger on manual request', () => {
      const triggerHandler = jest.fn();
      monitor.on('trigger', triggerHandler);
      
      monitor.requestReplan('ctx-1', 'Manual request');
      
      expect(triggerHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ReplanTrigger.HUMAN_REQUEST
        })
      );
    });
  });
});

describe('PlanEvaluator', () => {
  let evaluator;

  beforeEach(() => {
    evaluator = new PlanEvaluator();
  });

  describe('Progress Calculation', () => {
    it('should calculate progress percentage', () => {
      expect(evaluator.calculateProgress(5, 10)).toBe(50);
      expect(evaluator.calculateProgress(0, 10)).toBe(0);
      expect(evaluator.calculateProgress(10, 10)).toBe(100);
    });

    it('should return 100% for empty plan', () => {
      expect(evaluator.calculateProgress(0, 0)).toBe(100);
    });
  });

  describe('Plan Evaluation', () => {
    it('should evaluate a plan', () => {
      const plan = { id: 'plan-1', tasks: [1, 2, 3, 4, 5] };
      const state = {
        completed: [{ id: 1 }, { id: 2 }],
        pending: [{ id: 3 }, { id: 4 }, { id: 5 }],
        failed: [],
        startTime: Date.now() - 10000
      };
      
      const evaluation = evaluator.evaluate(plan, state);
      
      expect(evaluation.progress.percentage).toBe(40);
      expect(evaluation.progress.completed).toBe(2);
      expect(evaluation.progress.pending).toBe(3);
      expect(evaluation.health.status).toBeDefined();
    });

    it('should generate recommendations for high failure rate', () => {
      const plan = { id: 'plan-1', tasks: [1, 2, 3, 4] };
      const state = {
        completed: [{ id: 1 }],
        pending: [],
        failed: [{ id: 2 }, { id: 3 }, { id: 4 }],
        startTime: Date.now()
      };
      
      const evaluation = evaluator.evaluate(plan, state);
      
      expect(evaluation.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Efficiency Metrics', () => {
    it('should calculate efficiency', () => {
      const state = {
        completed: [
          { id: 1, duration: 1000 },
          { id: 2, duration: 2000 }
        ],
        startTime: Date.now() - 60000, // 1 minute ago
        retries: 1
      };
      
      const efficiency = evaluator.calculateEfficiency(state);
      
      expect(efficiency.avgTaskDuration).toBe(1500);
      expect(efficiency.retryRatio).toBe(0.5);
    });
  });
});

describe('AlternativeGenerator', () => {
  let generator;
  let mockLLM;

  beforeEach(() => {
    mockLLM = new MockLLMProvider({
      responses: [
        {
          content: JSON.stringify({
            analysis: 'Test analysis',
            goal: 'Test goal',
            alternatives: [
              {
                id: 'alt-1',
                description: 'Alternative 1',
                task: { name: 'alt-task-1', skill: 'skill-1', parameters: {} },
                confidence: 0.9,
                reasoning: 'Good alternative',
                risks: []
              },
              {
                id: 'alt-2',
                description: 'Alternative 2',
                task: { name: 'alt-task-2', skill: 'skill-2', parameters: {} },
                confidence: 0.6,
                reasoning: 'Backup alternative',
                risks: ['Some risk']
              }
            ]
          })
        }
      ]
    });

    generator = new AlternativeGenerator(mockLLM, {
      config: {
        maxAlternatives: 3,
        minConfidence: 0.5,
        includeRetryOption: true
      }
    });
  });

  describe('Goal Extraction', () => {
    it('should extract goal from task', () => {
      const task = { goal: 'Complete feature X' };
      expect(generator.extractGoal(task, {})).toBe('Complete feature X');
    });

    it('should use description if no goal', () => {
      const task = { description: 'Task description' };
      expect(generator.extractGoal(task, {})).toBe('Task description');
    });

    it('should infer goal from skill name', () => {
      const task = { skill: 'analyze', parameters: { feature: 'auth' } };
      expect(generator.extractGoal(task, {})).toContain('analyze');
      expect(generator.extractGoal(task, {})).toContain('auth');
    });
  });

  describe('Alternative Generation', () => {
    it('should generate alternatives for failed task', async () => {
      const failedTask = {
        id: 'task-1',
        skill: 'test-skill',
        error: new Error('Task failed')
      };
      
      const alternatives = await generator.generateAlternatives(
        failedTask,
        { completed: [], pending: [] }
      );
      
      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives[0].confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should include retry option when configured', async () => {
      const failedTask = { id: 'task-1', skill: 'test-skill' };
      
      const alternatives = await generator.generateAlternatives(
        failedTask,
        { completed: [], pending: [] }
      );
      
      const retryOption = alternatives.find(a => a.id === 'retry');
      expect(retryOption).toBeDefined();
    });

    it('should rank alternatives by confidence', async () => {
      const failedTask = { id: 'task-1', skill: 'test-skill' };
      
      const alternatives = await generator.generateAlternatives(
        failedTask,
        { completed: [], pending: [] }
      );
      
      for (let i = 1; i < alternatives.length; i++) {
        expect(alternatives[i - 1].confidence).toBeGreaterThanOrEqual(
          alternatives[i].confidence
        );
      }
    });
  });
});

describe('ReplanHistory', () => {
  let history;

  beforeEach(() => {
    history = new ReplanHistory({
      config: {
        enabled: true,
        maxEvents: 100
      }
    });
  });

  describe('Recording', () => {
    it('should record events', () => {
      const event = history.record({
        trigger: ReplanTrigger.TASK_FAILED,
        decision: ReplanDecision.REPLACE,
        planId: 'plan-1'
      });
      
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('should limit events to maxEvents', () => {
      for (let i = 0; i < 150; i++) {
        history.record({ trigger: 'test', planId: `plan-${i}` });
      }
      
      expect(history.getEvents().length).toBe(100);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      history.record({
        trigger: ReplanTrigger.TASK_FAILED,
        decision: ReplanDecision.REPLACE,
        planId: 'plan-1',
        outcome: { success: true }
      });
      history.record({
        trigger: ReplanTrigger.TIMEOUT,
        decision: ReplanDecision.ABORT,
        planId: 'plan-2',
        outcome: { success: false }
      });
    });

    it('should filter by trigger', () => {
      const events = history.getEvents({ trigger: ReplanTrigger.TASK_FAILED });
      expect(events.length).toBe(1);
    });

    it('should filter by decision', () => {
      const events = history.getEvents({ decision: ReplanDecision.ABORT });
      expect(events.length).toBe(1);
    });

    it('should filter by success', () => {
      const successEvents = history.getEvents({ success: true });
      expect(successEvents.length).toBe(1);
    });
  });

  describe('Metrics', () => {
    beforeEach(() => {
      history.record({
        trigger: ReplanTrigger.TASK_FAILED,
        decision: ReplanDecision.REPLACE,
        outcome: { success: true }
      });
      history.record({
        trigger: ReplanTrigger.TASK_FAILED,
        decision: ReplanDecision.ABORT,
        outcome: { success: false }
      });
    });

    it('should track metrics', () => {
      const metrics = history.getMetrics();
      
      expect(metrics.totalReplans).toBe(2);
      expect(metrics.successfulReplans).toBe(1);
      expect(metrics.failedReplans).toBe(1);
      expect(metrics.successRate).toBe(0.5);
    });

    it('should track by trigger', () => {
      const metrics = history.getMetrics();
      
      expect(metrics.byTrigger[ReplanTrigger.TASK_FAILED]).toBe(2);
    });
  });

  describe('Export', () => {
    beforeEach(() => {
      history.record({
        trigger: ReplanTrigger.TASK_FAILED,
        decision: ReplanDecision.REPLACE,
        planId: 'plan-1'
      });
    });

    it('should export to Markdown', () => {
      const md = history.exportMarkdown();
      
      expect(md).toContain('# Replanning History Report');
      expect(md).toContain('task-failed');
    });

    it('should export to JSON', () => {
      const json = history.exportJSON();
      const data = JSON.parse(json);
      
      expect(data.events).toHaveLength(1);
      expect(data.metrics).toBeDefined();
    });

    it('should import from JSON', () => {
      const json = history.exportJSON();
      
      const newHistory = new ReplanHistory();
      newHistory.importJSON(json);
      
      expect(newHistory.getEvents().length).toBe(1);
    });
  });
});
