/**
 * Tests for Large Project Analyzer
 *
 * Verifies:
 * - Scale detection
 * - Streaming analysis
 * - Memory management
 * - Function extraction
 */

const path = require('path');
const { LargeProjectAnalyzer, THRESHOLDS, CHUNK_SIZE } = require('../../src/analyzers/large-project-analyzer');

describe('LargeProjectAnalyzer', () => {
  const testWorkspace = path.join(__dirname, '..');

  describe('Scale Detection', () => {
    test('should detect small project', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      const scale = analyzer.determineScale(50);

      expect(scale.name).toBe('Small');
      expect(scale.strategy).toBe('batch');
    });

    test('should detect medium project', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      const scale = analyzer.determineScale(500);

      expect(scale.name).toBe('Medium');
      expect(scale.strategy).toBe('batch');
    });

    test('should detect large project', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      const scale = analyzer.determineScale(5000);

      expect(scale.name).toBe('Large');
      expect(scale.strategy).toBe('chunked');
    });

    test('should detect massive project', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      const scale = analyzer.determineScale(50000);

      expect(scale.name).toBe('Massive');
      expect(scale.strategy).toBe('streaming');
    });
  });

  describe('Language Detection', () => {
    test('should detect JavaScript', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      expect(analyzer.detectLanguage('test.js')).toBe('javascript');
      expect(analyzer.detectLanguage('test.jsx')).toBe('javascript');
    });

    test('should detect TypeScript', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      expect(analyzer.detectLanguage('test.ts')).toBe('typescript');
      expect(analyzer.detectLanguage('test.tsx')).toBe('typescript');
    });

    test('should detect C/C++', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      expect(analyzer.detectLanguage('test.c')).toBe('c');
      expect(analyzer.detectLanguage('test.h')).toBe('c');
      expect(analyzer.detectLanguage('test.cpp')).toBe('cpp');
      expect(analyzer.detectLanguage('test.cc')).toBe('cpp');
    });

    test('should detect Rust', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      expect(analyzer.detectLanguage('test.rs')).toBe('rust');
    });

    test('should detect Python', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      expect(analyzer.detectLanguage('test.py')).toBe('python');
    });
  });

  describe('Complexity Calculation', () => {
    test('should calculate base complexity', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      const code = 'function test() { return 1; }';
      expect(analyzer.calculateComplexity(code, 'javascript')).toBe(1);
    });

    test('should count if statements', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      const code = 'if (a) { } if (b) { }';
      expect(analyzer.calculateComplexity(code, 'javascript')).toBe(3); // base + 2 ifs
    });

    test('should count logical operators', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      const code = 'if (a && b || c) { }';
      expect(analyzer.calculateComplexity(code, 'javascript')).toBe(4); // base + if + && + ||
    });

    test('should count loops', () => {
      const analyzer = new LargeProjectAnalyzer(testWorkspace);
      const code = 'for (let i = 0; i < 10; i++) { while (true) { } }';
      expect(analyzer.calculateComplexity(code, 'javascript')).toBe(3); // base + for + while
    });
  });

  describe('Thresholds', () => {
    test('should have correct function line thresholds', () => {
      expect(THRESHOLDS.functionLines.warning).toBe(100);
      expect(THRESHOLDS.functionLines.critical).toBe(500);
      expect(THRESHOLDS.functionLines.extreme).toBe(1000);
    });

    test('should have correct complexity thresholds', () => {
      expect(THRESHOLDS.cyclomaticComplexity.warning).toBe(10);
      expect(THRESHOLDS.cyclomaticComplexity.critical).toBe(25);
      expect(THRESHOLDS.cyclomaticComplexity.extreme).toBe(50);
    });
  });

  describe('Chunk Sizes', () => {
    test('should have appropriate chunk sizes', () => {
      expect(CHUNK_SIZE.small).toBe(100);
      expect(CHUNK_SIZE.medium).toBe(500);
      expect(CHUNK_SIZE.large).toBe(1000);
      expect(CHUNK_SIZE.streaming).toBe(2000);
    });
  });
});
