# Project Structure

**Project**: MUSUBI (musubi-sdd)
**Last Updated**: 2025-12-03
**Version**: 2.0.0

---

## CodeGraph Analysis Summary

> 📊 **CodeGraphMCPServer v0.7.1** による静的解析結果（2025-12-03）

### Codebase Metrics

| Metric | Value | Description |
| --- | --- | --- |
| **Total Entities** | 1,006 | コードベース内の識別可能な要素 |
| **Relations** | 4,624 | エンティティ間の依存関係・呼び出し関係 |
| **Files Indexed** | 70 | 解析対象ファイル（`.js`, `.md`） |
| **Communities** | 36 | Louvain法による機能クラスタ |

### Entity Breakdown

| Type | Count | Description |
| --- | --- | --- |
| **Methods** | 659 | クラスメソッド |
| **Classes** | 158 | クラス定義 |
| **Functions** | 116 | スタンドアロン関数 |
| **Modules** | 70 | ファイルレベルモジュール |
| **Interfaces** | 2 | TypeScript型定義 |
| **Structs** | 1 | 構造体定義 |

### Community Detection (Top 10)

Louvainアルゴリズムによる機能クラスタ分析：

| Community | Members | Likely Function |
| --- | --- | --- |
| Community 8 | 194 | Template/Agent System |
| Community 6 | 182 | CLI Commands |
| Community 4 | 151 | Generators/Core Logic |
| Community 10 | 147 | Test Suites |
| Community 5 | 97 | Validators |
| Community 1 | 90 | Analyzers |
| Community 3 | 88 | Managers |
| Community 0 | 83 | Registry/Utils |
| Community 9 | 74 | Shared Templates |
| Community 7 | 25 | Configuration |

---

## Architecture Pattern

**Primary Pattern**: CLI Tool with Modular Architecture

MUSUBIは、Node.js CLIツールとして設計されています。

