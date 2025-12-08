# Orchestration Patterns

## Overview

This document defines the patterns for coordinating multiple specialized agents in MUSUBI SDD workflow.

---

## Pattern 1: Auto Pattern (Recommended)

**Description**: Orchestrator automatically selects the optimal agent(s) based on user request analysis.

```
User Request
    ↓
Orchestrator (analyze)
    ↓
Select Agent(s)
    ↓
Execute
    ↓
Consolidate Results
```

**Use When**:
- User request is complex or ambiguous
- Multiple agents might be needed
- Optimal agent selection is unclear

**Example**:
```
User: "Create a new authentication feature"

Orchestrator Analysis:
→ Needs requirements-analyst (EARS format)
→ Needs system-architect (C4 design)
→ Needs software-developer (implementation)
→ Needs test-engineer (test cases)

Execution Order: Sequential (requirements → design → implement → test)
```

---

## Pattern 2: Sequential Pattern

**Description**: Agents execute in a defined linear order, each passing output to the next.

```
Agent A → Agent B → Agent C → Result
```

**Use When**:
- Clear dependency chain exists
- Output of one agent is input for next
- Order is non-negotiable

**Common Chains**:

### SDD Full Workflow Chain
```
1. steering          → Analyze project context
2. requirements-analyst → Create EARS requirements
3. system-architect  → Design architecture (C4 + ADR)
4. software-developer → Implement code
5. test-engineer     → Create tests
6. code-reviewer     → Review implementation
7. devops-engineer   → Set up CI/CD
8. site-reliability-engineer → Configure monitoring
```

### Quick Implementation Chain
```
1. requirements-analyst → EARS requirements
2. software-developer   → Implementation
3. test-engineer        → Tests
```

---

## Pattern 3: Nested Pattern (Hierarchical)

**Description**: Parent agent delegates to child agents, maintaining hierarchical control.

```
Orchestrator
    ├── requirements-analyst
    │       └── (sub-task: user stories)
    └── system-architect
            ├── api-designer
            └── database-schema-designer
```

**Use When**:
- Complex task requires sub-delegation
- Specialized sub-agents needed for specific aspects
- Hierarchical coordination is natural

**Example**:
```
User: "Design the entire backend architecture"

Orchestrator
    └── system-architect (lead)
            ├── api-designer → REST API specs
            ├── database-schema-designer → DB schemas
            └── cloud-architect → Infrastructure design
```

---

## Pattern 4: Group Chat Pattern

**Description**: Multiple agents collaborate in a discussion-like manner, building on each other's outputs.

```
    Agent A ←→ Agent B
        ↖     ↗
         Agent C
```

**Use When**:
- Multiple perspectives needed
- Collaborative refinement required
- Cross-domain expertise needed

**Example**:
```
User: "Review and improve the authentication design"

Participants:
- security-auditor: Security concerns
- performance-optimizer: Performance impact
- system-architect: Architecture decisions

Discussion Flow:
1. system-architect presents design
2. security-auditor raises concerns
3. performance-optimizer suggests optimizations
4. Iterate until consensus
```

---

## Pattern 5: Swarm Pattern (Parallel)

**Description**: Multiple agents execute simultaneously on independent subtasks.

```
            ┌── Agent A ──┐
Request ────┼── Agent B ──┼── Consolidate → Result
            └── Agent C ──┘
```

**Use When**:
- Subtasks are independent
- Time efficiency is critical
- No dependencies between agents

**Example**:
```
User: "Audit the codebase for security, performance, and code quality"

Parallel Execution:
├── security-auditor: Security vulnerabilities
├── performance-optimizer: Performance issues
└── code-reviewer: Code quality issues

Consolidate: Unified audit report
```

---

## Pattern 6: Human-in-the-Loop Pattern

**Description**: Agent work pauses at defined gates for human validation.

```
Agent Work → Validation Gate → Human Review → Continue/Reject
```

**Use When**:
- Critical decisions require human approval
- Constitutional gates require validation
- High-risk changes need oversight

**Validation Gates**:

### Phase -1 Gates (Constitution Enforcer)
```
Before Implementation:
□ Library-First validated
□ EARS format validated
□ Test-First confirmed
□ Traceability checked
→ Human approval to proceed
```

