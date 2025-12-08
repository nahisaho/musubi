/**
 * Monitoring Module - SRE, Observability, and Release Management
 * 
 * Provides monitoring capabilities for MUSUBI-powered applications:
 * - SLI/SLO definition and tracking
 * - Alerting rules generation
 * - Dashboard templates
 * - Health check patterns
 */

const { EventEmitter } = require('events');

/**
 * SLO Types
 */
const SLOType = {
  AVAILABILITY: 'availability',
  LATENCY: 'latency',
  THROUGHPUT: 'throughput',
  ERROR_RATE: 'error-rate',
  CORRECTNESS: 'correctness'
};

/**
 * Alert Severity
 */
const AlertSeverity = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Metric Type
 */
const MetricType = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  SUMMARY: 'summary'
};

/**
 * SLI (Service Level Indicator) definition
 */
class SLI {
  constructor(options) {
    this.name = options.name;
    this.description = options.description || '';
    this.type = options.type || SLOType.AVAILABILITY;
    this.metric = options.metric;
    this.unit = options.unit || '';
    this.goodEventsQuery = options.goodEventsQuery || null;
    this.totalEventsQuery = options.totalEventsQuery || null;
    this.threshold = options.threshold || null;
  }

  /**
   * Generate Prometheus query for this SLI
   */
  toPrometheusQuery() {
    switch (this.type) {
      case SLOType.AVAILABILITY:
        return `sum(rate(${this.metric}_success_total[5m])) / sum(rate(${this.metric}_total[5m]))`;
      
      case SLOType.LATENCY:
        return `histogram_quantile(0.95, sum(rate(${this.metric}_bucket[5m])) by (le))`;
      
      case SLOType.ERROR_RATE:
        return `sum(rate(${this.metric}_errors_total[5m])) / sum(rate(${this.metric}_total[5m]))`;
      
      case SLOType.THROUGHPUT:
        return `sum(rate(${this.metric}_total[5m]))`;
      
      default:
        return this.goodEventsQuery || this.metric;
    }
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      type: this.type,
      metric: this.metric,
      unit: this.unit,
      prometheusQuery: this.toPrometheusQuery()
    };
  }
}

/**
 * SLO (Service Level Objective) definition
 */
class SLO {
  constructor(options) {
    this.name = options.name;
    this.description = options.description || '';
    this.sli = options.sli instanceof SLI ? options.sli : new SLI(options.sli);
    this.target = options.target; // e.g., 0.999 for 99.9%
    this.window = options.window || '30d'; // Measurement window
    this.burnRateThresholds = options.burnRateThresholds || {
      critical: 14.4, // 1 hour to exhaust error budget
      warning: 6      // 6 hours to exhaust error budget
    };
  }

  /**
   * Calculate error budget
   */
  calculateErrorBudget() {
    return {
      total: 1 - this.target,
      remaining: null, // Calculated at runtime
      consumptionRate: null
    };
  }

  /**
   * Generate burn rate alert rule
   */
  toBurnRateAlert() {
    const shortWindow = '5m';
    const longWindow = '1h';
    
    return {
      name: `${this.name}_high_burn_rate`,
      expr: `(
        ${this.sli.toPrometheusQuery()}
      ) < ${this.target - ((1 - this.target) * this.burnRateThresholds.critical)}`,
      for: shortWindow,
      labels: {
        severity: AlertSeverity.CRITICAL,
        slo: this.name
      },
      annotations: {
        summary: `High burn rate on SLO: ${this.name}`,
        description: `Error budget will be exhausted within 1 hour at current rate`
      }
    };
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      sli: this.sli.toJSON(),
      target: this.target,
      targetPercentage: `${(this.target * 100).toFixed(2)}%`,
      window: this.window,
      errorBudget: this.calculateErrorBudget(),
      burnRateAlert: this.toBurnRateAlert()
    };
  }
}

/**
 * Alert Rule definition
 */
class AlertRule {
  constructor(options) {
    this.name = options.name;
    this.expr = options.expr;
    this.for = options.for || '5m';
    this.severity = options.severity || AlertSeverity.WARNING;
    this.labels = options.labels || {};
    this.annotations = options.annotations || {};
  }

  /**
   * Generate Prometheus alert rule YAML
   */
  toPrometheusYAML() {
    return `- alert: ${this.name}
  expr: ${this.expr}
  for: ${this.for}
  labels:
    severity: ${this.severity}
${Object.entries(this.labels).map(([k, v]) => `    ${k}: ${v}`).join('\n')}
  annotations:
    summary: "${this.annotations.summary || this.name}"
    description: "${this.annotations.description || ''}"`;
  }

  toJSON() {
    return {
      name: this.name,
      expr: this.expr,
      for: this.for,
      severity: this.severity,
      labels: this.labels,
      annotations: this.annotations
    };
  }
}

/**
 * Health Check definition
 */
