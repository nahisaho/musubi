# MUSUBI

**7つのAIコーディングエージェント向け究極の仕様駆動開発ツール**

MUSUBIは、6つの主要フレームワークのベスト機能を統合した包括的なSDD（仕様駆動開発）フレームワークであり、複数のAIコーディングエージェントに対応した本番環境対応ツールです。

## 特徴

- 🤖 **マルチエージェント対応** - 7つのAIコーディングエージェントに対応（Claude Code、GitHub Copilot、Cursor、Gemini CLI、Codex CLI、Qwen Code、Windsurf）
- 📄 **柔軟なコマンド形式** - Markdown、TOML、AGENTS.md形式に対応
- 🎯 **25の専門エージェント（全プラットフォーム対応）** - オーケストレーター、ステアリング、要件、アーキテクチャ、開発、品質、セキュリティ、インフラ
  - Claude Code: Skills API（25スキル）
  - GitHub Copilot & Cursor: AGENTS.md（公式サポート）
  - その他4エージェント: AGENTS.md（互換形式）
- 📋 **憲法ガバナンス** - 9つの不変条項 + フェーズ-1ゲートによる品質保証
- 📝 **EARS要件ジェネレーター** - 5つのEARSパターンで明確な要件を作成（v0.8.0）
- 🏗️ **設計ドキュメントジェネレーター** - トレーサビリティ付きC4モデルとADRを作成（v0.8.2）
- 🔄 **差分仕様** - ブラウンフィールドおよびグリーンフィールドプロジェクト対応
- 🧭 **自動更新プロジェクトメモリ** - ステアリングシステムがアーキテクチャ、技術スタック、製品コンテキストを維持
- 🚀 **自動オンボーディング** - `musubi-onboard` が既存プロジェクトを分析し、ステアリングドキュメントを生成（2-5分）
- 🔄 **自動同期** - `musubi-sync` がコードベースの変更を検出し、ステアリングドキュメントを最新に保つ
- 🔍 **インテリジェントコード分析** - `musubi-analyze` が品質メトリクス、複雑度分析、技術的負債検出を提供
- 🤝 **チーム連携** - `musubi-share` がメモリ共有、インポート/エクスポート、マルチプラットフォーム同期を実現（v0.6.0）
- ✅ **憲法バリデーション** - `musubi-validate` が9つの不変ガバナンス条項とフェーズ-1ゲートを強制（v0.7.0）
- ✅ **完全なトレーサビリティ** - 要件 → 設計 → コード → テストのマッピング
- 🌐 **バイリンガルドキュメント** - すべてのエージェント生成ドキュメントは英語と日本語の両方で作成

## 対応AIコーディングエージェント

MUSUBIは7つのAIコーディングエージェントに対応し、それぞれに最適化された設定を提供します。

| エージェント | スキルAPI | 25エージェント | コマンド形式 | コマンドファイル形式 | インストールディレクトリ |
|-------|-----------|-----------|----------------|---------------------|----------------------|
| **Claude Code** | ✅ (25スキル) | ✅ | `/sdd-*` | Markdown | `.claude/skills/`, `.claude/commands/` |
| **GitHub Copilot** | ❌ | ✅ (AGENTS.md) | `#sdd-*` | Markdown + AGENTS.md | `.github/prompts/`, `.github/AGENTS.md` |
| **Cursor IDE** | ❌ | ✅ (AGENTS.md) | `/sdd-*` | Markdown + AGENTS.md | `.cursor/commands/`, `.cursor/AGENTS.md` |
| **Gemini CLI** | ❌ | ✅ (GEMINI.md) | `/sdd-*` | TOML + GEMINI.md | `.gemini/commands/`, `GEMINI.md` |
| **Codex CLI** | ❌ | ✅ (AGENTS.md) | `/prompts:sdd-*` | Markdown + AGENTS.md | `.codex/prompts/`, `.codex/AGENTS.md` |
| **Qwen Code** | ❌ | ✅ (AGENTS.md) | `/sdd-*` | Markdown + AGENTS.md | `.qwen/commands/`, `.qwen/AGENTS.md` |
| **Windsurf IDE** | ❌ | ✅ (AGENTS.md) | `/sdd-*` | Markdown + AGENTS.md | `.windsurf/workflows/`, `.windsurf/AGENTS.md` |

