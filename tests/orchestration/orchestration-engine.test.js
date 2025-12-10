/**
 * OrchestrationEngine Tests
 * 
 * Tests for the core orchestration engine
 */

const {
  OrchestrationEngine,
  ExecutionContext,
  PatternType,
  ExecutionStatus,
  Priority
} = require('../../src/orchestration/orchestration-engine');

describe('OrchestrationEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new OrchestrationEngine();
  });

  describe('constructor', () => {
    it('should create engine with default options', () => {
      expect(engine.config.maxConcurrent).toBe(5);
      expect(engine.config.timeout).toBe(300000);
      expect(engine.config.retryCount).toBe(3);
    });

    it('should accept custom options', () => {
      const customEngine = new OrchestrationEngine({
        maxConcurrent: 10,
        timeout: 60000
      });
      expect(customEngine.config.maxConcurrent).toBe(10);
      expect(customEngine.config.timeout).toBe(60000);
    });

    it('should initialize empty collections', () => {
      expect(engine.listPatterns()).toHaveLength(0);
      expect(engine.listSkills()).toHaveLength(0);
      expect(engine.activeContexts.size).toBe(0);
    });
  });

  describe('registerPattern', () => {
    it('should register a valid pattern', () => {
      const pattern = {
        execute: async () => ({ result: 'test' })
      };
      engine.registerPattern('test-pattern', pattern);
      expect(engine.getPattern('test-pattern')).toBe(pattern);
    });

    it('should throw error for pattern without execute method', () => {
      expect(() => {
        engine.registerPattern('invalid', {});
      }).toThrow("Pattern 'invalid' must have an execute method");
    });

    it('should throw error for null pattern', () => {
      expect(() => {
        engine.registerPattern('null', null);
      }).toThrow("Pattern 'null' must have an execute method");
    });

    it('should emit patternRegistered event', () => {
      const listener = jest.fn();
      engine.on('patternRegistered', listener);
      
      const pattern = { execute: async () => {} };
      engine.registerPattern('event-test', pattern);
      
      expect(listener).toHaveBeenCalledWith({
        name: 'event-test',
        pattern
      });
    });

    it('should allow chaining', () => {
      const pattern = { execute: async () => {} };
      const result = engine.registerPattern('chain-test', pattern);
      expect(result).toBe(engine);
    });
  });

  describe('getPattern', () => {
    it('should return registered pattern', () => {
      const pattern = { execute: async () => {} };
      engine.registerPattern('get-test', pattern);
      expect(engine.getPattern('get-test')).toBe(pattern);
    });

    it('should return null for unknown pattern', () => {
      expect(engine.getPattern('unknown')).toBeNull();
    });
  });

  describe('listPatterns', () => {
    it('should return empty array when no patterns', () => {
      expect(engine.listPatterns()).toEqual([]);
    });

    it('should return all registered pattern names', () => {
      engine.registerPattern('a', { execute: async () => {} });
      engine.registerPattern('b', { execute: async () => {} });
      engine.registerPattern('c', { execute: async () => {} });
      
      const patterns = engine.listPatterns();
      expect(patterns).toContain('a');
      expect(patterns).toContain('b');
      expect(patterns).toContain('c');
      expect(patterns).toHaveLength(3);
    });
  });

  describe('registerSkill', () => {
    it('should register a valid skill', () => {
      const skill = { name: 'test-skill' };
      engine.registerSkill('test-skill', skill);
      expect(engine.getSkill('test-skill')).toBe(skill);
    });

    it('should throw error for null skill', () => {
      expect(() => {
        engine.registerSkill('null-skill', null);
      }).toThrow("Skill 'null-skill' cannot be null");
    });

    it('should emit skillRegistered event', () => {
      const listener = jest.fn();
      engine.on('skillRegistered', listener);
      
      const skill = { name: 'event-skill' };
      engine.registerSkill('event-skill', skill);
      
      expect(listener).toHaveBeenCalledWith({
        name: 'event-skill',
        skill
      });
    });
  });

  describe('listSkills', () => {
    it('should return empty array when no skills', () => {
      expect(engine.listSkills()).toEqual([]);
    });

    it('should return all registered skill names', () => {
      engine.registerSkill('skill-a', { name: 'a' });
      engine.registerSkill('skill-b', { name: 'b' });
      
      const skills = engine.listSkills();
      expect(skills).toContain('skill-a');
      expect(skills).toContain('skill-b');
      expect(skills).toHaveLength(2);
    });
  });

  describe('execute', () => {
    it('should throw error for unknown pattern', async () => {
      await expect(engine.execute('unknown')).rejects.toThrow(
        'Unknown pattern: unknown'
      );
    });

    it('should execute pattern and return completed context', async () => {
      const pattern = {
        execute: async (_context, _eng) => ({ success: true })
      };
      engine.registerPattern('success', pattern);
      
      const context = await engine.execute('success', {
        task: 'Test task'
      });
      
      expect(context.status).toBe(ExecutionStatus.COMPLETED);
      expect(context.output).toEqual({ success: true });
      expect(context.task).toBe('Test task');
    });

    it('should handle pattern execution failure', async () => {
      const pattern = {
        execute: async () => { throw new Error('Test error'); }
      };
      engine.registerPattern('fail', pattern);
      
      const context = await engine.execute('fail');
      
      expect(context.status).toBe(ExecutionStatus.FAILED);
      expect(context.error).toBe('Test error');
    });

    it('should emit execution events', async () => {
      const startListener = jest.fn();
      const completeListener = jest.fn();
      
      engine.on('executionStarted', startListener);
      engine.on('executionCompleted', completeListener);
      
      const pattern = { execute: async () => ({ done: true }) };
      engine.registerPattern('events', pattern);
      
      await engine.execute('events', { task: 'Event test' });
      
      expect(startListener).toHaveBeenCalled();
      expect(completeListener).toHaveBeenCalled();
    });

    it('should emit executionFailed on error', async () => {
      const failListener = jest.fn();
      engine.on('executionFailed', failListener);
      
      const pattern = {
        execute: async () => { throw new Error('Fail event'); }
      };
      engine.registerPattern('fail-event', pattern);
      
      await engine.execute('fail-event');
      
      expect(failListener).toHaveBeenCalled();
    });

    it('should set metadata with pattern name', async () => {
      const pattern = { execute: async () => ({}) };
      engine.registerPattern('meta-test', pattern);
      
      const context = await engine.execute('meta-test');
      
      expect(context.metadata.pattern).toBe('meta-test');
    });
  });

  describe('executeSkill', () => {
    it('should throw error for unknown skill', async () => {
      await expect(engine.executeSkill('unknown', {})).rejects.toThrow(
        'Unknown skill: unknown'
      );
    });

    it('should execute skill with execute method', async () => {
      const skill = {
        execute: async (input) => ({ result: input.value * 2 })
      };
      engine.registerSkill('double', skill);
      
      const result = await engine.executeSkill('double', { value: 5 });
      expect(result).toEqual({ result: 10 });
    });

    it('should execute skill as function', async () => {
      const skill = async (input) => ({ squared: input.n ** 2 });
      engine.registerSkill('square', skill);
      
      const result = await engine.executeSkill('square', { n: 4 });
      expect(result).toEqual({ squared: 16 });
    });

    it('should emit skill execution events', async () => {
      const startListener = jest.fn();
      const completeListener = jest.fn();
      
      engine.on('skillExecutionStarted', startListener);
      engine.on('skillExecutionCompleted', completeListener);
      
      const skill = { execute: async () => ({ done: true }) };
      engine.registerSkill('events-skill', skill);
      
      await engine.executeSkill('events-skill', {});
      
      expect(startListener).toHaveBeenCalled();
      expect(completeListener).toHaveBeenCalled();
    });

    it('should add child context to parent', async () => {
      const skill = { execute: async () => ({ done: true }) };
      engine.registerSkill('child-skill', skill);
      
      const parentContext = new ExecutionContext({ task: 'parent' });
      await engine.executeSkill('child-skill', {}, parentContext);
      
      expect(parentContext.children).toHaveLength(1);
      expect(parentContext.children[0].skill).toBe('child-skill');
    });
  });

  describe('resolveSkill', () => {
    beforeEach(() => {
      engine.registerSkill('requirements-analyst', {
        keywords: ['requirement', 'ears', 'specification']
      });
      engine.registerSkill('test-engineer', {
        keywords: ['test', 'testing', 'qa']
      });
      engine.registerSkill('code-generator', {
        keywords: ['code', 'implement', 'generate']
      });
    });

    it('should resolve skill by keyword match', async () => {
      const skill = await engine.resolveSkill('I need to write requirements');
      expect(skill).toBe('requirements-analyst');
    });

    it('should resolve skill for testing task', async () => {
      const skill = await engine.resolveSkill('Write unit tests');
      expect(skill).toBe('test-engineer');
    });

    it('should return null when no match', async () => {
      const skill = await engine.resolveSkill('unrelated task');
      expect(skill).toBeNull();
    });

    it('should use custom skillResolver if provided', async () => {
      const customResolver = {
        resolve: jest.fn().mockResolvedValue('custom-skill')
      };
      engine.skillResolver = customResolver;
      
      const skill = await engine.resolveSkill('any task');
      
      expect(skill).toBe('custom-skill');
      expect(customResolver.resolve).toHaveBeenCalled();
    });
  });

  describe('requestHumanValidation', () => {
    it('should set context to waiting status', async () => {
      const context = new ExecutionContext({ task: 'test' });
      await engine.requestHumanValidation(context, 'Approve?');
      
      expect(context.status).toBe(ExecutionStatus.WAITING_FOR_HUMAN);
    });

    it('should emit humanValidationRequested event', async () => {
      const listener = jest.fn();
      engine.on('humanValidationRequested', listener);
      
      const context = new ExecutionContext({ task: 'test' });
      await engine.requestHumanValidation(context, 'Approve this?');
      
      expect(listener).toHaveBeenCalledWith({
        context,
        question: 'Approve this?'
      });
    });

    it('should use custom humanGate if provided', async () => {
      const humanGate = {
        request: jest.fn().mockResolvedValue({ approved: true, feedback: 'OK' })
      };
      engine.humanGate = humanGate;
      
      const context = new ExecutionContext({ task: 'test' });
      const result = await engine.requestHumanValidation(context, 'Check?');
      
      expect(result).toEqual({ approved: true, feedback: 'OK' });
      expect(humanGate.request).toHaveBeenCalled();
    });

    it('should auto-approve when no humanGate', async () => {
      const context = new ExecutionContext({ task: 'test' });
      const result = await engine.requestHumanValidation(context, 'Check?');
      
      expect(result.approved).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return empty status for new engine', () => {
      const status = engine.getStatus();
      
      expect(status.activeExecutions).toBe(0);
      expect(status.patterns).toEqual([]);
      expect(status.skills).toEqual([]);
      expect(status.contexts).toEqual([]);
    });

    it('should return registered patterns and skills', () => {
      engine.registerPattern('p1', { execute: async () => {} });
      engine.registerSkill('s1', { name: 's1' });
      
      const status = engine.getStatus();
      
      expect(status.patterns).toContain('p1');
      expect(status.skills).toContain('s1');
    });
  });

  describe('cancel', () => {
    it('should cancel active context', async () => {
      // Start a long-running execution
      const pattern = {
        execute: () => new Promise(resolve => setTimeout(resolve, 10000))
      };
      engine.registerPattern('long', pattern);
      
      const _executePromise = engine.execute('long');
      
      // Wait for execution to start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Get context ID from active contexts
      const contextId = Array.from(engine.activeContexts.keys())[0];
      
      if (contextId) {
        engine.cancel(contextId);
        expect(engine.activeContexts.has(contextId)).toBe(false);
      }
    });

    it('should emit executionCancelled event', () => {
      const listener = jest.fn();
      engine.on('executionCancelled', listener);
      
      const context = new ExecutionContext({ task: 'test' });
      engine.activeContexts.set(context.id, context);
      
      engine.cancel(context.id);
      
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('cancelAll', () => {
    it('should cancel all active contexts', () => {
      const ctx1 = new ExecutionContext({ task: 'test1' });
      const ctx2 = new ExecutionContext({ task: 'test2' });
      
      engine.activeContexts.set(ctx1.id, ctx1);
      engine.activeContexts.set(ctx2.id, ctx2);
      
      engine.cancelAll();
      
      expect(engine.activeContexts.size).toBe(0);
      expect(ctx1.status).toBe(ExecutionStatus.CANCELLED);
      expect(ctx2.status).toBe(ExecutionStatus.CANCELLED);
    });
  });
});

describe('ExecutionContext', () => {
  describe('constructor', () => {
    it('should create context with default values', () => {
      const context = new ExecutionContext();
      
      expect(context.id).toBeDefined();
      expect(context.parentId).toBeNull();
      expect(context.status).toBe(ExecutionStatus.PENDING);
      expect(context.children).toEqual([]);
    });

    it('should accept custom options', () => {
      const context = new ExecutionContext({
        task: 'Custom task',
        priority: Priority.P0,
        skill: 'test-skill',
        input: { key: 'value' }
      });
      
      expect(context.task).toBe('Custom task');
      expect(context.priority).toBe(Priority.P0);
      expect(context.skill).toBe('test-skill');
      expect(context.input).toEqual({ key: 'value' });
    });
  });

  describe('lifecycle methods', () => {
    let context;

    beforeEach(() => {
      context = new ExecutionContext({ task: 'test' });
    });

    it('should start correctly', () => {
      context.start();
      
      expect(context.status).toBe(ExecutionStatus.RUNNING);
      expect(context.startTime).toBeInstanceOf(Date);
    });

    it('should complete correctly', () => {
      context.start();
      context.complete({ result: 'done' });
      
      expect(context.status).toBe(ExecutionStatus.COMPLETED);
      expect(context.output).toEqual({ result: 'done' });
      expect(context.endTime).toBeInstanceOf(Date);
    });

    it('should fail correctly', () => {
      context.start();
      context.fail(new Error('Test error'));
      
      expect(context.status).toBe(ExecutionStatus.FAILED);
      expect(context.error).toBe('Test error');
      expect(context.endTime).toBeInstanceOf(Date);
    });

    it('should fail with string error', () => {
      context.fail('String error');
      expect(context.error).toBe('String error');
    });

    it('should cancel correctly', () => {
      context.cancel();
      
      expect(context.status).toBe(ExecutionStatus.CANCELLED);
      expect(context.endTime).toBeInstanceOf(Date);
    });

    it('should wait for human correctly', () => {
      context.waitForHuman();
      expect(context.status).toBe(ExecutionStatus.WAITING_FOR_HUMAN);
    });
  });

  describe('getDuration', () => {
    it('should return 0 when not started', () => {
      const context = new ExecutionContext();
      expect(context.getDuration()).toBe(0);
    });

    it('should return duration when completed', () => {
      const context = new ExecutionContext();
      context.start();
      
      // Wait a bit
      const startTime = Date.now();
      while (Date.now() - startTime < 10) { /* busy wait */ }
      
      context.complete({});
      
      expect(context.getDuration()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('toJSON', () => {
    it('should serialize context', () => {
      const context = new ExecutionContext({
        task: 'JSON test',
        priority: Priority.P1
      });
      context.start();
      context.complete({ result: 'done' });
      
      const json = context.toJSON();
      
      expect(json.task).toBe('JSON test');
      expect(json.priority).toBe(Priority.P1);
      expect(json.status).toBe(ExecutionStatus.COMPLETED);
      expect(json.output).toEqual({ result: 'done' });
      expect(json.duration).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Constants', () => {
  describe('PatternType', () => {
    it('should have all pattern types', () => {
      expect(PatternType.AUTO).toBe('auto');
      expect(PatternType.SEQUENTIAL).toBe('sequential');
      expect(PatternType.NESTED).toBe('nested');
      expect(PatternType.GROUP_CHAT).toBe('group-chat');
      expect(PatternType.SWARM).toBe('swarm');
      expect(PatternType.HUMAN_IN_LOOP).toBe('human-in-loop');
    });
  });

  describe('ExecutionStatus', () => {
    it('should have all execution statuses', () => {
      expect(ExecutionStatus.PENDING).toBe('pending');
      expect(ExecutionStatus.RUNNING).toBe('running');
      expect(ExecutionStatus.COMPLETED).toBe('completed');
      expect(ExecutionStatus.FAILED).toBe('failed');
      expect(ExecutionStatus.CANCELLED).toBe('cancelled');
      expect(ExecutionStatus.WAITING_FOR_HUMAN).toBe('waiting-for-human');
    });
  });

  describe('Priority', () => {
    it('should have all priority levels', () => {
      expect(Priority.P0).toBe(0);
      expect(Priority.P1).toBe(1);
      expect(Priority.P2).toBe(2);
      expect(Priority.P3).toBe(3);
    });
  });
});
