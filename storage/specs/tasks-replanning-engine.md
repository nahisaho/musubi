# Task Breakdown: Replanning Engine

**Task ID**: TSK-REPLAN-001
**Version**: 1.0.0
**Created**: 2025-12-08
**Related Design**: DES-REPLAN-001
**Related Requirements**: REQ-REPLAN-001 〜 REQ-REPLAN-012

---

## Phase 1: Core Components (Estimated: 3-4 hours)

### 1.1 LLM Provider Layer

| Task ID | Task | Priority | Effort | Dependencies |
|---------|------|----------|--------|--------------|
| TSK-LLM-001 | `src/llm-providers/base-provider.js` - 基底クラス作成 | P0 | 30min | - |
| TSK-LLM-002 | `src/llm-providers/copilot-provider.js` - GitHub Copilot LM API実装 | P0 | 45min | TSK-LLM-001 |
| TSK-LLM-003 | `src/llm-providers/anthropic-provider.js` - Anthropic Claude API実装 | P1 | 45min | TSK-LLM-001 |
| TSK-LLM-004 | `src/llm-providers/openai-provider.js` - OpenAI GPT API実装 | P1 | 45min | TSK-LLM-001 |
| TSK-LLM-005 | `src/llm-providers/index.js` - Factory関数とエクスポート | P0 | 20min | TSK-LLM-001〜004 |

### 1.2 Replanning Core

| Task ID | Task | Priority | Effort | Dependencies |
|---------|------|----------|--------|--------------|
| TSK-RPL-001 | `src/orchestration/replanning/config.js` - デフォルト設定 | P0 | 15min | - |
| TSK-RPL-002 | `src/orchestration/replanning/plan-monitor.js` - トリガー監視 | P0 | 45min | TSK-RPL-001 |
| TSK-RPL-003 | `src/orchestration/replanning/plan-evaluator.js` - プラン評価 | P0 | 45min | - |
| TSK-RPL-004 | `src/orchestration/replanning/alternative-generator.js` - 代替パス生成 | P0 | 60min | TSK-LLM-005 |
| TSK-RPL-005 | `src/orchestration/replanning/replan-history.js` - 履歴管理 | P1 | 30min | - |
| TSK-RPL-006 | `src/orchestration/replanning/replanning-engine.js` - コアエンジン | P0 | 90min | TSK-RPL-001〜005 |
| TSK-RPL-007 | `src/orchestration/replanning/index.js` - モジュールエクスポート | P0 | 10min | TSK-RPL-006 |

---

## Phase 2: Pattern Integration (Estimated: 2-3 hours)

### 2.1 Existing Pattern Updates

| Task ID | Task | Priority | Effort | Dependencies |
|---------|------|----------|--------|--------------|
| TSK-PAT-001 | `src/orchestration/patterns/swarm.js` - Replanning統合 | P0 | 45min | TSK-RPL-006 |
| TSK-PAT-002 | `src/orchestration/patterns/sequential.js` - Replanning統合 | P1 | 45min | TSK-RPL-006 |
| TSK-PAT-003 | `src/orchestration/workflow-orchestrator.js` - Replanning統合 | P1 | 60min | TSK-RPL-006 |

### 2.2 Engine Integration

| Task ID | Task | Priority | Effort | Dependencies |
|---------|------|----------|--------|--------------|
| TSK-ENG-001 | `src/orchestration/orchestration-engine.js` - Replanning統合 | P0 | 45min | TSK-RPL-006 |
| TSK-ENG-002 | `src/orchestration/index.js` - エクスポート更新 | P0 | 15min | TSK-ENG-001 |

---

## Phase 3: CLI & Configuration (Estimated: 1-2 hours)

### 3.1 CLI Updates

| Task ID | Task | Priority | Effort | Dependencies |
|---------|------|----------|--------|--------------|
| TSK-CLI-001 | `bin/musubi-orchestrate.js` - `--replan` オプション追加 | P1 | 30min | TSK-ENG-001 |
| TSK-CLI-002 | `bin/musubi-orchestrate.js` - `--replan-config` オプション追加 | P2 | 20min | TSK-CLI-001 |

### 3.2 Configuration

