# Documentation Templates

## Overview

Templates for creating technical documentation.

---

## README Template

```markdown
# Project Name

Brief description of what this project does.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

## Features

- Feature 1
- Feature 2
- Feature 3

## Quick Start

\`\`\`bash
# Install
npm install project-name

# Run
npx project-name
\`\`\`

## Installation

### Prerequisites

- Node.js >= 18
- npm >= 9

### Steps

1. Clone the repository
   \`\`\`bash
   git clone https://github.com/org/project.git
   \`\`\`

2. Install dependencies
   \`\`\`bash
   npm install
   \`\`\`

3. Configure environment
   \`\`\`bash
   cp .env.example .env
   \`\`\`

## Usage

### Basic Usage

\`\`\`javascript
import { thing } from 'project-name';

const result = thing.doSomething();
\`\`\`

### Advanced Usage

See [Advanced Guide](docs/advanced.md) for more options.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | number | 3000 | Server port |
| `debug` | boolean | false | Enable debug mode |

## API Reference

See [API Documentation](docs/api.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT - see [LICENSE](LICENSE).
```

---

## API Documentation Template

```markdown
# API Reference

## Authentication

All API requests require authentication using Bearer tokens.

\`\`\`http
Authorization: Bearer <token>
\`\`\`

## Endpoints

### Users

#### List Users

\`\`\`http
GET /api/v1/users
\`\`\`

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 20) |

**Response**

\`\`\`json
{
  "data": [
    {
      "id": "123",
      "name": "John Doe",
      "email": "john@example.com"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1
  }
}
\`\`\`

#### Get User

\`\`\`http
GET /api/v1/users/:id
\`\`\`

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User ID |

**Response**

\`\`\`json
{
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
\`\`\`

#### Create User

\`\`\`http
POST /api/v1/users
\`\`\`

**Request Body**

\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
\`\`\`

**Response** (201 Created)

\`\`\`json
{
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
\`\`\`

## Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request data |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 500 | INTERNAL_ERROR | Server error |

**Error Format**

\`\`\`json
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
  }
}
\`\`\`
```

---

## CONTRIBUTING Template

```markdown
# Contributing to [Project]

Thank you for your interest in contributing!

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. Check existing issues first
2. Use the bug report template
3. Include reproduction steps

### Suggesting Features

1. Check existing proposals
2. Use the feature request template
3. Describe the use case

### Pull Requests

1. Fork the repository
2. Create a feature branch
   \`\`\`bash
   git checkout -b feature/my-feature
   \`\`\`
3. Make your changes
4. Run tests
   \`\`\`bash
   npm test
   \`\`\`
5. Commit with conventional commits
   \`\`\`
   feat: add new feature
   fix: resolve bug in X
   docs: update README
   \`\`\`
6. Push and open PR

## Development Setup

\`\`\`bash
# Clone
git clone https://github.com/org/project.git
cd project

# Install
npm install

# Run tests
npm test

# Run dev server
npm run dev
\`\`\`

## Style Guide

- Use ESLint configuration
- Follow existing code style
- Add tests for new features
- Update documentation

## Questions?

Open a discussion or reach out to maintainers.
```

---

## Architecture Decision Record (ADR)

```markdown
# ADR-001: [Title]

## Status

Proposed | Accepted | Deprecated | Superseded by ADR-XXX

## Date

YYYY-MM-DD

## Context

[Describe the issue or decision that needs to be made]

## Decision

[Describe the decision made]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Downside 1]
- [Downside 2]

### Neutral
- [Trade-off 1]

## Alternatives Considered

### Option A
- Pros: [...]
- Cons: [...]

### Option B
- Pros: [...]
- Cons: [...]

## References

- [Link to related docs]
```

---

## Runbook Template

```markdown
# Runbook: [Procedure Name]

## Overview

[Brief description of what this runbook covers]

## Prerequisites

- [ ] Access to [system]
- [ ] [Tool] installed
- [ ] [Permission] granted

## Procedure

### Step 1: [Name]

\`\`\`bash
command here
\`\`\`

Expected output:
\`\`\`
output here
\`\`\`

### Step 2: [Name]

1. Navigate to [location]
2. Click [button]
3. Verify [condition]

## Verification

- [ ] [Check 1]
- [ ] [Check 2]

## Rollback

If something goes wrong:

1. [Rollback step 1]
2. [Rollback step 2]

## Troubleshooting

### Issue: [Description]
**Solution**: [How to fix]

### Issue: [Description]
**Solution**: [How to fix]

## Contacts

- Primary: [Name] - [Contact]
- Secondary: [Name] - [Contact]
```

---

## Documentation Checklist

### README
- [ ] Project description
- [ ] Quick start guide
- [ ] Installation steps
- [ ] Usage examples
- [ ] Configuration options
- [ ] Contributing info
- [ ] License

### API Docs
- [ ] Authentication explained
- [ ] All endpoints documented
- [ ] Request/response examples
- [ ] Error codes listed
- [ ] Rate limits mentioned

### Code Docs
- [ ] Functions documented
- [ ] Parameters described
- [ ] Return values explained
- [ ] Examples provided