### Design Review Gate
```
After Architecture Design:
□ C4 diagrams reviewed
□ ADRs approved
□ API contracts validated
→ Human approval to proceed
```

### Release Gate
```
Before Production Release:
□ All tests passing
□ Security audit passed
□ Performance benchmarks met
→ Human approval to deploy
```

---

## Pattern Selection Matrix

| Scenario | Recommended Pattern | Reason |
|----------|-------------------|--------|
| New feature development | Sequential | Clear workflow stages |
| Codebase audit | Swarm | Independent analysis |
| Architecture design | Nested | Hierarchical delegation |
| Design review | Group Chat | Multi-perspective feedback |
| Production release | Human-in-Loop | Critical validation |
| Unclear request | Auto | Let orchestrator decide |
| Long-running workflows | Replanning | Handle failures gracefully |
| Resilient execution | Replanning | Automatic recovery |

---

## Best Practices

1. **Default to Auto Pattern**: Let orchestrator analyze and decide
2. **Use Sequential for SDD Workflow**: Follow 8-stage process
3. **Parallelize When Possible**: Use Swarm for independent tasks
4. **Always Include Human Gates**: For critical decisions
5. **Document Pattern Choice**: Log why pattern was selected

---

## Pattern Composition

Patterns can be combined:

```
User: "Implement new payment feature with full audit"

Pattern: Sequential + Swarm

Sequential Phase:
1. requirements-analyst → EARS requirements
2. system-architect → Architecture design

Swarm Phase (parallel audit):
├── security-auditor
├── performance-optimizer
└── code-reviewer

Sequential Phase (continue):
3. software-developer → Implementation
4. test-engineer → Tests

Human Gate:
→ Release approval
```

---

## Pattern 7: Replanning Pattern (v3.6.0 NEW)

**Description**: Dynamic replanning when tasks fail, timeout, or encounter obstacles. The ReplanningEngine monitors execution and adjusts plans in real-time.

```
Execute Task
    ↓
Monitor (failure/timeout/quality issue?)
    ↓ Yes
Trigger Replan
    ↓
Analyze Context
    ↓
Generate Alternative Plan
    ↓
Execute Alternative
```

**Use When**:
- Tasks may fail or timeout
- Alternative approaches exist
- Resilience is critical
- Long-running workflows

**Components**:

| Component | Purpose | CLI Command |
|-----------|---------|-------------|
| ReplanningEngine | Core replanning logic | `musubi-orchestrate replan <context-id>` |
| GoalProgressTracker | Track goal completion | `musubi-orchestrate goal status` |
| ProactivePathOptimizer | Optimize execution paths | `musubi-orchestrate optimize run <path-id>` |
| AdaptiveGoalModifier | Adjust goals dynamically | `musubi-orchestrate goal update <goal-id>` |

**Example**:
```
User: "Deploy API to production"

Initial Plan:
1. Build → 2. Test → 3. Deploy

Execution:
1. Build ✓
2. Test → FAILURE (timeout)

Replan Triggered:
- Reason: timeout
- Decision: retry with smaller test subset
- Alternative: 2a. Run critical tests only

Continue:
2a. Critical Tests ✓
3. Deploy ✓
```

**Trigger Types**:
- `failure` - Task execution failed
- `timeout` - Task exceeded time limit
- `quality` - Output quality below threshold
- `manual` - Human-triggered replan
- `dependency` - Dependency unavailable

**Decision Types**:
- `continue` - Proceed with next task
- `retry` - Retry the failed task
- `alternative` - Use alternative approach
- `abort` - Stop execution
- `human` - Escalate to human decision

**CLI Usage**:
```bash
# Execute replanning for a context
musubi-orchestrate replan ctx-12345

# Register and track goals
musubi-orchestrate goal register --name "Deploy API" --target 100
musubi-orchestrate goal update goal-1 --progress 50
musubi-orchestrate goal status

# Optimize execution paths
musubi-orchestrate path analyze path-1
musubi-orchestrate optimize suggest path-1
musubi-orchestrate optimize run path-1
```

