# ADR-6.2-002: Traceability Storage Format

**ADR ID**: ADR-6.2-002
**Status**: Proposed
**Created**: 2025-12-31
**Author**: MUSUBI Team
**Requirements**: IMP-6.2-004-01, IMP-6.2-004-02

---

## Context

MUSUBIのトレーサビリティ機能（IMP-6.2-004）では、要件ID（REQ-XXX-NNN、IMP-X.X-XXX-NN）とコード、テスト、コミットの対応関係を自動抽出・保存する必要があります。

保存形式の選択は以下の要件に影響します：
- 読みやすさ（人間による確認）
- Gitでのdiff表示
- クエリ性能
- スケーラビリティ

---

## Decision

### Primary Storage: YAML Format

トレーサビリティマトリクスをYAML形式で`storage/traceability/matrix.yml`に保存します。

```yaml
# storage/traceability/matrix.yml

version: "1.0"
lastUpdated: "2025-12-31T12:00:00Z"
scanConfig:
  patterns:
    - "REQ-[A-Z0-9]+-\\d{3}"
    - "IMP-\\d+\\.\\d+-\\d{3}(?:-\\d{2})?"
  includeGlobs:
    - "src/**/*.ts"
    - "tests/**/*.test.ts"
  excludeGlobs:
    - "node_modules/**"

requirements:
  IMP-6.2-001-01:
    title: "Requirements Review Gate"
    design:
      - path: "docs/design/IMP-6.2-review-workflow-design.md"
        section: "3.1"
        lastVerified: "2025-12-31"
    code:
      - path: "src/review/gates/requirements-review-gate.ts"
        line: 15
        type: "class"
        lastVerified: "2025-12-31"
    tests:
      - path: "tests/review/requirements-review-gate.test.ts"
        line: 25
        description: "should validate EARS compliance"
        lastVerified: "2025-12-31"
    commits:
      - sha: "abc1234"
        message: "feat(review): implement requirements review gate [IMP-6.2-001-01]"
        date: "2025-12-31"
    status: "fully-traced"  # fully-traced | partial | untraced

summary:
  totalRequirements: 18
  fullyTraced: 15
  partiallyTraced: 2
  untraced: 1
  coveragePercent: 94.4
```

### Index Files for Performance

大規模プロジェクト向けに、クイックルックアップ用のインデックスファイルを生成：

```yaml
# storage/traceability/index.yml

byFile:
  "src/review/gates/requirements-review-gate.ts":
    - IMP-6.2-001-01
    - IMP-6.2-001-04
  "src/review/checkers/ears-checker.ts":
    - IMP-6.2-001-01

byStatus:
  untraced:
    - IMP-6.2-008-02
  partial:
    - IMP-6.2-006-01
    - IMP-6.2-006-02
```

---

## Alternatives Considered

### Alternative 1: JSON Format

```json
{
  "requirements": {
    "IMP-6.2-001-01": {
      "code": [{ "path": "src/...", "line": 15 }]
    }
  }
}
```

**Pros**:
- プログラムでの解析が容易
- 広くサポートされている

**Cons**:
- コメントをサポートしない
- 可読性が低い
- Gitでのdiffが見にくい

**Rejected**: 可読性とGit互換性を優先

### Alternative 2: SQLite Database

```sql
CREATE TABLE traceability_links (
  requirement_id TEXT,
  source_type TEXT,
  source_path TEXT,
  source_line INTEGER
);
```

**Pros**:
- 高速クエリ
- 大規模データに対応
- 複雑なクエリが可能

**Cons**:
- バイナリファイルでGit diffが不可
- 追加の依存関係
- オーバーエンジニアリング

**Rejected**: Article VII（Simplicity）違反、Git互換性の欠如

### Alternative 3: Markdown Tables

```markdown
| Requirement | Design | Code | Test | Commit |
|-------------|--------|------|------|--------|
| IMP-6.2-001-01 | ✓ | ✓ | ✓ | ✓ |
```

**Pros**:
- 高い可読性
- GitHub/GitLabでレンダリング可能

**Cons**:
- プログラムでの解析が困難
- 詳細情報を含められない
- 自動更新が困難

**Rejected**: 自動化との相性が悪い

---

## Consequences

### Positive

1. **可読性**: 人間が直接ファイルを確認・編集可能
2. **Git互換**: diffが明確に表示される
3. **一貫性**: 既存のMUSUBI設定ファイル（project.yml等）と同形式
4. **コメント**: YAML形式はコメントをサポート

### Negative

1. **性能**: 10,000件以上の要件では読み込みが遅くなる可能性
2. **複雑なクエリ**: SQLのような柔軟なクエリは困難
3. **型安全性**: スキーマ検証が必要

### Mitigations

- **性能**: インデックスファイルでクイックルックアップを提供
- **将来の拡張**: 必要に応じてSQLiteへの移行パスを用意
- **スキーマ検証**: JSON Schemaでバリデーション

---

## Schema Definition

```yaml
# schemas/traceability-matrix.schema.yml

type: object
required:
  - version
  - requirements
properties:
  version:
    type: string
    pattern: "^\\d+\\.\\d+$"
  lastUpdated:
    type: string
    format: date-time
  requirements:
    type: object
    additionalProperties:
      type: object
      properties:
        title:
          type: string
        design:
          type: array
          items:
            type: object
            required: [path]
            properties:
              path: { type: string }
              section: { type: string }
        code:
          type: array
          items:
            type: object
            required: [path, line]
        tests:
          type: array
          items:
            type: object
            required: [path]
        commits:
          type: array
          items:
            type: object
            required: [sha, message]
        status:
          type: string
          enum: [fully-traced, partial, untraced]
```

---

## Migration Path

将来的にSQLiteが必要になった場合の移行計画：

1. YAML→SQLiteインポーター作成
2. 両形式での並行運用期間
3. SQLiteをプライマリに切り替え
4. YAMLエクスポート機能を維持（可読性用）

---

## Related Decisions

- ADR-6.2-001: Review Gate Architecture
- ADR-6.2-003: Phase -1 Gate Notification

---

## References

- [IMP-6.2-004 Requirements](../../requirements/req_v6.2.md#imp-62-004-双方向トレーサビリティマトリクス)
- [Article V: Traceability Mandate](../../../steering/rules/constitution.md#article-v-traceability-mandate)

---

**Status**: Proposed
**Decision Date**: TBD
**Reviewers**: MUSUBI Core Team
