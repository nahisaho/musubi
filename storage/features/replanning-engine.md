# Feature: Replanning Engine

**Feature ID**: FEAT-REPLAN-001
**Version**: 1.0.0
**Status**: Draft
**Created**: 2025-12-08
**Author**: MUSUBI SDD

---

## Overview

リプラニング機能は、MUSUBIのオーケストレーションエンジンに動的なタスク再計画能力を追加します。
エージェントが実行中にタスクリストを動的に編集し、ステップが失敗した場合やより良いパスが見つかった場合に適応できるようにします。

### 背景

VentureBeat記事 "Vibe coding is dead: Agentic swarm coding is the new enterprise moat" で述べられているように、
リプラニング能力は最新のAgentic Swarmシステムの重要な構成要素です。
WarpフレームワークがSWE-benchで75.8%のスコアを達成した主要因の一つがこの機能です。

### 目標

1. タスク実行中の動的な計画修正を可能にする
2. 失敗時の代替パス生成を自動化する
3. 複数のLLMプラットフォームに対応する
4. 既存のオーケストレーションパターンと統合する

---

## Requirements

### REQ-REPLAN-001: Replanning Trigger Detection
**Type**: Event-Driven
**Priority**: P0 (Must Have)
**Pattern**: When [trigger], the system shall [action]

**Statement**:
When a task execution fails, times out, or encounters an unexpected state, the system shall detect the replanning trigger and initiate the replanning process.

**Acceptance Criteria**:
- [ ] AC-001: タスク失敗を検出してReplanTrigger.TASK_FAILEDを発火
- [ ] AC-002: タイムアウトを検出してReplanTrigger.TIMEOUTを発火
- [ ] AC-003: コンテキスト変更を検出してReplanTrigger.CONTEXT_CHANGEDを発火
- [ ] AC-004: 目標到達不能を検出してReplanTrigger.GOAL_UNREACHABLEを発火
- [ ] AC-005: 人間による再計画要求を処理してReplanTrigger.HUMAN_REQUESTを発火

---

### REQ-REPLAN-002: Dynamic Task List Modification
**Type**: Ubiquitous
**Priority**: P0 (Must Have)
**Pattern**: The system shall [action]

**Statement**:
The system shall provide APIs to dynamically add, remove, reorder, and modify tasks in the execution plan during runtime.

**Acceptance Criteria**:
- [ ] AC-001: `addTask(task, position)` でタスクを任意位置に追加可能
- [ ] AC-002: `removeTask(taskId)` でタスクを削除可能
- [ ] AC-003: `reorderTasks(taskIds)` でタスク順序を変更可能
- [ ] AC-004: `modifyTask(taskId, updates)` でタスク内容を変更可能
- [ ] AC-005: 変更履歴がplan historyに記録される
- [ ] AC-006: 実行中のタスクは変更不可（pending/completedのみ変更可能）

---

### REQ-REPLAN-003: Alternative Path Generation
**Type**: Event-Driven
**Priority**: P0 (Must Have)
**Pattern**: When [trigger], the system shall [action]

**Statement**:
When a task fails and retry is exhausted, the system shall generate alternative execution paths using LLM to achieve the original goal.

**Acceptance Criteria**:
- [ ] AC-001: 失敗タスクのコンテキストを分析
- [ ] AC-002: 元の目標を保持した代替タスクを生成
- [ ] AC-003: 複数の代替パス候補を生成（最大3つ）
- [ ] AC-004: 代替パスの推定成功確率を算出
- [ ] AC-005: 最適な代替パスを自動選択または人間に提示

---

### REQ-REPLAN-004: LLM Provider Abstraction
**Type**: Ubiquitous
**Priority**: P0 (Must Have)
**Pattern**: The system shall [action]

**Statement**:
The system shall provide a unified LLM interface that abstracts platform-specific LLM APIs (GitHub Copilot LM API, Anthropic, OpenAI, etc.).

**Acceptance Criteria**:
- [ ] AC-001: `LLMProvider` インターフェースを定義
- [ ] AC-002: GitHub Copilot LM API プロバイダーを実装
- [ ] AC-003: Anthropic Claude API プロバイダーを実装
- [ ] AC-004: OpenAI API プロバイダーを実装
- [ ] AC-005: 環境変数またはproject.ymlで使用するプロバイダーを設定可能
- [ ] AC-006: フォールバックプロバイダーを設定可能

---

### REQ-REPLAN-005: Plan Evaluation
**Type**: State-Driven
**Priority**: P1 (Should Have)
**Pattern**: While [state], the system shall [action]

