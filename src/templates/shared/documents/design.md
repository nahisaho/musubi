# Technical Design: {{FEATURE_NAME}}

**Project**: {{PROJECT_NAME}}
**Version**: 1.0
**Status**: Draft
**Date**: {{DATE}}
**Author**: {{AUTHOR}}

---

## Document Control

| Version | Date     | Author     | Changes       |
| ------- | -------- | ---------- | ------------- |
| 1.0     | {{DATE}} | {{AUTHOR}} | Initial draft |

---

## Overview

### Purpose

[Describe the technical design for implementing the requirements]

### Scope

This design covers:

- Architecture and component design
- API contracts
- Database schema
- Integration points
- Deployment architecture

### Requirements Reference

This design implements requirements from: [requirements.md](requirements.md)

---

## Steering Context

**IMPORTANT**: This design aligns with project steering context:

- **Architecture Patterns**: [steering/structure.md](../../steering/structure.md)
- **Technology Stack**: [steering/tech.md](../../steering/tech.md)
- **Product Context**: [steering/product.md](../../steering/product.md)

**Key Alignments**:

- Architecture pattern: [e.g., microservices, monolith, library-first]
- Primary language: [e.g., TypeScript, Python, Go]
- Framework: [e.g., Next.js, FastAPI, Express]
- Database: [e.g., PostgreSQL, MongoDB, MySQL]

---

## Architecture Design

### C4 Model: Context Diagram

```
[Diagram showing system in context with external systems and users]

+------------------+
|                  |
|  External User   |
|                  |
+--------+---------+
         |
         | HTTPS
         v
+------------------+     +------------------+
|                  |     |                  |
|  {{SYSTEM}}      +---->+ External API     |
|                  |     |                  |
+--------+---------+     +------------------+
         |
         | SQL
         v
+------------------+
|                  |
|    Database      |
|                  |
+------------------+
```

**External Dependencies**:

- [External System 1]: [Purpose]
- [External System 2]: [Purpose]

---

### C4 Model: Container Diagram

```
[Diagram showing major containers/deployable units]

+--------------------------------------+
|          {{SYSTEM}}                  |
|                                      |
|  +-------------+   +-------------+   |
|  |             |   |             |   |
|  |  Web App    +-->+  API Server |   |
|  |  (Next.js)  |   |  (Node.js)  |   |
|  |             |   |             |   |
|  +-------------+   +------+------+   |
|                           |          |
+---------------------------+----------+
                            |
                            | SQL
                            v
                   +--------+--------+
                   |                 |
                   |   PostgreSQL    |
                   |                 |
                   +-----------------+
```

**Containers**:

1. **Web Application**: [Technology, purpose]
2. **API Server**: [Technology, purpose]
3. **Database**: [Technology, purpose]

---

### C4 Model: Component Diagram

```
[Diagram showing internal components of a container]

+-------------------------------------------+
|          API Server Container             |
|                                           |
|  +---------------+   +----------------+   |
|  |               |   |                |   |
|  | Auth          |   | {{COMPONENT}}  |   |
|  | Controller    +-->+ Service        |   |
|  |               |   |                |   |
|  +-------+-------+   +-------+--------+   |
|          |                   |            |
|          v                   v            |
|  +-------+-------------------+--------+   |
|  |                                    |   |
|  |     Database Repository Layer     |   |
|  |                                    |   |
|  +------------------------------------+   |
|                                           |
+-------------------------------------------+
```

**Components**:

1. **{{COMPONENT}} Controller**: REST API endpoints
2. **{{COMPONENT}} Service**: Business logic
3. **{{COMPONENT}} Repository**: Data access

---

## Requirements Mapping

### Architecture → Requirements Matrix

| Component                 | Requirements Implemented                     | Design Rationale             |
| ------------------------- | -------------------------------------------- | ---------------------------- |
| {{COMPONENT}} Service     | REQ-{{COMPONENT}}-001, REQ-{{COMPONENT}}-002 | Business logic encapsulation |
| {{COMPONENT}} Controller  | REQ-{{COMPONENT}}-003                        | API exposure                 |
| Database Schema           | REQ-{{COMPONENT}}-004                        | Data persistence             |
| Authentication Middleware | REQ-SEC-001                                  | Security enforcement         |
| Caching Layer             | REQ-PERF-001                                 | Performance optimization     |

