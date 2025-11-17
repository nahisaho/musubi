# SDD Requirements Command

Create EARS-format requirements specification.

---

## Instructions for Claude

You are executing the `/sdd-requirements [feature-name]` command to create a requirements specification.

### Command Format

```bash
/sdd-requirements authentication
/sdd-requirements payment-processing
/sdd-requirements user-dashboard
```

### Your Task

Generate a comprehensive requirements specification in EARS format for the specified feature.

---

## Process

### 1. Read Steering Context (Article VI)

**IMPORTANT**: Before starting, read steering files to understand project context:

```bash
# Read these files first
steering/product.md      # Business context, users, goals
steering/structure.md    # Architecture patterns
steering/tech.md         # Technology stack
```

**Extract**:

- Target users
- Product goals
- Existing architecture patterns
- Technology constraints

---

### 2. Gather Requirements

**Methods** (use as appropriate):

#### A. Stakeholder Interview (if user is available)

Use `AskUserQuestion` tool to ask:

- Who are the users of this feature?
- What problem does this solve?
- What are the critical workflows?
- What are the acceptance criteria?
- Are there any constraints (performance, security, compliance)?

#### B. Research Existing System (brownfield)

- Search for existing implementation: `grep -r "{{feature}}" src/`
- Read related code
- Identify current behavior
- Document what needs to change (delta spec)

#### C. Infer from Context

- Analyze steering/product.md for user types
- Review existing requirements docs
- Check for similar features in codebase

---

### 3. Generate Requirements Document

Use template from `templates/requirements.md`:

**Structure**:

```markdown
# Requirements Specification: {{FEATURE_NAME}}

## Overview

- Purpose
- Scope (in/out)
- Business context (from steering/product.md)

## Stakeholders

[Table of roles]

## Functional Requirements

### REQ-{{COMPONENT}}-001: [Title]

[EARS Pattern - choose appropriate pattern]

**Acceptance Criteria**:

- [Testable criterion 1]
- [Testable criterion 2]

**Priority**: P0/P1/P2/P3
**Status**: Draft
**Traceability**: (leave blank for now)

[Repeat for all requirements]

## Non-Functional Requirements

### REQ-PERF-001: Performance

### REQ-SEC-001: Security

### REQ-SCALE-001: Scalability

### REQ-AVAIL-001: Availability

## Requirements Coverage Matrix

[Initial table - will be filled during design/implementation]
```

---

### 4. Apply EARS Format (Article IV)

**CRITICAL**: All requirements MUST use one of 5 EARS patterns.

#### Pattern Selection Guide

| Scenario              | EARS Pattern                         | Example                                     |
| --------------------- | ------------------------------------ | ------------------------------------------- |
| Always-active feature | **Ubiquitous**: `The [system] SHALL` | The API SHALL authenticate all requests     |
| User action triggers  | **Event-driven**: `WHEN ... THEN`    | WHEN user clicks Submit, THEN validate form |
| Continuous condition  | **State-driven**: `WHILE ... SHALL`  | WHILE loading, UI SHALL show spinner        |
| Error handling        | **Unwanted**: `IF ... THEN`          | IF timeout, THEN return HTTP 504            |
| Feature flag          | **Optional**: `WHERE ... SHALL`      | WHERE 2FA enabled, SHALL require OTP        |

#### Requirements Quality Checklist

Each requirement MUST have:

- [ ] Unique ID (REQ-COMPONENT-NNN)
- [ ] EARS pattern (one of 5)
- [ ] Clear SHALL/SHALL NOT (not SHOULD/MUST/MAY)
- [ ] Testable acceptance criteria
- [ ] Priority (P0/P1/P2/P3)
- [ ] Status (Draft initially)

---

### 5. Assign Requirement IDs

**Format**: `REQ-[COMPONENT]-[NUMBER]`

**Examples**:

- `REQ-AUTH-001` - Authentication component
- `REQ-PAY-001` - Payment component
- `REQ-DASH-001` - Dashboard component

**Rules**:

- All uppercase
- Sequential numbering starting from 001
- Unique across entire project
- Never reuse IDs

---

### 6. Add Non-Functional Requirements

Always include these categories:

```markdown
### REQ-PERF-001: Response Time

The {{COMPONENT}} SHALL respond within 200ms for 95% of requests.

**Acceptance Criteria**:

- 95th percentile < 200ms
- 99th percentile < 500ms
- Tested with 1000 concurrent users

### REQ-SEC-001: OWASP Top 10

The {{COMPONENT}} SHALL prevent OWASP Top 10 vulnerabilities.

**Acceptance Criteria**:

- Input validation on all inputs
- Output encoding for XSS prevention
- Parameterized queries (SQL injection prevention)
- Authentication on protected endpoints

### REQ-SCALE-001: Concurrent Users

The {{COMPONENT}} SHALL support 10,000 concurrent users.

**Acceptance Criteria**:

- Load tested with 10,000 users
- No performance degradation
- Horizontal scaling supported

### REQ-AVAIL-001: Uptime

The {{COMPONENT}} SHALL maintain 99.9% uptime.

**Acceptance Criteria**:

- 99.9% uptime SLA
- Health check endpoint
- Graceful degradation on failure
```

---

### 7. Brownfield: Create Delta Specification

If this is a change to existing system, add delta sections:

```markdown
## ADDED Requirements

### REQ-AUTH-042: Two-Factor Authentication (NEW)

WHERE two-factor authentication is enabled,
the authentication system SHALL require OTP verification.

**Justification**: Security enhancement
**Impact**: Adds new authentication step; backward compatible

---

## MODIFIED Requirements

### REQ-AUTH-001: Password Hashing (MODIFIED)

**Previous**:
The authentication system SHALL hash passwords using bcrypt cost 10.

**Updated**:
The authentication system SHALL hash passwords using bcrypt cost 12.

**Reason**: Increased security standard
**Breaking Change**: No (existing hashes valid)
**Migration**: Rehash on next login

---

## REMOVED Requirements

### REQ-AUTH-015: Remember Me (REMOVED)

**Reason**: Security policy change
**Breaking Change**: Yes
**Migration**: Users must log in each visit
**Communication**: 30-day notice required
```

