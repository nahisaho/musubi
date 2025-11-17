# Technology Stack

**Project**: musubi
**Last Updated**: 2025-11-17
**Version**: 1.0

---

## Overview

This document defines the approved technology stack for musubi. All development MUST use these technologies unless explicitly approved via Phase -1 Gate (Article VIII: Anti-Abstraction).

---

## Primary Technologies

### Programming Languages

| Language | Version | Usage | Notes |
|----------|---------|-------|-------|
| {{PRIMARY_LANGUAGE}} | {{VERSION}} | Primary application language | [Notes] |
| SQL | PostgreSQL 15+ | Database queries | Via Prisma ORM |
| TypeScript | 5.0+ | Type definitions | Strict mode enabled |

### Runtime Environment

- **Node.js**: {{NODE_VERSION}}+ (LTS)
- **Package Manager**: npm {{NPM_VERSION}}+ / pnpm {{PNPM_VERSION}}+

---

## Frontend Stack

### Framework

**Primary Framework**: {{FRONTEND_FRAMEWORK}}

| Technology | Version | Purpose |
|------------|---------|---------|
| {{FRONTEND_FRAMEWORK}} | {{VERSION}} | [Purpose] |
| React | 18+ | UI library (if using Next.js/Remix) |
| TypeScript | 5.0+ | Type safety |

### UI Components

| Library | Version | Purpose |
|---------|---------|---------|
| {{UI_LIBRARY}} | {{VERSION}} | Component library |
| Tailwind CSS | 3.0+ | Utility-first CSS |
| shadcn/ui | Latest | Component primitives |

### State Management

| Library | Version | Purpose |
|---------|---------|---------|
| {{STATE_LIBRARY}} | {{VERSION}} | [Global state / Server state] |
| React Context | Built-in | Local state |
| React Query | 5.0+ | Server state (if applicable) |

### Form Handling

| Library | Version | Purpose |
|---------|---------|---------|
| React Hook Form | 7.0+ | Form management |
| Zod | 3.0+ | Schema validation |

---

## Backend Stack

### Framework

**Primary Framework**: {{BACKEND_FRAMEWORK}}

| Technology | Version | Purpose |
|------------|---------|---------|
| {{BACKEND_FRAMEWORK}} | {{VERSION}} | API server |
| Express | 4.0+ | Web framework (if using Node.js) |
| Next.js API Routes | 14+ | Serverless API (if using Next.js) |

### API Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| REST | - | Primary API style |
| GraphQL | (Optional) | Complex data fetching |
| OpenAPI | 3.0+ | API specification |

---

## Database Stack

### Primary Database

**Database**: {{DATABASE}}

| Technology | Version | Purpose |
|------------|---------|---------|
| {{DATABASE}} | {{VERSION}} | Primary data store |
| Prisma | 5.0+ | ORM and migrations |

### Database Schema

```prisma
// Example schema structure
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Caching Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| Redis | 7.0+ | Session storage, caching |
| In-memory cache | - | Development only |

---

## Authentication & Authorization

### Authentication

| Technology | Version | Purpose |
|------------|---------|---------|
| {{AUTH_METHOD}} | {{VERSION}} | User authentication |
| bcrypt | 5.0+ | Password hashing (cost factor 12) |
| JWT | - | Session tokens |

**Password Requirements**:
- Hashing: bcrypt with cost factor 12 (Article III: Security)
- Minimum length: 12 characters
- Complexity: Uppercase, lowercase, number, special char

### Authorization

| Technology | Version | Purpose |
|------------|---------|---------|
| RBAC | - | Role-Based Access Control |
| CASL | 6.0+ | Authorization library (optional) |

---

## Testing Stack

### Test Frameworks

| Technology | Version | Purpose |
|------------|---------|---------|
| {{TEST_FRAMEWORK}} | {{VERSION}} | Unit testing |
| Jest | 29+ | Test runner (if using JavaScript/TypeScript) |
| Vitest | 1.0+ | Fast test runner (alternative to Jest) |

### Testing Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| React Testing Library | 14+ | Component testing |
| Supertest | 6.0+ | API testing |
| Playwright | 1.40+ | E2E testing |
| Testing Library | Latest | DOM testing utilities |

### Test Databases

- **Integration Tests**: Real PostgreSQL (Docker container)
- **Unit Tests**: Mocked repository layer
- **E2E Tests**: Dedicated test database

**Docker Compose** for test services:
```yaml
services:
  test-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test
    ports:
      - "5432:5432"

  test-redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**Constitutional Compliance (Article IX)**:
