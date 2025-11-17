# SDD Workflow - 8 Stages

**Version**: 1.0
**Framework**: MUSUBI Specification Driven Development

---

## Overview

This document defines the complete 8-stage Specification Driven Development workflow used in this project. Each stage has dedicated skills, quality gates, and constitutional validation.

```
Research → Requirements → Design → Tasks → Implementation → Testing → Deployment → Monitoring
```

---

## Stage 1: Research

**Purpose**: Gather information, explore options, evaluate technologies

### Responsible Skills

- `@requirements-analyst` - Stakeholder interviews, domain research
- `@system-architect` - Technology evaluation, architecture research
- `@technical-writer` - Documentation research

### Activities

1. **Stakeholder Interviews**
   - Identify business goals
   - Understand user needs
   - Clarify constraints

2. **Domain Research**
   - Study domain concepts
   - Review existing solutions
   - Identify best practices

3. **Technology Evaluation**
   - Research frameworks/libraries
   - Compare alternatives
   - Assess team expertise

4. **Feasibility Analysis**
   - Technical feasibility
   - Resource feasibility
   - Timeline feasibility

### Deliverables

- `research.md` - Research findings and recommendations
- Technology comparison matrix
- Feasibility assessment

### Quality Gates

- [ ] Research questions answered
- [ ] Options evaluated (minimum 2)
- [ ] Recommendations justified
- [ ] Stakeholders reviewed

### Constitutional Validation

- **Article VI**: Consult `steering/tech.md` for technology stack
- **Article VI**: Consult `steering/structure.md` for architecture patterns

### Template

Use `templates/research.md` template.

---

## Stage 2: Requirements

**Purpose**: Define unambiguous, testable requirements in EARS format

### Responsible Skills

- `@requirements-analyst` - EARS requirements creation
- `@project-manager` - Priority, scope, timeline
- `@change-impact-analyzer` - Impact analysis (brownfield)

### Activities

1. **Requirements Gathering**
   - Extract from stakeholder interviews
   - Analyze user stories
   - Identify functional/non-functional requirements

2. **EARS Conversion**
   - Convert to EARS format (5 patterns)
   - Add acceptance criteria
   - Assign requirement IDs (REQ-XXX-NNN)

3. **Requirements Review**
   - Stakeholder validation
   - Completeness check
   - Ambiguity elimination

4. **Impact Analysis** (Brownfield only)
   - Identify ADDED requirements
   - Identify MODIFIED requirements
   - Identify REMOVED requirements
   - Assess breaking changes

### Deliverables

- `requirements.md` - EARS requirements with acceptance criteria
- Requirements coverage matrix
- `changes.md` - Delta specification (brownfield)

### Quality Gates

- [ ] All requirements in EARS format
- [ ] Requirement IDs assigned
- [ ] Acceptance criteria defined
- [ ] Stakeholders approved
- [ ] **Constitutional validation passed (Article IV)**

### Constitutional Validation

- **Article IV**: EARS format enforced
- **Article V**: Requirements assigned unique IDs
- **Article VI**: Consult `steering/product.md` for business context

### Validation Command

```bash
@constitution-enforcer validate requirements.md
```

### Template

Use `templates/requirements.md` template.

---

## Stage 3: Design

**Purpose**: Create technical design with requirements traceability

### Responsible Skills

- `@system-architect` - Architecture, C4 diagrams, ADR
- `@api-designer` - API contracts (REST/GraphQL/gRPC)
- `@database-schema-designer` - Database schema, ER diagrams
- `@ui-ux-designer` - UI/UX wireframes, prototypes

### Activities

1. **Architecture Design**
   - Define system structure
   - Create C4 diagrams (Context, Container, Component)
   - Write Architecture Decision Records (ADR)
   - Map requirements to components

2. **API Design**
   - Define API contracts
   - Create OpenAPI/GraphQL schemas
   - Document endpoints
   - Map requirements to endpoints

3. **Database Design**
   - Create ER diagrams
   - Define schema (tables, relationships)
   - Generate DDL statements
   - Map requirements to entities

4. **UI/UX Design** (if applicable)
   - Create wireframes
   - Design user flows
   - Define design system
   - Map requirements to screens

