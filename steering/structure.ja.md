# プロジェクト構造

**プロジェクト**: MUSUBI (musubi-sdd)
**最終更新**: 2025-12-07
**バージョン**: 2.2.0

---

## CodeGraph分析サマリー

> 📊 **CodeGraphMCPServer** による静的解析結果（2025-12-05）

### コードベース指標

| 指標 | 値 | 説明 |
| --- | --- | --- |
| **総エンティティ数** | 15 | コードベース内の識別可能な要素 |
| **リレーション数** | 87 | エンティティ間の依存関係・呼び出し関係 |
| **インデックス済みファイル** | 155 | 解析対象ファイル |
| **コミュニティ数** | 6 | Louvain法による機能クラスタ |
| **モジュラリティ** | 0.52 | グラフ構造の品質指標 |
| **テスト数** | 483 | Jestテスト（19スイート） |

---

## アーキテクチャパターン

**パターン**: CLI Tool with Modular Architecture

MUSUBIは、Node.js CLIツールとして設計されています。

- **bin/**: CLIエントリーポイント（16コマンド）
- **src/**: ビジネスロジック（12モジュール）
- **steering/**: プロジェクトメモリ
- **storage/**: SDD成果物

---

## ディレクトリ構造

### ルート構造

```text
musubi/
├── bin/                  # CLIエントリーポイント（16コマンド）
│   ├── musubi.js         # メインCLI（init, status, validate, info）
│   ├── musubi-init.js    # プロジェクト初期化
│   ├── musubi-requirements.js # EARS要件
│   ├── musubi-design.js  # C4 + ADR設計
│   ├── musubi-tasks.js   # タスク分解
│   ├── musubi-trace.js   # トレーサビリティマトリックス
│   ├── musubi-gaps.js    # ギャップ検出
│   ├── musubi-change.js  # ブラウンフィールド変更
│   ├── musubi-validate.js # 憲法検証 + score
│   ├── musubi-remember.js # エージェントメモリ管理（v2.2.0）
│   └── musubi-resolve.js # GitHub Issue自動解決（v2.2.0）
├── src/                  # ソースモジュール
│   ├── agents/           # エージェントレジストリ
│   ├── analyzers/        # コードアナライザー
│   ├── generators/       # ドキュメントジェネレーター
│   ├── managers/         # ワークフローマネージャー
│   ├── templates/        # 組み込みテンプレート
│   └── validators/       # 憲法バリデーター
├── tests/                # テストスイート（Jest）
├── steering/             # プロジェクトメモリ
│   ├── product.md        # プロダクトコンテキスト
│   ├── structure.md      # プロジェクト構造
│   ├── tech.md           # 技術スタック
│   └── rules/            # 憲法ルール
└── storage/              # SDD成果物
    ├── specs/            # 仕様書
    └── changes/          # デルタ仕様書
```

---

## MCP Server 連携

### CodeGraphMCPServer 設定

MUSUBIはCodeGraphMCPServerと連携して、高度なコード分析機能を提供します。

```json
{
  "mcpServers": {
    "CodeGraph": {
      "command": "npx",
      "args": ["-y", "@anthropic/codegraph-mcp", "--codebase", "."]
    }
  }
}
```

### 利用可能なMCPツール

| ツール | 説明 | 使用エージェント |
| --- | --- | --- |
| `init_graph` | コードグラフ初期化 | orchestrator, steering |
| `get_code_snippet` | ソースコード取得 | software-developer, bug-hunter |
| `find_callers` | 呼び出し元追跡 | test-engineer, security-auditor |
| `find_dependencies` | 依存関係分析 | system-architect, change-impact-analyzer |
| `local_search` | ローカルコンテキスト検索 | software-developer, bug-hunter |
| `global_search` | グローバル検索 | orchestrator, system-architect |
| `query_codebase` | コードベースクエリ | 全エージェント |
| `analyze_module_structure` | モジュール構造分析 | system-architect, constitution-enforcer |
| `suggest_refactoring` | リファクタリング提案 | code-reviewer |
| `stats` | コードベース統計 | orchestrator |
| `community` | コミュニティ検出 | orchestrator, system-architect |

### Orchestrator MCP機能

Orchestratorは以下のCodeGraph MCP機能をサポートします：

- **インストール支援**: 4つのオプション（Python venv, Claude Code, VS Code, Claude Desktop）
- **プロジェクトインデックス**: `codegraph-mcp index --full` コマンド
- **コードベース統計**: `codegraph-mcp stats` による分析
- **コミュニティ検出**: `codegraph-mcp community` によるモジュール境界分析

---

## モジュール構造

### コアクラス（CodeGraph検出）

| クラス | モジュール | 責務 |
| --- | --- | --- |
| `GapDetector` | `src/analyzers/gap-detector.js` | 要件-実装間ギャップ検出 |
| `TraceabilityAnalyzer` | `src/analyzers/traceability.js` | 双方向トレーサビリティ分析 |
| `StuckDetector` | `src/analyzers/stuck-detector.js` | スタックエージェント検出（v2.2.0） |
| `SecurityAnalyzer` | `src/analyzers/security-analyzer.js` | セキュリティパターン検出（v2.2.0） |
| `DesignGenerator` | `src/generators/design.js` | C4 + ADR設計ドキュメント生成 |
| `RequirementsGenerator` | `src/generators/requirements.js` | EARS形式要件生成 |
| `TasksGenerator` | `src/generators/tasks.js` | タスク分解・依存関係 |
| `ChangeManager` | `src/managers/change.js` | Brownfieldデルタ仕様管理 |
| `AgentMemoryManager` | `src/managers/agent-memory.js` | エージェント学習記録管理（v2.2.0） |
| `MemoryCondenser` | `src/managers/memory-condenser.js` | メモリ自動圧縮（v2.2.0） |
| `SkillLoader` | `src/managers/skill-loader.js` | 動的スキル読み込み（v2.2.0） |
| `RepoSkillManager` | `src/managers/repo-skill-manager.js` | プロジェクト固有スキル（v2.2.0） |
| `IssueResolver` | `src/resolvers/issue-resolver.js` | GitHub Issue自動解決（v2.2.0） |
| `ConstitutionValidator` | `src/validators/constitution.js` | 9条憲法バリデーション |
| `CriticSystem` | `src/validators/critic-system.js` | 憲法準拠スコアリング（v2.2.0） |
| `GitHubClient` | `src/integrations/github-client.js` | GitHub API統合（v2.2.0） |

### ソースモジュール

```text
src/
├── agents/
│   └── registry.js           # 27エージェントレジストリ（エージェント設定エクスポート）
├── analyzers/
│   ├── gap-detector.js       # GapDetectorクラス（ギャップ分析）
│   ├── stuck-detector.js     # StuckDetectorクラス（スタック検出）v2.2.0
│   ├── security-analyzer.js  # SecurityAnalyzerクラス（セキュリティ）v2.2.0
│   └── traceability.js       # TraceabilityAnalyzerクラス（双方向トレース）
├── generators/
│   ├── design.js             # DesignGeneratorクラス（C4 + ADR）
│   ├── requirements.js       # RequirementsGeneratorクラス（EARS）
│   └── tasks.js              # TasksGeneratorクラス（分解）
├── integrations/
│   └── github-client.js      # GitHubClientクラス（API統合）v2.2.0
├── managers/
│   ├── agent-memory.js       # AgentMemoryManagerクラス v2.2.0
│   ├── change.js             # ChangeManagerクラス（デルタ仕様）
│   ├── memory-condenser.js   # MemoryCondenserクラス v2.2.0
│   ├── repo-skill-manager.js # RepoSkillManagerクラス v2.2.0
│   ├── skill-loader.js       # SkillLoaderクラス v2.2.0
│   └── workflow.js           # WorkflowManagerクラス
├── resolvers/
│   └── issue-resolver.js     # IssueResolverクラス v2.2.0
├── validators/
│   ├── constitution.js       # ConstitutionValidatorクラス（9条）
│   └── critic-system.js      # CriticSystemクラス v2.2.0
└── templates/                # 155テンプレートファイル
    ├── agents/               # 8プラットフォームテンプレート
    │   ├── claude-code/      # 27スキル + 9コマンド
    │   ├── github-copilot/   # 27エージェント
    │   ├── cursor/           # 25エージェント
    │   ├── gemini-cli/       # TOML形式
    │   ├── codex/            # 25エージェント
    │   ├── qwen-code/        # 25エージェント
    │   ├── windsurf/         # 25エージェント
    │   └── shared/           # 共通テンプレート
    └── skills/               # スキル定義
```

---

## 命名規則

### ファイル命名

- **JavaScript**: `camelCase.js`（例: `gapDetector.js`）
- **テスト**: `*.test.js`（例: `traceability.test.js`）
- **CLI**: `musubi-*.js`（例: `musubi-trace.js`）
- **Markdown**: `kebab-case.md`（例: `change-management.md`）

### ディレクトリ命名

- **機能別**: `kebab-case`（例: `gap-detector/`）
- **モジュール**: `camelCase`（例: `validators/`）

---

## 憲法準拠

この構造は以下を強制します：

- **Article I**: `lib/`のLibrary-Firstパターン
- **Article II**: ライブラリごとのCLIインターフェース
- **Article III**: Test-Firstをサポートするテスト構造
- **Article VI**: プロジェクトメモリを維持するステアリングファイル

---

**最終更新**: 2025-12-03
**管理者**: nahisaho（MUSUBI Contributors）


## 新規ディレクトリ (検出日: 2025-12-07)

```
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
