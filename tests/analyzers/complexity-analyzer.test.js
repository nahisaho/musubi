/**
 * Tests for Complexity Analyzer
 *
 * Verifies:
 * - Cyclomatic complexity calculation
 * - Cognitive complexity calculation
 * - Issue detection
 * - Recommendation generation
 */

const { ComplexityAnalyzer, THRESHOLDS } = require('../../src/analyzers/complexity-analyzer');

describe('ComplexityAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ComplexityAnalyzer();
  });

  describe('Language Detection', () => {
    test('should detect JavaScript', () => {
      expect(analyzer.detectLanguage('test.js')).toBe('javascript');
    });

    test('should detect TypeScript', () => {
      expect(analyzer.detectLanguage('test.ts')).toBe('typescript');
    });

    test('should detect C', () => {
      expect(analyzer.detectLanguage('test.c')).toBe('c');
      expect(analyzer.detectLanguage('test.h')).toBe('c');
    });

    test('should detect Rust', () => {
      expect(analyzer.detectLanguage('test.rs')).toBe('rust');
    });
  });

  describe('Cyclomatic Complexity', () => {
    test('should return 1 for simple function', () => {
      const code = 'function test() { return 1; }';
      expect(analyzer.calculateCyclomaticComplexity(code)).toBe(1);
    });

    test('should count if statements', () => {
      const code = 'if (a) { } else if (b) { }';
      // base(1) + if(1) + else if(1) + if in else if(1) = 4
      expect(analyzer.calculateCyclomaticComplexity(code)).toBe(4);
    });

    test('should count logical operators', () => {
      const code = 'if (a && b || c) { }';
      expect(analyzer.calculateCyclomaticComplexity(code)).toBe(4);
    });

    test('should count loops', () => {
      const code = 'for (;;) { while (true) { } }';
      expect(analyzer.calculateCyclomaticComplexity(code)).toBe(3);
    });

    test('should count switch cases', () => {
      const code = 'switch(x) { case 1: break; case 2: break; }';
      expect(analyzer.calculateCyclomaticComplexity(code)).toBe(3);
    });

    test('should count ternary operators', () => {
      const code = 'const x = a ? b : c;';
      expect(analyzer.calculateCyclomaticComplexity(code)).toBe(2);
    });

    test('should count catch blocks', () => {
      const code = 'try { } catch (e) { }';
      expect(analyzer.calculateCyclomaticComplexity(code)).toBe(2);
    });
  });

  describe('Cognitive Complexity', () => {
    test('should return 0 for simple function', () => {
      const code = 'function test() { return 1; }';
      expect(analyzer.calculateCognitiveComplexity(code, 'javascript')).toBe(0);
    });

    test('should add 1 for if statement', () => {
      const code = 'if (a) { }';
      expect(analyzer.calculateCognitiveComplexity(code, 'javascript')).toBe(1);
    });

    test('should add nesting penalty', () => {
      const code = `
        if (a) {
          if (b) {
          }
        }
      `;
      // First if: 1, Second if: 1 + 1 (nesting) = 2
      expect(analyzer.calculateCognitiveComplexity(code, 'javascript')).toBeGreaterThanOrEqual(3);
    });

    test('should count logical operators', () => {
      const code = 'if (a && b || c) { }';
      expect(analyzer.calculateCognitiveComplexity(code, 'javascript')).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Maintainability Index', () => {
    test('should return high score for simple code', () => {
      const score = analyzer.calculateMaintainabilityIndex(10, 1);
      expect(score).toBeGreaterThan(80);
    });

    test('should return lower score for complex code', () => {
      const score = analyzer.calculateMaintainabilityIndex(1000, 50);
      expect(score).toBeLessThan(50);
    });
  });

  describe('Severity Levels', () => {
    test('should return ok for ideal values', () => {
      expect(analyzer.getSeverity(5, 'cyclomaticComplexity')).toBe('ok');
    });

    test('should return warning for elevated values', () => {
      expect(analyzer.getSeverity(15, 'cyclomaticComplexity')).toBe('warning');
    });

    test('should return critical for high values', () => {
      expect(analyzer.getSeverity(30, 'cyclomaticComplexity')).toBe('critical');
    });

    test('should return extreme for very high values', () => {
      expect(analyzer.getSeverity(60, 'cyclomaticComplexity')).toBe('extreme');
    });
  });

  describe('Function Issue Detection', () => {
    test('should detect giant function', () => {
      const func = {
        name: 'giantFunction',
        lines: 1500,
        cyclomaticComplexity: 10,
        cognitiveComplexity: 20,
      };
      const issues = analyzer.detectFunctionIssues(func);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('giant-function');
      expect(issues[0].severity).toBe('extreme');
    });

    test('should detect high complexity', () => {
      const func = {
        name: 'complexFunction',
        lines: 50,
        cyclomaticComplexity: 60,
        cognitiveComplexity: 20,
      };
      const issues = analyzer.detectFunctionIssues(func);

      expect(issues.some(i => i.type === 'extreme-complexity')).toBe(true);
    });

    test('should not flag healthy function', () => {
      const func = {
        name: 'healthyFunction',
        lines: 30,
        cyclomaticComplexity: 5,
        cognitiveComplexity: 8,
      };
      const issues = analyzer.detectFunctionIssues(func);

      expect(issues.length).toBe(0);
    });
  });

  describe('Recommendations', () => {
    test('should generate split recommendation for large function', () => {
      const func = {
        name: 'largeFunction',
        lines: 200,
        cyclomaticComplexity: 15,
        cognitiveComplexity: 25,
        issues: [{ type: 'large-function', severity: 'warning' }],
      };
      const recommendations = analyzer.generateRecommendations(func);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.type === 'split-function')).toBe(true);
    });

    test('should generate complexity recommendation for complex function', () => {
      const func = {
        name: 'complexFunction',
        lines: 50,
        cyclomaticComplexity: 30,
        cognitiveComplexity: 15,
        issues: [{ type: 'high-complexity', severity: 'critical' }],
      };
      const recommendations = analyzer.generateRecommendations(func);

      expect(recommendations.some(r => r.type === 'reduce-complexity')).toBe(true);
    });
  });

  describe('Thresholds', () => {
    test('should have correct function line thresholds', () => {
      expect(THRESHOLDS.functionLines.ideal).toBe(50);
      expect(THRESHOLDS.functionLines.warning).toBe(100);
      expect(THRESHOLDS.functionLines.critical).toBe(500);
      expect(THRESHOLDS.functionLines.extreme).toBe(1000);
    });

    test('should have correct cyclomatic complexity thresholds', () => {
      expect(THRESHOLDS.cyclomaticComplexity.ideal).toBe(5);
      expect(THRESHOLDS.cyclomaticComplexity.warning).toBe(10);
      expect(THRESHOLDS.cyclomaticComplexity.critical).toBe(25);
      expect(THRESHOLDS.cyclomaticComplexity.extreme).toBe(50);
    });

    test('should have correct cognitive complexity thresholds', () => {
      expect(THRESHOLDS.cognitiveComplexity.ideal).toBe(8);
      expect(THRESHOLDS.cognitiveComplexity.warning).toBe(15);
      expect(THRESHOLDS.cognitiveComplexity.critical).toBe(30);
      expect(THRESHOLDS.cognitiveComplexity.extreme).toBe(60);
    });
  });
});
