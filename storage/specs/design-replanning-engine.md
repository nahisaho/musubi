# Design: Replanning Engine

**Design ID**: DES-REPLAN-001
**Version**: 1.0.0
**Status**: Draft
**Created**: 2025-12-08
**Related Requirements**: REQ-REPLAN-001 〜 REQ-REPLAN-012

---

## 1. Architecture Overview

### 1.1 C4 Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              External Systems                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ GitHub Copilot  │  │    Anthropic    │  │     OpenAI      │              │
│  │    LM API       │  │   Claude API    │  │   GPT API       │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                        │
│           └────────────────────┼────────────────────┘                        │
│                                │                                             │
│                                ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        MUSUBI SDD System                              │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │                    Replanning Engine                            │  │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │  │   │
│  │  │  │  Plan    │ │  Plan    │ │Alternative│ │   LLM Provider   │   │  │   │
│  │  │  │ Monitor  │ │Evaluator │ │ Generator │ │   Abstraction    │   │  │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                │                                      │   │
│  │                                ▼                                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │                 Orchestration Engine                            │  │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │  │   │
│  │  │  │  Swarm   │ │Sequential│ │ GroupChat│ │    Workflow      │   │  │   │
│  │  │  │ Pattern  │ │ Pattern  │ │ Pattern  │ │  Orchestrator    │   │  │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 C4 Container Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Replanning Engine Container                      │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        ReplanningEngine                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │ │
│  │  │ PlanMonitor │  │PlanEvaluator│  │ReplanHistory│                 │ │
│  │  │             │  │             │  │             │                 │ │
│  │  │ - watch()   │  │ - evaluate()│  │ - record()  │                 │ │
│  │  │ - trigger() │  │ - compare() │  │ - export()  │                 │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                │                                         │
│                                ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     AlternativeGenerator                            │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │ │
│  │  │ ContextAnalyzer │  │ PathGenerator   │  │ ConfidenceScorer│     │ │
│  │  │                 │  │                 │  │                 │     │ │
│  │  │ - analyze()     │  │ - generate()    │  │ - score()       │     │ │
│  │  │ - extractGoal() │  │ - rank()        │  │ - compare()     │     │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                │                                         │
│                                ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        LLM Provider Layer                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ ┌────────────┐  │ │
│  │  │ LLMProvider │  │ CopilotLM   │  │ AnthropicLM │ │  OpenAILM  │  │ │
│  │  │ (Interface) │  │  Provider   │  │  Provider   │ │  Provider  │  │ │
│  │  │             │  │             │  │             │ │            │  │ │
│  │  │ - complete()│◄─┤ - complete()│  │ - complete()│ │- complete()│  │ │
│  │  │ - embed()   │  │ - embed()   │  │ - embed()   │ │- embed()   │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ └────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 C4 Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Component Diagram                                │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      src/orchestration/replanning/                   │ │
│  │                                                                      │ │
│  │  ┌──────────────────┐        ┌──────────────────┐                   │ │
│  │  │ replanning-      │◄──────▶│ plan-monitor.js  │                   │ │
│  │  │ engine.js        │        │                  │                   │ │
│  │  │                  │        │ - ReplanTrigger  │                   │ │
│  │  │ - executeWith    │        │ - PlanMonitor    │                   │ │
│  │  │   Replanning()   │        └──────────────────┘                   │ │
│  │  │ - replan()       │                                               │ │
│  │  │ - addTask()      │        ┌──────────────────┐                   │ │
│  │  │ - removeTask()   │◄──────▶│ plan-evaluator.js│                   │ │
│  │  │ - reorderTasks() │        │                  │                   │ │
│  │  └────────┬─────────┘        │ - PlanEvaluator  │                   │ │
│  │           │                  │ - ProgressMetric │                   │ │
│  │           │                  └──────────────────┘                   │ │
│  │           │                                                         │ │
│  │           ▼                  ┌──────────────────┐                   │ │
│  │  ┌──────────────────┐       │ replan-history.js│                   │ │
│  │  │ alternative-     │       │                  │                   │ │
│  │  │ generator.js     │       │ - ReplanEvent    │                   │ │
│  │  │                  │       │ - ReplanHistory  │                   │ │
│  │  │ - AlternativeGen │       └──────────────────┘                   │ │
│  │  │ - ContextAnalyzer│                                               │ │
│  │  │ - PathGenerator  │                                               │ │
│  │  │ - ConfidenceScore│                                               │ │
│  │  └────────┬─────────┘                                               │ │
│  │           │                                                         │ │
│  │           ▼                                                         │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │                   src/llm-providers/                          │  │ │
│  │  │                                                               │  │ │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │  │ │
│  │  │  │ index.js   │ │ copilot.js │ │anthropic.js│ │ openai.js  │ │  │ │
│  │  │  │            │ │            │ │            │ │            │ │  │ │
│  │  │  │ LLMProvider│ │ CopilotLM  │ │AnthropicLM │ │ OpenAILM   │ │  │ │
│  │  │  │ Interface  │ │ Provider   │ │ Provider   │ │ Provider   │ │  │ │
│  │  │  │            │ │            │ │            │ │            │ │  │ │
│  │  │  │ createLLM  │ │ - complete │ │ - complete │ │ - complete │ │  │ │
│  │  │  │ Provider() │ │ - embed    │ │ - embed    │ │ - embed    │ │  │ │
│  │  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘ │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Class Design

