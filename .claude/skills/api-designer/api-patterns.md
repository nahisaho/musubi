# API Design Patterns

## Overview

Best practices and patterns for designing RESTful APIs.

---

## REST Principles

### Resource Naming

```
# Good: Nouns, plural, lowercase
GET /users
GET /users/{id}
GET /users/{id}/orders

# Bad: Verbs, inconsistent
GET /getUsers
GET /user/{id}
POST /createOrder
```

### HTTP Methods

| Method | Action | Idempotent | Safe |
|--------|--------|------------|------|
| GET | Read | Yes | Yes |
| POST | Create | No | No |
| PUT | Replace | Yes | No |
| PATCH | Update | Yes | No |
| DELETE | Remove | Yes | No |

### Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing auth |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable | Validation error |
| 500 | Server Error | Unexpected error |

---

## Request/Response Patterns

### Standard Response Format

```json
{
  "data": {
    "id": "123",
    "type": "user",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "meta": {
    "requestId": "abc-123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Collection Response

```json
{
  "data": [
    { "id": "1", "name": "Item 1" },
    { "id": "2", "name": "Item 2" }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "perPage": 20
  },
  "links": {
    "self": "/items?page=1",
    "next": "/items?page=2",
    "last": "/items?page=5"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "requestId": "abc-123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## Pagination

### Offset Pagination

```
GET /users?page=2&limit=20

Response:
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 2,
    "perPage": 20,
    "totalPages": 5
  }
}
```

### Cursor Pagination

```
GET /users?cursor=eyJpZCI6MTAwfQ&limit=20

Response:
{
  "data": [...],
  "meta": {
    "nextCursor": "eyJpZCI6MTIwfQ",
    "hasMore": true
  }
}
```

---

## Filtering & Sorting

### Filtering

```
# Simple filter
GET /users?status=active

# Multiple values
GET /users?role=admin,editor

# Comparison
GET /orders?amount_gte=100&amount_lte=500

# Date range
GET /orders?created_after=2024-01-01&created_before=2024-02-01
```

### Sorting

```
# Single field
GET /users?sort=created_at

# Descending
GET /users?sort=-created_at

# Multiple fields
GET /users?sort=-created_at,name
```

### Field Selection

```
GET /users?fields=id,name,email
```

---

## Versioning

### URL Versioning
```
GET /v1/users
GET /v2/users
```

### Header Versioning
```
GET /users
Accept: application/vnd.api.v1+json
```

### Query Parameter
```
GET /users?version=1
```

---

## Authentication

### Bearer Token

```http
GET /users HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### API Key

```http
GET /users HTTP/1.1
X-API-Key: sk_live_abc123
```

---

## Rate Limiting

### Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705312800
```

### 429 Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

---

## API Documentation

### OpenAPI Spec

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0

paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
    post:
      summary: Create user
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUser'
      responses:
        '201':
          description: Created

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
          format: email
```

---

## Design Checklist

### Naming
- [ ] Resources are nouns
- [ ] Plural names for collections
- [ ] Lowercase with hyphens
- [ ] Consistent naming

### Methods
- [ ] Correct HTTP methods
- [ ] Idempotency maintained
- [ ] Proper status codes

### Responses
- [ ] Consistent format
- [ ] Useful error messages
- [ ] Pagination for lists

### Security
- [ ] Authentication required
- [ ] Rate limiting enabled
- [ ] Input validation
- [ ] CORS configured

### Documentation
- [ ] OpenAPI spec available
- [ ] Examples included
- [ ] Error codes documented