**注意事項**：
- スキルAPIはClaude Code専用です
- **全7プラットフォームが25エージェントに対応**（Skills APIまたはAGENTS.md経由）
- AGENTS.md: OpenAI仕様、GitHub Copilot & Cursorが公式サポート
- Gemini CLIはTOML形式 + GEMINI.md統合を使用
- その他のエージェントはMarkdown形式 + AGENTS.mdを使用

## クイックスタート

### npx経由でのインストール

```bash
# 好みのエージェント向けにMUSUBIを初期化

# Claude Code（デフォルト） - 25 Skills API
npx musubi-sdd init
npx musubi-sdd init --claude

# GitHub Copilot - 25エージェント（AGENTS.md、公式サポート）
npx musubi-sdd init --copilot

# Cursor IDE - 25エージェント（AGENTS.md、公式サポート）
npx musubi-sdd init --cursor

# Gemini CLI - 25エージェント（GEMINI.md統合）
npx musubi-sdd init --gemini

# Codex CLI - 25エージェント（AGENTS.md）
npx musubi-sdd init --codex

# Qwen Code - 25エージェント（AGENTS.md）
npx musubi-sdd init --qwen

# Windsurf IDE - 25エージェント（AGENTS.md）
npx musubi-sdd init --windsurf

# またはグローバルインストール
npm install -g musubi-sdd
musubi init --claude    # または --copilot、--cursorなど

# 既存プロジェクトのオンボーディング（自動分析）
musubi-onboard

# コードベースとステアリングドキュメントの同期
musubi-sync
musubi-sync --dry-run        # 変更のプレビュー
musubi-sync --auto-approve   # 自動適用（CI/CD）

# コード品質分析（v0.5.0）
musubi-analyze                      # 完全分析
musubi-analyze --type=quality       # 品質メトリクスのみ
musubi-analyze --type=dependencies  # 依存関係のみ
musubi-analyze --type=security      # セキュリティ監査
musubi-analyze --output=report.md   # レポート保存

# チームとプロジェクトメモリを共有（v0.6.0）
musubi-share export                 # メモリをJSONにエクスポート
musubi-share import memories.json   # チームメイトからインポート
musubi-share sync --platform=copilot # 特定プラットフォームに同期

# 憲法準拠の検証（v0.7.0）
musubi-validate constitution        # 全9条項を検証
musubi-validate article 3           # テストファースト原則を検証
musubi-validate gates               # フェーズ-1ゲートを検証
musubi-validate complexity          # 複雑度制限をチェック
musubi-validate all -v              # 詳細付き完全検証

# EARS要件ドキュメント生成（v0.8.0）
musubi-requirements init "ユーザー認証"  # 要件ドキュメント初期化
musubi-requirements add                 # インタラクティブに要件追加
musubi-requirements list                # 全要件リスト表示
musubi-requirements validate            # EARS形式を検証
musubi-requirements trace               # トレーサビリティマトリクス表示

# 設計ドキュメント生成（v0.8.2）
musubi-design init "ユーザー認証"       # 設計ドキュメント初期化
musubi-design add-c4 context            # C4コンテキスト図を追加
musubi-design add-c4 container --format plantuml  # PlantUMLでコンテナ図追加
musubi-design add-adr "JWTトークン使用" # アーキテクチャ決定記録追加
musubi-design validate                  # 設計完全性を検証
musubi-design trace                     # 要件トレーサビリティ表示

# 設計をタスクに分解（v0.8.4）
musubi-tasks init "ユーザー認証"        # タスク分解を初期化
musubi-tasks add "データベーススキーマ"  # インタラクティブにタスク追加
musubi-tasks list                       # 全タスクリスト表示
musubi-tasks list --priority P0         # 重要タスクのみ表示
musubi-tasks update 001 "In Progress"   # タスクステータス更新
musubi-tasks validate                   # タスク完全性を検証
musubi-tasks graph                      # 依存関係グラフ表示
```

### プロジェクトタイプ

初期化時、MUSUBIは**プロジェクトタイプ**の選択を求めます。これにより、利用可能なワークフローと機能が決定されます。

#### Greenfield（0→1）
- **概要**: ゼロから新しいプロジェクトを開始
- **使用例**: 
  - 新規アプリケーション開発
  - 概念実証プロジェクト
  - グリーンフィールドマイクロサービス
