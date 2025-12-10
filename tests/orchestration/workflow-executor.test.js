/**
 * Tests for WorkflowExecutor
 * Sprint 3.5: Advanced Workflows
 */

const {
  WorkflowExecutor,
  WorkflowDefinition,
  ExecutionContext,
  StepResult,
  StepType,
  ExecutionState,
  RecoveryStrategy
} = require('../../src/orchestration/workflow-executor');

describe('WorkflowExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new WorkflowExecutor();
  });

  describe('WorkflowDefinition', () => {
    test('should create valid workflow definition', () => {
      const workflow = new WorkflowDefinition(
        'test-workflow',
        'Test Workflow',
        [
          { id: 'step1', type: StepType.SKILL, skillId: 'test-skill' }
        ],
        { description: 'Test description' }
      );

      expect(workflow.id).toBe('test-workflow');
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.steps).toHaveLength(1);
    });

    test('should validate workflow with missing ID', () => {
      const workflow = new WorkflowDefinition('', 'Test', [{ id: 'step1', type: StepType.SKILL }]);
      const result = workflow.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow ID is required');
    });

    test('should validate workflow with duplicate step IDs', () => {
      const workflow = new WorkflowDefinition('test', 'Test', [
        { id: 'step1', type: StepType.SKILL },
        { id: 'step1', type: StepType.TOOL }
      ]);
      const result = workflow.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate step ID: step1');
    });

    test('should validate workflow with empty steps', () => {
      const workflow = new WorkflowDefinition('test', 'Test', []);
      const result = workflow.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow must have at least one step');
    });

    test('should pass validation for valid workflow', () => {
      const workflow = new WorkflowDefinition('test', 'Test', [
        { id: 'step1', type: StepType.CHECKPOINT, name: 'start' }
      ]);
      const result = workflow.validate();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('ExecutionContext', () => {
    test('should create execution context with unique ID', () => {
      const ctx = new ExecutionContext('workflow-1');
      
      expect(ctx.workflowId).toBe('workflow-1');
      expect(ctx.executionId).toMatch(/^exec-\d+-[a-z0-9]+$/);
      expect(ctx.state).toBe(ExecutionState.PENDING);
    });

    test('should manage variables', () => {
      const ctx = new ExecutionContext('test');
      
      ctx.setVariable('name', 'value');
      expect(ctx.getVariable('name')).toBe('value');
      expect(ctx.getVariable('nonexistent', 'default')).toBe('default');
    });

    test('should create and restore checkpoints', () => {
      const ctx = new ExecutionContext('test');
      ctx.setVariable('counter', 1);
      ctx.currentStep = 'step1';
      
      ctx.createCheckpoint('checkpoint1');
      
      ctx.setVariable('counter', 5);
      ctx.currentStep = 'step5';
      
      const restored = ctx.restoreCheckpoint('checkpoint1');
      
      expect(restored).toBe(true);
      expect(ctx.getVariable('counter')).toBe(1);
      expect(ctx.currentStep).toBe('step1');
    });

    test('should return false for non-existent checkpoint', () => {
      const ctx = new ExecutionContext('test');
      expect(ctx.restoreCheckpoint('nonexistent')).toBe(false);
    });

    test('should calculate duration', () => {
      const ctx = new ExecutionContext('test');
      ctx.startTime = Date.now() - 1000;
      
      expect(ctx.getDuration()).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('StepResult', () => {
    test('should create success result', () => {
      const result = new StepResult('step1', true, { data: 'output' }, null, 100);
      
      expect(result.stepId).toBe('step1');
      expect(result.success).toBe(true);
      expect(result.output).toEqual({ data: 'output' });
      expect(result.error).toBeNull();
      expect(result.duration).toBe(100);
    });

    test('should create failure result', () => {
      const result = new StepResult('step1', false, null, 'Error message', 50);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error message');
    });
  });

  describe('Step Handlers', () => {
    describe('Checkpoint Handler', () => {
      test('should create checkpoint', async () => {
        const workflow = new WorkflowDefinition('test', 'Test', [
          { id: 'cp1', type: StepType.CHECKPOINT, name: 'start' }
        ]);

        let checkpointEmitted = false;
        executor.on('checkpoint', ({ name }) => {
          if (name === 'start') checkpointEmitted = true;
        });

        await executor.execute(workflow);
        
        expect(checkpointEmitted).toBe(true);
      });
    });

    describe('Condition Handler', () => {
      test('should execute then branch when condition is true', async () => {
        let thenExecuted = false;
        let elseExecuted = false;

        executor.registerStepHandler('mark-then', async () => { thenExecuted = true; });
        executor.registerStepHandler('mark-else', async () => { elseExecuted = true; });

        const workflow = new WorkflowDefinition('test', 'Test', [
          {
            id: 'condition1',
            type: StepType.CONDITION,
            condition: true,
            thenSteps: [{ id: 'then1', type: 'mark-then' }],
            elseSteps: [{ id: 'else1', type: 'mark-else' }]
          }
        ]);

        await executor.execute(workflow);
        
        expect(thenExecuted).toBe(true);
        expect(elseExecuted).toBe(false);
      });

      test('should execute else branch when condition is false', async () => {
        let elseExecuted = false;

        executor.registerStepHandler('mark-else', async () => { elseExecuted = true; });

        const workflow = new WorkflowDefinition('test', 'Test', [
          {
            id: 'condition1',
            type: StepType.CONDITION,
            condition: false,
            thenSteps: [],
            elseSteps: [{ id: 'else1', type: 'mark-else' }]
          }
        ]);

        await executor.execute(workflow);
        
        expect(elseExecuted).toBe(true);
      });
    });

    describe('Loop Handler', () => {
      test('should iterate over array', async () => {
        const processedItems = [];

        executor.registerStepHandler('process', async (step, context) => {
          const item = context.getVariable('item');
          processedItems.push(item);
        });

        const workflow = new WorkflowDefinition('test', 'Test', [
          {
            id: 'loop1',
            type: StepType.LOOP,
            items: ['a', 'b', 'c'],
            itemVariable: 'item',
            steps: [{ id: 'process', type: 'process' }]
          }
        ]);

        await executor.execute(workflow);
        
        expect(processedItems).toEqual(['a', 'b', 'c']);
      });

      test('should respect maxIterations', async () => {
        let iterations = 0;

        executor.registerStepHandler('count', async () => { iterations++; });

        const workflow = new WorkflowDefinition('test', 'Test', [
          {
            id: 'loop1',
            type: StepType.LOOP,
            items: Array(100).fill('x'),
            maxIterations: 5,
            steps: [{ id: 'count', type: 'count' }]
          }
        ]);

        await executor.execute(workflow);
        
        expect(iterations).toBe(5);
      });
    });

    describe('Parallel Handler', () => {
      test('should execute steps in parallel', async () => {
        const startTimes = [];

        executor.registerStepHandler('async-task', async (step) => {
          startTimes.push({ id: step.id, time: Date.now() });
          await new Promise(r => setTimeout(r, 50));
          return step.id;
        });

        const workflow = new WorkflowDefinition('test', 'Test', [
          {
            id: 'parallel1',
            type: StepType.PARALLEL,
            steps: [
              { id: 'task1', type: 'async-task' },
              { id: 'task2', type: 'async-task' },
              { id: 'task3', type: 'async-task' }
            ]
          }
        ]);

        const start = Date.now();
        await executor.execute(workflow);
        const duration = Date.now() - start;

        // Should complete in roughly parallel time, not 3x
        expect(duration).toBeLessThan(200);
      });
    });

    describe('Human Review Handler', () => {
      test('should emit review-required event', async () => {
        let reviewEvent = null;

        executor.on('review-required', (event) => {
          reviewEvent = event;
        });

        const workflow = new WorkflowDefinition('test', 'Test', [
          {
            id: 'review1',
            type: StepType.HUMAN_REVIEW,
            message: 'Please review this',
            options: ['approve', 'reject']
          }
        ]);

        await executor.execute(workflow);
        
        expect(reviewEvent).not.toBeNull();
        expect(reviewEvent.message).toBe('Please review this');
        expect(reviewEvent.options).toEqual(['approve', 'reject']);
      });
    });
  });

  describe('Variable Resolution', () => {
    test('should resolve string variables in condition', async () => {
      let resolved = false;

      executor.registerStepHandler('check', async (_step, _context) => {
        resolved = true;
      });

      const workflow = new WorkflowDefinition('test', 'Test', [
        {
          id: 'cond1',
          type: StepType.CONDITION,
          condition: { $eq: [{ $var: 'name' }, 'World'] },
          thenSteps: [{ id: 'check1', type: 'check' }]
        }
      ]);

      await executor.execute(workflow, { name: 'World' });
      
      expect(resolved).toBe(true);
    });

    test('should resolve object variables', async () => {
      let resolvedValue = null;

      executor.registerStepHandler('capture', async (step, context) => {
        resolvedValue = context.getVariable('data');
      });

      const workflow = new WorkflowDefinition('test', 'Test', [
        { id: 'capture1', type: 'capture' }
      ]);

      await executor.execute(workflow, { data: { nested: 'value' } });
      
      expect(resolvedValue).toEqual({ nested: 'value' });
    });
  });

  describe('Condition Evaluation', () => {
    test('should evaluate $eq operator', async () => {
      let conditionResult = null;

      executor.registerStepHandler('check', async (_step, _context) => {
        conditionResult = true;
      });

      const workflow = new WorkflowDefinition('test', 'Test', [
        {
          id: 'cond1',
          type: StepType.CONDITION,
          condition: { $eq: [{ $var: 'status' }, 'active'] },
          thenSteps: [{ id: 'check1', type: 'check' }]
        }
      ]);

      await executor.execute(workflow, { status: 'active' });
      expect(conditionResult).toBe(true);

      conditionResult = null;
      await executor.execute(workflow, { status: 'inactive' });
      expect(conditionResult).toBeNull();
    });

    test('should evaluate $and operator', async () => {
      let executed = false;

      executor.registerStepHandler('exec', async () => { executed = true; });

      const workflow = new WorkflowDefinition('test', 'Test', [
        {
          id: 'cond1',
          type: StepType.CONDITION,
          condition: { $and: [{ $exists: 'a' }, { $exists: 'b' }] },
          thenSteps: [{ id: 'exec1', type: 'exec' }]
        }
      ]);

      await executor.execute(workflow, { a: 1, b: 2 });
      expect(executed).toBe(true);

      executed = false;
      await executor.execute(workflow, { a: 1 }); // Missing b
      expect(executed).toBe(false);
    });

    test('should evaluate $or operator', async () => {
      let executed = false;

      executor.registerStepHandler('exec', async () => { executed = true; });

      const workflow = new WorkflowDefinition('test', 'Test', [
        {
          id: 'cond1',
          type: StepType.CONDITION,
          condition: { $or: [{ $exists: 'a' }, { $exists: 'b' }] },
          thenSteps: [{ id: 'exec1', type: 'exec' }]
        }
      ]);

      await executor.execute(workflow, { b: 2 }); // Only b exists
      expect(executed).toBe(true);
    });
  });

  describe('Execution Control', () => {
    test('should pause and resume execution', async () => {
      let step2Executed = false;

      executor.registerStepHandler('slow', async (step, context) => {
        if (step.id === 'step1') {
          // Simulate pause during step1
          executor.pause(context.executionId);
          await new Promise(r => setTimeout(r, 100));
          executor.resume(context.executionId);
        }
        if (step.id === 'step2') {
          step2Executed = true;
        }
      });

      const workflow = new WorkflowDefinition('test', 'Test', [
        { id: 'step1', type: 'slow' },
        { id: 'step2', type: 'slow' }
      ]);

      await executor.execute(workflow);
      
      expect(step2Executed).toBe(true);
    });

    test('should cancel execution', async () => {
      let step2Executed = false;

      executor.registerStepHandler('cancellable', async (step, context) => {
        if (step.id === 'step1') {
          executor.cancel(context.executionId);
        }
        if (step.id === 'step2') {
          step2Executed = true;
        }
      });

      const workflow = new WorkflowDefinition('test', 'Test', [
        { id: 'step1', type: 'cancellable' },
        { id: 'step2', type: 'cancellable' }
      ]);

      await executor.execute(workflow);
      
      expect(step2Executed).toBe(false);
    });

    test('should get execution status', async () => {
      let capturedStatus = null;

      executor.registerStepHandler('status-check', async (step, context) => {
        capturedStatus = executor.getStatus(context.executionId);
      });

      const workflow = new WorkflowDefinition('test', 'Test', [
        { id: 'step1', type: 'status-check' }
      ]);

      await executor.execute(workflow);
      
      expect(capturedStatus).not.toBeNull();
      expect(capturedStatus.state).toBe(ExecutionState.RUNNING);
      expect(capturedStatus.currentStep).toBe('step1');
    });
  });

  describe('Error Handling', () => {
    test('should emit step-failed event on error', async () => {
      let failedEvent = null;

      executor.registerStepHandler('failing', async () => {
        throw new Error('Step failed');
      });

      executor.on('step-failed', (event) => {
        failedEvent = event;
      });

      const workflow = new WorkflowDefinition('test', 'Test', [
        { id: 'fail1', type: 'failing' }
      ], { retryPolicy: { maxRetries: 0 } });

      try {
        await executor.execute(workflow);
      } catch (e) {
        // Expected
      }
      
      expect(failedEvent).not.toBeNull();
      expect(failedEvent.stepId).toBe('fail1');
      expect(failedEvent.error).toBe('Step failed');
    });

    test('should retry on failure', async () => {
      let attempts = 0;

      executor.registerStepHandler('flaky', async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const workflow = new WorkflowDefinition('test', 'Test', [
        { id: 'flaky1', type: 'flaky', retry: { maxRetries: 3, backoffMs: 10 } }
      ]);

      const result = await executor.execute(workflow);
      
      expect(attempts).toBe(3);
      expect(result.state).toBe(ExecutionState.COMPLETED);
    });

    test('should apply skip strategy on error', async () => {
      let step2Executed = false;

      executor.registerStepHandler('failing', async () => {
        throw new Error('Skippable error');
      });

      executor.registerStepHandler('after', async () => {
        step2Executed = true;
      });

      const workflow = new WorkflowDefinition('test', 'Test', [
        { 
          id: 'skip1', 
          type: 'failing',
          onError: { strategy: RecoveryStrategy.SKIP }
        },
        { id: 'after1', type: 'after' }
      ], { retryPolicy: { maxRetries: 0 } });

      try {
        await executor.execute(workflow);
      } catch (e) {
        // May or may not throw depending on implementation
      }
      
      expect(step2Executed).toBe(true);
    });
  });

  describe('Events', () => {
    test('should emit execution lifecycle events', async () => {
      const events = [];

      executor.on('execution-started', () => events.push('started'));
      executor.on('step-started', () => events.push('step-started'));
      executor.on('step-completed', () => events.push('step-completed'));
      executor.on('execution-completed', () => events.push('completed'));

      const workflow = new WorkflowDefinition('test', 'Test', [
        { id: 'cp1', type: StepType.CHECKPOINT, name: 'start' }
      ]);

      await executor.execute(workflow);
      
      expect(events).toEqual(['started', 'step-started', 'step-completed', 'completed']);
    });
  });

  describe('Custom Step Handlers', () => {
    test('should register and use custom handler', async () => {
      let customExecuted = false;

      executor.registerStepHandler('custom-type', async (_step, _context) => {
        customExecuted = true;
        return { custom: 'result' };
      });

      const workflow = new WorkflowDefinition('test', 'Test', [
        { id: 'custom1', type: 'custom-type', customData: 'value' }
      ]);

      const _result = await executor.execute(workflow);
      
      expect(customExecuted).toBe(true);
    });
  });

  describe('Conditional Step Execution', () => {
    test('should skip step when "when" condition is false', async () => {
      let stepExecuted = false;

      executor.registerStepHandler('conditional', async () => {
        stepExecuted = true;
      });

      let skippedEvent = false;
      executor.on('step-skipped', () => { skippedEvent = true; });

      const workflow = new WorkflowDefinition('test', 'Test', [
        {
          id: 'cond1',
          type: 'conditional',
          when: { $exists: 'nonexistent' }
        }
      ]);

      await executor.execute(workflow);
      
      expect(stepExecuted).toBe(false);
      expect(skippedEvent).toBe(true);
    });
  });
});

describe('StepType Constants', () => {
  test('should have all step types defined', () => {
    expect(StepType.SKILL).toBe('skill');
    expect(StepType.TOOL).toBe('tool');
    expect(StepType.CONDITION).toBe('condition');
    expect(StepType.PARALLEL).toBe('parallel');
    expect(StepType.LOOP).toBe('loop');
    expect(StepType.CHECKPOINT).toBe('checkpoint');
    expect(StepType.HUMAN_REVIEW).toBe('human-review');
  });
});

describe('ExecutionState Constants', () => {
  test('should have all execution states defined', () => {
    expect(ExecutionState.PENDING).toBe('pending');
    expect(ExecutionState.RUNNING).toBe('running');
    expect(ExecutionState.PAUSED).toBe('paused');
    expect(ExecutionState.COMPLETED).toBe('completed');
    expect(ExecutionState.FAILED).toBe('failed');
    expect(ExecutionState.CANCELLED).toBe('cancelled');
    expect(ExecutionState.WAITING_REVIEW).toBe('waiting-review');
  });
});

describe('RecoveryStrategy Constants', () => {
  test('should have all recovery strategies defined', () => {
    expect(RecoveryStrategy.RETRY).toBe('retry');
    expect(RecoveryStrategy.SKIP).toBe('skip');
    expect(RecoveryStrategy.FALLBACK).toBe('fallback');
    expect(RecoveryStrategy.ROLLBACK).toBe('rollback');
    expect(RecoveryStrategy.ABORT).toBe('abort');
    expect(RecoveryStrategy.MANUAL).toBe('manual');
  });
});
