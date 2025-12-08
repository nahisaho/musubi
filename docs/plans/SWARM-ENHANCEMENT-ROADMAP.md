# Swarm Enhancement Roadmap

**Created**: 2025-12-09
**Based on**: SDD/Swarm Coding Research Analysis
**Goal**: OpenAI Agents SDK・AutoGen同等のマルチエージェントオーケストレーション能力

---

## Phase 1: Handoff & Triage Patterns (v3.8.0)

### Sprint 1.1: Handoff Pattern Foundation

| Task ID | タスク | 見積り | 依存 |
|---------|--------|--------|------|
| H-001 | `HandoffPattern` 基本クラス設計 | 2h | - |
| H-002 | `handoff()` 関数実装（エージェント委譲） | 3h | H-001 |
| H-003 | Handoff入力（EscalationData）実装 | 2h | H-002 |
| H-004 | Input Filters（履歴フィルタリング）実装 | 2h | H-003 |
| H-005 | `on_handoff` コールバック機構 | 2h | H-002 |
| H-006 | Handoff イベント発行 | 1h | H-005 |
| H-007 | 単体テスト (handoff.test.js) | 3h | H-001〜H-006 |

**成果物**:
```
src/orchestration/patterns/handoff.js
src/orchestration/handoff/
├── handoff-filters.js
├── escalation-data.js
└── index.js
tests/orchestration/patterns/handoff.test.js
```

### Sprint 1.2: Triage Pattern

| Task ID | タスク | 見積り | 依存 |
|---------|--------|--------|------|
| T-001 | `TriagePattern` クラス設計 | 2h | H-007 |
| T-002 | リクエスト分類ロジック実装 | 3h | T-001 |
| T-003 | 専門エージェントルーティング | 2h | T-002 |
| T-004 | フォールバックエージェント設定 | 1h | T-003 |
| T-005 | Triage→Handoff連携 | 2h | T-003, H-002 |
| T-006 | 単体テスト (triage.test.js) | 2h | T-001〜T-005 |
| T-007 | E2Eテスト (triage-handoff-e2e.test.js) | 3h | T-006, H-007 |

**成果物**:
```
src/orchestration/patterns/triage.js
tests/orchestration/patterns/triage.test.js
tests/e2e/triage-handoff-e2e.test.js
```

### Sprint 1.3: CLI & Documentation

| Task ID | タスク | 見積り | 依存 |
|---------|--------|--------|------|
| D-001 | `musubi-orchestrate handoff` サブコマンド | 2h | H-007 |
| D-002 | `musubi-orchestrate triage` サブコマンド | 2h | T-006 |
| D-003 | Pattern Registry に登録 | 1h | T-006 |
| D-004 | ドキュメント作成 (handoff-guide.md) | 2h | D-001 |
| D-005 | CHANGELOG 更新 | 0.5h | D-004 |
| D-006 | バージョン更新 → v3.8.0 | 0.5h | D-005 |

---

## Phase 2: Guardrails System (v3.9.0)

### Sprint 2.1: Input Guardrails

| Task ID | タスク | 見積り | 依存 |
|---------|--------|--------|------|
| G-001 | `Guardrail` 基底クラス設計 | 2h | - |
| G-002 | `InputGuardrail` 実装 | 3h | G-001 |
| G-003 | 入力検証ルール DSL | 2h | G-002 |
| G-004 | 並列実行での早期終了 | 2h | G-003 |
| G-005 | 単体テスト (input-guardrail.test.js) | 2h | G-002〜G-004 |

**成果物**:
```
src/orchestration/guardrails/
├── base-guardrail.js
├── input-guardrail.js
├── guardrail-rules.js
└── index.js
tests/orchestration/guardrails/input-guardrail.test.js
```

### Sprint 2.2: Output Guardrails

| Task ID | タスク | 見積り | 依存 |
|---------|--------|--------|------|
| G-006 | `OutputGuardrail` 実装 | 3h | G-001 |
| G-007 | 出力検証（安全チェック） | 3h | G-006 |
| G-008 | Constitutional Articles との連携 | 2h | G-007 |
| G-009 | 単体テスト (output-guardrail.test.js) | 2h | G-006〜G-008 |

**成果物**:
```
src/orchestration/guardrails/output-guardrail.js
src/orchestration/guardrails/safety-check.js
tests/orchestration/guardrails/output-guardrail.test.js
```

### Sprint 2.3: Guardrails Integration

| Task ID | タスク | 見積り | 依存 |
|---------|--------|--------|------|
| G-010 | OrchestrationEngine への統合 | 3h | G-005, G-009 |
| G-011 | SwarmPattern への統合 | 2h | G-010 |
| G-012 | HandoffPattern への統合 | 2h | G-010 |
| G-013 | `musubi-validate guardrails` コマンド | 2h | G-010 |
| G-014 | E2Eテスト | 3h | G-010〜G-013 |
| G-015 | ドキュメント・CHANGELOG | 2h | G-014 |

