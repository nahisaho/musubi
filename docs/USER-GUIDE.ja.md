# MUSUBI ユーザーガイド

**バージョン 6.0.0** | 仕様駆動開発の完全リファレンス

---

## 📚 目次

1. [はじめに](#はじめに)
2. [クイックスタート](#クイックスタート)
3. [コアコンセプト](#コアコンセプト)
4. [CLIリファレンス](#cliリファレンス)
5. [エンタープライズスケール分析](#エンタープライズスケール分析)
6. [オーケストレーションパターン](#オーケストレーションパターン)
7. [マルチプラットフォームサポート](#マルチプラットフォームサポート)
8. [CI/CD連携](#cicd連携)
9. [ベストプラクティス](#ベストプラクティス)
10. [トラブルシューティング](#トラブルシューティング)
11. [APIリファレンス](#apiリファレンス)

---

## はじめに

MUSUBI（結び）は、ソフトウェア開発を「コードファースト」から「仕様ファースト」へと変革する仕様駆動開発（SDD）フレームワークです。

### 主な機能

- **27の専門エージェント** - AI駆動の開発ロール
- **9つのオーケストレーションパターン** - マルチエージェントワークフロー管理
- **憲法ガバナンス** - 品質を保証する9つの条項
- **デルタ仕様** - ブラウンフィールド変更管理
- **完全なトレーサビリティ** - 要件 ↔ コード ↔ テストのマッピング
- **7プラットフォーム対応** - Claude Code, GitHub Copilot, Cursor, Gemini CLI, Codex CLI, Qwen Code, Windsurf
- **8言語サポート** - en, ja, zh, ko, de, fr, es, id

### 哲学

```
仕様 → 設計 → 実装 → 検証 → 監視
  ↑                           |
  └────── 継続的フィードバック ────┘
```

---

## クイックスタート

### インストール

```bash
# グローバルインストール
npm install -g musubi-sdd

# または npx を使用
npx musubi-sdd init
```

### クイックスタート（5分）

```bash
# 1. プロジェクトを初期化
npx musubi-sdd init

# 2. 要件を生成
npx musubi-requirements "ユーザー認証機能"

# 3. 設計を生成
npx musubi-design auth-feature

# 4. タスクを生成
npx musubi-tasks auth-feature

# 5. すべてを検証
npx musubi-validate all
```

### プロジェクト構造

```
project/
├── AGENTS.md              # ユニバーサルエントリポイント
├── CLAUDE.md              # Claude Code 専用
├── steering/
│   ├── structure.md       # アーキテクチャパターン
│   ├── tech.md           # 技術スタック
│   ├── product.md        # プロダクトコンテキスト
│   └── rules/
│       └── constitution.md  # 9つの条項
├── storage/
│   ├── specs/            # EARS要件
│   ├── features/         # C4設計
│   └── changes/          # デルタ仕様
└── .github/
    └── workflows/        # CI/CD自動化
```

---

## コアコンセプト

### 1. EARS要件

すべての要件はEARS（Easy Approach to Requirements Syntax）形式に従います：

| タイプ | パターン | 例 |
|-------|---------|-----|
| **ユビキタス** | システムは〜するものとする | システムはパスワードを暗号化するものとする |
| **イベント駆動** | 〜のとき、システムは〜するものとする | ログイン失敗のとき、システムは試行をログするものとする |
| **状態駆動** | 〜の間、システムは〜するものとする | オフラインの間、システムはリクエストをキューするものとする |
| **オプショナル** | 〜の場合、システムは〜するものとする | 有効な場合、システムは分析を表示するものとする |

### 2. 憲法ガバナンス

品質を保証する9つの不変条項：

1. **仕様ファースト** - コードより先に仕様
2. **憲法の優位性** - 憲法は上書きできない
3. **EARSコンプライアンス** - 標準要件フォーマット
4. **トレーサビリティ** - 完全な要件マッピング
5. **変更追跡** - デルタベースの変更
6. **品質ゲート** - 自動検証
7. **ドキュメンテーション** - 完全なドキュメント
8. **テスティング** - 包括的なテストカバレッジ
9. **継続的改善** - フィードバックループ

### 3. P-ラベル優先度システム

タスクはP-ラベルで優先順位付けされます：

| ラベル | 優先度 | 実行 |
|-------|--------|------|
| **P0** | クリティカル | すべてをブロック |
| **P1** | 高 | 早急に実行 |
| **P2** | 中 | 通常優先度 |
| **P3** | 低 | バックグラウンド/オプション |

### 4. トレーサビリティマトリクス

要件を実装とテストにリンク：

```
REQ-AUTH-001 ←→ src/auth/login.js ←→ tests/auth.test.js
```

---

## CLIリファレンス

### コアコマンド

| コマンド | 説明 |
|---------|------|
| `musubi init` | MUSUBIプロジェクトを初期化 |
| `musubi requirements <feature>` | EARS要件を生成 |
| `musubi design <feature>` | C4 + ADR設計を生成 |
| `musubi tasks <feature>` | P-ラベル付きタスクに分解 |
| `musubi validate [type]` | アーティファクトを検証 |
| `musubi trace` | トレーサビリティマトリクスを生成 |
| `musubi gaps` | カバレッジギャップを特定 |

### オーケストレーションコマンド

| コマンド | 説明 |
|---------|------|
| `musubi orchestrate sequential` | スキルを順次実行 |
| `musubi orchestrate parallel` | スキルを並列実行 |
| `musubi orchestrate swarm` | マルチエージェント協調 |
| `musubi orchestrate handoff` | スペシャリストに委譲 |
| `musubi orchestrate triage` | 適切なエージェントにルーティング |

### 検証コマンド

| コマンド | 説明 |
|---------|------|
| `musubi validate all` | 完全検証 |
| `musubi validate ears` | EARSフォーマットチェック |
| `musubi validate constitution` | 憲法コンプライアンス |
| `musubi validate delta` | デルタ仕様検証 |

### 変更管理

| コマンド | 説明 |
|---------|------|
| `musubi change create` | 変更リクエストを作成 |
| `musubi change analyze` | 影響分析 |
| `musubi change apply` | デルタ仕様を適用 |
| `musubi sync` | 仕様とコードを同期 |

---

## エンタープライズスケール分析

### LargeProjectAnalyzer

10,000以上のファイルを持つプロジェクトを効率的に分析：

```javascript
const { LargeProjectAnalyzer } = require('musubi-sdd');

const analyzer = new LargeProjectAnalyzer('/path/to/large-project', {
  chunkSize: 1000,      // チャンクあたりのファイル数
  enableGC: true,       // ガベージコレクションを有効化
  maxMemoryMB: 2048,    // メモリ制限
});

const result = await analyzer.analyze();
console.log(result.stats);
// { totalFiles: 100000, totalLines: 5000000, ... }
```

### ComplexityAnalyzer

循環的複雑度と認知的複雑度を計算：

```javascript
const { ComplexityAnalyzer } = require('musubi-sdd');

const analyzer = new ComplexityAnalyzer();

// 循環的複雑度
const cyclomatic = analyzer.calculateCyclomaticComplexity(code, 'javascript');

// 認知的複雑度（SonarSourceメソッド）
const cognitive = analyzer.calculateCognitiveComplexity(code, 'javascript');

// 推奨事項付きの完全分析
const analysis = analyzer.analyzeCode(code, 'javascript');
// { cyclomatic, cognitive, severity, recommendations }
```

### RustMigrationGenerator

Rust移行のためにC/C++コードを分析：

```javascript
const { RustMigrationGenerator } = require('musubi-sdd');

const generator = new RustMigrationGenerator('/path/to/c-project');
const analysis = await generator.analyze();

console.log(analysis.summary);
// { totalFiles, unsafePatterns, securityComponents, migrationPriorities }
```

### CodeGraph MCP統合

深いコード関係分析：

```javascript
const { CodeGraphMCP } = require('musubi-sdd');

const mcp = new CodeGraphMCP('/path/to/project');
await mcp.indexRepository();

// コールグラフ
const callGraph = await mcp.getCallGraph('main', { depth: 3 });

// 影響分析
const affected = await mcp.getImpactAnalysis(['src/parser.c']);

// 循環依存
const cycles = await mcp.detectCircularDependencies();
```

### HierarchicalReporter

大規模プロジェクト向けのドリルダウンレポートを生成：

```javascript
const { HierarchicalReporter } = require('musubi-sdd');

const reporter = new HierarchicalReporter({
  maxDepth: 4,
  hotspotThreshold: 25,
});

const report = reporter.generateReport(analysis);
// { summary, hierarchy, hotspots, recommendations }
```

---

## オーケストレーションパターン

MUSUBIはOpenAI Agents SDKとAutoGenにインスパイアされた9つのオーケストレーションパターンをサポート：

### 1. Sequentialパターン

```bash
musubi orchestrate sequential \
  --skills "requirements-analyst,system-architect,backend-developer" \
  --context "ユーザー認証を構築"
```

### 2. Parallelパターン（Swarm）

```bash
musubi orchestrate parallel \
  --skills "frontend-developer,backend-developer" \
  --strategy "all"
```

### 3. Handoffパターン

エージェント間の明示的な委譲：

```bash
musubi orchestrate handoff \
  --from "requirements-analyst" \
  --to "system-architect" \
  --context "要件完了、設計準備完了"
```

### 4. Triageパターン

リクエストに基づく自動ルーティング：

```bash
musubi orchestrate triage \
  --request "ログインバグを修正" \
  --agents "backend-developer,frontend-developer,security-engineer"
```

### 5. Human-in-the-Loop

```bash
musubi orchestrate workflow \
  --pattern "human-approval" \
  --approval-required "deploy,security"
```

---

## マルチプラットフォームサポート

### 対応プラットフォーム（v6.0.0）

| プラットフォーム | 設定ファイル | 拡張子 | コマンド構文 |
|----------------|-------------|--------|-------------|
| Claude Code | `CLAUDE.md` | `.md` | `/command` |
| GitHub Copilot | `.github/prompts/` | `.prompt.md` | `#command` |
| Cursor | `.cursor/rules/` | `.md` | 自然言語 |
| Gemini CLI | `GEMINI.md` | `.md` | `#command` |
| Codex CLI | `CODEX.md` | `.md` | `#command` |
| Qwen Code | `QWEN.md` | `.md` | `#command` |
| Windsurf | `.windsurf/rules/` | `.md` | 自然言語 |

> **注意（v6.0.0 破壊的変更）**: GitHub Copilotのプロンプトファイルは、VS Code公式ドキュメントに従い`.prompt.md`拡張子を使用するようになりました。これは以前のバージョンからの破壊的変更です。

### プラットフォーム固有のセットアップ

```bash
# Claude Code（プライマリ）
npx musubi-sdd init --platform claude-code

# GitHub Copilot
npx musubi-sdd init --platform github-copilot

# Cursor
npx musubi-sdd init --platform cursor

# ユニバーサル（全プラットフォーム）
npx musubi-sdd init --platform all
```

---

## CI/CD連携

### GitHub Actions

```yaml
# .github/workflows/musubi.yml
name: MUSUBI Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx musubi-validate all
      - run: npx musubi-trace --output reports/traceability.md
```

### GitLab CI

```yaml
# .gitlab-ci.yml
validate:
  script:
    - npm ci
    - npx musubi-validate all
```

### Jenkins

```groovy
// Jenkinsfile
stage('Validate') {
  steps {
    sh 'npx musubi-validate all'
  }
}
```

---

## ベストプラクティス

### 1. 小さく始める

2ファイルワークフローから始めて、段階的に拡張：

```
AGENTS.md + steering/structure.md → 完全なSDD
```

### 2. 早期検証

pre-commitフックで検証を実行：

```bash
npx husky add .husky/pre-commit "npx musubi-validate ears"
```

### 3. P-ラベルを使用

タスクを明確に優先順位付け：

- P0: クリティカルパス
- P1: 重要な機能
- P2: あれば良い
- P3: 将来の検討事項

### 4. トレーサビリティを維持

コードコメントに要件をリンク：

```javascript
// REQ-AUTH-001: ユーザー認証
function login(username, password) { ... }
```

### 5. デルタ仕様をレビュー

変更を適用する前に影響を確認：

```bash
npx musubi-change analyze --delta storage/changes/auth-v2.md
```

---

## トラブルシューティング

### よくある問題

#### 「EARS検証に失敗」

```bash
# 特定のファイルをチェック
npx musubi-validate ears --file storage/specs/feature.md

# 修正: 要件が「システムは〜するものとする」、「〜のとき...」などで始まることを確認
```

#### 「憲法違反」

```bash
# どの条項かチェック
npx musubi-validate constitution --verbose

# よくある修正: 不足しているテストまたはドキュメントを追加
```

#### 「トレーサビリティギャップ」

```bash
# ギャップを見つける
npx musubi-gaps --verbose

# 修正: 実装にREQ-XXXコメントを追加
```

### ヘルプの取得

```bash
# ヘルプを表示
npx musubi-sdd --help

# バージョンを表示
npx musubi-sdd --version

# 詳細出力
npx musubi-validate all --verbose
```

---

## APIリファレンス

### Node.js API

```javascript
const { SkillRegistry, SkillExecutor } = require('musubi-sdd');

// スキルを登録
const registry = new SkillRegistry();
registry.registerSkill({
  id: 'my-skill',
  name: 'My Custom Skill',
  category: 'custom',
  handler: async (input) => ({ result: 'done' }),
});

// スキルを実行
const executor = new SkillExecutor({ registry });
const result = await executor.execute('my-skill', { data: 'input' });
```

### オーケストレーションAPI

```javascript
const { OrchestrationEngine } = require('musubi-sdd');

const engine = new OrchestrationEngine();

// 順次実行
await engine.executePattern('sequential', {
  skills: ['skill-a', 'skill-b'],
  context: { feature: 'auth' },
});

// 並列実行
await engine.executePattern('parallel', {
  skills: ['frontend', 'backend'],
  strategy: 'all',
});
```

### 検証API

```javascript
const { EARSValidator, ConstitutionalValidator } = require('musubi-sdd');

// EARS検証
const ears = new EARSValidator();
const result = ears.validate(requirementText);

// 憲法検証
const constitution = new ConstitutionalValidator();
const compliance = constitution.check(artifacts);
```

---

## 関連ドキュメント

- [クイックスタート（5分）](./guides/quick-start-5min.md)
- [プラットフォームセットアップ](./guides/platform-setup.md)
- [オーケストレーションパターン](./guides/orchestration-patterns.md)
- [P-ラベルチュートリアル](./guides/p-label-parallelization.md)
- [ガードレールガイド](./guides/guardrails-guide.md)
- [CI/CD連携](./guides/ci-cd-integration.md)
- [変更管理](./guides/change-management.md)
- [トレーサビリティマトリクス](./guides/traceability-matrix-guide.md)

---

**MUSUBI v6.0.0** - AI時代の仕様駆動開発

[GitHub](https://github.com/nahisaho/MUSUBI) | [npm](https://www.npmjs.com/package/musubi-sdd) | [ドキュメント](https://nahisaho.github.io/musubi)
