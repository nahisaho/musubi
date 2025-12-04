# Lessons Learned

Insights and improvements for musubi-sdd.

## [2025-12-05] ワークフロー改善 - ステージ検証の導入

**Challenge**: ステージ間の遷移で品質チェックが不十分だった

**Solution**: `steering/rules/stage-validation.md` を作成し、各ステージの完了条件と検証コマンドを明文化

**Result**: ステージ遷移時のチェックリストと自動検証の基盤が整備された

**Learning**: フィードバックループを明示することで、手戻りが発生した場合の対処が明確になる

---

## [2025-11-22] MUSUBI Onboarding

**Challenge**: Manual project setup is time-consuming

**Solution**: Automated onboarding with codebase analysis

**Result**: Project successfully integrated with MUSUBI SDD

**Learning**: Automated analysis provides good starting point, but human review and customization is essential

---

## Retrospective Template

イテレーション/リリース後の振り返りテンプレート：

```markdown
## [YYYY-MM-DD] Sprint/Release X.X 振り返り

### What Went Well 👍
- [良かった点]

### What Could Be Improved 🔧
- [改善点]

### Action Items 📋
- [ ] [具体的なアクション]

### Metrics
- 要件数: X
- タスク完了率: X%
- バグ発見数: X（テスト時: X、本番: X）
- 手戻り回数: X
```

---

## Template for New Lessons

```markdown
## [YYYY-MM-DD] Lesson Title

**Challenge**: What problem was faced

**Solution**: How it was solved

**Result**: What was the outcome

**Learning**: What was learned for future
```
