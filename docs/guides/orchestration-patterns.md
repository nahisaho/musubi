# MUSUBI Orchestration Patterns Guide

**Version**: 3.10.0  
**Last Updated**: 2025-12-09

---

## Overview

MUSUBI provides 9 orchestration patterns inspired by [ag2](https://github.com/ag2ai/ag2) for coordinating multiple AI skills in complex workflows. Each pattern is optimized for specific use cases.

---

## Pattern Summary

| Pattern | Description | Use Case | Parallel |
|---------|-------------|----------|----------|
| **Auto** | Automatic skill selection | Natural language task routing | ❌ |
| **Sequential** | Linear execution | Step-by-step workflows | ❌ |
| **Nested** | Hierarchical delegation | Complex decomposition | ❌ |
| **Group Chat** | Multi-skill discussion | Collaborative problem solving | ✅ |
| **Swarm** | Parallel execution | Independent tasks | ✅ |
| **Human-in-Loop** | Validation gates | Quality checkpoints | ❌ |
| **Handoff** | Agent delegation | Specialized handover | ❌ |
| **Triage** | Request classification | Intelligent routing | ❌ |

---

## 1. Auto Pattern

**Purpose**: Automatically select the best skill for a task based on keywords and context.

### Usage

```javascript
const { createOrchestrationEngine, PatternType } = require('musubi-sdd/orchestration');

const engine = createOrchestrationEngine();

// Register skills
engine.registerSkill({
  name: 'requirements-analyst',
  keywords: ['requirement', 'ears', 'specification'],
  execute: async (input) => { /* ... */ }
});

// Execute with auto selection
const result = await engine.execute({
  task: 'Create EARS requirements for user login feature',
  pattern: PatternType.AUTO
});

console.log(result.selectedSkill); // 'requirements-analyst'
```

### CLI

```bash
# Auto-select skill based on task description
npx musubi-orchestrate auto "Create API design for user management"

# With verbose output
npx musubi-orchestrate auto "Review code for security issues" --verbose
```

---

## 2. Sequential Pattern

**Purpose**: Execute skills in a defined order, passing output to the next skill.

### Usage

```javascript
const result = await engine.execute({
  pattern: PatternType.SEQUENTIAL,
  input: {
    skills: ['requirements-analyst', 'system-architect', 'task-decomposer'],
    initialInput: { feature: 'User Authentication' }
  }
});

// Each skill receives the previous skill's output
console.log(result.stages); // Array of skill outputs
```

### CLI

```bash
# Execute skills sequentially
npx musubi-orchestrate sequential --skills requirements-analyst,system-architect,task-decomposer

# With input
npx musubi-orchestrate sequential --skills "requirements-analyst,system-architect" --input '{"feature":"login"}'
```

### Pipeline Example

```
Requirements → Design → Tasks → Implementation → Testing
     ↓            ↓         ↓          ↓            ↓
   EARS      C4+ADR     P-labels    Code      Tests
```

---

## 3. Nested Pattern

**Purpose**: Hierarchical skill delegation with parent-child relationships.

### Usage

```javascript
const result = await engine.execute({
  pattern: PatternType.NESTED,
  input: {
    rootSkill: 'orchestrator',
    delegations: [
      { skill: 'requirements-analyst', subtask: 'Define requirements' },
      { skill: 'system-architect', subtask: 'Create design', 
        children: [
          { skill: 'database-designer', subtask: 'Design schema' },
          { skill: 'api-designer', subtask: 'Design endpoints' }
        ]
      }
    ]
  }
});
```

### CLI

```bash
# Execute nested workflow
npx musubi-orchestrate nested --root orchestrator --config nested-workflow.json
```

---

## 4. Group Chat Pattern

**Purpose**: Multiple skills collaborate on a problem through discussion rounds.

### Usage

```javascript
const result = await engine.execute({
  pattern: PatternType.GROUP_CHAT,
  input: {
    topic: 'Design authentication system architecture',
    participants: ['system-architect', 'security-analyst', 'performance-engineer'],
    maxRounds: 5,
    consensusThreshold: 0.8
  }
});

console.log(result.discussion); // Array of contributions
console.log(result.consensus);  // Final agreed solution
```

### CLI

```bash
# Start group discussion
npx musubi-orchestrate group-chat \
  --topic "Design microservices architecture" \
  --participants system-architect,security-analyst,devops-engineer \
  --rounds 3
```

---

## 5. Swarm Pattern

**Purpose**: Execute multiple tasks in parallel with dependency tracking.

### P-Label Priority System

| Priority | Description | Blocking |
|----------|-------------|----------|
| P0 | Critical - Must complete first | Yes |
| P1 | High priority - Primary path | No |
| P2 | Medium priority - Secondary | No |
| P3 | Low priority - Deferrable | No |

### Usage

```javascript
const result = await engine.execute({
  pattern: PatternType.SWARM,
  input: {
    tasks: [
      { skill: 'test-engineer', input: { module: 'auth' }, priority: 'P0' },
      { skill: 'test-engineer', input: { module: 'user' }, priority: 'P1' },
      { skill: 'test-engineer', input: { module: 'admin' }, priority: 'P2' },
      { skill: 'documentation-writer', input: { module: 'api' }, priority: 'P3' }
    ],
    strategy: 'all',        // Wait for all tasks
    maxConcurrent: 4,       // Max parallel tasks
    timeout: 60000          // 60s per task
  }
});

console.log(result.completed); // Successfully completed tasks
console.log(result.failed);    // Failed tasks (if any)
```

### CLI

```bash
# Run parallel tasks
npx musubi-orchestrate swarm \
  --tasks "test-engineer:auth,test-engineer:user,documentation-writer:api" \
  --max-concurrent 4

# With P-labels
npx musubi-orchestrate swarm \
  --tasks "P0:security-audit,P1:code-review,P2:documentation" \
  --strategy all
```

### Strategies

- **all**: Wait for all tasks (default)
- **first**: Return after first success
- **majority**: Return after 50%+ complete
- **quorum**: Return after configurable threshold

---

## 6. Human-in-Loop Pattern

**Purpose**: Add validation checkpoints requiring human approval.

### Usage

```javascript
const result = await engine.execute({
  pattern: PatternType.HUMAN_IN_LOOP,
  input: {
    skills: ['requirements-analyst', 'system-architect'],
    checkpoints: [
      { after: 'requirements-analyst', message: 'Review requirements before design' },
      { after: 'system-architect', message: 'Approve architecture before implementation' }
    ]
  }
});

// Workflow pauses at each checkpoint
// Human provides approval or rejection
```

### CLI

```bash
# Execute with human checkpoints
npx musubi-orchestrate human-in-loop \
  --skills "requirements-analyst,system-architect" \
  --checkpoint-after requirements-analyst \
  --checkpoint-after system-architect

# Interactive mode
npx musubi-orchestrate human-in-loop --interactive
```

---

## 7. Handoff Pattern

**Purpose**: Delegate work from one agent to another with context transfer.

### Usage

```javascript
const { HandoffPattern, handoff } = require('musubi-sdd/orchestration');

// Define handoff
const result = await engine.execute({
  pattern: PatternType.HANDOFF,
  input: {
    from: 'orchestrator',
    to: 'security-analyst',
    context: {
      task: 'Security review of authentication module',
      files: ['src/auth/*.js'],
      priority: 'high'
    },
    filters: ['onSecurityConcern']
  }
});
```

### CLI

```bash
# Handoff task to specialist
npx musubi-orchestrate handoff \
  --from orchestrator \
  --to security-analyst \
  --context '{"task":"Security audit","priority":"high"}'
```

---

## 8. Triage Pattern

**Purpose**: Classify incoming requests and route to appropriate skills.

### Categories

| Category | Description | Example Skills |
|----------|-------------|----------------|
| REQUIREMENTS | Requirement-related | requirements-analyst |
| DESIGN | Architecture/design | system-architect, api-designer |
| IMPLEMENTATION | Coding tasks | software-developer, code-reviewer |
| TESTING | QA/testing | test-engineer, qa-analyst |
| SECURITY | Security concerns | security-analyst |
| DOCUMENTATION | Docs/guides | technical-writer |
| INFRASTRUCTURE | DevOps/infra | devops-engineer, sre |

### Usage

```javascript
const { TriagePattern, TriageCategory } = require('musubi-sdd/orchestration');

const result = await engine.execute({
  pattern: PatternType.TRIAGE,
  input: {
    message: 'We need to add OAuth2 support with JWT tokens',
    strategy: 'confidence',
    minConfidence: 0.6
  }
});

console.log(result.category);    // 'IMPLEMENTATION'
console.log(result.confidence);  // 0.85
console.log(result.routedTo);    // 'software-developer'
```

### CLI

```bash
# Triage a request
npx musubi-orchestrate triage --message "Add rate limiting to API endpoints"

# With strategy
npx musubi-orchestrate triage \
  --message "Review security of payment module" \
  --strategy confidence \
  --min-confidence 0.7
```

---

## Complete Workflow Example

### End-to-End Feature Development

```javascript
const engine = createOrchestrationEngine();

// Phase 1: Triage and Planning
const triageResult = await engine.execute({
  pattern: PatternType.TRIAGE,
  input: { message: 'Add user authentication with OAuth2' }
});

// Phase 2: Requirements (Auto)
const reqResult = await engine.execute({
  pattern: PatternType.AUTO,
  task: 'Create EARS requirements for OAuth2 authentication'
});

// Phase 3: Design Discussion (Group Chat)
const designResult = await engine.execute({
  pattern: PatternType.GROUP_CHAT,
  input: {
    topic: 'Design OAuth2 implementation',
    participants: ['system-architect', 'security-analyst', 'api-designer'],
    maxRounds: 3
  }
});

// Phase 4: Human Review
const approvalResult = await engine.execute({
  pattern: PatternType.HUMAN_IN_LOOP,
  input: {
    skills: ['constitution-enforcer'],
    checkpoints: [{ after: 'constitution-enforcer', message: 'Approve design' }]
  }
});

// Phase 5: Parallel Implementation (Swarm)
const implResult = await engine.execute({
  pattern: PatternType.SWARM,
  input: {
    tasks: [
      { skill: 'software-developer', input: { component: 'oauth-client' }, priority: 'P0' },
      { skill: 'software-developer', input: { component: 'token-handler' }, priority: 'P1' },
      { skill: 'test-engineer', input: { component: 'oauth-tests' }, priority: 'P1' }
    ],
    strategy: 'all'
  }
});
```

### CLI Pipeline

```bash
#!/bin/bash
# Full SDD workflow

# 1. Triage
npx musubi-orchestrate triage --message "Add OAuth2 authentication"

# 2. Requirements
npx musubi-orchestrate auto "Create EARS requirements for OAuth2"

# 3. Design
npx musubi-orchestrate group-chat \
  --topic "Design OAuth2 architecture" \
  --participants system-architect,security-analyst

# 4. Review
npx musubi-orchestrate human-in-loop \
  --skills constitution-enforcer \
  --checkpoint-after constitution-enforcer

# 5. Implement in parallel
npx musubi-orchestrate swarm \
  --tasks "P0:oauth-client,P1:token-handler,P1:oauth-tests" \
  --strategy all

# 6. Validate
npx musubi-validate guardrails --type safety --constitutional
```

---

## Integration with Guardrails

Combine orchestration with guardrails for safe execution:

```javascript
const { InputGuardrail, OutputGuardrail, GuardrailChain } = require('musubi-sdd/orchestration/guardrails');

// Create guardrail chain
const chain = new GuardrailChain([
  new InputGuardrail({ preset: 'security' }),
  new OutputGuardrail({ preset: 'safe', redact: true })
]);

// Wrap skill execution
const safeExecute = async (skill, input) => {
  // Validate input
  const inputResult = await chain.guardrails[0].run(input);
  if (!inputResult.passed) throw new Error('Input validation failed');
  
  // Execute skill
  const output = await skill.execute(input);
  
  // Validate output
  const outputResult = await chain.guardrails[1].run(output);
  return outputResult.content;
};
```

---

## CLI Reference

```bash
# List available patterns
npx musubi-orchestrate list-patterns

# List registered skills
npx musubi-orchestrate list-skills

# Check orchestration status
npx musubi-orchestrate status

# Run specific pattern
npx musubi-orchestrate run <pattern> [options]

# Help
npx musubi-orchestrate --help
```

---

## Best Practices

1. **Start with Triage**: Use triage to classify requests before routing
2. **Use P-Labels**: Assign priorities for parallel execution
3. **Add Checkpoints**: Include human-in-loop for critical decisions
4. **Chain Guardrails**: Validate inputs/outputs with guardrail chains
5. **Log Everything**: Enable verbose mode for debugging workflows
6. **Handle Failures**: Use replanning engine for automatic recovery

---

## Related Documentation

- [Guardrails System](./guardrails-guide.md)
- [Replanning Engine](./replanning-guide.md)
- [Constitutional Governance](../steering/rules/constitution.md)
- [CLI Reference](./cli-reference.md)
