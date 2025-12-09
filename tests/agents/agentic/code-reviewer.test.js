/**
 * @file code-reviewer.test.js
 * @description Tests for CodeReviewer
 */

'use strict';

const {
  CodeReviewer,
  createCodeReviewer,
  reviewCode,
  SEVERITY,
  CATEGORY,
  DEFAULT_RULES
} = require('../../../src/agents/agentic/code-reviewer');

describe('CodeReviewer', () => {
  let reviewer;
  
  beforeEach(() => {
    reviewer = new CodeReviewer();
  });
  
  describe('constructor', () => {
    it('should create with default options', () => {
      expect(reviewer).toBeDefined();
      expect(reviewer.rules).toBeDefined();
      expect(reviewer.enabledCategories).toBeDefined();
    });
    
    it('should accept custom options', () => {
      const customReviewer = new CodeReviewer({
        minScore: 80,
        strictMode: true
      });
      expect(customReviewer.minScore).toBe(80);
      expect(customReviewer.strictMode).toBe(true);
    });
  });
  
  describe('review()', () => {
    it('should review JavaScript code', () => {
      const code = `
function test() {
  var x = 1;
  console.log(x);
  return x;
}
`;
      const result = reviewer.review(code, { language: 'javascript' });
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.score).toBeDefined();
      expect(result.summary).toBeDefined();
    });
    
    it('should detect var usage', () => {
      const code = 'var x = 1;';
      const result = reviewer.review(code, { language: 'javascript' });
      
      const varIssue = result.issues.find(i => i.rule === 'js-no-var');
      expect(varIssue).toBeDefined();
    });
    
    it('should detect console.log', () => {
      const code = 'console.log("test");';
      const result = reviewer.review(code, { language: 'javascript' });
      
      const consoleIssue = result.issues.find(i => i.rule === 'js-console-log');
      expect(consoleIssue).toBeDefined();
    });
    
    it('should detect eval usage', () => {
      const code = 'eval("1+1");';
      const result = reviewer.review(code, { language: 'javascript' });
      
      const evalIssue = result.issues.find(i => i.rule === 'js-eval');
      expect(evalIssue).toBeDefined();
      expect(evalIssue.severity).toBe(SEVERITY.CRITICAL);
    });
    
    it('should detect TODO comments', () => {
      const code = '// TODO: implement this';
      const result = reviewer.review(code, { language: 'javascript' });
      
      const todoIssue = result.issues.find(i => i.rule === 'js-todo');
      expect(todoIssue).toBeDefined();
    });
    
    it('should detect empty catch blocks', () => {
      const code = 'try { x(); } catch(e) { }';
      const result = reviewer.review(code, { language: 'javascript' });
      
      const catchIssue = result.issues.find(i => i.rule === 'js-empty-catch');
      expect(catchIssue).toBeDefined();
    });
    
    it('should detect security issues', () => {
      const code = 'const password = "secret123";';
      const result = reviewer.review(code, { language: 'javascript' });
      
      const securityIssue = result.issues.find(i => i.category === CATEGORY.SECURITY);
      expect(securityIssue).toBeDefined();
      expect(securityIssue.severity).toBe(SEVERITY.CRITICAL);
    });
    
    it('should detect hardcoded API keys', () => {
      const code = 'const api_key = "abc123xyz";';
      const result = reviewer.review(code, { language: 'javascript' });
      
      const apiKeyIssue = result.issues.find(i => i.rule === 'common-api-key');
      expect(apiKeyIssue).toBeDefined();
    });
    
    it('should emit review events', () => {
      const events = [];
      reviewer.on('review:start', (e) => events.push(['start', e]));
      reviewer.on('review:complete', (e) => events.push(['complete', e]));
      
      reviewer.review('const x = 1;');
      
      expect(events).toHaveLength(2);
      expect(events[0][0]).toBe('start');
      expect(events[1][0]).toBe('complete');
    });
  });
  
  describe('review() - Python', () => {
    it('should review Python code', () => {
      const code = `
def test():
    print("hello")
    return True
`;
      const result = reviewer.review(code, { language: 'python' });
      
      expect(result).toBeDefined();
      expect(result.language).toBe('python');
    });
    
    it('should detect bare except in Python', () => {
      const code = `
try:
    x = 1
except:
    pass
`;
      const result = reviewer.review(code, { language: 'python' });
      
      const exceptIssue = result.issues.find(i => i.rule === 'py-except-bare');
      expect(exceptIssue).toBeDefined();
    });
  });
  
  describe('calculateScore()', () => {
    it('should calculate score correctly', () => {
      // Clean code
      const cleanCode = `
'use strict';

/**
 * Test function
 */
function test() {
  const x = 1;
  return x;
}
`;
      const result = reviewer.review(cleanCode, { language: 'javascript' });
      expect(result.score).toBeGreaterThanOrEqual(80);
    });
    
    it('should lower score for issues', () => {
      const problematicCode = `
var x = 1;
eval("bad");
console.log(x);
// TODO: fix
// FIXME: broken
`;
      const result = reviewer.review(problematicCode, { language: 'javascript' });
      expect(result.score).toBeLessThan(80);
    });
  });
  
  describe('getReview()', () => {
    it('should retrieve review by id', () => {
      const result = reviewer.review('const x = 1;');
      const retrieved = reviewer.getReview(result.id);
      expect(retrieved).toEqual(result);
    });
    
    it('should return null for unknown id', () => {
      const result = reviewer.getReview('unknown-id');
      expect(result).toBeNull();
    });
  });
  
  describe('getAllReviews()', () => {
    it('should return all reviews', () => {
      reviewer.review('const a = 1;');
      reviewer.review('const b = 2;');
      
      const all = reviewer.getAllReviews();
      expect(all).toHaveLength(2);
    });
  });
  
  describe('getStats()', () => {
    it('should return statistics', () => {
      reviewer.review('const x = 1;');
      reviewer.review('var y = 2;');
      
      const stats = reviewer.getStats();
      expect(stats.totalReviews).toBe(2);
      expect(stats.averageScore).toBeDefined();
      expect(stats.totalIssues).toBeDefined();
    });
    
    it('should handle empty reviews', () => {
      const stats = reviewer.getStats();
      expect(stats.totalReviews).toBe(0);
      expect(stats.averageScore).toBe(0);
    });
  });
  
  describe('addRule()', () => {
    it('should add custom rule', () => {
      reviewer.addRule('javascript', {
        id: 'custom-rule',
        pattern: /debugger/g,
        category: CATEGORY.BEST_PRACTICE,
        severity: SEVERITY.ERROR,
        message: 'Debugger statement found'
      });
      
      const result = reviewer.review('debugger;');
      const customIssue = result.issues.find(i => i.rule === 'custom-rule');
      expect(customIssue).toBeDefined();
    });
  });
  
  describe('clearReviews()', () => {
    it('should clear all reviews', () => {
      reviewer.review('const x = 1;');
      reviewer.clearReviews();
      
      expect(reviewer.getAllReviews()).toHaveLength(0);
    });
  });
  
  describe('exportToMarkdown()', () => {
    it('should export review to markdown', () => {
      const result = reviewer.review('var x = 1;', { filePath: 'test.js' });
      const md = reviewer.exportToMarkdown(result.id);
      
      expect(md).toContain('# Code Review Report');
      expect(md).toContain('test.js');
      expect(md).toContain('Score');
    });
    
    it('should return empty for unknown id', () => {
      const md = reviewer.exportToMarkdown('unknown');
      expect(md).toBe('');
    });
  });
  
  describe('detectLanguage()', () => {
    it('should detect from file extension', () => {
      const result = reviewer.review('x = 1', { filePath: 'test.py' });
      expect(result.language).toBe('python');
    });
    
    it('should detect JavaScript by default', () => {
      const result = reviewer.review('const x = 1;');
      expect(result.language).toBe('javascript');
    });
  });
});

