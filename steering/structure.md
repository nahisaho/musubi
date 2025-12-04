# Project Structure

**Project**: musubi
**Last Updated**: 2025-12-05
**Version**: 2.0.6

---

## Architecture Pattern

**Primary Pattern**: Modular CLI Tool with Agent Registry

> MUSUBI is a Specification Driven Development (SDD) CLI tool featuring a modular architecture with:
> - 25 specialized agents coordinated via registry pattern
> - Multi-platform support (7 AI coding agents)
> - MCP (Model Context Protocol) integration with CodeGraphMCPServer

---

## Directory Organization

### Root Structure

```
musubi/
├── bin/                  # CLI entry points (12 commands)
│   ├── musubi.js         # Main entry
│   ├── musubi-init.js    # Project initialization
│   ├── musubi-onboard.js # Automatic onboarding
│   ├── musubi-sync.js    # Auto-sync steering
│   ├── musubi-analyze.js # Code analysis
│   ├── musubi-share.js   # Team collaboration
│   ├── musubi-validate.js # Constitutional validation
│   ├── musubi-requirements.js # EARS requirements
│   ├── musubi-design.js  # C4/ADR design
│   ├── musubi-tasks.js   # Task breakdown
│   ├── musubi-trace.js   # Traceability matrix
│   ├── musubi-gaps.js    # Gap detection
│   └── musubi-change.js  # Change management
├── src/                  # Source code
│   ├── agents/           # Agent registry
│   ├── analyzers/        # Gap detector, traceability
│   ├── generators/       # Requirements, design, tasks
│   ├── managers/         # Change management
│   ├── validators/       # Constitutional validation
│   └── templates/        # Document templates
├── tests/                # Test suites
├── docs/                 # Documentation
│   ├── analysis/         # Framework analysis
│   ├── guides/           # User guides
│   ├── Qiita/            # Published articles
│   └── requirements/     # Requirements docs
├── storage/              # SDD artifacts
│   └── specs/            # Generated specifications
├── steering/             # Project memory (this directory)
│   ├── structure.md      # This file
│   ├── tech.md           # Technology stack
│   ├── product.md        # Product context
│   ├── rules/            # Constitutional governance
│   ├── memories/         # Agent memories
│   └── templates/        # Steering templates
├── orchestrator/         # Orchestration reports
│   └── reports/          # Reorganization summaries
└── coverage/             # Test coverage reports
```

---

## Source Code Organization

### src/ Directory Structure

```
src/
├── agents/               # Agent Management
│   └── registry.js       # 25 agents registry for 7 platforms
├── analyzers/            # Analysis Tools
│   ├── gap-detector.js   # Orphaned requirements detection
│   └── traceability.js   # Requirement → Code mapping
├── generators/           # Document Generators
│   ├── requirements.js   # EARS requirements generator
│   ├── design.js         # C4/ADR design generator
│   └── tasks.js          # Task breakdown generator
├── managers/             # Resource Management
│   └── change.js         # Delta specification management
├── validators/           # Validation Tools
│   └── constitution.js   # 9 Articles compliance checker
└── templates/            # Document Templates
    └── [template files]
```

---

## CLI Commands (bin/)

All 12 CLI commands with their purposes:

| Command | Purpose |
|---------|---------|
| `musubi` | Main entry, help display |
| `musubi-init` | Initialize MUSUBI for project |
| `musubi-onboard` | Auto-analyze and generate steering |
| `musubi-sync` | Sync steering with codebase changes |
| `musubi-analyze` | Quality metrics, complexity analysis |
| `musubi-share` | Team collaboration, memory sharing |
| `musubi-validate` | Constitutional compliance check |
| `musubi-requirements` | Generate EARS requirements |
| `musubi-design` | Generate C4 models and ADRs |
| `musubi-tasks` | Break down into implementation tasks |
| `musubi-trace` | Generate traceability matrix |
| `musubi-gaps` | Detect specification gaps |
| `musubi-change` | Brownfield change management |

---

## Library-First Pattern (Article I)

All features begin as independent libraries in `lib/`.

### Library Structure

Each library follows this structure:

```
lib/{{feature}}/
├── src/
│   ├── index.ts          # Public API exports
│   ├── service.ts        # Business logic
│   ├── repository.ts     # Data access
│   ├── types.ts          # TypeScript types
│   ├── errors.ts         # Custom errors
│   └── validators.ts     # Input validation
├── tests/
│   ├── service.test.ts   # Unit tests
│   ├── repository.test.ts # Integration tests (real DB)
│   └── integration.test.ts # E2E tests
├── cli.ts                # CLI interface (Article II)
├── package.json          # Library metadata
├── tsconfig.json         # TypeScript config
└── README.md             # Library documentation
```

### Library Guidelines

- **Independence**: Libraries MUST NOT depend on application code
- **Public API**: All exports via `src/index.ts`
- **Testing**: Independent test suite
- **CLI**: All libraries expose CLI interface (Article II)

---

## Application Structure

### Application Organization

```
app/
├── (auth)/               # Route groups (Next.js App Router)
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── dashboard/
│   └── page.tsx
├── api/                  # API routes
│   ├── auth/
│   │   └── route.ts
│   └── users/
│       └── route.ts
├── layout.tsx            # Root layout
└── page.tsx              # Home page
```

### Application Guidelines

- **Library Usage**: Applications import from `lib/` modules
- **Thin Controllers**: API routes delegate to library services
- **No Business Logic**: Business logic belongs in libraries

---

## Component Organization

### UI Components

