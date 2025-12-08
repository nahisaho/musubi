# Incident Response Template

## Overview

Template for handling and documenting incidents.

---

## Incident Response Process

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Detect   │───▶│ Triage   │───▶│ Mitigate │───▶│ Resolve  │───▶│ Review   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## Incident Severity Levels

| Level | Name | Description | Response Time | Example |
|-------|------|-------------|---------------|---------|
| SEV-1 | Critical | Complete outage | 15 min | Site down |
| SEV-2 | Major | Partial outage | 30 min | Payment failures |
| SEV-3 | Minor | Degraded service | 2 hours | Slow responses |
| SEV-4 | Low | Minimal impact | Next day | Minor UI bug |

---

## Incident Template

```markdown
# Incident Report: [INC-XXXX] [Title]

## Summary
**Status**: Active / Mitigated / Resolved
**Severity**: SEV-1 / SEV-2 / SEV-3 / SEV-4
**Duration**: [Start time] - [End time] (X hours Y minutes)
**Impact**: [Brief description of user impact]

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | Incident detected via [monitoring/user report] |
| HH:MM | Incident commander assigned: [Name] |
| HH:MM | [Action taken] |
| HH:MM | Root cause identified |
| HH:MM | Mitigation deployed |
| HH:MM | Service restored |
| HH:MM | Incident resolved |

---

## Impact

### Users Affected
- [Number] users impacted
- [Regions/segments] affected
- [Features] unavailable

### Business Impact
- [Revenue impact if any]
- [SLA breach if any]
- [Reputational impact]

### Metrics
| Metric | During Incident | Normal |
|--------|-----------------|--------|
| Error Rate | X% | Y% |
| Latency p99 | Xms | Yms |
| Availability | X% | Y% |

---

## Root Cause

### What Happened
[Detailed technical explanation of the root cause]

### Why It Happened
- [Contributing factor 1]
- [Contributing factor 2]
- [Why wasn't this caught earlier?]

### Timeline of Events Leading to Incident
1. [Event 1]
2. [Event 2]
3. [Event that triggered incident]

---

## Resolution

### Immediate Actions
- [Action 1]: [Result]
- [Action 2]: [Result]

### Mitigation Steps
1. [Step taken to mitigate]
2. [Step taken to mitigate]

### Permanent Fix
[Description of permanent fix implemented or planned]

---

## Lessons Learned

### What Went Well
- [Positive 1]
- [Positive 2]

### What Went Wrong
- [Issue 1]
- [Issue 2]

### Where We Got Lucky
- [Lucky circumstance]

---

## Action Items

| Priority | Action | Owner | Due Date | Status |
|----------|--------|-------|----------|--------|
| P1 | [Action item] | [Name] | [Date] | Open |
| P2 | [Action item] | [Name] | [Date] | Open |
| P2 | [Action item] | [Name] | [Date] | Open |

### Follow-up Tasks
- [ ] Schedule post-mortem meeting
- [ ] Update runbooks
- [ ] Improve monitoring/alerting
- [ ] Add automated tests
- [ ] Document lessons learned

---

## Appendix

### Related Links
- [Dashboard during incident]
- [Relevant logs]
- [Related tickets]
- [Communication thread]

### Attendees
- Incident Commander: [Name]
- Communications Lead: [Name]
- Technical Lead: [Name]
- Other responders: [Names]
```

---

## Incident Commander Checklist

### Detection (0-5 min)
- [ ] Acknowledge alert
- [ ] Assess severity
- [ ] Declare incident if needed
- [ ] Assign yourself as IC

### Triage (5-15 min)
- [ ] Create incident channel
- [ ] Page relevant teams
- [ ] Start incident doc
- [ ] Begin timeline

### Communication (Ongoing)
- [ ] Post initial status update
- [ ] Update status every 30 min
- [ ] Coordinate with comms team
- [ ] Notify stakeholders

### Mitigation (Until resolved)
- [ ] Assign investigation tasks
- [ ] Consider rollback
- [ ] Implement workarounds
- [ ] Monitor progress

### Resolution
- [ ] Confirm service restored
- [ ] Post final status
- [ ] Schedule post-mortem
- [ ] Complete incident doc

---

## Communication Templates

### Internal Status Update
```
🔴 [SEV-1] [Service] Incident - Update #[N]

Status: [Investigating/Identified/Mitigating/Resolved]
Impact: [Description of user impact]
Current Actions: [What we're doing now]
Next Update: [Time]

IC: @[name] | Thread: [link]
```

### External Status Page
```
[Service Name] - [Status]

We are currently investigating reports of [issue].
Some users may experience [symptoms].
We are actively working to resolve this issue.

Posted: [Time] UTC
Last Updated: [Time] UTC
```

---

## Post-Mortem Meeting Agenda

1. **Introduction** (5 min)
   - Purpose of blameless post-mortem
   - Ground rules

2. **Timeline Review** (15 min)
   - Walk through incident timeline
   - Clarify details

3. **Root Cause Analysis** (20 min)
   - What happened?
   - Why did it happen?
   - 5 Whys exercise

4. **What Went Well** (10 min)
   - Positive aspects of response

5. **What Went Wrong** (10 min)
   - Issues with detection/response

6. **Action Items** (15 min)
   - Identify improvements
   - Assign owners and dates

7. **Wrap Up** (5 min)
   - Summarize action items
   - Schedule follow-up

---

## Runbook Template

```markdown
# Runbook: [Issue Name]

## Symptoms
- [What does this look like?]
- [What alerts fire?]

## Quick Diagnosis
1. Check [X] dashboard
2. Run `command`
3. Look for [pattern]

## Common Causes
1. [Cause 1]: [How to verify]
2. [Cause 2]: [How to verify]

## Resolution Steps

### For Cause 1
1. [Step 1]
2. [Step 2]

### For Cause 2
1. [Step 1]
2. [Step 2]

## Escalation
If not resolved in 15 min, page [team].

## Related
- [Link to other runbooks]
- [Link to documentation]
```
