/**
 * Tests for Monitoring Module (index.js)
 */

const monitoring = require('../../src/monitoring');

describe('Monitoring Module', () => {
  describe('Core Classes', () => {
    test('should export SLI class', () => {
      const sli = new monitoring.SLI({
        name: 'test-sli',
        type: monitoring.SLOType.AVAILABILITY,
      });
      expect(sli.name).toBe('test-sli');
    });

    test('should export SLO class', () => {
      const sli = new monitoring.SLI({ name: 'test-sli' });
      const slo = new monitoring.SLO({
        name: 'test-slo',
        sli,
        target: 0.99,
      });
      expect(slo.name).toBe('test-slo');
      expect(slo.target).toBe(0.99);
    });

    test('should export AlertRule class', () => {
      const rule = new monitoring.AlertRule({
        name: 'test-alert',
        expr: 'up == 0',
        severity: monitoring.AlertSeverity.CRITICAL,
      });
      expect(rule.name).toBe('test-alert');
    });

    test('should export HealthCheck class', () => {
      const check = new monitoring.HealthCheck({
        name: 'test-health',
        endpoint: '/health',
      });
      expect(check.name).toBe('test-health');
    });

    test('should export MonitoringConfig class', () => {
      const config = new monitoring.MonitoringConfig({
        serviceName: 'test-service',
      });
      expect(config.serviceName).toBe('test-service');
    });
  });

  describe('Constants', () => {
    test('should export SLOType constants', () => {
      expect(monitoring.SLOType.AVAILABILITY).toBe('availability');
      expect(monitoring.SLOType.LATENCY).toBe('latency');
      expect(monitoring.SLOType.THROUGHPUT).toBe('throughput');
      expect(monitoring.SLOType.ERROR_RATE).toBe('error-rate');
    });

    test('should export AlertSeverity constants', () => {
      expect(monitoring.AlertSeverity.CRITICAL).toBe('critical');
      expect(monitoring.AlertSeverity.WARNING).toBe('warning');
      expect(monitoring.AlertSeverity.INFO).toBe('info');
    });

    test('should export MetricType constants', () => {
      expect(monitoring.MetricType.COUNTER).toBe('counter');
      expect(monitoring.MetricType.GAUGE).toBe('gauge');
      expect(monitoring.MetricType.HISTOGRAM).toBe('histogram');
    });
  });

  describe('Templates', () => {
    test('should export SLOTemplates', () => {
      expect(monitoring.SLOTemplates).toBeDefined();
      expect(typeof monitoring.SLOTemplates.API_AVAILABILITY).toBe('function');
      expect(typeof monitoring.SLOTemplates.API_LATENCY).toBe('function');
    });

    test('should export AlertTemplates', () => {
      expect(monitoring.AlertTemplates).toBeDefined();
      expect(typeof monitoring.AlertTemplates.HIGH_ERROR_RATE).toBe('function');
      expect(typeof monitoring.AlertTemplates.HIGH_LATENCY).toBe('function');
      expect(typeof monitoring.AlertTemplates.HIGH_MEMORY).toBe('function');
    });
  });

  describe('Factory Functions', () => {
    test('should export createMonitoringConfig', () => {
      const config = monitoring.createMonitoringConfig({
        serviceName: 'my-service',
      });
      expect(config).toBeInstanceOf(monitoring.MonitoringConfig);
    });
  });

  describe('Release Manager Integration', () => {
    test('should export Release class', () => {
      const release = new monitoring.Release({
        version: '1.0.0',
      });
      expect(release.version).toBe('1.0.0');
    });

    test('should export FeatureFlag class', () => {
      const flag = new monitoring.FeatureFlag({
        key: 'test-flag',
      });
      expect(flag.key).toBe('test-flag');
    });

    test('should export ReleaseManager class', () => {
      const manager = new monitoring.ReleaseManager();
      expect(manager).toBeInstanceOf(monitoring.ReleaseManager);
    });

    test('should export createReleaseManager factory', () => {
      const manager = monitoring.createReleaseManager();
      expect(manager).toBeInstanceOf(monitoring.ReleaseManager);
    });

    test('should export ReleaseState constants', () => {
      expect(monitoring.ReleaseState.PLANNING).toBe('planning');
      expect(monitoring.ReleaseState.PRODUCTION).toBe('production');
    });

    test('should export ReleaseType constants', () => {
      expect(monitoring.ReleaseType.MAJOR).toBe('major');
      expect(monitoring.ReleaseType.MINOR).toBe('minor');
    });

    test('should export FeatureFlagStatus constants', () => {
      expect(monitoring.FeatureFlagStatus.ENABLED).toBe('enabled');
      expect(monitoring.FeatureFlagStatus.DISABLED).toBe('disabled');
    });
  });

  describe('Incident Manager Integration', () => {
    test('should export Incident class', () => {
      const incident = new monitoring.Incident({
        title: 'Test Incident',
      });
      expect(incident.title).toBe('Test Incident');
    });

    test('should export Runbook class', () => {
      const runbook = new monitoring.Runbook({
        name: 'Test Runbook',
      });
      expect(runbook.name).toBe('Test Runbook');
    });

    test('should export RunbookExecution class', () => {
      const runbook = new monitoring.Runbook({ name: 'Test', steps: [] });
      const execution = new monitoring.RunbookExecution(runbook);
      expect(execution.status).toBe('running');
    });

    test('should export PostMortem class', () => {
      const incident = new monitoring.Incident({ title: 'Test' });
      const pm = new monitoring.PostMortem(incident);
      expect(pm.incidentId).toBe(incident.id);
    });

    test('should export IncidentManager class', () => {
      const manager = new monitoring.IncidentManager();
      expect(manager).toBeInstanceOf(monitoring.IncidentManager);
    });

    test('should export createIncidentManager factory', () => {
      const manager = monitoring.createIncidentManager();
      expect(manager).toBeInstanceOf(monitoring.IncidentManager);
    });

    test('should export IncidentSeverity constants', () => {
      expect(monitoring.IncidentSeverity.SEV1).toBe('sev1');
      expect(monitoring.IncidentSeverity.SEV2).toBe('sev2');
    });

    test('should export IncidentStatus constants', () => {
      expect(monitoring.IncidentStatus.DETECTED).toBe('detected');
      expect(monitoring.IncidentStatus.RESOLVED).toBe('resolved');
    });

    test('should export StepStatus constants', () => {
      expect(monitoring.StepStatus.PENDING).toBe('pending');
      expect(monitoring.StepStatus.COMPLETED).toBe('completed');
    });
  });

  describe('Integration Scenarios', () => {
    test('should create monitoring config with SLOs', () => {
      const config = monitoring.createMonitoringConfig({
        serviceName: 'api-gateway',
      });

      const slo = monitoring.SLOTemplates.API_AVAILABILITY(0.999);
      config.defineSLO(slo);

      expect(config.slos.size).toBe(1);
    });

    test('should create release with feature flags', () => {
      const manager = monitoring.createReleaseManager();

      const release = manager.createRelease({
        version: '2.0.0',
        type: monitoring.ReleaseType.MAJOR,
      });

      const flag = manager.createFeatureFlag({
        key: 'new-ui',
      });

      expect(release.version).toBe('2.0.0');
      expect(flag.key).toBe('new-ui');
    });

    test('should manage incident lifecycle', () => {
      const incidentManager = monitoring.createIncidentManager();

      const incident = incidentManager.createIncident({
        title: 'Service Down',
        severity: monitoring.IncidentSeverity.SEV1,
      });

      incidentManager.acknowledgeIncident(incident.id, 'alice');
      incidentManager.resolveIncident(incident.id, 'Restarted service');

      expect(incident.status).toBe(monitoring.IncidentStatus.RESOLVED);
    });

    test('should create post-mortem from incident', () => {
      const manager = monitoring.createIncidentManager();

      const incident = manager.createIncident({
        title: 'Database Outage',
        severity: monitoring.IncidentSeverity.SEV1,
      });
      incident.acknowledge('alice');
      incident.setResolution('Increased connection pool');

      const pm = manager.createPostMortem(incident.id);
      pm.addActionItem({ title: 'Add monitoring' });

      expect(pm.actionItems).toHaveLength(1);
    });
  });

  describe('SLI Class', () => {
    test('should generate Prometheus query for availability', () => {
      const sli = new monitoring.SLI({
        name: 'api-availability',
        type: monitoring.SLOType.AVAILABILITY,
        metric: 'http_requests',
      });
      const query = sli.toPrometheusQuery();
      expect(query).toContain('http_requests_success_total');
      expect(query).toContain('http_requests_total');
    });

    test('should generate Prometheus query for latency', () => {
      const sli = new monitoring.SLI({
        name: 'api-latency',
        type: monitoring.SLOType.LATENCY,
        metric: 'http_request_duration',
      });
      const query = sli.toPrometheusQuery();
      expect(query).toContain('histogram_quantile');
      expect(query).toContain('http_request_duration_bucket');
    });

    test('should generate Prometheus query for error rate', () => {
      const sli = new monitoring.SLI({
        name: 'error-rate',
        type: monitoring.SLOType.ERROR_RATE,
        metric: 'http_requests',
      });
      const query = sli.toPrometheusQuery();
      expect(query).toContain('http_requests_errors_total');
    });

    test('should generate Prometheus query for throughput', () => {
      const sli = new monitoring.SLI({
        name: 'throughput',
        type: monitoring.SLOType.THROUGHPUT,
        metric: 'requests',
      });
      const query = sli.toPrometheusQuery();
      expect(query).toContain('requests_total');
    });

    test('should use custom query for unknown type', () => {
      const sli = new monitoring.SLI({
        name: 'custom',
        type: 'custom-type',
        metric: 'custom_metric',
        goodEventsQuery: 'custom_good_events',
      });
      const query = sli.toPrometheusQuery();
      expect(query).toBe('custom_good_events');
    });

    test('should return metric for unknown type without custom query', () => {
      const sli = new monitoring.SLI({
        name: 'custom',
        type: 'custom-type',
        metric: 'custom_metric',
      });
      const query = sli.toPrometheusQuery();
      expect(query).toBe('custom_metric');
    });

    test('should convert to JSON', () => {
      const sli = new monitoring.SLI({
        name: 'test-sli',
        description: 'Test description',
        type: monitoring.SLOType.AVAILABILITY,
        metric: 'test_metric',
        unit: 'percent',
      });
      const json = sli.toJSON();
      expect(json.name).toBe('test-sli');
      expect(json.description).toBe('Test description');
      expect(json.type).toBe('availability');
      expect(json.unit).toBe('percent');
      expect(json.prometheusQuery).toBeDefined();
    });
  });

  describe('SLO Class', () => {
    test('should calculate error budget', () => {
      const slo = new monitoring.SLO({
        name: 'test-slo',
        sli: { name: 'test-sli', type: monitoring.SLOType.AVAILABILITY },
        target: 0.999,
      });
      const budget = slo.calculateErrorBudget();
      expect(budget.total).toBeCloseTo(0.001);
    });

    test('should generate burn rate alert', () => {
      const slo = new monitoring.SLO({
        name: 'api-slo',
        sli: { name: 'api-sli', type: monitoring.SLOType.AVAILABILITY, metric: 'http' },
        target: 0.999,
      });
      const alert = slo.toBurnRateAlert();
      expect(alert.name).toBe('api-slo_high_burn_rate');
      expect(alert.labels.severity).toBe('critical');
      expect(alert.labels.slo).toBe('api-slo');
    });

    test('should convert to JSON', () => {
      const slo = new monitoring.SLO({
        name: 'test-slo',
        description: 'Test SLO',
        sli: { name: 'test-sli', type: monitoring.SLOType.AVAILABILITY },
        target: 0.999,
        window: '7d',
      });
      const json = slo.toJSON();
      expect(json.name).toBe('test-slo');
      expect(json.target).toBe(0.999);
      expect(json.targetPercentage).toBe('99.90%');
      expect(json.window).toBe('7d');
      expect(json.errorBudget).toBeDefined();
      expect(json.burnRateAlert).toBeDefined();
    });

    test('should accept SLI instance', () => {
      const sli = new monitoring.SLI({ name: 'existing-sli' });
      const slo = new monitoring.SLO({
        name: 'test-slo',
        sli,
        target: 0.99,
      });
      expect(slo.sli).toBe(sli);
    });
  });

  describe('AlertRule Class', () => {
    test('should generate Prometheus YAML', () => {
      const rule = new monitoring.AlertRule({
        name: 'TestAlert',
        expr: 'up == 0',
        for: '2m',
        severity: monitoring.AlertSeverity.CRITICAL,
        labels: { team: 'platform' },
        annotations: {
          summary: 'Service is down',
          description: 'Instance is not responding',
        },
      });
      const yaml = rule.toPrometheusYAML();
      expect(yaml).toContain('- alert: TestAlert');
      expect(yaml).toContain('expr: up == 0');
      expect(yaml).toContain('for: 2m');
      expect(yaml).toContain('severity: critical');
      expect(yaml).toContain('team: platform');
      expect(yaml).toContain('Service is down');
    });

    test('should use default values', () => {
      const rule = new monitoring.AlertRule({
        name: 'SimpleAlert',
        expr: 'metric > 100',
      });
      expect(rule.for).toBe('5m');
      expect(rule.severity).toBe('warning');
    });

    test('should convert to JSON', () => {
      const rule = new monitoring.AlertRule({
        name: 'JsonAlert',
        expr: 'test > 0',
      });
      const json = rule.toJSON();
      expect(json.name).toBe('JsonAlert');
      expect(json.expr).toBe('test > 0');
    });
  });

  describe('HealthCheck Class', () => {
    test('should add dependency checks', () => {
      const check = new monitoring.HealthCheck({
        name: 'api-health',
        endpoint: '/health',
      });

      check.addCheck({
        name: 'database',
        type: 'dependency',
        critical: true,
        check: async () => ({ connected: true }),
      });

      expect(check.checks).toHaveLength(1);
      expect(check.checks[0].name).toBe('database');
    });

    test('should execute health checks successfully', async () => {
      const check = new monitoring.HealthCheck({
        name: 'test-health',
        timeout: 1000,
      });

      check.addCheck({
        name: 'fast-check',
        critical: true,
        check: async () => ({ status: 'ok' }),
      });

      const result = await check.execute();
      expect(result.status).toBe('healthy');
      expect(result.checks[0].status).toBe('healthy');
    });

    test('should handle unhealthy checks', async () => {
      const check = new monitoring.HealthCheck({
        name: 'test-health',
        timeout: 1000,
      });

      check.addCheck({
        name: 'failing-check',
        critical: true,
        check: async () => {
          throw new Error('Connection failed');
        },
      });

      const result = await check.execute();
      expect(result.status).toBe('unhealthy');
      expect(result.checks[0].status).toBe('unhealthy');
      expect(result.checks[0].error).toBe('Connection failed');
    });

    test('should handle timeout', async () => {
      const check = new monitoring.HealthCheck({
        name: 'test-health',
        timeout: 10,
      });

      check.addCheck({
        name: 'slow-check',
        critical: true,
        check: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { status: 'ok' };
        },
      });

      const result = await check.execute();
      expect(result.status).toBe('unhealthy');
      expect(result.checks[0].error).toBe('Timeout');
    });

    test('should generate Express handler', () => {
      const check = new monitoring.HealthCheck({
        name: 'api-health',
        endpoint: '/api/health',
      });
      const handler = check.toExpressHandler();
      expect(handler).toContain('/api/health');
      expect(handler).toContain('/api/health/live');
      expect(handler).toContain('/api/health/ready');
    });

    test('should convert to JSON', () => {
      const check = new monitoring.HealthCheck({
        name: 'test-health',
        endpoint: '/health',
        interval: 60000,
        timeout: 10000,
      });
      check.addCheck({ name: 'db', check: async () => true });

      const json = check.toJSON();
      expect(json.name).toBe('test-health');
      expect(json.endpoint).toBe('/health');
      expect(json.interval).toBe(60000);
      expect(json.checks).toHaveLength(1);
    });
  });

  describe('MonitoringConfig Class', () => {
    test('should define and list SLOs', () => {
      const config = new monitoring.MonitoringConfig({ serviceName: 'test' });

      config.defineSLO({
        name: 'slo-1',
        sli: { name: 'sli-1' },
        target: 0.99,
      });
      config.defineSLO({
        name: 'slo-2',
        sli: { name: 'sli-2' },
        target: 0.999,
      });

      expect(config.slos.size).toBe(2);
      expect(config.listSLOs()).toHaveLength(2);
    });

    test('should get specific SLO', () => {
      const config = new monitoring.MonitoringConfig({ serviceName: 'test' });
      config.defineSLO({ name: 'target-slo', sli: { name: 'sli' }, target: 0.99 });

      const slo = config.getSLO('target-slo');
      expect(slo).toBeDefined();
      expect(slo.name).toBe('target-slo');
    });

    test('should define and list alerts', () => {
      const config = new monitoring.MonitoringConfig({ serviceName: 'test' });

      config.defineAlert({ name: 'alert-1', expr: 'up == 0' });
      config.defineAlert({ name: 'alert-2', expr: 'latency > 1' });

      expect(config.alerts.size).toBe(2);
      expect(config.listAlerts()).toHaveLength(2);
    });

    test('should get specific alert', () => {
      const config = new monitoring.MonitoringConfig({ serviceName: 'test' });
      config.defineAlert({ name: 'target-alert', expr: 'up == 0' });

      const alert = config.getAlert('target-alert');
      expect(alert).toBeDefined();
      expect(alert.name).toBe('target-alert');
    });

    test('should define health checks', () => {
      const config = new monitoring.MonitoringConfig({ serviceName: 'test' });

      config.defineHealthCheck({ name: 'health-1', endpoint: '/health' });

      expect(config.healthChecks.size).toBe(1);
    });

    test('should get specific health check', () => {
      const config = new monitoring.MonitoringConfig({ serviceName: 'test' });
      config.defineHealthCheck({ name: 'my-health', endpoint: '/health' });

      const hc = config.getHealthCheck('my-health');
      expect(hc).toBeDefined();
      expect(hc.name).toBe('my-health');
    });

    test('should define metrics', () => {
      const config = new monitoring.MonitoringConfig({ serviceName: 'test' });

      config.defineMetric({
        name: 'request_count',
        type: monitoring.MetricType.COUNTER,
        help: 'Total requests',
        labels: ['method', 'path'],
      });

      expect(config.metrics.size).toBe(1);
      expect(config.metrics.get('request_count').type).toBe('counter');
    });

    test('should generate Prometheus config', () => {
      const config = new monitoring.MonitoringConfig({ serviceName: 'my-service' });

      config.defineSLO({
        name: 'availability',
        sli: { name: 'sli', type: monitoring.SLOType.AVAILABILITY, metric: 'http' },
        target: 0.999,
      });
      config.defineAlert({ name: 'custom-alert', expr: 'error > 10' });

      const promConfig = config.toPrometheusConfig();
      expect(promConfig.groups).toHaveLength(1);
      expect(promConfig.groups[0].name).toBe('my-service-alerts');
      expect(promConfig.groups[0].rules.length).toBeGreaterThan(0);
    });

    test('should generate Grafana dashboard', () => {
      const config = new monitoring.MonitoringConfig({ serviceName: 'dashboard-test' });

      config.defineSLO({
        name: 'test-slo',
        sli: { name: 'sli', type: monitoring.SLOType.AVAILABILITY },
        target: 0.99,
      });

      const dashboard = config.toGrafanaDashboard();
      expect(dashboard.title).toContain('dashboard-test');
      expect(dashboard.uid).toBe('dashboard-test-slo');
      expect(dashboard.panels.length).toBeGreaterThan(0);
      expect(dashboard.panels[0].type).toBe('gauge');
    });

    test('should convert to JSON', () => {
      const config = new monitoring.MonitoringConfig({
        serviceName: 'json-test',
        environment: 'staging',
      });

      config.defineSLO({ name: 'slo', sli: { name: 'sli' }, target: 0.99 });
      config.defineAlert({ name: 'alert', expr: 'up == 0' });
      config.defineHealthCheck({ name: 'health' });
      config.defineMetric({ name: 'metric' });

      const json = config.toJSON();
      expect(json.serviceName).toBe('json-test');
      expect(json.environment).toBe('staging');
      expect(json.slos).toHaveLength(1);
      expect(json.alerts).toHaveLength(1);
      expect(json.healthChecks).toHaveLength(1);
      expect(json.metrics).toHaveLength(1);
      expect(json.prometheus).toBeDefined();
      expect(json.grafana).toBeDefined();
    });

    test('should emit events on definitions', () => {
      const config = new monitoring.MonitoringConfig({ serviceName: 'event-test' });
      const events = [];

      config.on('sloAdded', slo => events.push(['slo', slo.name]));
      config.on('alertAdded', alert => events.push(['alert', alert.name]));
      config.on('healthCheckAdded', hc => events.push(['hc', hc.name]));

      config.defineSLO({ name: 'test-slo', sli: { name: 'sli' }, target: 0.99 });
      config.defineAlert({ name: 'test-alert', expr: 'up == 0' });
      config.defineHealthCheck({ name: 'test-hc' });

      expect(events).toHaveLength(3);
    });
  });

  describe('SLO Templates', () => {
    test('API_AVAILABILITY should create valid SLO', () => {
      const slo = monitoring.SLOTemplates.API_AVAILABILITY(0.9999);
      expect(slo.name).toBe('api-availability');
      expect(slo.target).toBe(0.9999);
      expect(slo.sli.type).toBe('availability');
    });

    test('API_LATENCY should create valid SLO with threshold', () => {
      const slo = monitoring.SLOTemplates.API_LATENCY(0.99, 100);
      expect(slo.name).toBe('api-latency');
      expect(slo.target).toBe(0.99);
      expect(slo.sli.type).toBe('latency');
    });

    test('ERROR_RATE should create valid SLO', () => {
      const slo = monitoring.SLOTemplates.ERROR_RATE(0.995);
      expect(slo.name).toBe('error-rate');
      expect(slo.target).toBe(0.995);
      expect(slo.window).toBe('7d');
    });
  });

  describe('Alert Templates', () => {
    test('HIGH_ERROR_RATE should create valid alert', () => {
      const alert = monitoring.AlertTemplates.HIGH_ERROR_RATE(0.1);
      expect(alert.name).toBe('HighErrorRate');
      expect(alert.severity).toBe('critical');
      expect(alert.expr).toContain('0.1');
    });

    test('HIGH_LATENCY should create valid alert', () => {
      const alert = monitoring.AlertTemplates.HIGH_LATENCY(300);
      expect(alert.name).toBe('HighLatency');
      expect(alert.severity).toBe('warning');
      expect(alert.expr).toContain('0.3');
    });

    test('SERVICE_DOWN should create valid alert', () => {
      const alert = monitoring.AlertTemplates.SERVICE_DOWN();
      expect(alert.name).toBe('ServiceDown');
      expect(alert.expr).toBe('up == 0');
      expect(alert.severity).toBe('critical');
    });

    test('HIGH_MEMORY should create valid alert', () => {
      const alert = monitoring.AlertTemplates.HIGH_MEMORY(0.85);
      expect(alert.name).toBe('HighMemoryUsage');
      expect(alert.expr).toContain('0.85');
    });
  });
});
