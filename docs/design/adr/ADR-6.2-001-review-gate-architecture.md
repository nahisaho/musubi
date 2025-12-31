# ADR-6.2-001: Review Gate Architecture

**ADR ID**: ADR-6.2-001
**Status**: Proposed
**Created**: 2025-12-31
**Author**: MUSUBI Team
**Requirements**: IMP-6.2-001-01, IMP-6.2-001-02, IMP-6.2-001-03, IMP-6.2-001-04

---

## Context

MUSUBI SDDワークフローには現在、明示的なレビューゲートが存在しません。YAGOKOROプロジェクト（v1.0.0〜v5.0.0）の開発経験から、以下の問題が特定されました：

1. 要件の曖昧さが設計段階で発覚する
2. 設計変更が実装後に必要になる
3. テストカバレッジの事後確認のみ
4. Constitutional Articles遵守の手動確認

レビューゲートを追加することで、各フェーズ間での品質チェックを自動化し、問題の早期発見を可能にする必要があります。

---

## Decision

### Architecture Pattern: Gate-Based Workflow

各ワークフローフェーズ（Requirements → Design → Tasks → Implement → Validate）の間に独立したReviewGateクラスを配置します。

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Requirements├────►│ Requirements├────►│   Design    │
│   Phase     │     │ ReviewGate  │     │   Phase     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐             │
                    │   Design    │◄────────────┘
                    │ ReviewGate  │
                    └──────┬──────┘
                           │
┌─────────────┐            │      ┌─────────────┐
│    Tasks    │◄───────────┘      │Implementation│
│   Phase     │──────────────────►│ ReviewGate   │
└─────────────┘                   └──────┬───────┘
                                         │
                    ┌─────────────┐       │
                    │  Validate   │◄──────┘
                    │   Phase     │
                    └─────────────┘
```

### Component Design

#### 1. Base ReviewGate Interface

```typescript
interface ReviewGate {
  id: string;
  name: string;
  validate(context: ReviewContext): Promise<ReviewResult>;
  generateReport(result: ReviewResult): Promise<string>;
  persistResult(result: ReviewResult): Promise<void>;
}
```

#### 2. Gate Implementations

| Gate | Trigger | Checks | Blockers |
|------|---------|--------|----------|
| RequirementsReviewGate | Requirements doc created | EARS compliance, Stakeholders, AC | Missing EARS, No AC |
| DesignReviewGate | Design doc created | C4 model, ADR, Constitution | Missing C4, Article violation |
| ImplementationReviewGate | Sprint completed | Coverage, Lint, Traceability | Coverage < 80%, Lint errors |

#### 3. ReviewPromptRegistry

統一的なプロンプト管理を提供：

```typescript
const REVIEW_PROMPTS = [
  { pattern: '#sdd-review-requirements', gate: RequirementsReviewGate },
  { pattern: '#sdd-review-design', gate: DesignReviewGate },
  { pattern: '#sdd-review-implementation', gate: ImplementationReviewGate },
  { pattern: '#sdd-review-all', gate: FullReviewGate },
];
```

---

## Alternatives Considered

### Alternative 1: Monolithic ReviewEngine

単一のReviewEngineクラスで全てのレビューを処理する。

**Pros**:
- シンプルな実装
- 共通ロジックの重複を避けられる

**Cons**:
- 単一責任原則違反
- テストが困難
- 新しいゲートタイプの追加が困難

**Rejected**: 拡張性と保守性を優先

### Alternative 2: Plugin-Based Architecture

各ゲートをプラグインとして動的にロードする。

**Pros**:
- 高い拡張性
- サードパーティゲートのサポート

**Cons**:
- 過度に複雑
- Phase -1 Gate（Anti-Abstraction）違反の可能性

**Rejected**: Constitutional Article VIII違反

---

## Consequences

### Positive

1. **独立したテスト**: 各ゲートは独立してユニットテスト可能
2. **拡張性**: 新しいゲートタイプの追加が容易
3. **明確な責任分離**: 各ゲートは特定のフェーズのみを担当
4. **AGENTS.md統合**: プロンプト追加で機能拡張可能

### Negative

1. **コード重複の可能性**: 共通チェックロジックが重複する可能性
2. **学習コスト**: 開発者は複数のゲートクラスを理解する必要
3. **設定の複雑さ**: 各ゲートに個別の設定が必要

### Mitigations

- 共通ロジックは`ReviewGateBase`クラスに抽出
- ドキュメントとサンプルを充実
- デフォルト設定を提供し、カスタマイズはオプショナルに

---

## Implementation Notes

### File Structure

```
src/review/
├── gates/
│   ├── base-review-gate.ts          # 共通基底クラス
│   ├── requirements-review-gate.ts
│   ├── design-review-gate.ts
│   └── implementation-review-gate.ts
├── checkers/
│   ├── ears-checker.ts
│   ├── c4-checker.ts
│   └── coverage-checker.ts
├── prompts/
│   └── review-prompt-registry.ts
└── index.ts
```

### Storage Structure

```
storage/reviews/
├── requirements/
│   └── {feature-id}-{timestamp}.yml
├── design/
│   └── {feature-id}-{timestamp}.yml
└── implementation/
    └── {feature-id}-{timestamp}.yml
```

---

## Related Decisions

- ADR-001: Constitutional Governance (existing)
- ADR-002: Skill-Based Architecture (existing)
- ADR-6.2-002: Traceability Storage Format (proposed)
- ADR-6.2-003: Phase -1 Gate Notification (proposed)

---

## References

- [IMP-6.2-001 Requirements](../../requirements/req_v6.2.md#imp-62-001-レビューステージのワークフロー統合)
- [Constitutional Article VII](../../../steering/rules/constitution.md#article-vii-simplicity-gate-phase--1-gate)
- [Constitutional Article VIII](../../../steering/rules/constitution.md#article-viii-anti-abstraction-gate-phase--1-gate)

---

**Status**: Proposed
**Decision Date**: TBD
**Reviewers**: MUSUBI Core Team
