# 【MUSUBI v6.2.0】Review Gate Engine搭載！品質を自動で守るSDD完全ガイド

## はじめに

**MUSUBI SDD v6.2.0** は、AIコーディングアシスタントに**自然言語で話しかけるだけ**で、仕様駆動開発（SDD）を実現するフレームワークです。

v6.2.0 では、**Review Gate Engine** を搭載し、要件→設計→実装の各フェーズで品質を自動検証できるようになりました。

---

## 🆕 v6.2.0 の新機能

### 🚪 Review Gate Engine（最大の目玉）

各開発フェーズ間に**自動レビューゲート**を設置し、品質を確保します。

```
要件定義 → [RequirementsReviewGate] → 設計 → [DesignReviewGate] → 実装 → [ImplementationReviewGate] → 完了
```

#### 新しいレビュープロンプト

| プロンプト | 説明 |
|-----------|------|
| `#sdd-review-requirements <feature>` | 要件ドキュメントをレビュー（EARS形式、ステークホルダー、受入基準） |
| `#sdd-review-design <feature>` | 設計ドキュメントをレビュー（C4モデル、ADR、Constitutional Articles） |
| `#sdd-review-implementation <feature>` | 実装をレビュー（テストカバレッジ、コード品質、トレーサビリティ） |
| `#sdd-review-all <feature>` | 全フェーズの完全レビューサイクル |

### 📊 ワークフローダッシュボード

機能ごとの進捗状況をリアルタイムで可視化：

```bash
musubi dash --feature IMP-6.2
```

表示内容：
- 現在のステージ（Requirements / Design / Implementation）
- 完了率（%）
- ブロッカー一覧
- 次のアクション提案

### 🔗 トレーサビリティ自動化

コード、テスト、コミットから要件IDを自動抽出：

```typescript
// REQ-AUTH-001: ユーザー認証
// IMP-6.2-001-01: 要件レビューゲート
```

ギャップ検出機能：
- 実装のない要件を検出
- テストのない要件を検出
- 修正アクションを提案

### 🏛️ Constitutional Compliance 強化

9つのConstitutional Articlesへの準拠を自動検証：

- **Article VII（Simplicity）** 違反 → Phase -1 Gate 自動トリガー
- **Article VIII（Anti-Abstraction）** 違反 → Phase -1 Gate 自動トリガー

### 📝 ドキュメント自動生成

#### 実験レポート生成

テスト実行後に自動生成：

```bash
musubi report --test-results coverage/coverage-summary.json
```

#### 技術記事テンプレート

4つのプラットフォームに対応：

| プラットフォーム | コマンド |
|-----------------|---------|
| Qiita | `musubi article --platform qiita` |
| Zenn | `musubi article --platform zenn` |
| Medium | `musubi article --platform medium` |
| Dev.to | `musubi article --platform devto` |

### 🔧 エラーリカバリー＆ロールバック

#### エラーリカバリー

ステージ失敗時に自動分析：
- 根本原因の特定
- 修正手順の提案
- 失敗履歴の記録

#### ロールバック機能

4つの粒度レベルでロールバック可能：

| レベル | 対象 | 説明 |
|--------|------|------|
| File | 個別ファイル | 特定ファイルのみを前バージョンに |
| Commit | Git コミット | 指定コミットまでリバート |
| Stage | ワークフローステージ | Req/Design/Task/Impl単位 |
| Sprint | スプリント全体 | スプリント開始時点に戻す |

---

## 🚀 自然言語で始めるSDD（5分で開始）

### Step 1: MUSUBI のインストール

```bash
npx musubi-sdd init --copilot
```

### Step 2: AIに話しかけるだけで開発開始

初期化が完了したら、**AIに自然言語で話しかけるだけ**で仕様駆動開発が始まります。

---

## 💬 自然言語での作業例

### 🎯 要件定義を作成したい

> **「ユーザー認証機能の要件定義を作成して」**

AIが1問1答形式で対話を開始し、MECE分析で網羅的な要件を定義します。

### 📐 設計を作成したい

> **「ユーザー認証機能の設計をC4モデルで作成して」**

### 📋 タスクに分解したい

> **「ユーザー認証機能を実装タスクに分解して」**

### ⚙️ 実装を進めたい

> **「P0タスクから順に実装を開始して」**

### ✅ レビューしたい（v6.2.0 新機能）

> **「ユーザー認証機能の要件をレビューして」**

AIが以下をチェック：
- EARS形式の構文検証
- ステークホルダーカバレッジ
- 受入基準の完全性

> **「ユーザー認証機能の設計をレビューして」**

AIが以下をチェック：
- C4モデルの完全性（Context, Container, Component）
- ADRの存在と品質
- Constitutional Articles準拠

> **「ユーザー認証機能の実装をレビューして」**

AIが以下をチェック：
- テストカバレッジ（設定可能、デフォルト80%）
- コード品質（lint, type check）
- トレーサビリティ（要件→設計→コード→テスト）

