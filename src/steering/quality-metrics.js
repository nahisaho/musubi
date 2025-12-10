/**
 * Quality Metrics Dashboard Module
 * 
 * Provides:
 * - Coverage metrics (code, test, documentation)
 * - Compliance scoring (steering, constitutional)
 * - Analytics and trends
 * - Health indicators
 */

const EventEmitter = require('events');
const _path = require('path');

// Metric Categories
const MetricCategory = {
  COVERAGE: 'coverage',
  COMPLIANCE: 'compliance',
  QUALITY: 'quality',
  HEALTH: 'health',
  TREND: 'trend'
};

// Health Status
const HealthStatus = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  CRITICAL: 'critical',
  UNKNOWN: 'unknown'
};

// Trend Direction
const TrendDirection = {
  UP: 'up',
  DOWN: 'down',
  STABLE: 'stable',
  UNKNOWN: 'unknown'
};

/**
 * Base Metric
 */
class Metric {
  constructor(name, options = {}) {
    this.name = name;
    this.category = options.category || MetricCategory.QUALITY;
    this.unit = options.unit || 'percent';
    this.value = options.value || 0;
    this.target = options.target || null;
    this.min = options.min || 0;
    this.max = options.max || 100;
    this.timestamp = options.timestamp || new Date();
    this.metadata = options.metadata || {};
  }

  update(value) {
    this.value = Math.max(this.min, Math.min(this.max, value));
    this.timestamp = new Date();
    return this;
  }

  getProgress() {
    if (this.target === null) return null;
    return (this.value / this.target) * 100;
  }

  isOnTarget() {
    if (this.target === null) return null;
    return this.value >= this.target;
  }

  toJSON() {
    return {
      name: this.name,
      category: this.category,
      value: this.value,
      unit: this.unit,
      target: this.target,
      progress: this.getProgress(),
      onTarget: this.isOnTarget(),
      timestamp: this.timestamp.toISOString()
    };
  }
}

/**
 * Coverage Metric
 */
class CoverageMetric extends Metric {
  constructor(name, options = {}) {
    super(name, { ...options, category: MetricCategory.COVERAGE });
    this.coveredItems = options.coveredItems || 0;
    this.totalItems = options.totalItems || 0;
  }

  setCoverage(covered, total) {
    this.coveredItems = covered;
    this.totalItems = total;
    this.value = total > 0 ? (covered / total) * 100 : 0;
    this.timestamp = new Date();
    return this;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      covered: this.coveredItems,
      total: this.totalItems
    };
  }
}

/**
 * Compliance Metric
 */
class ComplianceMetric extends Metric {
  constructor(name, options = {}) {
    super(name, { ...options, category: MetricCategory.COMPLIANCE });
    this.rules = [];
    this.violations = [];
  }

  addRule(rule) {
    this.rules.push(rule);
    return this;
  }

  addViolation(violation) {
    this.violations.push({
      ...violation,
      timestamp: new Date()
    });
    this.recalculate();
    return this;
  }

  clearViolations() {
    this.violations = [];
    this.recalculate();
    return this;
  }

  recalculate() {
    if (this.rules.length === 0) {
      this.value = 100;
      return;
    }
    
    const violatedRules = new Set(this.violations.map(v => v.rule));
    const compliantCount = this.rules.length - violatedRules.size;
    this.value = (compliantCount / this.rules.length) * 100;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      ...super.toJSON(),
      rules: this.rules.length,
      violations: this.violations.length,
      violatedRules: [...new Set(this.violations.map(v => v.rule))]
    };
  }
}

/**
 * Health Indicator
 */
class HealthIndicator {
  constructor(name, options = {}) {
    this.name = name;
    this.status = options.status || HealthStatus.UNKNOWN;
    this.message = options.message || '';
    this.lastCheck = options.lastCheck || null;
    this.checkInterval = options.checkInterval || 60000; // 1 minute
    this.checker = options.checker || (() => ({ status: HealthStatus.UNKNOWN }));
  }

