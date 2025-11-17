# EARS Format Guide

**EARS**: Easy Approach to Requirements Syntax

**Version**: 1.0
**Status**: Mandatory (Constitutional Article IV)

---

## Overview

EARS is a structured natural language format for writing unambiguous, testable requirements. All requirements in this project MUST use EARS patterns.

**Benefits**:

- Eliminates ambiguity
- Improves testability
- Enables traceability
- Standardizes requirements format

---

## The 5 EARS Patterns

### 1. Ubiquitous Requirements

**Pattern**: `The [system] SHALL [requirement]`

**When to Use**: Always-active functionality

**Examples**:

```markdown
### REQ-AUTH-001: Password Hashing

The authentication system SHALL hash passwords using bcrypt with cost factor 12.

**Acceptance Criteria**:

- Bcrypt algorithm used
- Cost factor = 12
- Passwords never stored in plaintext
```

```markdown
### REQ-LOG-001: Logging Format

The logging system SHALL output logs in JSON format.

**Acceptance Criteria**:

- All logs in valid JSON
- Required fields: timestamp, level, message, context
- ISO 8601 timestamps
```

---

### 2. Event-Driven Requirements

**Pattern**: `WHEN [event or condition], the [system] SHALL [response]`

**When to Use**: Requirements triggered by events, user actions, or system conditions

**Examples**:

```markdown
### REQ-AUTH-002: User Login

WHEN a user provides valid credentials,
THEN the authentication system SHALL authenticate the user
AND the system SHALL create a session
AND the system SHALL redirect to the dashboard.

**Acceptance Criteria**:

- Email and password validated
- Session created with 24-hour expiry
- Redirect to /dashboard
- Login event logged
```

```markdown
### REQ-NOTIFY-001: Order Confirmation

WHEN an order is successfully placed,
THEN the notification system SHALL send an email confirmation
AND the system SHALL include order details
AND the system SHALL include tracking number.

**Acceptance Criteria**:

- Email sent within 5 seconds
- Contains order ID, items, total
- Contains tracking number
- Template uses company branding
```

---

### 3. State-Driven Requirements

**Pattern**: `WHILE [state or condition], the [system] SHALL [response]`

**When to Use**: Requirements that apply during a specific state

**Examples**:

```markdown
### REQ-UI-001: Loading Indicator

WHILE data is being fetched from the API,
the UI SHALL display a loading spinner.

**Acceptance Criteria**:

- Spinner visible during API calls
- Spinner hidden after response
- Spinner positioned in content area
- Spinner accessible (aria-label)
```

```markdown
### REQ-CACHE-001: Cache Invalidation

WHILE a resource is in the cache,
the caching system SHALL serve the cached version
AND the system SHALL validate freshness based on TTL.

**Acceptance Criteria**:

- Cached resource served if TTL not exceeded
- TTL checked on each request
- Expired cache entries evicted
- Cache-Control headers honored
```

---

### 4. Unwanted Behavior Requirements

**Pattern**: `IF [unwanted condition or error], THEN the [system] SHALL [response]`

**When to Use**: Error handling, edge cases, failure scenarios

**Examples**:

```markdown
### REQ-AUTH-003: Invalid Credentials

IF a user provides invalid credentials,
THEN the authentication system SHALL reject the login attempt
AND the system SHALL return HTTP 401
AND the system SHALL log the failed attempt
AND the system SHALL increment the rate limit counter.

**Acceptance Criteria**:

- HTTP 401 response with error message
- Generic error message (no email/password specifics)
- Failed attempt logged with timestamp and IP
- Rate limit applies after 5 failed attempts
```

```markdown
### REQ-API-001: Request Timeout

IF an API request exceeds 30 seconds,
THEN the API gateway SHALL terminate the request
AND the system SHALL return HTTP 504
AND the system SHALL log the timeout event.

**Acceptance Criteria**:

- Request terminated at exactly 30 seconds
- HTTP 504 Gateway Timeout response
- Timeout logged with request ID and duration
- Client receives descriptive error message
```

