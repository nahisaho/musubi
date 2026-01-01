title: MUSUBI v3.0.0完全ガイド: 27の専門AIエージェントとスキル

# 第1章 はじめに

MUSUBI (Specification Driven Development) v3.0.0は、Claude Codeを活用した仕様駆動開発フレームワークです。本記事では、MUSUBIに搭載された **27の専門AIエージェント（Skill）** について、それぞれの役割、使用可能なツール、専門領域を詳しく解説します。

**v3.0.0 新機能:**
- 🌐 **Browser Agent**: 自然言語でブラウザを自動操作
- 📊 **Web GUI Dashboard**: リアルタイムプロジェクトダッシュボード
- 🔄 **Spec Kit互換**: GitHub Copilot Spec Kitとの相互変換

# 第2章 インストール・アップグレード

## 2.1 新規インストール

```bash
# Claude Code用（デフォルト）
npx musubi-sdd@latest init

# GitHub Copilot用
npx musubi-sdd@latest init --copilot

# Cursor IDE用
npx musubi-sdd@latest init --cursor
```

## 2.2 既存プロジェクトのアップグレード

```bash
# v3.0.0にアップグレード
npx musubi-sdd@latest init

# Skillsとコマンドが自動的に更新されます
```

**注意:** `npx`を使用すると常に最新版が実行されます。グローバルインストールは不要です。

# 第3章 エージェント（Skill）の概要

MUSUBIでは、各専門AIを**Skill**として定義しています。各Skillは特定のタスクに特化しており、トリガーワードに応じて自動的に呼び出されます。

## 3.1 オーケストレーション（Orchestration）

### 3.1.1 Orchestrator

**複数エージェントを統括するマスターコーディネーター**

| 項目 | 内容 |
|------|------|
| **説明** | 27の専門AIエージェントを統括し、複雑なタスクを分解・調整 |
| **使用ツール** | Read, Write, Edit, Bash, Glob, Grep, TodoWrite |
| **トリガーワード** | orchestrate, coordinate, multi-agent, workflow, execution plan, task breakdown, agent selection, project planning, complex task, full lifecycle, end-to-end development |

**主な機能:**
- エージェント選択: ユーザーリクエストに最適なエージェントを選定
- ワークフロー調整: エージェント間の依存関係と実行順序を管理
- タスク分解: 複雑な要件を実行可能なサブタスクに分割
- 結果統合: 複数エージェントの出力を統合・整理
- 進捗管理: 全体の進捗を追跡・報告

---

### 3.1.2 Steering

**プロジェクトメモリマネージャー**

| 項目 | 内容 |
|------|------|
| **説明** | コードベースを分析し、プロジェクトメモリ（steeringコンテキスト）を生成・維持 |
| **使用ツール** | Read, Write, Bash, Glob, Grep |
| **トリガーワード** | steering, project memory, codebase analysis, auto-update context, generate steering, architecture patterns, tech stack analysis, project structure |

**生成するドキュメント:**
- `steering/structure.md` - アーキテクチャパターン、ディレクトリ構造、命名規則
- `steering/tech.md` - 技術スタック、フレームワーク、開発ツール
- `steering/product.md` - ビジネスコンテキスト、製品目的、ユーザー
- `steering/project.yml` - プロジェクト設定（機械可読形式）

---

## 3.2 要件定義・計画（Requirements & Planning）

### 3.2.1 Requirements Analyst

**要件分析・ユーザーストーリー作成の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | ステークホルダーのニーズを分析し、明確な機能/非機能要件を定義 |
| **使用ツール** | Read, Write, Edit, Bash |
| **トリガーワード** | requirements, EARS format, user stories, functional requirements, non-functional requirements, SRS, requirement analysis, specification, acceptance criteria |

**専門領域:**
- 要件定義（機能要件、非機能要件、制約条件）
- ステークホルダー分析
- 要件の引き出し（インタビュー、ワークショップ、プロトタイピング）
- EARS形式での要件文書化
- 優先順位付け（MoSCoW法、カノ分析）

---

### 3.2.2 Project Manager

**プロジェクト計画・リスク管理の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | プロジェクト計画、スケジュール管理、リスク管理、進捗追跡を担当 |
| **使用ツール** | Read, Write, Edit, TodoWrite |
| **トリガーワード** | project management, project plan, WBS, Gantt chart, risk management, sprint planning, milestone tracking, project timeline, resource allocation |

**専門領域:**
- プロジェクト計画（WBS、ガントチャート、マイルストーン）
- リスク管理（リスク識別、分析、対応策）
- アジャイル/スクラム管理（スプリント計画、バックログ管理）
- ステークホルダー管理

---

## 3.3 アーキテクチャ・設計（Architecture & Design）

### 3.3.1 System Architect

**システムアーキテクチャ設計の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | システムアーキテクチャ設計、C4モデル図、ADR（アーキテクチャ決定記録）作成 |
| **使用ツール** | Read, Write, Edit, Bash, Glob, Grep |
| **トリガーワード** | architecture, system design, C4 model, ADR, architecture decision, component diagram, sequence diagram, system architecture |