5. **Requirements Traceability**
   - Create requirements coverage matrix
   - Map requirements → design decisions
   - Validate 100% coverage

### Deliverables

- `design.md` - Complete technical design
- C4 diagrams (Context, Container, Component)
- ADR documents
- API specifications (OpenAPI/GraphQL)
- Database DDL
- Requirements coverage matrix

### Quality Gates

- [ ] All requirements mapped to design
- [ ] Architecture aligned with `steering/structure.md`
- [ ] Technology stack matches `steering/tech.md`
- [ ] ADRs document key decisions
- [ ] **Constitutional validation passed (Articles I, II, VII, VIII)**

### Constitutional Validation

- **Article I**: Features designed as libraries
- **Article II**: CLI interfaces specified
- **Article V**: 100% requirements coverage
- **Article VI**: Design aligned with steering files
- **Article VII**: Project count ≤ 3 (or Phase -1 Gate approval)
- **Article VIII**: No custom abstraction layers (or Phase -1 Gate approval)

### Validation Command

```bash
@constitution-enforcer validate design.md
```

### Phase -1 Gates

Trigger gates if:

- Project count > 3 (Article VII)
- Custom abstraction layers proposed (Article VIII)

### Template

Use `templates/design.md` template.

---

## Stage 4: Tasks

**Purpose**: Break design into actionable implementation tasks

### Responsible Skills

- `@project-manager` - Task breakdown, scheduling, dependencies
- `@software-developer` - Implementation planning
- `@test-engineer` - Test planning

### Activities

1. **Task Decomposition**
   - Break design into implementation tasks
   - Define task dependencies
   - Estimate effort (story points/hours)
   - Assign priority (P0, P1, P2, P3)

2. **Requirements Mapping**
   - Map tasks to requirements
   - Validate coverage
   - Identify gaps

3. **Test Planning**
   - Plan unit tests
   - Plan integration tests
   - Plan E2E tests
   - Map tests to requirements

4. **Scheduling**
   - Create sprint/milestone plan
   - Allocate resources
   - Identify risks

### Deliverables

- `tasks.md` - Task breakdown with requirements mapping
- Sprint/milestone plan
- Test plan
- Requirements coverage matrix (tasks → requirements)

### Quality Gates

- [ ] All requirements mapped to tasks
- [ ] Task dependencies identified
- [ ] Effort estimated
- [ ] Test plan complete
- [ ] Risks identified

### Constitutional Validation

- **Article V**: Tasks mapped to requirements
- **Article VI**: Plan aligned with steering context

### Template

Use `templates/tasks.md` template.

---

## Stage 5: Implementation

**Purpose**: Write code following Test-First imperative

### Responsible Skills

- `@software-developer` - Code implementation
- `@test-engineer` - Test implementation (BEFORE code)
- `@code-reviewer` - Code review

### Activities

1. **Test-First Development (Red-Green-Blue)**
   - **Red**: Write failing test for requirement
   - **Green**: Write minimal code to pass test
   - **Blue**: Refactor with confidence

2. **Library-First Implementation**
   - Implement features as libraries
   - Expose CLI interface
   - Write library tests
   - Document library API

3. **Code Review**
   - SOLID principles validation
   - Security audit (OWASP Top 10)
   - Performance review
   - Best practices enforcement

4. **Traceability**
   - Add requirement IDs in code comments
   - Reference requirements in commit messages
   - Update requirements coverage matrix

### Deliverables

- Source code (libraries + applications)
- Test suites (unit, integration, E2E)
- CLI interfaces
- Code review reports

### Quality Gates

- [ ] **Tests written BEFORE code (Article III)**
- [ ] **Features implemented as libraries (Article I)**
- [ ] **CLI interfaces provided (Article II)**
- [ ] Test coverage ≥ 80%
- [ ] Code review passed
- [ ] No critical security issues
- [ ] **Constitutional validation passed**

### Constitutional Validation

- **Article I**: Library-First enforced
- **Article II**: CLI interfaces exist
- **Article III**: Test-First followed (check git history)
- **Article V**: Code comments reference requirements
- **Article VI**: Code aligned with steering context

