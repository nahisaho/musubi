# SDD Validate Command

Validate constitutional compliance and requirements coverage.

---

## Instructions for Claude

You are executing the `/sdd-validate [feature-name]` command to validate constitutional compliance and requirements coverage for a feature.

### Command Format

```bash
/sdd-validate authentication
/sdd-validate payment-processing
/sdd-validate user-dashboard
```

### Your Task

Perform comprehensive validation of the feature implementation against:

1. Constitutional Articles (9 articles)
2. Requirements coverage (100% traceability)
3. Code quality standards
4. Security standards
5. Test coverage

---

## Process

### 1. Read All Documentation

**IMPORTANT**: Always read ENGLISH versions (.md) as they are the reference/source.

```bash
# Requirements and Design (English versions)
storage/specs/{{feature-name}}-requirements.md
storage/specs/{{feature-name}}-design.md
storage/specs/{{feature-name}}-tasks.md

# Steering Context (English versions)
steering/structure.md
steering/tech.md
steering/product.md
steering/rules/constitution.md

# Source Code
lib/{{feature}}/src/**/*.ts
lib/{{feature}}/tests/**/*.test.ts
app/api/{{resource}}/**/*.ts
```

**Note**: Japanese versions (.ja.md) are translations only. Use English versions for validation.

---

### 2. Constitutional Validation

Validate each of the 9 Constitutional Articles:

#### Article I: Library-First Principle

**Requirement**: All new features SHALL begin as independent libraries.

**Validation Steps**:

1. Check `lib/{{feature}}/` directory exists
2. Verify library structure:
   - [ ] `lib/{{feature}}/src/` exists
   - [ ] `lib/{{feature}}/tests/` exists
   - [ ] `lib/{{feature}}/package.json` exists
   - [ ] Public API exported via `src/index.ts`
3. Verify NO dependencies on application code:
   - Grep for imports from `app/`, `pages/`, etc.
   - Library should only import from own `src/` or external packages

**Example Output**:

```markdown
### Article I: Library-First Principle

**Status**: ✅ PASS

**Evidence**:

- Library location: `lib/auth/`
- Public API: `lib/auth/src/index.ts`
- Independent tests: `lib/auth/tests/`
- No application dependencies found

**Files Checked**:

- lib/auth/src/service.ts
- lib/auth/src/repository.ts
- lib/auth/src/index.ts
```

**OR if violation**:

```markdown
### Article I: Library-First Principle

**Status**: ❌ FAIL

**Violations**:

1. Feature implemented in `app/components/` instead of `lib/`
2. Missing independent test suite

**Required Actions**:

- Move feature to `lib/{{feature}}/`
- Create independent test suite
- Expose public API via `src/index.ts`
```

---

#### Article II: CLI Interface Mandate

**Requirement**: All libraries SHALL expose functionality through CLI interfaces.

**Validation Steps**:

1. Check `lib/{{feature}}/cli.ts` exists
2. Verify CLI functionality:
   - [ ] Executable shebang (`#!/usr/bin/env node`)
   - [ ] Help text (`--help` flag)
   - [ ] Commands for primary operations
   - [ ] Proper exit codes (0=success, non-zero=error)
3. Test CLI:
   ```bash
   ./lib/{{feature}}/cli.ts --help
   ```

**Example Output**:

````markdown
### Article II: CLI Interface Mandate

**Status**: ✅ PASS

**Evidence**:

- CLI file: `lib/auth/cli.ts`
- Commands: create-user, login, logout, validate-session
- Help text: ✅ Available via `--help`
- Exit codes: ✅ Proper handling

**CLI Test**:

```bash
$ ./lib/auth/cli.ts --help
Usage: auth [command] [options]

Commands:
  create-user    Create a new user
  login          Authenticate user
  logout         End user session
  validate-session  Validate session token

Options:
  -h, --help     Display help
  -v, --version  Display version
```
````

````

---

#### Article III: Test-First Imperative

**Requirement**: Tests SHALL be written before implementation (Red-Green-Blue cycle).

**Validation Steps**:
1. Check git history for Red-Green-Blue pattern:
   ```bash
   git log --oneline lib/{{feature}}/
````

2. Verify test commits BEFORE implementation commits:
   - `test: add failing tests for REQ-XXX-001` (RED)
   - `feat: implement REQ-XXX-001` (GREEN)
   - `refactor: improve {{component}}` (BLUE)
3. Check test coverage ≥ 80%:
   ```bash
   npm test -- --coverage
   ```

**Example Output**:

```markdown
### Article III: Test-First Imperative

**Status**: ✅ PASS

**Evidence from Git History**:
```

abc123f test: add failing tests for REQ-AUTH-001
def456g feat: implement REQ-AUTH-001 (user login)
ghi789h refactor: extract validator from auth service

```

