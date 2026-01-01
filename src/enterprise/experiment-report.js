/**
 * Experiment Report Generator
 * 
 * Automatically generates experiment reports from test results.
 * 
 * Requirement: IMP-6.2-006-01
 * 
 * @module enterprise/experiment-report
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Report format enum
 */
const REPORT_FORMAT = {
  MARKDOWN: 'markdown',
  HTML: 'html',
  JSON: 'json'
};

/**
 * Test status enum
 */
const TEST_STATUS = {
  PASSED: 'passed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  PENDING: 'pending'
};

/**
 * Experiment Report Generator
 */
class ExperimentReportGenerator {
  /**
   * Create a new ExperimentReportGenerator
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      outputDir: config.outputDir || 'reports/experiments',
      format: config.format || REPORT_FORMAT.MARKDOWN,
      includeMetrics: config.includeMetrics !== false,
      includeObservations: config.includeObservations !== false,
      includeCodeSnippets: config.includeCodeSnippets !== false,
      ...config
    };
  }

  /**
   * Generate experiment report from test results
   * @param {Object} testResults - Jest or compatible test results
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated report info
   */
  async generateFromTestResults(testResults, options = {}) {
    const reportData = this.parseTestResults(testResults);
    const metrics = options.metrics || this.calculateMetrics(testResults);
    const observations = options.observations || [];

    const report = {
      metadata: {
        title: options.title || 'Experiment Report',
        version: options.version || '1.0.0',
        generatedAt: new Date().toISOString(),
        author: options.author || 'MUSUBI SDD',
        environment: this.getEnvironment()
      },
      summary: reportData.summary,
      testResults: reportData.tests,
      metrics,
      observations,
      conclusions: options.conclusions || []
    };

    const formatted = this.formatReport(report, options.format || this.config.format);
    const filePath = await this.saveReport(formatted, report.metadata, options.format || this.config.format);

    return {
      report,
      formatted,
      filePath,
      format: options.format || this.config.format
    };
  }

  /**
   * Parse test results into report data
   * @param {Object} testResults - Raw test results
   * @returns {Object} Parsed data
   */
  parseTestResults(testResults) {
    const tests = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let pending = 0;

    // Handle Jest format
    if (testResults.testResults) {
      for (const suite of testResults.testResults) {
        for (const test of suite.assertionResults || []) {
          const status = this.mapTestStatus(test.status);
          tests.push({
            name: test.title || test.fullName,
            suite: suite.name || path.basename(suite.testFilePath || ''),
            status,
            duration: test.duration || 0,
            failureMessages: test.failureMessages || []
          });

          if (status === TEST_STATUS.PASSED) passed++;
          else if (status === TEST_STATUS.FAILED) failed++;
          else if (status === TEST_STATUS.SKIPPED) skipped++;
          else if (status === TEST_STATUS.PENDING) pending++;
        }
      }
    }

    // Handle simple array format
    if (Array.isArray(testResults.tests)) {
      for (const test of testResults.tests) {
        const status = this.mapTestStatus(test.status);
        tests.push({
          name: test.name || test.title,
          suite: test.suite || 'Default',
          status,
          duration: test.duration || 0,
          failureMessages: test.errors || []
        });

        if (status === TEST_STATUS.PASSED) passed++;
        else if (status === TEST_STATUS.FAILED) failed++;
        else if (status === TEST_STATUS.SKIPPED) skipped++;
        else if (status === TEST_STATUS.PENDING) pending++;
      }
    }

    // Use provided summary or calculate
    const summary = testResults.summary || {
      total: tests.length,
      passed,
      failed,
      skipped,
      pending,
      passRate: tests.length > 0 ? ((passed / tests.length) * 100).toFixed(2) + '%' : '0%',
      duration: testResults.duration || tests.reduce((sum, t) => sum + t.duration, 0)
    };

    return { tests, summary };
  }