**専門領域:**
- C4モデル（Context、Container、Component、Code）
- アーキテクチャパターン（マイクロサービス、モノリス、イベント駆動）
- 分散システム設計
- セキュリティアーキテクチャ

---

### 3.3.2 API Designer

**API設計の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | REST/GraphQL/gRPC APIの設計、OpenAPI仕様書の作成 |
| **使用ツール** | Read, Write, Edit, Bash |
| **トリガーワード** | API design, REST API, GraphQL, OpenAPI, Swagger, gRPC, API specification, endpoint design, API contract |

**専門領域:**
- RESTful API設計（リソース設計、HTTPメソッド、ステータスコード）
- GraphQL API設計（スキーマ、リゾルバー）
- gRPC設計（Protocol Buffers、サービス定義）
- OpenAPI仕様書の作成
- APIセキュリティ（OAuth2、JWT、レート制限）

---

### 3.3.3 Database Schema Designer

**データベーススキーマ設計の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | データベース設計、ER図、DDL生成 |
| **使用ツール** | Read, Write, Edit, Bash |
| **トリガーワード** | database design, schema design, ER diagram, data model, DDL, database architecture, entity relationship |

**専門領域:**
- データモデリング（概念設計、論理設計、物理設計）
- 正規化（1NF〜BCNF）
- RDBMS（PostgreSQL、MySQL、SQL Server）
- NoSQL（MongoDB、DynamoDB、Redis）

---

### 3.3.4 UI/UX Designer

**UI/UXデザインの専門家**

| 項目 | 内容 |
|------|------|
| **説明** | ユーザーインターフェース設計、ワイヤーフレーム、プロトタイプ作成 |
| **使用ツール** | Read, Write, Edit |
| **トリガーワード** | UI design, UX design, wireframe, mockup, prototype, user interface, user experience, design system, component library, accessibility |

**専門領域:**
- UXデザイン（ペルソナ、ユーザージャーニーマップ）
- UIデザイン（ワイヤーフレーム、モックアップ）
- デザインシステム（コンポーネントライブラリ、デザイントークン）
- アクセシビリティ（WCAG 2.1準拠）

---

## 3.4 開発・実装（Development & Implementation）

### 3.4.1 Software Developer

**マルチ言語コード実装の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | 複数言語でのコード実装、SOLID原則、デザインパターンに準拠 |
| **使用ツール** | Read, Write, Edit, Bash, Glob, Grep |
| **トリガーワード** | implement, code, development, programming, coding, write code, create function, build feature |

**対応言語:**
- TypeScript, JavaScript, Python, Java, C#, Go, Swift, Kotlin, Rust, PHP, Ruby

**対応フレームワーク:**
- Frontend: React, Vue, Angular, Svelte, Next.js, Nuxt.js
- Backend: Express, NestJS, FastAPI, Django, Spring Boot, ASP.NET

---

### 3.4.2 Test Engineer

**テスト戦略・実装の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | ユニット/統合/E2Eテストの設計・実装、EARS要件とのマッピング |
| **使用ツール** | Read, Write, Edit, Bash, Glob, Grep |
| **トリガーワード** | testing, unit tests, integration tests, E2E tests, test automation, test cases, TDD, BDD |

**専門領域:**
- ユニットテスト（Vitest、Jest、pytest、JUnit）
- 統合テスト
- E2Eテスト（Playwright、Cypress）
- TDD/BDD手法

---

## 3.5 品質・レビュー（Quality & Review）

### 3.5.1 Code Reviewer

**コードレビューの専門家**

| 項目 | 内容 |
|------|------|
| **説明** | コードレビュー、SOLID原則、ベストプラクティスの確認 |
| **使用ツール** | Read, Grep, Glob, Bash（読み取り専用） |
| **トリガーワード** | code review, code quality, SOLID principles, best practices, review code, PR review |

**レビュー観点:**
- コード品質（可読性、保守性）
- SOLID原則への準拠
- セキュリティ脆弱性
- パフォーマンス問題
- テストカバレッジ

---

### 3.5.2 Quality Assurance

**QA戦略・テスト計画の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | 包括的なQA戦略とテスト計画を策定し、品質を確保 |
| **使用ツール** | Read, Write, Edit, Bash |
| **トリガーワード** | QA, quality assurance, test strategy, QA plan, quality metrics, test planning, quality gates, acceptance testing |

**専門領域:**
- QA戦略策定（品質目標、KPI、受入基準）
- テスト計画（テストスコープ、スケジュール）
- 品質メトリクス（カバレッジ、欠陥密度）
- 要件トレーサビリティ

---

### 3.5.3 Bug Hunter

**バグ調査・根本原因分析の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | バグ調査、再現手順の特定、根本原因分析、修正提案 |
| **使用ツール** | Read, Write, Edit, Bash, Glob, Grep |
| **トリガーワード** | bug fix, debug, troubleshoot, root cause analysis, error investigation, fix bug, resolve issue |