**Statement**:
While a plan is executing, the system shall continuously evaluate plan progress and determine if replanning is beneficial.

**Acceptance Criteria**:
- [ ] AC-001: 各タスク完了後に進捗を評価
- [ ] AC-002: 目標達成までの残り工数を推定
- [ ] AC-003: より効率的なパスが見つかった場合に`BETTER_PATH_FOUND`を発火
- [ ] AC-004: 評価結果をメトリクスとして記録

---

### REQ-REPLAN-006: Swarm Pattern Integration
**Type**: Ubiquitous
**Priority**: P1 (Should Have)
**Pattern**: The system shall [action]

**Statement**:
The system shall integrate replanning capabilities with the existing SwarmPattern to enable dynamic task modification during parallel execution.

**Acceptance Criteria**:
- [ ] AC-001: SwarmPatternからReplanningEngineを利用可能
- [ ] AC-002: 並列実行中のタスク失敗時に代替タスクを追加
- [ ] AC-003: 依存関係グラフを動的に更新
- [ ] AC-004: 完了タスクの結果を新規タスクに引き継ぎ

---

### REQ-REPLAN-007: Sequential Pattern Integration
**Type**: Ubiquitous
**Priority**: P1 (Should Have)
**Pattern**: The system shall [action]

**Statement**:
The system shall integrate replanning capabilities with the existing SequentialPattern to enable step skip, insertion, and modification.

**Acceptance Criteria**:
- [ ] AC-001: SequentialPatternからReplanningEngineを利用可能
- [ ] AC-002: 失敗ステップのスキップまたは代替挿入
- [ ] AC-003: 条件付きステップの動的評価
- [ ] AC-004: ステップ間の状態引き継ぎを維持

---

### REQ-REPLAN-008: Workflow Orchestrator Integration
**Type**: Ubiquitous
**Priority**: P1 (Should Have)
**Pattern**: The system shall [action]

**Statement**:
The system shall integrate replanning capabilities with the WorkflowOrchestrator to enable checkpoint-based replanning and workflow recovery.

**Acceptance Criteria**:
- [ ] AC-001: チェックポイントからのリプラニング開始
- [ ] AC-002: ワークフロー定義の動的修正
- [ ] AC-003: サブワークフローの代替生成
- [ ] AC-004: ワークフロー状態の永続化と復元

---

### REQ-REPLAN-009: Replanning History and Audit
**Type**: Ubiquitous
**Priority**: P2 (Nice to Have)
**Pattern**: The system shall [action]

**Statement**:
The system shall maintain a complete history of all replanning decisions for audit, debugging, and learning purposes.

**Acceptance Criteria**:
- [ ] AC-001: リプラニングイベントをタイムスタンプ付きで記録
- [ ] AC-002: 元の計画と修正後の計画を比較可能
- [ ] AC-003: リプラニング理由を記録
- [ ] AC-004: JSON/Markdown形式でエクスポート可能
- [ ] AC-005: メトリクス（リプラニング回数、成功率等）を集計

---

### REQ-REPLAN-010: Human-in-the-Loop Replanning
**Type**: Optional
**Priority**: P2 (Nice to Have)
**Pattern**: Where [condition], the system shall [action]

**Statement**:
Where replanning involves high-risk changes or low-confidence alternatives, the system shall present options to the human operator for approval.

**Acceptance Criteria**:
- [ ] AC-001: 信頼度閾値を設定可能（デフォルト: 0.7）
- [ ] AC-002: 閾値以下の代替パスは人間承認を要求
- [ ] AC-003: 承認待ち状態でワークフローを一時停止
- [ ] AC-004: 承認/拒否/修正のオプションを提供
- [ ] AC-005: タイムアウト時の自動処理を設定可能

---

### REQ-REPLAN-011: CLI Integration
**Type**: Ubiquitous
**Priority**: P1 (Should Have)
**Pattern**: The system shall [action]

**Statement**:
The system shall provide CLI commands for replanning configuration, monitoring, and manual intervention.

**Acceptance Criteria**:
- [ ] AC-001: `musubi orchestrate --replan` でリプラニング有効化
- [ ] AC-002: `musubi orchestrate --replan-provider <provider>` でLLMプロバイダー指定
- [ ] AC-003: `musubi replan status` で現在のリプラニング状態を表示
- [ ] AC-004: `musubi replan history` でリプラニング履歴を表示
- [ ] AC-005: `musubi replan approve <plan-id>` で保留中のリプラニングを承認

---

### REQ-REPLAN-012: Configuration
**Type**: Ubiquitous
**Priority**: P1 (Should Have)
**Pattern**: The system shall [action]

