# Constitutional Governance

**Version**: 1.0
**Status**: Immutable
**Enforcement**: Mandatory via `constitution-enforcer` skill

---

## Overview

This document defines the 9 Constitutional Articles that govern all development activities in this project. These articles are **immutable** and must be enforced at every stage of the SDD workflow.

**Enforcement Agent**: The `constitution-enforcer` skill validates compliance with these articles before proceeding to implementation.

---

## Article I: Library-First Principle

**Statement**: All new features SHALL begin as independent libraries before integration into applications.

### Requirements

- Every feature MUST start as a standalone library
- Libraries MUST have their own test suites
- Libraries MUST be independently deployable
- Libraries MUST NOT depend on application code
- Libraries MAY be published to package registries

### Rationale

- Enforces modularity and reusability
- Prevents tight coupling
- Enables independent testing and versioning
- Facilitates code sharing across projects

### Validation Checklist

- [ ] Feature implemented as library in `/lib` or separate package
- [ ] Library has independent package.json (if applicable)
- [ ] Library has dedicated test suite
- [ ] Library exports public API
- [ ] No imports from application code

---

## Article II: CLI Interface Mandate

**Statement**: All libraries SHALL expose functionality through CLI interfaces.

### Requirements

- Every library MUST provide a CLI interface
- CLI MUST expose all primary functionality
- CLI MUST follow consistent argument conventions
- CLI MUST provide help text and usage examples
- CLI MAY delegate to library API

### Rationale

- Enables scriptability and automation
- Facilitates testing and debugging
- Improves developer experience
- Enables integration with CI/CD pipelines

### Validation Checklist

- [ ] Library provides CLI entry point (bin/ or scripts/)
- [ ] CLI documented with --help flag
- [ ] CLI supports common operations
- [ ] CLI uses consistent argument patterns (flags, options)
- [ ] CLI exit codes follow conventions (0=success, non-zero=error)

---

## Article III: Test-First Imperative

**Statement**: Tests SHALL be written before implementation (Red-Green-Blue cycle).

### Requirements

- Tests MUST be written before production code
- Tests MUST follow Red-Green-Blue cycle:
  1. **Red**: Write failing test
  2. **Green**: Write minimal code to pass
  3. **Blue**: Refactor with confidence
- Tests MUST cover all EARS requirements
- Test coverage MUST exceed 80%
- Integration tests MUST use real services (see Article IX)

### Rationale

- Ensures requirements are testable
- Prevents over-engineering
- Provides executable specifications
- Enables safe refactoring

### Validation Checklist

- [ ] Tests exist before implementation
- [ ] All EARS requirements have corresponding tests
- [ ] Test coverage ≥ 80%
- [ ] Tests follow Red-Green-Blue evidence (git history)
- [ ] No production code without tests

---

## Article IV: EARS Requirements Format

**Statement**: All requirements SHALL use EARS (Easy Approach to Requirements Syntax) format.

### Requirements

- Requirements MUST use one of 5 EARS patterns:
  1. **Event-driven**: `WHEN [event], the [system] SHALL [response]`
  2. **State-driven**: `WHILE [state], the [system] SHALL [response]`
  3. **Unwanted behavior**: `IF [error], THEN the [system] SHALL [response]`
  4. **Optional features**: `WHERE [feature enabled], the [system] SHALL [response]`
  5. **Ubiquitous**: `The [system] SHALL [requirement]`
- Requirements MUST be unambiguous
- Requirements MUST include acceptance criteria
- Requirements MUST be traceable to design and tests

### Rationale

- Eliminates ambiguity
- Improves testability
- Enables traceability
- Standardizes requirements format

### Validation Checklist

- [ ] All requirements use EARS patterns
- [ ] Requirements are unambiguous (single interpretation)
- [ ] Acceptance criteria defined
- [ ] Requirements mapped to tests (see `traceability-auditor`)
- [ ] Requirements reviewed by stakeholders

**Reference**: See `steering/rules/ears-format.md` for complete EARS guide.

---

## Article V: Traceability Mandate