**専門領域:**
- バグ調査手法（再現手順、ログ分析）
- 根本原因分析（5 Whys、フィッシュボーン図）
- バグタイプ（ロジックエラー、メモリリーク、レースコンディション）
- デバッグ戦略

---

## 3.6 セキュリティ・パフォーマンス（Security & Performance）

### 3.6.1 Security Auditor

**セキュリティ監査の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | OWASP Top 10に基づく脆弱性検出、セキュリティ監査 |
| **使用ツール** | Read, Grep, Glob, Bash（読み取り専用） |
| **トリガーワード** | security audit, vulnerability scan, OWASP, security review, penetration testing, security assessment |

**専門領域:**
- OWASP Top 10（2021）
- Webセキュリティ（XSS、CSRF、SQLインジェクション）
- APIセキュリティ（認証、認可）
- インフラストラクチャセキュリティ

---

### 3.6.2 Performance Optimizer

**パフォーマンス分析・最適化の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | パフォーマンス分析、ボトルネック検出、最適化戦略の提案 |
| **使用ツール** | Read, Write, Edit, Bash, Glob, Grep |
| **トリガーワード** | performance optimization, performance tuning, profiling, benchmark, bottleneck analysis, scalability, latency optimization |

**専門領域:**
- フロントエンド最適化（Core Web Vitals、バンドル最適化）
- バックエンド最適化（クエリ最適化、キャッシング）
- インフラ最適化（スケーリング、CDN）

---

## 3.7 インフラ・運用（Infrastructure & Operations）

### 3.7.1 DevOps Engineer

**CI/CD・インフラ自動化の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | CI/CDパイプライン構築、Docker/Kubernetes、インフラ自動化 |
| **使用ツール** | Read, Write, Edit, Bash, Glob |
| **トリガーワード** | CI/CD, DevOps, Docker, Kubernetes, pipeline, deployment, container, infrastructure automation |

**専門領域:**
- CI/CDパイプライン（GitHub Actions、GitLab CI）
- コンテナ化（Docker、Docker Compose）
- オーケストレーション（Kubernetes）
- IaC（Terraform、Ansible）

---

### 3.7.2 Cloud Architect

**クラウドアーキテクチャの専門家**

| 項目 | 内容 |
|------|------|
| **説明** | AWS/Azure/GCP設計、IaC（Terraform/Bicep）コード生成、コスト最適化 |
| **使用ツール** | Read, Write, Edit, Bash |
| **トリガーワード** | cloud architecture, AWS, Azure, GCP, Terraform, cloud design, infrastructure as code, cloud migration |

**専門領域:**
- AWS（EC2、Lambda、RDS、S3、EKS）
- Azure（VMs、Functions、SQL、Storage、AKS）
- GCP（Compute、Cloud Run、Cloud SQL）
- IaC（Terraform、Bicep、CloudFormation）

---

### 3.7.3 Database Administrator

**データベース運用・チューニングの専門家**

| 項目 | 内容 |
|------|------|
| **説明** | データベース運用、パフォーマンスチューニング、バックアップ/リカバリ |
| **使用ツール** | Read, Write, Edit, Bash, Grep |
| **トリガーワード** | database administration, DBA, database tuning, performance tuning, backup recovery, high availability |

**対応データベース:**
- RDBMS: PostgreSQL, MySQL/MariaDB, Oracle, SQL Server
- NoSQL: MongoDB, Redis, Cassandra, DynamoDB
- NewSQL: CockroachDB, TiDB

---

### 3.7.4 Site Reliability Engineer

**SRE・監視・インシデント対応の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | 本番監視、可観測性、SLO/SLI管理、インシデント対応 |
| **使用ツール** | Read, Write, Bash, Glob |
| **トリガーワード** | monitoring, observability, SRE, site reliability, alerting, incident response, SLO, SLI, error budget, Prometheus, Grafana |

**専門領域:**
- SLI/SLO定義・追跡
- 監視プラットフォーム（Prometheus、Grafana、Datadog）
- アラート設定
- インシデント対応ワークフロー
- ポストモーテム

---

### 3.7.5 Release Coordinator

**リリース調整・デプロイ戦略の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | マルチコンポーネントリリース調整、フィーチャーフラグ、ロールバック戦略 |
| **使用ツール** | Read, Write, Bash, Glob, TodoWrite |
| **トリガーワード** | release management, release planning, feature flags, canary deployment, progressive rollout, release notes, rollback strategy |

**専門領域:**
- リリース計画・調整
- フィーチャーフラグ管理
- カナリア/ブルーグリーンデプロイメント
- ロールバック手順

---

## 3.8 ドキュメンテーション（Documentation）

### 3.8.1 Technical Writer

**技術文書作成の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | 技術文書、APIドキュメント、ユーザーガイド、READMEの作成 |
| **使用ツール** | Read, Write, Edit, Glob |
| **トリガーワード** | documentation, technical writing, API documentation, README, user guide, developer guide, tutorial |

**対応ドキュメント:**
- README（プロジェクト概要、セットアップ手順）
- APIドキュメント（OpenAPI、Swagger）
- ユーザーガイド/開発者ガイド
- チュートリアル

