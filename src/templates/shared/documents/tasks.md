# Task Breakdown: {{FEATURE_NAME}}

**Project**: {{PROJECT_NAME}}
**Version**: 1.0
**Status**: Draft
**Date**: {{DATE}}
**Sprint**: [Sprint Number/Milestone]

---

## Document Control

| Version | Date     | Author     | Changes                |
| ------- | -------- | ---------- | ---------------------- |
| 1.0     | {{DATE}} | {{AUTHOR}} | Initial task breakdown |

---

## Overview

### Purpose

This document breaks down the design into actionable implementation tasks with requirements traceability.

### References

- **Requirements**: [requirements.md](requirements.md)
- **Design**: [design.md](design.md)
- **Steering Context**: [steering/](../../steering/)

---

## Task Breakdown Summary

| Priority      | Total Tasks | Story Points | Estimated Hours |
| ------------- | ----------- | ------------ | --------------- |
| P0 (Critical) | [N]         | [N]          | [N]             |
| P1 (High)     | [N]         | [N]          | [N]             |
| P2 (Medium)   | [N]         | [N]          | [N]             |
| P3 (Low)      | [N]         | [N]          | [N]             |
| **Total**     | **[N]**     | **[N]**      | **[N]**         |

**Sprint Allocation**:

- Sprint 1: P0 tasks ([N] points)
- Sprint 2: P1 tasks ([N] points)
- Sprint 3: P2 tasks ([N] points)

---

## Task Template

Each task follows this structure:

````markdown
### TASK-XXX: [Task Title]

**Priority**: P0/P1/P2/P3
**Story Points**: [1/2/3/5/8/13]
**Estimated Hours**: [N]
**Assignee**: [Name]
**Status**: [Not Started/In Progress/Blocked/Testing/Complete]

**Description**:
[What needs to be done]

**Requirements Coverage**:

- REQ-XXX-NNN: [Requirement title]
- REQ-XXX-NNN: [Requirement title]

**Acceptance Criteria**:

- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] [Testable criterion 3]

**Dependencies**:

- TASK-XXX: [Dependency description]

**Test-First Checklist** (Article III):

- [ ] Tests written BEFORE implementation
- [ ] Red: Failing test committed
- [ ] Green: Minimal implementation passes test
- [ ] Blue: Refactored with confidence

**Implementation Notes**:
[Technical details, file paths, code snippets]

**Validation**:

```bash
# Commands to verify completion
npm test src/{{component}}.test.ts
npm run lint src/{{component}}.ts
```
````

````

---

## P0 Tasks (Critical - Launch Blockers)

### TASK-001: Set Up Project Structure (Library-First)

**Priority**: P0
**Story Points**: 3
**Estimated Hours**: 4
**Assignee**: [Name]
**Status**: Not Started

**Description**:
Create library-first project structure following Article I (Constitutional Governance).

**Requirements Coverage**:
- REQ-{{COMPONENT}}-001 (indirectly - foundation for implementation)

**Acceptance Criteria**:
- [ ] Library created in `lib/{{component}}/`
- [ ] Independent test suite in `lib/{{component}}/tests/`
- [ ] CLI interface in `lib/{{component}}/cli.ts`
- [ ] Library exports in `lib/{{component}}/index.ts`
- [ ] No dependencies on application code

**Constitutional Compliance**:
- ✅ **Article I**: Library-First structure
- ✅ **Article II**: CLI interface prepared