> **「ユーザー認証機能をフルレビューして」**

全フェーズを順番にレビュー。

### 📊 進捗を確認したい（v6.2.0 新機能）

> **「IMP-6.2の進捗状況を表示して」**

### 🔙 ロールバックしたい（v6.2.0 新機能）

> **「設計ステージまでロールバックして」**

---

## 🤖 対応AIプラットフォーム（7種類）

| プラットフォーム | セットアップ |
|-----------------|-------------|
| **Claude Code** | `npx musubi-sdd init --claude` |
| **GitHub Copilot** | `npx musubi-sdd init --copilot` |
| **Cursor IDE** | `npx musubi-sdd init --cursor` |
| **Gemini CLI** | `npx musubi-sdd init --gemini` |
| **Codex CLI** | `npx musubi-sdd init --codex` |
| **Qwen Code** | `npx musubi-sdd init --qwen` |
| **Windsurf** | `npx musubi-sdd init --windsurf` |

---

## 📋 27+4 の専門AIエージェント

v6.2.0 では4つの新エージェントが追加されました。

### 🆕 新エージェント（v6.2.0）

| エージェント | できること | 伝え方の例 |
|-------------|-----------|-----------|
| **Review Gate Agent** | レビューゲートの実行 | 「〇〇機能をレビューして」 |
| **Dashboard Agent** | 進捗可視化 | 「進捗状況を表示して」 |
| **Traceability Agent** | トレーサビリティ分析 | 「要件のギャップを検出して」 |
| **Recovery Agent** | エラーリカバリー | 「ロールバックして」 |

### コアワークフロー（9個）

| できること | 伝え方の例 |
|-----------|-----------|
| プロジェクト設定 | 「プロジェクトのアーキテクチャを設定して」 |
| 要件定義 | 「〇〇機能の要件を定義して」 |
| システム設計 | 「〇〇機能の設計をC4モデルで作成して」 |
| タスク分解 | 「〇〇機能を実装タスクに分解して」 |
| 実装 | 「P0タスクを実装して」 |
| 検証 | 「要件と実装の整合性を検証して」 |
| 変更分析 | 「〇〇を追加する影響を分析して」 |
| 変更適用 | 「変更提案を適用して」 |
| アーカイブ | 「完了した変更をアーカイブして」 |

### 品質保証（6個）

| できること | 伝え方の例 |
|-----------|-----------|
| テスト設計 | 「〇〇機能のテストを設計して」 |
| コードレビュー | 「このコードをレビューして」 |
| セキュリティ監査 | 「セキュリティ脆弱性をチェックして」 |
| パフォーマンス最適化 | 「この処理を最適化して」 |
| 品質管理 | 「品質メトリクスを確認して」 |
| ガバナンス検証 | 「憲法条項への準拠を確認して」 |

### 専門領域（12個）

| できること | 伝え方の例 |
|-----------|-----------|
| API設計 | 「REST APIを設計して」 |
| データベース設計 | 「ユーザーテーブルのスキーマを設計して」 |
| データベース運用 | 「クエリを最適化して」 |
| UI/UX設計 | 「ログイン画面のUIを設計して」 |
| DevOps | 「CI/CDパイプラインを構築して」 |
| クラウド設計 | 「AWSアーキテクチャを設計して」 |
| AI/ML実装 | 「推薦システムを実装して」 |
| ドキュメント作成 | 「APIドキュメントを作成して」 |
| リリース管理 | 「リリースノートを作成して」 |
| SRE | 「アラート設定を構成して」 |
| バグ調査 | 「このエラーの原因を調査して」 |
| 課題解決 | 「このIssueを解決して」 |

---

## 🏛️ 品質を守る9つの憲法条項

MUSUBI は「憲法」で品質を保証します。**v6.2.0 では自動検証が強化されました。**

| 条項 | 原則 | v6.2.0 での強化 |
|------|------|----------------|
| I | Library-First | DesignReviewGateで検証 |
| II | CLI Interface | DesignReviewGateで検証 |
| III | Test-First | ImplementationReviewGateで検証 |
| IV | EARS Format | RequirementsReviewGateで検証 |
| V | Traceability | トレーサビリティエージェントで自動抽出 |
| VI | Project Memory | SteeringSyncerで自動同期 |
| VII | Simplicity Gate | **Phase -1 Gate自動トリガー** |
| VIII | Anti-Abstraction | **Phase -1 Gate自動トリガー** |
| IX | Integration-First | ImplementationReviewGateで検証 |

### Phase -1 Gate とは？

Article VII（Simplicity）またはArticle VIII（Anti-Abstraction）に違反する変更を検出した際に発動する特別レビュープロセスです。

- システムアーキテクト必須レビュー
- プロジェクトマネージャー任意レビュー
- 人間による最終承認

---

## 📁 プロジェクト構造

