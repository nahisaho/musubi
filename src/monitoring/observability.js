/**
 * Observability Module - Logs, Metrics, and Traces
 * 
 * Provides unified observability capabilities:
 * - Structured logging
 * - Metrics collection
 * - Distributed tracing
 * - Correlation IDs
 */

const { EventEmitter } = require('events');

/**
 * Log Levels
 */
const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

/**
 * Log level priorities
 */
const LOG_PRIORITY = {
  [LogLevel.TRACE]: 0,
  [LogLevel.DEBUG]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.WARN]: 3,
  [LogLevel.ERROR]: 4,
  [LogLevel.FATAL]: 5
};

/**
 * Trace Status
 */
const TraceStatus = {
  OK: 'ok',
  ERROR: 'error',
  UNSET: 'unset'
};

/**
 * Span Kind
 */
const SpanKind = {
  INTERNAL: 'internal',
  SERVER: 'server',
  CLIENT: 'client',
  PRODUCER: 'producer',
  CONSUMER: 'consumer'
};

/**
 * Generate unique ID
 */
function generateId(length = 16) {
  let result = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Structured Logger
 */
class Logger extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'default';
    this.level = options.level || LogLevel.INFO;
    this.context = options.context || {};
    this.outputs = options.outputs || [new ConsoleOutput()];
    this.parent = options.parent || null;
  }

  /**
   * Create a child logger with additional context
   */
  child(context) {
    return new Logger({
      name: this.name,
      level: this.level,
      context: { ...this.context, ...context },
      outputs: this.outputs,
      parent: this
    });
  }

  /**
   * Check if a level is enabled
   */
  isLevelEnabled(level) {
    return LOG_PRIORITY[level] >= LOG_PRIORITY[this.level];
  }

  /**
   * Log at a specific level
   */
  log(level, message, meta = {}) {
    if (!this.isLevelEnabled(level)) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      logger: this.name,
      message,
      ...this.context,
      ...meta
    };

    for (const output of this.outputs) {
      output.write(entry);
    }

    this.emit('log', entry);
  }

  trace(message, meta) { this.log(LogLevel.TRACE, message, meta); }
  debug(message, meta) { this.log(LogLevel.DEBUG, message, meta); }
  info(message, meta) { this.log(LogLevel.INFO, message, meta); }
  warn(message, meta) { this.log(LogLevel.WARN, message, meta); }
  error(message, meta) { this.log(LogLevel.ERROR, message, meta); }
  fatal(message, meta) { this.log(LogLevel.FATAL, message, meta); }

  /**
   * Add an output
   */
  addOutput(output) {
    this.outputs.push(output);
    return this;
  }

  /**
   * Set log level
   */
  setLevel(level) {
    this.level = level;
    return this;
  }
}

/**
 * Console output for logger
 */
class ConsoleOutput {
  constructor(options = {}) {
    this.format = options.format || 'json';
    this.pretty = options.pretty || false;
  }

  write(entry) {
    if (this.format === 'json') {
      const output = this.pretty 
        ? JSON.stringify(entry, null, 2)
        : JSON.stringify(entry);
      
      if (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
        console.error(output);
      } else if (entry.level === LogLevel.WARN) {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      const timestamp = entry.timestamp;
      const level = entry.level.toUpperCase().padEnd(5);
      console.log(`${timestamp} [${level}] ${entry.message}`);
    }
  }
}

/**
 * File output for logger
 */
class FileOutput {
  constructor(options = {}) {
    this.path = options.path || 'app.log';
    this.buffer = [];
    this.bufferSize = options.bufferSize || 100;
  }

  write(entry) {
    this.buffer.push(JSON.stringify(entry) + '\n');
    
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  flush() {
    // In real implementation, would write to file
    this.buffer = [];
  }

  getBuffer() {
    return [...this.buffer];
  }
}

/**
 * Metric Collector
 */
class MetricsCollector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'default';
    this.prefix = options.prefix || '';
    this.metrics = new Map();
    this.labels = options.labels || {};
  }

  /**
   * Format metric name
   */
  _formatName(name) {
    return this.prefix ? `${this.prefix}_${name}` : name;
  }

  /**
   * Create or get a counter
   */
  counter(name, help = '') {
    const fullName = this._formatName(name);
    if (!this.metrics.has(fullName)) {
      this.metrics.set(fullName, {
        type: 'counter',
        name: fullName,
        help,
        values: new Map()
      });
    }
    return new CounterMetric(this.metrics.get(fullName), this.labels);
  }

  /**
   * Create or get a gauge
   */
  gauge(name, help = '') {
    const fullName = this._formatName(name);
    if (!this.metrics.has(fullName)) {
      this.metrics.set(fullName, {
        type: 'gauge',
        name: fullName,
        help,
        values: new Map()
      });
    }
    return new GaugeMetric(this.metrics.get(fullName), this.labels);
  }