**Statement**:
The system shall support replanning configuration through project.yml and environment variables.

**Acceptance Criteria**:
- [ ] AC-001: `project.yml` の `replanning` セクションで設定可能
- [ ] AC-002: 環境変数 `MUSUBI_REPLAN_ENABLED` で有効/無効切り替え
- [ ] AC-003: 環境変数 `MUSUBI_LLM_PROVIDER` でプロバイダー設定
- [ ] AC-004: プラットフォーム別APIキー設定
  - `GITHUB_COPILOT_TOKEN`
  - `ANTHROPIC_API_KEY`
  - `OPENAI_API_KEY`
- [ ] AC-005: デフォルト設定のオーバーライド可能

---

## Configuration Example

### project.yml

```yaml
replanning:
  enabled: true
  provider: auto  # auto | github-copilot | anthropic | openai
  
  triggers:
    - task-failed
    - timeout
    - goal-unreachable
    
  alternatives:
    maxCount: 3
    minConfidence: 0.7
    requireApproval: false  # true for high-risk replanning
    
  retry:
    maxAttempts: 3
    delayMs: 1000
    exponentialBackoff: true
    
  timeout:
    taskMs: 60000
    replanMs: 30000
    
  llm:
    model: auto  # auto-detect based on provider
    temperature: 0.3
    maxTokens: 2000
```

### Environment Variables

```bash
# LLM Provider
export MUSUBI_LLM_PROVIDER=github-copilot

# API Keys
export GITHUB_COPILOT_TOKEN=<token>
export ANTHROPIC_API_KEY=<key>
export OPENAI_API_KEY=<key>

# Replanning
export MUSUBI_REPLAN_ENABLED=true
export MUSUBI_REPLAN_MIN_CONFIDENCE=0.7
```

---

## Traceability Matrix

| Requirement | Design | Implementation | Test |
|-------------|--------|----------------|------|
| REQ-REPLAN-001 | DES-REPLAN-001 | replanning-engine.js | replanning.test.js |
| REQ-REPLAN-002 | DES-REPLAN-002 | replanning-engine.js | replanning.test.js |
| REQ-REPLAN-003 | DES-REPLAN-003 | alternative-generator.js | alternative.test.js |
| REQ-REPLAN-004 | DES-REPLAN-004 | llm-providers/*.js | llm-provider.test.js |
| REQ-REPLAN-005 | DES-REPLAN-005 | plan-evaluator.js | evaluator.test.js |
| REQ-REPLAN-006 | DES-REPLAN-006 | patterns/swarm.js | swarm-replan.test.js |
| REQ-REPLAN-007 | DES-REPLAN-007 | patterns/sequential.js | sequential-replan.test.js |
| REQ-REPLAN-008 | DES-REPLAN-008 | workflow-orchestrator.js | workflow-replan.test.js |
| REQ-REPLAN-009 | DES-REPLAN-009 | replan-history.js | history.test.js |
| REQ-REPLAN-010 | DES-REPLAN-010 | human-gate.js | human-gate.test.js |
| REQ-REPLAN-011 | DES-REPLAN-011 | bin/musubi-orchestrate.js | cli.test.js |
| REQ-REPLAN-012 | DES-REPLAN-012 | config/replanning-config.js | config.test.js |

---

## Non-Functional Requirements

### NFR-001: Performance
- リプラニング判断は100ms以内に完了すること
- LLM呼び出しは30秒以内にタイムアウト
- メモリ使用量は既存オーケストレーションの2倍以内

### NFR-002: Reliability
- リプラニングエンジンの障害がオーケストレーション全体を停止させないこと
- LLMプロバイダー障害時はフォールバックまたはリプラニング無効化

### NFR-003: Security
- APIキーは環境変数または安全なシークレット管理で保持
- LLMに送信するコンテキストから機密情報を除外

### NFR-004: Compatibility
- 既存のオーケストレーションパターンとの後方互換性を維持
- リプラニング無効時は既存動作と同一

---

## Glossary

| Term | Definition |
|------|------------|
| **Replanning** | 実行中の計画を動的に修正すること |
| **Alternative Path** | 失敗したタスクの代わりに目標達成するための代替手順 |
| **LLM Provider** | LLM APIを提供するプラットフォーム（GitHub Copilot, Anthropic, OpenAI等） |
| **Plan History** | リプラニングの履歴記録 |
| **Confidence Score** | 代替パスの成功確率推定値（0.0-1.0） |

---

*Requirements generated by MUSUBI SDD v3.5.1*
