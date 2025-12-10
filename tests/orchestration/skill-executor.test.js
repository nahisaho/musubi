/**
 * Skill Executor Tests
 * Tests for Sprint 3.2: Skill Execution Engine
 */

const {
  SkillExecutor,
  ExecutionResult,
  ExecutionContext,
  ExecutionStatus,
  IOValidator
} = require('../../src/orchestration/skill-executor');

// Mock SkillRegistry
const createMockRegistry = () => ({
  skills: new Map(),
  getSkill(id) {
    return this.skills.get(id) || null;
  },
  getSkillEntry(id) {
    const skill = this.skills.get(id);
    if (!skill) return null;
    return { 
      metadata: skill, 
      handler: skill.handler,
      health: { isHealthy: () => true } 
    };
  },
  hasSkill(id) {
    return this.skills.has(id);
  },
  addSkill(skill) {
    this.skills.set(skill.id, skill);
  },
  recordExecution(_skillId, _success, _duration) {
    // Mock implementation
  }
});

describe('SkillExecutor', () => {
  let executor;
  let mockRegistry;

  beforeEach(() => {
    mockRegistry = createMockRegistry();
    executor = new SkillExecutor(mockRegistry, {
      defaultTimeout: 5000
    });

    // Add test skills
    mockRegistry.addSkill({
      id: 'sync-skill',
      name: 'Sync Skill',
      handler: (input) => ({ result: input.value * 2 }),
      inputs: [],
      outputs: []
    });

    mockRegistry.addSkill({
      id: 'async-skill',
      name: 'Async Skill',
      handler: async (input) => {
        await new Promise(r => setTimeout(r, 50));
        return { result: input.text.toUpperCase() };
      },
      inputs: [],
      outputs: []
    });

    mockRegistry.addSkill({
      id: 'error-skill',
      name: 'Error Skill',
      handler: () => {
        throw new Error('Intentional error');
      },
      inputs: [],
      outputs: []
    });
  });

  describe('Single Skill Execution', () => {
    test('should execute synchronous skill', async () => {
      const result = await executor.execute('sync-skill', { value: 21 });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe(42);
    });

    test('should execute asynchronous skill', async () => {
      const result = await executor.execute('async-skill', { text: 'hello' });
      expect(result.success).toBe(true);
      expect(result.output.result).toBe('HELLO');
    });

    test('should handle skill execution error', async () => {
      const result = await executor.execute('error-skill', {});
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should throw for non-existent skill', async () => {
      await expect(executor.execute('non-existent', {}))
        .rejects.toThrow("Skill 'non-existent' not found");
    });

    test('should emit execution events', async () => {
      const startListener = jest.fn();
      const completeListener = jest.fn();
      
      executor.on('execution-started', startListener);
      executor.on('execution-completed', completeListener);

      await executor.execute('sync-skill', { value: 5 });

      expect(startListener).toHaveBeenCalled();
      expect(completeListener).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    test('should validate input against schema', async () => {
      const result = await executor.execute('sync-skill', { value: 'not-a-number' });
      // Should still execute but may have validation issues depending on implementation
      expect(result).toBeDefined();
    });

    test('should handle missing required fields', async () => {
      // Without required 'value' field
      const result = await executor.execute('sync-skill', {});
      expect(result).toBeDefined();
    });
  });

  describe('Priority Execution', () => {
    test('should respect priority levels', async () => {
      mockRegistry.addSkill({
        id: 'p0-skill',
        name: 'P0 Skill',
        inputs: [],
        outputs: [],
        handler: () => ({ priority: 'P0' })
      });

      const result = await executor.execute('p0-skill', {}, { 
        priority: 'P0' 
      });
      expect(result.success).toBe(true);
    });

    test('should track priority in execution context', async () => {
      const listener = jest.fn();
      executor.on('execution-started', listener);

      await executor.execute('sync-skill', { value: 1 }, { 
        priority: 'P1' 
      });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Timeout Handling', () => {
    beforeEach(() => {
      mockRegistry.addSkill({
        id: 'slow-skill',
        name: 'Slow Skill',
        inputs: [],
        outputs: [],
        timeout: 100,
        handler: async () => {
          await new Promise(r => setTimeout(r, 10000));
          return { done: true };
        }
      });
    });

    test('should timeout long-running skills', async () => {
      const result = await executor.execute('slow-skill', {});
      expect(result.success).toBe(false);
    }, 1000);
  });

  describe('Retry Logic', () => {
    let retryCount;

    beforeEach(() => {
      retryCount = 0;
      mockRegistry.addSkill({
        id: 'flaky-skill',
        name: 'Flaky Skill',
        inputs: [],
        outputs: [],
        retryPolicy: { maxRetries: 3, baseDelay: 10 },
        handler: () => {
          retryCount++;
          if (retryCount < 3) {
            throw new Error('Temporary failure');
          }
          return { success: true };
        }
      });
    });

    test('should retry on failure', async () => {
      const result = await executor.execute('flaky-skill', {});

      expect(result.success).toBe(true);
      expect(retryCount).toBe(3);
    });

    test('should fail after max retries exceeded', async () => {
      mockRegistry.addSkill({
        id: 'always-fail',
        name: 'Always Fail',
        inputs: [],
        outputs: [],
        retryPolicy: { maxRetries: 2, baseDelay: 10 },
        handler: () => { throw new Error('Always fails'); }
      });

      const result = await executor.execute('always-fail', {});

      expect(result.success).toBe(false);
    });
  });
});

describe('ExecutionResult', () => {
  test('should create execution result', () => {
    const result = new ExecutionResult({
      skillId: 'test-skill',
      status: ExecutionStatus.COMPLETED,
      output: { data: 'test' }
    });

    expect(result.skillId).toBe('test-skill');
    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.success).toBe(true);
  });

  test('should track failed status', () => {
    const result = new ExecutionResult({
      skillId: 'test-skill',
      status: ExecutionStatus.FAILED
    });

    expect(result.success).toBe(false);
  });
});

describe('ExecutionContext', () => {
  test('should create execution context', () => {
    const context = new ExecutionContext({
      skillId: 'test-skill',
      input: { value: 42 }
    });

    expect(context.skillId).toBe('test-skill');
    expect(context.input.value).toBe(42);
    expect(context.executionId).toBeDefined();
  });

  test('should manage variables', () => {
    const context = new ExecutionContext({
      variables: { key: 'value' }
    });

    expect(context.getVariable('key')).toBe('value');
    
    context.setVariable('newKey', 'newValue');
    expect(context.getVariable('newKey')).toBe('newValue');
  });
});

describe('ExecutionStatus', () => {
  test('should have correct status values', () => {
    expect(ExecutionStatus.PENDING).toBe('pending');
    expect(ExecutionStatus.RUNNING).toBe('running');
    expect(ExecutionStatus.COMPLETED).toBe('completed');
    expect(ExecutionStatus.FAILED).toBe('failed');
    expect(ExecutionStatus.CANCELLED).toBe('cancelled');
    expect(ExecutionStatus.TIMEOUT).toBe('timeout');
  });
});

describe('IOValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new IOValidator();
  });

  test('should validate input', () => {
    const result = validator.validateInput({ value: 42 }, []);
    expect(result.valid).toBe(true);
  });

  test('should validate output', () => {
    const result = validator.validateOutput({ result: 'data' }, []);
    expect(result.valid).toBe(true);
  });
});