**Coverage**:

- ✅ All functional requirements mapped
- ✅ All non-functional requirements addressed
- ✅ 100% requirements coverage

---

## API Design

### RESTful API Endpoints

#### POST /api/{{resource}}

**Purpose**: [Create new resource]

**Maps to Requirements**: REQ-{{COMPONENT}}-001

**Request**:

```http
POST /api/{{resource}}
Content-Type: application/json
Authorization: Bearer {token}

{
  "field1": "value1",
  "field2": "value2"
}
```

**Request Schema**:

```typescript
interface CreateResourceRequest {
  field1: string; // Required, max 255 chars
  field2: number; // Required, positive integer
}
```

**Response (Success)**:

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "uuid",
  "field1": "value1",
  "field2": "value2",
  "createdAt": "2025-11-16T10:00:00Z"
}
```

**Response (Error)**:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Validation failed",
  "details": [
    {
      "field": "field1",
      "message": "Field1 is required"
    }
  ]
}
```

**Status Codes**:

- 201: Resource created successfully
- 400: Invalid request (validation failed)
- 401: Unauthorized (missing/invalid token)
- 409: Conflict (resource already exists)
- 500: Internal server error

**Acceptance Criteria** (from REQ-{{COMPONENT}}-001):

- ✅ Validates request schema
- ✅ Returns 201 on success
- ✅ Returns resource ID
- ✅ Persists to database

---

#### GET /api/{{resource}}/:id

**Purpose**: [Retrieve resource by ID]

**Maps to Requirements**: REQ-{{COMPONENT}}-002

**Request**:

```http
GET /api/{{resource}}/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {token}
```

**Response (Success)**:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "field1": "value1",
  "field2": "value2",
  "createdAt": "2025-11-16T10:00:00Z",
  "updatedAt": "2025-11-16T10:00:00Z"
}
```

**Response (Not Found)**:

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Resource not found",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Status Codes**:

- 200: Resource found
- 401: Unauthorized
- 404: Resource not found
- 500: Internal server error

---

### OpenAPI Specification

See [openapi.yaml](./openapi.yaml) for complete API specification.

**Generation Command**:

```bash
# Generate OpenAPI spec
@api-designer generate openapi for {{FEATURE_NAME}}
```

---

## Database Design

### Entity-Relationship Diagram

```
+-------------------+          +-------------------+
|      users        |          |   {{resource}}    |
+-------------------+          +-------------------+
| id (PK)           |          | id (PK)           |
| email             |          | user_id (FK)      |
| password_hash     |          | field1            |
| created_at        |          | field2            |
| updated_at        |          | created_at        |
+-------------------+          | updated_at        |
         |                     +-------------------+
         |                              |
         +------------------------------+
                    1:N