- **有効化される機能**:
  - 完全な8段階SDDワークフロー（調査 → モニタリング）
  - `/sdd-steering` - 初期プロジェクトメモリの生成
  - `/sdd-requirements` - ゼロから新規要件を作成
  - `/sdd-design` - アーキテクチャ設計（C4モデル + ADR）
  - `/sdd-tasks` - 要件をタスクに分解
  - `/sdd-implement` - 機能実装（テストファースト）
  - `/sdd-validate` - 憲法準拠チェック
- **メリット**:
  - ベストプラクティスが最初から適用されたクリーンなスタート
  - 初日から憲法ガバナンス
  - 要件からコードまで完全なトレーサビリティ

#### Brownfield（1→n）
- **概要**: 既存のコードベースでの作業
- **使用例**:
  - 既存アプリケーションへの機能追加
  - レガシーコードのリファクタリング
  - システムの移行/モダナイゼーション
- **有効化される機能**:
  - 差分仕様（ADDED/MODIFIED/REMOVED）
  - `/sdd-change-init` - 変更提案の作成
  - `/sdd-change-apply` - 影響分析付き変更適用
  - `/sdd-change-archive` - 完了した変更のアーカイブ
  - `change-impact-analyzer`スキル（Claude Code） - 自動影響検出
  - リバースエンジニアリング: `/sdd-steering`が既存コードを分析
- **メリット**:
  - 影響分析による安全な段階的変更
  - 段階的改善を行いながら既存アーキテクチャを保持
  - 変更内容と理由の完全な監査証跡

#### Both（両方）
- **概要**: 複雑なシナリオ向けハイブリッドアプローチ
- **使用例**:
  - モノリス → マイクロサービス移行（ブラウンフィールド + グリーンフィールドサービス）
  - プラットフォームモダナイゼーション（一部保持、一部再構築）
  - 成熟度が異なるマルチコンポーネントシステム
- **有効化される機能**:
  - すべてのGreenfield + Brownfield機能
  - コンポーネントごとにワークフローを選択する柔軟性
  - 同一プロジェクト内で差分仕様とグリーンフィールド仕様を混在
- **メリット**:
  - 複雑な変革プロジェクトのための最大限の柔軟性
  - すべてのコンポーネント全体で統一されたステアリング/ガバナンス
  - モダナイゼーション全体を単一ツールで実施

**選択例**:
```
? Project type:
❯ Greenfield (0→1)    ← 新規プロジェクト
  Brownfield (1→n)    ← 既存コードベース
  Both                ← 複雑/ハイブリッドシナリオ
```

### インストールされる内容

#### Claude Code（Skills API）

```
your-project/
├── .claude/
│   ├── skills/              # 25 Skills API（Claude Code専用機能）
│   │   ├── orchestrator/
│   │   ├── steering/
│   │   ├── requirements-analyst/
│   │   └── ... (22個以上)
│   ├── commands/            # スラッシュコマンド（/sdd-*）
│   └── CLAUDE.md            # Claude Codeガイド
├── steering/                # プロジェクトメモリ（全エージェント共通）
│   ├── structure.md         # アーキテクチャパターン
│   ├── tech.md              # 技術スタック
│   ├── product.md           # 製品コンテキスト
│   └── rules/
│       ├── constitution.md  # 9つの憲法条項
│       ├── workflow.md      # 8段階SDDワークフロー
│       └── ears-format.md   # EARS構文ガイド
├── templates/               # ドキュメントテンプレート（全エージェント共通）
└── storage/                 # 仕様、変更、機能（全エージェント共通）
```

#### その他のエージェント（GitHub Copilot、Cursor、Geminiなど）

```
your-project/
├── .github/prompts/         # GitHub Copilot用（#sdd-*、Markdown）
│   ├── AGENTS.md             # 25エージェント定義（公式サポート）
│   または
├── .cursor/commands/        # Cursor用（/sdd-*、Markdown）
│   ├── AGENTS.md             # 25エージェント定義（公式サポート）
│   または
├── .gemini/commands/        # Gemini CLI用（/sdd-*、TOML）
│   │   ├── sdd-steering.toml
│   │   ├── sdd-requirements.toml
│   │   └── ... (6つのTOMLファイル)
│   または
├── .codex/prompts/          # Codex CLI用（/prompts:sdd-*、Markdown）
│   ├── AGENTS.md             # 25エージェント定義
│   または
├── .qwen/commands/          # Qwen Code用（/sdd-*、Markdown）
│   ├── AGENTS.md             # 25エージェント定義
│   または
├── .windsurf/workflows/     # Windsurf用（/sdd-*、Markdown）
│   ├── AGENTS.md             # 25エージェント定義
│
├── GEMINI.md（ルート、Gemini用）  # 25エージェントを既存ファイルに統合
├── steering/                # プロジェクトメモリ（全て共通）
├── templates/               # ドキュメントテンプレート（全て共通）
└── storage/                 # 仕様、変更、機能（全て共通）
```