---

## 3.9 特殊機能（Specialized）

### 3.9.1 AI/ML Engineer

**機械学習・MLOpsの専門家**

| 項目 | 内容 |
|------|------|
| **説明** | 機械学習モデル開発、トレーニング、評価、デプロイ、MLOps |
| **使用ツール** | Read, Write, Edit, Bash, Glob, Grep |
| **トリガーワード** | machine learning, ML, AI, model training, MLOps, model deployment, feature engineering, neural network, deep learning |

**専門領域:**
- 機械学習モデル開発（教師あり/なし学習、深層学習）
- NLP（テキスト分類、NER、文章生成）
- コンピュータビジョン（画像分類、物体検出）
- MLOps（モデルバージョニング、デプロイ、監視）
- LLM/生成AI（ファインチューニング、RAG、エージェント）

---

### 3.9.2 Change Impact Analyzer

**変更影響分析の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | 既存システムへの変更影響分析、破壊的変更検出、マイグレーション計画 |
| **使用ツール** | Read, Write, Bash, Glob, Grep |
| **トリガーワード** | change impact, impact analysis, brownfield, delta spec, change proposal, breaking changes, dependency analysis |

**専門領域:**
- 影響を受けるコンポーネントの特定
- 破壊的変更の検出
- 依存関係グラフの更新
- リスク評価とマイグレーション計画

---

### 3.9.3 Constitution Enforcer

**憲法（ガバナンス）遵守の監視役**

| 項目 | 内容 |
|------|------|
| **説明** | 9つの憲法条項とPhase -1ゲートの遵守を検証 |
| **使用ツール** | Read, Glob, Grep（読み取り専用） |
| **トリガーワード** | constitution, governance, compliance, validation, Phase -1 Gates, simplicity gate, anti-abstraction gate, test-first |

**9つの憲法条項:**
1. ライブラリファースト原則
2. CLIインターフェース義務
3. テストファースト命令
4. EARS要件形式
5. トレーサビリティ義務
6. プロジェクトメモリ
7. シンプリシティゲート
8. 反抽象化ゲート
9. 統合ファーストテスト

---

### 3.9.4 Traceability Auditor

**要件トレーサビリティ監査の専門家**

| 項目 | 内容 |
|------|------|
| **説明** | EARS要件→設計→タスク→コード→テストの完全なトレーサビリティを検証 |
| **使用ツール** | Read, Glob, Grep（読み取り専用） |
| **トリガーワード** | traceability, requirements coverage, coverage matrix, traceability matrix, requirement mapping, EARS coverage |

**検証内容:**
- 要件→設計のマッピング（100%カバレッジ）
- 設計→タスクのマッピング
- タスク→コードのマッピング
- コード→テストのマッピング
- ギャップ検出（孤立要件、未テストコード）

---

# 第4章 v3.0.0新機能

## 4.1 Browser Automation Agent

**ブラウザ自動化テストの専門家** 🆕

| 項目 | 内容 |
|------|------|
| **説明** | Playwrightを使用したブラウザ自動化、E2Eテスト、Web UIテスト |
| **使用ツール** | Read, Write, Edit, Bash, Glob, Grep |
| **トリガーワード** | browser automation, e2e test, playwright, end-to-end, web testing, UI testing, browser test, screenshot, web scraping |

**専門領域:**
- E2Eテストシナリオの設計と実装
- クロスブラウザテスト（Chromium, Firefox, WebKit）
- 視覚的リグレッションテスト（スクリーンショット比較）
- Webアクセシビリティ監査
- パフォーマンス測定（Core Web Vitals）

**使用例:**
```bash
# E2Eテストの生成
npx musubi-workflow --agent browser --task "ログインフローのE2Eテスト作成"

# 視覚的リグレッションテスト
npx musubi-workflow --agent browser --task "ダッシュボードのスクリーンショットテスト"
```

---

## 4.2 Web GUI Dashboard

**Webベースのダッシュボード** 🆕

| 項目 | 内容 |
|------|------|
| **説明** | SDDワークフローとトレーサビリティを視覚化するWebダッシュボード |
| **機能** | プロジェクト概要、ワークフロー状態、仕様書一覧、トレーサビリティマトリクス、憲法表示 |
| **技術** | Express.js, WebSocket, シングルページアプリケーション |

**主要機能:**
- **プロジェクト概要**: ファイル統計、ワークフロー進捗
- **ワークフロー可視化**: 8段階SDDワークフローの状態表示
- **仕様書ブラウザ**: 要件・設計・タスクの検索と閲覧
- **トレーサビリティマトリクス**: 要件カバレッジの可視化
- **リアルタイム更新**: WebSocketによるファイル変更通知

**使用例:**
```bash
# ダッシュボード起動
npx musubi-gui start

# 開発モード（ホットリロード）
npx musubi-gui dev

# トレーサビリティマトリクスのみ表示
npx musubi-gui matrix

# カスタムポート指定
npx musubi-gui start --port 4000
```