**Implementation Notes**:
```bash
# Directory structure
lib/{{component}}/
├── src/
│   ├── index.ts          # Public API
│   ├── service.ts        # Business logic
│   ├── repository.ts     # Data access
│   └── types.ts          # TypeScript types
├── tests/
│   ├── service.test.ts
│   └── repository.test.ts
├── cli.ts                # CLI interface
└── package.json          # Library metadata
````

**Validation**:

```bash
@constitution-enforcer validate lib/{{component}}/
```

---

### TASK-002: Write Tests for REQ-{{COMPONENT}}-001

**Priority**: P0
**Story Points**: 2
**Estimated Hours**: 3
**Assignee**: [Name]
**Status**: Not Started

**Description**:
Write failing tests for REQ-{{COMPONENT}}-001 (Test-First / Red phase).

**Requirements Coverage**:

- REQ-{{COMPONENT}}-001: [Requirement title]

**Acceptance Criteria**:

- [ ] Test file created: `lib/{{component}}/tests/service.test.ts`
- [ ] All acceptance criteria from REQ-{{COMPONENT}}-001 have tests
- [ ] Tests fail (Red phase)
- [ ] Tests reference requirement ID in description
- [ ] Git commit message: `test: add failing tests for REQ-{{COMPONENT}}-001`

**Constitutional Compliance**:

- ✅ **Article III**: Test-First (Red phase)
- ✅ **Article V**: Tests reference requirement ID

**Implementation Notes**:

```typescript
// lib/{{component}}/tests/service.test.ts

describe('REQ-{{COMPONENT}}-001: [Requirement title]', () => {
  it('should [acceptance criterion 1]', async () => {
    // Arrange
    const service = new {{COMPONENT}}Service(mockRepository);
    const input = { field1: 'value1', field2: 42 };

    // Act
    const result = await service.create(input);

    // Assert
    expect(result).toMatchObject({
      id: expect.any(String),
      field1: 'value1',
      field2: 42
    });
  });

  it('should [acceptance criterion 2]', async () => {
    // Test for error handling...
  });
});
```

**Dependencies**:

- TASK-001: Project structure must exist

**Validation**:

```bash
npm test lib/{{component}}/tests/service.test.ts
# Should FAIL (Red phase)
```

---

### TASK-003: Implement {{COMPONENT}} Service (REQ-{{COMPONENT}}-001)

**Priority**: P0
**Story Points**: 5
**Estimated Hours**: 8
**Assignee**: [Name]
**Status**: Not Started

**Description**:
Implement minimal {{COMPONENT}} service to pass tests (Green phase).

**Requirements Coverage**:

- REQ-{{COMPONENT}}-001: [Requirement title]

**Acceptance Criteria**:

- [ ] Service class implemented
- [ ] Business logic for create operation
- [ ] Input validation
- [ ] Error handling for edge cases
- [ ] All tests from TASK-002 pass
- [ ] Git commit message: `feat: implement REQ-{{COMPONENT}}-001`

**Constitutional Compliance**:

- ✅ **Article III**: Test-First (Green phase)
- ✅ **Article V**: Code comments reference REQ-{{COMPONENT}}-001

**Implementation Notes**:

```typescript
// lib/{{component}}/src/service.ts

export class {{COMPONENT}}Service {
  constructor(private repository: {{COMPONENT}}Repository) {}

  /**
   * REQ-{{COMPONENT}}-001: Create new {{resource}}
   */
  async create(data: CreateResourceDTO): Promise<Resource> {
    // Acceptance Criterion 1: Validate input
    this.validateInput(data);

    // Acceptance Criterion 2: Check for duplicates
    const existing = await this.repository.findByUserAndField1(
      data.userId,
      data.field1
    );
    if (existing) {
      throw new ConflictError('Resource already exists');
    }

    // Acceptance Criterion 3: Create and return
    return this.repository.create(data);
  }

