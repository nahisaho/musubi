/**
 * Quality Metrics Dashboard
 * カバレッジメトリクス、Constitutional準拠メトリクス、プロジェクトヘルス指標
 * 
 * Part of MUSUBI v5.0.0 - Production Readiness
 * 
 * @module monitoring/quality-dashboard
 * @version 1.0.0
 * 
 * @traceability
 * - Requirement: REQ-P5-001 (Quality Dashboard)
 * - Design: docs/design/tdd-musubi-v5.0.0.md#3.1
 * - Test: tests/monitoring/quality-dashboard.test.js
 */

const EventEmitter = require('events');

/**
 * Metric categories
 */
const METRIC_CATEGORY = {
  COVERAGE: 'coverage',
  CONSTITUTIONAL: 'constitutional',
  QUALITY: 'quality',
  HEALTH: 'health',
  PERFORMANCE: 'performance',
  CUSTOM: 'custom'
};

/**
 * Health status levels
 */
const HEALTH_STATUS = {
  HEALTHY: 'healthy',        // 80-100%
  WARNING: 'warning',        // 50-79%
  CRITICAL: 'critical',      // 20-49%
  FAILING: 'failing'         // <20%
};

/**
 * Constitutional articles
 */
const CONSTITUTIONAL_ARTICLES = {
  SINGLE_SOURCE_OF_TRUTH: 'article-1',
  EXPLICIT_CONTRACTS: 'article-2',
  TRACEABILITY: 'article-3',
  AUTOMATED_VALIDATION: 'article-4',
  MACHINE_READABLE: 'article-5',
  INCREMENTAL_ADOPTION: 'article-6',
  SEPARATION_OF_CONCERNS: 'article-7',
  FEEDBACK_LOOPS: 'article-8',
  GOVERNANCE: 'article-9'
};

/**
 * Quality Dashboard Engine
 */
