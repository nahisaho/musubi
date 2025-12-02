# Product Context

**Project**: MUSUBI (musubi-sdd)
**Last Updated**: 2025-12-03
**Version**: 2.0.0

---

## Product Vision

**Vision Statement**: AI開発エージェント時代の「仕様駆動開発」を標準化し、7つの主要AIコーディングプラットフォームで統一されたSDDワークフローを提供する

> MUSUBIは、仕様駆動開発（SDD）のベストプラクティスを6つの主要フレームワークから統合し、Claude Code、GitHub Copilot、Cursor、Gemini CLI、Codex CLI、Qwen Code、Windsurfの7つのAIコーディングエージェントで使用できるプロダクションレディなツールです。

**Mission**: 25の専門エージェントと9条の憲法条項により、要件から実装までの完全な追跡可能性を実現する

> 要件定義→設計→実装→テスト→デプロイの全ステージで、AIエージェントと人間の協調開発を支援し、品質と一貫性を保証します。

---

## Product Overview

### What is MUSUBI?

> Ultimate Specification Driven Development Tool for 7 AI Coding Agents

> MUSUBIは、6つの主要SDDフレームワーク（musuhi、OpenSpec、ag2、ai-dev-tasks、cc-sdd、spec-kit）の最良の機能を統合した包括的なSDD（仕様駆動開発）ツールです。
>
> 25の専門エージェントが8ステージのワークフロー（Research→Requirements→Design→Tasks→Implementation→Testing→Deployment→Monitoring）を自動化し、EARS形式の要件からテスト駆動の実装まで、完全な追跡可能性を維持します。
>
> 9条の憲法条項（Constitutional Governance）により、Library-First原則、Test-First開発、100%トレーサビリティなどの品質基準を強制し、Phase -1 Gatesで実装前の検証を行います。

### Problem Statement

**Problem**: AIコーディングエージェントを使った開発で、一貫性・追跡可能性・品質保証が失われる

> - AIエージェントがプロジェクトコンテキストを把握せず、不整合なコードを生成
> - 要件→設計→コード→テストの追跡可能性が欠如
> - プラットフォームごとに異なるワークフローで、チームの学習コストが増大
> - ブラウンフィールドプロジェクトでの変更管理が困難

### Solution

**Solution**: 統一されたSDDワークフローと25エージェントによる自動化

> - **プロジェクトメモリ（Steering）**: AIエージェントが常に最新のコンテキストを参照
> - **EARS形式要件**: 曖昧さのないテスト可能な要件定義
> - **憲法条項**: 9条の不変ルールによる品質保証
> - **7プラットフォーム対応**: 同じワークフローを異なるAIエージェントで使用可能
> - **Delta Specifications**: ブラウンフィールドプロジェクトの変更追跡

---

## Target Users

### Primary Users

#### User Persona 1: AI-First Developer

**Demographics**:

- **Role**: ソフトウェアエンジニア / テックリード
- **Organization Size**: スタートアップ〜大企業
- **Technical Level**: 中級〜上級

**Goals**:

- AIコーディングエージェントを効果的に活用したい
- 一貫性のある高品質なコードを生成したい
- 要件から実装までの追跡可能性を確保したい

**Pain Points**:

- AIが生成するコードの品質にばらつきがある
- プロジェクトコンテキストをAIに伝えるのが難しい
- 複数のAIプラットフォームで異なるワークフローを学ぶ必要がある

**Use Cases**:

- 新規プロジェクトのセットアップ（Greenfield）
- 既存プロジェクトへの機能追加（Brownfield）
- チーム全体でのSDD導入

---

#### User Persona 2: Tech Lead / Architect

**Demographics**:

- **Role**: テックリード / ソフトウェアアーキテクト
- **Organization Size**: 中規模〜大企業
- **Technical Level**: 上級

**Goals**:

- チーム全体の開発品質を標準化したい
- アーキテクチャの一貫性を維持したい

**Pain Points**:

- AIエージェントが既存アーキテクチャを無視する
- 憲法条項の遵守を自動化したい

**Use Cases**:

- 憲法条項の検証（musubi-validate）
- アーキテクチャ設計（C4モデル + ADR）
- トレーサビリティ監査（musubi-trace）

---

### Secondary Users

- **プロジェクトマネージャー**: タスク分解・進捗管理にmusubi-tasksを使用
- **QAエンジニア**: テスト要件の追跡・ギャップ検出にmusubi-gapsを使用

---

## Market & Business Context

### Market Opportunity

**Market Size**: 世界のAI開発ツール市場（急成長中）

**Target Market**: AIコーディングエージェントを使用する開発チーム

