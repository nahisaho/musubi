# Agent Selection Matrix (25 Skills)

## Overview

This matrix helps the Orchestrator select the optimal agent(s) based on user request keywords and context.

---

## Category 1: Orchestration & Management (3 Skills)

| Agent | Trigger Terms | Primary Use Cases | Priority |
|-------|--------------|-------------------|----------|
| **orchestrator** | coordinate, multi-agent, workflow, execution plan, project planning, complex task, full lifecycle | Complex multi-agent tasks, project coordination | 1 |
| **steering** | project memory, codebase analysis, architecture patterns, tech stack, analyze project | Project context generation, steering files | 2 |
| **constitution-enforcer** | constitution, compliance, validation, Phase -1 Gates, governance | Constitutional validation, pre-implementation gates | 3 |

---

## Category 2: Requirements & Planning (3 Skills)

| Agent | Trigger Terms | Primary Use Cases | Priority |
|-------|--------------|-------------------|----------|
| **requirements-analyst** | requirements, EARS, user stories, acceptance criteria, specification, SRS | Create/validate requirements | 1 |
| **project-manager** | project plan, timeline, milestones, risk management, WBS, Gantt | Project planning, risk management | 2 |
| **change-impact-analyzer** | change proposal, impact analysis, brownfield, delta spec, modification | Brownfield change analysis | 3 |

---

## Category 3: Architecture & Design (4 Skills)

| Agent | Trigger Terms | Primary Use Cases | Priority |
|-------|--------------|-------------------|----------|
| **system-architect** | architecture, C4, ADR, design decisions, component diagram, system design | High-level architecture design | 1 |
| **api-designer** | API, REST, GraphQL, OpenAPI, endpoints, swagger, contract | API specification design | 2 |
| **database-schema-designer** | database, schema, ERD, SQL, tables, relations, normalization | Database schema design | 3 |
| **ui-ux-designer** | UI, UX, wireframe, mockup, design system, user interface | UI/UX design | 4 |

---

## Category 4: Development & Implementation (2 Skills)

| Agent | Trigger Terms | Primary Use Cases | Priority |
|-------|--------------|-------------------|----------|
| **software-developer** | implement, code, develop, build, programming, feature development | Code implementation | 1 |
| **ai-ml-engineer** | machine learning, ML, AI, model, training, MLOps, neural network | ML/AI development | 2 |

---

## Category 5: Quality & Review (5 Skills)

| Agent | Trigger Terms | Primary Use Cases | Priority |
|-------|--------------|-------------------|----------|
| **code-reviewer** | code review, review, PR review, pull request, code quality | Code review | 1 |
| **bug-hunter** | bug, debug, issue, error, root cause, investigation | Bug investigation | 2 |
| **traceability-auditor** | traceability, coverage matrix, requirements tracking, EARS coverage | Traceability validation | 3 |
| **security-auditor** | security, vulnerability, OWASP, penetration, security audit | Security review | 4 |
| **performance-optimizer** | performance, optimization, benchmark, profiling, latency | Performance optimization | 5 |

---

## Category 6: QA (2 Skills)

| Agent | Trigger Terms | Primary Use Cases | Priority |
|-------|--------------|-------------------|----------|
| **test-engineer** | test, testing, unit test, integration test, E2E, test cases | Test creation and execution | 1 |
| **quality-assurance** | QA, quality plan, test strategy, quality metrics | QA strategy | 2 |

---

## Category 7: Infrastructure & Operations (5 Skills)

| Agent | Trigger Terms | Primary Use Cases | Priority |
|-------|--------------|-------------------|----------|
| **devops-engineer** | CI/CD, pipeline, deployment, GitHub Actions, GitLab CI | CI/CD setup | 1 |
| **release-coordinator** | release, versioning, changelog, feature flags, rollout | Release management | 2 |
| **cloud-architect** | cloud, AWS, Azure, GCP, Terraform, infrastructure | Cloud infrastructure | 3 |
| **site-reliability-engineer** | SRE, monitoring, observability, SLO, alerting, incident | Production monitoring | 4 |
| **database-administrator** | DBA, database tuning, backup, recovery, replication | Database operations | 5 |

---

## Category 8: Documentation (1 Skill)

| Agent | Trigger Terms | Primary Use Cases | Priority |
|-------|--------------|-------------------|----------|
| **technical-writer** | documentation, docs, README, user guide, API docs | Documentation creation | 1 |

---

## Quick Selection Guide

### By SDD Workflow Stage

| Stage | Primary Agent | Supporting Agents |
|-------|--------------|-------------------|
| 1. Research | steering | - |
| 2. Requirements | requirements-analyst | change-impact-analyzer |
| 3. Design | system-architect | api-designer, database-schema-designer, ui-ux-designer |
| 4. Task Breakdown | project-manager | orchestrator |
| 5. Implementation | software-developer | ai-ml-engineer |
| 6. Testing | test-engineer | quality-assurance |
| 7. Deployment | devops-engineer | release-coordinator, cloud-architect |
| 8. Monitoring | site-reliability-engineer | database-administrator |

### By Task Type

| Task Type | Agent Selection |
|-----------|-----------------|
| New greenfield project | steering → requirements-analyst → system-architect |
| Brownfield change | change-impact-analyzer → requirements-analyst |
| Bug fix | bug-hunter → software-developer → test-engineer |
| Security audit | security-auditor |
| Performance issue | performance-optimizer |
| Code review | code-reviewer |
| Documentation | technical-writer |
| Release preparation | release-coordinator → devops-engineer |

---

## Multi-Agent Selection Rules

### Rule 1: Always Start with Context
```
IF project context unclear:
    SELECT steering FIRST
```

### Rule 2: Requirements Before Design
```
IF design requested AND no requirements exist:
    SELECT requirements-analyst BEFORE system-architect
```

### Rule 3: Test-First for Implementation
```
IF implementation requested:
    SELECT test-engineer BEFORE software-developer
    (Constitutional Article III)
```

### Rule 4: Validate Before Release
```
IF release requested:
    SELECT constitution-enforcer, traceability-auditor BEFORE release-coordinator
```

### Rule 5: Parallel Audits
```
IF comprehensive audit requested:
    SELECT PARALLEL:
        - security-auditor
        - performance-optimizer
        - code-reviewer
        - traceability-auditor
```

---

## Decision Flowchart

```
User Request
    │
    ├── Contains "requirements"? → requirements-analyst
    ├── Contains "design/architecture"? → system-architect
    ├── Contains "implement/code"? → software-developer
    ├── Contains "test"? → test-engineer
    ├── Contains "deploy/CI/CD"? → devops-engineer
    ├── Contains "review"? → code-reviewer
    ├── Contains "security"? → security-auditor
    ├── Contains "performance"? → performance-optimizer
    ├── Contains "monitor/SRE"? → site-reliability-engineer
    ├── Contains "document"? → technical-writer
    ├── Complex/Multi-faceted? → orchestrator (multi-agent)
    └── Unclear? → steering (analyze first)
```

---

## Additional Skills (Beyond Original 25)

| Agent | Trigger Terms | Primary Use Cases |
|-------|--------------|-------------------|
| **agent-assistant** | agent help, MUSUBI help, how to use | MUSUBI usage guidance |
| **issue-resolver** | GitHub issue, issue resolution, PR issue | Issue/PR resolution |
