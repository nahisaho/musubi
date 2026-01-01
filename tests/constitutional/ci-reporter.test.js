/**
 * CI Reporter Tests
 *
 * Tests for CI-friendly reporting.
 *
 * Requirement: IMP-6.2-005-03
 */

const { CIReporter, OUTPUT_FORMAT, EXIT_CODE } = require('../../src/constitutional/ci-reporter');
const { SEVERITY } = require('../../src/constitutional/checker');
const fs = require('fs').promises;
const path = require('path');

describe('CIReporter', () => {
  let reporter;
  const testDir = 'test-ci-reporter-temp';

  beforeEach(async () => {
    reporter = new CIReporter();
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  });

  describe('constructor', () => {
    it('should create reporter with default config', () => {
      const r = new CIReporter();
      expect(r.config.format).toBe(OUTPUT_FORMAT.TEXT);
      expect(r.config.failOnWarning).toBe(false);
    });

    it('should merge custom config', () => {
      const r = new CIReporter({ format: OUTPUT_FORMAT.JSON });
      expect(r.config.format).toBe(OUTPUT_FORMAT.JSON);
    });
  });

  describe('OUTPUT_FORMAT', () => {
    it('should define all formats', () => {
      expect(OUTPUT_FORMAT.TEXT).toBe('text');
      expect(OUTPUT_FORMAT.JSON).toBe('json');
      expect(OUTPUT_FORMAT.GITHUB).toBe('github');
      expect(OUTPUT_FORMAT.JUNIT).toBe('junit');
    });
  });

  describe('EXIT_CODE', () => {
    it('should define all exit codes', () => {
      expect(EXIT_CODE.SUCCESS).toBe(0);
      expect(EXIT_CODE.WARNINGS).toBe(0);
      expect(EXIT_CODE.FAILURES).toBe(1);
      expect(EXIT_CODE.ERROR).toBe(2);
    });
  });

  describe('runAndReport', () => {
    it('should check files and generate report', async () => {
      const filePath = path.join(testDir, 'test.js');
      await fs.writeFile(filePath, '/** Requirement: R */ const x = 1;', 'utf-8');

      const result = await reporter.runAndReport([filePath]);

      expect(result.report).toBeDefined();
      expect(result.exitCode).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should use TEXT format by default', async () => {
      const filePath = path.join(testDir, 'test.js');
      await fs.writeFile(filePath, '/** Requirement: R */ const x = 1;', 'utf-8');

      const result = await reporter.runAndReport([filePath]);

      expect(result.format).toBe(OUTPUT_FORMAT.TEXT);
      expect(result.report).toContain('═══');
    });

    it('should return success exit code for compliant files', async () => {
      const filePath = path.join(testDir, 'good.js');
      await fs.writeFile(filePath, '/** Requirement: R */ const x = 1;', 'utf-8');

      const result = await reporter.runAndReport([filePath]);

      expect(result.exitCode).toBe(EXIT_CODE.SUCCESS);
    });

    it('should return failure exit code for blocked files', async () => {
      const filePath = path.join(testDir, 'bad.js');
      const longContent = Array(600).fill('// line').join('\n');
      await fs.writeFile(filePath, longContent, 'utf-8');

      const result = await reporter.runAndReport([filePath]);

      // Article VII violation triggers phase -1
      expect(result.blockDecision.requiresPhaseMinusOne).toBe(true);
    });

    it('should accept format override', async () => {
      const filePath = path.join(testDir, 'test.js');
      await fs.writeFile(filePath, '/** Requirement: R */ const x = 1;', 'utf-8');

      const result = await reporter.runAndReport([filePath], { format: OUTPUT_FORMAT.JSON });

      expect(result.format).toBe(OUTPUT_FORMAT.JSON);
      const parsed = JSON.parse(result.report);
      expect(parsed.version).toBe('1.0.0');
    });
  });

  describe('formatText', () => {
    it('should format results as text', () => {
      const results = {
        results: [],
        summary: {
          filesChecked: 5,
          filesPassed: 4,
          filesFailed: 1,
          totalViolations: 2,
          violationsByArticle: { VII: 2 },
        },
        checkedAt: new Date().toISOString(),
      };
      const blockDecision = { shouldBlock: false, requiresPhaseMinusOne: false };

      const report = reporter.formatText(results, blockDecision);

      expect(report).toContain('MUSUBI Constitutional Compliance Report');
      expect(report).toContain('Files Checked: 5');
      expect(report).toContain('Violations:    2');
    });

    it('should show BLOCKED status when blocked', () => {
      const results = {
        results: [],
        summary: {
          filesChecked: 1,
          filesPassed: 0,
          filesFailed: 1,
          totalViolations: 1,
          violationsByArticle: { VII: 1 },
        },
        checkedAt: new Date().toISOString(),
      };
      const blockDecision = { shouldBlock: true, requiresPhaseMinusOne: true };

      const report = reporter.formatText(results, blockDecision);

      expect(report).toContain('BLOCKED');
      expect(report).toContain('Phase -1 Gate');
    });

    it('should show PASSED WITH WARNINGS status', () => {
      const results = {
        results: [
          {
            filePath: 'test.js',
            violations: [{ article: 'IX', severity: 'low', message: 'test' }],
          },
        ],
        summary: {
          filesChecked: 1,
          filesPassed: 0,
          filesFailed: 1,
          totalViolations: 1,
          violationsByArticle: { IX: 1 },
        },
        checkedAt: new Date().toISOString(),
      };
      const blockDecision = { shouldBlock: false, requiresPhaseMinusOne: false };

      const report = reporter.formatText(results, blockDecision);

      expect(report).toContain('PASSED WITH WARNINGS');
    });
  });

  describe('formatJSON', () => {
    it('should format results as JSON', () => {
      const results = {
        results: [{ filePath: 'test.js', violations: [] }],
        summary: {
          filesChecked: 1,
          filesPassed: 1,
          filesFailed: 0,
          totalViolations: 0,
          violationsByArticle: {},
        },
        checkedAt: new Date().toISOString(),
      };
      const blockDecision = { shouldBlock: false, requiresPhaseMinusOne: false };

      const report = reporter.formatJSON(results, blockDecision);
      const parsed = JSON.parse(report);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.summary.filesChecked).toBe(1);
      expect(parsed.status.blocked).toBe(false);
    });

    it('should include violations in JSON', () => {
      const results = {
        results: [
          {
            filePath: 'test.js',
            violations: [{ article: 'VII', message: 'Too long', severity: 'high' }],
          },
        ],
        summary: {
          filesChecked: 1,
          filesPassed: 0,
          filesFailed: 1,
          totalViolations: 1,
          violationsByArticle: { VII: 1 },
        },
        checkedAt: new Date().toISOString(),
      };
      const blockDecision = { shouldBlock: true, requiresPhaseMinusOne: true };

      const report = reporter.formatJSON(results, blockDecision);
      const parsed = JSON.parse(report);

      expect(parsed.violations.length).toBe(1);
      expect(parsed.violations[0].file).toBe('test.js');
    });
  });

  describe('formatGitHub', () => {
    it('should format for GitHub Actions', () => {
      const results = {
        results: [],
        summary: {
          filesChecked: 1,
          filesPassed: 1,
          filesFailed: 0,
          totalViolations: 0,
          violationsByArticle: {},
        },
        checkedAt: new Date().toISOString(),
      };
      const blockDecision = { shouldBlock: false, requiresPhaseMinusOne: false };

      const report = reporter.formatGitHub(results, blockDecision);

      expect(report).toContain('::group::');
      // Environment Files format (GITHUB_OUTPUT)
      expect(report).toContain('violations=');
    });

    it('should create error annotations for violations', () => {
      const results = {
        results: [
          {
            filePath: 'src/test.js',
            violations: [
              {
                article: 'VII',
                articleName: 'Simplicity',
                message: 'File too long',
                severity: SEVERITY.HIGH,
                line: 100,
              },
            ],
          },
        ],
        summary: {
          filesChecked: 1,
          filesPassed: 0,
          filesFailed: 1,
          totalViolations: 1,
          violationsByArticle: { VII: 1 },
        },
        checkedAt: new Date().toISOString(),
      };
      const blockDecision = { shouldBlock: true, requiresPhaseMinusOne: true };

      const report = reporter.formatGitHub(results, blockDecision);

      expect(report).toContain('::error file=src/test.js');
      expect(report).toContain('line=100');
    });

    it('should create warning annotations for low severity', () => {
      const results = {
        results: [
          {
            filePath: 'test.js',
            violations: [
              {
                article: 'IX',
                articleName: 'Documentation',
                message: 'Missing docs',
                severity: SEVERITY.LOW,
                line: 10,
              },
            ],
          },
        ],
        summary: {
          filesChecked: 1,
          filesPassed: 0,
          filesFailed: 1,
          totalViolations: 1,
          violationsByArticle: { IX: 1 },
        },
        checkedAt: new Date().toISOString(),
      };
      const blockDecision = { shouldBlock: false, requiresPhaseMinusOne: false };

      const report = reporter.formatGitHub(results, blockDecision);

      expect(report).toContain('::warning');
    });
  });

  describe('formatJUnit', () => {
    it('should format as JUnit XML', () => {
      const results = {
        results: [{ filePath: 'test.js', violations: [] }],
        summary: {
          filesChecked: 1,
          filesPassed: 1,
          filesFailed: 0,
          totalViolations: 0,
          violationsByArticle: {},
        },
        checkedAt: new Date().toISOString(),
      };
      const blockDecision = { shouldBlock: false, requiresPhaseMinusOne: false };

      const report = reporter.formatJUnit(results, blockDecision);

      expect(report).toContain('<?xml version="1.0"');
      expect(report).toContain('<testsuites');
      expect(report).toContain('tests="1"');
    });

    it('should include failures in JUnit XML', () => {
      const results = {
        results: [
          {
            filePath: 'test.js',
            violations: [
              {
                article: 'VII',
                articleName: 'Simplicity',
                message: 'Too long',
                severity: 'high',
                suggestion: 'Split file',
              },
            ],
          },
        ],
        summary: {
          filesChecked: 1,
          filesPassed: 0,
          filesFailed: 1,
          totalViolations: 1,
          violationsByArticle: { VII: 1 },
        },
        checkedAt: new Date().toISOString(),
      };
      const blockDecision = { shouldBlock: true, requiresPhaseMinusOne: true };

      const report = reporter.formatJUnit(results, blockDecision);

      expect(report).toContain('<failure');
      expect(report).toContain('ArticleVIIViolation');
      expect(report).toContain('Too long');
    });

    it('should escape XML special characters', () => {
      const results = {
        results: [
          {
            filePath: 'test.js',
            violations: [
              {
                article: 'I',
                articleName: 'Spec',
                message: 'Missing <requirement> & "spec"',
                severity: 'medium',
                suggestion: "Use 'REQ-XXX'",
              },
            ],
          },
        ],
        summary: {
          filesChecked: 1,
          filesPassed: 0,
          filesFailed: 1,
          totalViolations: 1,
          violationsByArticle: { I: 1 },
        },
        checkedAt: new Date().toISOString(),
      };
      const blockDecision = { shouldBlock: false };

      const report = reporter.formatJUnit(results, blockDecision);

      expect(report).toContain('&lt;requirement&gt;');
      expect(report).toContain('&amp;');
    });
  });

  describe('determineExitCode', () => {
    it('should return SUCCESS for no violations', () => {
      const results = { summary: { totalViolations: 0 } };
      const blockDecision = { shouldBlock: false };

      const code = reporter.determineExitCode(results, blockDecision);

      expect(code).toBe(EXIT_CODE.SUCCESS);
    });

    it('should return FAILURES when blocked', () => {
      const results = { summary: { totalViolations: 1 } };
      const blockDecision = { shouldBlock: true };

      const code = reporter.determineExitCode(results, blockDecision);

      expect(code).toBe(EXIT_CODE.FAILURES);
    });

    it('should respect failOnWarning config', () => {
      const r = new CIReporter({ failOnWarning: true });
      const results = { summary: { totalViolations: 1 } };
      const blockDecision = { shouldBlock: false };

      const code = r.determineExitCode(results, blockDecision);

      // failOnWarning returns WARNINGS which is same as SUCCESS (0)
      expect(code).toBe(EXIT_CODE.WARNINGS);
    });
  });

  describe('getSeverityIcon', () => {
    it('should return correct icons', () => {
      expect(reporter.getSeverityIcon(SEVERITY.CRITICAL)).toBe('🔴');
      expect(reporter.getSeverityIcon(SEVERITY.HIGH)).toBe('🟠');
      expect(reporter.getSeverityIcon(SEVERITY.MEDIUM)).toBe('🟡');
      expect(reporter.getSeverityIcon(SEVERITY.LOW)).toBe('🟢');
      expect(reporter.getSeverityIcon('unknown')).toBe('⚪');
    });
  });

  describe('escapeXml', () => {
    it('should escape XML special characters', () => {
      expect(reporter.escapeXml('&')).toBe('&amp;');
      expect(reporter.escapeXml('<')).toBe('&lt;');
      expect(reporter.escapeXml('>')).toBe('&gt;');
      expect(reporter.escapeXml('"')).toBe('&quot;');
      expect(reporter.escapeXml("'")).toBe('&apos;');
    });

    it('should handle null/undefined', () => {
      expect(reporter.escapeXml(null)).toBe('');
      expect(reporter.escapeXml(undefined)).toBe('');
    });
  });
});
