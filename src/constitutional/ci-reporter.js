/**
 * CI Reporter
 * 
 * Generates CI-friendly reports for Constitutional checks.
 * 
 * Requirement: IMP-6.2-005-03
 * Design: Section 5.4
 */

const { ConstitutionalChecker, SEVERITY } = require('./checker');

/**
 * Output formats
 */
const OUTPUT_FORMAT = {
  TEXT: 'text',
  JSON: 'json',
  GITHUB: 'github',
  JUNIT: 'junit'
};

/**
 * Exit codes
 */
const EXIT_CODE = {
  SUCCESS: 0,
  WARNINGS: 0,
  FAILURES: 1,
  ERROR: 2
};

/**
 * CIReporter
 * 
 * Reports Constitutional check results for CI/CD systems.
 */
class CIReporter {
  /**
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.config = {
      format: OUTPUT_FORMAT.TEXT,
      failOnWarning: false,
      ...config
    };
    this.checker = new ConstitutionalChecker(config.checkerConfig);
  }

  /**
   * Run check and report
   * @param {Array} filePaths - Files to check
   * @param {Object} options - Options
   * @returns {Promise<Object>} Report result
   */
  async runAndReport(filePaths, options = {}) {
    const format = options.format || this.config.format;
    
    // Run checks
    const results = await this.checker.checkFiles(filePaths);
    const blockDecision = this.checker.shouldBlockMerge(results);

    // Generate report
    let report;
    switch (format) {
      case OUTPUT_FORMAT.JSON:
        report = this.formatJSON(results, blockDecision);
        break;
      case OUTPUT_FORMAT.GITHUB:
        report = this.formatGitHub(results, blockDecision);
        break;
      case OUTPUT_FORMAT.JUNIT:
        report = this.formatJUnit(results, blockDecision);
        break;
      default:
        report = this.formatText(results, blockDecision);
    }

    // Determine exit code
    const exitCode = this.determineExitCode(results, blockDecision);

    return {
      report,
      exitCode,
      summary: results.summary,
      blockDecision,
      format
    };
  }

