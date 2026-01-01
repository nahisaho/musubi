# Ultimate SDD Tool "MUSUBI" - 7つのAIエージェント対応、25スキル搭載の究極仕様駆動開発ツール

> **MUSUBI v2.1.1** - 仕様、設計、コードを結びつける包括的SDDフレームワーク
>
> 🆕 v2.0新機能: [CodeGraph MCP統合](https://qiita.com/hisaho/items/719210ccc20fe2514054)でプロジェクト全体のコード理解力を獲得！

## はじめに

ソフトウェア開発における最大の課題の一つは、**要件から実装、テスト、デプロイまでの一貫性を保つこと**です。AIコーディングアシスタントの登場により開発速度は向上しましたが、仕様の曖昧さやトレーサビリティの欠如により、品質問題が頻発しています。

この記事では、Specification Driven Development（仕様駆動開発）を徹底的に支援する究極のツール **MUSUBI** を紹介します。MUSUBIは、spec-copilot（19エージェント）から始まり、MUSUHI（20エージェント）を経て、**7つのAIコーディングエージェント対応、25の専門スキルを搭載した最終形態**へと進化しました。

**v2.0の革新**: CodeGraph MCP Serverとの統合により、AIエージェントが「ファイル単位の支援」から「プロジェクト全体を理解した支援」へと進化しました。

## MUSUBIとは？

**MUSUBI**（むすび - "結び"）は、仕様、設計、コードを結びつける包括的なSDD（Specification Driven Development）フレームワークです。

### 主な特徴


- 🤖 **マルチエージェント対応**
   - Claude Code、GitHub Copilot、Cursor、Gemini CLI、Codex CLI、Qwen Code、Windsurf
   - 7つの主要AIエージェントで動作
- 🎯 **25の専門エージェント（全プラットフォーム対応）**
   - オーケストレーション、要件、アーキテクチャ、開発、品質、セキュリティ、インフラ
   - Claude Code: Skills API、他6エージェント: AGENTS.md
   - 完全なSDDワークフローカバレッジ
- 📄 **柔軟なコマンド形式**
   - Markdown形式（6エージェント）
   - TOML形式（Gemini CLI専用）
   - AGENTS.md形式（OpenAI仕様準拠）
- 📋 **憲法ガバナンス**
   - 9つの不変条項
   - フェーズ-1ゲートによる品質保証
- 📝 **EARS要件形式**
   - 曖昧さのない、テスト可能な要件
   - 完全なトレーサビリティ
- 🧭 **自動更新プロジェクトメモリ**
   - ステアリングシステムが自動更新
   - アーキテクチャ、技術スタック、製品コンテキストを維持


## 進化の歴史: spec-copilot → MUSUHI → MUSUBI

### 第1世代： spec-copilot(19エージェント)

**spec-copilot**（"specification driven development を支援する copilot" - 仕様駆動開発を支援するAIペアプログラマーという意味）は、GitHub Copilot向けの19種類の専門AIエージェント群として誕生しました。

**特徴**：
- ✅ 専門特化型エージェント（19種類）
- ✅ 構造化された対話フロー（1問1答形式）
- ✅ 実践的なコード例とベストプラクティス
- ✅ ファイル出力対応
- ❌ **単一エージェント対応**（GitHub Copilotのみ）
- ❌ **プロジェクトメモリなし**
- ❌ **要件形式の標準化なし**

### 第2世代： MUSUHI（20エージェント）

**MUSUHI**（"むすひ（産霊）" - 日本の古語や神道の概念で、**「結び」「生み出す力」** を意味する。仕様から実装を生み出す力を表現）は、spec-copilotを拡張し、マルチエージェント対応とプロジェクトメモリシステムを導入しました。

**追加機能**：
- ✅ **マルチプラットフォーム対応**（Claude Code、GitHub Copilot、Cursor、Windsurf、Gemini、Codex、Qwen）
- ✅ **プロジェクトメモリ（Steeringシステム）**
  - `steering/structure.md` - アーキテクチャパターン
  - `steering/tech.md` - 技術スタック
  - `steering/product.md` - ビジネスコンテキスト
- ✅ **EARS要件形式のサポート**
- ✅ **自動コンテキスト認識**（全エージェントが自動的にステアリングを参照）
- ✅ **バイリンガルドキュメント**（英語・日本語）
- ❌ **Claude Code専用機能なし**
- ❌ **憲法ガバナンスなし**

### 第3世代： MUSUBI（25スキル + 完全SDD対応）

**MUSUBI**（"むすび（結び）" - 仕様、設計、コードを結びつけるという本質的な役割を表現）は、MUSUHIをベースに、6つの主要SDDフレームワークの機能を統合した究極形態です。

**革新的機能**：
- ✅ **25の専門エージェント（全7プラットフォーム対応）**
  - Claude Code: Skills API（25スキル）
  - GitHub Copilot & Cursor: AGENTS.md（公式サポート）
  - その他4エージェント: AGENTS.md（互換形式）
- ✅ **憲法ガバナンス**（9つの不変条項）
- ✅ **フェーズ-1ゲート**（品質保証の事前チェック）
- ✅ **差分仕様（Delta Specs）**（ブラウンフィールド対応）
- ✅ **完全トレーサビリティ**（要件 → 設計 → コード → テスト）
- ✅ **8段階SDDワークフロー**（調査 → モニタリングまで）
- ✅ **自動ステアリング更新**（エージェント作業後に自動更新）

## MUSUBIが統合した6つのSDDフレームワーク

MUSUBIは、以下の6つの主要フレームワークのベスト機能を統合しています。

### 1. **musuhi** - ステアリングシステム、EARS形式

- 📌 **採用機能**: 20エージェントシステム、プロジェクトメモリ（Steering）、EARS要件形式
- 🎯 **MUSUBIでの強化**: 25スキルに拡張、自動ステアリング更新

### 2. **OpenSpec** - 差分仕様、ブラウンフィールド対応

- 📌 **採用機能**: Delta Specs（ADDED/MODIFIED/REMOVED）、変更影響分析
- 🎯 **MUSUBIでの強化**: change-impact-analyzerスキル、トレーサビリティマトリックス

### 3. **ag2 (AutoGen)** - マルチエージェントオーケストレーション

- 📌 **採用機能**: 複数エージェント連携、タスク分解、依存関係管理
- 🎯 **MUSUBIでの強化**: Orchestratorスキル、25スキル間の自動連携

### 4. **ai-dev-tasks** - シンプリシティ、段階的複雑性

- 📌 **採用機能**: 最小3プロジェクトルール、段階的な機能追加
- 🎯 **MUSUBIでの強化**: 憲法条項VII（シンプリシティゲート）

### 5. **cc-sdd** - マルチエージェント対応、検証ゲート

- 📌 **採用機能**: エージェントレジストリ、動的CLIフラグ生成、検証フレームワーク
- 🎯 **MUSUBIでの強化**: 7エージェント対応、憲法バリデーション

### 6. **spec-kit** - 憲法ガバナンス、テストファースト

- 📌 **採用機能**: 憲法条項、フェーズ-1ゲート、テストファースト命令
- 🎯 **MUSUBIでの強化**: 9つの完全憲法条項、constitution-enforcerスキル

## MUSUBIの9つの憲法条項

MUSUBIは、品質を保証するための**9つの不変憲法条項**を施行します。

### Article I: ライブラリファースト原則

```
すべての機能は lib/ ディレクトリのライブラリとして開始する。
フレームワーク非依存のコアロジックを強制。
```

**検証**:
- ✅ `lib/{{feature-name}}/` にコア実装が存在
- ✅ フレームワーク依存なし（`grep -r "from 'next"` で検証）
- ✅ クリーンな公開API

### Article II: CLIインターフェース義務

```
すべてのライブラリは lib/{{feature}}/cli.ts を公開する。
コマンドラインからの実行を強制。
```

**検証**:
- ✅ `lib/{{feature}}/cli.ts` が存在
- ✅ 主要機能がCLI経由で実行可能
- ✅ ヘルプテキスト完備

### Article III: テストファースト命令

```
コードの前にテストを書く（RED-GREEN-BLUE）。
80%以上のカバレッジ必須。
```

**検証**:
- ✅ すべてのモジュールにテストファイルが存在
- ✅ カバレッジ >= 80%
- ✅ RED-GREEN-BLUEパターン遵守（git履歴で確認）

### Article IV: EARS要件形式

```
すべての要件はEARSパターンを使用する。
曖昧性を排除し、テスト可能な要件を強制。
```

**EARSパターン**:
```markdown
WHEN ユーザーが有効な認証情報を提供する場合、
THEN システムSHALLユーザーを認証する
AND システムSHALLセッションを作成する。
```

**検証**:
- ✅ 全要件がEARSキーワード（WHEN、SHALL、IF、THEN）を使用
- ✅ 曖昧性なし
- ✅ 各要件がテスト可能

### Article V: トレーサビリティ義務

```
要件 → 設計 → コード → テストの100%トレーサビリティ必須。
すべての要件が実装とテストに追跡可能。
```

**トレーサビリティマトリックス例**:
| 要件ID | 設計 | 実装 | テスト | ステータス |
|--------|------|------|--------|-----------|
| REQ-AUTH-001 | Section 7 | AuthService.register() | auth-service.test.ts:L25 | ✅ |
| REQ-AUTH-002 | Section 7 | PasswordValidator.validate() | password-validator.test.ts:L15 | ✅ |

### Article VI: プロジェクトメモリ

```
すべてのスキルは意思決定前にステアリングを参照する。
一貫性のあるアーキテクチャと技術スタックを強制。
```

**ステアリングファイル**:
- `steering/structure.md` - アーキテクチャパターン
- `steering/tech.md` - 技術スタック
- `steering/product.md` - ビジネスコンテキスト

### Article VII: シンプリシティゲート

```
初期は最大3つのライブラリまで。
段階的な複雑性の追加を強制。
```

### Article VIII: アンチアブストラクションゲート

```
フレームワーク機能を直接使用する。
不要なラッパーやアダプターを禁止。
```

**禁止例**:
- ❌ カスタムORM Wrapper（Prismaを直接使用）
- ❌ カスタムReact Wrapper
- ❌ カスタムNext.js Wrapper

### Article IX: インテグレーションファーストテスティング

```
実サービスを使用したテスト。
モックの最小化を強制。
```

**検証**:
- ✅ テスト用データベース使用（実PostgreSQL）
- ✅ モック数最小限
- ✅ 統合テスト存在

## 全プラットフォーム対応：25の専門エージェント

MUSUBIの最大の特徴は、**7つのAIコーディングエージェント全てで利用できる25の専門エージェント**です。

### 実装形式

- **Claude Code**: Skills API（モデルが自動起動）
- **GitHub Copilot**: `.github/AGENTS.md`（公式サポート）
- **Cursor**: `.cursor/AGENTS.md`（公式サポート）
- **Gemini CLI**: `GEMINI.md`（既存ファイルに統合）
- **Windsurf**: `.windsurf/AGENTS.md`
- **Codex**: `.codex/AGENTS.md`
- **Qwen Code**: `.qwen/AGENTS.md`

### 25エージェント一覧

### オーケストレーションと管理（3スキル）

1. **orchestrator** - 25スキル間のマスターコーディネーター
2. **steering** - プロジェクトメモリマネージャー（自動更新）
3. **constitution-enforcer** - 憲法ガバナンス検証（9条項 + フェーズ-1ゲート）

### 要件と計画（3スキル）

4. **requirements-analyst** - EARS形式要件生成
5. **project-manager** - プロジェクト計画、スケジューリング、リスク管理
6. **change-impact-analyzer** - ブラウンフィールド変更分析（Delta Specs）

### アーキテクチャと設計（4スキル）

7. **system-architect** - C4モデル + ADRアーキテクチャ設計
8. **api-designer** - REST/GraphQL/gRPC API設計
9. **database-schema-designer** - データベース設計、ER図、DDL
10. **ui-ux-designer** - UI/UX設計、ワイヤーフレーム、プロトタイプ

### 開発（1スキル）

11. **software-developer** - 多言語コード実装（TypeScript、Python、Goなど）

### 品質とレビュー（5スキル）

12. **test-engineer** - ユニット、統合、E2EテストとEARSマッピング
13. **code-reviewer** - コードレビュー、SOLID原則
14. **bug-hunter** - バグ調査、根本原因分析
15. **quality-assurance** - QA戦略、テスト計画
16. **traceability-auditor** - 要件 ↔ コード ↔ テストカバレッジ検証

### セキュリティとパフォーマンス（2スキル）

17. **security-auditor** - OWASP Top 10、脆弱性検出
18. **performance-optimizer** - パフォーマンス分析、最適化

### インフラと運用（5スキル）

19. **devops-engineer** - CI/CDパイプライン、Docker/Kubernetes
20. **cloud-architect** - AWS/Azure/GCP、IaC（Terraform/Bicep）
21. **database-administrator** - データベース運用、チューニング
22. **site-reliability-engineer** - 本番監視、SLO/SLI、インシデント対応
23. **release-coordinator** - マルチコンポーネントリリース管理

### ドキュメントと専門（2スキル）

24. **technical-writer** - 技術ドキュメント、APIドキュメント
25. **ai-ml-engineer** - MLモデル開発、MLOps

## 8段階SDDワークフロー

MUSUBIは、完全な8段階ワークフローをサポートします。

```
1. Research（調査）
   ↓
2. Requirements（要件）- EARS形式
   ↓
3. Design（設計）- C4モデル + ADR
   ↓
4. Tasks（タスク）- 要件カバレッジマトリックス
   ↓
5. Implementation（実装）- RED-GREEN-BLUE
   ↓
6. Testing（テスト）- 統合テスト優先
   ↓
7. Deployment（デプロイ）- CI/CD自動化
   ↓
8. Monitoring（モニタリング）- SLO/SLI、可観測性
```

各段階には：
- ✅ 専用スキル
- ✅ 品質ゲート
- ✅ トレーサビリティ要件
- ✅ 憲法検証

## 実際の使用例

### プロジェクトタイプとは？

MUSUBIは2つの異なるプロジェクトタイプに対応しています。

#### グリーンフィールドプロジェクト（0→1）

**何もない状態から新規プロジェクトを立ち上げる**シナリオです。

- **0→1の意味**: ゼロ（何もない）から1（最初のプロダクト）を作る
- **特徴**:
  - 既存コードベースなし
  - 自由なアーキテクチャ設計が可能
  - 技術スタックを自由に選択できる
  - レガシーコードの制約がない
- **例**: 新規スタートアップのMVP開発、新サービスの立ち上げ、POC（概念実証）プロジェクト

#### ブラウンフィールドプロジェクト（1→n）

**既存のプロジェクトに新機能を追加したり、改修する**シナリオです。

- **1→nの意味**: 1（既存プロダクト）からn（改善・拡張版）へ進化させる
- **特徴**:
  - 既存コードベースあり
  - レガシーコードへの配慮が必要
  - 既存アーキテクチャの制約あり
  - 変更影響分析が重要
  - 段階的な移行が必要
- **例**: 既存サービスへの新機能追加、リファクタリング、技術的負債の解消、セキュリティ強化

MUSUBIは両方のシナリオで**完全なSDDワークフロー**を提供します。特にブラウンフィールドでは、OpenSpecから採用した **Delta Specs（差分仕様）** により、変更影響を最小限に抑えながら安全に進化させることができます。

---

### グリーンフィールドプロジェクト（0→1）の使用例

```bash
# 1. 初期化（任意のエージェント向け）
npx musubi-sdd init --claude      # Claude Code (Skills API)
npx musubi-sdd init --copilot     # GitHub Copilot (AGENTS.md)
npx musubi-sdd init --cursor      # Cursor (AGENTS.md)
# その他: --gemini, --windsurf, --codex, --qwen

# 2. プロジェクトメモリ生成
# Claude Code: /sdd-steering
# GitHub Copilot/Cursor: @steering または自然言語で参照

# 3. 要件作成（EARS形式）
# Claude Code: /sdd-requirements user-authentication
# その他: @requirements-analyst を参照して対話

# 4. アーキテクチャ設計
# Claude Code: /sdd-design user-authentication
# その他: @system-architect を参照して対話

# 5-7. 以下同様にエージェントを活用
```

### ブラウンフィールドプロジェクト（1→n）

```bash
# 1. 既存コードベースで初期化
npx musubi-sdd init --claude

# 2. 既存コードからステアリング生成
/sdd-steering

# 3. 変更提案作成（Delta Specs）
/sdd-change-init add-2fa

# 4. 影響分析（change-impact-analyzerスキル自動起動）
# → ADDED/MODIFIED/REMOVED要件を自動検出

# 5. 変更実装
/sdd-change-apply add-2fa

# 6. 変更アーカイブ
/sdd-change-archive add-2fa
```

## 他のSDDツールとの比較

### 機能比較表

| 機能 | spec-copilot | MUSUHI | MUSUBI | cc-sdd | OpenSpec | spec-kit |
|------|--------------|--------|--------|--------|----------|----------|
| **エージェント数** | 19 | 20 | **25エージェント** | 10 | 5 | 8 |
| **マルチプラットフォーム** | ❌（Copilotのみ） | ✅（7エージェント） | ✅（**7エージェント**） | ✅（5エージェント） | ❌ | ❌ |
| **25エージェント全対応** | ❌ | ❌ | ✅（**全7プラットフォーム**） | ❌ | ❌ | ❌ |
| **プロジェクトメモリ** | ❌ | ✅ | ✅（**自動更新**） | ❌ | ❌ | ❌ |
| **EARS要件形式** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **憲法ガバナンス** | ❌ | ❌ | ✅（**9条項**） | ❌ | ❌ | ✅（基本） |
| **Delta Specs** | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **トレーサビリティ** | 手動 | 自動参照 | **自動監査** | 手動 | 手動 | 手動 |
| **SDDワークフロー** | 6段階 | 8段階 | **8段階（完全）** | 4段階 | 3段階 | 5段階 |
| **Skills API対応** | ❌ | ❌ | ✅（**Claude Code**） | ❌ | ❌ | ❌ |
| **AGENTS.md対応** | ❌ | ❌ | ✅（**6エージェント**） | ❌ | ❌ | ❌ |
| **バイリンガル** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### MUSUBIの優位性

#### 1. **最も包括的なエージェントセット（25エージェント × 7プラットフォーム）**

- ✅ spec-copilot（19）、MUSUHI（20）を超える最大エージェント数
- ✅ **全7プラットフォームで25エージェント利用可能**（業界初）
- ✅ SDD全ステージ（調査→モニタリング）を100%カバー
- ✅ Claude Code Skills API + AGENTS.md（OpenAI仕様準拠）のハイブリッド対応

#### 2. **唯一の完全憲法ガバナンス**

- ✅ 9つの不変条項（spec-kitは3条項のみ）
- ✅ constitution-enforcerスキルによる自動検証
- ✅ フェーズ-1ゲート（実装前の品質チェック）

#### 3. **最も強力なトレーサビリティ**

- ✅ traceability-auditorスキルによる独立検証
- ✅ 要件 ↔ 設計 ↔ コード ↔ テストの100%追跡
- ✅ OpenSpecのDelta Specs統合

#### 4. **最広範なマルチプラットフォーム対応**

- ✅ 7つのAIエージェント対応（最多）
- ✅ Gemini CLI専用TOML形式サポート
- ✅ エージェントレジストリパターン（cc-sddから採用）

#### 5. **自動更新プロジェクトメモリ**

- ✅ MUSUHIのステアリングシステムを拡張
- ✅ スキル実行後に自動更新
- ✅ 常に最新のプロジェクトコンテキスト維持

#### 6. **ブラウンフィールド完全対応**

- ✅ change-impact-analyzerスキル（OpenSpecの機能統合）
- ✅ ADDED/MODIFIED/REMOVED自動検出
- ✅ 既存プロジェクトへのシームレスな導入

## 🚀 v2.0新機能: CodeGraph MCP統合

MUSUBI v2.0では、[CodeGraph MCP Server](https://qiita.com/hisaho/items/b99ac51d78119ef60b6b)との統合により、AIエージェントが「プロジェクト全体のコード構造」を理解できるようになりました。

### 従来の課題 → v2.0で解決

| 課題 | Before (v1.x) | After (v2.0 + CodeGraph) |
|------|---------------|--------------------------|
| コードベース理解 | ファイル単位 | プロジェクト全体のグラフ構造 |
| 関数の影響調査 | 手動grep（見落としリスク） | `find_callers`で完全リスト |
| リファクタリング計画 | 経験と勘に依存 | `analyze_module_structure`で客観的分析 |
| 依存関係の把握 | import文を目視 | `find_dependencies`で深い依存も検出 |
| セキュリティ調査 | パターンマッチのみ | 入力経路の完全追跡 |

### CodeGraph MCPの主な機能

```
# コードグラフ操作
init_graph          - グラフ初期化
find_callers        - 呼び出し元追跡
find_callees        - 呼び出し先追跡
find_dependencies   - 依存関係分析

# 検索機能
local_search        - ローカルコンテキスト検索
global_search       - グローバル検索
query_codebase      - 自然言語クエリ

# 分析機能
analyze_module_structure  - モジュール構造分析
suggest_refactoring       - リファクタリング提案
community                 - コミュニティ（モジュール境界）検出
```

### MUSUBIエージェントとの連携

| エージェント | CodeGraph活用 | 効果 |
|-------------|---------------|------|
| Orchestrator | `global_search`, `stats` | プロジェクト全体把握 |
| System Architect | `analyze_module_structure` | アーキテクチャ可視化 |
| Change Impact Analyzer | `find_callers`, `find_dependencies` | 完全な影響分析 |
| Security Auditor | `query_codebase`, `find_callers` | 脆弱性の入力経路追跡 |
| Code Reviewer | `suggest_refactoring` | 客観的な改善提案 |

### セットアップ

```bash
# Orchestratorに依頼するだけ
@orchestrator CodeGraph MCP を設定してください
```

詳細は [MUSUBI × CodeGraph MCP Server 統合ガイド](https://qiita.com/hisaho/items/719210ccc20fe2514054) をご覧ください。

## インストールと利用開始

### インストール

```bash
# npx経由（推奨）
npx musubi-sdd init

# またはグローバルインストール
npm install -g musubi-sdd
musubi init
```

### エージェント別インストール

```bash
# Claude Code - 25 Skills API
npx musubi-sdd init --claude

# GitHub Copilot - 25エージェント（AGENTS.md、公式サポート）
npx musubi-sdd init --copilot

# Cursor IDE - 25エージェント（AGENTS.md、公式サポート）
npx musubi-sdd init --cursor

# Gemini CLI - 25エージェント（GEMINI.md統合）+ TOML形式
npx musubi-sdd init --gemini

# Windsurf IDE - 25エージェント（AGENTS.md）
npx musubi-sdd init --windsurf

# Codex CLI - 25エージェント（AGENTS.md）
npx musubi-sdd init --codex

# Qwen Code - 25エージェント（AGENTS.md）
npx musubi-sdd init --qwen
```

### CLIコマンド

```bash
# プロジェクトステータス確認
musubi status

# 憲法準拠検証
musubi validate

# 詳細情報表示
musubi info
```

## まとめ

**MUSUBI**は、spec-copilot（19エージェント）からMUSUHI（20エージェント）を経て進化した、**究極のSpecification Driven Development**ツールです。

### MUSUBIを選ぶべき理由

1. ✅ **最も包括的**：25エージェント × 7プラットフォーム、8段階ワークフロー、9憲法条項
2. ✅ **最も柔軟**：7つのAIエージェント全対応、Skills API + AGENTS.md
3. ✅ **最も堅牢**：憲法ガバナンス、完全トレーサビリティ、自動検証
4. ✅ **最も実践的**：グリーンフィールド/ブラウンフィールド両対応
5. ✅ **最も先進的**：Claude Code Skills API、OpenAI AGENTS.md仕様準拠、自動ステアリング更新
6. ✅ **業界初**：全7プラットフォームで25エージェント完全平等対応

### 6つのフレームワークの良いとこ取り

- **musuhi** → ステアリング、EARS形式
- **OpenSpec** → Delta Specs、変更管理
- **ag2** → オーケストレーション
- **ai-dev-tasks** → シンプリシティ
- **cc-sdd** → マルチエージェント
- **spec-kit** → 憲法ガバナンス

### 今すぐ始める

```bash
# あなたのAIエージェントを選択
npx musubi-sdd init --claude     # Claude Code (Skills API)
npx musubi-sdd init --copilot    # GitHub Copilot (AGENTS.md)
npx musubi-sdd init --cursor     # Cursor (AGENTS.md)
# その他: --gemini, --windsurf, --codex, --qwen

# どのエージェントでも25の専門エージェントが利用可能！
# あなたの究極のSDD体験が始まります 🚀
```

## リソース

- 📦 **npm**: [musubi-sdd](https://www.npmjs.com/package/musubi-sdd) (v2.1.1)
- 📚 **GitHub**: [nahisaho/musubi](https://github.com/nahisaho/MUSUBI)
- 🎯 **ブループリント**: [Ultimate-SDD-Tool-Blueprint-v3-25-Skills.md](https://github.com/nahisaho/MUSUBI/blob/main/Ultimate-SDD-Tool-Blueprint-v3-25-Skills.md)
- 📊 **フレームワーク比較**: 本記事の比較表参照

---

**MUSUBI** - むすび - 仕様、設計、コードを結びつける。

> 🌟 このプロジェクトはMITライセンスのオープンソースです。
> スター ⭐ やコントリビューションをお待ちしています！

#SDD #SpecificationDrivenDevelopment #AI #ClaudeCode #GitHubCopilot #Cursor #開発ツール #仕様駆動開発