**APIエンドポイント:**
| エンドポイント | 説明 |
|----------------|------|
| `GET /api/project` | プロジェクト概要 |
| `GET /api/specs` | 仕様書一覧（EARS形式） |
| `GET /api/traceability` | トレーサビリティマトリクス |
| `GET /api/workflow` | ワークフロー状態 |
| `GET /api/steering` | Steeringドキュメント |
| `GET /api/health` | ヘルスチェック |

---

# 第5章 OpenHands由来モジュール（v2.2.0〜）

MUSUBI v2.2.0では、**OpenHandsプロジェクト**にインスパイアされた8つの高度なモジュールが統合されました。これらのモジュールにより、エージェントの自律性と品質が大幅に向上しています。

## 5.1 StuckDetector

**エージェントの行き詰まり自動検出**

| 項目 | 内容 |
|------|------|
| **説明** | エージェントが同じ操作を繰り返したり、進捗がない状態を自動検出 |
| **検出パターン** | 同じコマンドの繰り返し実行、エラーループ、進捗なしの長時間待機 |
| **対応** | 自動リカバリー提案、代替アプローチの提示 |

## 5.2 SkillsLoader

**動的スキルのロードと管理**

| 項目 | 内容 |
|------|------|
| **説明** | 必要に応じてスキル（エージェント）を動的にロード |
| **機能** | オンデマンドロード、メモリ効率化、スキル依存関係管理 |

```javascript
// 動的スキルロード
const skill = await skillsLoader.load('code-reviewer');
```

## 5.3 MemoryCondenser

**長期記憶の効率的な圧縮**

| 項目 | 内容 |
|------|------|
| **説明** | 長期コンテキストを効率的に圧縮し、重要な情報を保持 |
| **機能** | コンテキスト圧縮、重要情報の優先保持、トークン最適化 |

## 5.4 CriticSystem

**エージェント出力の品質評価**

| 項目 | 内容 |
|------|------|
| **説明** | エージェントの出力を評価し、品質スコアを算出 |
| **評価項目** | 正確性、完全性、一貫性、ベストプラクティス準拠 |

```javascript
// 品質評価
const critique = await criticSystem.evaluate(agentOutput);
// { score: 0.85, feedback: [...], improvements: [...] }
```

## 5.5 IssueResolver

**GitHub Issueの自動分析と解決提案**

| 項目 | 内容 |
|------|------|
| **説明** | GitHub Issueを分析し、解決に必要なタスクを自動生成 |
| **機能** | Issue分類、根本原因分析、タスク自動生成、PR提案 |

## 5.6 SecurityAnalyzer

**セキュリティ脆弱性の自動検出**

| 項目 | 内容 |
|------|------|
| **説明** | コードのセキュリティ脆弱性を自動検出 |
| **検出項目** | SQLインジェクション、XSS、CSRF、認証・認可の問題、依存関係の脆弱性 |

```javascript
// セキュリティ分析
const vulnerabilities = await securityAnalyzer.scan(codebase);
// [{ type: 'SQL Injection', severity: 'high', location: '...' }]
```

## 5.7 AgentMemoryManager

**エージェント間のメモリ共有**

| 項目 | 内容 |
|------|------|
| **説明** | 複数エージェント間でメモリを共有・同期 |
| **機能** | 共有コンテキスト管理、エージェント間通信、状態永続化 |

## 5.8 GitHubClient

**GitHub API統合**

| 項目 | 内容 |
|------|------|
| **説明** | GitHub APIとの統合により、Issue/PR操作を自動化 |
| **対応操作** | Issue作成・更新・クローズ、PR作成・レビュー・マージ、コメント追加 |

---

# 第6章 使用ツール一覧

各Skillが使用できるツールは以下の通りです：

| ツール | 説明 | 権限 |
|--------|------|------|
| **Read** | ファイルの読み取り | 読み取り |
| **Write** | ファイルの作成 | 書き込み |
| **Edit** | ファイルの編集 | 書き込み |
| **Bash** | シェルコマンド実行 | 実行 |
| **Glob** | ファイルパターン検索 | 読み取り |
| **Grep** | コンテンツ検索 | 読み取り |
| **TodoWrite** | タスク管理 | 書き込み |

---

# 第7章 エージェント権限マトリクス