  /**
   * Format as plain text
   * @param {Object} results - Check results
   * @param {Object} blockDecision - Block decision
   * @returns {string} Text report
   */
  formatText(results, blockDecision) {
    const lines = [];

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('         MUSUBI Constitutional Compliance Report           ');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');

    // Summary
    lines.push(`Files Checked: ${results.summary.filesChecked}`);
    lines.push(`Files Passed:  ${results.summary.filesPassed}`);
    lines.push(`Files Failed:  ${results.summary.filesFailed}`);
    lines.push(`Violations:    ${results.summary.totalViolations}`);
    lines.push('');

    // Status
    if (blockDecision.shouldBlock) {
      lines.push('❌ BLOCKED - Constitutional violations detected');
      if (blockDecision.requiresPhaseMinusOne) {
        lines.push('   Phase -1 Gate review required');
      }
    } else if (results.summary.totalViolations > 0) {
      lines.push('⚠️  PASSED WITH WARNINGS');
    } else {
      lines.push('✅ PASSED - No violations');
    }
    lines.push('');

    // Violations
    if (results.summary.totalViolations > 0) {
      lines.push('───────────────────────────────────────────────────────────');
      lines.push('Violations:');
      lines.push('───────────────────────────────────────────────────────────');

      for (const result of results.results) {
        if (result.violations.length > 0) {
          lines.push('');
          lines.push(`📁 ${result.filePath}`);
          for (const v of result.violations) {
            const icon = this.getSeverityIcon(v.severity);
            lines.push(`   ${icon} [Article ${v.article}] ${v.message}`);
            if (v.line) {
              lines.push(`      Line: ${v.line}`);
            }
          }
        }
      }
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Format as JSON
   * @param {Object} results - Check results
   * @param {Object} blockDecision - Block decision
   * @returns {string} JSON report
   */
  formatJSON(results, blockDecision) {
    return JSON.stringify({
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      summary: {
        filesChecked: results.summary.filesChecked,
        filesPassed: results.summary.filesPassed,
        filesFailed: results.summary.filesFailed,
        totalViolations: results.summary.totalViolations,
        violationsByArticle: results.summary.violationsByArticle
      },
      status: {
        blocked: blockDecision.shouldBlock,
        requiresPhaseMinusOne: blockDecision.requiresPhaseMinusOne,
        reason: blockDecision.reason
      },
      violations: results.results.flatMap(r => 
        r.violations.map(v => ({
          file: r.filePath,
          ...v
        }))
      ),
      exitCode: this.determineExitCode(results, blockDecision)
    }, null, 2);
  }

  /**
   * Format for GitHub Actions
   * @param {Object} results - Check results
   * @param {Object} blockDecision - Block decision
   * @returns {string} GitHub Actions output
   */
  formatGitHub(results, blockDecision) {
    const lines = [];

    // Summary as workflow command
    lines.push(`::group::Constitutional Compliance Summary`);
    lines.push(`Files Checked: ${results.summary.filesChecked}`);
    lines.push(`Violations: ${results.summary.totalViolations}`);
    
    if (blockDecision.shouldBlock) {
      lines.push(`Status: BLOCKED`);
    } else {
      lines.push(`Status: PASSED`);
    }
    lines.push('::endgroup::');

    // Violations as annotations
    for (const result of results.results) {
      for (const v of result.violations) {
        const command = v.severity === SEVERITY.CRITICAL || v.severity === SEVERITY.HIGH 
          ? 'error' 
          : 'warning';
        
        const line = v.line || 1;
        const file = result.filePath;
        const title = `Article ${v.article}: ${v.articleName}`;
        const message = v.message;

        lines.push(`::${command} file=${file},line=${line},title=${title}::${message}`);
      }
    }

    // Set output
    lines.push('');
    lines.push(`::set-output name=violations::${results.summary.totalViolations}`);
    lines.push(`::set-output name=blocked::${blockDecision.shouldBlock}`);
    lines.push(`::set-output name=phase_minus_one::${blockDecision.requiresPhaseMinusOne}`);

    return lines.join('\n');
  }

  /**
   * Format as JUnit XML
   * @param {Object} results - Check results
   * @param {Object} _blockDecision - Block decision (unused, for interface compatibility)
   * @returns {string} JUnit XML
   */
  formatJUnit(results, _blockDecision) {
    const lines = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(`<testsuites name="Constitutional Compliance" tests="${results.summary.filesChecked}" failures="${results.summary.filesFailed}" errors="0">`);

    for (const result of results.results) {
      const testName = result.filePath.replace(/[<>&'"]/g, '_');
      
      lines.push(`  <testsuite name="${testName}" tests="1" failures="${result.violations.length > 0 ? 1 : 0}" errors="0">`);
      lines.push(`    <testcase name="constitutional-check" classname="${testName}">`);

      if (result.violations.length > 0) {
        for (const v of result.violations) {
          const type = `Article${v.article}Violation`;
          const message = this.escapeXml(v.message);
          const details = this.escapeXml(`${v.articleName}: ${v.suggestion}`);
          
          lines.push(`      <failure type="${type}" message="${message}">`);
          lines.push(`        ${details}`);
          if (v.line) {
            lines.push(`        Line: ${v.line}`);
          }
          lines.push(`      </failure>`);
        }
      }

      lines.push(`    </testcase>`);
      lines.push(`  </testsuite>`);
    }

    lines.push('</testsuites>');

    return lines.join('\n');
  }

  /**
   * Determine exit code
   * @param {Object} results - Results
   * @param {Object} blockDecision - Block decision
   * @returns {number} Exit code
   */
  determineExitCode(results, blockDecision) {
    if (blockDecision.shouldBlock) {
      return EXIT_CODE.FAILURES;
    }
    if (this.config.failOnWarning && results.summary.totalViolations > 0) {
      return EXIT_CODE.WARNINGS;
    }
    return EXIT_CODE.SUCCESS;
  }

  /**
   * Get severity icon
   * @param {string} severity - Severity
   * @returns {string} Icon
   */
  getSeverityIcon(severity) {
    switch (severity) {
      case SEVERITY.CRITICAL:
        return '🔴';
      case SEVERITY.HIGH:
        return '🟠';
      case SEVERITY.MEDIUM:
        return '🟡';
      case SEVERITY.LOW:
        return '🟢';
      default:
        return '⚪';
    }
  }

  /**
   * Escape XML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeXml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Print to stdout
   * @param {string} report - Report string
   */
  print(report) {
    console.log(report);
  }
}

module.exports = { 
  CIReporter, 
  OUTPUT_FORMAT, 
  EXIT_CODE 
};
