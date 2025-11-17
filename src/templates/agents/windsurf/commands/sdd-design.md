# SDD Design Command

Generate technical design from requirements.

---

## Instructions for Claude

You are executing the `/sdd-design [feature-name]` command to create a technical design specification.

### Command Format

```bash
/sdd-design authentication
/sdd-design payment-processing
/sdd-design user-dashboard
```

### Your Task

Generate a comprehensive technical design that implements the requirements while adhering to constitutional governance.

---

## Process

### 1. Read Context (Article VI)

**CRITICAL**: Read these files BEFORE designing:

```bash
# Steering Context
steering/structure.md    # Architecture patterns to follow
steering/tech.md         # Technology stack to use
steering/product.md      # Product goals and users

# Requirements
storage/specs/{{feature-name}}-requirements.md  # What to implement
```

**Extract**:

- Architecture pattern (monolith, microservices, library-first)
- Approved technologies (languages, frameworks, databases)
- Requirements to implement
- Non-functional requirements (performance, security, scale)

---

### 2. Verify Requirements Exist

Check if requirements file exists:

**If NOT found**:

```markdown
❌ **Requirements file not found**

Expected: storage/specs/{{feature-name}}-requirements.md

Please run `/sdd-requirements {{feature-name}}` first.

Design cannot proceed without requirements (Article V: Traceability).
```

**If found**: Proceed with design

---

### 3. Generate Design Document

Use template from `templates/design.md`:

#### A. Architecture Design (C4 Model)

Create **3 levels** of C4 diagrams:

**Level 1: Context Diagram**

- Show system in context
- External users
- External systems
- Integration points

**Level 2: Container Diagram**

- Major deployable units
- Databases
- Message queues
- External APIs

**Level 3: Component Diagram**

- Internal components of main container
- Controllers, services, repositories
- Data flow between components

**Example**:

```markdown
### C4 Model: Container Diagram
```

+--------------------------------------+
| Authentication System |
| |
| +-------------+ +-------------+ |
| | | | | |
| | Web App +-->+ API Server | |
| | (Next.js) | | (Node.js) | |
| | | | | |
| +-------------+ +------+------+ |
| | |
+---------------------------+----------+
|
| SQL
v
+--------+--------+
| PostgreSQL |
+-----------------+

```

```

#### B. Requirements Mapping

**CRITICAL (Article V)**: Map EVERY requirement to design decisions.

Create matrix:

```markdown
| Component      | Requirements               | Design Rationale             |
| -------------- | -------------------------- | ---------------------------- |
| AuthService    | REQ-AUTH-001, REQ-AUTH-002 | Business logic encapsulation |
| AuthController | REQ-AUTH-003               | API exposure                 |
| UserRepository | REQ-AUTH-004               | Data persistence             |
| JWTMiddleware  | REQ-SEC-001                | Security enforcement         |
```

**Coverage Validation**:

- [ ] All functional requirements mapped
- [ ] All non-functional requirements addressed
- [ ] 100% requirements coverage

---

### 4. API Design

For each API endpoint:

**Structure**:

````markdown
#### POST /api/auth/login

**Purpose**: Authenticate user with credentials

**Maps to Requirements**: REQ-AUTH-001

**Request**:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret123"
}
```
````

**Response (Success)**:

```http
HTTP/1.1 200 OK
Set-Cookie: session=xxx; HttpOnly; Secure

{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "expiresAt": "2025-11-17T10:00:00Z"
}
```

**Response (Error)**:

```http
HTTP/1.1 401 Unauthorized

{
  "error": "Invalid credentials"
}
```

**Status Codes**:

- 200: Success
- 401: Invalid credentials
- 429: Rate limit exceeded
- 500: Server error

**Acceptance Criteria** (from REQ-AUTH-001):

- ✅ Validates email and password
- ✅ Returns session cookie
- ✅ Redirects to dashboard

````

**Generate OpenAPI Spec** (if REST API):
```yaml
openapi: 3.0.0
info:
  title: Authentication API
  version: 1.0.0
paths:
  /api/auth/login:
    post:
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 12
````

---

### 5. Database Design

#### A. Entity-Relationship Diagram

```markdown
+-------------------+ +-------------------+
| users | | sessions |
+-------------------+ +-------------------+
| id (PK) | | id (PK) |
| email | | user_id (FK) |
| password_hash | | token |
| created_at | | expires_at |
+-------------------+ | created_at |
| +-------------------+
+------------------------------+
1:N
```

#### B. Schema Definition (DDL)

**Maps to Requirements**: Document which requirements need which tables.

```sql
-- REQ-AUTH-004: User storage
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- REQ-AUTH-005: Session management
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

#### C. Migration Strategy

````markdown
**Migration Tool**: Prisma Migrate

**Initial Migration**:

```prisma
// prisma/schema.prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```
````

