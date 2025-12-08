/**
 * SequentialPattern Tests
 * 
 * Tests for sequential skill execution pattern
 */

const {
  SequentialPattern,
  SequentialOptions,
  createSequentialPattern
} = require('../../src/orchestration/patterns/sequential');

const {
  OrchestrationEngine,
  ExecutionContext,
  ExecutionStatus,
  PatternType
} = require('../../src/orchestration/orchestration-engine');

describe('SequentialPattern', () => {
  let pattern;
  let engine;

  beforeEach(() => {
    pattern = new SequentialPattern();
    engine = new OrchestrationEngine();

    // Register test skills
    engine.registerSkill('skill-a', {
      execute: async (input) => ({ a: input.value || 1, result: 'A' })
    });

    engine.registerSkill('skill-b', {
      execute: async (input) => ({ b: input.a * 2, result: 'B' })
    });

    engine.registerSkill('skill-c', {
      execute: async (input) => ({ c: input.b + 10, result: 'C' })
    });

    engine.registerSkill('fail-skill', {
      execute: async () => { throw new Error('Skill failed'); }
    });

    engine.registerPattern(PatternType.SEQUENTIAL, pattern);
  });

  describe('constructor', () => {
    it('should create pattern with default options', () => {
      expect(pattern.options.errorHandling).toBe(SequentialOptions.STOP_ON_ERROR);
      expect(pattern.options.maxRetries).toBe(3);
      expect(pattern.options.retryDelay).toBe(1000);
    });

    it('should accept custom options', () => {
      const custom = new SequentialPattern({
        errorHandling: SequentialOptions.CONTINUE_ON_ERROR,
        maxRetries: 5
      });

      expect(custom.options.errorHandling).toBe(SequentialOptions.CONTINUE_ON_ERROR);
      expect(custom.options.maxRetries).toBe(5);
    });

    it('should have correct metadata', () => {
      expect(pattern.metadata.name).toBe(PatternType.SEQUENTIAL);
      expect(pattern.metadata.type).toBe(PatternType.SEQUENTIAL);
      expect(pattern.metadata.supportsParallel).toBe(false);
      expect(pattern.metadata.tags).toContain('linear');
    });
  });

  describe('validate', () => {
    it('should fail without skills array', () => {
      const context = new ExecutionContext({ input: {} });
      const result = pattern.validate(context, engine);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Sequential pattern requires input.skills array');
    });

    it('should fail with empty skills array', () => {
      const context = new ExecutionContext({
        input: { skills: [] }
      });
      const result = pattern.validate(context, engine);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Sequential pattern requires at least one skill');
    });

    it('should fail with unknown skill', () => {
      const context = new ExecutionContext({
        input: { skills: ['unknown-skill'] }
      });
      const result = pattern.validate(context, engine);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown skill: unknown-skill');
    });

    it('should pass with valid skills', () => {
      const context = new ExecutionContext({
        input: { skills: ['skill-a', 'skill-b'] }
      });
      const result = pattern.validate(context, engine);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('execute', () => {
    it('should throw on validation failure', async () => {
      const context = new ExecutionContext({
        input: {}
      });

      await expect(pattern.execute(context, engine)).rejects.toThrow(
        'Validation failed'
      );
    });

    it('should execute skills sequentially', async () => {
      const context = new ExecutionContext({
        input: {
          skills: ['skill-a', 'skill-b', 'skill-c'],
          initialInput: { value: 5 }
        }
      });

      const result = await pattern.execute(context, engine);

      expect(result.summary.allCompleted).toBe(true);
      expect(result.summary.totalSteps).toBe(3);
      expect(result.summary.completed).toBe(3);
      expect(result.summary.failed).toBe(0);
    });

    it('should pass output from one skill to next', async () => {
      const context = new ExecutionContext({
        input: {
          skills: ['skill-a', 'skill-b', 'skill-c'],
          initialInput: { value: 5 }
        }
      });

      const result = await pattern.execute(context, engine);

      // skill-a: { a: 5, result: 'A' }
      // skill-b: { b: 10, result: 'B' }
      // skill-c: { c: 20, result: 'C' }
      expect(result.finalOutput.c).toBe(20);
    });

    it('should stop on error by default', async () => {
      const context = new ExecutionContext({
        input: {
          skills: ['skill-a', 'fail-skill', 'skill-c']
        }
      });

      await expect(pattern.execute(context, engine)).rejects.toThrow(
        'Sequential execution failed at step 2'
      );
    });

    it('should continue on error when configured', async () => {
      const continuePattern = new SequentialPattern({
        errorHandling: SequentialOptions.CONTINUE_ON_ERROR
      });

      const context = new ExecutionContext({
        input: {
          skills: ['skill-a', 'fail-skill', 'skill-c']
        }
      });

      const result = await continuePattern.execute(context, engine);

      expect(result.summary.completed).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.hasFailed).toBe(true);
    });

    it('should add children to context', async () => {
      const context = new ExecutionContext({
        input: {
          skills: ['skill-a', 'skill-b']
        }
      });

      await pattern.execute(context, engine);

      // Each skill execution adds 2 children: step context + direct execution context
      expect(context.children.length).toBeGreaterThanOrEqual(2);
      const stepContexts = context.children.filter(c => c.metadata.stepIndex !== undefined);
      expect(stepContexts).toHaveLength(2);
      expect(stepContexts[0].skill).toBe('skill-a');
      expect(stepContexts[1].skill).toBe('skill-b');
    });

    it('should emit sequential events', async () => {
      const startListener = jest.fn();
      const stepStartListener = jest.fn();
      const stepCompleteListener = jest.fn();
      const completeListener = jest.fn();

      engine.on('sequentialStarted', startListener);
      engine.on('sequentialStepStarted', stepStartListener);
      engine.on('sequentialStepCompleted', stepCompleteListener);
      engine.on('sequentialCompleted', completeListener);

      const context = new ExecutionContext({
        input: {
          skills: ['skill-a', 'skill-b']
        }
      });

      await pattern.execute(context, engine);

      expect(startListener).toHaveBeenCalledTimes(1);
      expect(stepStartListener).toHaveBeenCalledTimes(2);
      expect(stepCompleteListener).toHaveBeenCalledTimes(2);
      expect(completeListener).toHaveBeenCalledTimes(1);
    });

    it('should include step metadata', async () => {
      const context = new ExecutionContext({
        input: {
          skills: ['skill-a', 'skill-b']
        }
      });

      await pattern.execute(context, engine);

      const firstChild = context.children[0];
      expect(firstChild.metadata.stepIndex).toBe(0);
      expect(firstChild.metadata.totalSteps).toBe(2);
      expect(firstChild.metadata.pattern).toBe(PatternType.SEQUENTIAL);
    });

    it('should return results array', async () => {
      const context = new ExecutionContext({
        input: {
          skills: ['skill-a', 'skill-b']
        }
      });

      const result = await pattern.execute(context, engine);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].step).toBe(1);
      expect(result.results[0].skill).toBe('skill-a');
      expect(result.results[0].status).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('custom transformOutput', () => {
    it('should use custom output transformer', async () => {
      const customPattern = new SequentialPattern({
        transformOutput: (output, context) => ({
          ...output,
          transformed: true,
          previousSkill: context.skill
        })
      });

      engine.registerPattern('custom-seq', customPattern);

      const context = new ExecutionContext({
        input: {
          skills: ['skill-a', 'skill-b']
        }
      });

      await customPattern.execute(context, engine);

      // Check that skill-b received transformed input
      const lastChild = context.children[context.children.length - 1];
      expect(lastChild.input.transformed).toBe(true);
    });
  });

  describe('summary', () => {
    it('should calculate success rate', async () => {
      const context = new ExecutionContext({
        input: {
          skills: ['skill-a', 'skill-b']
        }
      });

      const result = await pattern.execute(context, engine);

      expect(result.summary.successRate).toBe('100.0%');
    });

    it('should handle partial success', async () => {
      const continuePattern = new SequentialPattern({
        errorHandling: SequentialOptions.CONTINUE_ON_ERROR
      });

      const context = new ExecutionContext({
        input: {
          skills: ['skill-a', 'fail-skill', 'skill-b', 'skill-c']
        }
      });

      const result = await continuePattern.execute(context, engine);

      expect(result.summary.totalSteps).toBe(4);
      expect(result.summary.completed).toBe(3);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.successRate).toBe('75.0%');
    });
  });
});

describe('SequentialOptions', () => {
  it('should have all error handling options', () => {
    expect(SequentialOptions.STOP_ON_ERROR).toBe('stop-on-error');
    expect(SequentialOptions.CONTINUE_ON_ERROR).toBe('continue-on-error');
    expect(SequentialOptions.RETRY_ON_ERROR).toBe('retry-on-error');
  });
});

describe('createSequentialPattern', () => {
  it('should create pattern with default options', () => {
    const pattern = createSequentialPattern();
    expect(pattern).toBeInstanceOf(SequentialPattern);
    expect(pattern.options.errorHandling).toBe(SequentialOptions.STOP_ON_ERROR);
  });

  it('should create pattern with custom options', () => {
    const pattern = createSequentialPattern({
      maxRetries: 10
    });
    expect(pattern.options.maxRetries).toBe(10);
  });
});