  async check() {
    try {
      const result = await this.checker();
      this.status = result.status;
      this.message = result.message || '';
      this.lastCheck = new Date();
      return result;
    } catch (error) {
      this.status = HealthStatus.CRITICAL;
      this.message = error.message;
      this.lastCheck = new Date();
      return { status: HealthStatus.CRITICAL, error };
    }
  }

  isHealthy() {
    return this.status === HealthStatus.HEALTHY;
  }

  needsCheck() {
    if (!this.lastCheck) return true;
    return Date.now() - this.lastCheck.getTime() > this.checkInterval;
  }

  toJSON() {
    return {
      name: this.name,
      status: this.status,
      message: this.message,
      lastCheck: this.lastCheck?.toISOString(),
      healthy: this.isHealthy()
    };
  }
}

/**
 * Trend Analyzer
 */
class TrendAnalyzer {
  constructor(options = {}) {
    this.dataPoints = [];
    this.maxPoints = options.maxPoints || 100;
    this.trendWindow = options.trendWindow || 7; // days
  }

  addDataPoint(value, timestamp = new Date()) {
    this.dataPoints.push({ value, timestamp });
    
    // Keep only maxPoints
    if (this.dataPoints.length > this.maxPoints) {
      this.dataPoints = this.dataPoints.slice(-this.maxPoints);
    }

    return this;
  }

  getTrend() {
    if (this.dataPoints.length < 2) {
      return { direction: TrendDirection.UNKNOWN, change: 0 };
    }

    const recent = this.dataPoints.slice(-this.trendWindow);
    const first = recent[0].value;
    const last = recent[recent.length - 1].value;
    const change = last - first;
    const percentChange = first > 0 ? (change / first) * 100 : 0;

    let direction;
    if (Math.abs(percentChange) < 1) {
      direction = TrendDirection.STABLE;
    } else if (change > 0) {
      direction = TrendDirection.UP;
    } else {
      direction = TrendDirection.DOWN;
    }

    return {
      direction,
      change,
      percentChange,
      first,
      last,
      dataPoints: recent.length
    };
  }

  getAverage() {
    if (this.dataPoints.length === 0) return 0;
    const sum = this.dataPoints.reduce((acc, dp) => acc + dp.value, 0);
    return sum / this.dataPoints.length;
  }

  getMin() {
    if (this.dataPoints.length === 0) return null;
    return Math.min(...this.dataPoints.map(dp => dp.value));
  }

  getMax() {
    if (this.dataPoints.length === 0) return null;
    return Math.max(...this.dataPoints.map(dp => dp.value));
  }

  toJSON() {
    return {
      trend: this.getTrend(),
      average: this.getAverage(),
      min: this.getMin(),
      max: this.getMax(),
      dataPoints: this.dataPoints.length
    };
  }
}

/**
 * Quality Score Calculator
 */
class QualityScoreCalculator {
  constructor(options = {}) {
    this.weights = options.weights || {
      coverage: 0.3,
      compliance: 0.3,
      health: 0.2,
      trends: 0.2
    };
  }

  calculate(metrics) {
    const scores = {
      coverage: this.calculateCoverageScore(metrics.coverage || []),
      compliance: this.calculateComplianceScore(metrics.compliance || []),
      health: this.calculateHealthScore(metrics.health || []),
      trends: this.calculateTrendScore(metrics.trends || [])
    };

    const overall = Object.entries(this.weights).reduce((acc, [key, weight]) => {
      return acc + (scores[key] * weight);
    }, 0);

    return {
      overall: Math.round(overall * 100) / 100,
      breakdown: scores,
      grade: this.getGrade(overall),
      weights: this.weights
    };
  }

  calculateCoverageScore(coverageMetrics) {
    if (coverageMetrics.length === 0) return 0;
    const avg = coverageMetrics.reduce((acc, m) => acc + m.value, 0) / coverageMetrics.length;
    return Math.min(100, avg);
  }

  calculateComplianceScore(complianceMetrics) {
    if (complianceMetrics.length === 0) return 100;
    const avg = complianceMetrics.reduce((acc, m) => acc + m.value, 0) / complianceMetrics.length;
    return avg;
  }

