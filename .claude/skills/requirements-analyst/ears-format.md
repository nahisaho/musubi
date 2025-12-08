# EARS (Easy Approach to Requirements Syntax) Format Guide

## Overview

EARS is a structured syntax for writing unambiguous, testable requirements. All MUSUBI requirements MUST follow EARS patterns as mandated by Constitutional Article IV.

---

## EARS Patterns

### Pattern 1: Ubiquitous Requirements

**Template**: `The [system/component] SHALL [action]`

**Use When**: Requirement applies at all times, unconditionally.

**Examples**:
```markdown
REQ-001: The system SHALL encrypt all passwords using bcrypt with minimum 12 rounds.
REQ-002: The API SHALL return responses in JSON format.
REQ-003: The application SHALL log all authentication attempts.
```

---

### Pattern 2: Event-Driven Requirements

**Template**: `WHEN [trigger event], the [system/component] SHALL [action]`

**Use When**: Requirement is triggered by a specific event or user action.

**Examples**:
```markdown
REQ-010: WHEN user submits login form, the system SHALL validate credentials within 2 seconds.
REQ-011: WHEN payment is processed, the system SHALL send confirmation email.
REQ-012: WHEN file upload completes, the system SHALL generate thumbnail.
REQ-013: WHEN session expires, the system SHALL redirect user to login page.
```

---

### Pattern 3: State-Driven Requirements

**Template**: `WHILE [system state/condition], the [system/component] SHALL [action]`

**Use When**: Requirement applies during a specific system state or condition.

**Examples**:
```markdown
REQ-020: WHILE user is authenticated, the system SHALL display user dashboard.
REQ-021: WHILE database connection is lost, the system SHALL queue write operations.
REQ-022: WHILE maintenance mode is active, the system SHALL show maintenance page.
REQ-023: WHILE rate limit is exceeded, the system SHALL return 429 status.
```

---

### Pattern 4: Optional Feature Requirements

**Template**: `WHERE [feature/configuration is enabled], the [system/component] SHALL [action]`

**Use When**: Requirement depends on optional feature being enabled.

**Examples**:
```markdown
REQ-030: WHERE two-factor authentication is enabled, the system SHALL require OTP after password.
REQ-031: WHERE dark mode is selected, the system SHALL apply dark theme CSS.
REQ-032: WHERE premium subscription is active, the system SHALL unlock advanced features.
REQ-033: WHERE email notifications are enabled, the system SHALL send daily digest.
```

---

### Pattern 5: Unwanted Behavior Requirements

**Template**: `IF [unwanted condition], THEN the [system/component] SHALL [response action]`

**Use When**: Defining how system should handle errors, exceptions, or edge cases.

**Examples**:
```markdown
REQ-040: IF login fails 5 times, THEN the system SHALL lock account for 30 minutes.
REQ-041: IF payment gateway timeout occurs, THEN the system SHALL retry 3 times.
REQ-042: IF invalid input is detected, THEN the system SHALL return validation errors.
REQ-043: IF disk space is below 10%, THEN the system SHALL alert administrators.
```

---

### Pattern 6: Complex Requirements (Combination)

**Template**: Combine patterns for complex scenarios.

**Examples**:
```markdown
REQ-050: WHILE user is authenticated, WHEN session is about to expire, 
         the system SHALL display warning 5 minutes before expiration.

REQ-051: WHERE premium subscription is active, WHEN user uploads file, 
         the system SHALL allow files up to 100MB.

REQ-052: IF payment fails, THEN WHILE retry count < 3, 
         the system SHALL attempt payment again after 30 seconds.
```

---

## Keyword Rules

### Required Keywords (SHALL/MUST)

| Keyword | Meaning | Use |
|---------|---------|-----|
| **SHALL** | Mandatory requirement | Primary choice |
| **MUST** | Mandatory requirement | Alternative to SHALL |

### Forbidden Keywords (Ambiguous)