### 2.1 Core Classes

```javascript
// ReplanTrigger Enum
const ReplanTrigger = {
  TASK_FAILED: 'task-failed',
  TIMEOUT: 'timeout',
  CONTEXT_CHANGED: 'context-changed',
  BETTER_PATH_FOUND: 'better-path-found',
  HUMAN_REQUEST: 'human-request',
  GOAL_UNREACHABLE: 'goal-unreachable'
};

// ReplanningEngine Class
class ReplanningEngine {
  constructor(orchestrationEngine, options = {}) {
    this.engine = orchestrationEngine;
    this.llmProvider = options.llmProvider;
    this.history = new ReplanHistory();
    this.monitor = new PlanMonitor(this);
    this.evaluator = new PlanEvaluator();
    this.generator = new AlternativeGenerator(this.llmProvider);
    this.config = { ...defaultConfig, ...options.config };
    this.currentPlan = null;
    this.planVersion = 0;
  }

  async executeWithReplanning(plan, options = {});
  async replan(trigger, context);
  addTask(task, position = 'end');
  removeTask(taskId);
  reorderTasks(taskIds);
  modifyTask(taskId, updates);
  getPlanHistory();
  getCurrentPlan();
}

// PlanMonitor Class
class PlanMonitor extends EventEmitter {
  constructor(replanningEngine) {
    this.engine = replanningEngine;
    this.triggers = new Map();
    this.watchers = [];
  }

  watch(context);
  unwatch(contextId);
  checkTriggers(result);
  emit(trigger, context);
}

// PlanEvaluator Class
class PlanEvaluator {
  constructor(options = {}) {
    this.metrics = new Map();
  }

  evaluate(plan, currentState);
  estimateRemaining(plan, currentStep);
  compareEfficiency(currentPath, alternativePath);
  calculateProgress(completed, total);
}

// AlternativeGenerator Class
class AlternativeGenerator {
  constructor(llmProvider) {
    this.llm = llmProvider;
    this.contextAnalyzer = new ContextAnalyzer();
    this.pathGenerator = new PathGenerator();
    this.confidenceScorer = new ConfidenceScorer();
  }

  async generateAlternatives(failedTask, context, options = {});
  async analyzeContext(context);
  async extractGoal(task, context);
  rankAlternatives(alternatives);
}

// ReplanHistory Class
class ReplanHistory {
  constructor() {
    this.events = [];
    this.snapshots = new Map();
  }

  record(event);
  getEvents(filter = {});
  exportMarkdown();
  exportJSON();
  getMetrics();
}
```