  /**
   * Create or get a histogram
   */
  histogram(name, help = '', buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]) {
    const fullName = this._formatName(name);
    if (!this.metrics.has(fullName)) {
      this.metrics.set(fullName, {
        type: 'histogram',
        name: fullName,
        help,
        buckets,
        values: new Map()
      });
    }
    return new HistogramMetric(this.metrics.get(fullName), this.labels);
  }

  /**
   * Export metrics in Prometheus format
   */
  toPrometheus() {
    let output = '';

    for (const metric of this.metrics.values()) {
      output += `# HELP ${metric.name} ${metric.help}\n`;
      output += `# TYPE ${metric.name} ${metric.type}\n`;

      if (metric.type === 'histogram') {
        for (const [labelsKey, data] of metric.values) {
          const labels = labelsKey ? `{${labelsKey}}` : '';
          for (let i = 0; i < metric.buckets.length; i++) {
            output += `${metric.name}_bucket{le="${metric.buckets[i]}"${labelsKey ? ',' + labelsKey : ''}} ${data.buckets[i]}\n`;
          }
          output += `${metric.name}_bucket{le="+Inf"${labelsKey ? ',' + labelsKey : ''}} ${data.count}\n`;
          output += `${metric.name}_sum${labels} ${data.sum}\n`;
          output += `${metric.name}_count${labels} ${data.count}\n`;
        }
      } else {
        for (const [labelsKey, value] of metric.values) {
          const labels = labelsKey ? `{${labelsKey}}` : '';
          output += `${metric.name}${labels} ${value}\n`;
        }
      }
    }

    return output;
  }

  /**
   * Export metrics as JSON
   */
  toJSON() {
    const result = [];

    for (const metric of this.metrics.values()) {
      const metricData = {
        name: metric.name,
        type: metric.type,
        help: metric.help,
        values: []
      };

      for (const [labelsKey, value] of metric.values) {
        metricData.values.push({
          labels: labelsKey,
          value: metric.type === 'histogram' ? { ...value } : value
        });
      }

      result.push(metricData);
    }

    return result;
  }
}

/**
 * Counter metric
 */
class CounterMetric {
  constructor(metric, defaultLabels = {}) {
    this.metric = metric;
    this.defaultLabels = defaultLabels;
  }

  _labelKey(labels = {}) {
    const all = { ...this.defaultLabels, ...labels };
    return Object.entries(all)
      .map(([k, v]) => `${k}="${v}"`)
      .sort()
      .join(',');
  }

  inc(labels = {}, value = 1) {
    const key = this._labelKey(labels);
    const current = this.metric.values.get(key) || 0;
    this.metric.values.set(key, current + value);
    return this;
  }

  get(labels = {}) {
    const key = this._labelKey(labels);
    return this.metric.values.get(key) || 0;
  }
}

/**
 * Gauge metric
 */
class GaugeMetric {
  constructor(metric, defaultLabels = {}) {
    this.metric = metric;
    this.defaultLabels = defaultLabels;
  }

  _labelKey(labels = {}) {
    const all = { ...this.defaultLabels, ...labels };
    return Object.entries(all)
      .map(([k, v]) => `${k}="${v}"`)
      .sort()
      .join(',');
  }

  set(value, labels = {}) {
    const key = this._labelKey(labels);
    this.metric.values.set(key, value);
    return this;
  }

  inc(labels = {}, value = 1) {
    const key = this._labelKey(labels);
    const current = this.metric.values.get(key) || 0;
    this.metric.values.set(key, current + value);
    return this;
  }

  dec(labels = {}, value = 1) {
    return this.inc(labels, -value);
  }

  get(labels = {}) {
    const key = this._labelKey(labels);
    return this.metric.values.get(key) || 0;
  }
}

/**
 * Histogram metric
 */
class HistogramMetric {
  constructor(metric, defaultLabels = {}) {
    this.metric = metric;
    this.defaultLabels = defaultLabels;
  }

  _labelKey(labels = {}) {
    const all = { ...this.defaultLabels, ...labels };
    return Object.entries(all)
      .map(([k, v]) => `${k}="${v}"`)
      .sort()
      .join(',');
  }

  observe(value, labels = {}) {
    const key = this._labelKey(labels);
    let data = this.metric.values.get(key);
    
    if (!data) {
      data = {
        buckets: this.metric.buckets.map(() => 0),
        sum: 0,
        count: 0
      };
      this.metric.values.set(key, data);
    }

    data.sum += value;
    data.count += 1;

    for (let i = 0; i < this.metric.buckets.length; i++) {
      if (value <= this.metric.buckets[i]) {
        data.buckets[i] += 1;
      }
    }

    return this;
  }

