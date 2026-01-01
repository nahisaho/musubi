/**
 * GapDetector Implementation
 *
 * Detects requirements without implementation or tests.
 *
 * Requirement: IMP-6.2-004-02
 * Design: Section 5.2
 */

/**
 * Severity levels for gaps
 */
const SEVERITY_MAP = {
  'no-test': 'critical',
  'no-code': 'high',
  'no-design': 'medium',
  'no-commit': 'low',
};

/**
 * Severity ordering for sorting
 */
const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Suggestions for each gap type
 */
const SUGGESTIONS = {
  'no-test':
    'この要件に対するテストを作成してください。Article III (Test-First) に従い、実装前にテストを書くことを推奨します。',
  'no-code': '要件の実装が必要です。設計ドキュメントを参照して実装を開始してください。',
  'no-design':
    '設計ドキュメントを作成してください。C4モデルに従い、コンポーネント図とADRを追加することを推奨します。',
  'no-commit':
    'この要件に関連するコミットがありません。コミットメッセージに要件IDを含めてください。',
};

/**
 * GapDetector
 *
 * Detects gaps in traceability between requirements and artifacts.
 */
class GapDetector {
  /**
   * Detect all gaps in traceability links
   * @param {Array} links - Traceability links
   * @returns {Array} Detected gaps
   */
  detectGaps(links) {
    const gaps = [];

    for (const link of links) {
      // Check for design gap
      if (link.design.length === 0) {
        gaps.push(this.createGap(link.requirementId, 'no-design'));
      }

      // Check for code gap
      if (link.code.length === 0) {
        gaps.push(this.createGap(link.requirementId, 'no-code'));
      }

      // Check for test gap
      if (link.tests.length === 0) {
        gaps.push(this.createGap(link.requirementId, 'no-test'));
      }
    }

    return gaps;
  }

  /**
   * Create a gap entry
   * @param {string} requirementId - Requirement ID
   * @param {string} gapType - Gap type
   * @returns {Object} Gap entry
   */
  createGap(requirementId, gapType) {
    return {
      requirementId,
      gapType,
      severity: SEVERITY_MAP[gapType],
      suggestion: SUGGESTIONS[gapType],
    };
  }

  /**
   * Analyze a traceability matrix for gaps
   * @param {Object} matrix - Traceability matrix
   * @returns {Object} Gap analysis
   */
  analyzeMatrix(matrix) {
    const links = Object.values(matrix.requirements);
    const gaps = this.detectGaps(links);

    return this.calculateAnalysis(gaps);
  }

  /**
   * Calculate gap analysis
   * @param {Array} gaps - Detected gaps
   * @returns {Object} Gap analysis
   */
  calculateAnalysis(gaps) {
    const gapsByType = {};
    const gapsByRequirement = {};

    let criticalGaps = 0;
    let highGaps = 0;
    let mediumGaps = 0;
    let lowGaps = 0;

    for (const gap of gaps) {
      // Count by type
      gapsByType[gap.gapType] = (gapsByType[gap.gapType] || 0) + 1;

      // Count by requirement
      gapsByRequirement[gap.requirementId] = (gapsByRequirement[gap.requirementId] || 0) + 1;

      // Count by severity
      switch (gap.severity) {
        case 'critical':
          criticalGaps++;
          break;
        case 'high':
          highGaps++;
          break;
        case 'medium':
          mediumGaps++;
          break;
        case 'low':
          lowGaps++;
          break;
      }
    }

    return {
      totalGaps: gaps.length,
      criticalGaps,
      highGaps,
      mediumGaps,
      lowGaps,
      gapsByType,
      gapsByRequirement,
    };
  }

  /**
   * Generate a gap report
   * @param {Array} links - Traceability links
   * @returns {Object} Gap report
   */
  getGapReport(links) {
    const gaps = this.detectGaps(links);
    const sortedGaps = this.sortGapsBySeverity(gaps);
    const summary = this.calculateAnalysis(gaps);

    return {
      generatedAt: new Date().toISOString(),
      gaps: sortedGaps,
      summary,
    };
  }

  /**
   * Sort gaps by severity (critical first)
   * @param {Array} gaps - Gaps to sort
   * @returns {Array} Sorted gaps
   */
  sortGapsBySeverity(gaps) {
    return [...gaps].sort((a, b) => {
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    });
  }

  /**
   * Filter gaps by severity
   * @param {Array} gaps - Gaps to filter
   * @param {string} severity - Severity to filter by
   * @returns {Array} Filtered gaps
   */
  filterGapsBySeverity(gaps, severity) {
    return gaps.filter(g => g.severity === severity);
  }

  /**
   * Get unique requirement IDs that have gaps
   * @param {Array} links - Traceability links
   * @returns {Array} Requirement IDs with gaps
   */
  getRequirementsWithGaps(links) {
    const gaps = this.detectGaps(links);
    const reqIds = new Set();

    for (const gap of gaps) {
      reqIds.add(gap.requirementId);
    }

    return Array.from(reqIds);
  }

  /**
   * Check if a specific requirement has critical gaps
   * @param {Object} link - Traceability link
   * @returns {boolean} Has critical gap
   */
  hasCriticalGap(link) {
    // No tests is critical
    return link.tests.length === 0;
  }

  /**
   * Get gap coverage percentage
   * @param {Array} links - Traceability links
   * @returns {number} Coverage percentage
   */
  getGapCoverage(links) {
    if (links.length === 0) return 100;

    const reqsWithGaps = this.getRequirementsWithGaps(links);
    const covered = links.length - reqsWithGaps.length;

    return Math.round((covered / links.length) * 100);
  }
}

module.exports = { GapDetector };
