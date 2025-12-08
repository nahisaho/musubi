/**
 * PatternRegistry Tests
 * 
 * Tests for pattern registry and metadata
 */

const {
  PatternRegistry,
  PatternMetadata,
  BasePattern,
  createDefaultRegistry
} = require('../../src/orchestration/pattern-registry');

const { PatternType } = require('../../src/orchestration/orchestration-engine');

describe('PatternMetadata', () => {
  describe('constructor', () => {
    it('should create metadata with defaults', () => {
      const meta = new PatternMetadata();
      
      expect(meta.name).toBe('');
      expect(meta.type).toBe(PatternType.SEQUENTIAL);
      expect(meta.description).toBe('');
      expect(meta.version).toBe('1.0.0');
      expect(meta.author).toBe('MUSUBI');
      expect(meta.tags).toEqual([]);
      expect(meta.useCases).toEqual([]);
      expect(meta.complexity).toBe('medium');
      expect(meta.supportsParallel).toBe(false);
      expect(meta.requiresHuman).toBe(false);
    });

    it('should accept custom options', () => {
      const meta = new PatternMetadata({
        name: 'test-pattern',
        type: PatternType.SWARM,
        description: 'Test description',
        version: '2.0.0',
        tags: ['parallel', 'fast'],
        complexity: 'high',
        supportsParallel: true
      });
      
      expect(meta.name).toBe('test-pattern');
      expect(meta.type).toBe(PatternType.SWARM);
      expect(meta.description).toBe('Test description');
      expect(meta.version).toBe('2.0.0');
      expect(meta.tags).toEqual(['parallel', 'fast']);
      expect(meta.complexity).toBe('high');
      expect(meta.supportsParallel).toBe(true);
    });
  });

  describe('matches', () => {
    const meta = new PatternMetadata({
      name: 'test',
      type: PatternType.SEQUENTIAL,
      complexity: 'low',
      supportsParallel: false,
      requiresHuman: true,
      tags: ['simple', 'basic']
    });

    it('should match empty criteria', () => {
      expect(meta.matches({})).toBe(true);
    });

    it('should match by type', () => {
      expect(meta.matches({ type: PatternType.SEQUENTIAL })).toBe(true);
      expect(meta.matches({ type: PatternType.SWARM })).toBe(false);
    });

    it('should match by complexity', () => {
      expect(meta.matches({ complexity: 'low' })).toBe(true);
      expect(meta.matches({ complexity: 'high' })).toBe(false);
    });

    it('should match by supportsParallel', () => {
      expect(meta.matches({ supportsParallel: false })).toBe(true);
      expect(meta.matches({ supportsParallel: true })).toBe(false);
    });

    it('should match by requiresHuman', () => {
      expect(meta.matches({ requiresHuman: true })).toBe(true);
      expect(meta.matches({ requiresHuman: false })).toBe(false);
    });

    it('should match by tags', () => {
      expect(meta.matches({ tags: ['simple'] })).toBe(true);
      expect(meta.matches({ tags: ['basic'] })).toBe(true);
      expect(meta.matches({ tags: ['advanced'] })).toBe(false);
    });

    it('should match multiple criteria', () => {
      expect(meta.matches({
        type: PatternType.SEQUENTIAL,
        complexity: 'low'
      })).toBe(true);
      
      expect(meta.matches({
        type: PatternType.SEQUENTIAL,
        complexity: 'high'
      })).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const meta = new PatternMetadata({
        name: 'json-test',
        type: PatternType.AUTO,
        description: 'JSON test pattern'
      });
      
      const json = meta.toJSON();
      
      expect(json.name).toBe('json-test');
      expect(json.type).toBe(PatternType.AUTO);
      expect(json.description).toBe('JSON test pattern');
    });
  });
});

