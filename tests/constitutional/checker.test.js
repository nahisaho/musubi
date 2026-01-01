/**
 * Constitutional Checker Tests
 * 
 * Tests for Article I-IX compliance checking.
 * 
 * Requirement: IMP-6.2-005-01
 */

const { ConstitutionalChecker, ARTICLES, SEVERITY } = require('../../src/constitutional/checker');
const fs = require('fs').promises;
const path = require('path');

describe('ConstitutionalChecker', () => {
  let checker;
  const testDir = 'test-constitutional-temp';
  const storageDir = `${testDir}/storage/constitutional`;

  beforeEach(async () => {
    checker = new ConstitutionalChecker({ storageDir });
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch { /* ignore cleanup errors */ }
  });

  describe('constructor', () => {
    it('should create checker with default config', () => {
      const c = new ConstitutionalChecker();
      expect(c.config).toBeDefined();
      expect(c.config.articleVII).toBeDefined();
    });

    it('should merge custom config', () => {
      const c = new ConstitutionalChecker({ customOption: true });
      expect(c.config.customOption).toBe(true);
    });
  });

  describe('ARTICLES', () => {
    it('should define all 9 articles', () => {
      expect(ARTICLES.I).toBeDefined();
      expect(ARTICLES.II).toBeDefined();
      expect(ARTICLES.III).toBeDefined();
      expect(ARTICLES.IV).toBeDefined();
      expect(ARTICLES.V).toBeDefined();
      expect(ARTICLES.VI).toBeDefined();
      expect(ARTICLES.VII).toBeDefined();
      expect(ARTICLES.VIII).toBeDefined();
      expect(ARTICLES.IX).toBeDefined();
    });

    it('should have names for each article', () => {
      expect(ARTICLES.I.name).toBe('Specification First');
      expect(ARTICLES.VII.name).toBe('Simplicity');
      expect(ARTICLES.VIII.name).toBe('Anti-Abstraction');
    });

    it('should have thresholds for Article VII', () => {
      expect(ARTICLES.VII.thresholds.maxFileLines).toBe(500);
      expect(ARTICLES.VII.thresholds.maxFunctionLines).toBe(50);
      expect(ARTICLES.VII.thresholds.maxCyclomaticComplexity).toBe(10);
      expect(ARTICLES.VII.thresholds.maxDependencies).toBe(10);
    });

    it('should have patterns for Article VIII', () => {
      expect(ARTICLES.VIII.patterns.length).toBeGreaterThan(0);
      expect(ARTICLES.VIII.patterns[0]).toBeInstanceOf(RegExp);
    });
  });

  describe('checkFile', () => {
    it('should check a simple compliant file', async () => {
      const filePath = path.join(testDir, 'simple.js');
      await fs.writeFile(filePath, '/** Requirement: REQ-001 */\nfunction simple() { return "hello"; }', 'utf-8');

      const result = await checker.checkFile(filePath);

      expect(result.filePath).toBe(filePath);
      expect(result.violations).toBeDefined();
    });

    it('should detect Article VII violation (file too long)', async () => {
      const filePath = path.join(testDir, 'long-file.js');
      const longContent = Array(600).fill('// line').join('\n');
      await fs.writeFile(filePath, longContent, 'utf-8');

      const result = await checker.checkFile(filePath);

      const viiViolation = result.violations.find(v => v.article === 'VII');
      expect(viiViolation).toBeDefined();
      expect(viiViolation.severity).toBe(SEVERITY.HIGH);
      expect(viiViolation.message).toContain('500');
    });

    it('should detect Article VIII violation (Factory pattern)', async () => {
      const filePath = path.join(testDir, 'factory.js');
      await fs.writeFile(filePath, '// REQ-001\nclass Service implements ServiceFactory {}', 'utf-8');

      const result = await checker.checkFile(filePath);

      const viiiViolation = result.violations.find(v => v.article === 'VIII');
      expect(viiiViolation).toBeDefined();
    });

    it('should detect Article VIII violation (abstract class)', async () => {
      const filePath = path.join(testDir, 'abstract.js');
      await fs.writeFile(filePath, '// REQ-001\nabstract class BaseService {}', 'utf-8');

      const result = await checker.checkFile(filePath);

      const viiiViolation = result.violations.find(v => v.article === 'VIII');
      expect(viiiViolation).toBeDefined();
    });

    it('should detect Article VIII violation (Base inheritance)', async () => {
      const filePath = path.join(testDir, 'base-ext.js');
      await fs.writeFile(filePath, '// REQ-001\nclass Service extends BaseService {}', 'utf-8');

      const result = await checker.checkFile(filePath);

      const viiiViolation = result.violations.find(v => v.article === 'VIII');
      expect(viiiViolation).toBeDefined();
    });

    it('should return timestamp', async () => {
      const filePath = path.join(testDir, 'test.js');
      await fs.writeFile(filePath, 'const x = 1;', 'utf-8');

      const result = await checker.checkFile(filePath);

      expect(result.checkedAt).toBeDefined();
    });
  });

  describe('checkArticleI', () => {
    it('should pass when requirement is referenced', () => {
      const content = '/** Requirement: REQ-001 */\nfunction test() {}';
      const violation = checker.checkArticleI(content, 'service.js');
      expect(violation).toBeNull();
    });

    it('should fail when no requirement reference for source file', () => {
      const content = 'function test() {}';
      const violation = checker.checkArticleI(content, 'service.js');
      expect(violation).not.toBeNull();
    });

    it('should pass for test files', () => {
      const content = 'function test() {}';
      const violation = checker.checkArticleI(content, 'test.test.js');
      expect(violation).toBeNull();
    });

    it('should pass for index files', () => {
      const content = 'module.exports = {}';
      const violation = checker.checkArticleI(content, 'index.js');
      expect(violation).toBeNull();
    });
  });

  describe('checkArticleIII', () => {
    it('should pass when test file exists', async () => {
      const testFile = path.join(testDir, 'code.test.js');
      await fs.writeFile(testFile, 'test("x", () => {})', 'utf-8');

      const filePath = path.join(testDir, 'code.js');
      
      const violation = await checker.checkArticleIII(filePath);
      expect(violation).toBeNull();
    });

    it('should fail when test file is missing', async () => {
      const filePath = path.join(testDir, 'no-test.js');
      
      const violation = await checker.checkArticleIII(filePath);
      
      expect(violation).not.toBeNull();
      expect(violation.article).toBe('III');
    });
  });

  describe('checkArticleVII', () => {
    it('should pass for simple file', () => {
      const content = 'function simple() { return 1; }';
      const violations = checker.checkArticleVII(content, 'test.js');
      expect(violations.length).toBe(0);
    });

    it('should detect file too long', () => {
      const content = Array(600).fill('// line').join('\n');
      const violations = checker.checkArticleVII(content, 'test.js');
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should detect function too long', () => {
      const longFunction = 'function long() {\n' + Array(60).fill('  x++;').join('\n') + '\n}';
      const violations = checker.checkArticleVII(longFunction, 'test.js');
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should detect too many dependencies', () => {
      const manyRequires = Array(15).fill(null)
        .map((_, i) => 'const m' + i + ' = require("module' + i + '");')
        .join('\n');
      
      const violations = checker.checkArticleVII(manyRequires, 'test.js');
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('checkArticleVIII', () => {
    it('should pass for simple code', () => {
      const content = 'function simple() { return 1; }';
      const violations = checker.checkArticleVIII(content, 'test.js');
      expect(violations.length).toBe(0);
    });

    it('should detect Factory pattern', () => {
      const content = 'class Service implements ServiceFactory {}';
      const violations = checker.checkArticleVIII(content, 'test.js');
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should detect abstract class pattern', () => {
      const content = 'abstract class BaseService {}';
      const violations = checker.checkArticleVIII(content, 'test.js');
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should detect Base* inheritance pattern', () => {
      const content = 'class Service extends BaseService {}';
      const violations = checker.checkArticleVIII(content, 'test.js');
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('checkArticleIX', () => {
    it('should pass when file has documentation', () => {
      const content = '/** @description A module */\nfunction documented() {}';
      const violation = checker.checkArticleIX(content, 'service.js');
      expect(violation).toBeNull();
    });

    it('should warn when missing documentation for source file', () => {
      const content = 'function undocumented() {}';
      const violation = checker.checkArticleIX(content, 'service.js');
      expect(violation).not.toBeNull();
    });

    it('should pass for test files', () => {
      const content = 'test("x", () => {})';
      const violation = checker.checkArticleIX(content, 'test.test.js');
      expect(violation).toBeNull();
    });
  });

  describe('checkFiles', () => {
    it('should check multiple files', async () => {
      const file1 = path.join(testDir, 'a.js');
      const file2 = path.join(testDir, 'b.js');
      await fs.writeFile(file1, '/** Requirement: R1 */ const a = 1;', 'utf-8');
      await fs.writeFile(file2, '/** Requirement: R2 */ const b = 2;', 'utf-8');

      const result = await checker.checkFiles([file1, file2]);

      expect(result.results.length).toBe(2);
      expect(result.summary.totalViolations).toBeDefined();
    });

    it('should summarize violations', async () => {
      const filePath = path.join(testDir, 'violations.js');
      const longContent = Array(600).fill('// line').join('\n');
      await fs.writeFile(filePath, longContent, 'utf-8');

      const result = await checker.checkFiles([filePath]);

      expect(result.summary.totalViolations).toBeGreaterThan(0);
    });
  });

  describe('shouldBlockMerge', () => {
    it('should not block when no violations', () => {
      const result = {
        results: [{ violations: [] }]
      };

      const decision = checker.shouldBlockMerge(result);

      expect(decision.shouldBlock).toBe(false);
    });

    it('should not block for low severity violations', () => {
      const result = {
        results: [{
          violations: [{
            article: 'IX',
            severity: SEVERITY.LOW
          }]
        }]
      };

      const decision = checker.shouldBlockMerge(result);

      expect(decision.shouldBlock).toBe(false);
    });

    it('should block for critical violations', () => {
      const result = {
        results: [{
          violations: [{
            article: 'I',
            severity: SEVERITY.CRITICAL
          }]
        }]
      };

      const decision = checker.shouldBlockMerge(result);

      expect(decision.shouldBlock).toBe(true);
    });

    it('should trigger Phase -1 for Article VII high severity', () => {
      const result = {
        results: [{
          violations: [{
            article: 'VII',
            severity: SEVERITY.HIGH
          }]
        }]
      };

      const decision = checker.shouldBlockMerge(result);

      expect(decision.requiresPhaseMinusOne).toBe(true);
    });

    it('should trigger Phase -1 for Article VIII violations', () => {
      const result = {
        results: [{
          violations: [{
            article: 'VIII',
            severity: SEVERITY.HIGH
          }]
        }]
      };

      const decision = checker.shouldBlockMerge(result);

      expect(decision.requiresPhaseMinusOne).toBe(true);
    });
  });

  describe('checkDirectory', () => {
    it('should check all JS files in directory', async () => {
      const dir = path.join(testDir, 'src');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'a.js'), '/** Requirement: R */ const x = 1;', 'utf-8');
      await fs.writeFile(path.join(dir, 'b.js'), '/** Requirement: R */ const y = 2;', 'utf-8');
      await fs.writeFile(path.join(dir, 'c.txt'), 'not js', 'utf-8');

      const result = await checker.checkDirectory(dir);

      expect(result.results.length).toBe(2);
    });

    it('should respect file extension filter', async () => {
      const dir = path.join(testDir, 'mixed');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'a.ts'), '// ts file', 'utf-8');
      await fs.writeFile(path.join(dir, 'b.js'), '// js file', 'utf-8');

      const result = await checker.checkDirectory(dir, { extensions: ['.ts'] });

      expect(result.results.length).toBe(1);
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', async () => {
      const file = path.join(testDir, 'report-test.js');
      await fs.writeFile(file, '/** Requirement: R1 */ const x = 1;', 'utf-8');

      const results = await checker.checkFiles([file]);
      const report = checker.generateReport(results);

      expect(report).toContain('Constitutional');
    });

    it('should include violation details', async () => {
      const file = path.join(testDir, 'violation.js');
      const longContent = Array(600).fill('// line').join('\n');
      await fs.writeFile(file, longContent, 'utf-8');

      const results = await checker.checkFiles([file]);
      const report = checker.generateReport(results);

      expect(report).toContain('VII');
    });

    it('should show summary statistics', async () => {
      const file = path.join(testDir, 'stats.js');
      await fs.writeFile(file, '/** Requirement: R */ const x = 1;', 'utf-8');

      const results = await checker.checkFiles([file]);
      const report = checker.generateReport(results);

      expect(report).toContain('Summary');
    });
  });

  describe('saveResults', () => {
    it('should save check results', async () => {
      const results = {
        results: [],
        summary: { totalViolations: 0 },
        checkedAt: new Date().toISOString()
      };

      await checker.saveResults('feature-1', results);

      const savedPath = path.join(storageDir, 'feature-1.json');
      const saved = JSON.parse(await fs.readFile(savedPath, 'utf-8'));
      expect(saved.summary.totalViolations).toBe(0);
    });
  });

  describe('loadResults', () => {
    it('should load saved results', async () => {
      const results = {
        results: [],
        summary: { totalViolations: 5 },
        checkedAt: new Date().toISOString()
      };

      await checker.saveResults('feature-2', results);
      const loaded = await checker.loadResults('feature-2');

      expect(loaded.summary.totalViolations).toBe(5);
    });

    it('should return null for non-existent results', async () => {
      const loaded = await checker.loadResults('non-existent');
      expect(loaded).toBeNull();
    });
  });
});