  get(labels = {}) {
    const key = this._labelKey(labels);
    return this.metric.values.get(key) || { buckets: [], sum: 0, count: 0 };
  }
}

/**
 * Span for distributed tracing
 */
class Span {
  constructor(options) {
    this.traceId = options.traceId || generateId(32);
    this.spanId = options.spanId || generateId(16);
    this.parentSpanId = options.parentSpanId || null;
    this.name = options.name;
    this.kind = options.kind || SpanKind.INTERNAL;
    this.startTime = options.startTime || Date.now();
    this.endTime = null;
    this.status = TraceStatus.UNSET;
    this.statusMessage = '';
    this.attributes = options.attributes || {};
    this.events = [];
    this.links = options.links || [];
  }

  /**
   * Set an attribute
   */
  setAttribute(key, value) {
    this.attributes[key] = value;
    return this;
  }

  /**
   * Set multiple attributes
   */
  setAttributes(attributes) {
    Object.assign(this.attributes, attributes);
    return this;
  }

  /**
   * Add an event
   */
  addEvent(name, attributes = {}) {
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes
    });
    return this;
  }

  /**
   * Set status
   */
  setStatus(status, message = '') {
    this.status = status;
    this.statusMessage = message;
    return this;
  }

  /**
   * End the span
   */
  end() {
    this.endTime = Date.now();
    return this;
  }

  /**
   * Get duration in milliseconds
   */
  getDuration() {
    if (!this.endTime) return null;
    return this.endTime - this.startTime;
  }

  /**
   * Get span context for propagation
   */
  getContext() {
    return {
      traceId: this.traceId,
      spanId: this.spanId
    };
  }

  toJSON() {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      name: this.name,
      kind: this.kind,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.getDuration(),
      status: this.status,
      statusMessage: this.statusMessage,
      attributes: this.attributes,
      events: this.events,
      links: this.links
    };
  }
}

/**
 * Tracer for distributed tracing
 */
class Tracer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.serviceName = options.serviceName || 'unknown';
    this.version = options.version || '1.0.0';
    this.spans = [];
    this.exporters = options.exporters || [];
  }

  /**
   * Start a new span
   */
  startSpan(name, options = {}) {
    const span = new Span({
      traceId: options.traceId,
      parentSpanId: options.parentSpanId,
      name,
      kind: options.kind,
      attributes: {
        'service.name': this.serviceName,
        'service.version': this.version,
        ...options.attributes
      },
      links: options.links
    });

    this.spans.push(span);
    this.emit('spanStarted', span);
    return span;
  }

  /**
   * Create a child span
   */
  startChildSpan(parent, name, options = {}) {
    return this.startSpan(name, {
      traceId: parent.traceId,
      parentSpanId: parent.spanId,
      ...options
    });
  }

  /**
   * End and export a span
   */
  endSpan(span) {
    span.end();
    this.emit('spanEnded', span);
    
    for (const exporter of this.exporters) {
      exporter.export(span);
    }
    
    return span;
  }

  /**
   * Get all spans for a trace
   */
  getTrace(traceId) {
    return this.spans.filter(s => s.traceId === traceId);
  }

  /**
   * Add an exporter
   */
  addExporter(exporter) {
    this.exporters.push(exporter);
    return this;
  }

  /**
   * Get all spans
   */
  getAllSpans() {
    return this.spans.map(s => s.toJSON());
  }
}

/**
 * Console exporter for traces
 */
class ConsoleExporter {
  constructor(options = {}) {
    this.format = options.format || 'json';
  }

  export(span) {
    if (this.format === 'json') {
      console.log(JSON.stringify(span.toJSON()));
    } else {
      const duration = span.getDuration() || 0;
      console.log(`[${span.traceId.slice(0, 8)}] ${span.name} (${duration}ms) - ${span.status}`);
    }
  }
}

/**
 * Memory exporter for testing
 */
class MemoryExporter {
  constructor() {
    this.spans = [];
  }

  export(span) {
    this.spans.push(span.toJSON());
  }

  getSpans() {
    return this.spans;
  }

  clear() {
    this.spans = [];
  }
}

/**
 * Context propagation for correlation
 */
class CorrelationContext {
  constructor() {
    this.values = new Map();
  }

  /**
   * Set a value
   */
  set(key, value) {
    this.values.set(key, value);
    return this;
  }

  /**
   * Get a value
   */
  get(key) {
    return this.values.get(key);
  }

  /**
   * Check if key exists
   */
  has(key) {
    return this.values.has(key);
  }

  /**
   * Get all values
   */
  getAll() {
    return Object.fromEntries(this.values);
  }

