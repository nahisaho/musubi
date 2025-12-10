/**
 * AutoPattern Tests
 * 
 * Tests for automatic skill selection pattern
 */

const {
  AutoPattern,
  ConfidenceLevel,
  createAutoPattern
} = require('../../src/orchestration/patterns/auto');

const {
  OrchestrationEngine,
  ExecutionContext,
  _ExecutionStatus,
  PatternType
} = require('../../src/orchestration/orchestration-engine');

describe('AutoPattern', () => {
  let pattern;
  let engine;

  beforeEach(() => {
    pattern = new AutoPattern();
    engine = new OrchestrationEngine();

    // Register test skills with keywords
    engine.registerSkill('requirements-analyst', {
      keywords: ['requirement', 'ears', 'specification', 'need'],
      categories: ['requirements'],
      description: 'Analyzes and creates requirements',
      execute: async (input) => ({
        skill: 'requirements-analyst',
        analyzed: true,
        input
      })
    });

    engine.registerSkill('test-engineer', {
      keywords: ['test', 'testing', 'qa', 'quality'],
      categories: ['testing'],
      description: 'Creates and runs tests',
      execute: async (input) => ({
        skill: 'test-engineer',
        tested: true,
        input
      })
    });

    engine.registerSkill('code-generator', {
      keywords: ['code', 'implement', 'generate', 'develop'],
      categories: ['implementation'],
      description: 'Generates code from specifications',
      execute: async (input) => ({
        skill: 'code-generator',
        generated: true,
        input
      })
    });

    engine.registerSkill('documentation-writer', {
      keywords: ['document', 'readme', 'guide', 'docs'],
      categories: ['documentation'],
      description: 'Writes documentation',
      execute: async (input) => ({
        skill: 'documentation-writer',
        documented: true,
        input
      })
    });

    engine.registerPattern(PatternType.AUTO, pattern);
  });

  describe('constructor', () => {
    it('should create pattern with default options', () => {
      expect(pattern.options.minConfidence).toBe(0.3);
      expect(pattern.options.fallbackSkill).toBeNull();
      expect(pattern.options.multiMatch).toBe(false);
      expect(pattern.options.maxMatches).toBe(3);
    });

    it('should accept custom options', () => {
      const custom = new AutoPattern({
        minConfidence: 0.5,
        fallbackSkill: 'default-skill',
        multiMatch: true
      });

      expect(custom.options.minConfidence).toBe(0.5);
      expect(custom.options.fallbackSkill).toBe('default-skill');
      expect(custom.options.multiMatch).toBe(true);
    });

    it('should have correct metadata', () => {
      expect(pattern.metadata.name).toBe(PatternType.AUTO);
      expect(pattern.metadata.type).toBe(PatternType.AUTO);
      expect(pattern.metadata.tags).toContain('intelligent');
      expect(pattern.metadata.tags).toContain('automatic');
    });
  });

  describe('validate', () => {
    it('should fail without task', () => {
      const context = new ExecutionContext({});
      const result = pattern.validate(context, engine);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Auto pattern requires a task description');
    });

    it('should fail without skills', () => {
      const emptyEngine = new OrchestrationEngine();
      const context = new ExecutionContext({ task: 'test task' });
      const result = pattern.validate(context, emptyEngine);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No skills registered with engine');
    });

    it('should pass with task and skills', () => {
      const context = new ExecutionContext({ task: 'test task' });
      const result = pattern.validate(context, engine);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept task from input', () => {
      const context = new ExecutionContext({
        input: { task: 'input task' }
      });
      const result = pattern.validate(context, engine);

      expect(result.valid).toBe(true);
    });
  });

  describe('execute', () => {
    it('should select requirements-analyst for requirement task', async () => {
      const context = new ExecutionContext({
        task: 'Write requirements for the login feature'
      });

      const result = await pattern.execute(context, engine);

      expect(result.selectedSkill).toBe('requirements-analyst');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should select test-engineer for testing task', async () => {
      const context = new ExecutionContext({
        task: 'Create unit tests for the user module'
      });

      const result = await pattern.execute(context, engine);

      expect(result.selectedSkill).toBe('test-engineer');
    });

    it('should select code-generator for implementation task', async () => {
      const context = new ExecutionContext({
        task: 'Implement the authentication service'
      });

      const result = await pattern.execute(context, engine);

      expect(result.selectedSkill).toBe('code-generator');
    });

    it('should select documentation-writer for docs task', async () => {
      const context = new ExecutionContext({
        task: 'Write documentation for the API'
      });

      const result = await pattern.execute(context, engine);

      expect(result.selectedSkill).toBe('documentation-writer');
    });

    it('should throw when no skill matches', async () => {
      const context = new ExecutionContext({
        task: 'xyz123 completely unrelated gibberish'
      });

      // Use high confidence threshold to ensure no match
      const strictPattern = new AutoPattern({ minConfidence: 0.99 });

      await expect(strictPattern.execute(context, engine)).rejects.toThrow(
        'No matching skill found'
      );
    });

    it('should use fallback skill when no match', async () => {
      engine.registerSkill('fallback', {
        execute: async () => ({ fallback: true })
      });

      const fallbackPattern = new AutoPattern({
        minConfidence: 0.99,
        fallbackSkill: 'fallback'
      });

      const context = new ExecutionContext({
        task: 'xyz123 gibberish'
      });

      const result = await fallbackPattern.execute(context, engine);

      expect(result.output.fallback).toBe(true);
    });

    it('should include confidence level', async () => {
      const context = new ExecutionContext({
        task: 'Write requirements'
      });

      const result = await pattern.execute(context, engine);

      expect(result.confidenceLevel).toBeDefined();
      expect([
        ConfidenceLevel.HIGH,
        ConfidenceLevel.MEDIUM,
        ConfidenceLevel.LOW
      ]).toContain(result.confidenceLevel);
    });

    it('should add child context', async () => {
      const context = new ExecutionContext({
        task: 'Write tests'
      });

      await pattern.execute(context, engine);

      // Pattern adds step context, and executeSkill adds direct execution context
      expect(context.children.length).toBeGreaterThanOrEqual(1);
      expect(context.children[0].skill).toBeDefined();
    });

    it('should emit auto pattern events', async () => {
      const startListener = jest.fn();
      const matchListener = jest.fn();
      const completeListener = jest.fn();

      engine.on('autoPatternStarted', startListener);
      engine.on('autoPatternMatched', matchListener);
      engine.on('autoPatternCompleted', completeListener);

      const context = new ExecutionContext({
        task: 'Write tests'
      });

      await pattern.execute(context, engine);

      expect(startListener).toHaveBeenCalled();
      expect(matchListener).toHaveBeenCalled();
      expect(completeListener).toHaveBeenCalled();
    });

    it('should pass input to skill', async () => {
      const context = new ExecutionContext({
        task: 'Write requirements',
        input: {
          skillInput: { feature: 'login' }
        }
      });

      const result = await pattern.execute(context, engine);

      expect(result.output.input.feature).toBe('login');
    });
  });

  describe('multi-match mode', () => {
    it('should execute multiple matching skills', async () => {
      const multiPattern = new AutoPattern({
        multiMatch: true
      });

      // Register a skill that will also match
      engine.registerSkill('spec-writer', {
        keywords: ['requirement', 'spec', 'write'],
        execute: async () => ({ skill: 'spec-writer' })
      });

      const context = new ExecutionContext({
        task: 'Write requirement specifications'
      });

      const result = await multiPattern.execute(context, engine);

      expect(result.multiMatch).toBe(true);
      expect(result.selectedSkills).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should include all results in multi-match', async () => {
      const multiPattern = new AutoPattern({
        multiMatch: true,
        minConfidence: 0.1 // Low threshold to get multiple matches
      });

      const context = new ExecutionContext({
        task: 'Test requirements documentation'
      });

      const result = await multiPattern.execute(context, engine);

      expect(result.results.length).toBeGreaterThanOrEqual(1);
      for (const r of result.results) {
        expect(r.skill).toBeDefined();
        expect(r.status).toBeDefined();
      }
    });
  });

  describe('confidence scoring', () => {
    it('should give higher score for exact skill name match', async () => {
      const context = new ExecutionContext({
        task: 'Use requirements-analyst skill'
      });

      const result = await pattern.execute(context, engine);

      expect(result.selectedSkill).toBe('requirements-analyst');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should match by keywords', async () => {
      const context = new ExecutionContext({
        task: 'We need to write EARS format specifications'
      });

      const result = await pattern.execute(context, engine);

      expect(result.selectedSkill).toBe('requirements-analyst');
    });

    it('should respect minConfidence threshold', async () => {
      const highConfPattern = new AutoPattern({
        minConfidence: 0.9
      });

      engine.registerSkill('fallback-high', {
        execute: async () => ({ used: true })
      });

      highConfPattern.options.fallbackSkill = 'fallback-high';

      const context = new ExecutionContext({
        task: 'vague task'
      });

      const result = await highConfPattern.execute(context, engine);

      // Should use fallback because no skill meets 0.9 threshold
      expect(result.output.used).toBe(true);
    });
  });
});

describe('ConfidenceLevel', () => {
  it('should have all confidence levels', () => {
    expect(ConfidenceLevel.HIGH).toBe('high');
    expect(ConfidenceLevel.MEDIUM).toBe('medium');
    expect(ConfidenceLevel.LOW).toBe('low');
    expect(ConfidenceLevel.NONE).toBe('none');
  });
});

describe('createAutoPattern', () => {
  it('should create pattern with default options', () => {
    const pattern = createAutoPattern();
    expect(pattern).toBeInstanceOf(AutoPattern);
    expect(pattern.options.minConfidence).toBe(0.3);
  });

  it('should create pattern with custom options', () => {
    const pattern = createAutoPattern({
      minConfidence: 0.8,
      multiMatch: true
    });
    expect(pattern.options.minConfidence).toBe(0.8);
    expect(pattern.options.multiMatch).toBe(true);
  });
});
