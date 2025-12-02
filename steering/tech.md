# Technology Stack

**Project**: MUSUBI (musubi-sdd)
**Last Updated**: 2025-12-03
**Version**: 2.0.0

---

## CodeGraph Analysis Integration

> 📊 **CodeGraphMCPServer v0.7.1** によるコード分析が利用可能（2025-12-03）

### Analysis Capabilities

| 機能 | MCP Tool | 活用シーン |
| --- | --- | --- |
| **依存関係追跡** | `find_dependencies` | 変更影響分析 |
| **呼び出し元追跡** | `find_callers` | リファクタリング影響確認 |
| **コミュニティ検出** | `community` | モジュール境界の識別 |
| **セマンティック検索** | `local_search`, `global_search` | コードパターン検索 |
| **モジュール構造分析** | `analyze_module_structure` | アーキテクチャ検証 |

### Codebase Graph Statistics

| Metric | Value |
| --- | --- |
| Total Entities | 1,006 |
| Relations | 4,624 |
| Communities | 36 |
| Indexed Files | 70 |

---

## Overview

MUSUBIはNode.jsベースのCLIツールです。このドキュメントは承認された技術スタックを定義します。
Phase -1 Gate（Article VIII: Anti-Abstraction）で明示的に承認されない限り、これらの技術を使用する必要があります。

---

## Primary Technologies

### Programming Languages

| Language | Version | Usage | Notes |
| --- | --- | --- | --- |
| JavaScript | ES2022+ | メインアプリケーション言語 | Node.jsランタイム |
| YAML | 1.2 | 設定ファイル | project.yml |
| Markdown | CommonMark | ドキュメント | ステアリング、スペック |
| TOML | 1.0 | Gemini CLIコマンド | .tomlファイル |

### Runtime Environment

- **Node.js**: 18.0.0+ (LTS)
- **Package Manager**: npm (bundled with Node.js)

---

## Core Dependencies

### Production Dependencies

| Library | Version | Purpose |
| --- | --- | --- |
| chalk | ^4.1.2 | ターミナルの色付き出力 |
| commander | ^11.0.0 | CLIコマンドパーサー |
| fs-extra | ^11.0.0 | ファイルシステム操作拡張 |
| glob | ^10.5.0 | ファイルパターンマッチング |
| inquirer | ^9.0.0 | インタラクティブプロンプト |
| js-yaml | ^4.1.0 | YAMLパーサー |

### Development Dependencies

| Library | Version | Purpose |
| --- | --- | --- |
| eslint | ^8.50.0 | JavaScriptリント |
| jest | ^29.0.0 | テストフレームワーク |
| prettier | ^3.0.0 | コードフォーマッター |

---

## CLI Commands

### Core Commands

| Command | Purpose |
| --- | --- |
| `musubi init` | プロジェクト初期化 |
| `musubi status` | プロジェクト状況確認 |
| `musubi validate` | 憲法検証 |
| `musubi info` | プロジェクト情報表示 |

### Standalone Commands

| Command | Purpose |
| --- | --- |
| `musubi-onboard` | 既存プロジェクトのオンボーディング |
| `musubi-sync` | ステアリング同期 |
| `musubi-analyze` | コード品質分析 |
| `musubi-share` | チームコラボレーション |
| `musubi-validate` | 憲法条項検証 |
| `musubi-requirements` | EARS要件生成 |
| `musubi-design` | C4 + ADR設計 |
| `musubi-tasks` | タスク分解 |
| `musubi-trace` | トレーサビリティ |
| `musubi-change` | 変更管理（Brownfield） |
| `musubi-gaps` | ギャップ検出 |

---

## 25 Agents

### Orchestration & Management (3)

- **orchestrator** - マルチスキルワークフローのコーディネーター
- **steering** - プロジェクトメモリマネージャー
- **constitution-enforcer** - 憲法検証（9条 + Phase -1 Gates）

### Requirements & Planning (3)