---

### 5. Optional Feature Requirements

**Pattern**: `WHERE [feature or configuration is enabled], the [system] SHALL [response]`

**When to Use**: Feature flags, optional functionality, configuration-dependent behavior

**Examples**:

```markdown
### REQ-FEATURE-001: Two-Factor Authentication

WHERE two-factor authentication is enabled for a user,
the authentication system SHALL require OTP verification
AND the system SHALL send OTP via email or SMS
AND the system SHALL validate OTP within 5 minutes.

**Acceptance Criteria**:

- OTP required only if 2FA enabled
- OTP sent to user's configured channel
- OTP expires after 5 minutes
- OTP is 6 digits
- Invalid OTP returns error
```

```markdown
### REQ-DEBUG-001: Debug Mode Logging

WHERE debug mode is enabled,
the logging system SHALL output debug-level logs
AND the system SHALL include stack traces
AND the system SHALL log query execution times.

**Acceptance Criteria**:

- Debug logs only in debug mode
- Stack traces included in error logs
- Query times logged to milliseconds
- Production mode excludes debug logs
```

---

## EARS Syntax Rules

### Structure

```markdown
### [Requirement ID]: [Short Title]

[EARS Pattern Statement]

**Acceptance Criteria**:

- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

**Priority**: [P0/P1/P2/P3]
**Status**: [Draft/Approved/Implemented/Tested]
**Traceability**:

- Design: [design-reference]
- Code: [file-path:line-number]
- Tests: [test-reference]
```

### Requirement IDs

**Format**: `REQ-[COMPONENT]-[NUMBER]`

**Examples**:

- `REQ-AUTH-001` - Authentication component, requirement #1
- `REQ-API-042` - API component, requirement #42
- `REQ-DB-015` - Database component, requirement #15

**Rules**:

- All uppercase
- Unique within project
- Sequential numbering per component
- Never reuse IDs

### Keywords

**Mandatory Keywords**:

- `SHALL` - Mandatory requirement
- `SHALL NOT` - Mandatory prohibition

**Conditional Keywords**:

- `WHEN` - Event-driven
- `WHILE` - State-driven
- `IF` - Unwanted behavior
- `WHERE` - Optional feature
- `THEN` - Consequence
- `AND` - Additional consequence

**Avoid**:

- `SHOULD` - Ambiguous (mandatory or optional?)
- `MAY` - Ambiguous (optional or allowed?)
- `WILL` - Ambiguous (future intent or requirement?)
- `MUST` - Use `SHALL` instead for consistency

---

## Acceptance Criteria

Every requirement MUST have acceptance criteria that:

- Are testable
- Are measurable
- Are unambiguous
- Cover normal and error cases
- Specify expected behavior

**Good Acceptance Criteria**:

```markdown
- Response time < 200ms (95th percentile)
- HTTP 200 response with valid JSON
- Password minimum 12 characters
- Email sent within 5 seconds
```

**Bad Acceptance Criteria**:

```markdown
- Fast response time (not measurable)
- Returns success (ambiguous)
- Strong password (not specific)
- Email sent quickly (not measurable)
```

---

## Complete Example: User Registration

