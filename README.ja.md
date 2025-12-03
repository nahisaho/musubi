# MUSUBI

> 7つのAIコーディングエージェント向け究極の仕様駆動開発ツール + MCP統合

MUSUBIは、6つの主要フレームワークのベスト機能を統合した包括的なSDD（仕様駆動開発）フレームワークであり、複数のAIコーディングエージェントに対応した本番環境対応ツールです。

## 🚀 v2.0.0 の新機能

- 🔌 **CodeGraphMCPServer統合** - 14のMCPツールによる高度なコード分析
- 🧠 **GraphRAG駆動検索** - Louvainコミュニティ検出によるセマンティックコード理解
- 🔍 **11エージェント強化** - 主要エージェントがMCPツールを活用して深いコード分析を実現
- 📊 **依存関係分析** - `find_dependencies`, `find_callers`, `analyze_module_structure`
- 🎯 **スマートコードナビゲーション** - `local_search`, `global_search`, `query_codebase`

## 特徴

- 🤖 **マルチエージェント対応** - 7つのAIコーディングエージェントに対応（Claude Code、GitHub Copilot、Cursor、Gemini CLI、Codex CLI、Qwen Code、Windsurf）
- 🔌 **MCPサーバー統合** - 高度なコード分析のためのCodeGraphMCPServer（v2.0.0で追加）
- 📄 **柔軟なコマンド形式** - Markdown、TOML、AGENTS.md形式に対応
- 🎯 **25の専門エージェント（全プラットフォーム対応）** - オーケストレーター、ステアリング、要件、アーキテクチャ、開発、品質、セキュリティ、インフラ
  - Claude Code: Skills API（25スキル）
  - GitHub Copilot & Cursor: AGENTS.md（公式サポート）
  - その他4エージェント: AGENTS.md（互換形式）
- 📋 **憲法ガバナンス** - 9つの不変条項 + フェーズ-1ゲートによる品質保証
- 📝 **EARS要件ジェネレーター** - 5つのEARSパターンで明確な要件を作成（v0.8.0）
- 🏗️ **設計ドキュメントジェネレーター** - トレーサビリティ付きC4モデルとADRを作成（v0.8.2）
- 🔄 **変更管理システム** - ブラウンフィールドプロジェクト向け差分仕様（v0.8.6）
- 🔍 **ギャップ検出システム** - 孤立した要件とテストされていないコードを特定（v0.8.7）
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

---

## 憲法ガバナンス

MUSUBIは品質保証のために9つの憲法条項を強制します:

```bash
# 憲法準拠性の検証
musubi-validate all
musubi-validate constitution
musubi-validate gates
musubi-validate complexity
```

**9つの条項**:

1. **Library-Firstの原則** - すべての機能は独立したライブラリとして開始
2. **CLIインターフェース義務** - すべてのライブラリがCLI機能を公開
3. **Test-Firstの要請** - コードの前にテストを記述（80%カバレッジ必須）
4. **EARS要件フォーマット** - 曖昧さのない要件のための5つのEARSパターン
5. **トレーサビリティ義務** - 100%のトレーサビリティ: 要件 ↔ 設計 ↔ コード ↔ テスト
6. **プロジェクトメモリ** - Steeringシステムがプロジェクトコンテキストを維持
7. **シンプリシティゲート** - 初期は最大3サブプロジェクト（フェーズ-1ゲート）
8. **抽象化防止ゲート** - フレームワークAPIを直接使用（フェーズ-1ゲート）
9. **統合ファーストテスト** - 統合テストは実サービスを使用（モック禁止）

**フェーズ-1ゲート**: 条項VII & VIIIの実装前検証チェックポイント。詳細:

- [steering/rules/constitution.md](steering/rules/constitution.md) - 完全な憲法テキスト
- [steering/rules/phase-gates.md](steering/rules/phase-gates.md) - 承認プロセスとアクティブゲート

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

# エンドツーエンドトレーサビリティ（v0.8.5）
musubi-trace matrix                             # トレーサビリティマトリクス生成
musubi-trace matrix --format markdown > trace.md # Markdownにエクスポート
musubi-trace coverage                           # カバレッジ統計計算
musubi-trace coverage --min-coverage 100        # 100%カバレッジ要求
musubi-trace gaps                               # 孤立した要件/コード検出
musubi-trace requirement REQ-AUTH-001           # 特定要件をトレース
musubi-trace validate                           # 100%トレーサビリティ検証（第5条）
musubi-trace bidirectional                      # 双方向トレーサビリティ分析（v0.9.4）
musubi-trace impact REQ-AUTH-001                # 要件変更の影響分析（v0.9.4）
musubi-trace statistics                         # 包括的プロジェクト統計（v0.9.4）