class QualityDashboard extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} options.thresholds - Custom thresholds
   * @param {boolean} options.autoCollect - Auto-collect metrics
   * @param {number} options.collectInterval - Collection interval (ms)
   */
  constructor(options = {}) {
    super();
    
    this.thresholds = {
      coverage: { healthy: 80, warning: 50, critical: 20 },
      constitutional: { healthy: 90, warning: 70, critical: 50 },
      quality: { healthy: 80, warning: 60, critical: 40 },
      ...options.thresholds
    };

    this.autoCollect = options.autoCollect ?? false;
    this.collectInterval = options.collectInterval ?? 60000;
    
    this.metrics = new Map();
    this.history = [];
    this.collectors = new Map();
    this.intervalId = null;

    // Initialize default collectors
    this.initializeDefaultCollectors();

    if (this.autoCollect) {
      this.startAutoCollection();
    }
  }

  /**
   * Initialize default metric collectors
   */
  initializeDefaultCollectors() {
    // Coverage metrics collector
    this.registerCollector('coverage', async (context) => ({
      lines: context?.coverage?.lines ?? 0,
      branches: context?.coverage?.branches ?? 0,
      functions: context?.coverage?.functions ?? 0,
      statements: context?.coverage?.statements ?? 0,
      overall: context?.coverage?.overall ?? 
        ((context?.coverage?.lines ?? 0) + 
         (context?.coverage?.branches ?? 0) + 
         (context?.coverage?.functions ?? 0) + 
         (context?.coverage?.statements ?? 0)) / 4
    }));

    // Constitutional compliance collector
    this.registerCollector('constitutional', async (context) => {
      const articles = context?.constitutional ?? {};
      const scores = Object.values(CONSTITUTIONAL_ARTICLES).map(id => ({
        id,
        score: articles[id]?.score ?? 0,
        compliant: articles[id]?.compliant ?? false
      }));

      const totalScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
      const compliantCount = scores.filter(s => s.compliant).length;

      return {
        articles: scores,
        totalScore,
        compliantCount,
        totalArticles: scores.length,
        complianceRate: (compliantCount / scores.length) * 100
      };
    });

    // Quality metrics collector
    this.registerCollector('quality', async (context) => ({
      codeComplexity: context?.quality?.complexity ?? 0,
      maintainability: context?.quality?.maintainability ?? 0,
      documentation: context?.quality?.documentation ?? 0,
      testQuality: context?.quality?.testQuality ?? 0,
      overall: context?.quality?.overall ??
        ((context?.quality?.complexity ?? 0) +
         (context?.quality?.maintainability ?? 0) +
         (context?.quality?.documentation ?? 0) +
         (context?.quality?.testQuality ?? 0)) / 4
    }));

    // Health metrics collector
    this.registerCollector('health', async (_context) => {
      const coverage = await this.getMetric('coverage');
      const constitutional = await this.getMetric('constitutional');
      const quality = await this.getMetric('quality');

      const coverageScore = coverage?.overall ?? 0;
      const constitutionalScore = constitutional?.totalScore ?? 0;
      const qualityScore = quality?.overall ?? 0;

      const overall = (coverageScore + constitutionalScore + qualityScore) / 3;

      return {
        coverageScore,
        constitutionalScore,
        qualityScore,
        overall,
        status: this.calculateStatus(overall, 'quality'),
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * Register a metric collector
   * @param {string} name
   * @param {Function} collector
   */
  registerCollector(name, collector) {
    if (typeof collector !== 'function') {
      throw new Error('Collector must be a function');
    }
    this.collectors.set(name, collector);
  }

  /**
   * Unregister a collector
   * @param {string} name
   */
  unregisterCollector(name) {
    this.collectors.delete(name);
    this.metrics.delete(name);
  }

  /**
   * Collect metrics
   * @param {Object} context - External context data
   * @returns {Object}
   */
  async collect(context = {}) {
    const results = {};
    const timestamp = new Date().toISOString();

    for (const [name, collector] of this.collectors) {
      try {
        const data = await collector(context);
        results[name] = {
          ...data,
          collectedAt: timestamp
        };
        this.metrics.set(name, results[name]);
      } catch (error) {
        results[name] = {
          error: error.message,
          collectedAt: timestamp
        };
      }
    }

    const snapshot = {
      timestamp,
      metrics: { ...results }
    };

    this.history.push(snapshot);
    this.emit('collected', snapshot);

    return results;
  }

  /**
   * Get a specific metric
   * @param {string} name
   * @returns {Object|null}
   */
  getMetric(name) {
    return this.metrics.get(name) || null;
  }

  /**
   * Get all metrics
   * @returns {Object}
   */
  getAllMetrics() {
    const result = {};
    for (const [name, data] of this.metrics) {
      result[name] = data;
    }
    return result;
  }

  /**
   * Calculate health status from score
   * @param {number} score
   * @param {string} category
   * @returns {string}
   */
  calculateStatus(score, category = 'quality') {
    const thresholds = this.thresholds[category] || this.thresholds.quality;

    if (score >= thresholds.healthy) return HEALTH_STATUS.HEALTHY;
    if (score >= thresholds.warning) return HEALTH_STATUS.WARNING;
    if (score >= thresholds.critical) return HEALTH_STATUS.CRITICAL;
    return HEALTH_STATUS.FAILING;
  }

  /**
   * Get project health summary
   * @returns {Object}
   */
  getHealthSummary() {
    const coverage = this.metrics.get('coverage');
    const constitutional = this.metrics.get('constitutional');
    const quality = this.metrics.get('quality');
    const health = this.metrics.get('health');

    return {
      status: health?.status ?? HEALTH_STATUS.FAILING,
      overall: health?.overall ?? 0,
      breakdown: {
        coverage: {
          score: coverage?.overall ?? 0,
          status: this.calculateStatus(coverage?.overall ?? 0, 'coverage')
        },
        constitutional: {
          score: constitutional?.totalScore ?? 0,
          status: this.calculateStatus(constitutional?.totalScore ?? 0, 'constitutional'),
          compliantArticles: constitutional?.compliantCount ?? 0,
          totalArticles: constitutional?.totalArticles ?? 9
        },
        quality: {
          score: quality?.overall ?? 0,
          status: this.calculateStatus(quality?.overall ?? 0, 'quality')
        }
      },
      lastUpdated: health?.timestamp ?? null
    };
  }

  /**
   * Get trend data
   * @param {string} metricName
   * @param {number} limit
   * @returns {Array}
   */
  getTrend(metricName, limit = 10) {
    const data = this.history
      .filter(h => h.metrics[metricName])
      .slice(-limit)
      .map(h => ({
        timestamp: h.timestamp,
        value: h.metrics[metricName]
      }));

    if (data.length < 2) {
      return { data, trend: 'stable', change: 0 };
    }

    const first = this.extractValue(data[0].value);
    const last = this.extractValue(data[data.length - 1].value);
    const change = last - first;

    let trend = 'stable';
    if (change > 5) trend = 'improving';
    else if (change < -5) trend = 'declining';

    return { data, trend, change };
  }

  /**
   * Extract numeric value from metric
   */
  extractValue(metric) {
    if (typeof metric === 'number') return metric;
    if (metric?.overall !== undefined) return metric.overall;
    if (metric?.totalScore !== undefined) return metric.totalScore;
    return 0;
  }

  /**
   * Get history
   * @param {Object} filter
   * @returns {Array}
   */
  getHistory(filter = {}) {
    let history = [...this.history];

    if (filter.since) {
      history = history.filter(h => new Date(h.timestamp) >= new Date(filter.since));
    }

    if (filter.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  /**
   * Export dashboard as markdown report
   * @returns {string}
   */
  exportReport() {
    const summary = this.getHealthSummary();
    let report = `# Quality Dashboard Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Overall Health
    report += `## Overall Health\n\n`;
    report += `| Metric | Score | Status |\n`;
    report += `|--------|-------|--------|\n`;
    report += `| **Overall** | ${summary.overall.toFixed(1)}% | ${this.statusEmoji(summary.status)} ${summary.status} |\n`;
    report += `| Coverage | ${summary.breakdown.coverage.score.toFixed(1)}% | ${this.statusEmoji(summary.breakdown.coverage.status)} |\n`;
    report += `| Constitutional | ${summary.breakdown.constitutional.score.toFixed(1)}% | ${this.statusEmoji(summary.breakdown.constitutional.status)} |\n`;
    report += `| Quality | ${summary.breakdown.quality.score.toFixed(1)}% | ${this.statusEmoji(summary.breakdown.quality.status)} |\n\n`;

    // Constitutional Compliance
    const constitutional = this.metrics.get('constitutional');
    if (constitutional?.articles) {
      report += `## Constitutional Compliance\n\n`;
      report += `Articles Compliant: ${summary.breakdown.constitutional.compliantArticles}/${summary.breakdown.constitutional.totalArticles}\n\n`;
      report += `| Article | Score | Compliant |\n`;
      report += `|---------|-------|----------|\n`;
      for (const article of constitutional.articles) {
        const check = article.compliant ? '✅' : '❌';
        report += `| ${article.id} | ${article.score.toFixed(1)}% | ${check} |\n`;
      }
      report += '\n';
    }

    // Coverage Details
    const coverage = this.metrics.get('coverage');
    if (coverage) {
      report += `## Coverage Details\n\n`;
      report += `| Type | Coverage |\n`;
      report += `|------|----------|\n`;
      report += `| Lines | ${coverage.lines.toFixed(1)}% |\n`;
      report += `| Branches | ${coverage.branches.toFixed(1)}% |\n`;
      report += `| Functions | ${coverage.functions.toFixed(1)}% |\n`;
      report += `| Statements | ${coverage.statements.toFixed(1)}% |\n\n`;
    }

    // Quality Details
    const quality = this.metrics.get('quality');
    if (quality) {
      report += `## Quality Metrics\n\n`;
      report += `| Metric | Score |\n`;
      report += `|--------|-------|\n`;
      report += `| Complexity | ${quality.codeComplexity.toFixed(1)} |\n`;
      report += `| Maintainability | ${quality.maintainability.toFixed(1)} |\n`;
      report += `| Documentation | ${quality.documentation.toFixed(1)} |\n`;
      report += `| Test Quality | ${quality.testQuality.toFixed(1)} |\n\n`;
    }

    return report;
  }

  /**
   * Get emoji for status
   */
  statusEmoji(status) {
    const emojis = {
      [HEALTH_STATUS.HEALTHY]: '🟢',
      [HEALTH_STATUS.WARNING]: '🟡',
      [HEALTH_STATUS.CRITICAL]: '🟠',
      [HEALTH_STATUS.FAILING]: '🔴'
    };
    return emojis[status] || '⚪';
  }

  /**
   * Start auto-collection
   */
  startAutoCollection() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.collect().catch(err => this.emit('error', err));
    }, this.collectInterval);
  }

  /**
   * Stop auto-collection
   */
  stopAutoCollection() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Clear all data
   */
  clear() {
    this.metrics.clear();
    this.history = [];
    this.emit('cleared');
  }

  /**
   * Set thresholds
   * @param {string} category
   * @param {Object} thresholds
   */
  setThresholds(category, thresholds) {
    this.thresholds[category] = {
      ...this.thresholds[category],
      ...thresholds
    };
  }

  /**
   * Get stats
   * @returns {Object}
   */
  getStats() {
    return {
      metricsCount: this.metrics.size,
      collectorsCount: this.collectors.size,
      historyCount: this.history.length,
      autoCollecting: this.intervalId !== null,
      thresholds: { ...this.thresholds }
    };
  }
}

/**
 * Factory function
 */
function createQualityDashboard(options = {}) {
  return new QualityDashboard(options);
}

module.exports = {
  QualityDashboard,
  createQualityDashboard,
  METRIC_CATEGORY,
  HEALTH_STATUS,
  CONSTITUTIONAL_ARTICLES
};
