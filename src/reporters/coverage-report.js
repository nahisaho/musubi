/**
 * MUSUBI Coverage Reporter
 *
 * Generates traceability coverage reports in various formats
 * Supports HTML, JSON, Markdown, and text output
 */

const fs = require('fs-extra');
const path = require('path');
const TraceabilityAnalyzer = require('../analyzers/traceability.js');

/**
 * Report format types
 */
const ReportFormat = {
  TEXT: 'text',
  JSON: 'json',
  MARKDOWN: 'markdown',
  HTML: 'html',
};

/**
 * CoverageReporter - Generate coverage reports
 */
class CoverageReporter {
  constructor(workspaceRoot, options = {}) {
    this.workspaceRoot = workspaceRoot;
    this.options = {
      format: ReportFormat.MARKDOWN,
      includeDetails: true,
      includeGaps: true,
      colorOutput: true,
      ...options,
    };
    this.analyzer = new TraceabilityAnalyzer(workspaceRoot);
  }

  /**
   * Generate coverage report
   */
  async generate(paths = {}) {
    const coverage = await this.analyzer.calculateCoverage(paths);
    const gaps = this.options.includeGaps ? await this.analyzer.detectGaps(paths) : null;
    const matrix = this.options.includeDetails ? await this.analyzer.generateMatrix(paths) : null;

    const reportData = {
      timestamp: new Date().toISOString(),
      coverage,
      gaps,
      matrix: matrix ? matrix.matrix : null,
      summary: matrix ? matrix.summary : null,
    };

    switch (this.options.format) {
      case ReportFormat.JSON:
        return this.formatJSON(reportData);
      case ReportFormat.HTML:
        return this.formatHTML(reportData);
      case ReportFormat.TEXT:
        return this.formatText(reportData);
      case ReportFormat.MARKDOWN:
      default:
        return this.formatMarkdown(reportData);
    }
  }

  /**
   * Format as JSON
   */
  formatJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Format as text
   */
  formatText(data) {
    const lines = [];
    const { coverage, gaps } = data;

    lines.push('='.repeat(50));
    lines.push('TRACEABILITY COVERAGE REPORT');
    lines.push('='.repeat(50));
    lines.push('');
    lines.push(`Generated: ${data.timestamp}`);
    lines.push('');

    // Coverage summary
    lines.push('COVERAGE SUMMARY');
    lines.push('-'.repeat(30));
    lines.push(`Total Requirements: ${coverage.totalRequirements}`);
    lines.push('');
    lines.push(`Design Coverage:  ${this.formatBar(coverage.designCoverage)}  ${coverage.designCoverage}%`);
    lines.push(`Tasks Coverage:   ${this.formatBar(coverage.tasksCoverage)}  ${coverage.tasksCoverage}%`);
    lines.push(`Code Coverage:    ${this.formatBar(coverage.codeCoverage)}  ${coverage.codeCoverage}%`);
    lines.push(`Test Coverage:    ${this.formatBar(coverage.testsCoverage)}  ${coverage.testsCoverage}%`);
    lines.push('-'.repeat(30));
    lines.push(`OVERALL:          ${this.formatBar(coverage.overall)}  ${coverage.overall}%`);
    lines.push('');

    // Statistics
    lines.push('STATISTICS');
    lines.push('-'.repeat(30));
    lines.push(`With Design:    ${coverage.withDesign}/${coverage.totalRequirements}`);
    lines.push(`With Tasks:     ${coverage.withTasks}/${coverage.totalRequirements}`);
    lines.push(`With Code:      ${coverage.withCode}/${coverage.totalRequirements}`);
    lines.push(`With Tests:     ${coverage.withTests}/${coverage.totalRequirements}`);
    lines.push('');

    // Gaps
    if (gaps) {
      lines.push('GAPS DETECTED');
      lines.push('-'.repeat(30));
      lines.push(`Orphaned Requirements: ${gaps.orphanedRequirements.length}`);
      lines.push(`Orphaned Design:       ${gaps.orphanedDesign.length}`);
      lines.push(`Orphaned Tasks:        ${gaps.orphanedTasks.length}`);
      lines.push(`Untested Code:         ${gaps.untestedCode.length}`);
      lines.push(`Missing Tests:         ${gaps.missingTests.length}`);
    }

    lines.push('');
    lines.push('='.repeat(50));

    return lines.join('\n');
  }