### Validation Command

```bash
@constitution-enforcer validate src/
@code-reviewer review src/
@security-auditor audit src/
```

### Red-Green-Blue Cycle Example

```bash
# 1. RED - Write failing test
git commit -m "test: add failing test for REQ-AUTH-001"

# 2. GREEN - Write minimal code
git commit -m "feat: implement REQ-AUTH-001 (authentication)"

# 3. BLUE - Refactor
git commit -m "refactor: improve authentication logic (REQ-AUTH-001)"
```

---

## Stage 6: Testing

**Purpose**: Validate all requirements are met with real services

### Responsible Skills

- `@test-engineer` - Test execution, coverage analysis
- `@quality-assurance` - QA strategy, acceptance testing
- `@traceability-auditor` - Requirements coverage validation

### Activities

1. **Test Execution**
   - Run unit tests
   - Run integration tests (real services)
   - Run E2E tests
   - Measure coverage

2. **Traceability Validation**
   - Validate requirements → test mapping
   - Identify untested requirements
   - Verify 100% coverage

3. **Integration Testing (Real Services)**
   - Use real databases (Docker containers)
   - Use test environments for external APIs
   - Justify any mocks

4. **Acceptance Testing**
   - Validate acceptance criteria
   - User acceptance testing (UAT)
   - Stakeholder sign-off

### Deliverables

- Test execution reports
- Coverage reports (≥ 80%)
- Traceability audit report (100% coverage)
- UAT results
- Bug reports

### Quality Gates

- [ ] All tests passing
- [ ] Coverage ≥ 80%
- [ ] **100% requirements coverage (Article V)**
- [ ] **Integration tests use real services (Article IX)**
- [ ] UAT passed
- [ ] **Constitutional validation passed**

### Constitutional Validation

- **Article III**: Test-First evidence in git history
- **Article V**: 100% requirements → test coverage
- **Article IX**: Integration tests use real services (mocks justified)

### Validation Command

```bash
@traceability-auditor validate requirements.md tests/
@constitution-enforcer validate tests/
```

---

## Stage 7: Deployment

**Purpose**: Deploy to production with monitoring

### Responsible Skills

- `@devops-engineer` - CI/CD pipelines, deployment automation
- `@cloud-architect` - Infrastructure provisioning (IaC)
- `@release-coordinator` - Multi-component release management
- `@site-reliability-engineer` - Production readiness review

### Activities

1. **Infrastructure Provisioning**
   - Provision cloud resources (Terraform/Bicep)
   - Configure environments (dev, staging, prod)
   - Set up databases, caching, queues

2. **CI/CD Pipeline**
   - Automated build
   - Automated testing
   - Automated deployment
   - Rollback strategy

3. **Release Coordination**
   - Coordinate multi-component releases
   - Feature flag configuration
   - Backward compatibility validation
   - Staged rollout plan

4. **Production Readiness**
   - Health check endpoints
   - Logging configuration
   - Monitoring setup
   - Alerting rules

5. **Deployment Execution**
   - Deploy to staging
   - Smoke tests
   - Deploy to production
   - Monitor deployment

### Deliverables

- IaC code (Terraform/Bicep)
- CI/CD pipeline configuration
- Deployment runbooks
- Rollback procedures
- Production readiness checklist

### Quality Gates

- [ ] Staging deployment successful
- [ ] Smoke tests passed
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Rollback tested
- [ ] Production readiness review passed

### Constitutional Validation

- **Article VI**: Infrastructure aligned with `steering/structure.md`

---

## Stage 8: Monitoring

**Purpose**: Monitor production, respond to incidents, iterate

### Responsible Skills

- `@site-reliability-engineer` - SLO/SLI monitoring, incident response
- `@performance-optimizer` - Performance monitoring, optimization
- `@bug-hunter` - Production bug investigation

### Activities

1. **Observability Setup**
   - Metrics collection (Prometheus, CloudWatch)
   - Log aggregation (ELK, Splunk)
   - Distributed tracing (Jaeger, Zipkin)
   - Dashboards (Grafana)