| Skill | Read | Write | Edit | Bash | Glob | Grep | TodoWrite |
|-------|:----:|:-----:|:----:|:----:|:----:|:----:|:---------:|
| Orchestrator | O | O | O | O | O | O | O |
| Steering | O | O | - | O | O | O | - |
| Requirements Analyst | O | O | O | O | - | - | - |
| Project Manager | O | O | O | - | - | - | O |
| System Architect | O | O | O | O | O | O | - |
| API Designer | O | O | O | O | - | - | - |
| Database Schema Designer | O | O | O | O | - | - | - |
| UI/UX Designer | O | O | O | - | - | - | - |
| Software Developer | O | O | O | O | O | O | - |
| Test Engineer | O | O | O | O | O | O | - |
| Code Reviewer | O | - | - | O | O | O | - |
| Quality Assurance | O | O | O | O | - | - | - |
| Bug Hunter | O | O | O | O | O | O | - |
| Security Auditor | O | - | - | O | O | O | - |
| Performance Optimizer | O | O | O | O | O | O | - |
| DevOps Engineer | O | O | O | O | O | - | - |
| Cloud Architect | O | O | O | O | - | - | - |
| Database Administrator | O | O | O | O | - | O | - |
| Site Reliability Engineer | O | O | - | O | O | - | - |
| Release Coordinator | O | O | - | O | O | - | O |
| Technical Writer | O | O | O | - | O | - | - |
| AI/ML Engineer | O | O | O | O | O | O | - |
| Change Impact Analyzer | O | O | - | O | O | O | - |
| Constitution Enforcer | O | - | - | - | O | O | - |
| Traceability Auditor | O | - | - | - | O | O | - |
| Browser Automation Agent | O | O | O | O | O | O | - |

---

# 第8章 スラッシュコマンド一覧

MUSUBIは、Claude Codeで使用できる9つのスラッシュコマンドを提供しています。これらのコマンドはSDDワークフローの各段階をサポートします。

## 8.1 コアコマンド

| コマンド | 説明 | 使用例 |
|----------|------|--------|
| `/sdd-steering` | プロジェクトメモリ（steeringコンテキスト）を生成・更新 | `/sdd-steering` |
| `/sdd-requirements` | EARS形式の要件仕様書を作成 | `/sdd-requirements authentication` |
| `/sdd-design` | 要件から技術設計書を生成 | `/sdd-design authentication` |
| `/sdd-tasks` | 設計をアクション可能なタスクに分解 | `/sdd-tasks authentication` |
| `/sdd-implement` | タスクに基づいて機能を実装 | `/sdd-implement authentication` |
| `/sdd-validate` | 憲法遵守と要件カバレッジを検証 | `/sdd-validate authentication` |

## 8.2 変更管理コマンド（Brownfield向け）

既存システムへの変更を管理するためのコマンドです：

| コマンド | 説明 | 使用例 |
|----------|------|--------|
| `/sdd-change-init` | 変更提案を初期化 | `/sdd-change-init add-2fa` |
| `/sdd-change-apply` | 承認された変更提案を適用 | `/sdd-change-apply add-2fa` |
| `/sdd-change-archive` | 完了した変更提案をアーカイブ | `/sdd-change-archive add-2fa` |

## 8.3 コマンド詳細

### 8.3.1 `/sdd-steering` - プロジェクトメモリ生成

プロジェクトのコードベースを分析し、steeringコンテキストを生成します。

**モード:**
- **Bootstrap Mode**: steeringファイルが存在しない場合、コードベース全体を分析して初期ファイルを生成
- **Sync Mode**: steeringファイルが存在する場合、コードベースとの差分を検出して更新

**生成ファイル:**
```
steering/
├── structure.md    # アーキテクチャパターン
├── tech.md         # 技術スタック
├── product.md      # ビジネスコンテキスト
└── project.yml     # プロジェクト設定（機械可読）
```

---

### 8.3.2 `/sdd-requirements [feature-name]` - 要件定義

指定された機能のEARS形式要件仕様書を作成します。

**出力:**
```
docs/requirements/[feature-name]/
├── requirements.md       # 英語版
└── requirements.ja.md    # 日本語版
```

**EARS形式パターン:**
- **Event-driven**: `WHEN [event], the [system] SHALL [response]`
- **State-driven**: `WHILE [state], the [system] SHALL [response]`
- **Unwanted behavior**: `IF [error], THEN the [system] SHALL [response]`
- **Optional features**: `WHERE [feature enabled], the [system] SHALL [response]`
- **Ubiquitous**: `The [system] SHALL [requirement]`

---

### 8.3.3 `/sdd-design [feature-name]` - 技術設計

要件仕様書から技術設計書を生成します。

**出力:**
```
docs/design/[feature-name]/
├── design.md       # 英語版
└── design.ja.md    # 日本語版
```

**含まれる内容:**
- C4モデル図（Context、Container、Component）
- ADR（アーキテクチャ決定記録）
- シーケンス図
- データモデル
- API設計

---

### 8.3.4 `/sdd-tasks [feature-name]` - タスク分解

設計書をアクション可能な実装タスクに分解します。

**出力:**
```
docs/tasks/[feature-name]/
├── tasks.md       # 英語版
└── tasks.ja.md    # 日本語版
```

**含まれる内容:**
- 優先度付きタスクリスト
- 要件カバレッジマトリクス
- 依存関係グラフ
- 見積もり（複雑度）

---

### 8.3.5 `/sdd-implement [feature-name]` - 実装

タスク分解に基づいて機能を実装します。

**プロセス:**
1. タスクファイルの読み込み
2. Test-First原則に従いテストを先に作成
3. コード実装
4. テスト実行・確認

---

### 8.3.6 `/sdd-validate [feature-name]` - 検証