- Integration tests MUST use real database
- Integration tests MUST use real cache
- Mocks only for external APIs without test environments

---

## Build & Development Tools

### Build Tools

| Tool | Version | Purpose |
|------|---------|---------|
| {{BUILD_TOOL}} | {{VERSION}} | Build system |
| esbuild | Latest | Fast bundler |
| Turbo | Latest | Monorepo build system |

### Code Quality

| Tool | Version | Purpose |
|------|---------|---------|
| ESLint | 8.0+ | JavaScript/TypeScript linting |
| Prettier | 3.0+ | Code formatting |
| TypeScript | 5.0+ | Type checking |
| Husky | 8.0+ | Git hooks |
| lint-staged | 14.0+ | Pre-commit linting |

**ESLint Configuration**:
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

---

## CI/CD Stack

### CI/CD Platform

| Technology | Version | Purpose |
|------------|---------|---------|
| {{CI_CD_PLATFORM}} | - | Continuous Integration/Deployment |
| GitHub Actions | - | CI/CD workflows |
| GitLab CI | - | Alternative CI/CD |

### Deployment

| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | 24.0+ | Containerization |
| Docker Compose | 2.0+ | Multi-container apps (dev) |
| Kubernetes | 1.28+ | Container orchestration (prod) |

---

## Cloud Infrastructure

### Cloud Provider

**Primary Provider**: {{CLOUD_PROVIDER}}

| Service | Purpose |
|---------|---------|
| {{COMPUTE_SERVICE}} | Application hosting |
| {{DATABASE_SERVICE}} | Managed database |
| {{STORAGE_SERVICE}} | Object storage |
| {{CACHE_SERVICE}} | Managed Redis |

### Infrastructure as Code

| Technology | Version | Purpose |
|------------|---------|---------|
| {{IAC_TOOL}} | {{VERSION}} | Infrastructure provisioning |
| Terraform | 1.6+ | Cloud infrastructure |
| Bicep | Latest | Azure infrastructure |

---

## Monitoring & Observability

### Logging

| Technology | Version | Purpose |
|------------|---------|---------|
| {{LOGGING_TOOL}} | {{VERSION}} | Log aggregation |
| Winston | 3.0+ | Application logging (Node.js) |
| Pino | 8.0+ | Fast logging (alternative) |

**Log Format**: JSON

```typescript
// Example log entry
{
  "timestamp": "2025-11-16T10:00:00Z",
  "level": "info",
  "message": "User logged in",
  "context": {
    "userId": "uuid",
    "ip": "192.168.1.1"
  },
  "traceId": "trace-id"
}
```

### Monitoring

| Technology | Version | Purpose |
|------------|---------|---------|
| {{MONITORING_TOOL}} | {{VERSION}} | Application monitoring |
| Prometheus | 2.0+ | Metrics collection |
| Grafana | 10.0+ | Metrics visualization |

### Tracing

| Technology | Version | Purpose |
|------------|---------|---------|
| {{TRACING_TOOL}} | {{VERSION}} | Distributed tracing |
| OpenTelemetry | Latest | Tracing standard |
| Jaeger | 1.50+ | Tracing backend |

### Error Tracking

| Technology | Version | Purpose |
|------------|---------|---------|
| Sentry | Latest | Error tracking and reporting |

---

## Documentation Tools

### API Documentation

| Tool | Version | Purpose |
|------|---------|---------|
| OpenAPI/Swagger | 3.0+ | REST API documentation |
| GraphQL Playground | - | GraphQL API explorer |
| Postman | Latest | API testing and docs |

### Code Documentation