describe('BasePattern', () => {
  describe('constructor', () => {
    it('should create pattern with metadata', () => {
      const pattern = new BasePattern({
        name: 'base-test',
        description: 'Test base pattern'
      });
      
      expect(pattern.metadata).toBeInstanceOf(PatternMetadata);
      expect(pattern.metadata.name).toBe('base-test');
    });
  });

  describe('execute', () => {
    it('should throw not implemented error', async () => {
      const pattern = new BasePattern({ name: 'base' });
      
      await expect(pattern.execute({}, {})).rejects.toThrow(
        'Pattern must implement execute method'
      );
    });
  });

  describe('validate', () => {
    it('should return valid by default', () => {
      const pattern = new BasePattern({ name: 'base' });
      const result = pattern.validate({}, {});
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('getName', () => {
    it('should return pattern name', () => {
      const pattern = new BasePattern({ name: 'get-name-test' });
      expect(pattern.getName()).toBe('get-name-test');
    });
  });

  describe('getMetadata', () => {
    it('should return pattern metadata', () => {
      const pattern = new BasePattern({ name: 'get-meta-test' });
      const meta = pattern.getMetadata();
      
      expect(meta).toBeInstanceOf(PatternMetadata);
      expect(meta.name).toBe('get-meta-test');
    });
  });
});

describe('PatternRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new PatternRegistry();
  });

  describe('register', () => {
    it('should register a pattern', () => {
      const pattern = { execute: async () => {} };
      registry.register('test', pattern);
      
      expect(registry.get('test')).toBe(pattern);
      expect(registry.has('test')).toBe(true);
    });

    it('should throw for null pattern', () => {
      expect(() => {
        registry.register('null', null);
      }).toThrow("Pattern 'null' cannot be null");
    });

    it('should throw for pattern without execute', () => {
      expect(() => {
        registry.register('invalid', {});
      }).toThrow("Pattern 'invalid' must have an execute method");
    });

    it('should allow chaining', () => {
      const pattern = { execute: async () => {} };
      const result = registry.register('chain', pattern);
      expect(result).toBe(registry);
    });

    it('should extract metadata from BasePattern', () => {
      const pattern = new BasePattern({
        name: 'meta-extract',
        description: 'Extracted metadata'
      });
      // Add execute method
      pattern.execute = async () => {};
      
      registry.register('meta-extract', pattern);
      
      const meta = registry.getMetadata('meta-extract');
      expect(meta.description).toBe('Extracted metadata');
    });

    it('should allow metadata override', () => {
      const pattern = new BasePattern({ name: 'override' });
      pattern.execute = async () => {};
      
      registry.register('override', pattern, {
        description: 'Overridden description'
      });
      
      const meta = registry.getMetadata('override');
      expect(meta.description).toBe('Overridden description');
    });
  });

  describe('unregister', () => {
    it('should remove pattern', () => {
      const pattern = { execute: async () => {} };
      registry.register('remove', pattern);
      
      const result = registry.unregister('remove');
      
      expect(result).toBe(true);
      expect(registry.has('remove')).toBe(false);
    });

    it('should return false for unknown pattern', () => {
      expect(registry.unregister('unknown')).toBe(false);
    });
  });

  describe('get', () => {
    it('should return registered pattern', () => {
      const pattern = { execute: async () => {} };
      registry.register('get-test', pattern);
      
      expect(registry.get('get-test')).toBe(pattern);
    });

    it('should return null for unknown pattern', () => {
      expect(registry.get('unknown')).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for registered pattern', () => {
      registry.register('has-test', { execute: async () => {} });
      expect(registry.has('has-test')).toBe(true);
    });

    it('should return false for unknown pattern', () => {
      expect(registry.has('unknown')).toBe(false);
    });
  });

  describe('list', () => {
    it('should return empty array when no patterns', () => {
      expect(registry.list()).toEqual([]);
    });

    it('should return all pattern names', () => {
      registry.register('a', { execute: async () => {} });
      registry.register('b', { execute: async () => {} });
      
      const list = registry.list();
      expect(list).toContain('a');
      expect(list).toContain('b');
      expect(list).toHaveLength(2);
    });
  });

  describe('find', () => {
    beforeEach(() => {
      registry.register('seq', { execute: async () => {} }, {
        type: PatternType.SEQUENTIAL,
        complexity: 'low',
        supportsParallel: false
      });
      
      registry.register('swarm', { execute: async () => {} }, {
        type: PatternType.SWARM,
        complexity: 'high',
        supportsParallel: true
      });
    });

    it('should find by type', () => {
      const results = registry.find({ type: PatternType.SEQUENTIAL });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('seq');
    });

    it('should find by supportsParallel', () => {
      const results = registry.find({ supportsParallel: true });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('swarm');
    });

    it('should return all for empty criteria', () => {
      const results = registry.find({});
      expect(results).toHaveLength(2);
    });
  });

  describe('findBestPattern', () => {
    beforeEach(() => {
      registry.register(PatternType.SEQUENTIAL, { execute: async () => {} }, {
        type: PatternType.SEQUENTIAL
      });
      
      registry.register(PatternType.SWARM, { execute: async () => {} }, {
        type: PatternType.SWARM,
        supportsParallel: true
      });
      
      registry.register(PatternType.AUTO, { execute: async () => {} }, {
        type: PatternType.AUTO
      });
      
      registry.register(PatternType.GROUP_CHAT, { execute: async () => {} }, {
        type: PatternType.GROUP_CHAT
      });
    });

    it('should return swarm for parallel task', () => {
      const result = registry.findBestPattern('Execute in parallel');
      expect(result).toBe(PatternType.SWARM);
    });

    it('should return sequential for step-by-step task', () => {
      const result = registry.findBestPattern('Execute sequentially');
      expect(result).toBe(PatternType.SEQUENTIAL);
    });

    it('should return group-chat for discussion task', () => {
      const result = registry.findBestPattern('Discuss design review');
      expect(result).toBe(PatternType.GROUP_CHAT);
    });

    it('should return auto for general task', () => {
      const result = registry.findBestPattern('General task');
      expect(result).toBe(PatternType.AUTO);
    });

    it('should return null when no patterns', () => {
      const emptyRegistry = new PatternRegistry();
      expect(emptyRegistry.findBestPattern('any task')).toBeNull();
    });
  });

  describe('registerWithEngine', () => {
    it('should register all patterns with engine', () => {
      const mockEngine = {
        registerPattern: jest.fn()
      };
      
      registry.register('p1', { execute: async () => {} });
      registry.register('p2', { execute: async () => {} });
      
      registry.registerWithEngine(mockEngine);
      
      expect(mockEngine.registerPattern).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSummary', () => {
    it('should return summary for empty registry', () => {
      const summary = registry.getSummary();
      
      expect(summary.total).toBe(0);
      expect(summary.patterns).toEqual([]);
      expect(summary.byType).toEqual({});
      expect(summary.byComplexity).toEqual({});
    });

    it('should return summary with patterns', () => {
      registry.register('seq1', { execute: async () => {} }, {
        type: PatternType.SEQUENTIAL,
        complexity: 'low'
      });
      
      registry.register('seq2', { execute: async () => {} }, {
        type: PatternType.SEQUENTIAL,
        complexity: 'medium'
      });
      
      const summary = registry.getSummary();
      
      expect(summary.total).toBe(2);
      expect(summary.patterns).toHaveLength(2);
      expect(summary.byType[PatternType.SEQUENTIAL]).toBe(2);
      expect(summary.byComplexity.low).toBe(1);
      expect(summary.byComplexity.medium).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all patterns', () => {
      registry.register('p1', { execute: async () => {} });
      registry.register('p2', { execute: async () => {} });
      
      registry.clear();
      
      expect(registry.list()).toEqual([]);
    });
  });
});

describe('createDefaultRegistry', () => {
  it('should create empty registry', () => {
    const registry = createDefaultRegistry();
    
    expect(registry).toBeInstanceOf(PatternRegistry);
    expect(registry.list()).toEqual([]);
  });
});