describe('createCodeReviewer()', () => {
  it('should create a CodeReviewer instance', () => {
    const reviewer = createCodeReviewer();
    expect(reviewer).toBeInstanceOf(CodeReviewer);
  });
  
  it('should accept options', () => {
    const reviewer = createCodeReviewer({ minScore: 90 });
    expect(reviewer.minScore).toBe(90);
  });
});

describe('reviewCode()', () => {
  it('should review code with default reviewer', () => {
    const result = reviewCode('const x = 1;');
    expect(result).toBeDefined();
    expect(result.issues).toBeInstanceOf(Array);
  });
});

describe('SEVERITY', () => {
  it('should have all expected levels', () => {
    expect(SEVERITY.INFO).toBe('info');
    expect(SEVERITY.WARNING).toBe('warning');
    expect(SEVERITY.ERROR).toBe('error');
    expect(SEVERITY.CRITICAL).toBe('critical');
  });
});

describe('CATEGORY', () => {
  it('should have all expected categories', () => {
    expect(CATEGORY.STYLE).toBe('style');
    expect(CATEGORY.LOGIC).toBe('logic');
    expect(CATEGORY.SECURITY).toBe('security');
    expect(CATEGORY.PERFORMANCE).toBe('performance');
    expect(CATEGORY.MAINTAINABILITY).toBe('maintainability');
    expect(CATEGORY.BEST_PRACTICE).toBe('best-practice');
    expect(CATEGORY.ERROR_HANDLING).toBe('error-handling');
    expect(CATEGORY.DOCUMENTATION).toBe('documentation');
  });
});

describe('DEFAULT_RULES', () => {
  it('should have JavaScript rules', () => {
    expect(DEFAULT_RULES.javascript).toBeInstanceOf(Array);
    expect(DEFAULT_RULES.javascript.length).toBeGreaterThan(0);
  });
  
  it('should have Python rules', () => {
    expect(DEFAULT_RULES.python).toBeInstanceOf(Array);
    expect(DEFAULT_RULES.python.length).toBeGreaterThan(0);
  });
  
  it('should have common rules', () => {
    expect(DEFAULT_RULES.common).toBeInstanceOf(Array);
    expect(DEFAULT_RULES.common.length).toBeGreaterThan(0);
  });
});