実装が憲法条項と要件カバレッジを満たしているか検証します。

**検証項目:**
- 9つの憲法条項への準拠
- 100%要件トレーサビリティ
- コード品質基準
- セキュリティ基準
- テストカバレッジ

---

### 8.3.7 `/sdd-change-init [change-name]` - 変更提案初期化

既存システムへの変更提案を作成します（Brownfieldプロジェクト向け）。

**出力:**
```
changes/[change-name]/
├── proposal.md     # 変更提案
└── specs/          # Delta仕様（ADDED/MODIFIED/REMOVED/RENAMED）
```

---

### 8.3.8 `/sdd-change-apply [change-name]` - 変更適用

承認された変更提案をコードベースに適用します。

---

### 8.3.9 `/sdd-change-archive [change-name]` - 変更アーカイブ

完了した変更提案をアーカイブし、ドキュメントを更新します。

---

# 第9章 プロジェクトメモリ（Steering System）

すべてのSkillは、タスク開始前に以下のsteeringファイルを参照します：

```
steering/
├── structure.md  # アーキテクチャパターン、ディレクトリ構造
├── tech.md       # 技術スタック、フレームワーク
└── product.md    # ビジネスコンテキスト、製品目的
```

これにより、すべてのエージェントが一貫したプロジェクトコンテキストを共有できます。

---

# 第10章 SDD 8段階ワークフロー

MUSUBIは以下の8段階ワークフローに従います：

```
Research → Requirements → Design → Tasks → Implementation → Testing → Deployment → Monitoring
```

1. **Research**: 技術調査、オプション分析
2. **Requirements**: EARS形式での要件定義
3. **Design**: C4モデル、ADR、技術設計
4. **Tasks**: 実装タスクへの分解
5. **Implementation**: コード実装
6. **Testing**: ユニット/統合/E2Eテスト
7. **Deployment**: CI/CD、インフラデプロイ
8. **Monitoring**: 本番監視、SLO追跡

---

# 第11章 CLIコマンド一覧

MUSUBIは、ターミナルから直接使用できるCLIコマンドも提供しています。

## 11.1 メインコマンド

```bash
# プロジェクトの初期化
musubi init                    # Claude Code用に初期化（デフォルト）
musubi init --cursor           # Cursor IDE用に初期化
musubi init --copilot          # GitHub Copilot用に初期化
musubi init --gemini           # Gemini CLI用に初期化
musubi init --codex            # Codex CLI用に初期化
musubi init --qwen             # Qwen Code用に初期化
musubi init --windsurf         # Windsurf IDE用に初期化

# プロジェクト管理
musubi status                  # プロジェクトステータスを表示
musubi validate                # 憲法遵守のクイック検証
musubi validate --verbose      # 詳細な検証結果を表示
musubi sync                    # steeringドキュメントをコードベースと同期
musubi sync --dry-run          # 変更をプレビュー（適用なし）
musubi info                    # バージョンと環境情報を表示
```

## 11.2 スタンドアロンCLIコマンド

より高度な操作のための専用CLIコマンドです：

| コマンド | 説明 |
|----------|------|
| `musubi-requirements` | EARS形式要件ジェネレーター |
| `musubi-design` | 技術設計ジェネレーター（C4、ADR） |
| `musubi-tasks` | タスク分解ジェネレーター |
| `musubi-trace` | トレーサビリティマトリクス分析 |
| `musubi-analyze` | ギャップ検出と分析 |
| `musubi-onboard` | チームオンボーディングアシスタント |
| `musubi-share` | ナレッジ共有ツール |
| `musubi-change` | 変更影響分析 |
| `musubi-gaps` | 要件ギャップ検出 |
| `musubi-remember` | プロジェクトメモリ管理 |
| `musubi-resolve` | 問題解決アシスタント |
| `musubi-workflow` | ワークフロー管理 |

**使用例:**
```bash
# 要件生成
musubi-requirements --feature authentication --output docs/specs/

# トレーサビリティ分析
musubi-trace --requirements docs/specs/requirements.md --tests tests/

# ギャップ検出
musubi-gaps --specs docs/specs/ --code src/
```

---

# 第12章 サポートAIプラットフォーム（7種類）

MUSUBIは以下の7つのAIコーディングエージェントをサポートしています：

| プラットフォーム | フラグ | 説明 |
|------------------|--------|------|
| **Claude Code** | `--claude`, `--claude-code` | デフォルト。Skills API完全対応 |
| **GitHub Copilot** | `--copilot`, `--github-copilot` | コマンド/プロンプト方式 |
| **Cursor IDE** | `--cursor` | コマンド/プロンプト方式 |
| **Gemini CLI** | `--gemini`, `--gemini-cli` | コマンド/プロンプト方式 |
| **Codex CLI** | `--codex`, `--codex-cli` | コマンド/プロンプト方式 |
| **Qwen Code** | `--qwen`, `--qwen-code` | コマンド/プロンプト方式 |
| **Windsurf IDE** | `--windsurf` | コマンド/プロンプト方式 |

