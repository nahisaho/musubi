# プロダクトコンテキスト

**プロジェクト**: musubi
**最終更新**: 2025-12-12
**バージョン**: 5.9.0

---

## プロダクトビジョン

**ビジョン**: AI コーディングエージェントの品質と一貫性を向上させる仕様駆動開発ツール

**ミッション**: 7つの AI コーディングプラットフォームに対して、Constitution ガバナンスとマルチエージェントオーケストレーションを提供する

---

## プロダクト概要

### MUSUBI とは？

MUSUBI は、仕様駆動開発 (SDD) を通じて AI コーディングエージェントの品質と一貫性を向上させるツールです。

7つの AI コーディングプラットフォーム（Claude Code, GitHub Copilot, Cursor, Gemini CLI, Windsurf, Codex, Qwen Code）に対応し、27のエージェントテンプレートを提供します。

### 問題提起

**問題**: AI コーディングエージェントは強力ですが、一貫性のある高品質なコードを生成するには適切なガイダンスが必要です。

### 解決策

**解決策**: 9つの憲法条項、EARS フォーマット要件、C4 + ADR 設計、マルチエージェントオーケストレーションによる体系的な開発ワークフロー

---

## v5.9.0 機能

### エンタープライズ機能

| 機能 | 説明 |
|------|------|
| **ワークフローモード** | small (5段階), medium (6段階), large (8段階) |
| **モノレポサポート** | packages.yml による複数パッケージ管理 |
| **Constitution レベル** | critical (必須), advisory (推奨), flexible (柔軟) |
| **project.yml v2.0** | JSON Schema 検証、自動マイグレーション |

### CLI コマンド (22+)

| コマンド | 説明 |
|---------|------|
| `musubi init` | プロジェクト初期化 |
| `musubi requirements` | EARS 要件生成 |
| `musubi design` | C4 + ADR 設計生成 |
| `musubi tasks` | タスク分解 |
| `musubi validate` | 憲法準拠検証 |
| `musubi orchestrate` | マルチエージェント実行 |
| `musubi release` | リリース管理 (v5.9.0 新規) |
| `musubi config` | 設定管理 (v5.9.0 新規) |

---

## ターゲットユーザー

### プライマリユーザー

#### ペルソナ 1: 開発チームリード

**属性**:
- **役割**: テックリード / アーキテクト
- **組織規模**: 中〜大規模
- **技術レベル**: 上級

**ゴール**:
- AI コーディングエージェントの品質向上
- チーム全体での一貫した開発プラクティス
- 効率的なコードレビュープロセス

**ペインポイント**:
- AI 生成コードの品質のばらつき
- 複数エージェント間の連携の難しさ
- ガバナンスの確立

---

#### ペルソナ 2: ソロ開発者

**属性**:
- **役割**: フルスタック開発者
- **組織規模**: 個人 / 小規模
- **技術レベル**: 中〜上級

**ゴール**:
- 高速なプロトタイピング
- 一貫した開発ワークフロー
- 学習曲線の最小化

**ユースケース**:
- 新規プロジェクトの立ち上げ
- 既存プロジェクトへの SDD 導入

---

## コアバリュー

1. **Constitutional Governance**: 9つの憲法条項による一貫した開発ガイダンス
2. **Multi-Agent Orchestration**: Swarm, Triage, Handoff パターン
3. **7 Platform Support**: 主要 AI コーディングプラットフォーム対応
4. **MCP Integration**: CodeGraph MCP による高度なコード分析

---

*更新: 2025-12-12 - MUSUBI v5.9.0*

- **{{SECONDARY_USER_1}}**: [Description and role]
- **{{SECONDARY_USER_2}}**: [Description and role]

---

## Market & Business Context

### Market Opportunity

**Market Size**: {{MARKET_SIZE}}

**Target Market**: {{TARGET_MARKET}}

> [Description of the market opportunity, competitive landscape, and positioning]

### Business Model

**Revenue Model**: {{REVENUE_MODEL}}