  /**
   * Map test status to standard enum
   * @param {string} status - Raw status
   * @returns {string} Mapped status
   */
  mapTestStatus(status) {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'passed' || statusLower === 'pass') return TEST_STATUS.PASSED;
    if (statusLower === 'failed' || statusLower === 'fail') return TEST_STATUS.FAILED;
    if (statusLower === 'skipped' || statusLower === 'skip') return TEST_STATUS.SKIPPED;
    if (statusLower === 'pending' || statusLower === 'todo') return TEST_STATUS.PENDING;
    return TEST_STATUS.PENDING;
  }

  /**
   * Calculate metrics from test results
   * @param {Object} testResults - Test results
   * @returns {Object} Calculated metrics
   */
  calculateMetrics(testResults) {
    const metrics = {
      performance: {},
      coverage: {},
      quality: {}
    };

    // Performance metrics
    if (testResults.duration) {
      metrics.performance.totalDuration = testResults.duration;
    }

    if (testResults.testResults) {
      const durations = testResults.testResults
        .flatMap(s => s.assertionResults || [])
        .map(t => t.duration || 0)
        .filter(d => d > 0);

      if (durations.length > 0) {
        metrics.performance.avgTestDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2);
        metrics.performance.maxTestDuration = Math.max(...durations);
        metrics.performance.minTestDuration = Math.min(...durations);
      }
    }

    // Coverage metrics (if available)
    if (testResults.coverageMap || testResults.coverage) {
      const coverage = testResults.coverageMap || testResults.coverage;
      metrics.coverage = {
        lines: coverage.lines || coverage.line || 'N/A',
        branches: coverage.branches || coverage.branch || 'N/A',
        functions: coverage.functions || coverage.function || 'N/A',
        statements: coverage.statements || coverage.statement || 'N/A'
      };
    }

    // Quality metrics
    const summary = this.parseTestResults(testResults).summary;
    metrics.quality.passRate = summary.passRate;
    metrics.quality.failureRate = summary.total > 0 
      ? ((summary.failed / summary.total) * 100).toFixed(2) + '%' 
      : '0%';

    return metrics;
  }

  /**
   * Get environment information
   * @returns {Object} Environment info
   */
  getEnvironment() {
    return {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd()
    };
  }

  /**
   * Format report based on format type
   * @param {Object} report - Report data
   * @param {string} format - Output format
   * @returns {string} Formatted report
   */
  formatReport(report, format) {
    switch (format) {
      case REPORT_FORMAT.MARKDOWN:
        return this.formatMarkdown(report);
      case REPORT_FORMAT.HTML:
        return this.formatHTML(report);
      case REPORT_FORMAT.JSON:
        return JSON.stringify(report, null, 2);
      default:
        return this.formatMarkdown(report);
    }
  }

  /**
   * Format report as Markdown
   * @param {Object} report - Report data
   * @returns {string} Markdown content
   */
  formatMarkdown(report) {
    const lines = [];
    const { metadata, summary, testResults, metrics, observations, conclusions } = report;

    // Header
    lines.push(`# ${metadata.title}`);
    lines.push('');
    lines.push(`**Version**: ${metadata.version}`);
    lines.push(`**Generated**: ${metadata.generatedAt}`);
    lines.push(`**Author**: ${metadata.author}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Tests | ${summary.total} |`);
    lines.push(`| Passed | ${summary.passed} ✅ |`);
    lines.push(`| Failed | ${summary.failed} ❌ |`);
    lines.push(`| Skipped | ${summary.skipped} ⏭️ |`);
    lines.push(`| Pass Rate | ${summary.passRate} |`);
    lines.push(`| Duration | ${this.formatDuration(summary.duration)} |`);
    lines.push('');

    // Test Results
    if (this.config.includeCodeSnippets && testResults.length > 0) {
      lines.push('## Test Results');
      lines.push('');

      // Group by suite
      const suites = {};
      for (const test of testResults) {
        if (!suites[test.suite]) suites[test.suite] = [];
        suites[test.suite].push(test);
      }

      for (const [suiteName, tests] of Object.entries(suites)) {
        lines.push(`### ${suiteName}`);
        lines.push('');
        lines.push('| Test | Status | Duration |');
        lines.push('|------|--------|----------|');
        for (const test of tests) {
          const statusIcon = this.getStatusIcon(test.status);
          lines.push(`| ${test.name} | ${statusIcon} ${test.status} | ${test.duration}ms |`);
        }
        lines.push('');

        // Show failures
        const failures = tests.filter(t => t.status === TEST_STATUS.FAILED);
        if (failures.length > 0) {
          lines.push('#### Failures');
          lines.push('');
          for (const failure of failures) {
            lines.push(`**${failure.name}**`);
            lines.push('```');
            lines.push(failure.failureMessages.join('\n'));
            lines.push('```');
            lines.push('');
          }
        }
      }
    }

    // Metrics
    if (this.config.includeMetrics && metrics) {
      lines.push('## Metrics');
      lines.push('');

      if (metrics.performance && Object.keys(metrics.performance).length > 0) {
        lines.push('### Performance');
        lines.push('');
        lines.push('| Metric | Value |');
        lines.push('|--------|-------|');
        for (const [key, value] of Object.entries(metrics.performance)) {
          lines.push(`| ${this.formatMetricName(key)} | ${value}ms |`);
        }
        lines.push('');
      }

      if (metrics.coverage && Object.keys(metrics.coverage).length > 0) {
        lines.push('### Coverage');
        lines.push('');
        lines.push('| Type | Coverage |');
        lines.push('|------|----------|');
        for (const [key, value] of Object.entries(metrics.coverage)) {
          lines.push(`| ${this.formatMetricName(key)} | ${value} |`);
        }
        lines.push('');
      }

      if (metrics.quality && Object.keys(metrics.quality).length > 0) {
        lines.push('### Quality');
        lines.push('');
        lines.push('| Metric | Value |');
        lines.push('|--------|-------|');
        for (const [key, value] of Object.entries(metrics.quality)) {
          lines.push(`| ${this.formatMetricName(key)} | ${value} |`);
        }
        lines.push('');
      }
    }

    // Observations
    if (this.config.includeObservations && observations.length > 0) {
      lines.push('## Observations');
      lines.push('');
      for (const obs of observations) {
        lines.push(`- ${obs}`);
      }
      lines.push('');
    }

    // Conclusions
    if (conclusions.length > 0) {
      lines.push('## Conclusions');
      lines.push('');
      for (const conclusion of conclusions) {
        lines.push(`- ${conclusion}`);
      }
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push(`*Generated by MUSUBI SDD Experiment Report Generator*`);

    return lines.join('\n');
  }

  /**
   * Format report as HTML
   * @param {Object} report - Report data
   * @returns {string} HTML content
   */
  formatHTML(report) {
    const { metadata, summary, testResults, observations, conclusions } = report;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .passed { color: green; }
    .failed { color: red; }
    .skipped { color: orange; }
    .meta { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>${metadata.title}</h1>
  <p class="meta">
    <strong>Version:</strong> ${metadata.version} |
    <strong>Generated:</strong> ${metadata.generatedAt} |
    <strong>Author:</strong> ${metadata.author}
  </p>
  
  <h2>Summary</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total Tests</td><td>${summary.total}</td></tr>
    <tr><td>Passed</td><td class="passed">${summary.passed}</td></tr>
    <tr><td>Failed</td><td class="failed">${summary.failed}</td></tr>
    <tr><td>Skipped</td><td class="skipped">${summary.skipped}</td></tr>
    <tr><td>Pass Rate</td><td>${summary.passRate}</td></tr>
    <tr><td>Duration</td><td>${this.formatDuration(summary.duration)}</td></tr>
  </table>

  ${testResults.length > 0 ? `
  <h2>Test Results</h2>
  <table>
    <tr><th>Suite</th><th>Test</th><th>Status</th><th>Duration</th></tr>
    ${testResults.map(t => `
    <tr>
      <td>${t.suite}</td>
      <td>${t.name}</td>
      <td class="${t.status}">${t.status}</td>
      <td>${t.duration}ms</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${observations.length > 0 ? `
  <h2>Observations</h2>
  <ul>
    ${observations.map(o => `<li>${o}</li>`).join('')}
  </ul>
  ` : ''}

  ${conclusions.length > 0 ? `
  <h2>Conclusions</h2>
  <ul>
    ${conclusions.map(c => `<li>${c}</li>`).join('')}
  </ul>
  ` : ''}

  <hr>
  <p class="meta"><em>Generated by MUSUBI SDD Experiment Report Generator</em></p>
</body>
</html>`;
  }

  /**
   * Save report to file
   * @param {string} content - Formatted content
   * @param {Object} metadata - Report metadata
   * @param {string} format - Output format
   * @returns {Promise<string>} File path
   */
  async saveReport(content, metadata, format) {
    await this.ensureOutputDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === REPORT_FORMAT.HTML ? 'html' : 
                      format === REPORT_FORMAT.JSON ? 'json' : 'md';
    const fileName = `experiment-${timestamp}.${extension}`;
    const filePath = path.join(this.config.outputDir, fileName);

    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Ensure output directory exists
   * @returns {Promise<void>}
   */
  async ensureOutputDir() {
    await fs.mkdir(this.config.outputDir, { recursive: true });
  }

  /**
   * Get status icon
   * @param {string} status - Test status
   * @returns {string} Icon
   */
  getStatusIcon(status) {
    switch (status) {
      case TEST_STATUS.PASSED: return '✅';
      case TEST_STATUS.FAILED: return '❌';
      case TEST_STATUS.SKIPPED: return '⏭️';
      case TEST_STATUS.PENDING: return '⏳';
      default: return '❓';
    }
  }

  /**
   * Format duration
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(ms) {
    if (!ms || ms < 0) return '0ms';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }

  /**
   * Format metric name
   * @param {string} name - camelCase name
   * @returns {string} Formatted name
   */
  formatMetricName(name) {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Add observation to report
   * @param {Object} report - Report object
   * @param {string} observation - Observation text
   */
  addObservation(report, observation) {
    if (!report.observations) report.observations = [];
    report.observations.push(observation);
  }

  /**
   * Add conclusion to report
   * @param {Object} report - Report object
   * @param {string} conclusion - Conclusion text
   */
  addConclusion(report, conclusion) {
    if (!report.conclusions) report.conclusions = [];
    report.conclusions.push(conclusion);
  }
}

/**
 * Create a new ExperimentReportGenerator instance
 * @param {Object} config - Configuration options
 * @returns {ExperimentReportGenerator}
 */
function createExperimentReportGenerator(config = {}) {
  return new ExperimentReportGenerator(config);
}

module.exports = {
  ExperimentReportGenerator,
  createExperimentReportGenerator,
  REPORT_FORMAT,
  TEST_STATUS
};