| Task ID | Task | Priority | Effort | Dependencies |
|---------|------|----------|--------|--------------|
| TSK-CFG-001 | `steering/project.yml` - replanning設定スキーマ追加 | P1 | 20min | - |
| TSK-CFG-002 | `steering/project.yml.README.md` - ドキュメント更新 | P2 | 15min | TSK-CFG-001 |

---

## Phase 4: Testing (Estimated: 2-3 hours)

### 4.1 Unit Tests

| Task ID | Task | Priority | Effort | Dependencies |
|---------|------|----------|--------|--------------|
| TSK-TST-001 | `tests/llm-providers/base-provider.test.js` | P0 | 20min | TSK-LLM-001 |
| TSK-TST-002 | `tests/llm-providers/copilot-provider.test.js` | P0 | 30min | TSK-LLM-002 |
| TSK-TST-003 | `tests/llm-providers/anthropic-provider.test.js` | P1 | 30min | TSK-LLM-003 |
| TSK-TST-004 | `tests/llm-providers/openai-provider.test.js` | P1 | 30min | TSK-LLM-004 |
| TSK-TST-005 | `tests/orchestration/replanning/plan-monitor.test.js` | P0 | 30min | TSK-RPL-002 |
| TSK-TST-006 | `tests/orchestration/replanning/plan-evaluator.test.js` | P0 | 30min | TSK-RPL-003 |
| TSK-TST-007 | `tests/orchestration/replanning/alternative-generator.test.js` | P0 | 45min | TSK-RPL-004 |
| TSK-TST-008 | `tests/orchestration/replanning/replanning-engine.test.js` | P0 | 60min | TSK-RPL-006 |

### 4.2 Integration Tests

| Task ID | Task | Priority | Effort | Dependencies |
|---------|------|----------|--------|--------------|
| TSK-TST-009 | `tests/orchestration/replanning/integration.test.js` | P0 | 60min | TSK-TST-001〜008 |

---

## Implementation Order (Recommended)

### Step 1: Foundation (Must Have)
```
TSK-LLM-001 → TSK-LLM-002 → TSK-LLM-005
       ↓
TSK-RPL-001 → TSK-RPL-002 → TSK-RPL-003 → TSK-RPL-004 → TSK-RPL-006 → TSK-RPL-007
```

### Step 2: Integration (Must Have)
```
TSK-ENG-001 → TSK-ENG-002 → TSK-PAT-001
```

### Step 3: Testing (Must Have)
```
TSK-TST-001 → TSK-TST-002 → TSK-TST-005 → TSK-TST-006 → TSK-TST-007 → TSK-TST-008 → TSK-TST-009
```

### Step 4: Enhancements (Should Have)
```
TSK-LLM-003, TSK-LLM-004 (並列)
TSK-PAT-002, TSK-PAT-003 (並列)
TSK-CLI-001 → TSK-CLI-002
TSK-CFG-001 → TSK-CFG-002
```

---

## Summary

| Phase | Total Tasks | P0 Tasks | Estimated Effort |
|-------|-------------|----------|------------------|
| Phase 1: Core | 12 | 8 | 3-4 hours |
| Phase 2: Integration | 5 | 3 | 2-3 hours |
| Phase 3: CLI & Config | 4 | 0 | 1-2 hours |
| Phase 4: Testing | 9 | 7 | 2-3 hours |
| **Total** | **30** | **18** | **8-12 hours** |

---

## Traceability Matrix

| Requirement | Tasks |
|-------------|-------|
| REQ-REPLAN-001 | TSK-RPL-002 |
| REQ-REPLAN-002 | TSK-RPL-006 |
| REQ-REPLAN-003 | TSK-RPL-004 |
| REQ-REPLAN-004 | TSK-LLM-001〜005 |
| REQ-REPLAN-005 | TSK-RPL-003 |
| REQ-REPLAN-006 | TSK-PAT-001 |
| REQ-REPLAN-007 | TSK-PAT-002 |
| REQ-REPLAN-008 | TSK-PAT-003 |
| REQ-REPLAN-009 | TSK-RPL-005 |
| REQ-REPLAN-010 | TSK-RPL-006 |
| REQ-REPLAN-011 | TSK-CLI-001, TSK-CLI-002 |
| REQ-REPLAN-012 | TSK-CFG-001, TSK-CFG-002 |

---

*Task breakdown generated by MUSUBI SDD v3.5.1*