### 2.2 LLM Provider Interface

```javascript
// LLMProvider Interface
class LLMProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
  }

  /**
   * Complete a prompt
   * @param {string} prompt - The prompt to complete
   * @param {object} options - Completion options
   * @returns {Promise<string>} Completion result
   */
  async complete(prompt, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Generate embeddings for text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async embed(text) {
    throw new Error('Not implemented');
  }

  /**
   * Check if provider is available
   * @returns {Promise<boolean>} Availability status
   */
  async isAvailable() {
    throw new Error('Not implemented');
  }
}

// CopilotLMProvider (GitHub Copilot LM API)
class CopilotLMProvider extends LLMProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'github-copilot';
    this.token = config.token || process.env.GITHUB_COPILOT_TOKEN;
    this.endpoint = config.endpoint || 'https://api.githubcopilot.com/v1';
  }

  async complete(prompt, options = {});
  async embed(text);
  async isAvailable();
}

// AnthropicLMProvider
class AnthropicLMProvider extends LLMProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'anthropic';
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.model = config.model || 'claude-sonnet-4-20250514';
  }

  async complete(prompt, options = {});
  async embed(text);
  async isAvailable();
}

// OpenAILMProvider
class OpenAILMProvider extends LLMProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'openai';
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || 'gpt-4o';
  }

  async complete(prompt, options = {});
  async embed(text);
  async isAvailable();
}

// Factory function
function createLLMProvider(provider = 'auto', config = {}) {
  if (provider === 'auto') {
    // Auto-detect based on available API keys
    if (process.env.GITHUB_COPILOT_TOKEN) return new CopilotLMProvider(config);
    if (process.env.ANTHROPIC_API_KEY) return new AnthropicLMProvider(config);
    if (process.env.OPENAI_API_KEY) return new OpenAILMProvider(config);
    throw new Error('No LLM provider available');
  }

  switch (provider) {
    case 'github-copilot': return new CopilotLMProvider(config);
    case 'anthropic': return new AnthropicLMProvider(config);
    case 'openai': return new OpenAILMProvider(config);
    default: throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
```

---

## 3. Sequence Diagrams

### 3.1 Task Failure Replanning Flow

```
┌──────┐  ┌────────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────┐
│Client│  │Replanning  │  │   Plan   │  │Alternative │  │ LLMProvider  │  │Engine│
│      │  │  Engine    │  │  Monitor │  │ Generator  │  │              │  │      │
└──┬───┘  └─────┬──────┘  └────┬─────┘  └─────┬──────┘  └──────┬───────┘  └──┬───┘
   │            │              │              │                │             │
   │ execute()  │              │              │                │             │
   │───────────▶│              │              │                │             │
   │            │              │              │                │             │
   │            │ watch(ctx)   │              │                │             │
   │            │─────────────▶│              │                │             │
   │            │              │              │                │             │
   │            │              │ executeSkill │                │             │
   │            │──────────────┼──────────────┼────────────────┼────────────▶│
   │            │              │              │                │             │
   │            │              │   Task Failed (error)         │             │
   │            │◀─────────────┼──────────────┼────────────────┼─────────────│
   │            │              │              │                │             │
   │            │ checkTrigger │              │                │             │
   │            │─────────────▶│              │                │             │
   │            │              │              │                │             │
   │            │ TASK_FAILED  │              │                │             │
   │            │◀─────────────│              │                │             │
   │            │              │              │                │             │
   │            │ generateAlternatives()      │                │             │
   │            │────────────────────────────▶│                │             │
   │            │              │              │                │             │
   │            │              │              │ complete()     │             │
   │            │              │              │───────────────▶│             │
   │            │              │              │                │             │
   │            │              │              │ alternatives   │             │
   │            │              │              │◀───────────────│             │
   │            │              │              │                │             │
   │            │  alternatives (ranked)      │                │             │
   │            │◀────────────────────────────│                │             │
   │            │              │              │                │             │
   │            │ updatePlan() │              │                │             │
   │            │──────┐       │              │                │             │
   │            │      │       │              │                │             │
   │            │◀─────┘       │              │                │             │
   │            │              │              │                │             │
   │            │ recordHistory│              │                │             │
   │            │──────┐       │              │                │             │
   │            │      │       │              │                │             │
   │            │◀─────┘       │              │                │             │
   │            │              │              │                │             │
   │            │ continue execution          │                │             │
   │            │──────────────┼──────────────┼────────────────┼────────────▶│
   │            │              │              │                │             │
   │  result    │              │              │                │             │
   │◀───────────│              │              │                │             │
   │            │              │              │                │             │
```