  calculateHealthScore(healthIndicators) {
    if (healthIndicators.length === 0) return 100;
    
    const statusScores = {
      [HealthStatus.HEALTHY]: 100,
      [HealthStatus.WARNING]: 60,
      [HealthStatus.CRITICAL]: 0,
      [HealthStatus.UNKNOWN]: 50
    };

    const avg = healthIndicators.reduce((acc, h) => acc + statusScores[h.status], 0) / healthIndicators.length;
    return avg;
  }

  calculateTrendScore(trends) {
    if (trends.length === 0) return 50;

    const directionScores = {
      [TrendDirection.UP]: 100,
      [TrendDirection.STABLE]: 70,
      [TrendDirection.DOWN]: 30,
      [TrendDirection.UNKNOWN]: 50
    };

    const avg = trends.reduce((acc, t) => acc + directionScores[t.direction], 0) / trends.length;
    return avg;
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

/**
 * Quality Metrics Dashboard
 */
class QualityMetricsDashboard extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'Quality Dashboard';
    this.metrics = new Map();
    this.healthIndicators = new Map();
    this.trendAnalyzers = new Map();
    this.scoreCalculator = new QualityScoreCalculator(options.weights);
    this.history = [];
    this.maxHistory = options.maxHistory || 1000;
  }

  // Metric Management
  addMetric(metric) {
    this.metrics.set(metric.name, metric);
    this.emit('metric:added', metric);
    return this;
  }

  getMetric(name) {
    return this.metrics.get(name);
  }

