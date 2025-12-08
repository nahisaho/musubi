# Benchmark Template

## Overview

Template for conducting performance benchmarks.

---

## Benchmark Document

```markdown
# Performance Benchmark Report

## Metadata

| Field | Value |
|-------|-------|
| Component | [Component Name] |
| Date | YYYY-MM-DD |
| Environment | [dev/staging/prod] |
| Version | [Version/Commit] |
| Author | performance-optimizer |

---

## 1. Objectives

### What We're Testing
[Clear description of what is being benchmarked]

### Success Criteria
| Metric | Threshold | Priority |
|--------|-----------|----------|
| Response Time p95 | < 200ms | Critical |
| Throughput | > 1000 req/s | High |
| Error Rate | < 0.1% | Critical |
| Memory Usage | < 512MB | Medium |

---

## 2. Test Environment

### Hardware
- **CPU**: [e.g., 4 vCPU]
- **Memory**: [e.g., 8 GB]
- **Storage**: [e.g., SSD]
- **Network**: [e.g., 1 Gbps]

### Software
- **OS**: [e.g., Ubuntu 22.04]
- **Runtime**: [e.g., Node.js 20.x]
- **Database**: [e.g., PostgreSQL 15]

### Configuration
```yaml
# Key settings
db_pool_size: 20
cache_ttl: 3600
workers: 4
```

---

## 3. Scenarios

### Scenario 1: [Name]
- **Description**: [What this tests]
- **Users**: [Concurrent users]
- **Duration**: [Test duration]
- **Data**: [Test data used]

### Scenario 2: [Name]
...

---

## 4. Results

### Summary

| Metric | Scenario 1 | Scenario 2 | Target | Status |
|--------|------------|------------|--------|--------|
| p50 Latency | 45ms | 52ms | <100ms | ✅ |
| p95 Latency | 120ms | 180ms | <200ms | ✅ |
| p99 Latency | 250ms | 380ms | <500ms | ✅ |
| Throughput | 1,250 req/s | 980 req/s | >1000 | ⚠️ |
| Error Rate | 0.01% | 0.08% | <0.1% | ✅ |

### Latency Distribution

```
Percentile | Scenario 1 | Scenario 2
-----------+------------+------------
     p50   |    45ms    |    52ms
     p75   |    78ms    |    95ms
     p90   |   105ms    |   145ms
     p95   |   120ms    |   180ms
     p99   |   250ms    |   380ms
```

### Resource Usage

| Resource | Peak | Average | Limit |
|----------|------|---------|-------|
| CPU | 85% | 65% | 100% |
| Memory | 420MB | 350MB | 512MB |
| DB Connections | 18 | 12 | 20 |

---

## 5. Bottlenecks Identified

### Bottleneck 1: [Name]
- **Symptom**: [What was observed]
- **Cause**: [Root cause]
- **Impact**: [Performance impact]
- **Recommendation**: [How to fix]

### Bottleneck 2: [Name]
...

---

## 6. Recommendations

| Priority | Action | Expected Impact |
|----------|--------|-----------------|
| High | Add database index on X | -30% latency |
| Medium | Enable response caching | +50% throughput |
| Low | Optimize JSON serialization | -5% CPU |

---

## 7. Graphs

[Include relevant graphs:]
- Latency over time
- Throughput over time
- Error rate over time
- Resource usage over time

---

## 8. Conclusion

### Pass/Fail
[Did the benchmark meet success criteria?]

### Key Findings
1. [Finding 1]
2. [Finding 2]

### Next Steps
1. [ ] [Action item 1]
2. [ ] [Action item 2]
```

---

## Benchmark Script Template

```javascript
// benchmark.js
import autocannon from 'autocannon';

const config = {
  url: 'http://localhost:3000',
  connections: 100,
  duration: 30,
  pipelining: 1,
  headers: {
    'Content-Type': 'application/json'
  }
};

const scenarios = [
  {
    name: 'GET /api/users',
    method: 'GET',
    path: '/api/users'
  },
  {
    name: 'POST /api/orders',
    method: 'POST',
    path: '/api/orders',
    body: JSON.stringify({ product: 'test', quantity: 1 })
  }
];

async function runBenchmarks() {
  for (const scenario of scenarios) {
    console.log(`Running: ${scenario.name}`);
    
    const result = await autocannon({
      ...config,
      method: scenario.method,
      path: scenario.path,
      body: scenario.body
    });
    
    console.log(`
Results for ${scenario.name}:
- Avg Latency: ${result.latency.average}ms
- p99 Latency: ${result.latency.p99}ms
- Requests/sec: ${result.requests.average}
- Errors: ${result.errors}
    `);
  }
}

runBenchmarks();
```

---

## k6 Load Test Template

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up
    { duration: '1m', target: 20 },    // Stay at 20 users
    { duration: '30s', target: 50 },   // Ramp up more
    { duration: '1m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    errors: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/users');
  
  const checkResult = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!checkResult);
  
  sleep(1);
}
```

---

## Quick Checklist

### Before Benchmark
- [ ] Isolated test environment
- [ ] Warm up completed
- [ ] Monitoring enabled
- [ ] Baseline established

### During Benchmark
- [ ] Monitor resources
- [ ] Check for errors
- [ ] Log unusual behavior

### After Benchmark
- [ ] Compare to baseline
- [ ] Document findings
- [ ] Create action items