**主な違い**：
- **Claude Code**: 25 Skills API（専用） + コマンド（Markdown）
- **GitHub Copilot & Cursor**: AGENTS.md（公式サポート） + コマンド（Markdown）
- **Gemini CLI**: GEMINI.md統合（25エージェント） + TOMLコマンド（ユニーク）
- **その他**: AGENTS.md（互換） + Markdownコマンド
- **全プラットフォーム**: 同じ25エージェント、異なる実装形式

## 使用方法

### CLIコマンド

MUSUBIはプロジェクト管理のためのいくつかのCLIコマンドを提供します。

```bash
# バージョン表示
musubi --version
musubi -v

# ヘルプ表示
musubi --help

# 包括的な情報表示
musubi info

# プロジェクトステータス確認
musubi status

# 憲法準拠の検証
musubi validate
musubi validate --verbose    # 詳細出力
musubi validate --all        # 全機能を検証

# MUSUBI初期化（対話的）
musubi init
```

#### musubi status

MUSUBIプロジェクトの現在の状態を表示します。

```
📊 MUSUBI Project Status

✅ MUSUBI is initialized

📁 Claude Code Skills: 25 installed
   Location: .claude/skills/

🧭 Steering Context:
   ✅ structure.md (updated: 2025-11-16)
   ✅ tech.md (updated: 2025-11-16)
   ✅ product.md (updated: 2025-11-16)

✅ Constitutional Governance: Enabled

📄 Specifications: 3 documents
   Latest specs:
   - auth-requirements.md
   - auth-design.md
   - auth-tasks.md

💡 Next steps:
   - Review steering files in steering/
   - Create requirements: /sdd-requirements [feature]
   - Validate compliance: musubi validate
```

#### musubi validate

憲法準拠の簡易チェックを実行します。

- **条項I**: ライブラリファースト原則（`lib/`ディレクトリをチェック）
- **条項II**: CLIインターフェース義務（`cli.ts`ファイルをチェック）
- **条項IV**: EARS要件形式（EARSパターンを検証）
- **条項VI**: プロジェクトメモリ（ステアリングファイルをチェック）

包括的な検証には、エージェントの`/sdd-validate`（または同等）コマンドを使用してください。

### エージェント固有のコマンド

#### Claude Code

```bash
# プロジェクトメモリ生成
/sdd-steering

# 要件作成
/sdd-requirements authentication

# アーキテクチャ設計
/sdd-design authentication

# タスク分解
/sdd-tasks authentication

# 機能実装
/sdd-implement authentication

# 憲法準拠検証
/sdd-validate authentication
```

**スキル（自動起動）**: Claude Codeは適切なスキルを自動的に選択します。
- 「コードをレビューして」 → `code-reviewer`スキル
- 「ユーザーログインの要件を作成」 → `requirements-analyst`スキル
- 「決済用のAPIを設計」 → `api-designer`スキル

#### GitHub Copilot

```bash
# カスタムプロンプトには#プレフィックスを使用
#sdd-steering
#sdd-requirements authentication
#sdd-design authentication
#sdd-tasks authentication
#sdd-implement authentication
#sdd-validate authentication
```

#### Gemini CLI

```bash
# コマンドには/プレフィックスを使用（TOML形式）
/sdd-steering
/sdd-requirements authentication
/sdd-design authentication
/sdd-tasks authentication
/sdd-implement authentication
/sdd-validate authentication
```

**注意**: Gemini CLIコマンドはMarkdownではなくTOML形式（`.toml`ファイル）で定義されています。

#### Cursor IDE、Qwen Code、Windsurf

```bash
# コマンドには/プレフィックスを使用（Markdown形式）
/sdd-steering
/sdd-requirements authentication
/sdd-design authentication
/sdd-tasks authentication
/sdd-implement authentication
/sdd-validate authentication
```

#### Codex CLI