````

---

### 6. Component Design (Library-First, Article I)

**CRITICAL**: Design features as libraries first.

```markdown
### Authentication Library

**Location**: `lib/auth/`

**Responsibilities**:
- Business logic for authentication
- Password hashing
- Session management
- JWT generation/validation

**Directory Structure**:
````

lib/auth/
├── src/
│ ├── index.ts # Public API
│ ├── service.ts # AuthService class
│ ├── repository.ts # UserRepository class
│ ├── password.ts # Password hashing utilities
│ ├── jwt.ts # JWT utilities
│ └── types.ts # TypeScript types
├── tests/
│ ├── service.test.ts
│ ├── repository.test.ts
│ └── integration.test.ts
├── cli.ts # CLI interface (Article II)
└── package.json

````

**Public API**:
```typescript
// lib/auth/src/index.ts
export { AuthService } from './service';
export { UserRepository } from './repository';
export type { User, Session, LoginRequest, LoginResponse } from './types';
````

**CLI Interface** (Article II):

```bash
# lib/auth/cli.ts commands:
auth create-user --email=user@example.com --password=secret
auth login --email=user@example.com --password=secret
auth logout --session-id=uuid
auth validate-session --token=xxx
```

````

---

### 7. Security Design (REQ-SEC-001)

Always include security design:

```markdown
### Authentication
- **Method**: JWT tokens
- **Storage**: HTTP-only cookies
- **Expiry**: 24 hours
- **Refresh**: 7-day refresh tokens

### Authorization
- **Method**: Role-Based Access Control (RBAC)
- **Roles**: admin, user, guest
- **Permissions**: Defined per endpoint

### Data Protection
- **Passwords**: bcrypt hash (cost factor 12)
- **Tokens**: Cryptographically signed JWT
- **HTTPS**: TLS 1.3 enforced
- **Sensitive Data**: PII encrypted at rest

### Input Validation
- **XSS Prevention**: Output encoding
- **SQL Injection**: Parameterized queries (ORM)
- **CSRF**: CSRF tokens on state-changing operations
- **Rate Limiting**: 5 failed login attempts → account lock
````

---

### 8. Performance Design (REQ-PERF-001)

```markdown
### Caching Strategy

- **Layer**: Redis
- **TTL**: User sessions (24 hours)
- **Invalidation**: On logout

### Database Optimization

- **Indexes**: email (unique), session token (unique)
- **Connection Pooling**: 20 connections max
- **Query Optimization**: Eager load user with session

### API Performance Targets

- **Response Time**: < 200ms (95th percentile)
- **Throughput**: 1000 requests/second
- **Concurrency**: 10,000 concurrent users
```

---

### 9. Constitutional Compliance Validation

#### Article I: Library-First

- [ ] Feature designed as library (`lib/{{feature}}/`)
- [ ] Library has independent test suite
- [ ] Library has public API (`index.ts`)
- [ ] No dependencies on application code

#### Article II: CLI Interface

- [ ] CLI interface specified (`cli.ts`)
- [ ] All major operations exposed via CLI
- [ ] Help text documented
- [ ] Exit codes defined

#### Article VII: Simplicity Gate (Phase -1)

- [ ] Count projects (independently deployable units)
- [ ] If > 3 projects: Document Phase -1 Gate justification

#### Article VIII: Anti-Abstraction Gate (Phase -1)

- [ ] Check for custom abstraction layers
- [ ] If custom wrappers exist: Document justification
- [ ] Prefer framework APIs directly

**Validation Section**:

```markdown
## Constitutional Compliance

### Article I: Library-First ✅

- Authentication implemented as library: `lib/auth/`
- Independent test suite: `lib/auth/tests/`
- Public API: `lib/auth/src/index.ts`

### Article II: CLI Interface ✅

- CLI commands: create-user, login, logout, validate-session
- Help text: `auth --help`

### Article VII: Simplicity Gate ✅

- Project count: 1 (monorepo with libraries)
- Within limit (≤ 3)

### Article VIII: Anti-Abstraction ✅

- Uses Prisma ORM directly (no custom wrapper)
- Uses bcrypt directly (no custom abstraction)
```

---

### 10. Architecture Decision Records (ADR)

Document key decisions:

```markdown
### ADR-001: Use JWT for Session Management

**Status**: Accepted
**Date**: 2025-11-16

**Context**:
Need stateless authentication for REQ-AUTH-001.

**Decision**:
Use JWT tokens stored in HTTP-only cookies.

**Consequences**:

- ✅ Stateless (scalable)
- ✅ No session storage needed
- ❌ Token revocation requires blocklist
- ❌ Larger cookie size

**Alternatives Considered**:

