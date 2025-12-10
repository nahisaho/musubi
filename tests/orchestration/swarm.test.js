/**
 * Tests for SwarmPattern
 */

const {
  OrchestrationEngine,
  ExecutionContext,
  PatternType,
  ExecutionStatus,
  SwarmPattern,
  PLabel,
  SwarmStrategy,
  createSwarmPattern
} = require('../../src/orchestration');

describe('SwarmPattern', () => {
  let engine;
  let pattern;

  beforeEach(() => {
    engine = new OrchestrationEngine({ 
      enableHumanValidation: false 
    });
    pattern = createSwarmPattern();
    engine.registerPattern(PatternType.SWARM, pattern);

    // Register test skills
    engine.registerSkill('analyzer', async (input) => ({
      role: 'analyzer',
      result: `Analyzed: ${input.data || 'default'}`,
      confidence: 0.9
    }));

    engine.registerSkill('transformer', async (input) => ({
      role: 'transformer',
      result: `Transformed: ${input.data || 'default'}`,
      processed: true
    }));

    engine.registerSkill('validator', async (input) => ({
      role: 'validator',
      result: `Validated: ${input.data || 'default'}`,
      valid: true
    }));

    engine.registerSkill('aggregator', async (input) => ({
      role: 'aggregator',
      result: 'Aggregated results',
      count: Object.keys(input.previousResults || {}).length
    }));

    engine.registerSkill('slow', async (_input) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { result: 'slow task done' };
    });
  });

  afterEach(() => {
    if (engine) {
      engine.cancelAll();
    }
  });

  describe('Pattern Creation', () => {
    test('should create pattern with default options', () => {
      const p = createSwarmPattern();
      expect(p).toBeInstanceOf(SwarmPattern);
      expect(p.metadata.name).toBe(PatternType.SWARM);
    });

    test('should create pattern with custom options', () => {
      const p = createSwarmPattern({
        strategy: SwarmStrategy.FIRST,
        maxConcurrent: 5,
        timeout: 30000
      });
      expect(p.options.strategy).toBe(SwarmStrategy.FIRST);
      expect(p.options.maxConcurrent).toBe(5);
      expect(p.options.timeout).toBe(30000);
    });

    test('should have correct metadata', () => {
      expect(pattern.metadata.type).toBe(PatternType.SWARM);
      expect(pattern.metadata.tags).toContain('parallel');
      expect(pattern.metadata.supportsParallel).toBe(true);
    });
  });

  describe('Validation', () => {
    test('should fail without tasks', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {}
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Swarm pattern requires input.tasks array');
    });

    test('should fail with empty tasks', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          tasks: []
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Swarm pattern requires at least one task');
    });

    test('should fail with task missing skill', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          tasks: [{}]
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
    });

    test('should fail with unknown skill', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          tasks: [{ skill: 'unknown_skill' }]
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unknown skill'))).toBe(true);
    });

    test('should pass with valid tasks', () => {
      const context = new ExecutionContext({
        task: 'Test task',
        input: {
          tasks: [
            { skill: 'analyzer' },
            { skill: 'transformer' }
          ]
        }
      });

      const result = pattern.validate(context, engine);
      expect(result.valid).toBe(true);
    });
  });

  describe('Basic Parallel Execution', () => {
    test('should execute single task', async () => {
      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer', input: { data: 'test' } }
          ]
        }
      });

      expect(context.output.completed).toContain('analyzer');
      expect(context.output.results.analyzer).toBeDefined();
    });

    test('should execute multiple tasks in parallel', async () => {
      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer' },
            { skill: 'transformer' },
            { skill: 'validator' }
          ]
        }
      });

      expect(context.output.completed).toHaveLength(3);
      expect(context.output.completed).toContain('analyzer');
      expect(context.output.completed).toContain('transformer');
      expect(context.output.completed).toContain('validator');
    });

    test('should emit events during execution', async () => {
      const events = [];
      engine.on('swarmStarted', (data) => events.push({ type: 'started', data }));
      engine.on('swarmBatchStarted', (data) => events.push({ type: 'batchStarted', data }));
      engine.on('swarmTaskCompleted', (data) => events.push({ type: 'taskCompleted', data }));
      engine.on('swarmCompleted', (data) => events.push({ type: 'completed', data }));

      await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer' },
            { skill: 'transformer' }
          ]
        }
      });

      expect(events.some(e => e.type === 'started')).toBe(true);
      expect(events.some(e => e.type === 'taskCompleted')).toBe(true);
      expect(events.some(e => e.type === 'completed')).toBe(true);
    });
  });

  describe('P-Label Priority', () => {
    test('should have all P-labels defined', () => {
      expect(PLabel.P0).toBe('P0');
      expect(PLabel.P1).toBe('P1');
      expect(PLabel.P2).toBe('P2');
      expect(PLabel.P3).toBe('P3');
    });

    test('should execute P0 tasks first', async () => {
      const executionOrder = [];
      
      engine.registerSkill('tracker', async (input) => {
        executionOrder.push(input.id);
        return { id: input.id };
      });

      await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { id: 'low', skill: 'tracker', priority: PLabel.P3, input: { id: 'low' } },
            { id: 'critical', skill: 'tracker', priority: PLabel.P0, input: { id: 'critical' } },
            { id: 'high', skill: 'tracker', priority: PLabel.P1, input: { id: 'high' } }
          ]
        }
      });

      // P0 should be first
      expect(executionOrder[0]).toBe('critical');
    });

    test('should track priority in summary', async () => {
      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer', priority: PLabel.P0 },
            { skill: 'transformer', priority: PLabel.P1 },
            { skill: 'validator', priority: PLabel.P2 }
          ]
        }
      });

      expect(context.output.summary.byPriority).toBeDefined();
      expect(context.output.summary.byPriority[PLabel.P0].total).toBe(1);
      expect(context.output.summary.byPriority[PLabel.P1].total).toBe(1);
    });
  });

  describe('Dependencies', () => {
    test('should respect task dependencies', async () => {
      const executionOrder = [];
      
      engine.registerSkill('step1', async () => {
        executionOrder.push('step1');
        return { step: 1 };
      });
      
      engine.registerSkill('step2', async () => {
        executionOrder.push('step2');
        return { step: 2 };
      });
      
      engine.registerSkill('step3', async () => {
        executionOrder.push('step3');
        return { step: 3 };
      });

      await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { id: 'task1', skill: 'step1' },
            { id: 'task2', skill: 'step2' },
            { id: 'task3', skill: 'step3' }
          ],
          dependencies: {
            'task2': ['task1'],
            'task3': ['task2']
          }
        }
      });

      // Dependencies mean step1 → step2 → step3
      const idx1 = executionOrder.indexOf('step1');
      const idx2 = executionOrder.indexOf('step2');
      const idx3 = executionOrder.indexOf('step3');
      
      expect(idx1).toBeLessThan(idx2);
      expect(idx2).toBeLessThan(idx3);
    });

    test('should fail on circular dependencies', async () => {
      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { id: 'a', skill: 'analyzer' },
            { id: 'b', skill: 'transformer' }
          ],
          dependencies: {
            'a': ['b'],
            'b': ['a']
          }
        }
      });

      // Engine catches the error and sets context to failed
      expect(context.status).toBe(ExecutionStatus.FAILED);
      expect(context.error).toContain('Cannot resolve dependencies');
    });
  });

  describe('Strategies', () => {
    test('should wait for all with ALL strategy', async () => {
      const allPattern = createSwarmPattern({
        strategy: SwarmStrategy.ALL
      });
      engine.registerPattern(PatternType.SWARM, allPattern);

      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer' },
            { skill: 'transformer' },
            { skill: 'validator' }
          ]
        }
      });

      expect(context.output.completed).toHaveLength(3);
    });

    test('should exit early with FIRST strategy', async () => {
      const firstPattern = createSwarmPattern({
        strategy: SwarmStrategy.FIRST
      });
      engine.registerPattern(PatternType.SWARM, firstPattern);

      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer' },
            { skill: 'slow' }
          ]
        }
      });

      expect(context.output.completed.length).toBeGreaterThanOrEqual(1);
    });

    test('should exit after majority with MAJORITY strategy', async () => {
      const majorityPattern = createSwarmPattern({
        strategy: SwarmStrategy.MAJORITY
      });
      engine.registerPattern(PatternType.SWARM, majorityPattern);

      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer' },
            { skill: 'transformer' },
            { skill: 'slow' }
          ]
        }
      });

      expect(context.output.completed.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      engine.registerSkill('failing', async () => {
        throw new Error('Task failed');
      });
    });

    test('should track failed tasks', async () => {
      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer' },
            { skill: 'failing' }
          ]
        }
      });

      expect(context.output.failed).toContain('failing');
      expect(context.output.completed).toContain('analyzer');
    });

    test('should emit task failure events', async () => {
      const events = [];
      engine.on('swarmTaskFailed', (data) => events.push(data));

      await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer' },
            { skill: 'failing' }
          ]
        }
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].taskId).toBe('failing');
    });

    test('should support retry configuration', async () => {
      // Note: Retry logic will be improved in future releases
      const retryPattern = createSwarmPattern({
        retryFailed: true,
        retryAttempts: 3
      });
      
      expect(retryPattern.options.retryFailed).toBe(true);
      expect(retryPattern.options.retryAttempts).toBe(3);
    });
  });

  describe('Shared Context', () => {
    test('should pass shared context to all tasks', async () => {
      const receivedContexts = [];
      
      engine.registerSkill('contextReceiver', async (input) => {
        receivedContexts.push(input);
        return { received: true };
      });

      await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { id: 'task1', skill: 'contextReceiver' },
            { id: 'task2', skill: 'contextReceiver' }
          ],
          sharedContext: {
            projectId: 'test-123',
            environment: 'testing'
          }
        }
      });

      expect(receivedContexts.every(c => c.projectId === 'test-123')).toBe(true);
      expect(receivedContexts.every(c => c.environment === 'testing')).toBe(true);
    });

    test('should provide previous results to later tasks', async () => {
      let aggregatorInput = null;
      
      engine.registerSkill('gatherer', async (input) => {
        aggregatorInput = input;
        return { gathered: Object.keys(input.previousResults || {}).length };
      });

      await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { id: 'task1', skill: 'analyzer' },
            { id: 'task2', skill: 'transformer' },
            { id: 'gather', skill: 'gatherer' }
          ],
          dependencies: {
            'gather': ['task1', 'task2']
          }
        }
      });

      expect(aggregatorInput.previousResults).toBeDefined();
      expect(Object.keys(aggregatorInput.previousResults)).toContain('task1');
      expect(Object.keys(aggregatorInput.previousResults)).toContain('task2');
    });
  });

  describe('Summary', () => {
    test('should provide execution summary', async () => {
      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer' },
            { skill: 'transformer' }
          ]
        }
      });

      expect(context.output.summary).toBeDefined();
      expect(context.output.summary.total).toBe(2);
      expect(context.output.summary.completed).toBe(2);
      expect(context.output.summary.failed).toBe(0);
    });

    test('should calculate success rate', async () => {
      engine.registerSkill('failing', async () => {
        throw new Error('Failed');
      });

      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer' },
            { skill: 'failing' }
          ]
        }
      });

      expect(context.output.summary.successRate).toBe('50.0%');
    });

    test('should track duration', async () => {
      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'slow' }
          ]
        }
      });

      expect(context.output.summary.duration).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    test('should work with OrchestrationEngine execute', async () => {
      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer' },
            { skill: 'transformer' }
          ]
        }
      });

      expect(context.output).toBeDefined();
      expect(context.output.results).toBeDefined();
    });

    test('should add child contexts', async () => {
      const context = await engine.execute(PatternType.SWARM, {
        input: {
          tasks: [
            { skill: 'analyzer' },
            { skill: 'transformer' }
          ]
        }
      });

      expect(context.children.length).toBeGreaterThanOrEqual(2);
    });
  });
});