  /**
   * Create headers for HTTP propagation
   */
  toHeaders() {
    const headers = {};
    
    if (this.has('traceId')) {
      headers['x-trace-id'] = this.get('traceId');
    }
    if (this.has('spanId')) {
      headers['x-span-id'] = this.get('spanId');
    }
    if (this.has('correlationId')) {
      headers['x-correlation-id'] = this.get('correlationId');
    }
    
    return headers;
  }

  /**
   * Create from headers
   */
  static fromHeaders(headers) {
    const ctx = new CorrelationContext();
    
    if (headers['x-trace-id']) {
      ctx.set('traceId', headers['x-trace-id']);
    }
    if (headers['x-span-id']) {
      ctx.set('spanId', headers['x-span-id']);
    }
    if (headers['x-correlation-id']) {
      ctx.set('correlationId', headers['x-correlation-id']);
    }
    
    return ctx;
  }
}

/**
 * Unified Observability Provider
 */
class ObservabilityProvider extends EventEmitter {
  constructor(options = {}) {
    super();
    this.serviceName = options.serviceName || 'musubi-service';
    this.version = options.version || '1.0.0';
    
    this.logger = new Logger({
      name: this.serviceName,
      level: options.logLevel || LogLevel.INFO
    });
    
    this.metrics = new MetricsCollector({
      name: this.serviceName,
      prefix: options.metricsPrefix || ''
    });
    
    this.tracer = new Tracer({
      serviceName: this.serviceName,
      version: this.version
    });
    
    // Standard metrics
    this._setupStandardMetrics();
  }

  /**
   * Setup standard metrics
   */
  _setupStandardMetrics() {
    // Request metrics
    this.requestCounter = this.metrics.counter('http_requests_total', 'Total HTTP requests');
    this.requestDuration = this.metrics.histogram('http_request_duration_seconds', 'HTTP request duration');
    this.requestErrors = this.metrics.counter('http_request_errors_total', 'Total HTTP errors');
    
    // Resource metrics
    this.activeConnections = this.metrics.gauge('active_connections', 'Active connections');
  }

  /**
   * Get the logger
   */
  getLogger(name) {
    return this.logger.child({ component: name });
  }

  /**
   * Get the metrics collector
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Get the tracer
   */
  getTracer() {
    return this.tracer;
  }

  /**
   * Start a traced operation
   */
  trace(name, fn, options = {}) {
    const span = this.tracer.startSpan(name, options);
    
    try {
      const result = fn(span);
      
      if (result && typeof result.then === 'function') {
        return result
          .then(r => {
            span.setStatus(TraceStatus.OK);
            this.tracer.endSpan(span);
            return r;
          })
          .catch(err => {
            span.setStatus(TraceStatus.ERROR, err.message);
            span.addEvent('exception', {
              'exception.type': err.name,
              'exception.message': err.message
            });
            this.tracer.endSpan(span);
            throw err;
          });
      }
      
      span.setStatus(TraceStatus.OK);
      this.tracer.endSpan(span);
      return result;
    } catch (err) {
      span.setStatus(TraceStatus.ERROR, err.message);
      span.addEvent('exception', {
        'exception.type': err.name,
        'exception.message': err.message
      });
      this.tracer.endSpan(span);
      throw err;
    }
  }

  /**
   * Record an HTTP request
   */
  recordRequest(method, path, statusCode, duration) {
    const labels = { method, path, status_code: statusCode.toString() };
    
    this.requestCounter.inc(labels);
    this.requestDuration.observe(duration / 1000, { method, path }); // Convert to seconds
    
    if (statusCode >= 400) {
      this.requestErrors.inc(labels);
    }
  }

  /**
   * Export all telemetry data
   */
  exportTelemetry() {
    return {
      service: {
        name: this.serviceName,
        version: this.version
      },
      metrics: this.metrics.toJSON(),
      traces: this.tracer.getAllSpans()
    };
  }
}

/**
 * Create a logger
 */
function createLogger(options = {}) {
  return new Logger(options);
}

/**
 * Create a metrics collector
 */
function createMetricsCollector(options = {}) {
  return new MetricsCollector(options);
}

/**
 * Create a tracer
 */
function createTracer(options = {}) {
  return new Tracer(options);
}

/**
 * Create an observability provider
 */
function createObservability(options = {}) {
  return new ObservabilityProvider(options);
}

module.exports = {
  // Classes
  Logger,
  ConsoleOutput,
  FileOutput,
  MetricsCollector,
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  Span,
  Tracer,
  ConsoleExporter,
  MemoryExporter,
  CorrelationContext,
  ObservabilityProvider,
  
  // Constants
  LogLevel,
  TraceStatus,
  SpanKind,
  
  // Factories
  createLogger,
  createMetricsCollector,
  createTracer,
  createObservability,
  
  // Utilities
  generateId
};