**Statement**: 100% traceability SHALL be maintained between Requirements ↔ Design ↔ Code ↔ Tests.

### Requirements

- Every requirement MUST map to:
  - Design decisions (architecture, API, database)
  - Implementation (source files, functions)
  - Tests (test cases, scenarios)
- Every test MUST reference requirement ID
- Design documents MUST include requirements coverage matrix
- Task breakdowns MUST map to requirements

### Rationale

- Ensures nothing is missed
- Validates completeness
- Enables impact analysis
- Facilitates audits and compliance

### Validation Checklist

- [ ] Requirements have unique IDs (REQ-XXX-NNN)
- [ ] Design documents include requirements matrix
- [ ] Code comments reference requirement IDs
- [ ] Tests reference requirement IDs in descriptions
- [ ] `traceability-auditor` validation passes

**Enforcement Agent**: Use `traceability-auditor` skill to validate coverage.

---

## Article VI: Project Memory (Steering System)

**Statement**: All skills SHALL consult project memory (steering files) before making decisions.

### Requirements

- `steering/structure.md` MUST define architecture patterns
- `steering/tech.md` MUST define technology stack
- `steering/product.md` MUST define business context
- All skills MUST read steering files before executing
- Steering files MUST be kept up-to-date
- Changes to steering REQUIRE stakeholder approval

### Rationale

- Ensures consistency across skills
- Provides project context to AI agents
- Prevents architectural drift
- Enables autonomous decision-making

### Validation Checklist

- [ ] Steering files exist and are current
- [ ] Skill reads steering files before execution
- [ ] Decisions align with steering context
- [ ] Changes to steering are documented
- [ ] Steering sync performed regularly

**Management Agent**: Use `steering` skill to generate/update project memory.

---

## Article VII: Simplicity Gate (Phase -1 Gate)

**Statement**: Projects SHALL start with maximum 3 sub-projects initially.

### Requirements

- Initial architecture MUST NOT exceed 3 projects
- Projects = independently deployable units
- Additional projects require Phase -1 Gate approval
- Complexity MUST be justified with:
  - Business requirements
  - Technical constraints
  - Team capacity analysis

### Rationale

- Prevents premature complexity
- Reduces coordination overhead
- Enables faster iteration
- Forces prioritization

### Validation Checklist

- [ ] Project count ≤ 3 initially
- [ ] Each project has clear purpose
- [ ] Projects are independently deployable
- [ ] Additional projects require approval gate
- [ ] Complexity justified in design.md

**Phase -1 Gate**: Requires `system-architect` + `project-manager` approval before exceeding 3 projects.

---

## Article VIII: Anti-Abstraction Gate (Phase -1 Gate)

**Statement**: Framework features SHALL be used directly without custom abstraction layers.

### Requirements

- MUST use framework APIs directly
- MUST NOT create custom abstractions over frameworks
- MUST NOT build "wrapper libraries" around frameworks
- Abstractions require Phase -1 Gate approval with:
  - Multi-framework support justification
  - Team expertise analysis
  - Migration path documentation

### Rationale

- Prevents over-engineering
- Reduces maintenance burden
- Leverages framework best practices
- Enables framework updates

### Validation Checklist

- [ ] Framework APIs used directly in application code
- [ ] No custom wrapper libraries around frameworks
- [ ] Framework-specific features leveraged
- [ ] Abstractions justified with multi-framework need
- [ ] Team has framework expertise

**Phase -1 Gate**: Requires `system-architect` + `software-developer` approval for abstraction layers.

**Example Violations**:

- Creating `MyDatabase` wrapper around Prisma/TypeORM
- Building custom `HttpClient` wrapper around axios/fetch
- Implementing custom `Logger` abstraction over framework logging

**Valid Abstractions**:

- Multi-framework support (e.g., database library supporting Prisma AND TypeORM)
- Domain-specific abstractions (e.g., `PaymentGateway` interface with multiple providers)

---

## Article IX: Integration-First Testing

**Statement**: Integration tests SHALL use real services; mocks are discouraged.