> 2024年以降、Claude Code、GitHub Copilot、Cursor等のAIコーディングエージェントが急速に普及。しかし、エンタープライズレベルの品質保証・追跡可能性ツールは不足しています。

### Business Model

**Revenue Model**: Open Source (MIT License)

> MUSUBIはオープンソースプロジェクトとして、コミュニティ貢献で成長します。

**Pricing Tiers**:

- **Free**: 全機能無料（MIT License）
- **Enterprise Support**: カスタムサポート・トレーニング（将来検討）

### Competitive Landscape

| Competitor | Strengths | Weaknesses | Our Differentiation |
| --- | --- | --- | --- |
| musuhi | 20エージェント、ステアリング | 単一プラットフォーム | 7プラットフォーム対応 |
| OpenSpec | Delta仕様、ブラウンフィールド対応 | エージェント少 | 25エージェント + 憲法条項 |
| spec-kit | 憲法ガバナンス | 手動ワークフロー | 自動化 + CLI |

---

## Core Product Capabilities

### Must-Have Features (MVP)

1. **Multi-Agent Support**
   - **Description**: 7つのAIコーディングプラットフォーム対応
   - **User Value**: プラットフォーム変更時も同じワークフローを継続
   - **Priority**: P0 (Critical)

2. **25 Specialized Agents**
   - **Description**: 要件分析〜デプロイまで25の専門エージェント
   - **User Value**: 各ステージに最適化されたAI支援
   - **Priority**: P0 (Critical)

3. **Constitutional Governance**
   - **Description**: 9条の憲法条項 + Phase -1 Gates
   - **User Value**: 品質基準の自動強制
   - **Priority**: P0 (Critical)

### High-Priority Features (Post-MVP)

1. **EARS Requirements Generator**
   - **Description**: 5つのEARSパターンで曖昧さのない要件生成
   - **User Value**: テスト可能な要件定義
   - **Priority**: P1 (High)

2. **Complete Traceability**
   - **Description**: 要件↔設計↔コード↔テストの100%追跡
   - **User Value**: 変更影響分析・監査対応
   - **Priority**: P1 (High)

3. **CodeGraph MCP Server Integration** ✅ (v2.0.0)
   - **Description**: コードベース構造分析のためのMCPサーバー統合
   - **User Value**: 依存関係追跡、呼び出し元分析、コミュニティ検出
   - **Priority**: P1 (High)
   - **Status**: 実装完了

### Future Features (Roadmap)

1. **Extended MCP Server Integration**
   - **Description**: Context7、Azure MCP等との連携強化
   - **User Value**: 外部ドキュメント・リソースとの統合
   - **Priority**: P2 (Medium)

2. **Team Collaboration Hub**
   - **Description**: チーム間のメモリ共有・同期機能強化
   - **User Value**: 大規模チームでのSDD導入
   - **Priority**: P3 (Low)

---

## Product Principles

### Design Principles

1. **Specification First**
   - コードを書く前に仕様を書く。すべての開発は要件定義から始まる

2. **Constitutional Governance**
   - 9条の憲法条項は不変。品質基準の妥協は許可しない

3. **Traceability Always**
   - 要件→設計→コード→テストの100%追跡可能性を維持

4. **Platform Agnostic**
   - 特定のAIプラットフォームに依存しない統一ワークフロー

### User Experience Principles

1. **CLI First**
   - すべての機能はCLIから使用可能。GUIは後から追加

2. **Progressive Complexity**
   - 初期は最大3プロジェクト（Article VII）。複雑さは段階的に追加

3. **Bilingual by Default**
   - すべてのドキュメントは英語と日本語の両方で生成

---

## Success Metrics

### Key Performance Indicators (KPIs)

#### Community Metrics

| Metric | Target | Measurement |
| --- | --- | --- |
| **npm Weekly Downloads** | 1,000+ | npm統計 |
| **GitHub Stars** | 500+ | GitHubリポジトリ |
| **Supported Platforms** | 7 | 対応プラットフォーム数 |
| **Active Contributors** | 10+ | GitHub Insights |

#### Quality Metrics

| Metric | Target | Measurement |
| --- | --- | --- |
| **Test Coverage** | ≥ 80% | Jest coverage |
| **Constitutional Compliance** | 100% | musubi-validate |
| **Traceability Coverage** | 100% | musubi-trace |
| **Lint Errors** | 0 | ESLint |

#### Technical Metrics

| Metric | Target | Measurement |
| --- | --- | --- |
| **CLI Response Time** | < 2s | 手動計測 |
| **CI Build Time** | < 5min | GitHub Actions |
| **Onboarding Time** | < 5min | musubi-onboard |
| **Init Time** | < 30s | musubi init |

---

## Product Roadmap

### Phase 1: Foundation (v0.1-v0.7) ✅ Completed

**Goal**: コア機能の実装

