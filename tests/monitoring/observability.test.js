/**
 * Tests for Observability Module
 */

const {
  Logger,
  ConsoleOutput,
  FileOutput,
  MetricsCollector,
  Span,
  Tracer,
  MemoryExporter,
  CorrelationContext,
  ObservabilityProvider,
  LogLevel,
  TraceStatus,
  SpanKind,
  createLogger,
  createMetricsCollector,
  createTracer,
  createObservability,
  generateId
} = require('../../src/monitoring/observability');

describe('Observability Module', () => {
  describe('Logger', () => {
    let logger;
    let output;

    beforeEach(() => {
      output = new FileOutput();
      logger = new Logger({
        name: 'test-logger',
        level: LogLevel.DEBUG,
        outputs: [output]
      });
    });

    test('should create logger with defaults', () => {
      const log = createLogger({ name: 'my-app' });
      expect(log.name).toBe('my-app');
      expect(log.level).toBe(LogLevel.INFO);
    });

    test('should log at different levels', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      const buffer = output.getBuffer();
      expect(buffer).toHaveLength(4);
    });

    test('should respect log level', () => {
      logger.setLevel(LogLevel.WARN);
      
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');

      const buffer = output.getBuffer();
      expect(buffer).toHaveLength(2); // Only warn and error
    });

    test('should include context in logs', () => {
      logger.context = { requestId: '123' };
      logger.info('Test message');

      const buffer = output.getBuffer();
      const entry = JSON.parse(buffer[0]);
      expect(entry.requestId).toBe('123');
    });

    test('should include meta in logs', () => {
      logger.info('Test message', { userId: 'user-1' });

      const buffer = output.getBuffer();
      const entry = JSON.parse(buffer[0]);
      expect(entry.userId).toBe('user-1');
    });

    test('should create child logger with additional context', () => {
      const child = logger.child({ component: 'auth' });
      child.info('Child message');

      const buffer = output.getBuffer();
      const entry = JSON.parse(buffer[0]);
      expect(entry.component).toBe('auth');
    });

    test('should check if level is enabled', () => {
      logger.setLevel(LogLevel.WARN);

      expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(false);
      expect(logger.isLevelEnabled(LogLevel.INFO)).toBe(false);
      expect(logger.isLevelEnabled(LogLevel.WARN)).toBe(true);
      expect(logger.isLevelEnabled(LogLevel.ERROR)).toBe(true);
    });

    test('should emit events on log', (done) => {
      logger.on('log', (entry) => {
        expect(entry.message).toBe('Event test');
        done();
      });

      logger.info('Event test');
    });
  });

  describe('FileOutput', () => {
    test('should buffer log entries', () => {
      const output = new FileOutput({ bufferSize: 10 });

      for (let i = 0; i < 5; i++) {
        output.write({ message: `Log ${i}` });
      }

      expect(output.getBuffer()).toHaveLength(5);
    });

    test('should flush when buffer is full', () => {
      const output = new FileOutput({ bufferSize: 3 });

      for (let i = 0; i < 5; i++) {
        output.write({ message: `Log ${i}` });
      }

      // Buffer should be flushed and contain only remaining entries
      expect(output.getBuffer().length).toBeLessThan(5);
    });
  });

  describe('MetricsCollector', () => {
    let metrics;

    beforeEach(() => {
      metrics = createMetricsCollector({
        name: 'test-metrics',
        prefix: 'app'
      });
    });

    test('should create counter', () => {
      const counter = metrics.counter('requests', 'Total requests');
      counter.inc();
      counter.inc({ method: 'GET' }, 5);

      expect(counter.get()).toBe(1);
      expect(counter.get({ method: 'GET' })).toBe(5);
    });

    test('should create gauge', () => {
      const gauge = metrics.gauge('temperature', 'Temperature');
      gauge.set(25.5);
      gauge.set(30, { location: 'outdoor' });

      expect(gauge.get()).toBe(25.5);
      expect(gauge.get({ location: 'outdoor' })).toBe(30);
    });

    test('should increment and decrement gauge', () => {
      const gauge = metrics.gauge('connections', 'Active connections');
      gauge.set(10);
      gauge.inc();
      gauge.inc({}, 2);
      gauge.dec();

      expect(gauge.get()).toBe(12);
    });

    test('should create histogram', () => {
      const histogram = metrics.histogram('duration', 'Request duration');
      
      histogram.observe(0.05);
      histogram.observe(0.15);
      histogram.observe(1.5);

      const data = histogram.get();
      expect(data.count).toBe(3);
      expect(data.sum).toBeCloseTo(1.7);
    });

    test('should track histogram buckets', () => {
      const histogram = metrics.histogram('latency', 'Latency', [0.1, 0.5, 1, 2]);
      
      histogram.observe(0.05);  // Fits in 0.1 bucket
      histogram.observe(0.3);   // Fits in 0.5 bucket
      histogram.observe(1.5);   // Fits in 2 bucket
      histogram.observe(5);     // Exceeds all buckets

      const data = histogram.get();
      expect(data.buckets[0]).toBe(1); // <= 0.1
      expect(data.buckets[1]).toBe(2); // <= 0.5
      expect(data.buckets[2]).toBe(2); // <= 1
      expect(data.buckets[3]).toBe(3); // <= 2
      expect(data.count).toBe(4);
    });

    test('should export metrics as Prometheus format', () => {
      const counter = metrics.counter('requests', 'Total requests');
      counter.inc({ method: 'GET' }, 10);
      counter.inc({ method: 'POST' }, 5);

      const output = metrics.toPrometheus();

      expect(output).toContain('# HELP app_requests Total requests');
      expect(output).toContain('# TYPE app_requests counter');
      expect(output).toContain('method="GET"');
      expect(output).toContain('method="POST"');
    });

    test('should export metrics as JSON', () => {
      metrics.counter('events', 'Total events').inc();
      
      const json = metrics.toJSON();
      expect(json).toHaveLength(1);
      expect(json[0].name).toBe('app_events');
      expect(json[0].type).toBe('counter');
    });
  });

  describe('Span', () => {
    test('should create span with defaults', () => {
      const span = new Span({ name: 'test-operation' });

      expect(span.name).toBe('test-operation');
      expect(span.traceId).toHaveLength(32);
      expect(span.spanId).toHaveLength(16);
      expect(span.status).toBe(TraceStatus.UNSET);
    });

    test('should set attributes', () => {
      const span = new Span({ name: 'test' });
      span.setAttribute('http.method', 'GET');
      span.setAttributes({ 'http.status_code': 200, 'http.url': '/api' });

      expect(span.attributes['http.method']).toBe('GET');
      expect(span.attributes['http.status_code']).toBe(200);
    });

    test('should add events', () => {
      const span = new Span({ name: 'test' });
      span.addEvent('message received', { size: 100 });
      span.addEvent('processing started');

      expect(span.events).toHaveLength(2);
      expect(span.events[0].name).toBe('message received');
      expect(span.events[0].attributes.size).toBe(100);
    });

    test('should set status', () => {
      const span = new Span({ name: 'test' });
      span.setStatus(TraceStatus.ERROR, 'Something went wrong');

      expect(span.status).toBe(TraceStatus.ERROR);
      expect(span.statusMessage).toBe('Something went wrong');
    });

    test('should calculate duration', () => {
      const span = new Span({ name: 'test' });
      
      expect(span.getDuration()).toBeNull();
      
      span.end();
      expect(span.getDuration()).toBeGreaterThanOrEqual(0);
    });

    test('should get context for propagation', () => {
      const span = new Span({ name: 'test' });
      const ctx = span.getContext();

      expect(ctx.traceId).toBe(span.traceId);
      expect(ctx.spanId).toBe(span.spanId);
    });

    test('should serialize to JSON', () => {
      const span = new Span({ 
        name: 'test',
        kind: SpanKind.SERVER
      });
      span.setAttribute('key', 'value');
      span.end();

      const json = span.toJSON();

      expect(json.name).toBe('test');
      expect(json.kind).toBe(SpanKind.SERVER);
      expect(json.attributes.key).toBe('value');
      expect(json.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Tracer', () => {
    let tracer;
    let exporter;

    beforeEach(() => {
      exporter = new MemoryExporter();
      tracer = createTracer({
        serviceName: 'test-service',
        version: '1.0.0',
        exporters: [exporter]
      });
    });

    test('should create tracer', () => {
      expect(tracer.serviceName).toBe('test-service');
    });

    test('should start span', () => {
      const span = tracer.startSpan('test-operation');

      expect(span.name).toBe('test-operation');
      expect(span.attributes['service.name']).toBe('test-service');
    });

    test('should start child span', () => {
      const parent = tracer.startSpan('parent');
      const child = tracer.startChildSpan(parent, 'child');

      expect(child.traceId).toBe(parent.traceId);
      expect(child.parentSpanId).toBe(parent.spanId);
    });

    test('should end and export span', () => {
      const span = tracer.startSpan('test');
      tracer.endSpan(span);

      expect(exporter.getSpans()).toHaveLength(1);
      expect(exporter.getSpans()[0].name).toBe('test');
    });

    test('should get trace by ID', () => {
      const span1 = tracer.startSpan('span1');
      const span2 = tracer.startChildSpan(span1, 'span2');
      tracer.startSpan('unrelated');

      const trace = tracer.getTrace(span1.traceId);
      expect(trace).toHaveLength(2);
    });

    test('should emit events', (done) => {
      tracer.on('spanStarted', (span) => {
        expect(span.name).toBe('event-test');
        done();
      });

      tracer.startSpan('event-test');
    });

    test('should get all spans', () => {
      tracer.startSpan('span1');
      tracer.startSpan('span2');

      const spans = tracer.getAllSpans();
      expect(spans).toHaveLength(2);
    });
  });

  describe('CorrelationContext', () => {
    test('should set and get values', () => {
      const ctx = new CorrelationContext();
      ctx.set('traceId', 'abc123');
      ctx.set('userId', 'user-1');

      expect(ctx.get('traceId')).toBe('abc123');
      expect(ctx.get('userId')).toBe('user-1');
    });

    test('should check if key exists', () => {
      const ctx = new CorrelationContext();
      ctx.set('key', 'value');

      expect(ctx.has('key')).toBe(true);
      expect(ctx.has('nonexistent')).toBe(false);
    });

    test('should get all values', () => {
      const ctx = new CorrelationContext();
      ctx.set('a', '1');
      ctx.set('b', '2');

      const all = ctx.getAll();
      expect(all).toEqual({ a: '1', b: '2' });
    });

    test('should convert to headers', () => {
      const ctx = new CorrelationContext();
      ctx.set('traceId', 'trace-123');
      ctx.set('spanId', 'span-456');
      ctx.set('correlationId', 'corr-789');

      const headers = ctx.toHeaders();

      expect(headers['x-trace-id']).toBe('trace-123');
      expect(headers['x-span-id']).toBe('span-456');
      expect(headers['x-correlation-id']).toBe('corr-789');
    });

    test('should create from headers', () => {
      const headers = {
        'x-trace-id': 'trace-123',
        'x-span-id': 'span-456',
        'x-correlation-id': 'corr-789'
      };

      const ctx = CorrelationContext.fromHeaders(headers);

      expect(ctx.get('traceId')).toBe('trace-123');
      expect(ctx.get('spanId')).toBe('span-456');
      expect(ctx.get('correlationId')).toBe('corr-789');
    });
  });

  describe('ObservabilityProvider', () => {
    let observability;

    beforeEach(() => {
      observability = createObservability({
        serviceName: 'test-service',
        version: '1.0.0',
        logLevel: LogLevel.DEBUG
      });
    });

    test('should create observability provider', () => {
      expect(observability.serviceName).toBe('test-service');
    });

    test('should get logger', () => {
      const logger = observability.getLogger('auth');
      expect(logger).toBeInstanceOf(Logger);
      expect(logger.context.component).toBe('auth');
    });

    test('should get metrics collector', () => {
      const metrics = observability.getMetrics();
      expect(metrics).toBeInstanceOf(MetricsCollector);
    });

    test('should get tracer', () => {
      const tracer = observability.getTracer();
      expect(tracer).toBeInstanceOf(Tracer);
    });

    test('should trace synchronous operation', () => {
      const result = observability.trace('sync-op', (span) => {
        span.setAttribute('key', 'value');
        return 'result';
      });

      expect(result).toBe('result');
    });

    test('should trace asynchronous operation', async () => {
      const result = await observability.trace('async-op', async (span) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      });

      expect(result).toBe('async-result');
    });

    test('should handle trace errors', () => {
      expect(() => {
        observability.trace('error-op', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });

    test('should record HTTP request', () => {
      observability.recordRequest('GET', '/api/users', 200, 150);
      observability.recordRequest('POST', '/api/users', 201, 200);
      observability.recordRequest('GET', '/api/users', 500, 50);

      const metrics = observability.getMetrics().toJSON();
      const requestMetric = metrics.find(m => m.name === 'http_requests_total');
      
      expect(requestMetric).toBeDefined();
      expect(requestMetric.values.length).toBeGreaterThan(0);
    });

    test('should export telemetry', () => {
      observability.recordRequest('GET', '/health', 200, 10);

      const telemetry = observability.exportTelemetry();

      expect(telemetry.service.name).toBe('test-service');
      expect(telemetry.metrics).toBeDefined();
      expect(telemetry.traces).toBeDefined();
    });
  });

  describe('Utilities', () => {
    test('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toHaveLength(16);
      expect(id2).toHaveLength(16);
      expect(id1).not.toBe(id2);
    });

    test('should generate IDs of specified length', () => {
      const id = generateId(32);
      expect(id).toHaveLength(32);
    });
  });

  describe('Constants', () => {
    test('should export LogLevel constants', () => {
      expect(LogLevel.TRACE).toBe('trace');
      expect(LogLevel.DEBUG).toBe('debug');
      expect(LogLevel.INFO).toBe('info');
      expect(LogLevel.WARN).toBe('warn');
      expect(LogLevel.ERROR).toBe('error');
      expect(LogLevel.FATAL).toBe('fatal');
    });

    test('should export TraceStatus constants', () => {
      expect(TraceStatus.OK).toBe('ok');
      expect(TraceStatus.ERROR).toBe('error');
      expect(TraceStatus.UNSET).toBe('unset');
    });

    test('should export SpanKind constants', () => {
      expect(SpanKind.INTERNAL).toBe('internal');
      expect(SpanKind.SERVER).toBe('server');
      expect(SpanKind.CLIENT).toBe('client');
      expect(SpanKind.PRODUCER).toBe('producer');
      expect(SpanKind.CONSUMER).toBe('consumer');
    });
  });
});