```

---

### Schema Definition

#### Table: {{resource}}

**Maps to Requirements**: REQ-{{COMPONENT}}-004

**Columns**:

| Column     | Type         | Constraints                      | Description        |
| ---------- | ------------ | -------------------------------- | ------------------ |
| id         | UUID         | PRIMARY KEY                      | Unique identifier  |
| user_id    | UUID         | FOREIGN KEY (users.id), NOT NULL | Owner reference    |
| field1     | VARCHAR(255) | NOT NULL                         | [Description]      |
| field2     | INTEGER      | NOT NULL, CHECK (field2 > 0)     | [Description]      |
| created_at | TIMESTAMP    | NOT NULL, DEFAULT NOW()          | Creation timestamp |
| updated_at | TIMESTAMP    | NOT NULL, DEFAULT NOW()          | Update timestamp   |

**Indexes**:

- PRIMARY KEY: `id`
- INDEX: `user_id` (for lookups by user)
- INDEX: `created_at` (for sorting)
- UNIQUE: `user_id, field1` (business constraint)

**DDL**:

```sql
CREATE TABLE {{resource}} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field1 VARCHAR(255) NOT NULL,
  field2 INTEGER NOT NULL CHECK (field2 > 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_{{resource}}_user_id ON {{resource}}(user_id);
CREATE INDEX idx_{{resource}}_created_at ON {{resource}}(created_at);
CREATE UNIQUE INDEX idx_{{resource}}_user_field1 ON {{resource}}(user_id, field1);
```

---

### Migration Strategy

**Maps to Requirements**: REQ-MAINT-001

**Initial Migration** (Greenfield):

```sql
-- migrations/001_create_{{resource}}_table.sql
[DDL from above]
```

**Migration Tools**:

- [e.g., Prisma Migrate, TypeORM migrations, Alembic]

**Rollback Strategy**:

```sql
-- migrations/001_create_{{resource}}_table.down.sql
DROP TABLE {{resource}};
```

---

## Component Design

### {{COMPONENT}} Service

**Maps to Requirements**: REQ-{{COMPONENT}}-001, REQ-{{COMPONENT}}-002

**Responsibilities**:

- Business logic for {{resource}} operations
- Validation
- Error handling

**Interface**:

```typescript
interface {{COMPONENT}}Service {
  create(data: CreateResourceDTO): Promise<Resource>;
  findById(id: string): Promise<Resource | null>;
  update(id: string, data: UpdateResourceDTO): Promise<Resource>;
  delete(id: string): Promise<void>;
}
```

**Implementation**:

```typescript
// src/services/{{component}}.service.ts

export class {{COMPONENT}}Service implements {{COMPONENT}}Service {
  constructor(private repository: {{COMPONENT}}Repository) {}

  async create(data: CreateResourceDTO): Promise<Resource> {
    // REQ-{{COMPONENT}}-001: Validate input
    this.validateCreateInput(data);

    // REQ-{{COMPONENT}}-001: Check for duplicates
    const existing = await this.repository.findByUserAndField1(
      data.userId,
      data.field1
    );
    if (existing) {
      throw new ConflictError('Resource already exists');
    }

    // REQ-{{COMPONENT}}-001: Create resource
    return this.repository.create(data);
  }

  // Additional methods...
}
```

---

### {{COMPONENT}} Repository

**Maps to Requirements**: REQ-{{COMPONENT}}-004

**Responsibilities**:

- Data access layer
- Database queries
- Transaction management

**Interface**:

```typescript
interface {{COMPONENT}}Repository {
  create(data: CreateResourceDTO): Promise<Resource>;
  findById(id: string): Promise<Resource | null>;
  findByUserAndField1(userId: string, field1: string): Promise<Resource | null>;
  update(id: string, data: UpdateResourceDTO): Promise<Resource>;
  delete(id: string): Promise<void>;
}
```

---

## Integration Points

### External API Integration

**Service**: [External API Name]
**Purpose**: [Integration purpose]
**Maps to Requirements**: REQ-{{COMPONENT}}-005

**Endpoint**: `https://api.external.com/v1/endpoint`
**Authentication**: API Key in header
**Rate Limit**: 1000 requests/hour

**Request**:

```http
GET /v1/endpoint
X-API-Key: {api_key}
```

**Error Handling**:

- Retry with exponential backoff (3 attempts)
- Circuit breaker after 5 consecutive failures
- Fallback to cached data if available

---

## Security Design

**Maps to Requirements**: REQ-SEC-001

### Authentication

- **Method**: JWT (JSON Web Tokens)
- **Token Expiry**: 24 hours
- **Refresh Token**: 7 days
- **Storage**: HTTP-only cookies

### Authorization

- **Method**: Role-Based Access Control (RBAC)
- **Roles**: admin, user, guest
- **Permissions**: read, write, delete

### Data Protection

- **Encryption at Rest**: AES-256
- **Encryption in Transit**: TLS 1.3
- **Password Hashing**: bcrypt (cost factor 12)
- **Sensitive Data**: PII encrypted in database

### Input Validation

- **XSS Prevention**: Output encoding
- **SQL Injection Prevention**: Parameterized queries (ORM)
- **CSRF Protection**: CSRF tokens
- **Rate Limiting**: 100 requests/minute per IP

---

## Performance Design

**Maps to Requirements**: REQ-PERF-001

### Caching Strategy

- **Layer**: Redis
- **TTL**: 5 minutes
- **Invalidation**: On write operations

### Database Optimization

- **Indexes**: See database schema section
- **Connection Pooling**: 20 connections max
- **Query Optimization**: N+1 prevention with eager loading

### API Performance

- **Response Time Target**: < 200ms (95th percentile)
- **Pagination**: Limit 100 items per page
- **Compression**: gzip for responses > 1KB

---

## Deployment Architecture

**Maps to Requirements**: REQ-AVAIL-001

### Infrastructure

```
[Load Balancer] --> [App Server 1]
                --> [App Server 2]
                --> [App Server 3]
                        |
                        v
                  [Database Primary]
                        |
                        v
                  [Database Replica]
```

### Containers

**Docker Image**: `{{org}}/{{project}}:{{version}}`

**Dockerfile**:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

| Variable     | Description                  | Example                             |
| ------------ | ---------------------------- | ----------------------------------- |
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@host:5432/db |
| REDIS_URL    | Redis connection string      | redis://host:6379                   |
| JWT_SECRET   | JWT signing secret           | [secret]                            |
| API_KEY      | External API key             | [key]                               |

---

## Monitoring and Observability

**Maps to Requirements**: REQ-AVAIL-001

### Metrics

- **Response Time**: 95th/99th percentile
- **Error Rate**: 4xx/5xx responses
- **Throughput**: Requests per second
- **Database Query Time**: Slow query log

### Logging

- **Format**: JSON
- **Level**: INFO (production), DEBUG (development)
- **Fields**: timestamp, level, message, context, trace_id

### Alerting

- **Response Time**: Alert if 95th percentile > 500ms
- **Error Rate**: Alert if error rate > 1%
- **Database**: Alert if connection pool exhausted

---

## Constitutional Compliance

This design complies with:

### Article I: Library-First Principle

- ✅ {{COMPONENT}} implemented as library: `lib/{{component}}/`
- ✅ Independent test suite: `lib/{{component}}/tests/`
- ✅ CLI interface: `lib/{{component}}/cli.ts`

### Article II: CLI Interface Mandate

- ✅ CLI commands:
  - `{{component}} create --field1=value --field2=value`
  - `{{component}} get --id=uuid`
  - `{{component}} list --user-id=uuid`

### Article VI: Project Memory

- ✅ Architecture aligns with `steering/structure.md`
- ✅ Technology stack matches `steering/tech.md`
- ✅ Product context from `steering/product.md`

### Article VII: Simplicity Gate

- ✅ Project count: [N] (≤ 3 or Phase -1 Gate approved)

### Article VIII: Anti-Abstraction Gate

- ✅ Framework APIs used directly (no custom wrappers)
- OR
- ⚠️ Custom abstraction requires Phase -1 Gate approval: [justification]

---

## Architecture Decision Records (ADR)

### ADR-001: Use PostgreSQL for Database

**Status**: Accepted
**Date**: {{DATE}}

**Context**:
We need a database for storing {{resource}} data with ACID guarantees.

**Decision**:
Use PostgreSQL 15+ as the primary database.

**Consequences**:

- ✅ ACID transactions
- ✅ Rich data types (JSONB, UUID)
- ✅ Strong ecosystem
- ❌ Requires relational schema design

**Alternatives Considered**:

- MongoDB: Rejected (ACID guarantees less strict)
- MySQL: Rejected (less feature-rich than PostgreSQL)

---

### ADR-002: Use JWT for Authentication

**Status**: Accepted
**Date**: {{DATE}}

**Context**:
We need stateless authentication for API.

**Decision**:
Use JWT tokens stored in HTTP-only cookies.

**Consequences**:

- ✅ Stateless authentication
- ✅ Scalable (no session storage)
- ❌ Token revocation requires blocklist

**Alternatives Considered**:

- Session-based auth: Rejected (requires session storage)
- OAuth 2.0: Deferred to future iteration

---

## Risk Assessment

| Risk                             | Probability | Impact   | Mitigation                              |
| -------------------------------- | ----------- | -------- | --------------------------------------- |
| Database performance degradation | Medium      | High     | Implement caching, indexing, monitoring |
| External API unavailability      | High        | Medium   | Circuit breaker, fallback to cache      |
| Security vulnerability           | Low         | Critical | Regular security audits, OWASP Top 10   |

---

## Open Questions

- [ ] [Question 1]
- [ ] [Question 2]

---

## References

- [Requirements Specification](requirements.md)
- [Steering Context](../../steering/)
- [API Documentation](./api-docs.md)
- [Database Schema](./schema.sql)

---

## Validation

**Constitutional Validation**:

```bash
@constitution-enforcer validate design.md
```

**Requirements Coverage Validation**:

```bash
@traceability-auditor validate requirements.md design.md
```

---

**Powered by MUSUBI** - Specification Driven Development