**Features**:

- ✅ 7プラットフォーム対応 init
- ✅ 25エージェント（Skills API + AGENTS.md）
- ✅ 憲法条項ガバナンス
- ✅ musubi-onboard / sync / analyze / share / validate

**Success Criteria**:

- ✅ npm公開完了
- ✅ CI/CD自動化

---

### Phase 2: SDD Workflow (v0.8-v0.9) ✅ Completed

**Goal**: 完全なSDDワークフローの実装

**Features**:

- ✅ musubi-requirements（EARS形式）
- ✅ musubi-design（C4 + ADR）
- ✅ musubi-tasks（タスク分解）
- ✅ musubi-trace（トレーサビリティ）
- ✅ musubi-change（ブラウンフィールド）
- ✅ musubi-gaps（ギャップ検出）

**Success Criteria**:

- ✅ 8ステージワークフロー完成
- ✅ 100%トレーサビリティ対応

---

### Phase 3: Optimization (v1.0-v1.2) 🚧 Current

**Goal**: パフォーマンス最適化・安定化

**Features**:

- ✅ 並列実行（30-70%高速化）
- ✅ 依存関係可視化（Mermaid）
- ✅ 高度なエラーハンドリング（4レベル + リトライ）
- 🚧 MCP Server統合強化

**Success Criteria**:

- ✅ v1.1.2リリース
- 🚧 ドキュメント完備

---

## User Workflows

### Primary Workflow 1: Greenfield Project (0→1)

**User Goal**: 新規プロジェクトをSDDで開始

**Steps**:

1. User: `npx musubi-sdd init --copilot`
2. System: steering/ディレクトリと25エージェントを生成
3. User: `#sdd-steering` で project memory を生成
4. User: `#sdd-requirements authentication` で要件定義
5. User: `#sdd-design authentication` で設計
6. User: `#sdd-tasks authentication` でタスク分解
7. User: `#sdd-implement authentication` で実装

**Success Criteria**:

- プロジェクト初期化 < 30秒
- 全ステージでトレーサビリティ維持

---

### Primary Workflow 2: Brownfield Project (1→n)

**User Goal**: 既存プロジェクトに機能追加

**Steps**:

1. User: `npx musubi-sdd init --copilot` (既存プロジェクトで)
2. User: `musubi-onboard` で既存コードを分析
3. User: `#sdd-change-init add-2fa` で変更提案作成
4. System: change-impact-analyzer で影響分析
5. User: `#sdd-change-apply add-2fa` で変更適用
6. User: `#sdd-change-archive add-2fa` でアーカイブ

**Success Criteria**:

- オンボーディング < 5分
- 変更の完全な追跡

---

## Business Domain

### Domain Concepts

Key concepts and terminology used in this domain:

1. **SDD (Specification Driven Development)**: 仕様を先に書き、それに基づいてコードを生成する開発手法
2. **EARS (Easy Approach to Requirements Syntax)**: 曖昧さのない要件記述のための5パターン
3. **Constitutional Governance**: 9条の不変ルールによる品質保証
4. **Traceability**: 要件→設計→コード→テストの追跡可能性
5. **Steering**: プロジェクトメモリ（コンテキスト）管理システム

### Business Rules

1. **Article III: Test-First Imperative**
   - テストはコードより先に書く（Red-Green-Blueサイクル）
   - **Example**: 80%以上のカバレッジ必須

2. **Article V: Traceability Mandate**
   - すべての要件は設計・コード・テストにマッピング
   - **Example**: REQ-AUTH-001 → AuthService → auth.test.ts

3. **Article VII: Simplicity Gate**
   - 初期は最大3サブプロジェクト
   - **Example**: Phase -1 Gate承認なしで4プロジェクト以上は禁止

---

## Constraints & Requirements

### Business Constraints

- **Budget**: Open Source (ボランティア)
- **Timeline**: 継続的開発
- **Team Size**: コミュニティベース
- **Launch Date**: v1.1.2 リリース済み (2025-11-23)

### Compliance Requirements

- **MIT License**: オープンソースライセンス準拠
- **Constitutional Governance**: 9条の憲法条項遵守
- **Bilingual**: 英語 + 日本語ドキュメント

### Non-Functional Requirements

- **Performance**: CLI応答 < 2秒
- **Compatibility**: Node.js 18.0.0+
- **Platform Support**: 7つのAIコーディングプラットフォーム
- **Test Coverage**: ≥ 80%
- **Traceability**: 100%

---

## Stakeholders

### Internal Stakeholders

| Role | Name | Responsibilities |
| --- | --- | --- |
| **Maintainer** | nahisaho | Vision, roadmap, code review |
| **Contributors** | Community | Feature development, bug fixes |