- **requirements-analyst** - EARS形式要件生成
- **project-manager** - プロジェクト計画・リスク管理
- **change-impact-analyzer** - Brownfield変更分析

### Architecture & Design (4)

- **system-architect** - C4モデル + ADR設計
- **api-designer** - REST/GraphQL/gRPC API設計
- **database-schema-designer** - データベース設計
- **ui-ux-designer** - UI/UX設計

### Development (1)

- **software-developer** - マルチ言語実装

### Quality & Review (5)

- **test-engineer** - ユニット/統合/E2Eテスト
- **code-reviewer** - コードレビュー
- **bug-hunter** - バグ調査
- **quality-assurance** - QA戦略
- **traceability-auditor** - 要件↔コード↔テスト追跡

### Security & Performance (2)

- **security-auditor** - OWASP Top 10、脆弱性検出
- **performance-optimizer** - パフォーマンス最適化

### Infrastructure & Operations (5)

- **devops-engineer** - CI/CDパイプライン
- **cloud-architect** - AWS/Azure/GCP
- **database-administrator** - DB運用
- **site-reliability-engineer** - SLO/SLI、インシデント対応
- **release-coordinator** - リリース管理

### Documentation & Specialized (2)

- **technical-writer** - 技術ドキュメント
- **ai-ml-engineer** - MLモデル開発

---

## MCP Server Integration

### CodeGraphMCPServer (Recommended)

**Purpose**: コードベース構造分析、GraphRAG検索

**Installation**:

```bash
pip install codegraph-mcp-server
codegraph-mcp index /path/to/repository --full
```

**MCP設定 (VS Code)**:

```json
{
  "mcp.servers": {
    "codegraph": {
      "command": "codegraph-mcp",
      "args": ["serve", "--repo", "${workspaceFolder}"]
    }
  }
}
```

**MCP設定 (Claude Code)**:

```bash
claude mcp add codegraph -- codegraph-mcp serve --repo /path/to/project
```

### CodeGraph MCP Tools (14)

| Tool | Purpose | MUSUBI Agent |
| --- | --- | --- |
| `query_codebase` | 自然言語でコード検索 | @orchestrator, @steering |
| `find_dependencies` | 依存関係分析 | @change-impact-analyzer, @constitution-enforcer |
| `find_callers` | 関数の呼び出し元検索 | @change-impact-analyzer, @test-engineer |
| `find_callees` | 関数が呼ぶ関数を検索 | @software-developer |
| `find_implementations` | インターフェース実装検索 | @api-designer |
| `analyze_module_structure` | モジュール構造分析 | @system-architect |
| `get_code_snippet` | ソースコード取得 | @software-developer, @code-reviewer |
| `global_search` | GraphRAGグローバル検索 | @orchestrator, @technical-writer |
| `local_search` | GraphRAGローカル検索 | @software-developer, @bug-hunter |
| `suggest_refactoring` | リファクタリング提案 | @code-reviewer, @performance-optimizer |
| `reindex_repository` | リポジトリ再インデックス | @devops-engineer |

### CodeGraph MCP Prompts (6)

| Prompt | Purpose | MUSUBI Agent |
| --- | --- | --- |
| `code_review` | コードレビュー | @code-reviewer |
| `explain_codebase` | コードベース説明 | @steering, @technical-writer |
| `implement_feature` | 機能実装ガイド | @software-developer |
| `debug_issue` | デバッグ支援 | @bug-hunter |
| `refactor_guidance` | リファクタリングガイド | @code-reviewer |
| `test_generation` | テスト生成 | @test-engineer |

---

## Supported Platforms

### 7 AI Coding Platforms