### 3.2 Human-in-the-Loop Replanning Flow

```
┌──────┐  ┌────────────┐  ┌──────────────┐  ┌──────────┐
│Client│  │Replanning  │  │  HumanGate   │  │  Human   │
│      │  │  Engine    │  │              │  │ Operator │
└──┬───┘  └─────┬──────┘  └──────┬───────┘  └────┬─────┘
   │            │                │               │
   │ replan()   │                │               │
   │───────────▶│                │               │
   │            │                │               │
   │            │ alternatives   │               │
   │            │ (low confidence)               │
   │            │                │               │
   │            │ requireApproval│               │
   │            │───────────────▶│               │
   │            │                │               │
   │            │                │ present()     │
   │            │                │──────────────▶│
   │            │                │               │
   │            │                │   decision    │
   │            │                │◀──────────────│
   │            │                │               │
   │            │   approval     │               │
   │            │◀───────────────│               │
   │            │                │               │
   │            │ applyAlternative               │
   │            │──────┐         │               │
   │            │      │         │               │
   │            │◀─────┘         │               │
   │            │                │               │
   │  result    │                │               │
   │◀───────────│                │               │
   │            │                │               │
```

---

## 4. ADR (Architecture Decision Records)

### ADR-001: LLM Provider Abstraction Strategy

**Status**: Accepted

**Context**:
リプラニング機能は代替パス生成にLLMを使用する。
異なるプラットフォーム（GitHub Copilot, Anthropic, OpenAI）で動作する必要がある。

**Decision**:
Strategy パターンを使用してLLMプロバイダーを抽象化する。
`LLMProvider` 基底クラスを定義し、各プラットフォーム用の具象クラスを実装する。

**Rationale**:
- 新しいLLMプロバイダーの追加が容易
- テスト時にモックプロバイダーを使用可能
- プラットフォーム固有のコードを分離

**Consequences**:
- ✅ 拡張性が高い
- ✅ テスタビリティが向上
- ⚠️ プロバイダー間のAPI差異を吸収するコードが必要

---

### ADR-002: Replanning Trigger Event System

**Status**: Accepted

**Context**:
リプラニングは様々な条件で発動する必要がある（タスク失敗、タイムアウト、コンテキスト変更等）。

**Decision**:
EventEmitter パターンを使用してトリガーシステムを実装する。
`PlanMonitor` がイベントを監視し、条件に応じてトリガーを発火する。

**Rationale**:
- Node.jsのEventEmitterと整合性がある
- 既存のOrchestrationEngineのイベントシステムと統合可能
- 非同期処理との相性が良い

**Consequences**:
- ✅ 疎結合な設計
- ✅ 新しいトリガータイプの追加が容易
- ⚠️ イベントのデバッグが複雑になる可能性

---

### ADR-003: Alternative Path Confidence Scoring

**Status**: Accepted

**Context**:
LLMが生成する代替パスの信頼性を評価する必要がある。
低信頼度の代替パスは人間の承認を要求する。

**Decision**:
以下の要素に基づく信頼度スコア（0.0-1.0）を算出する：
1. LLMの自己評価（40%）
2. 類似タスクの過去成功率（30%）
3. リソース可用性（20%）
4. 複雑度スコア（10%）

