# P-Label Parallelization Tutorial

**Version**: 3.10.0  
**Last Updated**: 2025-12-09

---

## Overview

P-labels are priority markers that enable intelligent parallel task execution in MUSUBI. Inspired by Google's P0-P3 priority system, they help you:

- **Prioritize critical tasks** (P0 - blocking)
- **Execute independent tasks concurrently** (P1-P3)
- **Manage dependencies automatically**
- **Optimize workflow execution time**

---

## P-Label Priority Levels

| Priority | Name | Description | Blocking |
|----------|------|-------------|----------|
| **P0** | Critical | Must complete first, blocks others | Yes |
| **P1** | High | Primary path, important | No |
| **P2** | Medium | Secondary path, nice to have | No |
| **P3** | Low | Can be deferred, future enhancement | No |

---

## Quick Start

### CLI Usage

```bash
# Run tasks with P-labels
npx musubi-orchestrate swarm \
  --tasks "P0:security-audit,P1:code-review,P1:unit-tests,P2:integration-tests,P3:documentation" \
  --strategy all \
  --max-concurrent 4
```

### Programmatic Usage

```javascript
const { createOrchestrationEngine, PatternType } = require('musubi-sdd/orchestration');

const engine = createOrchestrationEngine();

const result = await engine.execute({
  pattern: PatternType.SWARM,
  input: {
    tasks: [
      { skill: 'security-analyst', input: { target: 'auth' }, priority: 'P0' },
      { skill: 'code-reviewer', input: { target: 'auth' }, priority: 'P1' },
      { skill: 'test-engineer', input: { type: 'unit' }, priority: 'P1' },
      { skill: 'test-engineer', input: { type: 'integration' }, priority: 'P2' },
      { skill: 'documentation-writer', input: { target: 'api' }, priority: 'P3' }
    ],
    maxConcurrent: 4
  }
});
```

---

## Execution Order

### How P-Labels Work

```
Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Phase 1: P0 (Blocking)
  ┌─────────────────────────────────────────┐
  │  P0: security-audit                     │  ← Must complete first
  └─────────────────────────────────────────┘
                                             │
  Phase 2: P1 (Parallel)                     ▼
  ┌───────────────────┐  ┌───────────────────┐
  │ P1: code-review   │  │ P1: unit-tests    │  ← Run in parallel
  └───────────────────┘  └───────────────────┘
                                             │
  Phase 3: P2 (Parallel)                     ▼
  ┌───────────────────────────────┐
  │ P2: integration-tests         │  ← Runs after P1 complete
  └───────────────────────────────┘
                                             │
  Phase 4: P3 (Parallel)                     ▼
  ┌───────────────────────────────┐
  │ P3: documentation             │  ← Can be deferred
  └───────────────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Execution Rules

1. **P0 tasks execute first** (blocking)
2. **Same-priority tasks run in parallel**
3. **Lower priority waits for higher priority**
4. **maxConcurrent limits parallel tasks**

---

## Real-World Examples

### Example 1: Feature Development

```javascript
const featureTasks = {
  pattern: PatternType.SWARM,
  input: {
    tasks: [
      // P0: Critical path - must complete first
      { skill: 'requirements-analyst', input: { feature: 'auth' }, priority: 'P0' },
      
      // P1: Primary implementation - parallel
      { skill: 'system-architect', input: { component: 'auth' }, priority: 'P1' },
      { skill: 'database-designer', input: { schema: 'users' }, priority: 'P1' },
      
      // P2: Secondary tasks - parallel after P1
      { skill: 'api-designer', input: { endpoints: 'auth' }, priority: 'P2' },
      { skill: 'test-engineer', input: { module: 'auth' }, priority: 'P2' },
      
      // P3: Nice to have - can be deferred
      { skill: 'documentation-writer', input: { docs: 'auth-api' }, priority: 'P3' },
      { skill: 'performance-engineer', input: { benchmark: 'auth' }, priority: 'P3' }
    ],
    maxConcurrent: 4
  }
};
```

### Example 2: Code Review Pipeline

```bash
# Security-first code review
npx musubi-orchestrate swarm \
  --tasks \
    "P0:security-auditor:src/auth/**/*.js" \
    "P1:code-reviewer:src/auth/**/*.js" \
    "P1:constitution-enforcer:src/auth/**/*.js" \
    "P2:performance-optimizer:src/auth/**/*.js" \
    "P3:documentation-writer:src/auth/README.md" \
  --max-concurrent 3 \
  --strategy all
```

### Example 3: Multi-Module Testing

```javascript
const testingTasks = {
  pattern: PatternType.SWARM,
  input: {
    tasks: [
      // P0: Critical module tests
      { skill: 'test-engineer', input: { module: 'auth', type: 'unit' }, priority: 'P0' },
      { skill: 'test-engineer', input: { module: 'payment', type: 'unit' }, priority: 'P0' },
      
      // P1: Integration tests (parallel)
      { skill: 'test-engineer', input: { module: 'auth', type: 'integration' }, priority: 'P1' },
      { skill: 'test-engineer', input: { module: 'user', type: 'integration' }, priority: 'P1' },
      { skill: 'test-engineer', input: { module: 'admin', type: 'integration' }, priority: 'P1' },
      
      // P2: E2E tests
      { skill: 'test-engineer', input: { type: 'e2e' }, priority: 'P2' },
      
      // P3: Performance tests
      { skill: 'performance-engineer', input: { type: 'load-test' }, priority: 'P3' }
    ],
    maxConcurrent: 5,
    timeout: 120000  // 2 minutes per task
  }
};
```

---

## Dependency Management

### Automatic Dependencies

P-labels automatically create priority-based dependencies:

```javascript
const tasksWithDeps = {
  tasks: [
    { id: 'design', skill: 'system-architect', priority: 'P0' },
    { id: 'implement', skill: 'software-developer', priority: 'P1', dependsOn: ['design'] },
    { id: 'test', skill: 'test-engineer', priority: 'P1', dependsOn: ['design'] },
    { id: 'document', skill: 'documentation-writer', priority: 'P2', dependsOn: ['implement', 'test'] }
  ]
};
```

### Execution Graph

```
         ┌────────────┐
         │   design   │ P0 (blocking)
         │  (P0)      │
         └─────┬──────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌────────────┐  ┌────────────┐