  private validateInput(data: CreateResourceDTO): void {
    if (!data.field1 || data.field1.length > 255) {
      throw new ValidationError('field1 is required and max 255 chars');
    }
    if (!data.field2 || data.field2 <= 0) {
      throw new ValidationError('field2 must be positive');
    }
  }
}
```

**Dependencies**:

- TASK-002: Tests must be written first

**Validation**:

```bash
npm test lib/{{component}}/tests/service.test.ts
# Should PASS (Green phase)
```

---

### TASK-004: Refactor {{COMPONENT}} Service

**Priority**: P0
**Story Points**: 2
**Estimated Hours**: 3
**Assignee**: [Name]
**Status**: Not Started

**Description**:
Refactor service code for better design (Blue phase).

**Requirements Coverage**:

- REQ-{{COMPONENT}}-001 (maintained)

**Acceptance Criteria**:

- [ ] Code follows SOLID principles
- [ ] No duplication
- [ ] Clear separation of concerns
- [ ] All tests still pass
- [ ] Code review passed
- [ ] Git commit message: `refactor: improve {{component}} service`

**Constitutional Compliance**:

- ✅ **Article III**: Test-First (Blue phase)

**Implementation Notes**:

- Extract validation logic to separate validator class
- Use dependency injection for repository
- Add proper TypeScript types
- Improve error messages

**Dependencies**:

- TASK-003: Implementation must be complete

**Validation**:

```bash
npm test lib/{{component}}/tests/service.test.ts
# Should STILL PASS after refactoring
npm run lint lib/{{component}}/src/service.ts
```

---

### TASK-005: Implement Database Repository

**Priority**: P0
**Story Points**: 5
**Estimated Hours**: 8
**Assignee**: [Name]
**Status**: Not Started

**Description**:
Implement database repository with Prisma/TypeORM.

**Requirements Coverage**:

- REQ-{{COMPONENT}}-004: Database schema

**Acceptance Criteria**:

- [ ] Repository interface defined
- [ ] Prisma schema created
- [ ] CRUD operations implemented
- [ ] Database indexes created
- [ ] Migration files created
- [ ] Integration tests pass (real database)

**Constitutional Compliance**:

- ✅ **Article IX**: Integration tests use real database (Docker container)

**Implementation Notes**:

```typescript
// lib/{{component}}/src/repository.ts

export class {{COMPONENT}}Repository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateResourceDTO): Promise<Resource> {
    return this.prisma.{{resource}}.create({
      data: {
        userId: data.userId,
        field1: data.field1,
        field2: data.field2
      }
    });
  }

  async findById(id: string): Promise<Resource | null> {
    return this.prisma.{{resource}}.findUnique({
      where: { id }
    });
  }
}
```

**Test Setup** (Docker Compose):

```yaml
services:
  test-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test
    ports:
      - '5432:5432'
```

**Dependencies**:

- TASK-001: Project structure

**Validation**:

```bash
docker-compose up -d test-db
npm test lib/{{component}}/tests/repository.test.ts
# Should use REAL database (Article IX)
```

---

### TASK-006: Implement CLI Interface

**Priority**: P0
**Story Points**: 3
**Estimated Hours**: 4
**Assignee**: [Name]
**Status**: Not Started

**Description**:
Implement CLI interface for {{component}} library (Article II).

**Requirements Coverage**:

- REQ-{{COMPONENT}}-001 (CLI exposure)

**Acceptance Criteria**:

- [ ] CLI entry point: `lib/{{component}}/cli.ts`
- [ ] Commands: create, get, list, update, delete
- [ ] Help text with --help flag
- [ ] Error handling with proper exit codes
- [ ] CLI tests pass

**Constitutional Compliance**:

- ✅ **Article II**: CLI Interface Mandate

**Implementation Notes**:

```typescript
// lib/{{component}}/cli.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { {{COMPONENT}}Service } from './src/service';

const program = new Command();