> Examples: SaaS subscription, One-time purchase, Freemium, Usage-based

**Pricing Tiers** (if applicable):

- **Free Tier**: [Features, limitations]
- **Pro Tier**: ${{PRICE}}/month - [Features]
- **Enterprise Tier**: Custom pricing - [Features]

### Competitive Landscape

| Competitor       | Strengths   | Weaknesses   | Our Differentiation   |
| ---------------- | ----------- | ------------ | --------------------- |
| {{COMPETITOR_1}} | [Strengths] | [Weaknesses] | [How we're different] |
| {{COMPETITOR_2}} | [Strengths] | [Weaknesses] | [How we're different] |

---

## Core Product Capabilities

### Must-Have Features (MVP)

1. **{{FEATURE_1}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P0 (Critical)

2. **{{FEATURE_2}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P0 (Critical)

3. **{{FEATURE_3}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P0 (Critical)

### High-Priority Features (Post-MVP)

4. **{{FEATURE_4}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P1 (High)

5. **{{FEATURE_5}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P1 (High)

### Future Features (Roadmap)

6. **{{FEATURE_6}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P2 (Medium)

7. **{{FEATURE_7}}**
   - **Description**: [What it does]
   - **User Value**: [Why users need it]
   - **Priority**: P3 (Low)

---

## Product Principles

### Design Principles

1. **{{PRINCIPLE_1}}**
   - [Description of what this means for product decisions]

2. **{{PRINCIPLE_2}}**
   - [Description]

3. **{{PRINCIPLE_3}}**
   - [Description]

**Examples**:

- **Simplicity First**: Favor simple solutions over complex ones
- **User Empowerment**: Give users control and flexibility
- **Speed & Performance**: Fast response times (< 200ms)

### User Experience Principles

1. **{{UX_PRINCIPLE_1}}**
   - [How this guides UX decisions]

2. **{{UX_PRINCIPLE_2}}**
   - [How this guides UX decisions]

**Examples**:

- **Progressive Disclosure**: Show advanced features only when needed
- **Accessibility First**: WCAG 2.1 AA compliance
- **Mobile-First**: Design for mobile, enhance for desktop

---

## Success Metrics

### Key Performance Indicators (KPIs)

#### Business Metrics

| Metric                              | Target            | Measurement    |
| ----------------------------------- | ----------------- | -------------- |
| **Monthly Active Users (MAU)**      | {{MAU_TARGET}}    | [How measured] |
| **Monthly Recurring Revenue (MRR)** | ${{MRR_TARGET}}   | [How measured] |
| **Customer Acquisition Cost (CAC)** | ${{CAC_TARGET}}   | [How measured] |
| **Customer Lifetime Value (LTV)**   | ${{LTV_TARGET}}   | [How measured] |
| **Churn Rate**                      | < {{CHURN_RATE}}% | [How measured] |

#### Product Metrics

| Metric                       | Target                | Measurement    |
| ---------------------------- | --------------------- | -------------- |
| **Daily Active Users (DAU)** | {{DAU_TARGET}}        | [How measured] |
| **Feature Adoption Rate**    | > {{ADOPTION_RATE}}%  | [How measured] |
| **User Retention (Day 7)**   | > {{RETENTION_RATE}}% | [How measured] |
| **Net Promoter Score (NPS)** | > {{NPS_TARGET}}      | [How measured] |

#### Technical Metrics

| Metric                      | Target  | Measurement             |
| --------------------------- | ------- | ----------------------- |
| **API Response Time (p95)** | < 200ms | Monitoring dashboard    |
| **Uptime**                  | 99.9%   | Status page             |
| **Error Rate**              | < 0.1%  | Error tracking (Sentry) |
| **Page Load Time**          | < 2s    | Web vitals              |

---

## Product Roadmap

### Phase 1: MVP (Months 1-3)

**Goal**: Launch minimum viable product

**Features**:

- [Feature 1]
- [Feature 2]
- [Feature 3]

**Success Criteria**:

- [Criterion 1]
- [Criterion 2]

---

### Phase 2: Growth (Months 4-6)

**Goal**: Achieve product-market fit

**Features**:

- [Feature 4]
- [Feature 5]
- [Feature 6]

**Success Criteria**:

- [Criterion 1]
- [Criterion 2]

---

### Phase 3: Scale (Months 7-12)

**Goal**: Scale to {{USER_TARGET}} users

**Features**:

- [Feature 7]
- [Feature 8]
- [Feature 9]

**Success Criteria**:

- [Criterion 1]
- [Criterion 2]

---

## User Workflows

### Primary Workflow 1: {{WORKFLOW_1_NAME}}

**User Goal**: {{USER_GOAL}}

**Steps**:

1. User [action 1]
2. System [response 1]
3. User [action 2]
4. System [response 2]
5. User achieves [goal]

**Success Criteria**:

- User completes workflow in < {{TIME}} minutes
- Success rate > {{SUCCESS_RATE}}%

---

### Primary Workflow 2: {{WORKFLOW_2_NAME}}

**User Goal**: {{USER_GOAL}}

**Steps**:

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Success Criteria**:

- [Criterion 1]
- [Criterion 2]

---

## Business Domain

### Domain Concepts

Key concepts and terminology used in this domain:

1. **{{CONCEPT_1}}**: [Definition and importance]
2. **{{CONCEPT_2}}**: [Definition and importance]
3. **{{CONCEPT_3}}**: [Definition and importance]

**Example for SaaS Authentication**:

- **Identity Provider (IdP)**: Service that authenticates users
- **Single Sign-On (SSO)**: One login for multiple applications
- **Multi-Factor Authentication (MFA)**: Additional verification step

### Business Rules

1. **{{RULE_1}}**
   - [Description of business rule]
   - **Example**: [Concrete example]

2. **{{RULE_2}}**
   - [Description]
   - **Example**: [Example]

**Example for E-commerce**:

- **Inventory Reservation**: Reserved items held for 10 minutes during checkout
- **Refund Window**: Refunds allowed within 30 days of purchase

---

## Constraints & Requirements

### Business Constraints

- **Budget**: ${{BUDGET}}
- **Timeline**: {{TIMELINE}}
- **Team Size**: {{TEAM_SIZE}} engineers
- **Launch Date**: {{LAUNCH_DATE}}

### Compliance Requirements

- **{{COMPLIANCE_1}}**: [Description, e.g., GDPR, SOC 2, HIPAA]
- **{{COMPLIANCE_2}}**: [Description]
- **Data Residency**: [Requirements, e.g., EU data stays in EU]

### Non-Functional Requirements

- **Performance**: API response < 200ms (95th percentile)
- **Availability**: 99.9% uptime SLA
- **Scalability**: Support {{CONCURRENT_USERS}} concurrent users
- **Security**: OWASP Top 10 compliance
- **Accessibility**: WCAG 2.1 AA compliance

---

## Stakeholders

### Internal Stakeholders

| Role                    | Name                 | Responsibilities                  |
| ----------------------- | -------------------- | --------------------------------- |
| **Product Owner**       | {{PO_NAME}}          | Vision, roadmap, priorities       |
| **Tech Lead**           | {{TECH_LEAD_NAME}}   | Architecture, technical decisions |
| **Engineering Manager** | {{EM_NAME}}          | Team management, delivery         |
| **QA Lead**             | {{QA_LEAD_NAME}}     | Quality assurance, testing        |
| **Design Lead**         | {{DESIGN_LEAD_NAME}} | UX/UI design                      |

### External Stakeholders

| Role                        | Name        | Responsibilities            |
| --------------------------- | ----------- | --------------------------- |
| **Customer Advisory Board** | [Members]   | Product feedback            |
| **Investors**               | [Names]     | Funding, strategic guidance |
| **Partners**                | [Companies] | Integration, co-marketing   |

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

**Last Updated**: 2025-12-12
**Maintained By**: {{MAINTAINER}}
