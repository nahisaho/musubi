/**
 * Traceability Matrix Report Tests
 */

const path = require('path');
const fs = require('fs-extra');
const {
  TraceabilityMatrixReport,
  ReportFormat,
} = require('../../src/reporters/traceability-matrix-report.js');

describe('TraceabilityMatrixReport', () => {
  let testDir;
  let reporter;

  beforeAll(async () => {
    testDir = path.join(__dirname, '..', 'test-output', 'matrix-report');
    await fs.ensureDir(testDir);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  beforeEach(() => {
    reporter = new TraceabilityMatrixReport(testDir);
  });

  describe('constructor', () => {
    it('should create reporter with default options', () => {
      expect(reporter.workspaceRoot).toBe(testDir);
      expect(reporter.options.outputDir).toBe('traceability-reports');
      expect(reporter.options.theme).toBe('light');
      expect(reporter.options.interactive).toBe(true);
    });

    it('should accept custom options', () => {
      const customReporter = new TraceabilityMatrixReport(testDir, {
        outputDir: 'custom-reports',
        theme: 'dark',
        interactive: false,
      });

      expect(customReporter.options.outputDir).toBe('custom-reports');
      expect(customReporter.options.theme).toBe('dark');
      expect(customReporter.options.interactive).toBe(false);
    });
  });

  describe('prepareReportData', () => {
    it('should prepare report data with defaults', () => {
      const data = reporter.prepareReportData({});

      expect(data.timestamp).toBeDefined();
      expect(data.forward).toEqual([]);
      expect(data.backward).toEqual([]);
      expect(data.orphaned).toBeDefined();
      expect(data.completeness).toBeDefined();
      expect(data.summary).toBeDefined();
    });

    it('should preserve traceability data', () => {
      const traceabilityData = {
        forward: [
          { requirement: { id: 'REQ-001' }, design: [], tasks: [], code: [], tests: [], complete: false },
        ],
        backward: [
          { test: { file: 'test.js' }, code: [], tasks: [], design: [], requirements: [], complete: false },
        ],
        orphaned: { requirements: [], design: [], tasks: [], code: [], tests: [] },
        completeness: { forwardComplete: 0, forwardTotal: 1, forwardPercentage: 0, backwardComplete: 0, backwardTotal: 1, backwardPercentage: 0 },
      };

      const data = reporter.prepareReportData(traceabilityData);

      expect(data.forward.length).toBe(1);
      expect(data.backward.length).toBe(1);
    });
  });

  describe('calculateSummary', () => {
    it('should calculate correct summary', () => {
      const data = {
        forward: [
          { complete: true },
          { complete: true },
          { complete: false },
        ],
        backward: [
          { complete: true },
          { complete: false },
        ],
        orphaned: {
          requirements: [{ id: 'REQ-001' }],
          design: [],
          tasks: [],
          code: [{ file: 'orphan.js' }],
          tests: [],
        },
      };

      const summary = reporter.calculateSummary(data);

      expect(summary.totalRequirements).toBe(3);
      expect(summary.completeChains).toBe(2);
      expect(summary.incompleteChains).toBe(1);
      expect(summary.totalTests).toBe(2);
      expect(summary.orphanedCount.requirements).toBe(1);
      expect(summary.orphanedCount.code).toBe(1);
      expect(summary.totalOrphaned).toBe(2);
    });
  });

  describe('generate', () => {
    const sampleData = {
      forward: [
        {
          requirement: { id: 'REQ-001', title: 'User Login' },
          design: [{ id: 'DES-001' }],
          tasks: [{ id: 'TASK-001' }],
          code: [{ file: 'auth.js' }],
          tests: [{ file: 'auth.test.js' }],
          complete: true,
        },
        {
          requirement: { id: 'REQ-002', title: 'Password Reset' },
          design: [],
          tasks: [],
          code: [],
          tests: [],
          complete: false,
        },
      ],
      backward: [
        {
          test: { file: 'auth.test.js' },
          code: [{ file: 'auth.js' }],
          tasks: [{ id: 'TASK-001' }],
          design: [{ id: 'DES-001' }],
          requirements: [{ id: 'REQ-001' }],
          complete: true,
        },
      ],
      orphaned: {
        requirements: [],
        design: [],
        tasks: [],
        code: [{ file: 'orphan.js' }],
        tests: [],
      },
      completeness: {
        forwardComplete: 1,
        forwardTotal: 2,
        forwardPercentage: 50,
        backwardComplete: 1,
        backwardTotal: 1,
        backwardPercentage: 100,
      },
    };

    it('should generate HTML report', async () => {
      const html = await reporter.generate(sampleData, ReportFormat.HTML);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Traceability Matrix Report');
      expect(html).toContain('REQ-001');
      expect(html).toContain('REQ-002');
      expect(html).toContain('Forward Traceability');
      expect(html).toContain('Backward Traceability');
    });

    it('should generate Markdown report', async () => {
      const md = await reporter.generate(sampleData, ReportFormat.MARKDOWN);

      expect(md).toContain('# Traceability Matrix Report');
      expect(md).toContain('REQ-001');
      expect(md).toContain('REQ-002');
      expect(md).toContain('Forward Traceability');
      expect(md).toContain('Backward Traceability');
    });

    it('should generate JSON report', async () => {
      const json = await reporter.generate(sampleData, ReportFormat.JSON);
      const parsed = JSON.parse(json);

      expect(parsed.forward.length).toBe(2);
      expect(parsed.backward.length).toBe(1);
      expect(parsed.completeness.forwardPercentage).toBe(50);
    });
  });

  describe('generateHTML', () => {
    it('should include dark theme styles', () => {
      const darkReporter = new TraceabilityMatrixReport(testDir, { theme: 'dark' });
      const data = darkReporter.prepareReportData({ forward: [], backward: [], orphaned: {}, completeness: {} });
      const html = darkReporter.generateHTML(data);

      expect(html).toContain('#1a1a2e'); // Dark background
    });

    it('should include interactive script when enabled', () => {
      const data = reporter.prepareReportData({ forward: [], backward: [], orphaned: {}, completeness: {} });
      const html = reporter.generateHTML(data);

      expect(html).toContain('filterForward');
      expect(html).toContain('toggleCollapsible');
    });

    it('should exclude interactive script when disabled', () => {
      const staticReporter = new TraceabilityMatrixReport(testDir, { interactive: false });
      const data = staticReporter.prepareReportData({ forward: [], backward: [], orphaned: {}, completeness: {} });
      const html = staticReporter.generateHTML(data);

      // When interactive is false, the script tag content should not contain the function definitions
      expect(html).not.toContain('function filterForward()');
      expect(html).not.toContain('function toggleCollapsible(');
    });
  });

  describe('generateForwardRows', () => {
    it('should show no requirements message when empty', () => {
      const html = reporter.generateForwardRows([]);

      expect(html).toContain('No requirements found');
    });

    it('should show complete badge for complete chains', () => {
      const forward = [
        {
          requirement: { id: 'REQ-001' },
          design: [{ id: 'D-1' }],
          tasks: [{ id: 'T-1' }],
          code: [{ file: 'c.js' }],
          tests: [{ file: 't.test.js' }],
          complete: true,
        },
      ];

      const html = reporter.generateForwardRows(forward);

      expect(html).toContain('✓ Complete');
    });

    it('should show incomplete badge for incomplete chains', () => {
      const forward = [
        {
          requirement: { id: 'REQ-001' },
          design: [],
          tasks: [],
          code: [],
          tests: [],
          complete: false,
        },
      ];

      const html = reporter.generateForwardRows(forward);

      expect(html).toContain('✗ Incomplete');
    });
  });

  describe('generateBackwardRows', () => {
    it('should show no tests message when empty', () => {
      const html = reporter.generateBackwardRows([]);

      expect(html).toContain('No tests found');
    });

    it('should show traced badge for complete chains', () => {
      const backward = [
        {
          test: { file: 'test.js' },
          code: [],
          tasks: [],
          design: [],
          requirements: [{ id: 'REQ-001' }],
          complete: true,
        },
      ];

      const html = reporter.generateBackwardRows(backward);

      expect(html).toContain('✓ Traced');
    });
  });

  describe('formatLinks', () => {
    it('should show None badge for empty items', () => {
      const html = reporter.formatLinks([], 'design');

      expect(html).toContain('None');
    });

    it('should format linked items with badges', () => {
      const items = [{ id: 'DES-001' }, { id: 'DES-002' }];
      const html = reporter.formatLinks(items, 'design');

      expect(html).toContain('DES-001');
      expect(html).toContain('DES-002');
      expect(html).toContain('chain-node design');
    });
  });

  describe('generateOrphanedSection', () => {
    it('should show success message when no orphans', () => {
      const orphaned = { requirements: [], design: [], tasks: [], code: [], tests: [] };
      const summary = { totalOrphaned: 0 };

      const html = reporter.generateOrphanedSection(orphaned, summary);

      expect(html).toContain('All items are properly linked');
    });

    it('should list orphaned items when present', () => {
      const orphaned = {
        requirements: [{ id: 'REQ-ORPHAN' }],
        design: [],
        tasks: [],
        code: [],
        tests: [],
      };
      const summary = { totalOrphaned: 1 };

      const html = reporter.generateOrphanedSection(orphaned, summary);

      expect(html).toContain('REQ-ORPHAN');
      expect(html).toContain('Requirements (1)');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML characters', () => {
      const text = '<script>alert("XSS")</script>';
      const escaped = reporter.escapeHtml(text);

      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('should handle empty string', () => {
      expect(reporter.escapeHtml('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(reporter.escapeHtml(null)).toBe('');
      expect(reporter.escapeHtml(undefined)).toBe('');
    });
  });

  describe('saveReport', () => {
    it('should save HTML report to file', async () => {
      const data = reporter.prepareReportData({ forward: [], backward: [], orphaned: {}, completeness: {} });
      const html = reporter.generateHTML(data);
      
      const filePath = await reporter.saveReport(html, 'test-report', ReportFormat.HTML);

      expect(filePath).toContain('test-report.html');
      const exists = await fs.pathExists(filePath);
      expect(exists).toBe(true);

      // Cleanup
      await fs.remove(path.dirname(filePath));
    });

    it('should save Markdown report with .md extension', async () => {
      const data = reporter.prepareReportData({ forward: [], backward: [], orphaned: {}, completeness: {} });
      const md = reporter.generateMarkdown(data);

      const filePath = await reporter.saveReport(md, 'test-report', ReportFormat.MARKDOWN);

      expect(filePath).toContain('test-report.md');

      // Cleanup
      await fs.remove(path.dirname(filePath));
    });

    it('should save JSON report with .json extension', async () => {
      const data = reporter.prepareReportData({ forward: [], backward: [], orphaned: {}, completeness: {} });
      const json = reporter.generateJSON(data);

      const filePath = await reporter.saveReport(json, 'test-report', ReportFormat.JSON);

      expect(filePath).toContain('test-report.json');

      // Cleanup
      await fs.remove(path.dirname(filePath));
    });
  });
});

describe('ReportFormat', () => {
  it('should have all expected formats', () => {
    expect(ReportFormat.HTML).toBe('html');
    expect(ReportFormat.MARKDOWN).toBe('markdown');
    expect(ReportFormat.JSON).toBe('json');
  });
});