│ implement  │  │   test     │ P1 (parallel)
│   (P1)     │  │   (P1)     │
└──────┬─────┘  └──────┬─────┘
       │               │
       └───────┬───────┘
               ▼
       ┌────────────┐
       │  document  │ P2 (waits for P1)
       │   (P2)     │
       └────────────┘
```

---

## Execution Strategies

### Strategy Options

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `all` | Wait for all tasks | Complete workflow |
| `first` | Return after first success | Racing alternatives |
| `majority` | Return after 50%+ complete | Voting/consensus |
| `quorum` | Configurable threshold | Custom completion |

### Examples

```javascript
// Wait for all tasks
const allResult = await engine.execute({
  pattern: PatternType.SWARM,
  input: { tasks, strategy: 'all' }
});

// Return after first success (racing)
const firstResult = await engine.execute({
  pattern: PatternType.SWARM,
  input: {
    tasks: [
      { skill: 'code-generator', input: { template: 'react' } },
      { skill: 'code-generator', input: { template: 'vue' } },
      { skill: 'code-generator', input: { template: 'angular' } }
    ],
    strategy: 'first'
  }
});

// Majority voting
const majorityResult = await engine.execute({
  pattern: PatternType.SWARM,
  input: {
    tasks: reviewers.map(r => ({ skill: 'code-reviewer', input: r })),
    strategy: 'majority'
  }
});
```

---

## Error Handling

### Retry Configuration

```javascript
const robustTasks = {
  pattern: PatternType.SWARM,
  input: {
    tasks: [...],
    retryFailed: true,      // Retry failed tasks
    retryAttempts: 3,       // Max 3 retries
    timeout: 60000,         // 60s timeout per task
    strategy: 'all'
  }
};
```

### Handling Failures

```javascript
const result = await engine.execute(robustTasks);

if (result.failed.length > 0) {
  console.log('Failed tasks:');
  result.failed.forEach(task => {
    console.log(`  - ${task.skill}: ${task.error}`);
  });
  
  // Trigger replanning
  const replanResult = await replanningEngine.replan({
    failedTasks: result.failed,
    completedTasks: result.completed
  });
}
```

---

## Performance Optimization

### Tuning maxConcurrent

```javascript
// CPU-intensive tasks: limit concurrency
const cpuTasks = {
  tasks: [...],
  maxConcurrent: Math.ceil(os.cpus().length / 2)  // Half of CPU cores
};

// I/O-intensive tasks: higher concurrency
const ioTasks = {
  tasks: [...],
  maxConcurrent: 10  // More parallel I/O operations
};
```

### Timeout Configuration

```javascript
const tasks = {
  tasks: [
    { skill: 'quick-task', timeout: 10000 },   // 10s
    { skill: 'medium-task', timeout: 60000 },  // 60s
    { skill: 'long-task', timeout: 300000 }    // 5min
  ],
  timeout: 60000  // Default timeout
};
```

---

## Integration with Replanning

Enable automatic replanning for failed tasks:

```javascript
const { ReplanningEngine } = require('musubi-sdd/orchestration/replanning');

const replanningEngine = new ReplanningEngine();

const result = await engine.execute({
  pattern: PatternType.SWARM,
  input: {
    tasks: [...],
    enableReplanning: true,
    replanningEngine
  }
});

// Replanning triggers automatically on failure
replanningEngine.on('replan', (event) => {
  console.log('Replanning triggered:', event.reason);
  console.log('Alternative:', event.alternative);
});
```

---

## CLI Reference

```bash
# Basic swarm execution
npx musubi-orchestrate swarm --tasks "skill1,skill2,skill3"

# With P-labels
npx musubi-orchestrate swarm --tasks "P0:critical,P1:important,P2:nice-to-have"

# With strategy
npx musubi-orchestrate swarm --tasks "..." --strategy all|first|majority|quorum

# With concurrency limit
npx musubi-orchestrate swarm --tasks "..." --max-concurrent 4

# With timeout
npx musubi-orchestrate swarm --tasks "..." --timeout 60000

# Verbose output
npx musubi-orchestrate swarm --tasks "..." --verbose

# Help
npx musubi-orchestrate swarm --help
```

---

## Best Practices

1. **P0 for Critical Path**: Use P0 only for truly blocking tasks
2. **Balance Priorities**: Don't make everything P0
3. **Right-size Concurrency**: Match maxConcurrent to resources
4. **Set Timeouts**: Prevent hanging tasks
5. **Enable Retries**: For flaky operations
6. **Log Progress**: Use verbose mode for debugging
7. **Plan for Failure**: Enable replanning for complex workflows

---

## Related Documentation

- [Orchestration Patterns](./orchestration-patterns.md)
- [Swarm Pattern Reference](../reference/patterns/swarm.md)
- [Replanning Engine](./replanning-guide.md)
