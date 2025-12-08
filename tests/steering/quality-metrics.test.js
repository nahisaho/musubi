/**
 * Tests for Quality Metrics Dashboard Module
 */

const {
  Metric,
  CoverageMetric,
  ComplianceMetric,
  HealthIndicator,
  TrendAnalyzer,
  QualityScoreCalculator,
  QualityMetricsDashboard,
  MetricCategory,
  HealthStatus,
  TrendDirection,
  createQualityDashboard
} = require('../../src/steering/quality-metrics');

describe('Quality Metrics Dashboard', () => {
  describe('Metric', () => {
    test('should create metric with defaults', () => {
      const metric = new Metric('Test Metric');

      expect(metric.name).toBe('Test Metric');
      expect(metric.category).toBe(MetricCategory.QUALITY);
      expect(metric.value).toBe(0);
      expect(metric.unit).toBe('percent');
    });

    test('should update value', () => {
      const metric = new Metric('Test', { value: 50 });
      metric.update(75);

      expect(metric.value).toBe(75);
      expect(metric.timestamp).toBeDefined();
    });

    test('should clamp value to min/max', () => {
      const metric = new Metric('Test', { min: 0, max: 100 });

      metric.update(-10);
      expect(metric.value).toBe(0);

      metric.update(150);
      expect(metric.value).toBe(100);
    });

    test('should calculate progress towards target', () => {
      const metric = new Metric('Test', { value: 60, target: 80 });

      expect(metric.getProgress()).toBe(75);
    });

    test('should check if on target', () => {
      const metric = new Metric('Test', { value: 60, target: 80 });
      expect(metric.isOnTarget()).toBe(false);

      metric.update(80);
      expect(metric.isOnTarget()).toBe(true);
    });

    test('should convert to JSON', () => {
      const metric = new Metric('Test', { value: 50, target: 80 });
      const json = metric.toJSON();

      expect(json.name).toBe('Test');
      expect(json.value).toBe(50);
      expect(json.target).toBe(80);
      expect(json.progress).toBe(62.5);
      expect(json.onTarget).toBe(false);
    });
  });

  describe('CoverageMetric', () => {
    test('should create coverage metric', () => {
      const coverage = new CoverageMetric('Code Coverage');

      expect(coverage.category).toBe(MetricCategory.COVERAGE);
      expect(coverage.coveredItems).toBe(0);
      expect(coverage.totalItems).toBe(0);
    });

    test('should set coverage', () => {
      const coverage = new CoverageMetric('Code Coverage');
      coverage.setCoverage(80, 100);

      expect(coverage.value).toBe(80);
      expect(coverage.coveredItems).toBe(80);
      expect(coverage.totalItems).toBe(100);
    });

    test('should handle zero total', () => {
      const coverage = new CoverageMetric('Empty');
      coverage.setCoverage(0, 0);

      expect(coverage.value).toBe(0);
    });

    test('should include coverage details in JSON', () => {
      const coverage = new CoverageMetric('Test');
      coverage.setCoverage(75, 100);
      const json = coverage.toJSON();

      expect(json.covered).toBe(75);
      expect(json.total).toBe(100);
    });
  });

  describe('ComplianceMetric', () => {
    let compliance;

    beforeEach(() => {
      compliance = new ComplianceMetric('Test Compliance');
    });

    test('should create compliance metric', () => {
      expect(compliance.category).toBe(MetricCategory.COMPLIANCE);
      expect(compliance.rules).toHaveLength(0);
      expect(compliance.violations).toHaveLength(0);
    });

    test('should add rules', () => {
      compliance.addRule('rule-1');
      compliance.addRule('rule-2');

      expect(compliance.rules).toHaveLength(2);
    });

    test('should add violations and recalculate', () => {
      compliance.addRule('rule-1');
      compliance.addRule('rule-2');
      compliance.recalculate();
      expect(compliance.value).toBe(100);

      compliance.addViolation({ rule: 'rule-1', message: 'Violation' });
      expect(compliance.value).toBe(50);
    });

    test('should clear violations', () => {
      compliance.addRule('rule-1');
      compliance.addViolation({ rule: 'rule-1' });
      expect(compliance.value).toBe(0);

      compliance.clearViolations();
      expect(compliance.value).toBe(100);
    });

    test('should include compliance details in JSON', () => {
      compliance.addRule('rule-1');
      compliance.addRule('rule-2');
      compliance.addViolation({ rule: 'rule-1' });
      
      const json = compliance.toJSON();
      expect(json.rules).toBe(2);
      expect(json.violations).toBe(1);
      expect(json.violatedRules).toContain('rule-1');
    });
  });

  describe('HealthIndicator', () => {
    test('should create health indicator', () => {
      const indicator = new HealthIndicator('Database');

      expect(indicator.name).toBe('Database');
      expect(indicator.status).toBe(HealthStatus.UNKNOWN);
    });

    test('should check health', async () => {
      const indicator = new HealthIndicator('Test', {
        checker: async () => ({ status: HealthStatus.HEALTHY, message: 'OK' })
      });

      const result = await indicator.check();

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(indicator.status).toBe(HealthStatus.HEALTHY);
      expect(indicator.lastCheck).toBeDefined();
    });

    test('should handle check errors', async () => {
      const indicator = new HealthIndicator('Failing', {
        checker: async () => { throw new Error('Connection failed'); }
      });

      const result = await indicator.check();

      expect(result.status).toBe(HealthStatus.CRITICAL);
      expect(indicator.message).toBe('Connection failed');
    });

    test('should determine if check is needed', () => {
      const indicator = new HealthIndicator('Test', { checkInterval: 1000 });

      expect(indicator.needsCheck()).toBe(true);

      indicator.lastCheck = new Date();
      expect(indicator.needsCheck()).toBe(false);
    });

    test('should check isHealthy', async () => {
      const indicator = new HealthIndicator('Test', {
        checker: async () => ({ status: HealthStatus.HEALTHY })
      });

      await indicator.check();
      expect(indicator.isHealthy()).toBe(true);
    });

    test('should convert to JSON', async () => {
      const indicator = new HealthIndicator('Test', {
        checker: async () => ({ status: HealthStatus.HEALTHY, message: 'All good' })
      });

      await indicator.check();
      const json = indicator.toJSON();

      expect(json.name).toBe('Test');
      expect(json.status).toBe('healthy');
      expect(json.healthy).toBe(true);
    });
  });

  describe('TrendAnalyzer', () => {
    let analyzer;

    beforeEach(() => {
      analyzer = new TrendAnalyzer();
    });

    test('should add data points', () => {
      analyzer.addDataPoint(50);
      analyzer.addDataPoint(60);

      expect(analyzer.dataPoints).toHaveLength(2);
    });

    test('should limit data points', () => {
      const small = new TrendAnalyzer({ maxPoints: 3 });
      small.addDataPoint(1);
      small.addDataPoint(2);
      small.addDataPoint(3);
      small.addDataPoint(4);

      expect(small.dataPoints).toHaveLength(3);
      expect(small.dataPoints[0].value).toBe(2);
    });

    test('should detect upward trend', () => {
      analyzer.addDataPoint(50);
      analyzer.addDataPoint(60);
      analyzer.addDataPoint(70);

      const trend = analyzer.getTrend();
      expect(trend.direction).toBe(TrendDirection.UP);
    });

    test('should detect downward trend', () => {
      analyzer.addDataPoint(70);
      analyzer.addDataPoint(60);
      analyzer.addDataPoint(50);

      const trend = analyzer.getTrend();
      expect(trend.direction).toBe(TrendDirection.DOWN);
    });

    test('should detect stable trend', () => {
      analyzer.addDataPoint(50);
      analyzer.addDataPoint(50);
      analyzer.addDataPoint(50);

      const trend = analyzer.getTrend();
      expect(trend.direction).toBe(TrendDirection.STABLE);
    });

    test('should return unknown for insufficient data', () => {
      analyzer.addDataPoint(50);

      const trend = analyzer.getTrend();
      expect(trend.direction).toBe(TrendDirection.UNKNOWN);
    });

    test('should calculate average', () => {
      analyzer.addDataPoint(40);
      analyzer.addDataPoint(60);
      analyzer.addDataPoint(80);

      expect(analyzer.getAverage()).toBe(60);
    });

    test('should get min and max', () => {
      analyzer.addDataPoint(40);
      analyzer.addDataPoint(60);
      analyzer.addDataPoint(80);

      expect(analyzer.getMin()).toBe(40);
      expect(analyzer.getMax()).toBe(80);
    });

    test('should convert to JSON', () => {
      analyzer.addDataPoint(50);
      analyzer.addDataPoint(75);

      const json = analyzer.toJSON();
      expect(json.trend).toBeDefined();
      expect(json.average).toBe(62.5);
      expect(json.dataPoints).toBe(2);
    });
  });

  describe('QualityScoreCalculator', () => {
    let calculator;

    beforeEach(() => {
      calculator = new QualityScoreCalculator();
    });

    test('should calculate overall score', () => {
      const metrics = {
        coverage: [{ value: 80 }, { value: 70 }],
        compliance: [{ value: 100 }],
        health: [{ status: HealthStatus.HEALTHY }],
        trends: [{ direction: TrendDirection.UP }]
      };

      const score = calculator.calculate(metrics);

      expect(score.overall).toBeGreaterThan(0);
      expect(score.grade).toBeDefined();
      expect(score.breakdown).toBeDefined();
    });

    test('should assign grades correctly', () => {
      expect(calculator.getGrade(95)).toBe('A');
      expect(calculator.getGrade(85)).toBe('B');
      expect(calculator.getGrade(75)).toBe('C');
      expect(calculator.getGrade(65)).toBe('D');
      expect(calculator.getGrade(50)).toBe('F');
    });

    test('should calculate coverage score', () => {
      const coverage = [{ value: 80 }, { value: 60 }];
      const score = calculator.calculateCoverageScore(coverage);

      expect(score).toBe(70);
    });

    test('should calculate health score', () => {
      const health = [
        { status: HealthStatus.HEALTHY },
        { status: HealthStatus.WARNING }
      ];
      const score = calculator.calculateHealthScore(health);

      expect(score).toBe(80); // (100 + 60) / 2
    });

    test('should use custom weights', () => {
      const custom = new QualityScoreCalculator({
        weights: { coverage: 0.5, compliance: 0.5, health: 0, trends: 0 }
      });

      expect(custom.weights.coverage).toBe(0.5);
      expect(custom.weights.health).toBe(0);
    });
  });

  describe('QualityMetricsDashboard', () => {
    let dashboard;

    beforeEach(() => {
      dashboard = createQualityDashboard({ includeDefaults: false });
    });

    test('should create dashboard', () => {
      expect(dashboard.name).toBe('Quality Dashboard');
      expect(dashboard.metrics.size).toBe(0);
    });

    test('should add and get metrics', () => {
      const metric = new Metric('Test', { value: 50 });
      dashboard.addMetric(metric);

      expect(dashboard.getMetric('Test')).toBe(metric);
    });

    test('should update metric', () => {
      dashboard.addMetric(new Metric('Test', { value: 50 }));
      dashboard.updateMetric('Test', 75);

      expect(dashboard.getMetric('Test').value).toBe(75);
    });

    test('should get metrics by category', () => {
      dashboard.addMetric(new CoverageMetric('Coverage 1'));
      dashboard.addMetric(new CoverageMetric('Coverage 2'));
      dashboard.addMetric(new ComplianceMetric('Compliance'));

      const coverage = dashboard.getMetricsByCategory(MetricCategory.COVERAGE);
      expect(coverage).toHaveLength(2);
    });

    test('should add health indicators', () => {
      const indicator = new HealthIndicator('Database');
      dashboard.addHealthIndicator(indicator);

      expect(dashboard.getHealthIndicator('Database')).toBe(indicator);
    });

    test('should check health', async () => {
      dashboard.addHealthIndicator(new HealthIndicator('Test', {
        checker: async () => ({ status: HealthStatus.HEALTHY })
      }));

      const result = await dashboard.checkHealth('Test');
      expect(result.status).toBe(HealthStatus.HEALTHY);
    });

    test('should check all health', async () => {
      dashboard.addHealthIndicator(new HealthIndicator('A', {
        checker: async () => ({ status: HealthStatus.HEALTHY })
      }));
      dashboard.addHealthIndicator(new HealthIndicator('B', {
        checker: async () => ({ status: HealthStatus.WARNING })
      }));

      const results = await dashboard.checkAllHealth();
      expect(results.A.status).toBe(HealthStatus.HEALTHY);
      expect(results.B.status).toBe(HealthStatus.WARNING);
    });

    test('should add trend analyzers', () => {
      const analyzer = dashboard.addTrendAnalyzer('Coverage');

      expect(dashboard.getTrendAnalyzer('Coverage')).toBe(analyzer);
    });

    test('should update trends when metrics update', () => {
      dashboard.addMetric(new CoverageMetric('Coverage'));
      dashboard.addTrendAnalyzer('Coverage');

      dashboard.updateMetric('Coverage', 50);
      dashboard.updateMetric('Coverage', 60);

      const analyzer = dashboard.getTrendAnalyzer('Coverage');
      expect(analyzer.dataPoints).toHaveLength(2);
    });

    test('should calculate score', () => {
      dashboard.addMetric(new CoverageMetric('Coverage', { value: 80 }));

      const score = dashboard.calculateScore();
      expect(score.overall).toBeDefined();
      expect(score.grade).toBeDefined();
    });

    test('should record history', () => {
      dashboard.addMetric(new Metric('Test'));
      dashboard.updateMetric('Test', 50);
      dashboard.updateMetric('Test', 60);

      const history = dashboard.getHistory();
      expect(history).toHaveLength(2);
    });

    test('should filter history', () => {
      dashboard.addMetric(new Metric('A'));
      dashboard.addMetric(new Metric('B'));
      dashboard.updateMetric('A', 50);
      dashboard.updateMetric('B', 60);

      const filtered = dashboard.getHistory({ name: 'A' });
      expect(filtered).toHaveLength(1);
    });

    test('should generate summary', () => {
      dashboard.addMetric(new CoverageMetric('Coverage', { value: 80 }));
      dashboard.addHealthIndicator(new HealthIndicator('DB', {
        status: HealthStatus.HEALTHY
      }));

      const summary = dashboard.generateSummary();

      expect(summary.name).toBe('Quality Dashboard');
      expect(summary.metrics.length).toBeGreaterThan(0);
      expect(summary.health.length).toBeGreaterThan(0);
      expect(summary.score).toBeDefined();
    });

    test('should generate markdown report', () => {
      dashboard.addMetric(new CoverageMetric('Code Coverage', { value: 85, target: 80 }));
      dashboard.addHealthIndicator(new HealthIndicator('Database', {
        status: HealthStatus.HEALTHY
      }));

      const report = dashboard.generateMarkdownReport();

      expect(report).toContain('# Quality Dashboard');
      expect(report).toContain('Code Coverage');
      expect(report).toContain('Database');
      expect(report).toContain('Grade:');
    });

    test('should emit events', (done) => {
      dashboard.on('metric:added', (metric) => {
        expect(metric.name).toBe('Test');
        done();
      });

      dashboard.addMetric(new Metric('Test'));
    });

    test('should convert to JSON', () => {
      dashboard.addMetric(new Metric('Test', { value: 50 }));

      const json = dashboard.toJSON();
      expect(json.name).toBe('Quality Dashboard');
      expect(json.metrics).toBeDefined();
    });
  });

  describe('createQualityDashboard', () => {
    test('should create dashboard with defaults', () => {
      const dashboard = createQualityDashboard();

      expect(dashboard.getMetric('Code Coverage')).toBeDefined();
      expect(dashboard.getMetric('Steering Compliance')).toBeDefined();
      expect(dashboard.getTrendAnalyzer('Code Coverage')).toBeDefined();
    });

    test('should create dashboard without defaults', () => {
      const dashboard = createQualityDashboard({ includeDefaults: false });

      expect(dashboard.metrics.size).toBe(0);
    });

    test('should accept custom name', () => {
      const dashboard = createQualityDashboard({
        name: 'My Dashboard',
        includeDefaults: false
      });

      expect(dashboard.name).toBe('My Dashboard');
    });
  });

  describe('Constants', () => {
    test('should export MetricCategory', () => {
      expect(MetricCategory.COVERAGE).toBe('coverage');
      expect(MetricCategory.COMPLIANCE).toBe('compliance');
      expect(MetricCategory.QUALITY).toBe('quality');
      expect(MetricCategory.HEALTH).toBe('health');
      expect(MetricCategory.TREND).toBe('trend');
    });

    test('should export HealthStatus', () => {
      expect(HealthStatus.HEALTHY).toBe('healthy');
      expect(HealthStatus.WARNING).toBe('warning');
      expect(HealthStatus.CRITICAL).toBe('critical');
      expect(HealthStatus.UNKNOWN).toBe('unknown');
    });

    test('should export TrendDirection', () => {
      expect(TrendDirection.UP).toBe('up');
      expect(TrendDirection.DOWN).toBe('down');
      expect(TrendDirection.STABLE).toBe('stable');
      expect(TrendDirection.UNKNOWN).toBe('unknown');
    });
  });
});