```bash
# /prompts:プレフィックスを使用
/prompts:sdd-steering
/prompts:sdd-requirements authentication
/prompts:sdd-design authentication
/prompts:sdd-tasks authentication
/prompts:sdd-implement authentication
/prompts:sdd-validate authentication
```

## 25エージェント概要（全プラットフォーム対応）

**全7プラットフォームで利用可能**：
- **Claude Code**: Skills API（自動起動）
- **GitHub Copilot & Cursor**: AGENTS.md（公式サポート、`@エージェント名`で参照）
- **Gemini、Windsurf、Codex、Qwen**: AGENTS.md（互換形式、自然言語で参照）

### オーケストレーションと管理（3）
- **orchestrator** - マルチスキルワークフローのマスターコーディネーター
- **steering** - プロジェクトメモリマネージャー（自動更新コンテキスト）
- **constitution-enforcer** - ガバナンス検証（9条項 + フェーズ-1ゲート）

### 要件と計画（3）
- **requirements-analyst** - EARS形式要件生成
- **project-manager** - プロジェクト計画、スケジューリング、リスク管理
- **change-impact-analyzer** - ブラウンフィールド変更分析

### アーキテクチャと設計（4）
- **system-architect** - C4モデル + ADRアーキテクチャ設計
- **api-designer** - REST/GraphQL/gRPC API設計
- **database-schema-designer** - データベース設計、ER図、DDL
- **ui-ux-designer** - UI/UX設計、ワイヤーフレーム、プロトタイプ

### 開発（1）
- **software-developer** - 多言語コード実装

### 品質とレビュー（5）
- **test-engineer** - EARSマッピングを使用したユニット、統合、E2Eテスト
- **code-reviewer** - コードレビュー、SOLID原則
- **bug-hunter** - バグ調査、根本原因分析
- **quality-assurance** - QA戦略、テスト計画
- **traceability-auditor** - 要件 ↔ コード ↔ テストカバレッジ検証

### セキュリティとパフォーマンス（2）
- **security-auditor** - OWASP Top 10、脆弱性検出
- **performance-optimizer** - パフォーマンス分析、最適化

### インフラと運用（5）
- **devops-engineer** - CI/CDパイプライン、Docker/Kubernetes
- **cloud-architect** - AWS/Azure/GCP、IaC（Terraform/Bicep）
- **database-administrator** - データベース運用、チューニング
- **site-reliability-engineer** - 本番監視、SLO/SLI、インシデント対応
- **release-coordinator** - マルチコンポーネントリリース管理

### ドキュメントと専門（2）
- **technical-writer** - 技術ドキュメント、APIドキュメント
- **ai-ml-engineer** - MLモデル開発、MLOps

## 憲法ガバナンス

MUSUBIは9つの不変の憲法条項を施行します。

1. **ライブラリファースト原則** - 機能はライブラリとして開始
2. **CLIインターフェース義務** - すべてのライブラリがCLIを公開
3. **テストファースト命令** - コードの前にテスト（レッド・グリーン・ブルー）
4. **EARS要件形式** - 明確な要件
5. **トレーサビリティ義務** - 100%カバレッジ必須
6. **プロジェクトメモリ** - すべてのスキルが最初にステアリングをチェック
7. **シンプリシティゲート** - 初期は最大3プロジェクト
8. **アンチアブストラクションゲート** - フレームワーク機能を直接使用
9. **インテグレーションファーストテスティング** - モックよりも実サービス

## SDDワークフロー（8段階）

```
1. 調査 → 2. 要件 → 3. 設計 → 4. タスク →
5. 実装 → 6. テスト → 7. デプロイ → 8. モニタリング
```

各段階には以下が含まれます。
- 専用スキル
- 品質ゲート
- トレーサビリティ要件
- 憲法検証

## EARS要件形式

```markdown
### 要件: ユーザーログイン

WHEN ユーザーが有効な認証情報を提供する場合、
THEN システムSHALLユーザーを認証する
AND システムSHALLセッションを作成する。

#### シナリオ: ログイン成功
- WHEN ユーザーが正しいメールアドレスとパスワードを入力する
- THEN システムSHALL認証情報を検証する
- AND システムSHALLダッシュボードにリダイレクトする
```

## バイリンガルドキュメント

**すべてのエージェント生成ドキュメントは英語と日本語の両方で作成されます。**

### 言語ポリシー