### External Stakeholders

| Role | Name | Responsibilities |
| --- | --- | --- |
| **Users** | AI Developers | フィードバック、Issue報告 |
| **Platform Vendors** | Anthropic, GitHub, Cursor等 | API互換性 |

---

## Go-to-Market Strategy

### Launch Strategy

**Target Launch Date**: {{LAUNCH_DATE}}

**Launch Phases**:

1. **Private Beta** ({{START_DATE}} - {{END_DATE}})
   - Invite-only, 50 beta users
   - Focus: Gather feedback, fix critical bugs

2. **Public Beta** ({{START_DATE}} - {{END_DATE}})
   - Open signup
   - Focus: Validate product-market fit

3. **General Availability** ({{LAUNCH_DATE}})
   - Full public launch
   - Focus: Acquisition and growth

### Marketing Channels

- **{{CHANNEL_1}}**: [Strategy, e.g., Content marketing, SEO]
- **{{CHANNEL_2}}**: [Strategy, e.g., Social media, Twitter/LinkedIn]
- **{{CHANNEL_3}}**: [Strategy, e.g., Paid ads, Google/Facebook]
- **{{CHANNEL_4}}**: [Strategy, e.g., Partnerships, integrations]

---

## Risk Assessment

### Product Risks

| Risk       | Probability     | Impact          | Mitigation            |
| ---------- | --------------- | --------------- | --------------------- |
| {{RISK_1}} | High/Medium/Low | High/Medium/Low | [Mitigation strategy] |
| {{RISK_2}} | High/Medium/Low | High/Medium/Low | [Mitigation strategy] |

**Example Risks**:

- **Low adoption**: Users don't understand value → Clear onboarding, demos
- **Performance issues**: System slow at scale → Load testing, optimization
- **Security breach**: Data compromised → Security audit, penetration testing

---

## Customer Support

### Support Channels

- **Email**: support@{{COMPANY}}.com
- **Chat**: In-app live chat (business hours)
- **Documentation**: docs.{{COMPANY}}.com
- **Community**: Forum/Discord/Slack

### Support SLA

| Tier              | Response Time | Resolution Time |
| ----------------- | ------------- | --------------- |
| **Critical (P0)** | < 1 hour      | < 4 hours       |
| **High (P1)**     | < 4 hours     | < 24 hours      |
| **Medium (P2)**   | < 24 hours    | < 3 days        |
| **Low (P3)**      | < 48 hours    | Best effort     |

---

## Product Analytics

### Analytics Tools

- **{{ANALYTICS_TOOL_1}}**: [Purpose, e.g., Google Analytics, Mixpanel]
- **{{ANALYTICS_TOOL_2}}**: [Purpose, e.g., Amplitude, Heap]

### Events to Track

| Event               | Description            | Purpose           |
| ------------------- | ---------------------- | ----------------- |
| `user_signup`       | New user registration  | Track acquisition |
| `feature_used`      | User uses core feature | Track engagement  |
| `payment_completed` | User completes payment | Track conversion  |
| `error_occurred`    | User encounters error  | Track reliability |

---

## Localization & Internationalization

### Supported Languages

- **Primary**: English (en-US)
- **Secondary**: [Languages, e.g., Japanese (ja-JP), Spanish (es-ES)]

### Localization Strategy

- **UI Strings**: i18n framework (next-intl, react-i18next)
- **Date/Time**: Locale-aware formatting
- **Currency**: Multi-currency support
- **Right-to-Left (RTL)**: Support for Arabic, Hebrew (if needed)

---

## Data & Privacy

### Data Collection

**What data we collect**:

- User account information (email, name)
- Usage analytics (anonymized)
- Error logs (for debugging)

**What data we DON'T collect**:

- [Sensitive data we avoid, e.g., passwords (only hashed), payment details (tokenized)]

### Privacy Policy

- **GDPR Compliance**: Right to access, delete, export data
- **Data Retention**: [Retention period, e.g., 90 days for logs]
- **Third-Party Sharing**: [Who we share data with, why]

---

## Integrations

### Existing Integrations

| Integration       | Purpose   | Priority |
| ----------------- | --------- | -------- |
| {{INTEGRATION_1}} | [Purpose] | P0       |
| {{INTEGRATION_2}} | [Purpose] | P1       |

### Planned Integrations

| Integration       | Purpose   | Timeline |
| ----------------- | --------- | -------- |
| {{INTEGRATION_3}} | [Purpose] | Q2 2025  |
| {{INTEGRATION_4}} | [Purpose] | Q3 2025  |

---

## Changelog

### Version 1.1 (Planned)

- [Future product updates]

---

**Last Updated**: 2025-12-03
**Maintained By**: nahisaho (MUSUBI Contributors)
