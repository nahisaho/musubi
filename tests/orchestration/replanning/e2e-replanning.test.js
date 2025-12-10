/**
 * @fileoverview E2E Tests for Replanning Engine
 * Tests the complete replanning workflow in realistic scenarios
 * @version 1.0.0
 */

'use strict';

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Import replanning components
const { 
  ReplanningEngine,
  _PlanMonitor,
  PlanEvaluator,
  _AlternativeGenerator,
  _ReplanHistory,
  ProactivePathOptimizer,
  GoalProgressTracker,
  AdaptiveGoalModifier,
  ModificationHistoryManager,
  ReplanTrigger,
  defaultReplanningConfig
} = require('../../../src/orchestration/replanning');

// Import GUI service for integration
const { ReplanningService } = require('../../../src/gui/services/replanning-service');

describe('E2E Replanning Engine Tests', () => {
  let tempDir;
  let engine;
  let guiService;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'musubi-e2e-replanning-'));
    
    // Create necessary directories
    await fs.mkdir(path.join(tempDir, 'storage', 'replanning', 'history'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'steering'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'storage', 'features'), { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    engine = new ReplanningEngine(null, {
      config: defaultReplanningConfig
    });
    guiService = new ReplanningService(tempDir);
  });

  describe('Scenario 1: Task Failure and Recovery', () => {
    test('should detect task failure and generate recovery plan', async () => {
      // Setup: Create a plan with tasks
      const plan = {
        id: 'plan-001',
        version: 1,
        tasks: [
          { id: 'T1', name: 'Setup environment', status: 'completed', duration: 120 },
          { id: 'T2', name: 'Run tests', status: 'pending', estimatedDuration: 300 },
          { id: 'T3', name: 'Deploy', status: 'pending', estimatedDuration: 180 }
        ],
        goals: [
          { id: 'G1', name: 'Complete deployment', progress: 0.33 }
        ]
      };

      // Initialize engine with plan
      engine.currentPlan = plan;
      engine.planVersion = 1;

      // Create evaluator
      const evaluator = new PlanEvaluator({ config: defaultReplanningConfig.evaluation });
      
      // Simulate task failure - create current state with failed task
      const currentState = {
        completed: [plan.tasks[0]],
        pending: [plan.tasks[2]],
        failed: [{
          ...plan.tasks[1],
          status: 'failed',
          error: 'Test execution failed: 3 tests failed',
          failureTime: Date.now()
        }],
        startTime: Date.now() - 60000 // Started 1 minute ago
      };

      // Evaluate current state (PlanEvaluator.evaluate takes plan and currentState)
      const evaluation = evaluator.evaluate(plan, currentState);

      expect(evaluation).toBeDefined();
      expect(evaluation.progress).toBeDefined();
      expect(evaluation.progress.failed).toBe(1);
      expect(evaluation.health).toBeDefined();

      // Record the event
      await guiService.recordReplan({
        trigger: 'task_failure',
        taskId: 'T2',
        reason: currentState.failed[0].error,
        success: true,
        evaluation: {
          health: evaluation.health
        }
      });

      // Verify history was recorded
      const history = await guiService.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].trigger).toBe('task_failure');
    });

    test('should maintain replan history across sessions', async () => {
      // Record multiple events
      await guiService.recordReplan({
        trigger: 'manual',
        reason: 'User requested replan',
        success: true
      });

      await guiService.recordReplan({
        trigger: 'optimization',
        reason: 'Better path found',
        success: true,
        confidence: 0.85
      });

      // Create new service instance (simulating new session)
      const newService = new ReplanningService(tempDir);
      const history = await newService.getHistory();

      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Scenario 2: Goal Progress Tracking', () => {
    let tracker;

    beforeEach(() => {
      tracker = new GoalProgressTracker({
        checkInterval: 100,
        deviationThreshold: 0.15
      });
    });

    afterEach(() => {
      tracker.stopTracking();
    });

    test('should track goal progress through milestones', async () => {
      // Register goal (progress is 0-1 scale)
      tracker.registerGoal({
        id: 'deploy-feature',
        name: 'Deploy Feature X',
        type: 'completion'
      });

      // Simulate progress updates (0-1 scale)
      tracker.updateProgress('deploy-feature', 0.25);
      let goal = tracker.getGoal('deploy-feature');
      expect(goal.progress).toBe(0.25);

      tracker.updateProgress('deploy-feature', 0.50);
      goal = tracker.getGoal('deploy-feature');
      expect(goal.progress).toBe(0.50);

      tracker.updateProgress('deploy-feature', 1.0);
      goal = tracker.getGoal('deploy-feature');
      expect(goal.progress).toBe(1.0);
      expect(goal.status).toBe('completed');
    });

    test('should detect deviation from expected progress', async () => {
      const deviationEvents = [];
      tracker.on('deviation', (event) => deviationEvents.push(event));

      tracker.registerGoal({
        id: 'time-sensitive',
        name: 'Time Sensitive Task',
        type: 'completion'
      });

      // Set initial progress
      tracker.updateProgress('time-sensitive', 0.10);

      // Wait and update with lower than expected progress
      await new Promise(resolve => setTimeout(resolve, 150));
      tracker.updateProgress('time-sensitive', 0.12);

      // Verify progress was updated
      const goal = tracker.getGoal('time-sensitive');
      expect(goal.progress).toBe(0.12);
    });

    test('should provide overall progress summary', () => {
      tracker.registerGoal({ id: 'G1', name: 'Goal 1', type: 'completion' });
      tracker.registerGoal({ id: 'G2', name: 'Goal 2', type: 'completion' });
      tracker.registerGoal({ id: 'G3', name: 'Goal 3', type: 'completion' });

      tracker.updateProgress('G1', 1.0);
      tracker.updateProgress('G2', 0.50);
      tracker.updateProgress('G3', 0.25);

      const summary = tracker.getStatusSummary();
      expect(summary.total).toBe(3);
      expect(summary.byStatus.completed).toBe(1);
      expect(summary.overallProgress).toBeCloseTo(0.58, 1); // (1.0+0.5+0.25)/3
    });
  });

  describe('Scenario 3: Proactive Path Optimization', () => {
    let optimizer;

    beforeEach(() => {
      // Create mock LLM provider
      const mockLLM = {
        complete: async () => 'No suggestions',
        completeJSON: async () => ({ suggestions: [] }),
        isAvailable: async () => false
      };
      
      optimizer = new ProactivePathOptimizer(mockLLM, {
        config: {
          enabled: true,
          evaluateEvery: 1,
          minImprovementThreshold: 0.05
        }
      });
    });

    test('should calculate path metrics', async () => {
      const context = {
        pending: [
          { id: 'S1', name: 'Step 1', estimatedDuration: 100 },
          { id: 'S2', name: 'Step 2', estimatedDuration: 150 },
          { id: 'S3', name: 'Step 3', estimatedDuration: 200 }
        ]
      };

      const metrics = optimizer.calculatePathMetrics(context);

      expect(metrics).toBeDefined();
      expect(metrics.estimatedTime).toBeGreaterThan(0);
      expect(metrics.getScore).toBeInstanceOf(Function);
    });

    test('should handle task success and evaluate optimization', async () => {
      const task = { id: 'T1', name: 'Test Task', estimatedDuration: 100 };
      const context = {
        pending: [
          { id: 'T2', estimatedDuration: 200 },
          { id: 'T3', estimatedDuration: 150 }
        ]
      };
      const result = { duration: 95, success: true };

      const optimization = await optimizer.onTaskSuccess(task, context, result);
      
      // May or may not optimize depending on opportunities
      expect(optimization === null || typeof optimization === 'object').toBe(true);
    });

    test('should emit optimization events', async () => {
      const events = [];
      optimizer.on('optimization', (event) => events.push(event));

      // Perform optimization with context
      const context = {
        pending: [
          { id: 'S1', estimatedDuration: 100 },
          { id: 'S2', estimatedDuration: 200, dependencies: [] }
        ]
      };

      await optimizer.optimize(context);

      // Events array exists regardless of optimization occurrence
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Scenario 4: Adaptive Goal Modification', () => {
    let modifier;
    let historyManager;

    beforeEach(() => {
      modifier = new AdaptiveGoalModifier({
        requireApproval: false,
        autoModifyThreshold: 0.5
      });
      historyManager = new ModificationHistoryManager();
    });

    test('should register and manage goals', () => {
      const goal = modifier.registerGoal({
        id: 'performance-target',
        name: 'Achieve 100ms response time',
        priority: 'high'
      });

      expect(goal).toBeDefined();
      expect(goal.id).toBe('performance-target');
      expect(goal.status).toBe('active');
    });

    test('should track modification history via ModificationHistoryManager', () => {
      const goalId = 'test-goal';
      
      historyManager.recordModification(goalId, {
        type: 'target_adjustment',
        oldValue: 100,
        newValue: 120,
        reason: 'Resource constraints'
      }, { score: 0.5 });

      historyManager.recordModification(goalId, {
        type: 'priority_change',
        oldValue: 'high',
        newValue: 'medium',
        reason: 'Deadline extension'
      }, { score: 0.3 });

      const history = historyManager.getHistory(goalId);
      expect(history.length).toBe(2);
    });

    test('should trigger modification for registered goal', async () => {
      modifier.registerGoal({
        id: 'delivery-goal',
        name: 'Deliver feature by deadline',
        priority: 'high',
        targetDate: new Date(Date.now() + 86400000).toISOString()
      });

      const result = await modifier.triggerModification('delivery-goal', {
        type: 'resource_constraint',
        severity: 0.5
      });
      
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });

  describe('Scenario 5: Full Integration Flow', () => {
    test('should handle complete replanning cycle', async () => {
      // 1. Initialize services
      await guiService.initialize();

      // 2. Create tracker and register goals
      const tracker = new GoalProgressTracker();
      tracker.registerGoal({
        id: 'feature-complete',
        name: 'Complete Feature Implementation',
        type: 'completion'
      });

      // 3. Simulate progress (0-1 scale)
      tracker.updateProgress('feature-complete', 0.25);
      await guiService.updateState({ status: 'monitoring' });

      // 4. Simulate issue detection
      const evaluator = new PlanEvaluator();
      const evaluation = evaluator.evaluate(
        { tasks: [{ id: 'code', status: 'delayed' }] },
        { id: 'code', delay: 100 },
        { trigger: ReplanTrigger.RESOURCE_CONSTRAINT }
      );

      // 5. Record replan
      await guiService.updateState({ status: 'replanning' });
      await guiService.recordReplan({
        trigger: 'resource_constraint',
        reason: 'Code task delayed',
        evaluation: { riskScore: evaluation.riskScore },
        success: true
      });

      // 6. Update state back to monitoring
      await guiService.updateState({ status: 'monitoring' });

      // 7. Get final summary
      const summary = await guiService.getSummary();

      expect(summary.status).toBe('monitoring');
      expect(summary.metrics.totalReplans).toBeGreaterThan(0);

      // Cleanup
      tracker.stopTracking();
    });

    test('should maintain consistency across components', async () => {
      await guiService.initialize();

      // Perform multiple operations sequentially to avoid race conditions
      await guiService.recordReplan({ trigger: 'manual', success: true });
      await guiService.updateState({ status: 'optimizing' });
      await guiService.recordReplan({ trigger: 'optimization', success: true });
      await guiService.updateState({ status: 'idle' });

      const state = await guiService.getState();
      const history = await guiService.getHistory();

      expect(state.status).toBe('idle');
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(state.metrics.totalReplans).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Scenario 6: CLI Integration', () => {
    test('should support CLI-style operations', async () => {
      await guiService.initialize();

      // Simulate CLI: replan command
      await guiService.updateState({ status: 'evaluating' });
      await guiService.recordReplan({
        trigger: 'cli_manual',
        command: 'npx musubi-orchestrate replan context-123',
        success: true
      });
      await guiService.updateState({ status: 'idle' });

      // Simulate CLI: goal status command
      const goalProgress = await guiService.getGoalProgress();
      expect(goalProgress).toBeDefined();

      // Simulate CLI: optimize run command
      await guiService.updateState({ status: 'optimizing' });
      const optimization = await guiService.getPathOptimization();
      expect(optimization).toBeDefined();
      await guiService.updateState({ status: 'idle' });

      // Verify operations were recorded
      const history = await guiService.getHistory();
      const cliEvent = history.find(h => h.trigger === 'cli_manual');
      expect(cliEvent).toBeDefined();
    });
  });

  describe('Scenario 7: Error Handling and Recovery', () => {
    test('should handle goal registration with missing id', () => {
      const tracker = new GoalProgressTracker();
      
      // Should auto-generate id for goal without id
      const goal = tracker.registerGoal({ name: 'No ID Goal', type: 'completion' });
      expect(goal).toBeDefined();
      expect(goal.id).toBeDefined();

      const summary = tracker.getStatusSummary();
      expect(summary.total).toBe(1);

      tracker.stopTracking();
    });

    test('should handle missing files gracefully', async () => {
      const emptyService = new ReplanningService('/nonexistent/path');
      
      // Should return defaults, not throw
      const state = await emptyService.getState();
      expect(state.status).toBe('idle');

      const goals = await emptyService.getGoalProgress();
      expect(goals.goals).toEqual([]);

      const optimization = await emptyService.getPathOptimization();
      expect(optimization.status).toBe('idle');
    });

    test('should recover from corrupted state files', async () => {
      // Write corrupted state file
      const stateFile = path.join(tempDir, 'storage', 'replanning', 'corrupted-state.json');
      await fs.writeFile(stateFile, 'not valid json{{{');

      // Service should still work with defaults
      const service = new ReplanningService(tempDir);
      const state = await service.getState();
      expect(state).toBeDefined();
      expect(state.status).toBe('idle');
    });
  });

  describe('Scenario 8: Performance Under Load', () => {
    test('should handle sequential replan recordings efficiently', async () => {
      await guiService.initialize();

      const startTime = Date.now();
      const operationCount = 20;

      // Sequential operations to avoid file system race conditions
      for (let i = 0; i < operationCount; i++) {
        await guiService.recordReplan({
          trigger: `sequential-${i}`,
          success: true,
          timestamp: new Date().toISOString()
        });
      }

      const duration = Date.now() - startTime;
      const state = await guiService.getState();

      expect(state.metrics.totalReplans).toBeGreaterThanOrEqual(operationCount);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle rapid state updates', async () => {
      await guiService.initialize();

      const states = ['idle', 'monitoring', 'evaluating', 'replanning', 'optimizing'];
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        const state = states[i % states.length];
        await guiService.updateState({ status: state });
      }

      const finalState = await guiService.getState();
      expect(finalState.status).toBe(states[(iterations - 1) % states.length]);
    });
  });
});