class HealthCheck {
  constructor(options) {
    this.name = options.name;
    this.endpoint = options.endpoint || '/health';
    this.interval = options.interval || 30000; // 30 seconds
    this.timeout = options.timeout || 5000;
    this.checks = options.checks || [];
  }

  /**
   * Add a dependency check
   */
  addCheck(check) {
    this.checks.push({
      name: check.name,
      type: check.type || 'dependency',
      critical: check.critical !== false,
      check: check.check
    });
    return this;
  }

  /**
   * Generate health check response
   */
  async execute() {
    const results = [];
    let healthy = true;

    for (const check of this.checks) {
      try {
        const startTime = Date.now();
        const checkResult = await Promise.race([
          check.check(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), this.timeout)
          )
        ]);
        
        results.push({
          name: check.name,
          status: 'healthy',
          latency: Date.now() - startTime,
          details: checkResult
        });
      } catch (error) {
        results.push({
          name: check.name,
          status: 'unhealthy',
          error: error.message
        });
        if (check.critical) healthy = false;
      }
    }

    return {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: results
    };
  }

  /**
   * Generate Express.js health endpoint handler
   */
  toExpressHandler() {
    const check = this;
    return `
app.get('${this.endpoint}', async (req, res) => {
  const health = await healthCheck.execute();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('${this.endpoint}/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('${this.endpoint}/ready', async (req, res) => {
  const health = await healthCheck.execute();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});`;
  }

  toJSON() {
    return {
      name: this.name,
      endpoint: this.endpoint,
      interval: this.interval,
      timeout: this.timeout,
      checks: this.checks.map(c => ({
        name: c.name,
        type: c.type,
        critical: c.critical
      }))
    };
  }
}

/**
 * Monitoring Configuration
 */
class MonitoringConfig extends EventEmitter {
  constructor(options = {}) {
    super();
    this.serviceName = options.serviceName || 'musubi-service';
    this.environment = options.environment || 'production';
    this.slos = new Map();
    this.alerts = new Map();
    this.healthChecks = new Map();
    this.metrics = new Map();
  }

  /**
   * Define an SLO
   */
  defineSLO(slo) {
    const sloInstance = slo instanceof SLO ? slo : new SLO(slo);
    this.slos.set(sloInstance.name, sloInstance);
    this.emit('sloAdded', sloInstance);
    return this;
  }

  /**
   * Get an SLO
   */
  getSLO(name) {
    return this.slos.get(name);
  }

  /**
   * List all SLOs
   */
  listSLOs() {
    return [...this.slos.values()].map(s => s.toJSON());
  }

  /**
   * Define an alert rule
   */
  defineAlert(alert) {
    const alertInstance = alert instanceof AlertRule ? alert : new AlertRule(alert);
    this.alerts.set(alertInstance.name, alertInstance);
    this.emit('alertAdded', alertInstance);
    return this;
  }

  /**
   * Get an alert
   */
  getAlert(name) {
    return this.alerts.get(name);
  }

  /**
   * List all alerts
   */
  listAlerts() {
    return [...this.alerts.values()].map(a => a.toJSON());
  }

  /**
   * Define a health check
   */
  defineHealthCheck(healthCheck) {
    const hcInstance = healthCheck instanceof HealthCheck 
      ? healthCheck 
      : new HealthCheck(healthCheck);
    this.healthChecks.set(hcInstance.name, hcInstance);
    this.emit('healthCheckAdded', hcInstance);
    return this;
  }

  /**
   * Get a health check
   */
  getHealthCheck(name) {
    return this.healthChecks.get(name);
  }

  /**
   * Define a metric
   */
  defineMetric(metric) {
    this.metrics.set(metric.name, {
      name: metric.name,
      type: metric.type || MetricType.COUNTER,
      help: metric.help || '',
      labels: metric.labels || []
    });
    return this;
  }

  /**
   * Generate Prometheus metrics configuration
   */
  toPrometheusConfig() {
    const rules = [];
    
    // Generate SLO-based alerts
    for (const slo of this.slos.values()) {
      rules.push(slo.toBurnRateAlert());
    }
    
    // Add custom alerts
    for (const alert of this.alerts.values()) {
      rules.push(alert.toJSON());
    }

    return {
      groups: [{
        name: `${this.serviceName}-alerts`,
        rules
      }]
    };
  }