  /**
   * Format as Markdown
   */
  formatMarkdown(data) {
    const lines = [];
    const { coverage, gaps, matrix: _matrix } = data;

    lines.push('# Traceability Coverage Report');
    lines.push('');
    lines.push(`**Generated**: ${data.timestamp}`);
    lines.push('');

    // Overall status
    const status = coverage.overall >= 80 ? '✅ Good' : coverage.overall >= 60 ? '⚠️ Needs Improvement' : '❌ Critical';
    lines.push(`## Overall Status: ${status}`);
    lines.push('');

    // Coverage table
    lines.push('## Coverage Summary');
    lines.push('');
    lines.push('| Category | Covered | Total | Coverage |');
    lines.push('|----------|---------|-------|----------|');
    lines.push(`| Design | ${coverage.withDesign} | ${coverage.totalRequirements} | ${this.formatProgressBar(coverage.designCoverage)} ${coverage.designCoverage}% |`);
    lines.push(`| Tasks | ${coverage.withTasks} | ${coverage.totalRequirements} | ${this.formatProgressBar(coverage.tasksCoverage)} ${coverage.tasksCoverage}% |`);
    lines.push(`| Code | ${coverage.withCode} | ${coverage.totalRequirements} | ${this.formatProgressBar(coverage.codeCoverage)} ${coverage.codeCoverage}% |`);
    lines.push(`| Tests | ${coverage.withTests} | ${coverage.totalRequirements} | ${this.formatProgressBar(coverage.testsCoverage)} ${coverage.testsCoverage}% |`);
    lines.push(`| **Overall** | - | - | ${this.formatProgressBar(coverage.overall)} **${coverage.overall}%** |`);
    lines.push('');

    // Gaps
    if (gaps) {
      lines.push('## Gaps Analysis');
      lines.push('');
      
      const totalGaps = gaps.orphanedRequirements.length + gaps.orphanedDesign.length + 
                        gaps.orphanedTasks.length + gaps.untestedCode.length + 
                        gaps.missingTests.length;
      
      lines.push(`**Total Gaps Found**: ${totalGaps}`);
      lines.push('');

      lines.push('| Gap Type | Count | Status |');
      lines.push('|----------|-------|--------|');
      lines.push(`| Orphaned Requirements | ${gaps.orphanedRequirements.length} | ${gaps.orphanedRequirements.length === 0 ? '✅' : '⚠️'} |`);
      lines.push(`| Orphaned Design | ${gaps.orphanedDesign.length} | ${gaps.orphanedDesign.length === 0 ? '✅' : '⚠️'} |`);
      lines.push(`| Orphaned Tasks | ${gaps.orphanedTasks.length} | ${gaps.orphanedTasks.length === 0 ? '✅' : '⚠️'} |`);
      lines.push(`| Untested Code | ${gaps.untestedCode.length} | ${gaps.untestedCode.length === 0 ? '✅' : '⚠️'} |`);
      lines.push(`| Missing Tests | ${gaps.missingTests.length} | ${gaps.missingTests.length === 0 ? '✅' : '❌'} |`);
      lines.push('');

      // Show details for each gap type
      if (gaps.orphanedRequirements.length > 0) {
        lines.push('### Orphaned Requirements');
        lines.push('');
        lines.push('Requirements not linked to design or tasks:');
        lines.push('');
        gaps.orphanedRequirements.slice(0, 10).forEach(r => {
          lines.push(`- \`${r.id || r.file}\``);
        });
        if (gaps.orphanedRequirements.length > 10) {
          lines.push(`- *...and ${gaps.orphanedRequirements.length - 10} more*`);
        }
        lines.push('');
      }

      if (gaps.missingTests.length > 0) {
        lines.push('### Requirements Missing Tests');
        lines.push('');
        gaps.missingTests.slice(0, 10).forEach(r => {
          lines.push(`- \`${r.id || r.file}\``);
        });
        if (gaps.missingTests.length > 10) {
          lines.push(`- *...and ${gaps.missingTests.length - 10} more*`);
        }
        lines.push('');
      }

      if (gaps.untestedCode.length > 0) {
        lines.push('### Untested Code');
        lines.push('');
        gaps.untestedCode.slice(0, 10).forEach(c => {
          lines.push(`- \`${c.file || c}\``);
        });
        if (gaps.untestedCode.length > 10) {
          lines.push(`- *...and ${gaps.untestedCode.length - 10} more*`);
        }
        lines.push('');
      }
    }

    // Recommendations
    lines.push('## Recommendations');
    lines.push('');
    
    if (coverage.overall < 100) {
      if (coverage.testsCoverage < 80) {
        lines.push('1. 🧪 **Increase test coverage**: Add tests for requirements that are missing test links');
      }
      if (coverage.designCoverage < 80) {
        lines.push('2. 📐 **Complete design documentation**: Link requirements to design documents');
      }
      if (coverage.codeCoverage < 80) {
        lines.push('3. 💻 **Link code to requirements**: Add requirement references in code comments');
      }
      if (gaps && gaps.orphanedRequirements.length > 0) {
        lines.push('4. 🔗 **Address orphaned requirements**: Link them to design, tasks, or remove if obsolete');
      }
    } else {
      lines.push('✅ Excellent! Full traceability coverage achieved.');
    }

    return lines.join('\n');
  }

