const fs = require('fs-extra');
const path = require('path');
const GapDetector = require('../../src/analyzers/gap-detector');

describe('GapDetector', () => {
  let detector;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'gap-detector-test-'));
    detector = new GapDetector({
      requirementsDir: path.join(tempDir, 'docs/requirements'),
      designDir: path.join(tempDir, 'docs/design'),
      tasksDir: path.join(tempDir, 'docs/tasks'),
      srcDir: path.join(tempDir, 'src'),
      testsDir: path.join(tempDir, 'tests'),
    });

    // Create test directories
    await fs.ensureDir(detector.requirementsDir);
    await fs.ensureDir(detector.designDir);
    await fs.ensureDir(detector.tasksDir);
    await fs.ensureDir(detector.srcDir);
    await fs.ensureDir(detector.testsDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('extractRequirements', () => {
    it('should extract requirements from markdown files', async () => {
      const reqFile = path.join(detector.requirementsDir, 'auth.md');
      await fs.writeFile(
        reqFile,
        `
## REQ-AUTH-001: User Login

User shall be able to log in with email and password.

## REQ-AUTH-002: Password Reset

User shall be able to reset password via email.
`
      );

      const requirements = await detector.extractRequirements();

      expect(requirements).toHaveLength(2);
      expect(requirements[0].id).toBe('REQ-AUTH-001');
      expect(requirements[0].title).toBe('User Login');
      expect(requirements[1].id).toBe('REQ-AUTH-002');
      expect(requirements[1].title).toBe('Password Reset');
    });

    it('should return empty array if requirements directory does not exist', async () => {
      await fs.remove(detector.requirementsDir);
      const requirements = await detector.extractRequirements();
      expect(requirements).toEqual([]);
    });
  });

  describe('detectOrphanedRequirements', () => {
    it('should detect requirements without design or task references', async () => {
      // Create requirement
      await fs.writeFile(
        path.join(detector.requirementsDir, 'auth.md'),
        `
## REQ-AUTH-001: User Login

User shall be able to log in.
`
      );

      // Create design without REQ-AUTH-001
      await fs.writeFile(
        path.join(detector.designDir, 'auth.md'),
        `
# Authentication Design

References REQ-AUTH-002
`
      );

      const orphaned = await detector.detectOrphanedRequirements();

      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].id).toBe('REQ-AUTH-001');
      expect(orphaned[0].reason).toBe('No design or task references found');
    });

    it('should not detect requirements with design references', async () => {
      // Create requirement
      await fs.writeFile(
        path.join(detector.requirementsDir, 'auth.md'),
        `
## REQ-AUTH-001: User Login

User shall be able to log in.
`
      );

      // Create design with REQ-AUTH-001
      await fs.writeFile(
        path.join(detector.designDir, 'auth.md'),
        `
# Authentication Design

This design implements REQ-AUTH-001.
`
      );

      const orphaned = await detector.detectOrphanedRequirements();

      expect(orphaned).toHaveLength(0);
    });

    it('should not detect requirements with task references', async () => {
      // Create requirement
      await fs.writeFile(
        path.join(detector.requirementsDir, 'auth.md'),
        `
## REQ-AUTH-001: User Login

User shall be able to log in.
`
      );

      // Create task with REQ-AUTH-001
      await fs.writeFile(
        path.join(detector.tasksDir, 'auth.md'),
        `
# Authentication Tasks

## TASK-001: Implement Login
- Implements: REQ-AUTH-001
`
      );

      const orphaned = await detector.detectOrphanedRequirements();

      expect(orphaned).toHaveLength(0);
    });
  });

  describe('detectUntestedCode', () => {
    it('should detect source files without tests', async () => {
      // Create source file
      await fs.writeFile(path.join(detector.srcDir, 'auth.js'), '// auth code');

      const untested = await detector.detectUntestedCode();

      expect(untested).toHaveLength(1);
      expect(untested[0].file).toContain('auth.js');
      expect(untested[0].reason).toBe('No corresponding test file found');
    });

    it('should not detect source files with tests', async () => {
      // Create source file
      await fs.writeFile(path.join(detector.srcDir, 'auth.js'), '// auth code');

      // Create test file
      await fs.writeFile(path.join(detector.testsDir, 'auth.test.js'), '// auth tests');

      const untested = await detector.detectUntestedCode();

      expect(untested).toHaveLength(0);
    });

    it('should handle spec files', async () => {
      // Create source file
      await fs.writeFile(path.join(detector.srcDir, 'user.js'), '// user code');

      // Create spec file
      await fs.writeFile(path.join(detector.testsDir, 'user.spec.js'), '// user specs');

      const untested = await detector.detectUntestedCode();

      expect(untested).toHaveLength(0);
    });
  });

  describe('calculateCoverage', () => {
    it('should calculate coverage statistics', async () => {
      // Create requirements
      await fs.writeFile(
        path.join(detector.requirementsDir, 'auth.md'),
        `
## REQ-AUTH-001: User Login
## REQ-AUTH-002: Password Reset
`
      );

      // Create design referencing REQ-AUTH-001
      await fs.writeFile(
        path.join(detector.designDir, 'auth.md'),
        `
Implements REQ-AUTH-001
`
      );

      // Create code referencing REQ-AUTH-001
      await fs.writeFile(
        path.join(detector.srcDir, 'auth.js'),
        `
// REQ-AUTH-001
function login() {}
`
      );

      // Create test referencing REQ-AUTH-001
      await fs.writeFile(
        path.join(detector.testsDir, 'auth.test.js'),
        `
// REQ-AUTH-001
test('login', () => {});
`
      );

      const coverage = await detector.calculateCoverage();

      expect(coverage.requirements.total).toBe(2);
      expect(coverage.requirements.withDesign).toBe(1);
      expect(coverage.requirements.withCode).toBe(1);
      expect(coverage.requirements.withTests).toBe(1);
      expect(coverage.requirements.designCoverage).toBe(50);
      expect(coverage.requirements.implementationCoverage).toBe(50);
      expect(coverage.requirements.testCoverage).toBe(50);
      expect(coverage.code.total).toBe(1);
      expect(coverage.code.tested).toBe(1);
      expect(coverage.code.testCoverage).toBe(100);
    });

    it('should handle 100% coverage', async () => {
      // Create requirement
      await fs.writeFile(
        path.join(detector.requirementsDir, 'auth.md'),
        `
## REQ-AUTH-001: User Login
`
      );

      // Create design
      await fs.writeFile(
        path.join(detector.designDir, 'auth.md'),
        `
Implements REQ-AUTH-001
`
      );

      // Create task
      await fs.writeFile(
        path.join(detector.tasksDir, 'auth.md'),
        `
Implements REQ-AUTH-001
`
      );

      // Create code
      await fs.writeFile(
        path.join(detector.srcDir, 'auth.js'),
        `
// REQ-AUTH-001
`
      );

      // Create test
      await fs.writeFile(
        path.join(detector.testsDir, 'auth.test.js'),
        `
// REQ-AUTH-001
`
      );

      const coverage = await detector.calculateCoverage();

      expect(coverage.requirements.designCoverage).toBe(100);
      expect(coverage.requirements.taskCoverage).toBe(100);
      expect(coverage.requirements.implementationCoverage).toBe(100);
      expect(coverage.requirements.testCoverage).toBe(100);
      expect(coverage.code.testCoverage).toBe(100);
    });
  });

  describe('detectAllGaps', () => {
    it('should detect all gap types', async () => {
      // Orphaned requirement
      await fs.writeFile(
        path.join(detector.requirementsDir, 'orphan.md'),
        `
## REQ-ORPHAN-001: Orphaned Requirement
`
      );

      // Unimplemented requirement
      await fs.writeFile(
        path.join(detector.requirementsDir, 'unimpl.md'),
        `
## REQ-UNIMPL-001: Unimplemented Requirement
`
      );
      await fs.writeFile(
        path.join(detector.designDir, 'unimpl.md'),
        `
Implements REQ-UNIMPL-001
`
      );

      // Untested code
      await fs.writeFile(path.join(detector.srcDir, 'untested.js'), '// code');

      const gaps = await detector.detectAllGaps();

      expect(gaps.orphanedRequirements.length).toBeGreaterThan(0);
      expect(gaps.unimplementedRequirements.length).toBeGreaterThan(0);
      expect(gaps.untestedCode.length).toBeGreaterThan(0);
      expect(gaps.summary.total).toBeGreaterThan(0);
    });

    it('should return zero gaps for complete project', async () => {
      // Requirement with full traceability
      await fs.writeFile(
        path.join(detector.requirementsDir, 'auth.md'),
        `
## REQ-AUTH-001: User Login
`
      );

      await fs.writeFile(
        path.join(detector.designDir, 'auth.md'),
        `
Implements REQ-AUTH-001
`
      );

      await fs.writeFile(
        path.join(detector.srcDir, 'auth.js'),
        `
// REQ-AUTH-001
function login() {}
`
      );

      await fs.writeFile(
        path.join(detector.testsDir, 'auth.test.js'),
        `
// REQ-AUTH-001
test('login', () => {});
`
      );

      const gaps = await detector.detectAllGaps();

      expect(gaps.summary.total).toBe(0);
    });
  });

  describe('formatMarkdown', () => {
    it('should format gaps as markdown', async () => {
      const gaps = {
        orphanedRequirements: [
          { id: 'REQ-TEST-001', title: 'Test', file: 'test.md', reason: 'No refs' },
        ],
        unimplementedRequirements: [],
        untestedCode: [{ file: 'test.js', reason: 'No test file' }],
        missingTests: [],
        summary: {
          total: 2,
          orphanedRequirements: 1,
          unimplementedRequirements: 0,
          untestedCode: 1,
          missingTests: 0,
        },
      };

      const markdown = detector.formatMarkdown(gaps);

      expect(markdown).toContain('# Gap Detection Report');
      expect(markdown).toContain('**Total Gaps**: 2');
      expect(markdown).toContain('REQ-TEST-001');
      expect(markdown).toContain('test.js');
    });
  });

  describe('formatCoverageMarkdown', () => {
    it('should format coverage as markdown', async () => {
      const coverage = {
        requirements: {
          total: 10,
          withDesign: 8,
          withTasks: 7,
          withCode: 9,
          withTests: 6,
          designCoverage: 80,
          taskCoverage: 70,
          implementationCoverage: 90,
          testCoverage: 60,
        },
        code: {
          total: 20,
          tested: 18,
          untested: 2,
          testCoverage: 90,
        },
      };

      const markdown = detector.formatCoverageMarkdown(coverage);

      expect(markdown).toContain('# Coverage Report');
      expect(markdown).toContain('Total Requirements**: 10');
      expect(markdown).toContain('80.0%');
      expect(markdown).toContain('90.0%');
    });
  });
});