| Keyword | Problem | Replace With |
|---------|---------|--------------|
| should | Ambiguous obligation | SHALL |
| may | Unclear optionality | WHERE + SHALL |
| could | Vague possibility | SHALL or remove |
| might | Uncertain behavior | SHALL or remove |
| would | Conditional ambiguity | SHALL |

---

## Requirement ID Format

### Standard Format
```
REQ-[Category]-[Number]

Examples:
REQ-AUTH-001  # Authentication requirement
REQ-PAY-001   # Payment requirement
REQ-UI-001    # User interface requirement
REQ-NF-001    # Non-functional requirement
```

### Categories

| Category | Description |
|----------|-------------|
| AUTH | Authentication & Authorization |
| USER | User Management |
| PAY | Payment & Billing |
| UI | User Interface |
| API | API & Integration |
| DATA | Data Management |
| SEC | Security |
| PERF | Performance |
| NF | Non-Functional |

---

## Validation Rules

### Rule 1: One Requirement Per Statement
```
❌ BAD: The system SHALL validate credentials AND send welcome email.
✅ GOOD: 
  REQ-001: The system SHALL validate credentials.
  REQ-002: WHEN login succeeds, the system SHALL send welcome email.
```

### Rule 2: Measurable Actions
```
❌ BAD: The system SHALL be fast.
✅ GOOD: The system SHALL respond within 200ms for 95% of requests.
```

### Rule 3: No Implementation Details
```
❌ BAD: The system SHALL use Redis for caching.
✅ GOOD: The system SHALL cache frequently accessed data.
```

### Rule 4: Testable Conditions
```
❌ BAD: WHEN user is unhappy, the system SHALL improve experience.
✅ GOOD: WHEN user rating is below 3, the system SHALL prompt for feedback.
```

---

## Requirements Document Template

```markdown
# Requirements Specification: [Feature Name]

## Document Information
- **Version**: 1.0
- **Date**: YYYY-MM-DD
- **Author**: requirements-analyst
- **Status**: Draft | Review | Approved

## 1. Functional Requirements

### 1.1 Authentication

REQ-AUTH-001: WHEN user submits login form with valid credentials, 
              the system SHALL authenticate user and create session.

REQ-AUTH-002: IF login credentials are invalid, 
              THEN the system SHALL display error message.

REQ-AUTH-003: IF login fails 5 consecutive times, 
              THEN the system SHALL lock account for 30 minutes.

### 1.2 User Management

REQ-USER-001: The system SHALL store user profiles with name, email, and avatar.

REQ-USER-002: WHEN user updates profile, 
              the system SHALL validate and save changes.

## 2. Non-Functional Requirements

### 2.1 Performance

REQ-NF-001: The system SHALL respond to API requests within 200ms (p95).

REQ-NF-002: The system SHALL support 1000 concurrent users.

### 2.2 Security

REQ-NF-003: The system SHALL encrypt all data in transit using TLS 1.3.

REQ-NF-004: The system SHALL hash passwords using bcrypt (12 rounds).

### 2.3 Availability

REQ-NF-005: The system SHALL maintain 99.9% uptime.

## 3. Traceability

| REQ ID | Design Component | Priority | Status |
|--------|------------------|----------|--------|
| REQ-AUTH-001 | Auth Service | P1 | Approved |
| REQ-AUTH-002 | Auth Service | P1 | Approved |
| REQ-USER-001 | User Service | P2 | Draft |
```

---

## EARS Validation Checklist

Before submitting requirements:

- [ ] Each requirement has unique ID (REQ-XXX)
- [ ] Each requirement uses SHALL or MUST
- [ ] No ambiguous keywords (should, may, could)
- [ ] Each requirement is testable
- [ ] Each requirement is atomic (single action)
- [ ] EARS pattern is appropriate for requirement type
- [ ] Non-functional requirements are measurable
- [ ] Traceability table is complete