**Red-Green-Blue Cycle**: ✅ Verified in git history

**Test Coverage**:
- Statements: 92%
- Branches: 88%
- Functions: 95%
- Lines: 91%
- **Overall**: 91.5% ✅ (target: 80%)
```

---

#### Article IV: EARS Requirements Format

**Requirement**: All requirements SHALL use EARS format.

**Validation Steps**:

1. Read `storage/specs/{{feature-name}}-requirements.md`
2. Check each requirement for EARS pattern:
   - Ubiquitous: `The [system] SHALL`
   - Event-driven: `WHEN ... THEN`
   - State-driven: `WHILE ... SHALL`
   - Unwanted: `IF ... THEN`
   - Optional: `WHERE ... SHALL`
3. Verify keywords:
   - [ ] Uses SHALL/SHALL NOT (not SHOULD/MUST/MAY)
   - [ ] No ambiguous language
4. Verify structure:
   - [ ] Unique IDs (REQ-XXX-NNN)
   - [ ] Acceptance criteria defined
   - [ ] Testable and measurable

**Example Output**:

````markdown
### Article IV: EARS Requirements Format

**Status**: ✅ PASS

**Requirements Checked**: 15

**EARS Patterns Used**:

- Ubiquitous: 5 requirements
- Event-driven: 7 requirements
- State-driven: 1 requirement
- Unwanted behavior: 2 requirements
- Optional feature: 0 requirements

**Keyword Compliance**:

- ✅ All requirements use SHALL/SHALL NOT
- ✅ No ambiguous keywords found (SHOULD, MUST, MAY)

**Sample Requirement**:

```markdown
### REQ-AUTH-001: User Login

WHEN a user provides valid credentials,
THEN the authentication system SHALL authenticate the user
AND the system SHALL create a session.

**Acceptance Criteria**:

- Email and password validated
- Session created with 24-hour expiry
```
````

✅ Valid EARS format (Event-driven pattern)

````

---

#### Article V: Traceability Mandate

**Requirement**: 100% traceability SHALL be maintained between Requirements ↔ Design ↔ Code ↔ Tests.

**Validation Steps**:
1. Extract all requirement IDs from requirements.md
2. For each requirement, verify:
   - [ ] Mapped in design.md (requirements coverage matrix)
   - [ ] Implemented in code (grep for REQ-XXX-NNN in source)
   - [ ] Tested (grep for REQ-XXX-NNN in tests)
3. Calculate coverage percentages
4. Identify gaps

**Example Output**:
```markdown
### Article V: Traceability Mandate

**Status**: ✅ PASS

**Traceability Matrix**:

| Requirement | Design | Code | Tests | Status |
|-------------|--------|------|-------|--------|
| REQ-AUTH-001 | ✅ design.md#auth-service | ✅ lib/auth/src/service.ts:45 | ✅ lib/auth/tests/service.test.ts:23 | Complete |
| REQ-AUTH-002 | ✅ design.md#password-hash | ✅ lib/auth/src/password.ts:12 | ✅ lib/auth/tests/password.test.ts:8 | Complete |
| REQ-AUTH-003 | ✅ design.md#session-mgmt | ✅ lib/auth/src/service.ts:89 | ✅ lib/auth/tests/service.test.ts:67 | Complete |
| REQ-PERF-001 | ✅ design.md#caching | ✅ lib/auth/src/cache.ts:23 | ✅ lib/auth/tests/integration.test.ts:112 | Complete |
| REQ-SEC-001 | ✅ design.md#security | ✅ lib/auth/src/password.ts:34 | ✅ lib/auth/tests/security.test.ts:45 | Complete |

**Coverage Summary**:
- Total Requirements: 5
- Requirements → Design: 5 (100% ✅)
- Requirements → Code: 5 (100% ✅)
- Requirements → Tests: 5 (100% ✅)
- **Overall Coverage**: 100% ✅

**Gap Analysis**: No gaps detected
````

**OR if gaps detected**:

```markdown
### Article V: Traceability Mandate

**Status**: ❌ FAIL

**Gaps Detected**:

1. REQ-AUTH-004: No test coverage found
2. REQ-PERF-001: Not implemented in code
3. REQ-SEC-002: Not mentioned in design

**Coverage Summary**:

- Requirements → Design: 4/5 (80%)
- Requirements → Code: 4/5 (80%)
- Requirements → Tests: 3/5 (60%) ❌

**Required Actions**:

- Add tests for REQ-AUTH-004
- Implement REQ-PERF-001
- Update design.md to cover REQ-SEC-002
```

---

#### Article VI: Project Memory (Steering System)

**Requirement**: All skills SHALL consult project memory (steering files) before making decisions.