  /**
   * Format as HTML
   */
  formatHTML(data) {
    const { coverage, gaps } = data;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Traceability Coverage Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; }
    h2 { color: #555; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    .status { font-size: 1.5em; padding: 10px; border-radius: 4px; display: inline-block; }
    .status.good { background: #d4edda; color: #155724; }
    .status.warning { background: #fff3cd; color: #856404; }
    .status.critical { background: #f8d7da; color: #721c24; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    .progress { background: #e9ecef; border-radius: 4px; height: 20px; overflow: hidden; }
    .progress-bar { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .progress-bar.high { background: #28a745; }
    .progress-bar.medium { background: #ffc107; }
    .progress-bar.low { background: #dc3545; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; }
    .badge.success { background: #d4edda; color: #155724; }
    .badge.warning { background: #fff3cd; color: #856404; }
    .badge.danger { background: #f8d7da; color: #721c24; }
    .timestamp { color: #6c757d; font-size: 0.9em; }
    ul { padding-left: 20px; }
    li { margin: 5px 0; }
    code { background: #f8f9fa; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <h1>📊 Traceability Coverage Report</h1>
  <p class="timestamp">Generated: ${data.timestamp}</p>

  <div class="card">
    <h2>Overall Status</h2>
    <div class="status ${coverage.overall >= 80 ? 'good' : coverage.overall >= 60 ? 'warning' : 'critical'}">
      ${coverage.overall >= 80 ? '✅ Good' : coverage.overall >= 60 ? '⚠️ Needs Improvement' : '❌ Critical'}
      - ${coverage.overall}% Coverage
    </div>
  </div>

  <div class="card">
    <h2>Coverage Summary</h2>
    <table>
      <tr>
        <th>Category</th>
        <th>Covered</th>
        <th>Total</th>
        <th>Coverage</th>
      </tr>
      <tr>
        <td>Design</td>
        <td>${coverage.withDesign}</td>
        <td>${coverage.totalRequirements}</td>
        <td>
          <div class="progress">
            <div class="progress-bar ${coverage.designCoverage >= 80 ? 'high' : coverage.designCoverage >= 60 ? 'medium' : 'low'}" 
                 style="width: ${coverage.designCoverage}%"></div>
          </div>
          ${coverage.designCoverage}%
        </td>
      </tr>
      <tr>
        <td>Tasks</td>
        <td>${coverage.withTasks}</td>
        <td>${coverage.totalRequirements}</td>
        <td>
          <div class="progress">
            <div class="progress-bar ${coverage.tasksCoverage >= 80 ? 'high' : coverage.tasksCoverage >= 60 ? 'medium' : 'low'}" 
                 style="width: ${coverage.tasksCoverage}%"></div>
          </div>
          ${coverage.tasksCoverage}%
        </td>
      </tr>
      <tr>
        <td>Code</td>
        <td>${coverage.withCode}</td>
        <td>${coverage.totalRequirements}</td>
        <td>
          <div class="progress">
            <div class="progress-bar ${coverage.codeCoverage >= 80 ? 'high' : coverage.codeCoverage >= 60 ? 'medium' : 'low'}" 
                 style="width: ${coverage.codeCoverage}%"></div>
          </div>
          ${coverage.codeCoverage}%
        </td>
      </tr>
      <tr>
        <td>Tests</td>
        <td>${coverage.withTests}</td>
        <td>${coverage.totalRequirements}</td>
        <td>
          <div class="progress">
            <div class="progress-bar ${coverage.testsCoverage >= 80 ? 'high' : coverage.testsCoverage >= 60 ? 'medium' : 'low'}" 
                 style="width: ${coverage.testsCoverage}%"></div>
          </div>
          ${coverage.testsCoverage}%
        </td>
      </tr>
      <tr style="font-weight: bold;">
        <td>Overall</td>
        <td colspan="2">-</td>
        <td>
          <div class="progress">
            <div class="progress-bar ${coverage.overall >= 80 ? 'high' : coverage.overall >= 60 ? 'medium' : 'low'}" 
                 style="width: ${coverage.overall}%"></div>
          </div>
          ${coverage.overall}%
        </td>
      </tr>
    </table>
  </div>

  ${gaps ? `
  <div class="card">
    <h2>Gaps Analysis</h2>
    <table>
      <tr>
        <th>Gap Type</th>
        <th>Count</th>
        <th>Status</th>
      </tr>
      <tr>
        <td>Orphaned Requirements</td>
        <td>${gaps.orphanedRequirements.length}</td>
        <td><span class="badge ${gaps.orphanedRequirements.length === 0 ? 'success' : 'warning'}">${gaps.orphanedRequirements.length === 0 ? '✅ OK' : '⚠️ Needs Attention'}</span></td>
      </tr>
      <tr>
        <td>Orphaned Design</td>
        <td>${gaps.orphanedDesign.length}</td>
        <td><span class="badge ${gaps.orphanedDesign.length === 0 ? 'success' : 'warning'}">${gaps.orphanedDesign.length === 0 ? '✅ OK' : '⚠️ Needs Attention'}</span></td>
      </tr>
      <tr>
        <td>Orphaned Tasks</td>
        <td>${gaps.orphanedTasks.length}</td>
        <td><span class="badge ${gaps.orphanedTasks.length === 0 ? 'success' : 'warning'}">${gaps.orphanedTasks.length === 0 ? '✅ OK' : '⚠️ Needs Attention'}</span></td>
      </tr>
      <tr>
        <td>Untested Code</td>
        <td>${gaps.untestedCode.length}</td>
        <td><span class="badge ${gaps.untestedCode.length === 0 ? 'success' : 'warning'}">${gaps.untestedCode.length === 0 ? '✅ OK' : '⚠️ Needs Attention'}</span></td>
      </tr>
      <tr>
        <td>Missing Tests</td>
        <td>${gaps.missingTests.length}</td>
        <td><span class="badge ${gaps.missingTests.length === 0 ? 'success' : 'danger'}">${gaps.missingTests.length === 0 ? '✅ OK' : '❌ Critical'}</span></td>
      </tr>
    </table>
  </div>
  ` : ''}

  <div class="card">
    <h2>Recommendations</h2>
    <ul>
      ${coverage.overall < 100 ? `
        ${coverage.testsCoverage < 80 ? '<li>🧪 <strong>Increase test coverage</strong>: Add tests for requirements that are missing test links</li>' : ''}
        ${coverage.designCoverage < 80 ? '<li>📐 <strong>Complete design documentation</strong>: Link requirements to design documents</li>' : ''}
        ${coverage.codeCoverage < 80 ? '<li>💻 <strong>Link code to requirements</strong>: Add requirement references in code comments</li>' : ''}
        ${gaps && gaps.orphanedRequirements.length > 0 ? '<li>🔗 <strong>Address orphaned requirements</strong>: Link them to design, tasks, or remove if obsolete</li>' : ''}
      ` : '<li>✅ Excellent! Full traceability coverage achieved.</li>'}
    </ul>
  </div>

  <footer style="text-align: center; color: #6c757d; margin-top: 40px;">
    <p>Generated by MUSUBI SDD Framework</p>
  </footer>
</body>
</html>`;
  }

  /**
   * Format text progress bar
   */
  formatBar(percentage, width = 20) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }

  /**
   * Format emoji progress bar for markdown
   */
  formatProgressBar(percentage) {
    if (percentage >= 80) return '🟢';
    if (percentage >= 60) return '🟡';
    return '🔴';
  }

  /**
   * Save report to file
   */
  async saveReport(outputPath, paths = {}) {
    const report = await this.generate(paths);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, report, 'utf-8');
    return outputPath;
  }
}

module.exports = {
  CoverageReporter,
  ReportFormat,
};