2. **SLO/SLI Monitoring**
   - Define Service Level Objectives (SLO)
   - Define Service Level Indicators (SLI)
   - Monitor error budgets
   - Alert on SLO violations

3. **Incident Response**
   - On-call rotation
   - Incident detection
   - Incident resolution
   - Post-mortem analysis

4. **Performance Monitoring**
   - Response time tracking
   - Resource utilization
   - Bottleneck detection
   - Optimization opportunities

5. **Continuous Improvement**
   - Analyze metrics
   - Identify improvements
   - Create new requirements (→ Stage 2)
   - Iterate

### Deliverables

- SLO/SLI definitions
- Monitoring dashboards
- Alert rules
- Incident runbooks
- Post-mortem reports
- Performance reports

### Quality Gates

- [ ] SLO/SLI defined and monitored
- [ ] Alerts configured and tested
- [ ] Incident response procedures documented
- [ ] Performance baselines established
- [ ] Post-mortem process in place

### Constitutional Validation

- **Article VI**: Monitor metrics aligned with product goals in `steering/product.md`

---

## Workflow Iteration

### Greenfield (0→1)

Full 8-stage workflow for new projects:

```
Research → Requirements → Design → Tasks → Implementation → Testing → Deployment → Monitoring
```

### Brownfield (1→n)

For changes to existing projects:

```
Research (change analysis) → Requirements (delta spec) →
Design (impact analysis) → Tasks → Implementation → Testing → Deployment → Monitoring
```

**Skills for Brownfield**:

- `@change-impact-analyzer` - Analyze ADDED/MODIFIED/REMOVED requirements
- `@traceability-auditor` - Validate existing coverage before changes

---

## Stage Summary Table

| Stage             | Skills                                                                           | Deliverables                  | Constitutional Articles |
| ----------------- | -------------------------------------------------------------------------------- | ----------------------------- | ----------------------- |
| 1. Research       | requirements-analyst, system-architect, technical-writer                         | research.md                   | VI                      |
| 2. Requirements   | requirements-analyst, project-manager, change-impact-analyzer                    | requirements.md, changes.md   | IV, V, VI               |
| 3. Design         | system-architect, api-designer, database-schema-designer, ui-ux-designer         | design.md, C4, ADR, API specs | I, II, V, VI, VII, VIII |
| 4. Tasks          | project-manager, software-developer, test-engineer                               | tasks.md, test plan           | V, VI                   |
| 5. Implementation | software-developer, test-engineer, code-reviewer                                 | source code, tests, CLI       | I, II, III, V, VI       |
| 6. Testing        | test-engineer, quality-assurance, traceability-auditor                           | test reports, coverage        | III, V, IX              |
| 7. Deployment     | devops-engineer, cloud-architect, release-coordinator, site-reliability-engineer | IaC, CI/CD, runbooks          | VI                      |
| 8. Monitoring     | site-reliability-engineer, performance-optimizer, bug-hunter                     | SLO/SLI, dashboards, alerts   | VI                      |

---

## Quick Start

### For New Features (Greenfield)

```bash
# Stage 1: Research
@requirements-analyst research [feature]

# Stage 2: Requirements
@requirements-analyst create requirements for [feature]

# Stage 3: Design
@system-architect design architecture for [feature]
@api-designer design API for [feature]

# Validate before proceeding
@constitution-enforcer validate requirements.md
@constitution-enforcer validate design.md

# Stage 4: Tasks
@project-manager break down tasks for [feature]

# Stage 5: Implementation
@test-engineer write tests for [requirement-id]
@software-developer implement [requirement-id]
@code-reviewer review [files]

# Stage 6: Testing
@traceability-auditor validate coverage
@test-engineer run all tests

# Stage 7: Deployment
@devops-engineer deploy to staging
@site-reliability-engineer production readiness review

# Stage 8: Monitoring
@site-reliability-engineer configure monitoring
```

### For Changes (Brownfield)

```bash
# Analyze impact first
@change-impact-analyzer analyze [change-description]

# Create delta specification
@requirements-analyst create delta spec for [change]

# Continue with stages 3-8...
```

---

**Powered by MUSUBI** - 8-stage specification-driven development workflow.
