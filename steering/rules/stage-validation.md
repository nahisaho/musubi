# Stage Validation Guide

ステージ間の自動検証とフィードバックループのガイド。

## ステージ検証コマンド

各ステージ完了時に実行する検証コマンド：

```bash
# 要件定義完了時
musubi-validate requirements

# 設計完了時
musubi-validate design

# タスク分解完了時
musubi-validate tasks

# 実装完了時（テスト前）
musubi-validate implementation

# 全体検証
musubi-validate all
```

## ステージ遷移チェックリスト

### Requirements → Design

**必須条件**:
- [ ] すべての要件が EARS 形式で記述されている
- [ ] 各要件にユニーク ID がある（REQ-XXX-NNN）
- [ ] すべての要件がテスト可能
- [ ] 優先度（MoSCoW）が設定されている
- [ ] ステークホルダーレビュー完了

**検証コマンド**:
```bash
musubi-validate requirements
musubi-trace matrix --check-gaps
```

**ゲートキーパー**: Product Manager / System Architect

---

### Design → Tasks

**必須条件**:
- [ ] すべての要件が設計コンポーネントにマッピングされている
- [ ] アーキテクチャが `steering/structure.md` に準拠
- [ ] 技術スタックが `steering/tech.md` に準拠
- [ ] C4 ダイアグラムが作成されている
- [ ] ADR（Architecture Decision Records）が記録されている
- [ ] セキュリティ・パフォーマンス考慮事項が文書化

**検証コマンド**:
```bash
musubi-validate design
musubi-gaps detect --stage design
```

**ゲートキーパー**: System Architect / Tech Lead

---

### Tasks → Implementation

**必須条件**:
- [ ] すべての要件にタスクが割り当てられている
- [ ] タスク依存関係が明確
- [ ] 各タスクに完了条件がある
- [ ] 工数見積もりがある
- [ ] 100% 要件カバレッジ

**検証コマンド**:
```bash
musubi-validate tasks
musubi-trace coverage --requirements
```

**ゲートキーパー**: Project Manager / Tech Lead

---

### Implementation → Testing

**必須条件**:
- [ ] すべてのタスクが完了
- [ ] コードレビュー承認済み
- [ ] ユニットテストカバレッジ ≥ 80%
- [ ] Lint/Format エラーなし
- [ ] クリティカルバグなし

**検証コマンド**:
```bash
npm test
npm run lint
musubi-validate implementation
```

**ゲートキーパー**: Tech Lead

---

### Testing → Deployment

**必須条件**:
- [ ] すべての EARS 要件にテストケースがある
- [ ] すべてのテストがパス
- [ ] パフォーマンステストが NFR を満たす
- [ ] セキュリティテストがパス
- [ ] テストカバレッジレポート生成

**検証コマンド**:
```bash
npm run test:coverage
musubi-validate testing
musubi-trace coverage --tests
```

**ゲートキーパー**: QA Lead

---

### Deployment → Monitoring

**必須条件**:
- [ ] ステージングデプロイ成功
- [ ] スモークテストパス
- [ ] 本番デプロイ成功
- [ ] ヘルスチェック正常
- [ ] 監視・アラート設定完了
- [ ] ロールバック手順テスト済み

**検証コマンド**:
```bash
musubi-validate deployment
```

**ゲートキーパー**: DevOps Lead / SRE

---

## フィードバックループ

### テスト → 要件へのフィードバック

テストで問題が見つかった場合：

1. **バグ**: Implementation に戻る
2. **要件漏れ**: Requirements に戻り EARS 要件を追加
3. **設計問題**: Design に戻りアーキテクチャ修正

```
Testing ──[Bug]────────→ Implementation
    │
    ├──[Requirement Gap]──→ Requirements
    │
    └──[Design Issue]─────→ Design
```

### 監視 → 改善へのフィードバック

本番での問題発見時：

1. **パフォーマンス問題**: NFR を見直し、Design 修正
2. **セキュリティ問題**: Security Audit → Design 修正
3. **機能要望**: Requirements に新規要件追加

---

## 振り返りチェックリスト

各イテレーション/リリース後に実施：

### プロセス振り返り

- [ ] ワークフローのボトルネックはどこか？
- [ ] スキップされたステージはあるか？
- [ ] 手戻りが多かったステージはどこか？
- [ ] 検証で見逃した問題はあるか？

### 成果物振り返り

- [ ] 要件の品質は十分だったか？
- [ ] 設計は実装を適切にガイドしたか？
- [ ] テストは問題を検出できたか？
- [ ] ドキュメントは最新に保たれたか？

### 改善アクション

振り返り結果は `steering/memories/lessons_learned.md` に記録。

---

## 自動検証の設定

### CI/CD での検証

`.github/workflows/validate.yml` で自動検証を設定：

```yaml
name: SDD Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npx musubi-validate all
```

---

## 関連ドキュメント

- `steering/rules/workflow.md` - 完全なワークフローガイド
- `steering/rules/ears-format.md` - EARS 形式ガイド
- `steering/rules/constitution.md` - 9条憲法
- `steering/memories/lessons_learned.md` - 振り返り記録