```
components/
├── ui/                   # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   └── card.tsx
├── auth/                 # Feature-specific components
│   ├── LoginForm.tsx
│   └── RegisterForm.tsx
├── dashboard/
│   └── StatsCard.tsx
└── shared/               # Shared components
    ├── Header.tsx
    └── Footer.tsx
```

### Component Guidelines

- **Composition**: Prefer composition over props drilling
- **Types**: All props typed with TypeScript
- **Tests**: Component tests with React Testing Library

---

## Database Organization

### Schema Organization

```
prisma/
├── schema.prisma         # Prisma schema
├── migrations/           # Database migrations
│   ├── 001_create_users_table/
│   │   └── migration.sql
│   └── 002_create_sessions_table/
│       └── migration.sql
└── seed.ts               # Database seed data
```

### Database Guidelines

- **Migrations**: All schema changes via migrations
- **Naming**: snake_case for tables and columns
- **Indexes**: Index foreign keys and frequently queried columns

---

## Test Organization

### Test Structure

```
tests/
├── unit/                 # Unit tests (per library)
│   └── auth/
│       └── service.test.ts
├── integration/          # Integration tests (real services)
│   └── auth/
│       └── login.test.ts
├── e2e/                  # End-to-end tests
│   └── auth/
│       └── user-flow.test.ts
└── fixtures/             # Test data and fixtures
    └── users.ts
```

### Test Guidelines

- **Test-First**: Tests written BEFORE implementation (Article III)
- **Real Services**: Integration tests use real DB/cache (Article IX)
- **Coverage**: Minimum 80% coverage
- **Naming**: `*.test.ts` for unit, `*.integration.test.ts` for integration

---

## Documentation Organization

### Documentation Structure

```
docs/
├── architecture/         # Architecture documentation
│   ├── c4-diagrams/
│   └── adr/              # Architecture Decision Records
├── api/                  # API documentation
│   ├── openapi.yaml
│   └── graphql.schema
├── guides/               # Developer guides
│   ├── getting-started.md
│   └── contributing.md
└── runbooks/             # Operational runbooks
    ├── deployment.md
    └── troubleshooting.md
```

---

## SDD Artifacts Organization

### Storage Directory

```
storage/
├── specs/                # Specifications
│   ├── auth-requirements.md
│   ├── auth-design.md
│   ├── auth-tasks.md
│   └── payment-requirements.md
├── changes/              # Delta specifications (brownfield)
│   ├── add-2fa.md
│   └── upgrade-jwt.md
├── features/             # Feature tracking
│   ├── auth.json
│   └── payment.json
└── validation/           # Validation reports
    ├── auth-validation-report.md
    └── payment-validation-report.md
```

---

## Naming Conventions

### File Naming

- **TypeScript**: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- **React Components**: `PascalCase.tsx` (e.g., `LoginForm.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Tests**: `*.test.ts` or `*.spec.ts`
- **Constants**: `SCREAMING_SNAKE_CASE.ts` (e.g., `API_ENDPOINTS.ts`)

### Directory Naming

- **Features**: `kebab-case` (e.g., `user-management/`)
- **Components**: `kebab-case` or `PascalCase` (consistent within project)

### Variable Naming

- **Variables**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`
- **Enums**: `PascalCase`

---

## Integration Patterns

### Library → Application Integration

```typescript
// ✅ CORRECT: Application imports from library
import { AuthService } from '@/lib/auth';

const authService = new AuthService(repository);
const result = await authService.login(credentials);
```

```typescript
// ❌ WRONG: Library imports from application
// Libraries must NOT depend on application code
import { AuthContext } from '@/app/contexts/auth'; // Violation!
```

### Service → Repository Pattern

```typescript
// Service layer (business logic)
export class AuthService {
  constructor(private repository: UserRepository) {}

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Business logic here
    const user = await this.repository.findByEmail(credentials.email);
    // ...
  }
}

// Repository layer (data access)
export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
```

---

## Deployment Structure

### Deployment Units

**Projects** (independently deployable):

1. musubi - Main application

> ⚠️ **Simplicity Gate (Article VII)**: Maximum 3 projects initially.
> If adding more projects, document justification in Phase -1 Gate approval.

### Environment Structure

```
environments/
├── development/
│   └── .env.development
├── staging/
│   └── .env.staging
└── production/
    └── .env.production
```

---

## Multi-Language Support

### Language Policy

- **Primary Language**: English
- **Documentation**: English first (`.md`), then Japanese (`.ja.md`)
- **Code Comments**: English
- **UI Strings**: i18n framework

### i18n Organization

```
locales/
├── en/
│   ├── common.json
│   └── auth.json
└── ja/
    ├── common.json
    └── auth.json
```

---

## Version Control

### Branch Organization

- `main` - Production branch
- `develop` - Development branch
- `feature/*` - Feature branches
- `hotfix/*` - Hotfix branches
- `release/*` - Release branches

### Commit Message Convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Example**:

```
feat(auth): implement user login (REQ-AUTH-001)

Add login functionality with email and password authentication.
Session created with 24-hour expiry.

Closes REQ-AUTH-001
```

---

## Constitutional Compliance

This structure enforces:

- **Article I**: Library-first pattern in `lib/`
- **Article II**: CLI interfaces per library
- **Article III**: Test structure supports Test-First
- **Article VI**: Steering files maintain project memory

---

## Changelog

### Version 1.1 (Planned)

- [Future changes]

---

**Last Updated**: 2025-12-04
**Maintained By**: {{MAINTAINER}}