| Platform | Skills API | Agents | Command Format |
| --- | --- | --- | --- |
| Claude Code | ✅ (25 skills) | ✅ | `/sdd-*` |
| GitHub Copilot | ❌ | ✅ (AGENTS.md) | `#sdd-*` |
| Cursor IDE | ❌ | ✅ (AGENTS.md) | `/sdd-*` |
| Gemini CLI | ❌ | ✅ (GEMINI.md) | `/sdd-*` |
| Codex CLI | ❌ | ✅ (AGENTS.md) | `/prompts:sdd-*` |
| Qwen Code | ❌ | ✅ (AGENTS.md) | `/sdd-*` |
| Windsurf IDE | ❌ | ✅ (AGENTS.md) | `/sdd-*` |

---

## Testing Stack

### Test Frameworks

| Technology | Version | Purpose |
| --- | --- | --- |
| Jest | ^29.0.0 | テストランナー + アサーション |
| ESLint | ^8.50.0 | 静的解析 |
| Prettier | ^3.0.0 | コードフォーマット |

### Test Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  collectCoverageFrom: [
    'src/**/*.js',
    'bin/**/*.js'
  ]
};
```

### Test Guidelines (Article III & IX)

- **Test-First**: テストはコードより先に書く
- **Coverage**: 最低80%カバレッジ
- **Real Services**: 統合テストは実サービスを使用
- **Platform Tests**: 7プラットフォームの初期化テスト

---

## Build & Development Tools

### npm Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| test | `jest` | テスト実行 |
| test:watch | `jest --watch` | ウォッチモード |
| test:coverage | `jest --coverage` | カバレッジレポート |
| lint | `eslint bin/ src/ tests/` | リント |
| lint:fix | `eslint --fix` | リント自動修正 |
| format | `prettier --write` | フォーマット |
| format:check | `prettier --check` | フォーマットチェック |

---

## CI/CD Stack

### GitHub Actions

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| CI | PR, push to main | Lint, Test, Build |
| Release | tag v*.*.* | npm publish |
| Dependabot | Weekly (Mon 9:00 JST) | 依存関係更新 |

### CI Pipeline Steps

1. ESLint & Prettier
2. Jest Tests (80% coverage required)
3. Build Verification
4. Security Audit (npm audit)
5. Platform Initialization Tests (7 platforms)

---

## Development Environment

### Recommended IDE

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - GitLens
  - Jest Runner

### npm Audit

```bash
# セキュリティ監査
npm audit

# 自動修正
npm audit fix
```

---

## Anti-Abstraction Policy (Article VIII)

**CRITICAL**: フレームワークAPIを直接使用。カスタム抽象化レイヤーを作成しない。

### ✅ 許可

```javascript
// commander を直接使用
const program = new Command();
program.option('-v, --verbose', 'Enable verbose output');

// fs-extra を直接使用
await fs.ensureDir('./storage/specs');
await fs.writeJson('./data.json', data);

// inquirer を直接使用
const answers = await inquirer.prompt([...]);
```

### ❌ 禁止（Phase -1 Gate承認なし）

```javascript
// ❌ カスタムファイルシステムラッパー
class MyFileSystem {
  async write(path, data) { ... }  // fs-extraをラップ
}

// ❌ カスタムCLIラッパー
class MyCLI {
  async parse(args) { ... }  // commanderをラップ
}
```

**例外**: マルチフレームワークサポートが必要な場合はPhase -1 Gate承認が必要

---

## Constitutional Alignment

本技術スタックは以下の憲法条項を遵守します：

- **Article I (Library-First)**: src/内のモジュール構成
- **Article II (CLI Interface)**: bin/内の14 CLIコマンド
- **Article III (Test-First)**: Jest + 80%カバレッジ
- **Article VIII (Anti-Abstraction)**: フレームワークAPIを直接使用
- **Article IX (Integration Testing)**: 7プラットフォーム初期化テスト

---

## Changelog

### Version 1.1.2 (2025-11-23)

- Documentation enhancement
- CLI help improvements

### Version 1.1.0 (2025-11-23)

- Parallel execution (30-70% faster)
- Dependency visualization (Mermaid)
- Advanced error handling

---

**Last Updated**: 2025-12-03
**Maintained By**: nahisaho (MUSUBI Contributors)
