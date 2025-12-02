const TraceabilityAnalyzer = require('../../src/analyzers/traceability');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('TraceabilityAnalyzer', () => {
  let tmpDir;
  let analyzer;

  beforeEach(async () => {
    // Create temporary directory
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'musubi-trace-test-'));
    analyzer = new TraceabilityAnalyzer(tmpDir);

    // Create directory structure
    await fs.mkdirp(path.join(tmpDir, 'docs/requirements'));
    await fs.mkdirp(path.join(tmpDir, 'docs/design'));
    await fs.mkdirp(path.join(tmpDir, 'docs/tasks'));
    await fs.mkdirp(path.join(tmpDir, 'src'));
    await fs.mkdirp(path.join(tmpDir, 'tests'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tmpDir);
  });

  describe('generateMatrix', () => {
    test('generates basic matrix', async () => {
      // Create requirement
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      const result = await analyzer.generateMatrix();

      expect(result).toHaveProperty('matrix');
      expect(result).toHaveProperty('summary');
      expect(result.matrix.length).toBe(1);
      expect(result.matrix[0].requirement.id).toBe('REQ-AUTH-001');
    });

    test('generates matrix with full coverage', async () => {
      // Create requirement
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      // Create design
      await fs.writeFile(
        path.join(tmpDir, 'docs/design/auth.md'),
        '### ADR-001: Authentication\n\nImplements REQ-AUTH-001 using JWT.'
      );

      // Create task
      await fs.writeFile(
        path.join(tmpDir, 'docs/tasks/auth.md'),
        '### TASK-001: Implement login\n\n**Status**: Complete\n\nImplements REQ-AUTH-001.'
      );

      // Create code
      await fs.writeFile(
        path.join(tmpDir, 'src/auth.js'),
        '// REQ-AUTH-001: User login\nfunction login() {}'
      );

      // Create test
      await fs.writeFile(
        path.join(tmpDir, 'tests/auth.test.js'),
        'test("REQ-AUTH-001: login works", () => {})'
      );

      const result = await analyzer.generateMatrix();

      expect(result.matrix.length).toBe(1);
      expect(result.matrix[0].coverage.design).toBe(true);
      expect(result.matrix[0].coverage.tasks).toBe(true);
      expect(result.matrix[0].coverage.code).toBe(true);
      expect(result.matrix[0].coverage.tests).toBe(true);
    });

    test('handles empty workspace', async () => {
      const result = await analyzer.generateMatrix();

      expect(result.matrix).toEqual([]);
      expect(result.summary.totalRequirements).toBe(0);
    });
  });

  describe('calculateCoverage', () => {
    test('calculates 100% coverage', async () => {
      // Create requirement
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      // Create full coverage
      await fs.writeFile(
        path.join(tmpDir, 'docs/design/auth.md'),
        '### ADR-001: Auth\n\nREQ-AUTH-001'
      );
      await fs.writeFile(
        path.join(tmpDir, 'docs/tasks/auth.md'),
        '### TASK-001: Login\n\n**Status**: Complete\n\nREQ-AUTH-001'
      );
      await fs.writeFile(path.join(tmpDir, 'src/auth.js'), '// REQ-AUTH-001\nfunction login() {}');
      await fs.writeFile(path.join(tmpDir, 'tests/auth.test.js'), 'test("REQ-AUTH-001", () => {})');

      const coverage = await analyzer.calculateCoverage();

      expect(coverage.overall).toBe(100);
      expect(coverage.designCoverage).toBe(100);
      expect(coverage.tasksCoverage).toBe(100);
      expect(coverage.codeCoverage).toBe(100);
      expect(coverage.testsCoverage).toBe(100);
    });

    test('calculates partial coverage', async () => {
      // Create requirement
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      // Only design coverage
      await fs.writeFile(
        path.join(tmpDir, 'docs/design/auth.md'),
        '### ADR-001: Auth\n\nREQ-AUTH-001'
      );

      const coverage = await analyzer.calculateCoverage();

      expect(coverage.designCoverage).toBe(100);
      expect(coverage.tasksCoverage).toBe(0);
      expect(coverage.codeCoverage).toBe(0);
      expect(coverage.testsCoverage).toBe(0);
      expect(coverage.overall).toBe(25);
    });

    test('calculates 0% coverage', async () => {
      // Create requirement only
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      const coverage = await analyzer.calculateCoverage();

      expect(coverage.overall).toBe(0);
    });
  });

  describe('detectGaps', () => {
    test('detects no gaps with full coverage', async () => {
      // Create full coverage
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );
      await fs.writeFile(
        path.join(tmpDir, 'docs/design/auth.md'),
        '### ADR-001: Auth\n\nREQ-AUTH-001'
      );
      await fs.writeFile(
        path.join(tmpDir, 'docs/tasks/auth.md'),
        '### TASK-001: Login\n\n**Status**: Complete\n\nREQ-AUTH-001'
      );
      await fs.writeFile(path.join(tmpDir, 'src/auth.js'), '// REQ-AUTH-001\nfunction login() {}');
      await fs.writeFile(path.join(tmpDir, 'tests/auth.test.js'), 'test("REQ-AUTH-001", () => {})');

      const gaps = await analyzer.detectGaps();

      expect(gaps.orphanedRequirements).toEqual([]);
      expect(gaps.orphanedDesign).toEqual([]);
      expect(gaps.orphanedTasks).toEqual([]);
      expect(gaps.untestedCode.length).toBe(0);
      expect(gaps.missingTests).toEqual([]);
    });

    test('detects orphaned requirements', async () => {
      // Create requirement without design or tasks
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      const gaps = await analyzer.detectGaps();

      expect(gaps.orphanedRequirements.length).toBe(1);
      expect(gaps.orphanedRequirements[0].id).toBe('REQ-AUTH-001');
    });

    test('detects orphaned design', async () => {
      // Create design without requirement
      await fs.writeFile(
        path.join(tmpDir, 'docs/design/auth.md'),
        '### ADR-001: Authentication\n\nSome design without requirement reference.'
      );

      const gaps = await analyzer.detectGaps();

      expect(gaps.orphanedDesign.length).toBe(1);
    });

    test('detects orphaned tasks', async () => {
      // Create task without requirement
      await fs.writeFile(
        path.join(tmpDir, 'docs/tasks/auth.md'),
        '### TASK-001: Implement something\n\n**Status**: Todo\n\nNo requirement reference.'
      );

      const gaps = await analyzer.detectGaps();

      expect(gaps.orphanedTasks.length).toBe(1);
    });

    test('detects missing tests', async () => {
      // Create requirement without tests
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      const gaps = await analyzer.detectGaps();

      expect(gaps.missingTests.length).toBe(1);
      expect(gaps.missingTests[0].id).toBe('REQ-AUTH-001');
    });

    test('detects untested code', async () => {
      // Create code without tests
      await fs.writeFile(path.join(tmpDir, 'src/untested.js'), 'function untestedFunction() {}');

      const gaps = await analyzer.detectGaps();

      expect(gaps.untestedCode.length).toBeGreaterThan(0);
    });
  });

  describe('traceRequirement', () => {
    test('traces requirement through all stages', async () => {
      // Create full chain
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );
      await fs.writeFile(
        path.join(tmpDir, 'docs/design/auth.md'),
        '### ADR-001: Auth\n\nREQ-AUTH-001'
      );
      await fs.writeFile(
        path.join(tmpDir, 'docs/tasks/auth.md'),
        '### TASK-001: Login\n\n**Status**: Complete\n\nREQ-AUTH-001'
      );
      await fs.writeFile(path.join(tmpDir, 'src/auth.js'), '// REQ-AUTH-001\nfunction login() {}');
      await fs.writeFile(path.join(tmpDir, 'tests/auth.test.js'), 'test("REQ-AUTH-001", () => {})');

      const trace = await analyzer.traceRequirement('REQ-AUTH-001');

      expect(trace.requirement).toBeTruthy();
      expect(trace.requirement.id).toBe('REQ-AUTH-001');
      expect(trace.design.length).toBeGreaterThan(0);
      expect(trace.tasks.length).toBeGreaterThan(0);
      expect(trace.code.length).toBeGreaterThan(0);
      expect(trace.tests.length).toBeGreaterThan(0);
    });

    test('returns null for non-existent requirement', async () => {
      const trace = await analyzer.traceRequirement('REQ-NONEXISTENT-999');

      expect(trace.requirement).toBeNull();
      expect(trace.design).toEqual([]);
      expect(trace.tasks).toEqual([]);
    });

    test('traces requirement with missing stages', async () => {
      // Create requirement without design
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      const trace = await analyzer.traceRequirement('REQ-AUTH-001');

      expect(trace.requirement).toBeTruthy();
      expect(trace.design).toEqual([]);
      expect(trace.tasks).toEqual([]);
      expect(trace.code).toEqual([]);
      expect(trace.tests).toEqual([]);
    });
  });

  describe('validate', () => {
    test('passes validation with 100% coverage', async () => {
      // Create full coverage
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );
      await fs.writeFile(
        path.join(tmpDir, 'docs/design/auth.md'),
        '### ADR-001: Auth\n\nREQ-AUTH-001'
      );
      await fs.writeFile(
        path.join(tmpDir, 'docs/tasks/auth.md'),
        '### TASK-001: Login\n\n**Status**: Complete\n\nREQ-AUTH-001'
      );
      await fs.writeFile(path.join(tmpDir, 'src/auth.js'), '// REQ-AUTH-001\nfunction login() {}');
      await fs.writeFile(path.join(tmpDir, 'tests/auth.test.js'), 'test("REQ-AUTH-001", () => {})');

      const result = await analyzer.validate();

      expect(result.passed).toBe(true);
      expect(result.coverage.overall).toBe(100);
    });

    test('fails validation with gaps', async () => {
      // Create requirement without full coverage
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      const result = await analyzer.validate();

      expect(result.passed).toBe(false);
    });
  });

  describe('formatMatrix', () => {
    test('formats matrix as JSON', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      const matrixData = await analyzer.generateMatrix();
      const formatted = analyzer.formatMatrix(matrixData, 'json');

      expect(() => JSON.parse(formatted)).not.toThrow();
      const parsed = JSON.parse(formatted);
      expect(parsed).toHaveProperty('matrix');
      expect(parsed).toHaveProperty('summary');
    });

    test('formats matrix as markdown', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      const matrixData = await analyzer.generateMatrix();
      const formatted = analyzer.formatMatrix(matrixData, 'markdown');

      expect(formatted).toContain('# Requirement Traceability Matrix');
      expect(formatted).toContain('REQ-AUTH-001');
      expect(formatted).toContain('| Requirement ID |');
    });

    test('formats matrix as HTML', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      const matrixData = await analyzer.generateMatrix();
      const formatted = analyzer.formatMatrix(matrixData, 'html');

      expect(formatted).toContain('<!DOCTYPE html>');
      expect(formatted).toContain('REQ-AUTH-001');
      expect(formatted).toContain('<table>');
    });

    test('formats matrix as table (default)', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\nUser must be able to log in.'
      );

      const matrixData = await analyzer.generateMatrix();
      const formatted = analyzer.formatMatrix(matrixData, 'table');

      expect(formatted).toContain('Requirement Traceability Matrix');
      expect(formatted).toContain('REQ-AUTH-001');
    });
  });

  describe('file parsing', () => {
    test('parses requirements correctly', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'docs/requirements/auth.md'),
        '### REQ-AUTH-001: User login\n\n### REQ-AUTH-002: User logout'
      );

      const requirements = await analyzer.findRequirements('docs/requirements');

      expect(requirements.length).toBe(2);
      expect(requirements[0].id).toBe('REQ-AUTH-001');
      expect(requirements[1].id).toBe('REQ-AUTH-002');
    });

    test('parses design documents correctly', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'docs/design/auth.md'),
        '### ADR-001: Authentication\n\n### Level 1: System Context'
      );

      const design = await analyzer.findDesign('docs/design');

      expect(design.length).toBe(2);
      expect(design.some(d => d.type === 'ADR')).toBe(true);
      expect(design.some(d => d.type === 'C4')).toBe(true);
    });

    test('parses tasks correctly', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'docs/tasks/auth.md'),
        '### TASK-001: Implement login\n\n**Status**: Complete'
      );

      const tasks = await analyzer.findTasks('docs/tasks');

      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe('TASK-001');
      expect(tasks[0].status).toBe('Complete');
    });

    test('parses code files correctly', async () => {
      await fs.writeFile(path.join(tmpDir, 'src/auth.js'), 'function login() {}\nclass Auth {}');

      const code = await analyzer.findCode('src');

      expect(code.length).toBe(2);
    });

    test('parses test files correctly', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'tests/auth.test.js'),
        'test("login works", () => {})\nit("logout works", () => {})'
      );

      const tests = await analyzer.findTests('tests');

      expect(tests.length).toBe(2);
    });
  });
});