### Requirements

- Integration tests MUST use real databases, APIs, services
- Test databases MUST be isolated (containers, test schemas)
- External APIs MUST use sandbox/test environments
- Mocks ALLOWED only when:
  - External service unavailable in test environment
  - External service has usage limits/costs
  - External service has no test environment
- Mock usage REQUIRES justification in test documentation

### Rationale

- Tests real system behavior
- Catches integration issues early
- Validates actual service interactions
- Builds confidence in deployment

### Validation Checklist

- [ ] Integration tests use real databases (Docker, test schema)
- [ ] External APIs use test/sandbox environments
- [ ] Mocks justified with unavailability/cost reasons
- [ ] Test data cleanup automated
- [ ] Tests pass against real services

**Tools**: Docker Compose, Testcontainers, test database schemas

---

## Phase -1 Gates

**Phase -1 Gates** are validation checkpoints that occur BEFORE implementation begins. They enforce constitutional compliance.

### Gate Triggers

Gates are triggered when:

- Project count exceeds 3 (Article VII)
- Custom abstraction layers proposed (Article VIII)
- EARS requirements incomplete (Article IV)
- Traceability gaps detected (Article V)

### Gate Process

1. **Detection**: `constitution-enforcer` skill detects violation
2. **Documentation**: Proposer documents justification
3. **Review**: Required skills review proposal
4. **Approval**: Stakeholders approve/reject
5. **Proceed**: Implementation continues only after approval

### Required Reviewers

| Gate                            | Required Skills                          | Stakeholders                |
| ------------------------------- | ---------------------------------------- | --------------------------- |
| Simplicity (Article VII)        | `system-architect`, `project-manager`    | Tech lead, Product owner    |
| Anti-Abstraction (Article VIII) | `system-architect`, `software-developer` | Tech lead, Senior engineer  |
| EARS Compliance (Article IV)    | `requirements-analyst`                   | Product owner, QA lead      |
| Traceability (Article V)        | `traceability-auditor`                   | QA lead, Compliance officer |

---

## Enforcement

### Validation Agent

The `constitution-enforcer` skill automatically validates compliance:

```bash
# Validate before implementation
@constitution-enforcer validate requirements.md
@constitution-enforcer validate design.md
```

### Validation Stages

| Stage          | Articles Validated   | Trigger           |
| -------------- | -------------------- | ----------------- |
| Requirements   | IV, V                | Before design     |
| Design         | I, II, VI, VII, VIII | Before tasks      |
| Implementation | III, V               | Before commit     |
| Testing        | III, V, IX           | Before deployment |

### Violation Response

1. **Blocker**: Implementation MUST NOT proceed
2. **Documentation**: Violation documented in design.md
3. **Resolution**: Either fix violation OR trigger Phase -1 Gate
4. **Re-validation**: `constitution-enforcer` re-runs validation

---

## Amendment Process

**Constitutional articles are IMMUTABLE**. Amendments require:

1. Unanimous stakeholder agreement
2. Documentation of rationale
3. Update to this file with version increment
4. Update to `constitution-enforcer` skill validation logic
5. Communication to all team members

**Version History**:

- v1.0 (Initial) - 9 Articles established

---

## Summary

| Article | Principle           | Enforced By                                     |
| ------- | ------------------- | ----------------------------------------------- |
| I       | Library-First       | `constitution-enforcer`                         |
| II      | CLI Interface       | `constitution-enforcer`                         |
| III     | Test-First          | `constitution-enforcer`, `test-engineer`        |
| IV      | EARS Format         | `constitution-enforcer`, `requirements-analyst` |
| V       | Traceability        | `traceability-auditor`                          |
| VI      | Project Memory      | All skills (steering system)                    |
| VII     | Simplicity Gate     | `constitution-enforcer` (Phase -1)              |
| VIII    | Anti-Abstraction    | `constitution-enforcer` (Phase -1)              |
| IX      | Integration Testing | `test-engineer`                                 |

---

**Powered by MUSUBI** - Constitutional governance for specification-driven development.