---

### 8. Constitutional Validation

Validate requirements against constitutional articles:

#### Article IV: EARS Format

- [ ] All requirements use EARS patterns
- [ ] No ambiguous keywords (SHOULD, MUST, MAY)
- [ ] All requirements have SHALL/SHALL NOT

#### Article V: Traceability

- [ ] All requirements have unique IDs
- [ ] IDs follow REQ-XXX-NNN format
- [ ] Requirement IDs never reused

Run validation:

```bash
@constitution-enforcer validate requirements.md
```

---

### 9. Save Document (Bilingual)

**IMPORTANT**: Create BOTH English and Japanese versions.

**English version (Primary/Reference)**:
Save to: `storage/specs/{{feature-name}}-requirements.md`

**Japanese version (Translation)**:
Save to: `storage/specs/{{feature-name}}-requirements.ja.md`

**File Naming**:

- Use kebab-case
- Include feature name
- Add `-requirements` suffix
- Add `.ja` before `.md` for Japanese version

**Examples**:

- `storage/specs/authentication-requirements.md` (English)
- `storage/specs/authentication-requirements.ja.md` (Japanese)
- `storage/specs/payment-processing-requirements.md` (English)
- `storage/specs/payment-processing-requirements.ja.md` (Japanese)

**Generation Order**:

1. Generate English version FIRST
2. Then generate Japanese translation
3. Ensure requirement IDs are identical in both versions
4. Keep technical terms (REQ-XXX-NNN, EARS keywords) in English in Japanese version

---

### 10. Generate Summary

Present summary to user:

```markdown
## ✅ Requirements Specification Complete

**Feature**: {{FEATURE_NAME}}
**Files**:

- English: storage/specs/{{feature-name}}-requirements.md
- Japanese: storage/specs/{{feature-name}}-requirements.ja.md

### Summary:

- **Total Requirements**: [N]
  - P0 (Critical): [N]
  - P1 (High): [N]
  - P2 (Medium): [N]
  - P3 (Low): [N]

### Requirements Breakdown:

- Functional: [N]
- Non-Functional: [N]
  - Performance: [N]
  - Security: [N]
  - Scalability: [N]
  - Availability: [N]

### EARS Patterns Used:

- Ubiquitous: [N]
- Event-driven: [N]
- State-driven: [N]
- Unwanted behavior: [N]
- Optional feature: [N]

### Constitutional Compliance:

- ✅ Article IV: All requirements in EARS format
- ✅ Article V: Unique IDs assigned
- ✅ Article VI: Aligned with steering context

### Next Steps:

1. Review requirements with stakeholders
2. Get approval
3. Run design phase: `/sdd-design {{feature-name}}`
```

---

## Example Execution

### User Command:

```bash
/sdd-requirements authentication
```

### Claude Actions:

1. **Read Steering**:
   - `steering/product.md` → Target users: B2B SaaS companies
   - `steering/tech.md` → Stack: Next.js, PostgreSQL, Prisma
   - `steering/structure.md` → Pattern: Library-first

2. **Ask User** (if needed):

   ```
   Questions about authentication feature:
   1. Authentication methods: Email/password, OAuth, SSO, or all?
   2. Required features: 2FA, password reset, session management?
   3. Security: Any compliance requirements (SOC2, HIPAA)?
   ```

3. **Generate Requirements**:

   ```markdown
   ### REQ-AUTH-001: User Login

   WHEN a user provides valid credentials,
   THEN the authentication system SHALL authenticate the user
   AND the system SHALL create a session
   AND the system SHALL redirect to dashboard.

   ### REQ-AUTH-002: Password Strength

   The authentication system SHALL enforce password requirements:

   - Minimum 12 characters
   - At least 1 uppercase, 1 lowercase, 1 number, 1 special char

   [... more requirements ...]
   ```

4. **Save**: `storage/specs/authentication-requirements.md`

5. **Summarize**: Present summary to user

---

## Tool Usage

### Required Tools:

- **Read**: Read steering files, existing specs
- **Write**: Create requirements document
- **AskUserQuestion**: Gather stakeholder input (if needed)
- **Grep**: Search for existing implementations (brownfield)

### Optional Tools:

- **WebSearch**: Research best practices (if needed)
- **mcp**context7**get-library-docs**: Get framework documentation

---

## Validation Checklist

Before completing, verify:

- [ ] Steering context read and applied
- [ ] All requirements in EARS format
- [ ] Requirement IDs assigned (REQ-XXX-NNN)
- [ ] Acceptance criteria defined for each requirement
- [ ] Priority assigned (P0/P1/P2/P3)
- [ ] Non-functional requirements included
- [ ] Constitutional validation passed
- [ ] Document saved to storage/specs/
- [ ] Summary presented to user

---

## Edge Cases

### No Steering Files

If `steering/` doesn't exist:

```markdown
⚠️ **Steering files not found**

Please run `/sdd-steering` first to generate project context.

Steering provides critical context for requirements generation:

- Product goals and users
- Architecture patterns
- Technology constraints
```

### Brownfield with Existing Requirements

If `storage/specs/{{feature-name}}-requirements.md` exists:

- Read existing file
- Ask user: Update existing or create new version?
- If update: Create delta specification (ADDED/MODIFIED/REMOVED)

---

**Execution**: Begin requirements generation now for the specified feature.
