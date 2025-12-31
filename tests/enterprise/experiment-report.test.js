/**
 * Experiment Report Generator Tests
 * 
 * Requirement: IMP-6.2-006-01
 */

const { 
  ExperimentReportGenerator, 
  createExperimentReportGenerator,
  REPORT_FORMAT,
  TEST_STATUS
} = require('../../src/enterprise/experiment-report');
const fs = require('fs').promises;
const path = require('path');

describe('ExperimentReportGenerator', () => {
  let generator;
  const testDir = 'test-experiment-report-temp';

  beforeEach(async () => {
    generator = new ExperimentReportGenerator({ outputDir: testDir });
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('constructor', () => {
    it('should create generator with default config', () => {
      const g = new ExperimentReportGenerator();
      expect(g.config.format).toBe(REPORT_FORMAT.MARKDOWN);
      expect(g.config.includeMetrics).toBe(true);
    });

    it('should merge custom config', () => {
      const g = new ExperimentReportGenerator({ format: REPORT_FORMAT.JSON });
      expect(g.config.format).toBe(REPORT_FORMAT.JSON);
    });
  });

  describe('REPORT_FORMAT', () => {
    it('should define all formats', () => {
      expect(REPORT_FORMAT.MARKDOWN).toBe('markdown');
      expect(REPORT_FORMAT.HTML).toBe('html');
      expect(REPORT_FORMAT.JSON).toBe('json');
    });
  });

  describe('TEST_STATUS', () => {
    it('should define all statuses', () => {
      expect(TEST_STATUS.PASSED).toBe('passed');
      expect(TEST_STATUS.FAILED).toBe('failed');
      expect(TEST_STATUS.SKIPPED).toBe('skipped');
      expect(TEST_STATUS.PENDING).toBe('pending');
    });
  });

  describe('parseTestResults', () => {
    it('should parse Jest format', () => {
      const testResults = {
        testResults: [{
          name: 'Test Suite',
          assertionResults: [
            { title: 'test 1', status: 'passed', duration: 10 },
            { title: 'test 2', status: 'failed', duration: 20, failureMessages: ['Error'] }
          ]
        }]
      };

      const result = generator.parseTestResults(testResults);

      expect(result.tests.length).toBe(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.passed).toBe(1);
      expect(result.summary.failed).toBe(1);
    });

    it('should parse simple array format', () => {
      const testResults = {
        tests: [
          { name: 'test 1', status: 'passed', duration: 10 },
          { name: 'test 2', status: 'skipped', duration: 0 }
        ]
      };

      const result = generator.parseTestResults(testResults);

      expect(result.tests.length).toBe(2);
      expect(result.summary.skipped).toBe(1);
    });
  });

  describe('mapTestStatus', () => {
    it('should map various status values', () => {
      expect(generator.mapTestStatus('passed')).toBe(TEST_STATUS.PASSED);
      expect(generator.mapTestStatus('PASS')).toBe(TEST_STATUS.PASSED);
      expect(generator.mapTestStatus('failed')).toBe(TEST_STATUS.FAILED);
      expect(generator.mapTestStatus('skip')).toBe(TEST_STATUS.SKIPPED);
      expect(generator.mapTestStatus('todo')).toBe(TEST_STATUS.PENDING);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate performance metrics', () => {
      const testResults = {
        duration: 1000,
        testResults: [{
          assertionResults: [
            { duration: 100 },
            { duration: 200 },
            { duration: 300 }
          ]
        }]
      };

      const metrics = generator.calculateMetrics(testResults);

      expect(metrics.performance.totalDuration).toBe(1000);
      expect(parseFloat(metrics.performance.avgTestDuration)).toBeCloseTo(200);
    });

    it('should extract coverage if available', () => {
      const testResults = {
        coverage: { lines: '80%', branches: '75%' },
        tests: []
      };

      const metrics = generator.calculateMetrics(testResults);

      expect(metrics.coverage.lines).toBe('80%');
    });
  });

  describe('generateFromTestResults', () => {
    it('should generate complete report', async () => {
      const testResults = {
        tests: [{ name: 'test', status: 'passed', duration: 10 }]
      };

      const result = await generator.generateFromTestResults(testResults, {
        title: 'Test Report'
      });

      expect(result.report).toBeDefined();
      expect(result.formatted).toContain('Test Report');
      expect(result.filePath).toContain('.md');
    });

    it('should use specified format', async () => {
      const testResults = {
        tests: [{ name: 'test', status: 'passed' }]
      };

      const result = await generator.generateFromTestResults(testResults, {
        format: REPORT_FORMAT.JSON
      });

      expect(result.format).toBe(REPORT_FORMAT.JSON);
      const parsed = JSON.parse(result.formatted);
      expect(parsed.metadata).toBeDefined();
    });
  });

  describe('formatMarkdown', () => {
    it('should generate markdown report', () => {
      const report = {
        metadata: { title: 'Test', version: '1.0.0', generatedAt: new Date().toISOString(), author: 'Test' },
        summary: { total: 10, passed: 8, failed: 2, skipped: 0, passRate: '80%', duration: 1000 },
        testResults: [],
        metrics: {},
        observations: [],
        conclusions: []
      };

      const md = generator.formatMarkdown(report);

      expect(md).toContain('# Test');
      expect(md).toContain('Total Tests | 10');
      expect(md).toContain('Pass Rate | 80%');
    });

    it('should include observations', () => {
      const report = {
        metadata: { title: 'Test', version: '1.0.0', generatedAt: new Date().toISOString(), author: 'Test' },
        summary: { total: 1, passed: 1, failed: 0, skipped: 0, passRate: '100%', duration: 100 },
        testResults: [],
        metrics: {},
        observations: ['First observation', 'Second observation'],
        conclusions: []
      };

      const md = generator.formatMarkdown(report);

      expect(md).toContain('## Observations');
      expect(md).toContain('First observation');
    });
  });

  describe('formatHTML', () => {
    it('should generate HTML report', () => {
      const report = {
        metadata: { title: 'HTML Test', version: '1.0.0', generatedAt: new Date().toISOString(), author: 'Test' },
        summary: { total: 5, passed: 5, failed: 0, skipped: 0, passRate: '100%', duration: 500 },
        testResults: [{ name: 'test', suite: 'Suite', status: TEST_STATUS.PASSED, duration: 10 }],
        metrics: {},
        observations: [],
        conclusions: []
      };

      const html = generator.formatHTML(report);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>HTML Test</title>');
      expect(html).toContain('class="passed"');
    });
  });

  describe('saveReport', () => {
    it('should save report to file', async () => {
      const content = '# Test Report';
      const metadata = { title: 'Test' };

      const filePath = await generator.saveReport(content, metadata, REPORT_FORMAT.MARKDOWN);

      expect(filePath).toContain('experiment-');
      expect(filePath).toContain('.md');

      const saved = await fs.readFile(filePath, 'utf-8');
      expect(saved).toBe(content);
    });
  });

  describe('getStatusIcon', () => {
    it('should return correct icons', () => {
      expect(generator.getStatusIcon(TEST_STATUS.PASSED)).toBe('✅');
      expect(generator.getStatusIcon(TEST_STATUS.FAILED)).toBe('❌');
      expect(generator.getStatusIcon(TEST_STATUS.SKIPPED)).toBe('⏭️');
      expect(generator.getStatusIcon(TEST_STATUS.PENDING)).toBe('⏳');
    });
  });

  describe('formatDuration', () => {
    it('should format durations correctly', () => {
      expect(generator.formatDuration(100)).toBe('100ms');
      expect(generator.formatDuration(1500)).toBe('1.50s');
      expect(generator.formatDuration(90000)).toBe('1.50m');
    });

    it('should handle invalid input', () => {
      expect(generator.formatDuration(null)).toBe('0ms');
      expect(generator.formatDuration(-100)).toBe('0ms');
    });
  });

  describe('createExperimentReportGenerator', () => {
    it('should create instance', () => {
      const g = createExperimentReportGenerator();
      expect(g).toBeInstanceOf(ExperimentReportGenerator);
    });
  });
});