**注意:** Skills API（`@skill-name`形式）はClaude Code専用です。他のプラットフォームではコマンド/プロンプト方式を使用します。

---

# 第13章 CodeGraph MCP Server連携

MUSUBIは**CodeGraph MCP Server**と統合することで、AIエージェントがコードベース全体を「グラフ」として理解できるようになります。

## 13.1 CodeGraph MCP Serverとは？

CodeGraph MCP Serverは、ソースコードをグラフ構造として解析し、MCP（Model Context Protocol）経由でAIエージェントに提供するサーバーです。

| 機能 | 説明 |
|------|------|
| **コード構造分析** | 関数、クラス、モジュールの依存関係を可視化 |
| **GraphRAG検索** | セマンティックなコード検索（意味ベース） |
| **コミュニティ検出** | Louvainアルゴリズムによるモジュール境界分析 |
| **影響分析** | 変更の波及範囲を自動特定 |
| **14言語対応** | Python, JavaScript, TypeScript, Java, C#, Go, Rust, Ruby, PHP, C++, HCLなど |

## 13.2 提供されるMCPツール（14種類）

```
# コードグラフ操作
init_graph          - グラフ初期化
get_code_snippet    - ソースコード取得
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
stats                     - コードベース統計
community                 - コミュニティ検出
```

## 13.3 エージェントごとの活用例

| エージェント | CodeGraph活用 | 効果 |
|-------------|---------------|------|
| **Orchestrator** | `global_search`, `stats` | プロジェクト全体把握、最適なエージェント選定 |
| **System Architect** | `analyze_module_structure`, `community` | アーキテクチャ可視化、リファクタリング計画 |
| **Software Developer** | `get_code_snippet`, `local_search` | 関連コードの迅速な発見 |
| **Code Reviewer** | `find_callers`, `suggest_refactoring` | 影響範囲の確認、改善提案 |
| **Test Engineer** | `find_dependencies` | テスト対象の依存関係把握 |
| **Security Auditor** | `find_callers`, `query_codebase` | 脆弱な関数の利用箇所特定 |
| **Change Impact Analyzer** | `find_dependencies`, `find_callers` | 変更影響の完全分析 |
| **Bug Hunter** | `local_search`, `get_code_snippet` | バグの根本原因追跡 |

## 13.4 セットアップ方法

### 13.4.1 方法1: Orchestratorによる自動セットアップ（推奨）

```
ユーザー: CodeGraph MCPを設定して
```

Orchestratorが自動実行：
1. Python環境確認
2. codegraph-mcp-serverインストール
3. プロジェクトのインデックス作成
4. 使用環境に応じた設定ファイル生成

### 13.4.2 方法2: 手動セットアップ

```bash
# インストール
pipx install --force codegraph-mcp-server

# プロジェクトのインデックス作成（フルインデックス）
codegraph-mcp index . --full

# インデックス出力例:
# Indexed 105 files
# - Entities: 1006
# - Relations: 5359
# - Communities: 36

# Claude Codeに追加
claude mcp add codegraph -- codegraph-mcp serve --repo /path/to/project
```

## 13.5 インデックスオプション

| オプション | 説明 |
|----------|------|
| `--full` | 完全なインデックスを作成（推奨） |
| `--incremental` | 変更ファイルのみ更新 |
| `--exclude <pattern>` | 除外パターン指定（例: `node_modules`） |

**ベストプラクティス:**
- 初回は必ず`--full`オプションでインデックスを作成
- コードベースに大きな変更があった場合は再度`--full`を実行
- 日常的な更新は`--incremental`で効率的に更新

**VS Code (Claude Extension)の場合:**

`.vscode/settings.json`:
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

## 13.6 導入効果

| 指標 | 導入前 | 導入後 | 改善率 |
|------|--------|--------|--------|
| コード検索時間 | 手動5-10分 | 即時（<1秒） | **99%削減** |
| 影響分析精度 | 60-70% | 95%以上 | **+35%** |
| リファクタリング計画時間 | 2-4時間 | 15-30分 | **85%削減** |
| バグ原因特定時間 | 30分-2時間 | 5-15分 | **75%削減** |

---

# 第14章 まとめ

MUSUBI v3.0.0は、27の専門AIエージェント（Skill）を統合した強力な仕様駆動開発フレームワークです。v3.0.0では、Browser Automation AgentとWeb GUI Dashboardが追加され、E2Eテストとプロジェクト可視化が大幅に強化されました。各Skillは特定のタスクに特化しており、Orchestratorによって自動的に調整されます。

プロジェクトメモリ（Steering System）により、すべてのエージェントが一貫したコンテキストを共有し、EARS形式の要件から実装、テスト、デプロイまでのトレーサビリティを確保します。

---

# 第15章 参考リンク

- [MUSUBI GitHub Repository](https://github.com/nahisaho/MUSUBI)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [EARS Requirements Syntax](https://en.wikipedia.org/wiki/EARS_(Requirements_Engineering))

---

**Powered by MUSUBI** - Specification Driven Development for AI-assisted coding
