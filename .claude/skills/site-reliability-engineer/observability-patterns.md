# Observability Patterns

## Overview

Patterns for implementing effective observability in distributed systems.

---

## Three Pillars of Observability

### 1. Metrics (What)
Numeric measurements aggregated over time.

### 2. Logs (Why)
Discrete events with context.

### 3. Traces (Where)
Request paths through distributed systems.

---

## Metrics Patterns

### RED Method (Request-focused)

| Metric | Description |
|--------|-------------|
| **R**ate | Requests per second |
| **E**rrors | Failed requests per second |
| **D**uration | Response time distribution |

```typescript
// Express middleware for RED metrics
import { Counter, Histogram } from 'prom-client';

const requestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status']
});

const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    requestCounter.inc({
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode
    });
    
    requestDuration.observe({
      method: req.method,
      path: req.route?.path || req.path
    }, duration);
  });
  
  next();
});
```

### USE Method (Resource-focused)

| Metric | Description |
|--------|-------------|
| **U**tilization | % time resource is busy |
| **S**aturation | Queue depth, waiting work |
| **E**rrors | Error events |

```typescript
// System metrics
const cpuUtilization = new Gauge({
  name: 'system_cpu_utilization',
  help: 'CPU utilization percentage'
});

const memoryUtilization = new Gauge({
  name: 'system_memory_utilization',
  help: 'Memory utilization percentage'
});

const queueDepth = new Gauge({
  name: 'job_queue_depth',
  help: 'Number of jobs in queue'
});
```

---

## Logging Patterns

### Structured Logging

```typescript
// Structured log format
const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`
});

// Usage
logger.info({
  event: 'order_created',
  orderId: '12345',
  userId: 'user-789',
  amount: 99.99,
  duration_ms: 45
}, 'Order created successfully');

// Output
{
  "level": "info",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "event": "order_created",
  "orderId": "12345",
  "userId": "user-789",
  "amount": 99.99,
  "duration_ms": 45,
  "msg": "Order created successfully"
}
```

### Correlation IDs

```typescript
// Add correlation ID to all logs
import { v4 as uuid } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

const storage = new AsyncLocalStorage<{ correlationId: string }>();

// Middleware
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuid();
  res.setHeader('x-correlation-id', correlationId);
  
  storage.run({ correlationId }, () => {
    next();
  });
});

// Logger wrapper
function log(level: string, message: string, data: object = {}) {
  const store = storage.getStore();
  logger[level]({
    correlationId: store?.correlationId,
    ...data
  }, message);
}
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| ERROR | Operation failed, needs attention |
| WARN | Unexpected but handled condition |
| INFO | Significant events (startup, requests) |
| DEBUG | Detailed debugging information |
| TRACE | Very detailed tracing |

---

## Tracing Patterns

### OpenTelemetry Setup

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

const provider = new NodeTracerProvider();

provider.addSpanProcessor(
  new SimpleSpanProcessor(
    new JaegerExporter({
      endpoint: 'http://jaeger:14268/api/traces'
    })
  )
);

provider.register();

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation()
  ]
});
```

### Custom Spans

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service');

async function processOrder(order: Order) {
  return tracer.startActiveSpan('processOrder', async (span) => {
    try {
      span.setAttribute('order.id', order.id);
      span.setAttribute('order.amount', order.amount);
      
      // Child span for payment
      await tracer.startActiveSpan('processPayment', async (paymentSpan) => {
        await paymentService.charge(order);
        paymentSpan.end();
      });
      
      // Child span for inventory
      await tracer.startActiveSpan('updateInventory', async (inventorySpan) => {
        await inventoryService.reserve(order.items);
        inventorySpan.end();
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## Alerting Patterns

### Multi-Window Alert

```yaml
# Prometheus alerting rules
groups:
  - name: slo-alerts
    rules:
      # Fast burn: 2% budget in 1 hour
      - alert: HighErrorBudgetBurn
        expr: |
          (
            job:sli_errors_per_request:rate1h > 14.4 * 0.001
          )
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error budget burn rate"
          
      # Slow burn: 5% budget in 6 hours
      - alert: SlowErrorBudgetBurn
        expr: |
          (
            job:sli_errors_per_request:rate6h > 6 * 0.001
          )
        for: 15m
        labels:
          severity: warning
```

### Symptom-Based Alerts

```yaml
# Alert on symptoms, not causes
rules:
  # Good: User-facing symptom
  - alert: HighLatency
    expr: http_request_duration_seconds:p99 > 0.5
    
  # Avoid: Cause-based
  - alert: HighCPU  # May not affect users
    expr: cpu_utilization > 80
```

---

## Dashboard Patterns

### Four Golden Signals Dashboard

```yaml
# Grafana dashboard structure
dashboard:
  title: "Service Overview"
  rows:
    - title: "Traffic"
      panels:
        - type: graph
          title: "Requests per Second"
          query: "rate(http_requests_total[5m])"
          
    - title: "Errors"
      panels:
        - type: graph
          title: "Error Rate"
          query: "rate(http_requests_total{status=~'5..'}[5m])"
          
    - title: "Latency"
      panels:
        - type: graph
          title: "Latency Percentiles"
          queries:
            - "histogram_quantile(0.50, ...)"
            - "histogram_quantile(0.95, ...)"
            - "histogram_quantile(0.99, ...)"
            
    - title: "Saturation"
      panels:
        - type: graph
          title: "Resource Usage"
          queries:
            - "cpu_utilization"
            - "memory_utilization"
```

---

## Observability Checklist

### Metrics
- [ ] RED metrics for all services
- [ ] USE metrics for resources
- [ ] Business metrics tracked
- [ ] SLI metrics defined

### Logging
- [ ] Structured JSON logs
- [ ] Correlation IDs propagated
- [ ] Appropriate log levels
- [ ] Sensitive data masked

### Tracing
- [ ] Distributed tracing enabled
- [ ] Span context propagated
- [ ] Key operations instrumented
- [ ] Sampling configured

### Alerting
- [ ] SLO-based alerts
- [ ] Multi-window burn rates
- [ ] Clear runbooks linked
- [ ] Escalation paths defined