# ブラウンフィールドプロジェクト向け変更管理（v0.8.6）
musubi-change init CHANGE-001 --title "認証機能追加"  # 変更提案を作成
musubi-change validate CHANGE-001 --verbose     # 差分仕様を検証
musubi-change apply CHANGE-001 --dry-run        # 変更をプレビュー
musubi-change apply CHANGE-001                  # コードベースに変更を適用
musubi-change archive CHANGE-001                # specs/にアーカイブ
musubi-change list --status pending             # 保留中の変更をリスト
musubi-change list --format json                # JSON形式でリスト

# ギャップ検出とカバレッジ検証（v0.8.7）
musubi-gaps detect                              # 全ギャップを検出
musubi-gaps detect --verbose                    # 詳細なギャップ情報を表示
musubi-gaps requirements                        # 孤立した要件を検出
musubi-gaps code                                # テストされていないコードを検出
musubi-gaps coverage                            # カバレッジ統計を計算
musubi-gaps coverage --min-coverage 100         # 100%カバレッジを要求
musubi-gaps detect --format markdown > gaps.md  # ギャップレポートをエクスポート
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

```text
? Project type:
❯ Greenfield (0→1)    ← 新規プロジェクト
  Brownfield (1→n)    ← 既存コードベース
  Both                ← 複雑/ハイブリッドシナリオ
```

## ドキュメント

包括的なガイドは `docs/guides/` で利用可能です:

- **[ブラウンフィールドチュートリアル](docs/guides/brownfield-tutorial.md)** - 既存プロジェクトでの変更管理ステップバイステップガイド
- **[差分仕様ガイド](docs/guides/delta-spec-guide.md)** - 変更追跡のフォーマットリファレンス
- **[変更管理ワークフロー](docs/guides/change-management-workflow.md)** - エンドツーエンドワークフロードキュメント
- **[トレーサビリティマトリクスガイド](docs/guides/traceability-matrix-guide.md)** - トレーサビリティシステム使用方法
- **[ビデオチュートリアル計画](docs/guides/video-tutorial-plan.md)** - ビデオコンテンツスクリプト

### インストールされる内容

#### Claude Code（Skills API）

```text
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

```text
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

```text
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

## 9条憲法ガバナンス

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

```text
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

MUSUBI v2.0.0は高度なコード分析のために**CodeGraphMCPServer**と統合します。

#### オプション1: Claude Code（ターミナル）

```bash
# CodeGraph MCPをグローバルインストール
pip install codegraph-mcp-server

# Claude Codeに追加
claude mcp add codegraph -- codegraph-mcp serve --repo .

# インストールを確認
claude mcp list
```

#### オプション2: VS Code + Claude拡張機能

1. **前提条件をインストール**:

   ```bash
   pip install codegraph-mcp-server
   ```

2. **VS Codeを設定** (`settings.json`):

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

3. **または Claude Desktop設定を使用** (`~/.claude/claude_desktop_config.json` macOS/Linux、`%APPDATA%\Claude\claude_desktop_config.json` Windows):

   ```json
   {
     "mcpServers": {
       "codegraph": {
         "command": "codegraph-mcp",
         "args": ["serve", "--repo", "/path/to/your/project"]
       }
     }
   }
   ```

#### オプション3: npx（インストール不要）

```bash
# npx経由で追加（グローバルインストール不要）
claude mcp add codegraph -- npx -y @anthropic/codegraph-mcp --codebase .
```

#### MCPサーバーの動作確認

セットアップ後、Claudeでテスト：

```text
init_graphツールを使ってこのコードベースを分析してください
```

成功すると、コードグラフ初期化の出力が表示されます。

**利用可能なMCPツール（14ツール）**:

| カテゴリ | ツール | 説明 |
|----------|-------|-------------|
| コードグラフ | `init_graph`, `get_code_snippet`, `find_callers`, `find_dependencies` | コードグラフの構築とクエリ |
| 検索 | `local_search`, `global_search`, `query_codebase` | GraphRAG駆動セマンティック検索 |
| 分析 | `analyze_module_structure`, `suggest_refactoring` | コード構造分析 |
| ナビゲーション | `jump_to_definition`, `find_implementations` | コードナビゲーション |

**エージェント × MCPツールマッピング**:

| エージェント | 主要MCPツール | 用途 |
|-------|-------------------|----------|
| @change-impact-analyzer | `find_dependencies`, `find_callers` | 影響分析 |
| @traceability-auditor | `query_codebase`, `find_callers` | トレーサビリティ検証 |
| @system-architect | `analyze_module_structure`, `global_search` | アーキテクチャ分析 |
| @code-reviewer | `suggest_refactoring`, `get_code_snippet` | コード品質レビュー |
| @security-auditor | `find_callers`, `query_codebase` | セキュリティ脆弱性検出 |

その他のMCPサーバーとも統合：

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