**Validation Steps**:

1. Verify steering files exist and are current
2. Check if implementation aligns with steering:
   - Architecture pattern from `steering/structure.md`
   - Technology stack from `steering/tech.md`
   - Product goals from `steering/product.md`

**Example Output**:

```markdown
### Article VI: Project Memory

**Status**: ✅ PASS

**Steering Alignment**:

**Architecture (steering/structure.md)**:

- Expected: Library-first pattern
- Actual: ✅ Feature implemented as library (`lib/auth/`)

**Technology Stack (steering/tech.md)**:

- Expected: TypeScript, Next.js, PostgreSQL, Prisma
- Actual: ✅ All technologies used correctly

**Product Context (steering/product.md)**:

- Product Goal: B2B SaaS authentication
- Feature Alignment: ✅ Implements user authentication for B2B use case
```

---

#### Article VII: Simplicity Gate (Phase -1)

**Requirement**: Projects SHALL start with maximum 3 sub-projects initially.

**Validation Steps**:

1. Count independently deployable projects
2. If > 3, check for Phase -1 Gate approval in design.md

**Example Output**:

```markdown
### Article VII: Simplicity Gate

**Status**: ✅ PASS

**Project Count**: 1 (monorepo with libraries)

**Projects**:

1. Main application (Next.js with libraries)

**Within Limit**: ✅ (≤ 3)
```

---

#### Article VIII: Anti-Abstraction Gate (Phase -1)

**Requirement**: Framework features SHALL be used directly without custom abstraction layers.

**Validation Steps**:

1. Search for custom abstraction layers:
   - Custom ORM wrappers
   - Custom HTTP client wrappers
   - Custom logging abstractions
2. If found, verify Phase -1 Gate approval with justification

**Example Output**:

```markdown
### Article VIII: Anti-Abstraction Gate

**Status**: ✅ PASS

**Framework Usage Analysis**:

- **ORM**: Uses Prisma directly ✅ (no custom wrapper)
- **Password Hashing**: Uses bcrypt directly ✅
- **HTTP**: Uses Next.js API routes directly ✅
- **Validation**: Uses Zod directly ✅

**Custom Abstractions**: None detected ✅
```

**OR if violation**:

```markdown
### Article VIII: Anti-Abstraction Gate

**Status**: ⚠️ WARNING

**Custom Abstractions Detected**:

1. `lib/database/wrapper.ts` - Custom Prisma wrapper

**Phase -1 Gate Approval**: ❌ Not found in design.md

**Required Actions**:

- Justify abstraction with multi-framework support need
- OR remove abstraction and use Prisma directly
- Document in design.md ADR
- Get approval from @system-architect + @software-developer
```

---

#### Article IX: Integration-First Testing

**Requirement**: Integration tests SHALL use real services; mocks are discouraged.

**Validation Steps**:

1. Check integration tests use real services:
   - Real database (Docker, test schema)
   - Real cache (Redis test instance)
   - Real external APIs (sandbox environments)
2. Verify mocks are justified

**Example Output**:

````markdown
### Article IX: Integration-First Testing

**Status**: ✅ PASS

**Integration Tests Analysis**:

**Database Tests**:

- Uses: Real PostgreSQL (Docker Compose)
- Evidence: `lib/auth/tests/integration.test.ts:12`

```typescript
beforeAll(async () => {
  prisma = new PrismaClient({
    datasourceUrl: process.env.TEST_DATABASE_URL, // Real DB
  });
});
```
````

- ✅ Real database confirmed

**Cache Tests**:

- Uses: Real Redis (Docker Compose)
- ✅ Real cache confirmed

**External API Tests**:

- Payment API: Uses sandbox environment ✅
- Email API: **Mock** ⚠️
  - Justification: No test environment available ✅
  - Documented in: `tests/README.md`

**Mock Usage**: 1 justified mock found (Email API)

- ✅ Justification documented

````

---

### 3. Code Quality Validation

Run code quality checks:

```bash
# Linting
npm run lint

# Type checking
npx tsc --noEmit

# Code review
@code-reviewer review lib/{{feature}}/src/
````

**Example Output**:

```markdown
## Code Quality Validation

**Linting**: ✅ No issues (ESLint)
**Type Checking**: ✅ No errors (TypeScript)
**Code Review**: ✅ Passed

**SOLID Principles**:

- Single Responsibility: ✅ Each class has one responsibility
- Open/Closed: ✅ Open for extension, closed for modification
- Liskov Substitution: ✅ Proper inheritance
- Interface Segregation: ✅ Small, focused interfaces
- Dependency Inversion: ✅ Depends on abstractions

**Best Practices**:

- ✅ Proper error handling
- ✅ Input validation
- ✅ No code duplication
- ✅ Clear naming conventions
- ✅ Proper TypeScript types
```

---

### 4. Security Validation

```bash
@security-auditor audit lib/{{feature}}/
```

**Example Output**:

```markdown
## Security Validation

**OWASP Top 10 Check**:

- ✅ A01: Broken Access Control - Auth middleware enforced
- ✅ A02: Cryptographic Failures - bcrypt used (cost 12)
- ✅ A03: Injection - Parameterized queries (Prisma ORM)
- ✅ A04: Insecure Design - Security by design principles
- ✅ A05: Security Misconfiguration - Proper config
- ✅ A06: Vulnerable Components - npm audit passed
- ✅ A07: Auth Failures - Proper auth implementation
- ✅ A08: Data Integrity - Input validation
- ✅ A09: Logging Failures - Proper logging
- ✅ A10: SSRF - No server-side requests

**Vulnerabilities**: 0 critical, 0 high, 0 medium
```

---

### 5. Performance Validation

```bash
@performance-optimizer analyze lib/{{feature}}/
```

**Example Output**:

```markdown
## Performance Validation

**Response Time** (from REQ-PERF-001):

- Target: < 200ms (95th percentile)
- Actual: 150ms (95th percentile) ✅
- 99th percentile: 280ms ✅

**Database Queries**:

- N+1 queries: None detected ✅
- Indexes: ✅ Properly indexed
- Connection pooling: ✅ Configured (20 connections)

**Caching**:

- Redis cache: ✅ Implemented
- Hit rate: 85%
- TTL: 5 minutes
```

---

### 6. Generate Validation Report

**Save to**: `storage/validation/{{feature-name}}-validation-report.md`

**Report Structure**:

```markdown
# Validation Report: {{FEATURE_NAME}}

**Date**: {{DATE}}
**Status**: ✅ PASS / ❌ FAIL
**Validator**: {{VALIDATOR}}

---

## Executive Summary

**Overall Status**: ✅ PASS

**Constitutional Compliance**: 9/9 articles ✅
**Requirements Coverage**: 100% ✅
**Test Coverage**: 91.5% ✅
**Security**: 0 vulnerabilities ✅
**Performance**: Within targets ✅

---

## Constitutional Validation

[Include all 9 articles validation results]

---

## Requirements Traceability

[Include traceability matrix]

---

## Code Quality

[Include code quality results]

---

## Security

[Include security audit results]

---

## Performance

[Include performance validation results]

---

## Recommendations

[Optional improvements, non-blocking issues]

---

## Sign-Off

**Validated By**: [Name/Role]
**Date**: {{DATE}}
**Approved for Production**: ✅ YES / ❌ NO
```

---

### 7. Generate Summary

```markdown
## ✅ Validation Complete

**Feature**: {{FEATURE_NAME}}
**Report**: storage/validation/{{feature-name}}-validation-report.md

### Validation Summary:

**Constitutional Compliance**:

- ✅ Article I: Library-First
- ✅ Article II: CLI Interface
- ✅ Article III: Test-First
- ✅ Article IV: EARS Format
- ✅ Article V: Traceability (100%)
- ✅ Article VI: Steering Alignment
- ✅ Article VII: Simplicity (1 project ≤ 3)
- ✅ Article VIII: No Custom Abstractions
- ✅ Article IX: Integration Tests (Real Services)

**Overall**: 9/9 ✅

**Coverage**:

- Requirements → Design: 100% ✅
- Requirements → Code: 100% ✅
- Requirements → Tests: 100% ✅
- Test Coverage: 91.5% ✅ (target: 80%)

**Quality**:

- Linting: ✅ Pass
- Type Checking: ✅ Pass
- Code Review: ✅ Pass
- Security: 0 vulnerabilities ✅
- Performance: Within targets ✅

**Production Readiness**: ✅ APPROVED

### Next Steps:

1. Deploy to staging
2. Run acceptance tests
3. Get stakeholder sign-off
4. Deploy to production: `@devops-engineer deploy production`
```

---

## Tool Usage

### Required:

- **Read**: All specification documents, source code, tests
- **Grep**: Search for requirement IDs, patterns
- **Bash**: Run tests, linters, coverage tools

### Skills to Invoke:

- `@traceability-auditor`: Validate 100% coverage
- `@code-reviewer`: Code quality review
- `@security-auditor`: OWASP Top 10 validation
- `@performance-optimizer`: Performance analysis

---

## Exit Codes

Based on validation results:

- **Exit 0**: ✅ All validations passed
- **Exit 1**: ❌ Constitutional violations detected
- **Exit 2**: ⚠️ Warnings (non-blocking issues)

---

**Execution**: Begin validation now for the specified feature.
