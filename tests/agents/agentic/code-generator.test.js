/**
 * @file code-generator.test.js
 * @description Tests for CodeGenerator
 */

'use strict';

const {
  CodeGenerator,
  createCodeGenerator,
  generateCode,
  GEN_MODE,
  LANGUAGE,
  TEMPLATES
} = require('../../../src/agents/agentic/code-generator');

describe('CodeGenerator', () => {
  let generator;
  
  beforeEach(() => {
    generator = new CodeGenerator();
  });
  
  describe('constructor', () => {
    it('should create with default options', () => {
      expect(generator).toBeDefined();
      expect(generator.templates).toBeDefined();
    });
    
    it('should accept custom options', () => {
      const customGen = new CodeGenerator({
        addComments: false,
        indentSize: 4
      });
      expect(customGen).toBeDefined();
    });
  });
  
  describe('generate()', () => {
    it('should generate code with CREATE mode', async () => {
      const result = await generator.generate({
        description: 'A function that adds two numbers',
        mode: GEN_MODE.CREATE,
        language: LANGUAGE.JAVASCRIPT
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.language).toBe(LANGUAGE.JAVASCRIPT);
    });
    
    it('should generate code with default mode', async () => {
      const result = await generator.generate({
        description: 'A simple utility function'
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
    
    it('should emit generation events', async () => {
      const events = [];
      generator.on('generation:start', (e) => events.push(['start', e]));
      generator.on('generation:complete', (e) => events.push(['complete', e]));
      
      await generator.generate({
        description: 'Test function'
      });
      
      expect(events).toHaveLength(2);
      expect(events[0][0]).toBe('start');
      expect(events[1][0]).toBe('complete');
    });
    
    it('should handle different languages', async () => {
      const jsResult = await generator.generate({
        description: 'A utility function',
        language: LANGUAGE.JAVASCRIPT
      });
      expect(jsResult.language).toBe(LANGUAGE.JAVASCRIPT);
      
      const pyResult = await generator.generate({
        description: 'A utility function',
        language: LANGUAGE.PYTHON
      });
      expect(pyResult.language).toBe(LANGUAGE.PYTHON);
    });
  });
  
  describe('getHistory()', () => {
    it('should return generation history', async () => {
      await generator.generate({ description: 'func1' });
      await generator.generate({ description: 'func2' });
      
      const history = generator.getHistory();
      expect(history).toHaveLength(2);
    });
  });
  
  describe('getStats()', () => {
    it('should return generation statistics', async () => {
      await generator.generate({ description: 'func1' });
      await generator.generate({ description: 'func2' });
      
      const stats = generator.getStats();
      expect(stats.totalGenerations).toBe(2);
      expect(stats.successful).toBeDefined();
    });
    
    it('should handle empty history', () => {
      const stats = generator.getStats();
      expect(stats.totalGenerations).toBe(0);
    });
  });
  
  describe('clearHistory()', () => {
    it('should clear generation history', async () => {
      await generator.generate({ description: 'func1' });
      generator.clearHistory();
      
      expect(generator.getHistory()).toHaveLength(0);
    });
  });
  
  describe('addTemplate()', () => {
    it('should add custom template', () => {
      generator.addTemplate('javascript', 'custom', 'function {name}() {}');
      expect(generator.templates.javascript.custom).toBeDefined();
    });
    
    it('should create language entry if not exists', () => {
      generator.addTemplate('rust', 'function', 'fn {name}() {}');
      expect(generator.templates.rust).toBeDefined();
    });
  });
});

describe('createCodeGenerator()', () => {
  it('should create a CodeGenerator instance', () => {
    const generator = createCodeGenerator();
    expect(generator).toBeInstanceOf(CodeGenerator);
  });
  
  it('should accept options', () => {
    const generator = createCodeGenerator({ addComments: false });
    expect(generator).toBeInstanceOf(CodeGenerator);
  });
});

describe('generateCode()', () => {
  it('should generate code with default generator', async () => {
    const result = await generateCode('A utility function');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.code).toBeDefined();
  });
});

describe('GEN_MODE', () => {
  it('should have all expected modes', () => {
    expect(GEN_MODE.CREATE).toBe('create');
    expect(GEN_MODE.MODIFY).toBe('modify');
    expect(GEN_MODE.EXTEND).toBe('extend');
    expect(GEN_MODE.REFACTOR).toBe('refactor');
  });
});

describe('LANGUAGE', () => {
  it('should have all expected languages', () => {
    expect(LANGUAGE.JAVASCRIPT).toBe('javascript');
    expect(LANGUAGE.TYPESCRIPT).toBe('typescript');
    expect(LANGUAGE.PYTHON).toBe('python');
    expect(LANGUAGE.JSON).toBe('json');
    expect(LANGUAGE.MARKDOWN).toBe('markdown');
    expect(LANGUAGE.YAML).toBe('yaml');
  });
});

describe('TEMPLATES', () => {
  it('should have JavaScript templates', () => {
    expect(TEMPLATES.javascript).toBeDefined();
  });
});