| Tool | Version | Purpose |
|------|---------|---------|
| TSDoc | - | TypeScript documentation |
| JSDoc | - | JavaScript documentation |
| Storybook | 7.0+ | Component documentation |

---

## Development Tools

### Code Editors

- **Recommended**: Visual Studio Code
- **Extensions**:
  - ESLint
  - Prettier
  - TypeScript
  - Prisma
  - Tailwind CSS IntelliSense

### Database Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Prisma Studio | Built-in | Database GUI |
| pgAdmin | 4.0+ | PostgreSQL admin |
| TablePlus | Latest | Multi-database client |

### API Testing

| Tool | Version | Purpose |
|------|---------|---------|
| Postman | Latest | API testing |
| Insomnia | Latest | REST/GraphQL client |
| curl | - | Command-line API testing |

---

## Security Tools

### Security Scanning

| Tool | Version | Purpose |
|------|---------|---------|
| npm audit | Built-in | Dependency vulnerability scanning |
| Snyk | Latest | Continuous security monitoring |
| OWASP ZAP | Latest | Security testing |

### Secrets Management

| Tool | Version | Purpose |
|------|---------|---------|
| {{SECRETS_TOOL}} | {{VERSION}} | Secrets management |
| .env files | - | Local development secrets |
| AWS Secrets Manager | - | Production secrets (AWS) |
| Azure Key Vault | - | Production secrets (Azure) |

---

## Package Management

### Dependency Management

```json
// package.json structure
{
  "name": "musubi",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    // Production dependencies
  },
  "devDependencies": {
    // Development dependencies
  }
}
```

### Version Pinning

- **Exact Versions**: Critical dependencies (database drivers, auth libraries)
- **Caret Ranges**: UI libraries, utilities (`^1.2.3`)
- **Lock Files**: Commit `package-lock.json` / `pnpm-lock.yaml`

---

## Framework-Specific Configurations

### {{PRIMARY_FRAMEWORK}} Configuration

[Include framework-specific configuration details]

**Example for Next.js**:
```typescript
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false
  },
  eslint: {
    ignoreDuringBuilds: false
  },
  experimental: {
    serverActions: true
  }
};

export default nextConfig;
```

---

## Anti-Abstraction Policy (Article VIII)

**CRITICAL**: Use framework APIs directly. Do NOT create custom abstraction layers.

### ✅ Allowed

```typescript
// Use Prisma directly
const user = await prisma.user.findUnique({ where: { id } });

// Use bcrypt directly
const hash = await bcrypt.hash(password, 12);

// Use Next.js API routes directly
export async function POST(request: Request) { ... }
```

### ❌ Prohibited (Without Phase -1 Gate Approval)

```typescript
// ❌ Custom database wrapper
class MyDatabase {
  async find(id: string) { ... }  // Wrapping Prisma
}

// ❌ Custom HTTP client
class MyHttpClient {
  async get(url: string) { ... }  // Wrapping fetch
}
```

**Exception**: Multi-framework support or justified architectural need requires Phase -1 Gate approval with:
1. Multi-framework justification
2. Team expertise analysis
3. Migration path documentation
4. Approval from @system-architect + @software-developer

---

## Technology Selection Criteria

When evaluating new technologies:

1. **Community Support**: Active maintenance, large community
2. **Documentation**: Comprehensive, up-to-date
3. **Type Safety**: TypeScript support preferred
4. **Performance**: Benchmarked performance metrics
5. **Security**: Regular security updates
6. **License**: Compatible with project (MIT, Apache 2.0 preferred)
7. **Team Expertise**: Team familiarity with technology
8. **Constitutional Alignment**: Supports Library-First, Test-First principles

---

## Deprecated Technologies

| Technology | Deprecated Date | Replacement | Migration Deadline |
|------------|----------------|-------------|-------------------|
| [Old Tech] | [Date] | [New Tech] | [Date] |

---

## Changelog

### Version 1.1 (Planned)
- [Planned technology updates]

---

**Last Updated**: 2025-11-17
**Maintained By**: {{MAINTAINER}}