MUSUBI で初期化されたプロジェクト：

```
your-project/
├── AGENTS.md                    # AIエージェント定義（レビュープロンプト含む）
├── steering/
│   ├── structure.md             # アーキテクチャ
│   ├── tech.md                  # 技術スタック
│   ├── product.md               # プロダクト情報
│   └── rules/
│       └── constitution.md      # 9つの憲法条項
├── storage/
│   ├── specs/                   # 要件・設計ドキュメント
│   ├── features/                # 機能別ファイル
│   ├── reviews/                 # レビュー結果（v6.2.0）
│   ├── dashboard/               # ダッシュボードデータ（v6.2.0）
│   ├── transitions/             # ステージ遷移記録（v6.2.0）
│   └── traceability/            # トレーサビリティマトリクス（v6.2.0）
└── lib/
    └── musubi-review-gate/      # Review Gate Engine（v6.2.0）
```

---

## 🔧 設定オプション

### Review Gate 設定

```yaml
# steering/project.yml
reviewGate:
  requirements:
    earsCheck: true
    stakeholderCoverage: true
    acceptanceCriteriaRequired: true
  design:
    c4Required: ['context', 'container', 'component']
    adrRequired: true
    constitutionalArticles: [1, 2, 7, 8]
  implementation:
    minCoverage: 80        # テストカバレッジ閾値
    coverageType: 'line'   # line / branch / function
    lintStrict: true       # Lintエラー時にブロック
```

### トレーサビリティ設定

```yaml
# steering/project.yml
traceability:
  patterns:
    - 'REQ-[A-Z0-9]+-\\d{3}'
    - 'IMP-\\d+\\.\\d+-\\d{3}(?:-\\d{2})?'
  extractFrom:
    - 'src/**/*.{ts,js}'
    - 'tests/**/*.test.{ts,js}'
  outputPath: 'storage/traceability/matrix.yml'
```

---

## 📈 テスト結果

v6.2.0 は **4,827 テスト** でカバレッジを確保しています。

| カテゴリ | テスト数 |
|---------|---------|
| Review Gate Engine | 105 |
| Dashboard & Traceability | 141 |
| Constitutional Compliance | 144 |
| Enterprise Features | 100 |
| 既存機能 | 4,337 |
| **合計** | **4,827** |

---

## 🎯 ユースケース

### ユースケース1: 新機能開発

```
1. 「ユーザー認証機能の要件を定義して」
2. 「要件をレビューして」 ← v6.2.0 新機能
3. 「設計をC4モデルで作成して」
4. 「設計をレビューして」 ← v6.2.0 新機能
5. 「タスクに分解して」
6. 「実装して」
7. 「実装をレビューして」 ← v6.2.0 新機能
8. 「フルレビューして」 ← v6.2.0 新機能
```

### ユースケース2: 品質問題の早期発見

```
1. 「トレーサビリティギャップを検出して」
   → 実装のない要件、テストのない要件を検出

2. 「Constitutional準拠をチェックして」
   → Article違反を検出、Phase -1 Gateをトリガー
```

### ユースケース3: 進捗管理

```
1. 「IMP-6.2の進捗を表示して」
   → ダッシュボードで可視化

2. 「ステージ遷移履歴を表示して」
   → いつ誰が承認したかを確認
```

---

## 🔄 アップグレード方法

既存プロジェクトをv6.2.0にアップグレード：

```bash
npm update musubi-sdd@latest
npx musubi-sdd upgrade --to 6.2.0
```

または手動で：

```bash
# AGENTS.mdにレビュープロンプトを追加
npx musubi-sdd init --update-agents
```

---

## 📚 関連ドキュメント

- [MUSUBI SDD 公式ドキュメント](https://github.com/nahisaho/musubi)
- [Constitutional Governance](steering/rules/constitution.md)
- [Review Gate Engine API Reference](docs/API-REFERENCE.md)
- [CHANGELOG v6.2.0](CHANGELOG.md)

---

## まとめ

MUSUBI v6.2.0 では、**Review Gate Engine** により品質管理が大幅に強化されました。

✅ **要件・設計・実装の各フェーズで自動レビュー**
✅ **トレーサビリティの自動抽出とギャップ検出**
✅ **Constitutional Articles 準拠の自動検証**
✅ **Phase -1 Gate による過度な複雑化の防止**
✅ **ワークフローダッシュボードで進捗を可視化**
✅ **エラーリカバリーとロールバック機能**

AIに自然言語で話しかけるだけで、高品質なソフトウェア開発を実現できます。

---

**MUSUBI Version**: 6.2.0
**Release Date**: 2025-12-31
**Test Coverage**: 4,827 tests passing

---

## タグ

`#MUSUBI` `#SDD` `#仕様駆動開発` `#AI開発` `#GitHub Copilot` `#Claude` `#品質管理` `#Review Gate` `#トレーサビリティ`