  updateMetric(name, value) {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.update(value);
      this.recordHistory('metric', name, value);
      this.emit('metric:updated', metric);

      // Update trend if exists
      const trend = this.trendAnalyzers.get(name);
      if (trend) {
        trend.addDataPoint(value);
      }
    }
    return this;
  }

  getMetricsByCategory(category) {
    return [...this.metrics.values()].filter(m => m.category === category);
  }

  // Health Indicators
  addHealthIndicator(indicator) {
    this.healthIndicators.set(indicator.name, indicator);
    this.emit('health:added', indicator);
    return this;
  }

  getHealthIndicator(name) {
    return this.healthIndicators.get(name);
  }

  async checkHealth(name) {
    const indicator = this.healthIndicators.get(name);
    if (indicator) {
      const result = await indicator.check();
      this.emit('health:checked', { name, result });
      return result;
    }
    return null;
  }

  async checkAllHealth() {
    const results = {};
    for (const [name, indicator] of this.healthIndicators) {
      results[name] = await indicator.check();
    }
    return results;
  }

  // Trend Analysis
  addTrendAnalyzer(name, options = {}) {
    const analyzer = new TrendAnalyzer(options);
    this.trendAnalyzers.set(name, analyzer);
    return analyzer;
  }

  getTrendAnalyzer(name) {
    return this.trendAnalyzers.get(name);
  }

  getTrends() {
    const trends = {};
    for (const [name, analyzer] of this.trendAnalyzers) {
      trends[name] = analyzer.getTrend();
    }
    return trends;
  }

  // Score Calculation
  calculateScore() {
    const data = {
      coverage: this.getMetricsByCategory(MetricCategory.COVERAGE),
      compliance: this.getMetricsByCategory(MetricCategory.COMPLIANCE),
      health: [...this.healthIndicators.values()],
      trends: Object.values(this.getTrends())
    };

    const score = this.scoreCalculator.calculate(data);
    this.emit('score:calculated', score);
    return score;
  }

  // History
  recordHistory(type, name, value) {
    this.history.push({
      type,
      name,
      value,
      timestamp: new Date()
    });

    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  getHistory(options = {}) {
    let filtered = this.history;

    if (options.type) {
      filtered = filtered.filter(h => h.type === options.type);
    }

    if (options.name) {
      filtered = filtered.filter(h => h.name === options.name);
    }

    if (options.since) {
      const since = new Date(options.since);
      filtered = filtered.filter(h => h.timestamp >= since);
    }

    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  // Dashboard Generation
  generateSummary() {
    const score = this.calculateScore();
    const metrics = [...this.metrics.values()].map(m => m.toJSON());
    const health = [...this.healthIndicators.values()].map(h => h.toJSON());
    const trends = this.getTrends();

    return {
      name: this.name,
      generatedAt: new Date().toISOString(),
      score,
      metrics,
      health,
      trends,
      summary: {
        totalMetrics: metrics.length,
        healthyIndicators: health.filter(h => h.healthy).length,
        totalIndicators: health.length,
        metricsOnTarget: metrics.filter(m => m.onTarget).length
      }
    };
  }

  generateMarkdownReport() {
    const summary = this.generateSummary();
    const lines = [
      `# ${this.name}`,
      '',
      `Generated: ${summary.generatedAt}`,
      '',
      '## Overall Score',
      '',
      `**Grade: ${summary.score.grade}** (${summary.score.overall}%)`,
      '',
      '### Breakdown',
      '',
      `| Category | Score |`,
      `|----------|-------|`,
      `| Coverage | ${summary.score.breakdown.coverage.toFixed(1)}% |`,
      `| Compliance | ${summary.score.breakdown.compliance.toFixed(1)}% |`,
      `| Health | ${summary.score.breakdown.health.toFixed(1)}% |`,
      `| Trends | ${summary.score.breakdown.trends.toFixed(1)}% |`,
      '',
      '## Metrics',
      ''
    ];

    for (const metric of summary.metrics) {
      const status = metric.onTarget ? '✅' : (metric.onTarget === false ? '⚠️' : '➖');
      lines.push(`- ${status} **${metric.name}**: ${metric.value.toFixed(1)}${metric.unit === 'percent' ? '%' : ` ${metric.unit}`}`);
      if (metric.target) {
        lines.push(`  - Target: ${metric.target}%`);
      }
    }

    lines.push('', '## Health Indicators', '');

    for (const indicator of summary.health) {
      const icon = indicator.healthy ? '🟢' : (indicator.status === 'warning' ? '🟡' : '🔴');
      lines.push(`- ${icon} **${indicator.name}**: ${indicator.status}`);
      if (indicator.message) {
        lines.push(`  - ${indicator.message}`);
      }
    }

    lines.push('', '## Trends', '');

    for (const [name, trend] of Object.entries(summary.trends)) {
      const icon = trend.direction === 'up' ? '📈' : (trend.direction === 'down' ? '📉' : '➡️');
      lines.push(`- ${icon} **${name}**: ${trend.direction} (${trend.percentChange?.toFixed(1) || 0}%)`);
    }

    return lines.join('\n');
  }

  // Serialization
  toJSON() {
    return this.generateSummary();
  }
}

/**
 * Factory function
 */
function createQualityDashboard(options = {}) {
  const dashboard = new QualityMetricsDashboard(options);

  // Add default metrics if specified
  if (options.includeDefaults !== false) {
    // Coverage metrics
    dashboard.addMetric(new CoverageMetric('Code Coverage', { target: 80 }));
    dashboard.addMetric(new CoverageMetric('Test Coverage', { target: 80 }));
    dashboard.addMetric(new CoverageMetric('Documentation Coverage', { target: 70 }));

    // Compliance metrics
    const steering = new ComplianceMetric('Steering Compliance', { target: 100 });
    steering.addRule('structure-defined');
    steering.addRule('tech-defined');
    steering.addRule('product-defined');
    dashboard.addMetric(steering);

    const constitution = new ComplianceMetric('Constitutional Compliance', { target: 100 });
    constitution.addRule('article-1');
    constitution.addRule('article-2');
    constitution.addRule('article-3');
    dashboard.addMetric(constitution);

    // Trend analyzers
    dashboard.addTrendAnalyzer('Code Coverage');
    dashboard.addTrendAnalyzer('Test Coverage');
    dashboard.addTrendAnalyzer('Steering Compliance');
  }

  return dashboard;
}

module.exports = {
  // Constants
  MetricCategory,
  HealthStatus,
  TrendDirection,
  
  // Classes
  Metric,
  CoverageMetric,
  ComplianceMetric,
  HealthIndicator,
  TrendAnalyzer,
  QualityScoreCalculator,
  QualityMetricsDashboard,
  
  // Factory
  createQualityDashboard
};