- Session-based: Rejected (requires session store, not scalable)
- OAuth 2.0: Deferred to future (overkill for v1)
```

Document ADRs for:

- Database choice
- Authentication method
- API style (REST vs GraphQL)
- Caching strategy
- Major framework choices

---

### 11. Save Design Document (Bilingual)

**IMPORTANT**: Create BOTH English and Japanese versions.

**English version (Primary/Reference)**:
`storage/specs/{{feature-name}}-design.md`

**Japanese version (Translation)**:
`storage/specs/{{feature-name}}-design.ja.md`

**File Naming**:

- Use kebab-case
- Match requirements file name
- Add `-design` suffix
- Add `.ja` before `.md` for Japanese version

**Examples**:

- `storage/specs/authentication-design.md` (English)
- `storage/specs/authentication-design.ja.md` (Japanese)
- `storage/specs/payment-processing-design.md` (English)
- `storage/specs/payment-processing-design.ja.md` (Japanese)

**Generation Order**:

1. Generate English version FIRST
2. Then generate Japanese translation
3. Keep technical terms in English (API endpoints, database names, requirement IDs)
4. Translate explanations and design rationale
5. Keep code examples and diagrams identical in both versions

---

### 12. Validation

Run constitutional validation:

```bash
@constitution-enforcer validate storage/specs/{{feature-name}}-design.md
```

**Checks**:

- Article I: Library-First enforced
- Article II: CLI interfaces specified
- Article V: All requirements mapped
- Article VII: Project count ≤ 3 (or justified)
- Article VIII: No custom abstractions (or justified)

---

### 13. Generate Summary

```markdown
## ✅ Technical Design Complete

**Feature**: {{FEATURE_NAME}}
**File**: storage/specs/{{feature-name}}-design.md

### Architecture Summary:

- **Pattern**: [Library-first / Microservices / Monolith]
- **Components**: [N] components
- **Libraries**: lib/{{feature}}/
- **Database Tables**: [N] tables

### Requirements Coverage:

- **Total Requirements**: [N]
- **Requirements Mapped**: [N] (100%)
- **Unmapped Requirements**: 0 ✅

### API Endpoints:

- POST /api/{{feature}}/... ([N] endpoints total)

### Database:

- Tables: [N]
- Indexes: [N]
- Foreign Keys: [N]

### ADRs Created:

- ADR-001: [Decision]
- ADR-002: [Decision]

### Constitutional Compliance:

- ✅ Article I: Library-First structure
- ✅ Article II: CLI interfaces defined
- ✅ Article V: 100% requirements coverage
- ✅ Article VI: Aligned with steering context
- ✅ Article VII: Project count within limit
- ✅ Article VIII: No custom abstractions

### Next Steps:

1. Review design with team
2. Get architecture approval
3. Break down into tasks: `/sdd-tasks {{feature-name}}`
```

---

## Tool Usage

### Required:

- **Read**: Steering files, requirements document
- **Write**: Design document
- **Grep/Glob**: Analyze existing codebase (brownfield)

### Optional:

- **AskUserQuestion**: Clarify design decisions
- **WebSearch**: Research design patterns
- **mcp**context7**get-library-docs**: Framework documentation

---

## Phase -1 Gate Triggers

### Trigger Simplicity Gate (Article VII)

If project count > 3:

```markdown
⚠️ **Phase -1 Gate: Simplicity**

This design proposes [N] projects (> 3 limit).

**Required Justification**:

1. Business requirements necessitating separation
2. Team capacity for managing [N] projects
3. Deployment strategy

Please provide justification or reduce project count.

**Approval Required**: @system-architect + @project-manager
```

### Trigger Anti-Abstraction Gate (Article VIII)

If custom abstraction layers detected:

```markdown
⚠️ **Phase -1 Gate: Anti-Abstraction**

This design includes custom abstraction layers:

- [Abstraction 1]: Wrapper around [framework]
- [Abstraction 2]: Custom [pattern]

**Required Justification**:

1. Multi-framework support needed
2. Team expertise rationale
3. Migration path

Please justify or use framework APIs directly.

**Approval Required**: @system-architect + @software-developer
```

---

## Edge Cases

### Missing Requirements

If requirements file doesn't exist:

```markdown
❌ **Error**: Requirements not found

Expected: storage/specs/{{feature-name}}-requirements.md

Please run `/sdd-requirements {{feature-name}}` first.

Design requires requirements for traceability (Article V).
```

### Missing Steering

If steering files don't exist:

```markdown
⚠️ **Warning**: Steering context not found

Designing without steering context may result in:

- Architecture misalignment
- Technology stack mismatch
- Product goal misalignment

Recommendation: Run `/sdd-steering` first.

Continue anyway? [Prompt user]
```

---

**Execution**: Begin technical design generation now for the specified feature.
