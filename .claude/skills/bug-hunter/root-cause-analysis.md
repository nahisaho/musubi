# Root Cause Analysis Guide

## Overview

A systematic approach to identifying the underlying causes of bugs and issues.

---

## 5 Whys Technique

Ask "Why?" five times to get to the root cause.

### Example

**Problem**: Users are seeing 500 errors on checkout.

1. **Why?** The payment service is throwing exceptions.
2. **Why?** The API is timing out.
3. **Why?** Database queries are taking too long.
4. **Why?** A missing index on the orders table.
5. **Why?** The index was dropped during a migration.

**Root Cause**: Migration removed necessary index.

**Fix**: Add index back, add migration tests.

---

## Investigation Workflow

### Phase 1: Reproduce

```markdown
## Reproduction Steps
1. [Step to reproduce]
2. [Step to reproduce]
3. [Observe behavior]

## Environment
- OS: [OS version]
- Browser: [Browser version]  
- Version: [App version]
- User role: [Role]

## Expected vs Actual
- Expected: [Expected behavior]
- Actual: [Actual behavior]
```

### Phase 2: Gather Evidence

```markdown
## Error Information
- Error message: [message]
- Stack trace: [trace]
- Error code: [code]

## Logs
- Timestamp: [time]
- Relevant logs: [logs]

## Metrics
- CPU/Memory: [values]
- Request rate: [rate]
- Error rate: [rate]
```

### Phase 3: Analyze

1. **Timeline**: What changed recently?
2. **Pattern**: Is it consistent or intermittent?
3. **Scope**: Affects all users or specific subset?
4. **Correlation**: What else happens at the same time?

### Phase 4: Identify Root Cause

```markdown
## Root Cause Analysis

### Direct Cause
[What directly caused the symptom]

### Contributing Factors
- [Factor 1]
- [Factor 2]

### Root Cause
[The underlying issue that should be fixed]

### Evidence
[How we know this is the root cause]
```

### Phase 5: Fix and Prevent

```markdown
## Resolution

### Immediate Fix
[What was done to resolve the issue]

### Prevention
[What will prevent recurrence]

### Verification
[How we verified the fix works]
```

---

## Bug Report Template

```markdown
# Bug Report: [Title]

## Summary
[Brief description]

## Severity
- [ ] Critical (system down)
- [ ] High (major feature broken)
- [ ] Medium (feature degraded)
- [ ] Low (minor issue)

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Version: 
- Browser: 
- OS: 

## Logs/Screenshots
[Attach relevant evidence]

## Root Cause (after investigation)
[The identified root cause]

## Fix
[The solution implemented]
```

---

## Common Bug Categories

| Category | Symptoms | Typical Causes |
|----------|----------|----------------|
| Logic Error | Wrong output | Incorrect algorithm, edge case |
| Null Reference | Crash | Missing null check |
| Race Condition | Intermittent | Concurrency issue |
| Memory Leak | Slow degradation | Uncleaned resources |
| Timeout | Slow/hang | Network, long query |
| Security | Unauthorized access | Missing validation |

---

## Debugging Checklist

- [ ] Can I reproduce the issue?
- [ ] What is the exact error message?
- [ ] When did this start happening?
- [ ] What changed recently?
- [ ] Does it happen in other environments?
- [ ] Does it affect all users?
- [ ] Are there patterns (time, load, etc.)?
- [ ] What do the logs show?
- [ ] Can I isolate the component?
- [ ] Have I verified my fix?