```markdown
## Feature: User Registration

### REQ-REG-001: Account Creation

WHEN a user submits valid registration information,
THEN the registration system SHALL create a new user account
AND the system SHALL hash the password using bcrypt
AND the system SHALL send a verification email
AND the system SHALL return HTTP 201 with user ID.

**Acceptance Criteria**:

- Email unique in database
- Password hashed with bcrypt cost 12
- Verification email sent within 5 seconds
- HTTP 201 response with user ID and email
- User record created in database
- User status set to "pending verification"

**Priority**: P0
**Status**: Approved
**Traceability**:

- Design: design.md#user-registration-api
- Code: src/auth/registration.ts:45-89
- Tests: tests/auth/registration.test.ts:23-67

---

### REQ-REG-002: Email Validation

The registration system SHALL validate email format using RFC 5322 regex.

**Acceptance Criteria**:

- Valid emails accepted (user@example.com)
- Invalid emails rejected (user@, @example.com)
- HTTP 400 response for invalid email
- Error message: "Invalid email format"

**Priority**: P0
**Status**: Approved
**Traceability**:

- Design: design.md#email-validation
- Code: src/auth/validators.ts:12-23
- Tests: tests/auth/validators.test.ts:45-78

---

### REQ-REG-003: Duplicate Email

IF a user attempts to register with an existing email,
THEN the registration system SHALL reject the registration
AND the system SHALL return HTTP 409
AND the system SHALL return error message "Email already registered".

**Acceptance Criteria**:

- Database uniqueness constraint on email column
- HTTP 409 Conflict response
- Error message exactly: "Email already registered"
- No account created
- No email sent

**Priority**: P0
**Status**: Approved
**Traceability**:

- Design: design.md#duplicate-email-handling
- Code: src/auth/registration.ts:34-42
- Tests: tests/auth/registration.test.ts:89-112

---

### REQ-REG-004: Password Strength

The registration system SHALL enforce password requirements:

- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&\*).

**Acceptance Criteria**:

- Weak passwords rejected (HTTP 400)
- Error message lists unmet requirements
- Strong passwords accepted
- Validation before database insert

**Priority**: P0
**Status**: Approved
**Traceability**:

- Design: design.md#password-strength
- Code: src/auth/validators.ts:34-56
- Tests: tests/auth/validators.test.ts:112-167

---

### REQ-REG-005: Email Verification

WHERE email verification is enabled,
the registration system SHALL require users to verify their email
AND the system SHALL generate a verification token
AND the system SHALL expire tokens after 24 hours.

**Acceptance Criteria**:

- Verification token generated (UUID v4)
- Token stored in database with expiry
- Verification email contains token link
- Token expires after 24 hours
- Expired tokens return HTTP 410
- Verified users can log in
- Unverified users cannot log in

**Priority**: P1
**Status**: Approved
**Traceability**:

- Design: design.md#email-verification
- Code: src/auth/verification.ts:23-89
- Tests: tests/auth/verification.test.ts:34-123
```

---

## Common Mistakes

### 1. Ambiguous Verbs

❌ **Bad**: The system should validate input.
✅ **Good**: The system SHALL validate input against schema.

### 2. Missing Trigger

❌ **Bad**: The system SHALL send email.
✅ **Good**: WHEN a user registers, the system SHALL send a verification email.

### 3. Compound Requirements

❌ **Bad**: The system SHALL authenticate users and send emails and log events.
✅ **Good**: Split into 3 requirements (REQ-001: authentication, REQ-002: email, REQ-003: logging)

### 4. Implementation Details

❌ **Bad**: The system SHALL use bcrypt version 2a with salt rounds 12.
✅ **Good**: The system SHALL hash passwords using a secure one-way hash function.

**Note**: Implementation details belong in design.md, not requirements.

### 5. Vague Acceptance Criteria

❌ **Bad**: System is fast and secure.
✅ **Good**:

- Response time < 200ms (95th percentile)
- Passwords hashed with bcrypt cost 12
- HTTPS enforced

---

## EARS and Traceability

Every EARS requirement MUST be traceable to:

### Design (requirements.md → design.md)

```markdown
**Traceability**:

- Design: design.md#user-authentication-architecture
- ADR: decisions/001-use-jwt-tokens.md
```

### Code (requirements.md → source code)

```markdown
**Traceability**:

- Code: src/auth/login.ts:45-89
- Code: src/auth/jwt.ts:23-67
```

### Tests (requirements.md → test code)

```markdown
**Traceability**:

- Tests: tests/auth/login.test.ts:34-78
- Tests: tests/integration/auth-flow.test.ts:112-156
```

**Enforcement**: Use `@traceability-auditor` skill to validate 100% coverage.

---

## EARS for Different Requirement Types