- **bin/**: CLIエントリーポイント（14コマンド）
- **src/**: ビジネスロジック（6モジュール）
- **steering/**: プロジェクトメモリ
- **storage/**: SDD成果物

---

## Directory Organization

### Root Structure

```text
musubi/
├── bin/                  # CLI entry points (14 commands)
│   ├── musubi.js         # Main CLI (init, status, validate, info)
│   ├── musubi-init.js    # Project initialization
│   ├── musubi-onboard.js # Existing project onboarding
│   ├── musubi-sync.js    # Steering synchronization
│   ├── musubi-analyze.js # Code quality analysis
│   ├── musubi-share.js   # Team collaboration
│   ├── musubi-validate.js # Constitutional validation
│   ├── musubi-requirements.js # EARS requirements
│   ├── musubi-design.js  # C4 + ADR design
│   ├── musubi-tasks.js   # Task breakdown
│   ├── musubi-trace.js   # Traceability matrix
│   ├── musubi-gaps.js    # Gap detection
│   └── musubi-change.js  # Brownfield changes
├── src/                  # Source modules
│   ├── agents/           # Agent registry
│   ├── analyzers/        # Code analyzers
│   ├── generators/       # Document generators
│   ├── managers/         # Workflow managers
│   ├── templates/        # Embedded templates
│   └── validators/       # Constitutional validators
├── tests/                # Test suites (Jest)
│   ├── analyzers/
│   ├── generators/
│   ├── managers/
│   └── validators/
├── docs/                 # Documentation
│   ├── guides/           # User guides
│   ├── analysis/         # Framework analysis
│   └── Qiita/            # Blog articles
├── storage/              # SDD artifacts
│   ├── specs/            # Requirements, design, tasks
│   ├── changes/          # Delta specifications
│   └── validation/       # Validation reports
├── steering/             # Project memory
│   ├── structure.md      # This file
│   ├── tech.md           # Technology stack
│   ├── product.md        # Product context
│   ├── project.yml       # Project configuration
│   ├── memories/         # Persistent knowledge
│   └── rules/            # Constitutional governance
│       ├── constitution.md  # 9 Articles
│       ├── workflow.md      # 8-Stage SDD
│       └── ears-format.md   # EARS syntax
└── templates/            # User-facing templates
```

---

## CLI Module Pattern (Article I & II)

MUSUBIは各CLIコマンドに対応するモジュールを持つ構造です。

### Core Classes (CodeGraph Detected)

| Class | Module | Responsibility |
| --- | --- | --- |
| `GapDetector` | `src/analyzers/gap-detector.js` | 要件-実装間ギャップ検出 |
| `TraceabilityAnalyzer` | `src/analyzers/traceability.js` | 双方向トレーサビリティ分析 |
| `DesignGenerator` | `src/generators/design.js` | C4 + ADR設計ドキュメント生成 |
| `RequirementsGenerator` | `src/generators/requirements.js` | EARS形式要件生成 |
| `TasksGenerator` | `src/generators/tasks.js` | タスク分解・依存関係 |
| `ChangeManager` | `src/managers/change.js` | Brownfieldデルタ仕様管理 |
| `ConstitutionValidator` | `src/validators/constitution.js` | 9条憲法バリデーション |

### Source Module Structure

```text
src/
├── agents/
│   └── registry.js           # 25 agents registry (exports agent configs)
├── analyzers/
│   ├── gap-detector.js       # GapDetector class (gap analysis)
│   └── traceability.js       # TraceabilityAnalyzer class (bi-directional tracing)
├── generators/
│   ├── design.js             # DesignGenerator class (C4 + ADR)
│   ├── requirements.js       # RequirementsGenerator class (EARS)
│   └── tasks.js              # TasksGenerator class (breakdown)
├── managers/
│   └── change.js             # ChangeManager class (delta specs)
├── validators/
│   └── constitution.js       # ConstitutionValidator class (9 Articles)
└── templates/                # 112 template files, 48 directories
    ├── agents/               # 8 platform templates
    │   ├── claude-code/      # 25 skills + 9 commands
    │   ├── github-copilot/   # 25 agents
    │   ├── cursor/           # 25 agents
    │   ├── gemini-cli/       # TOML format
    │   ├── codex/            # 25 agents
    │   ├── qwen-code/        # 25 agents
    │   ├── windsurf/         # 25 agents
    │   └── shared/           # Common templates
    └── skills/               # Skill definitions
```

### Module Guidelines

- **Single Responsibility**: 各モジュールは単一の責務
- **CLI Interface**: 全機能はCLI経由でアクセス可能（Article II）
- **Test Coverage**: 各モジュールは専用テストを持つ
- **No External Dependencies on App**: モジュール間の依存は最小限

---

## MCP Server Integration

### CodeGraphMCPServer Configuration

MUSUBIエージェントはCodeGraphMCPServerと統合して、コードベースの構造分析機能を強化できます。

```text
# MCP設定ディレクトリ
.vscode/
└── settings.json        # VS Code MCP設定

# または Claude Code
claude mcp add codegraph -- codegraph-mcp serve --repo ${workspaceFolder}
```

### Agent × MCP Tool Mapping

| MUSUBI Agent | Primary MCP Tools |
| --- | --- |
| @orchestrator | `query_codebase`, `global_search`, `stats`, `community` |
| @change-impact-analyzer | `find_dependencies`, `find_callers` |
| @constitution-enforcer | `find_dependencies`, `analyze_module_structure` |
| @traceability-auditor | `query_codebase`, `find_callers` |
| @system-architect | `global_search`, `analyze_module_structure` |
| @software-developer | `get_code_snippet`, `local_search` |
| @test-engineer | `find_callers`, `find_dependencies` |
| @security-auditor | `find_callers`, `query_codebase` |
| @bug-hunter | `find_callers`, `local_search` |
| @code-reviewer | `suggest_refactoring`, `get_code_snippet` |

### Orchestrator MCP Capabilities

Orchestratorは以下のCodeGraph MCP機能をサポートします：

- **インストール支援**: 4つのオプション（Python venv, Claude Code, VS Code, Claude Desktop）
- **プロジェクトインデックス**: `codegraph-mcp index --full` コマンド
- **コードベース統計**: `codegraph-mcp stats` による分析
- **コミュニティ検出**: `codegraph-mcp community` によるモジュール境界分析

詳細は `steering/tech.md` の MCP Server Integration セクションを参照。

---

## Supported Platforms Structure

MUSUBIは7つのAIコーディングプラットフォームをサポートします。

### Platform Configuration

| Platform | Directory | Format | Entry File |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills/`, `.claude/commands/` | Markdown | CLAUDE.md |
| GitHub Copilot | `.github/prompts/` | Markdown | AGENTS.md |
| Cursor IDE | `.cursor/commands/` | Markdown | AGENTS.md |
| Gemini CLI | `.gemini/commands/` | TOML | GEMINI.md |
| Codex CLI | `.codex/prompts/` | Markdown | AGENTS.md |
| Qwen Code | `.qwen/commands/` | Markdown | AGENTS.md |
| Windsurf IDE | `.windsurf/workflows/` | Markdown | AGENTS.md |

### Platform-Specific Files

```text
# Claude Code
.claude/
├── skills/              # 25 Skills API (exclusive)
├── commands/            # Slash commands
└── CLAUDE.md

# GitHub Copilot
.github/
├── prompts/             # # commands
└── AGENTS.md            # 25 agents

# Cursor IDE
.cursor/
├── commands/            # / commands
└── AGENTS.md

# Gemini CLI
.gemini/
├── commands/*.toml      # TOML format
└── GEMINI.md
```

---

## Steering Context Structure

プロジェクトメモリは`steering/`ディレクトリに保存されます。

```text
steering/
├── structure.md          # アーキテクチャパターン（このファイル）
├── structure.ja.md       # 日本語版
├── tech.md               # 技術スタック
├── tech.ja.md            # 日本語版
├── product.md            # プロダクトコンテキスト
├── product.ja.md         # 日本語版
├── project.yml           # プロジェクト設定
├── memories/             # 持続的ナレッジ
│   ├── architecture_decisions.md
│   ├── development_workflow.md
│   ├── domain_knowledge.md
│   ├── lessons_learned.md
│   ├── suggested_commands.md
│   └── technical_debt.md
├── rules/                # 憲法ガバナンス
│   ├── constitution.md      # 9条の憲法条項
│   ├── workflow.md          # 8ステージSDD
│   ├── ears-format.md       # EARS構文
│   ├── ears-format.ja.md    # 日本語版
│   └── phase-gates.md       # Phase -1 Gates
└── templates/            # テンプレート
```

---

## Storage Artifacts Structure

SDD成果物は`storage/`ディレクトリに保存されます。

```text
storage/
├── specs/                # 仕様書
│   ├── auth-requirements.md    # EARS要件
│   ├── auth-requirements.ja.md # 日本語版
│   ├── auth-design.md          # C4 + ADR設計
│   ├── auth-design.ja.md       # 日本語版
│   ├── auth-tasks.md           # タスク分解
│   └── auth-tasks.ja.md        # 日本語版
├── changes/              # Delta仕様（Brownfield）
│   ├── CHANGE-001-add-2fa.md
│   └── CHANGE-001-add-2fa.ja.md
├── features/             # 機能追跡
│   └── auth.json
└── validation/           # 検証レポート
    └── constitution-report.md
```

---

## Test Organization

### Test Structure

```text
tests/
├── cli.test.js           # CLIコマンドテスト
├── init-platforms.test.js # 7プラットフォーム初期化テスト
├── registry.test.js      # エージェントレジストリテスト
├── analyzers/            # アナライザーテスト
├── generators/           # ジェネレーターテスト
├── managers/             # マネージャーテスト
├── validators/           # バリデーターテスト
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

```text
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

```text
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

```text
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

```text
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

```text
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Example**:

```text
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

**Last Updated**: 2025-12-03
**Maintained By**: nahisaho (MUSUBI Contributors)


## New Directories (Detected 2025-11-23)

```text
tests/
templates/
storage/
steering/
orchestrator/
docs/
coverage/
bin/
References/
```
