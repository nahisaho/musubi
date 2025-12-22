# プロジェクト構造

**プロジェクト**: musubi
**最終更新**: 2025-12-12
**バージョン**: 5.9.0

---

## アーキテクチャ概要

```
musubi/
├── bin/                    # CLI エントリポイント (22 コマンド)
├── src/
│   ├── agents/             # AI エージェント (browser, agentic, function-tool)
│   ├── ai/                 # 高度な AI 統合
│   ├── analyzers/          # コード分析 (AST, 複雑度, セキュリティ)
│   ├── converters/         # 仕様フォーマット変換 (OpenAPI, SpecKit)
│   ├── enterprise/         # エンタープライズ機能 (マルチテナント)
│   ├── generators/         # ドキュメント生成 (design, requirements, tasks)
│   ├── gui/                # Web GUI サーバー
│   ├── integrations/       # 外部統合 (CI/CD, MCP, GitHub)
│   ├── llm-providers/      # LLM プロバイダー (Anthropic, OpenAI, Ollama)
│   ├── managers/           # コアマネージャー (workflow, package, checkpoint)
│   ├── monitoring/         # モニタリング (コスト, インシデント, 可観測性)
│   ├── orchestration/      # マルチエージェントオーケストレーション
│   │   ├── patterns/       # オーケストレーションパターン (swarm, triage, handoff)
│   │   ├── reasoning/      # 推論エンジン
│   │   ├── replanning/     # 適応的再計画
│   │   └── guardrails/     # 安全ガードレール
│   ├── performance/        # パフォーマンス最適化
│   ├── reporters/          # レポート生成
│   ├── resolvers/          # イシュー解決
│   ├── steering/           # ステアリングファイル管理
│   ├── templates/          # エージェントテンプレート (7 プラットフォーム)
│   │   └── agents/         # Claude Code, Copilot, Cursor など
│   └── validators/         # Constitution & 検証
├── steering/               # プロジェクトステアリングファイル
├── docs/                   # ドキュメント
├── tests/                  # テストスイート (4,408 テスト)
└── packages/               # サブパッケージ (VSCode 拡張機能)
```

## 主要コンポーネント (v5.9.0)

### マネージャー

| マネージャー | ファイル | 目的 |
|------------|---------|------|
| WorkflowModeManager | `src/managers/workflow-mode-manager.js` | small/medium/large ワークフローモード |
| PackageManager | `src/managers/package-manager.js` | モノレポパッケージ管理 |
| CheckpointManager | `src/managers/checkpoint-manager.js` | 開発チェックポイント |
| AgentMemory | `src/managers/agent-memory.js` | エージェントメモリ永続化 |

### バリデーター

| バリデーター | ファイル | 目的 |
|------------|---------|------|
| ConstitutionLevelManager | `src/validators/constitution-level-manager.js` | critical/advisory/flexible レベル |
| ProjectValidator | `src/validators/project-validator.js` | project.yml v2.0 スキーマ検証 |
| ConstitutionalValidator | `src/validators/constitutional-validator.js` | 9条項の強制 |

### オーケストレーション

| コンポーネント | ファイル | 目的 |
|--------------|---------|------|
| BuiltinSkills | `src/orchestration/builtin-skills.js` | 5つの組み込みスキル |
| SkillRegistry | `src/orchestration/skill-registry.js` | スキル登録 & 発見 |
| WorkflowOrchestrator | `src/orchestration/workflow-orchestrator.js` | ワークフロー実行 |

---

## アーキテクチャレイヤー

### レイヤー依存ルール

```
┌─────────────────────────────────────────┐
│        Interface / Presentation         │ ← エントリポイント
├─────────────────────────────────────────┤
│        Application / Use Cases          │ ← オーケストレーション
├─────────────────────────────────────────┤
│        Infrastructure / Adapters        │ ← I/O & 外部連携
├─────────────────────────────────────────┤
│            Domain / Core                │ ← 純粋なビジネスロジック
└─────────────────────────────────────────┘

依存方向: ↓ (外側 → 内側)
Domain レイヤーは依存なし
```

## 変更履歴

### 2025-12-12 (v5.9.0)
- Phase 1: ワークフローモード (small/medium/large)
- Phase 2: モノレポサポート (packages.yml)
- Phase 3: Constitution レベル (critical/advisory/flexible)
- Phase 4: project.yml v2.0 スキーマ検証
- 新規 CLI: musubi-release, musubi-config
- 5つの組み込みオーケストレータースキル
- 4,408 テスト合格
├── api/                  # API routes/controllers
├── components/           # UI components
├── services/             # Business logic services
├── tests/                # Test suites
├── docs/                 # Documentation
├── storage/              # SDD artifacts
│   ├── specs/            # Requirements, design, tasks
│   ├── changes/          # Delta specifications (brownfield)
│   └── validation/       # Validation reports
├── steering/             # Project memory (this directory)
│   ├── structure.md      # This file
│   ├── tech.md           # Technology stack
│   ├── product.md        # Product context
│   └── rules/            # Constitutional governance
├── templates/            # Document templates
└── [Other directories]
```

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

**Last Updated**: 2025-12-12
**Maintained By**: {{MAINTAINER}}