  /**
   * Generate Grafana dashboard JSON
   */
  toGrafanaDashboard() {
    const panels = [];
    let y = 0;

    // SLO panels
    for (const slo of this.slos.values()) {
      panels.push({
        id: panels.length + 1,
        type: 'gauge',
        title: slo.name,
        gridPos: { x: 0, y, w: 8, h: 6 },
        targets: [{
          expr: slo.sli.toPrometheusQuery(),
          legendFormat: slo.name
        }],
        fieldConfig: {
          defaults: {
            thresholds: {
              mode: 'absolute',
              steps: [
                { color: 'red', value: null },
                { color: 'yellow', value: slo.target - 0.01 },
                { color: 'green', value: slo.target }
              ]
            },
            min: 0,
            max: 1,
            unit: 'percentunit'
          }
        }
      });
      y += 6;
    }

    return {
      title: `${this.serviceName} SLO Dashboard`,
      uid: `${this.serviceName}-slo`,
      tags: ['slo', 'sre', this.serviceName],
      timezone: 'browser',
      panels,
      refresh: '30s',
      time: { from: 'now-24h', to: 'now' }
    };
  }

  /**
   * Generate complete monitoring configuration
   */
  toJSON() {
    return {
      serviceName: this.serviceName,
      environment: this.environment,
      slos: this.listSLOs(),
      alerts: this.listAlerts(),
      healthChecks: [...this.healthChecks.values()].map(h => h.toJSON()),
      metrics: [...this.metrics.values()],
      prometheus: this.toPrometheusConfig(),
      grafana: this.toGrafanaDashboard()
    };
  }
}

/**
 * Pre-defined SLO templates
 */
const SLOTemplates = {
  /**
   * API Availability SLO
   */
  API_AVAILABILITY: (target = 0.999) => new SLO({
    name: 'api-availability',
    description: 'API endpoint availability',
    sli: {
      name: 'api-success-rate',
      type: SLOType.AVAILABILITY,
      metric: 'http_requests'
    },
    target,
    window: '30d'
  }),

  /**
   * API Latency SLO
   */
  API_LATENCY: (target = 0.95, thresholdMs = 200) => new SLO({
    name: 'api-latency',
    description: `95th percentile latency under ${thresholdMs}ms`,
    sli: {
      name: 'api-response-time',
      type: SLOType.LATENCY,
      metric: 'http_request_duration_seconds',
      threshold: thresholdMs / 1000
    },
    target,
    window: '30d'
  }),

  /**
   * Error Rate SLO
   */
  ERROR_RATE: (target = 0.99) => new SLO({
    name: 'error-rate',
    description: 'Low error rate objective',
    sli: {
      name: 'error-rate-indicator',
      type: SLOType.ERROR_RATE,
      metric: 'http_requests'
    },
    target,
    window: '7d'
  })
};

/**
 * Pre-defined Alert templates
 */
const AlertTemplates = {
  /**
   * High Error Rate Alert
   */
  HIGH_ERROR_RATE: (threshold = 0.05) => new AlertRule({
    name: 'HighErrorRate',
    expr: `sum(rate(http_requests_errors_total[5m])) / sum(rate(http_requests_total[5m])) > ${threshold}`,
    for: '5m',
    severity: AlertSeverity.CRITICAL,
    annotations: {
      summary: 'High error rate detected',
      description: `Error rate is above ${threshold * 100}%`
    }
  }),

  /**
   * High Latency Alert
   */
  HIGH_LATENCY: (thresholdMs = 500) => new AlertRule({
    name: 'HighLatency',
    expr: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > ${thresholdMs / 1000}`,
    for: '5m',
    severity: AlertSeverity.WARNING,
    annotations: {
      summary: 'High latency detected',
      description: `P95 latency is above ${thresholdMs}ms`
    }
  }),

  /**
   * Service Down Alert
   */
  SERVICE_DOWN: () => new AlertRule({
    name: 'ServiceDown',
    expr: 'up == 0',
    for: '1m',
    severity: AlertSeverity.CRITICAL,
    annotations: {
      summary: 'Service is down',
      description: 'Service instance is not responding'
    }
  }),

  /**
   * High Memory Usage Alert
   */
  HIGH_MEMORY: (threshold = 0.9) => new AlertRule({
    name: 'HighMemoryUsage',
    expr: `process_resident_memory_bytes / node_memory_MemTotal_bytes > ${threshold}`,
    for: '5m',
    severity: AlertSeverity.WARNING,
    annotations: {
      summary: 'High memory usage',
      description: `Memory usage is above ${threshold * 100}%`
    }
  })
};

/**
 * Create a monitoring configuration
 */
function createMonitoringConfig(options = {}) {
  return new MonitoringConfig(options);
}

// Import sub-modules
const releaseManagerModule = require('./release-manager');
const incidentManagerModule = require('./incident-manager');
const observabilityModule = require('./observability');

module.exports = {
  // Classes
  SLI,
  SLO,
  AlertRule,
  HealthCheck,
  MonitoringConfig,
  
  // Constants
  SLOType,
  AlertSeverity,
  MetricType,
  
  // Templates
  SLOTemplates,
  AlertTemplates,
  
  // Factory
  createMonitoringConfig,
  
  // Release Manager
  ...releaseManagerModule,
  
  // Incident Manager
  ...incidentManagerModule,
  
  // Observability
  ...observabilityModule
};