**Rationale**:
- 複数の観点から信頼度を評価
- 過去データを活用した学習効果
- 人間介入の判断基準として機能

**Consequences**:
- ✅ リスクの定量化が可能
- ✅ 自動化と人間介入のバランス
- ⚠️ スコアリングロジックの調整が必要

---

### ADR-004: Plan History Storage Strategy

**Status**: Accepted

**Context**:
リプラニングの履歴を監査・デバッグ・学習目的で保存する必要がある。

**Decision**:
インメモリストレージをデフォルトとし、オプションでファイルシステムへの永続化をサポートする。
履歴はJSON形式で保存し、Markdownレポートへのエクスポート機能を提供する。

**Rationale**:
- シンプルな実装から開始
- 将来的なデータベース統合に拡張可能
- 人間が読みやすいレポート形式

**Consequences**:
- ✅ 実装がシンプル
- ✅ エクスポート形式の柔軟性
- ⚠️ 大量の履歴でメモリ使用量が増加

---

## 5. File Structure

```
src/
├── orchestration/
│   ├── replanning/
│   │   ├── index.js                  # Module exports
│   │   ├── replanning-engine.js      # Core replanning engine
│   │   ├── plan-monitor.js           # Trigger monitoring
│   │   ├── plan-evaluator.js         # Plan evaluation
│   │   ├── alternative-generator.js  # Alternative path generation
│   │   ├── replan-history.js         # History tracking
│   │   └── config.js                 # Default configuration
│   ├── patterns/
│   │   ├── swarm.js                  # Updated with replanning
│   │   └── sequential.js             # Updated with replanning
│   └── index.js                      # Updated exports
├── llm-providers/
│   ├── index.js                      # Provider factory
│   ├── base-provider.js              # Base class
│   ├── copilot-provider.js           # GitHub Copilot LM API
│   ├── anthropic-provider.js         # Anthropic Claude
│   └── openai-provider.js            # OpenAI GPT
└── config/
    └── replanning-config.js          # Configuration schema

bin/
└── musubi-orchestrate.js             # Updated with --replan options

tests/
├── orchestration/
│   └── replanning/
│       ├── replanning-engine.test.js
│       ├── plan-monitor.test.js
│       ├── plan-evaluator.test.js
│       ├── alternative-generator.test.js
│       └── replan-history.test.js
└── llm-providers/
    ├── copilot-provider.test.js
    ├── anthropic-provider.test.js
    └── openai-provider.test.js
```

---

## 6. Integration Points

### 6.1 OrchestrationEngine Integration

```javascript
// orchestration-engine.js への追加
class OrchestrationEngine extends EventEmitter {
  constructor(options = {}) {
    // ... existing code ...
    
    // Replanning integration
    this.replanningEngine = options.enableReplanning 
      ? new ReplanningEngine(this, options.replanning)
      : null;
  }

  async execute(patternName, options = {}) {
    if (this.replanningEngine && options.enableReplanning !== false) {
      return this.replanningEngine.executeWithReplanning(
        { pattern: patternName, ...options },
        options
      );
    }
    // ... existing execution logic ...
  }
}
```

### 6.2 SwarmPattern Integration

```javascript
// patterns/swarm.js への追加
class SwarmPattern extends BasePattern {
  async execute(context, engine) {
    // ... existing code ...

    for (let i = 0; i < batch.length; i++) {
      const result = batchResults[i];

      if (result.status === 'rejected') {
        // Replanning integration
        if (engine.replanningEngine) {
          const alternatives = await engine.replanningEngine.generateAlternatives(
            task, 
            { error: result.reason, context }
          );
          
          if (alternatives.length > 0) {
            // Add alternative task to pending
            const altTask = alternatives[0].task;
            pending.add(altTask.id);
            sortedTasks.push(altTask);
          }
        }
      }
    }
  }
}
```

---

*Design document generated by MUSUBI SDD v3.5.1*