- **英語**: 参照/ソースドキュメント（`.md`）
- **日本語**: 翻訳（`.ja.md`）
- **スキル**: 作業には常に英語版を参照
- **コード参照**: 要件ID、技術用語は英語のまま

### バイリンガルで生成されるファイル

**ステアリングコンテキスト**：
- `steering/structure.md` + `steering/structure.ja.md`
- `steering/tech.md` + `steering/tech.ja.md`
- `steering/product.md` + `steering/product.ja.md`

**仕様**：
- `storage/specs/auth-requirements.md` + `storage/specs/auth-requirements.ja.md`
- `storage/specs/auth-design.md` + `storage/specs/auth-design.ja.md`
- `storage/specs/auth-tasks.md` + `storage/specs/auth-tasks.ja.md`

### 生成順序

1. **英語版を最初に生成**（参照/ソース）
2. **日本語版を次に生成**（翻訳）
3. 技術用語（REQ-XXX-NNN、EARSキーワード、APIエンドポイント）は英語のまま
4. 両方のバージョンを同期して維持

## 差分仕様（ブラウンフィールド）

```markdown
## 追加された要件
### REQ-NEW-001: 二要素認証
...

## 変更された要件
### REQ-001: ユーザー認証
**以前**: メール + パスワード
**更新後**: メール + パスワード + OTP
...

## 削除された要件
### REQ-OLD-005: ログイン状態を記憶
**理由**: セキュリティポリシーの変更
```

## 使用例

### グリーンフィールドプロジェクト（0→1）

```bash
# 1. 初期化
npx musubi-sdd init

# 2. ステアリング生成
/sdd-steering

# 3. 要件作成
/sdd-requirements user-authentication

# 4. アーキテクチャ設計
/sdd-design user-authentication

# 5. タスクに分解
/sdd-tasks user-authentication

# 6. 実装
/sdd-implement user-authentication
```

### ブラウンフィールドプロジェクト（1→n）

```bash
# 1. 既存コードベースで初期化
npx musubi-sdd init

# 2. 既存コードからステアリングを生成
/sdd-steering

# 3. 変更提案を作成
/sdd-change-init add-2fa

# 4. 影響分析（change-impact-analyzerスキル経由で自動）

# 5. 変更を実装
/sdd-change-apply add-2fa

# 6. 変更をアーカイブ
/sdd-change-archive add-2fa
```

## 設定

### MCPサーバー統合

MUSUBIは機能強化のためにMCPサーバーと統合します。

- **Context7 MCP** - 最新のライブラリドキュメント（Next.js、Reactなど）
- **Azure MCP** - Azureリソース管理
- **Microsoft Learn MCP** - Microsoftドキュメント

スキルは必要に応じて利用可能なMCPサーバーを自動的に使用します。

### カスタマイズ

プロジェクトに合わせてステアリングファイルを編集：

```bash
# アーキテクチャパターン
steering/structure.md

# 技術スタック
steering/tech.md

# 製品コンテキスト
steering/product.md

# 憲法ルール（必要に応じて）
steering/rules/constitution.md
```

## 開発

```bash
# リポジトリをクローン
git clone https://github.com/your-org/musubi.git
cd musubi

# 依存関係をインストール
npm install

# テスト実行
npm test

# ローカル開発用にリンク
npm link
musubi init
```

## 貢献

貢献を歓迎します！ガイドラインについては[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

## ライセンス

MITライセンス - 詳細は[LICENSE](LICENSE)を参照してください。

## クレジット

MUSUBIは以下のフレームワークから機能を統合しています。
- **musuhi** - 20エージェントシステム、ステアリング、EARS形式
- **OpenSpec** - 差分仕様、ブラウンフィールド対応
- **ag2**（AutoGen） - マルチエージェントオーケストレーション
- **ai-dev-tasks** - シンプリシティ、段階的な複雑性
- **cc-sdd** - Pラベル並列化、検証ゲート
- **spec-kit** - 憲法ガバナンス、テストファースト

## 詳細情報

- [ドキュメント](https://musubi-sdd.dev)
- [ブループリント](Ultimate-SDD-Tool-Blueprint-v3-25-Skills.md)
- [プロジェクト計画](PROJECT-PLAN-MUSUBI.md)
- [フレームワーク比較](SDD-Framework-Comparison-Report.md)

---

**MUSUBI** - むすび - 仕様、設計、コードを結びつける。