---

## Phase 3: Agent Loop (v4.0.0)

### Sprint 3.1: Agent Loop Core

| Task ID | タスク | 見積り | 依存 |
|---------|--------|--------|------|
| A-001 | `AgentLoop` クラス設計 | 3h | - |
| A-002 | ツール呼び出し→結果→LLM送信ループ | 4h | A-001 |
| A-003 | 完了判定ロジック | 2h | A-002 |
| A-004 | 最大イテレーション制限 | 1h | A-002 |
| A-005 | タイムアウト処理 | 1h | A-002 |
| A-006 | 単体テスト (agent-loop.test.js) | 3h | A-001〜A-005 |

**成果物**:
```
src/agents/agent-loop.js
tests/agents/agent-loop.test.js
```

### Sprint 3.2: Function Tools Auto-Registration

| Task ID | タスク | 見積り | 依存 |
|---------|--------|--------|------|
| F-001 | `@functionTool` デコレータ設計 | 2h | - |
| F-002 | JSDoc→パラメータスキーマ変換 | 3h | F-001 |
| F-003 | 型ヒント推論 | 2h | F-002 |
| F-004 | ツール自動登録機構 | 2h | F-003 |
| F-005 | 単体テスト | 2h | F-001〜F-004 |

**成果物**:
```
src/agents/function-tool.js
src/agents/schema-generator.js
tests/agents/function-tool.test.js
```

### Sprint 3.3: Agent Loop Integration

| Task ID | タスク | 見積り | 依存 |
|---------|--------|--------|------|
| A-007 | LLM Providers との統合 | 3h | A-006, F-005 |
| A-008 | Guardrails との統合 | 2h | A-006, G-010 |
| A-009 | Handoff との統合 | 2h | A-006, H-007 |
| A-010 | `musubi-agent run` コマンド | 2h | A-007 |
| A-011 | E2Eテスト | 4h | A-007〜A-010 |
| A-012 | ドキュメント・CHANGELOG | 2h | A-011 |

---

## Phase 4: Advanced Integrations (v4.1.0)

### Sprint 4.1: MCP統合強化

| Task ID | タスク | 見積り | 依存 |
|---------|--------|--------|------|
| M-001 | MCP Server Discovery | 3h | - |
| M-002 | MCP Tool Auto-Registration | 3h | M-001 |
| M-003 | MCP Context Provider | 2h | M-002 |
| M-004 | 既存MCPサーバー互換性テスト | 3h | M-003 |
| M-005 | ドキュメント | 2h | M-004 |

**成果物**:
```
src/integrations/mcp/
├── mcp-discovery.js
├── mcp-tool-registry.js
├── mcp-context-provider.js
└── index.js
```

### Sprint 4.2: Codebase Intelligence

| Task ID | タスク | 見積り | 依存 |
|---------|--------|--------|------|
| C-001 | Repository Map Generator | 4h | - |
| C-002 | AST解析によるコード構造抽出 | 4h | C-001 |
| C-003 | Codebase Embedding（オプション） | 6h | C-002 |
| C-004 | コンテキストウィンドウ最適化 | 3h | C-001 |
| C-005 | 単体テスト | 3h | C-001〜C-004 |
| C-006 | E2Eテスト・ドキュメント | 3h | C-005 |

**成果物**:
```
src/analyzers/repository-map.js
src/analyzers/ast-extractor.js
src/analyzers/codebase-embedding.js (optional)
```

---

## 総見積り

| Phase | バージョン | 機能 | 見積り時間 |
|-------|-----------|------|-----------|
| Phase 1 | v3.8.0 | Handoff + Triage | ~35h |
| Phase 2 | v3.9.0 | Guardrails | ~34h |
| Phase 3 | v4.0.0 | Agent Loop + Function Tools | ~40h |
| Phase 4 | v4.1.0 | MCP強化 + Codebase Intel | ~36h |
| **合計** | | | **~145h** |

---

## 優先順位付きタスクリスト（Phase 1 開始用）

### 🔴 Must Have (P0)

1. **H-001**: HandoffPattern 基本クラス設計
2. **H-002**: handoff() 関数実装
3. **T-001**: TriagePattern クラス設計
4. **T-002**: リクエスト分類ロジック

### 🟠 Should Have (P1)

5. **H-003**: Handoff入力実装
6. **H-004**: Input Filters
7. **T-003**: 専門エージェントルーティング
8. **T-005**: Triage→Handoff連携

### 🟡 Nice to Have (P2)

9. **H-005**: on_handoff コールバック
10. **T-004**: フォールバックエージェント
11. **D-004**: ドキュメント作成

---

## 次のアクション

1. [ ] Phase 1 Sprint 1.1 開始
2. [ ] H-001: HandoffPattern 基本クラス設計から着手
3. [ ] ブランチ作成: `feature/handoff-triage-patterns`
