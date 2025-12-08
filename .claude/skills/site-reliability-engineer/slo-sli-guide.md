# SLO/SLI Guide

## Overview

Guide for implementing Service Level Objectives (SLOs) and Service Level Indicators (SLIs).

---

## Key Concepts

### SLI (Service Level Indicator)
A quantitative measure of service behavior.

**Example**: 99.5% of requests return successfully in under 200ms.

### SLO (Service Level Objective)
A target value for an SLI.

**Example**: 99.9% availability over 30 days.

### SLA (Service Level Agreement)
A contract with consequences for missing SLOs.

**Example**: If uptime < 99.9%, customer gets 10% credit.

### Error Budget
The acceptable amount of downtime/errors.

**Example**: 99.9% availability = 43 minutes downtime/month budget.

---

## Common SLIs

### 1. Availability
```
Availability = (Successful Requests / Total Requests) × 100
```

### 2. Latency
```
Latency SLI = Requests < Threshold / Total Requests
```

| Percentile | Typical Target |
|------------|----------------|
| p50 | < 100ms |
| p95 | < 250ms |
| p99 | < 500ms |

### 3. Throughput
```
Throughput = Requests per Second (RPS)
```

### 4. Error Rate
```
Error Rate = (Failed Requests / Total Requests) × 100
```

### 5. Saturation
```
CPU Utilization, Memory Usage, Queue Depth
```

---

## Defining SLOs

### Step 1: Identify Critical User Journeys

```markdown
| Journey | Description | Importance |
|---------|-------------|------------|
| Login | User authentication | Critical |
| Checkout | Payment processing | Critical |
| Search | Product search | High |
| Browse | Catalog browsing | Medium |
```

### Step 2: Define SLIs for Each Journey

```yaml
journeys:
  login:
    slis:
      - type: availability
        measure: "% of successful logins"
      - type: latency
        measure: "p99 login time"
      
  checkout:
    slis:
      - type: availability
        measure: "% of successful checkouts"
      - type: latency
        measure: "p95 checkout time"
```

### Step 3: Set SLO Targets

```yaml
slos:
  login-availability:
    target: 99.9%
    window: 30 days
    
  login-latency-p99:
    target: 500ms
    window: 30 days
    
  checkout-availability:
    target: 99.95%
    window: 30 days
```

---

## SLO Document Template

```markdown
# SLO Document: [Service Name]

## Service Overview
[Brief description of the service]

## SLO Summary

| SLO | Target | Window | Priority |
|-----|--------|--------|----------|
| Availability | 99.9% | 30 days | P0 |
| Latency (p99) | < 200ms | 30 days | P1 |
| Error Rate | < 0.1% | 30 days | P1 |

## Detailed SLOs

### Availability
- **SLI**: Percentage of successful HTTP responses (2xx, 3xx)
- **Target**: 99.9%
- **Window**: Rolling 30 days
- **Error Budget**: 43.2 minutes/month

### Latency
- **SLI**: p99 latency of all API requests
- **Target**: < 200ms
- **Window**: Rolling 30 days

## Measurement

### Data Sources
- Prometheus metrics
- Application logs
- Synthetic monitoring

### Queries
```promql
# Availability
sum(rate(http_requests_total{status=~"2..|3.."}[5m])) 
/ 
sum(rate(http_requests_total[5m]))

# Latency p99
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)
```

## Alerting

| Alert | Condition | Severity |
|-------|-----------|----------|
| Burn Rate High | 2% budget burned in 1h | Critical |
| Burn Rate Warning | 5% budget burned in 6h | Warning |

## Escalation
- **P0**: Page on-call immediately
- **P1**: Alert on-call, respond within 1h
- **P2**: Next business day
```

---

## Error Budget Policy

```markdown
# Error Budget Policy

## When Budget is Healthy (> 50%)
- Normal development velocity
- Feature work prioritized
- Risk tolerance for experiments

## When Budget is Low (20-50%)
- Increased focus on reliability
- Risky changes require approval
- Post-incident reviews mandatory

## When Budget is Exhausted (< 20%)
- Feature freeze
- All hands on reliability
- Only critical fixes deployed
- Requires director approval to deploy
```

---

## Prometheus SLO Queries

### Availability

```promql
# 5-minute availability
sum(rate(http_requests_total{status=~"2..|3.."}[5m])) 
/ 
sum(rate(http_requests_total[5m]))

# 30-day availability
sum(increase(http_requests_total{status=~"2..|3.."}[30d])) 
/ 
sum(increase(http_requests_total[30d]))
```

### Latency

```promql
# p99 latency
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# Percentage of requests under 200ms
sum(rate(http_request_duration_seconds_bucket{le="0.2"}[5m])) 
/ 
sum(rate(http_request_duration_seconds_count[5m]))
```

### Error Budget Remaining

```promql
# Error budget remaining (as percentage)
1 - (
  (1 - (
    sum(increase(http_requests_total{status=~"2..|3.."}[30d])) 
    / 
    sum(increase(http_requests_total[30d]))
  )) 
  / 
  (1 - 0.999)  # SLO target
)
```

---

## SLO Dashboard

```yaml
# Grafana dashboard panels

panels:
  - title: "Current Availability"
    type: stat
    query: "availability_sli"
    thresholds:
      - value: 0.999
        color: green
      - value: 0.99
        color: yellow
      - value: 0
        color: red

  - title: "Error Budget Remaining"
    type: gauge
    query: "error_budget_remaining"
    max: 100
    
  - title: "Latency p99"
    type: timeseries
    query: "latency_p99"
    
  - title: "Error Budget Burn Rate"
    type: timeseries
    query: "burn_rate_1h"
```

---

## SLO Review Checklist

### Weekly
- [ ] Check error budget status
- [ ] Review any SLO breaches
- [ ] Assess burn rate trends

### Monthly
- [ ] SLO performance report
- [ ] Error budget consumption analysis
- [ ] Review and adjust targets if needed

### Quarterly
- [ ] Comprehensive SLO review
- [ ] Update user journey mapping
- [ ] Refine SLI definitions