### Functional Requirements

Use event-driven or ubiquitous patterns:

```markdown
WHEN user clicks "Submit", the form SHALL validate all fields.
The API SHALL return JSON responses.
```

### Non-Functional Requirements

Use ubiquitous or state-driven patterns:

```markdown
The API SHALL respond within 200ms (95th percentile).
WHILE processing payments, the system SHALL encrypt data using AES-256.
```

### Security Requirements

Use ubiquitous or unwanted behavior patterns:

```markdown
The authentication system SHALL prevent SQL injection attacks.
IF a user exceeds 5 failed login attempts, THEN the system SHALL lock the account.
```

### Performance Requirements

Use ubiquitous with measurable criteria:

```markdown
The search function SHALL return results within 100ms for queries up to 10 keywords.

**Acceptance Criteria**:

- 95th percentile < 100ms
- 99th percentile < 200ms
- Tested with 1000 concurrent users
```

---

## EARS and Delta Specifications (Brownfield)

### ADDED Requirements

```markdown
## ADDED Requirements

### REQ-AUTH-042: Two-Factor Authentication (NEW)

WHERE two-factor authentication is enabled,
the authentication system SHALL require OTP verification.

**Justification**: Security enhancement requested by compliance team.
**Impact**: Adds new authentication step; backward compatible (opt-in).
```

### MODIFIED Requirements

```markdown
## MODIFIED Requirements

### REQ-AUTH-001: Password Hashing (MODIFIED)

**Previous**:
The authentication system SHALL hash passwords using bcrypt with cost factor 10.

**Updated**:
The authentication system SHALL hash passwords using bcrypt with cost factor 12.

**Reason**: Increased security standard.
**Breaking Change**: No (existing hashes remain valid).
**Migration**: Rehash passwords on next login.
```

### REMOVED Requirements

```markdown
## REMOVED Requirements

### REQ-AUTH-015: "Remember Me" Feature (REMOVED)

**Reason**: Security policy change prohibits long-lived sessions.
**Breaking Change**: Yes (feature removal).
**Migration**: Users must log in on each visit.
**Communication**: Announce 30 days before removal.
```

---

## Quick Reference

| Pattern      | Keyword              | Use Case                    | Example                                     |
| ------------ | -------------------- | --------------------------- | ------------------------------------------- |
| Ubiquitous   | `The [system] SHALL` | Always-active functionality | The API SHALL authenticate requests         |
| Event-Driven | `WHEN ... THEN`      | Triggered by events         | WHEN user clicks Submit, THEN validate form |
| State-Driven | `WHILE ... SHALL`    | Active during state         | WHILE loading, UI SHALL show spinner        |
| Unwanted     | `IF ... THEN`        | Error handling              | IF timeout, THEN return HTTP 504            |
| Optional     | `WHERE ... SHALL`    | Feature flags               | WHERE 2FA enabled, SHALL require OTP        |

---

## Tools and Validation

### Validation Command

```bash
@constitution-enforcer validate requirements.md
```

**Checks**:

- All requirements use EARS patterns
- All requirements have IDs
- All requirements have acceptance criteria
- No ambiguous keywords (SHOULD, MUST, MAY)

### Traceability Command

```bash
@traceability-auditor validate requirements.md
```

**Checks**:

- All requirements mapped to design
- All requirements mapped to code
- All requirements mapped to tests
- 100% coverage achieved

---

## Summary

**EARS Compliance Checklist**:

- [ ] All requirements use one of 5 EARS patterns
- [ ] All requirements have unique IDs (REQ-XXX-NNN)
- [ ] All requirements use SHALL/SHALL NOT (not SHOULD/MUST/MAY)
- [ ] All requirements have acceptance criteria
- [ ] All acceptance criteria are testable and measurable
- [ ] All requirements are traceable (design, code, tests)
- [ ] No compound requirements (one requirement = one concern)
- [ ] No implementation details in requirements

---

**Powered by MUSUBI** - EARS format for unambiguous requirements.