program
  .name('{{component}}')
  .description('CLI for {{component}} operations')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new {{resource}}')
  .requiredOption('--field1 <value>', 'Field 1 value')
  .requiredOption('--field2 <value>', 'Field 2 value', parseInt)
  .action(async (options) => {
    const service = new {{COMPONENT}}Service(repository);
    const result = await service.create({
      field1: options.field1,
      field2: options.field2
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  });

program.parse();
```

**Dependencies**:

- TASK-003: Service implementation

**Validation**:

```bash
./lib/{{component}}/cli.ts --help
./lib/{{component}}/cli.ts create --field1=test --field2=42
```

---

### TASK-007: Implement REST API Endpoints

**Priority**: P0
**Story Points**: 5
**Estimated Hours**: 8
**Assignee**: [Name]
**Status**: Not Started

**Description**:
Implement REST API endpoints for {{component}}.

**Requirements Coverage**:

- REQ-{{COMPONENT}}-001: Create endpoint
- REQ-{{COMPONENT}}-002: Get endpoint
- REQ-{{COMPONENT}}-003: List endpoint

**Acceptance Criteria**:

- [ ] POST /api/{{resource}} implemented
- [ ] GET /api/{{resource}}/:id implemented
- [ ] GET /api/{{resource}} implemented
- [ ] Input validation middleware
- [ ] Error handling middleware
- [ ] API tests pass

**Implementation Notes**:

```typescript
// app/api/{{resource}}/route.ts

import { {{COMPONENT}}Service } from '@/lib/{{component}}';

export async function POST(request: Request) {
  const body = await request.json();

  const service = new {{COMPONENT}}Service(repository);
  const result = await service.create(body);

  return Response.json(result, { status: 201 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const service = new {{COMPONENT}}Service(repository);
  const result = await service.findById(id);

  if (!result) {
    return Response.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  return Response.json(result);
}
```

**Dependencies**:

- TASK-003: Service implementation
- TASK-005: Repository implementation

**Validation**:

```bash
npm run dev
curl -X POST http://localhost:3000/api/{{resource}} \
  -H "Content-Type: application/json" \
  -d '{"field1":"test","field2":42}'
```

---

## P1 Tasks (High - Required for Launch)

### TASK-008: Write Integration Tests

**Priority**: P1
**Story Points**: 5
**Estimated Hours**: 8
**Assignee**: [Name]
**Status**: Not Started

**Description**:
Write integration tests using real database and services.

**Requirements Coverage**:

- REQ-{{COMPONENT}}-001 to REQ-{{COMPONENT}}-005 (all requirements)

**Acceptance Criteria**:

- [ ] Integration tests for all API endpoints
- [ ] Tests use real PostgreSQL (Docker container)
- [ ] Tests use real Redis cache
- [ ] No mocks for database/cache (Article IX)
- [ ] Coverage ≥ 80%

**Constitutional Compliance**:

- ✅ **Article IX**: Integration-First Testing (real services)

**Dependencies**:

- TASK-007: API implementation

---

### TASK-009: Implement Caching Layer

**Priority**: P1
**Story Points**: 3
**Estimated Hours**: 5
**Assignee**: [Name]
**Status**: Not Started

**Description**:
Add Redis caching for read operations.

**Requirements Coverage**:

- REQ-PERF-001: Performance optimization

**Acceptance Criteria**:

- [ ] Redis client configured
- [ ] Cache-aside pattern implemented
- [ ] TTL = 5 minutes
- [ ] Cache invalidation on writes
- [ ] Cache hit/miss metrics

---

### TASK-010: Security Audit

**Priority**: P1
**Story Points**: 3
**Estimated Hours**: 4
**Assignee**: [Name]
**Status**: Not Started

**Description**:
Perform security audit and fix vulnerabilities.

**Requirements Coverage**:

- REQ-SEC-001: Security requirements

**Acceptance Criteria**:

- [ ] OWASP Top 10 validated
- [ ] Input validation on all endpoints
- [ ] Output encoding for XSS prevention
- [ ] SQL injection prevention (parameterized queries)
- [ ] Authentication required for protected endpoints
- [ ] Security audit report generated

**Validation**:

```bash
@security-auditor audit src/
```

---

## P2 Tasks (Medium - Nice to Have)

### TASK-011: Add Pagination

**Priority**: P2
**Story Points**: 2
**Estimated Hours**: 3
**Assignee**: [Name]
**Status**: Not Started

**Description**:
Add pagination to list endpoint.

**Requirements Coverage**:

- REQ-PERF-001 (performance enhancement)

**Acceptance Criteria**:

- [ ] Cursor-based pagination
- [ ] Limit = 100 items per page
- [ ] Next/previous page links
- [ ] Total count header

---

### TASK-012: Add Monitoring Dashboards

**Priority**: P2
**Story Points**: 3
**Estimated Hours**: 5
**Assignee**: [Name]
**Status**: Not Started

**Description**:
Create Grafana dashboards for monitoring.

**Requirements Coverage**:

- REQ-AVAIL-001: Monitoring setup

---

## Requirements Coverage Matrix

| Requirement ID        | Priority | Tasks                                  | Test Coverage | Status      |
| --------------------- | -------- | -------------------------------------- | ------------- | ----------- |
| REQ-{{COMPONENT}}-001 | P0       | TASK-002, TASK-003, TASK-004, TASK-007 | 95%           | Not Started |
| REQ-{{COMPONENT}}-002 | P0       | TASK-007                               | 90%           | Not Started |
| REQ-{{COMPONENT}}-003 | P0       | TASK-007                               | 90%           | Not Started |
| REQ-{{COMPONENT}}-004 | P0       | TASK-005                               | 85%           | Not Started |
| REQ-PERF-001          | P1       | TASK-009, TASK-011                     | 80%           | Not Started |
| REQ-SEC-001           | P1       | TASK-010                               | 100%          | Not Started |
| REQ-AVAIL-001         | P2       | TASK-012                               | N/A           | Not Started |

**Coverage Summary**:

- Total Requirements: [N]
- Requirements with Tasks: [N] ([%]%)
- **Coverage Goal**: 100%

---

## Task Dependencies Graph

```
TASK-001 (Project Structure)
    ├── TASK-002 (Tests)
    │       └── TASK-003 (Implementation)
    │               ├── TASK-004 (Refactor)
    │               ├── TASK-006 (CLI)
    │               └── TASK-007 (API)
    │                       └── TASK-008 (Integration Tests)
    │                               ├── TASK-009 (Caching)
    │                               └── TASK-010 (Security)
    └── TASK-005 (Repository)
            └── TASK-007 (API)
```

---

## Sprint Planning

### Sprint 1 (P0 Tasks)

**Goal**: Complete core functionality

**Tasks**: TASK-001 through TASK-007
**Story Points**: 25
**Team Capacity**: 30 points/sprint
**Risk**: Medium (database complexity)

---

### Sprint 2 (P1 Tasks)

**Goal**: Production readiness

**Tasks**: TASK-008 through TASK-010
**Story Points**: 11
**Team Capacity**: 30 points/sprint
**Risk**: Low

---

### Sprint 3 (P2 Tasks)

**Goal**: Enhancements

**Tasks**: TASK-011, TASK-012
**Story Points**: 5
**Team Capacity**: 30 points/sprint
**Risk**: Low

---

## Validation Checklist

Before marking feature as complete:

### Constitutional Compliance

- [ ] **Article I**: All features implemented as libraries
- [ ] **Article II**: CLI interfaces provided
- [ ] **Article III**: Test-First followed (check git history)
- [ ] **Article V**: 100% requirements → task → code → test traceability
- [ ] **Article IX**: Integration tests use real services

### Quality Gates

- [ ] All P0 tasks complete
- [ ] All tests passing
- [ ] Test coverage ≥ 80%
- [ ] Code review passed
- [ ] Security audit passed
- [ ] Performance benchmarks met

### Validation Commands

```bash
# Traceability validation
@traceability-auditor validate requirements.md tasks.md src/

# Constitutional validation
@constitution-enforcer validate src/

# Code review
@code-reviewer review src/

# Security audit
@security-auditor audit src/
```

---

## References

- [Requirements Specification](requirements.md)
- [Design Document](design.md)
- [Constitutional Governance](../../steering/rules/constitution.md)
- [Workflow Guide](../../steering/rules/workflow.md)

---

**Powered by MUSUBI** - Specification Driven Development
