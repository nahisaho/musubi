# FAQ & Troubleshooting Guide

よくある質問とトラブルシューティングガイド

---

## 📋 Table of Contents

1. [Frequently Asked Questions](#frequently-asked-questions)
2. [Installation Issues](#installation-issues)
3. [Validation Errors](#validation-errors)
4. [Orchestration Problems](#orchestration-problems)
5. [Platform-Specific Issues](#platform-specific-issues)
6. [CI/CD Issues](#cicd-issues)
7. [Performance Optimization](#performance-optimization)
8. [Migration Guide](#migration-guide)

---

## Frequently Asked Questions

### General

#### Q: MUSUBIとは何ですか？

**A:** MUSUBI (結び) は、仕様駆動開発 (SDD) フレームワークです。コードを書く前に仕様を定義し、その仕様から設計、実装、テストを自動生成・管理します。

#### Q: 既存プロジェクトでも使えますか？

**A:** はい。`musubi init --mode brownfield` でDelta仕様を使用し、段階的に導入できます。

```bash
# 既存プロジェクトへの導入
cd existing-project
npx musubi-sdd init --mode brownfield
```

#### Q: どのAIコーディングアシスタントと互換性がありますか？

**A:** 13以上のプラットフォームに対応しています：

| プラットフォーム | サポート状況 |
|---------------|------------|
| Claude Code | ✅ Primary |
| GitHub Copilot | ✅ Full |
| Cursor | ✅ Full |
| Windsurf | ✅ Full |
| Gemini CLI | ✅ Full |
| Codex CLI | ✅ Full |
| Aider | ✅ Basic |
| Continue | ✅ Basic |
| その他 | ✅ Universal via AGENTS.md |

#### Q: 無料で使えますか？

**A:** はい。MUSUBIはMITライセンスで完全無料・オープンソースです。

---

### Concepts

#### Q: EARS形式とは何ですか？

**A:** EARS (Easy Approach to Requirements Syntax) は、要件を標準的なパターンで記述する方法です：

| タイプ | パターン | 例 |
|-------|---------|-----|
| Ubiquitous | The system shall... | The system shall encrypt passwords |
| Event-Driven | When X, the system shall... | When login fails, the system shall log |
| State-Driven | While X, the system shall... | While offline, the system shall queue |
| Optional | Where X, the system shall... | Where enabled, the system shall show |

#### Q: 9条とは何ですか？

**A:** MUSUBI Constitutionの9つの不変ルールです：

1. 仕様優先
2. 憲法優位
3. EARS準拠
4. トレーサビリティ
5. 変更追跡
6. 品質ゲート
7. ドキュメント
8. テスト
9. 継続的改善

#### Q: P-Labelとは何ですか？

**A:** タスクの優先度を示すラベルです：

- **P0**: クリティカル（すべてをブロック）
- **P1**: 高優先度（すぐに実行）
- **P2**: 中優先度（通常）
- **P3**: 低優先度（バックグラウンド/オプション）

---

## Installation Issues

### Issue: npm install fails

**症状:**
```
npm ERR! code EACCES
npm ERR! syscall mkdir
```

**解決策:**
```bash
# 方法1: npxを使用
npx musubi-sdd init

# 方法2: ユーザーディレクトリにインストール
npm install -g musubi-sdd --prefix ~/.npm-global

# 方法3: sudoを使用（推奨しない）
sudo npm install -g musubi-sdd
```

### Issue: Node.js version error

**症状:**
```
Error: musubi-sdd requires Node.js >= 18.0.0
```

**解決策:**
```bash
# nvmでバージョン管理
nvm install 20
nvm use 20

# または直接インストール
# https://nodejs.org/ から LTS をダウンロード
```

### Issue: Command not found

**症状:**
```bash
$ musubi-sdd
bash: musubi-sdd: command not found
```

**解決策:**
```bash
# PATHを確認
echo $PATH

# npm global binディレクトリを追加
export PATH="$PATH:$(npm config get prefix)/bin"

# または npx を使用
npx musubi-sdd --help
```

---

## Validation Errors

### Issue: EARS validation failed

**症状:**
```
EARS Validation Error: Requirement does not match EARS pattern
Line 15: "Users can login with email"
```

**解決策:**

```markdown
# ❌ 間違った形式
Users can login with email

# ✅ 正しい形式（Event-Driven）
When a user submits login credentials, the system shall authenticate using email and password.
```

**有効なEARSパターン:**
- `The system shall...`
- `When <trigger>, the system shall...`
- `While <state>, the system shall...`
- `Where <condition>, the system shall...`

### Issue: Constitution violation

**症状:**
```
Constitutional Violation: Article 4 - Missing traceability
Files without requirement links: src/auth.js, src/user.js
```

**解決策:**
```javascript
// ❌ リンクなし
function authenticate(user, password) {
  // ...
}

// ✅ 要件リンクあり
/**
 * Authenticates user credentials
 * @requirement REQ-AUTH-001
 */
function authenticate(user, password) {
  // REQ-AUTH-001: User authentication
  // ...
}
```

### Issue: Traceability gap

**症状:**
```
Traceability Gap: 5 requirements without implementation
- REQ-AUTH-003
- REQ-USER-001
- REQ-USER-002
```

**解決策:**
```bash
# 詳細を確認
npx musubi-gaps --verbose

# 出力例:
# REQ-AUTH-003: Not implemented
#   Expected in: src/auth/mfa.js
#   Action: Implement MFA functionality

# 実装後に再検証
npx musubi-trace
```

### Issue: Delta spec validation failed

**症状:**
```
Delta Specification Error: Missing impact analysis
Change: auth-v2.md
```

**解決策:**
```markdown
# storage/changes/auth-v2.md

## Change Request

### Summary
Add OAuth2 support

### Impact Analysis  <!-- 必須セクション -->
- Affected Files: src/auth/*, tests/auth/*
- Risk Level: Medium
- Dependencies: oauth2-client library

### Requirements Changed
- REQ-AUTH-001: Modified
- REQ-AUTH-010: New

### Rollback Plan  <!-- 推奨 -->
Revert commit abc123
```

---

## Orchestration Problems

### Issue: Skill not found

**症状:**
```
Error: Skill 'my-custom-skill' not found in registry
```

**解決策:**
```javascript
const { SkillRegistry } = require('musubi-sdd');

// スキルを登録
const registry = new SkillRegistry();
registry.registerSkill({
  id: 'my-custom-skill',
  name: 'My Custom Skill',
  category: 'custom',
  handler: async (input) => {
    return { success: true, result: 'done' };
  }
});

// 登録済みスキルを確認
console.log(registry.listSkills());
```

### Issue: Parallel execution timeout

**症状:**
```
Error: Parallel execution timed out after 30000ms
```

**解決策:**
```javascript
// タイムアウトを延長
const engine = new OrchestrationEngine({
  timeout: 120000, // 2分
  retryAttempts: 3
});

// または個別に設定
await engine.executePattern('parallel', {
  skills: ['skill-a', 'skill-b'],
  options: {
    timeout: 60000,
    failFast: false
  }
});
```

### Issue: Handoff context lost

**症状:**
```
Warning: Handoff context incomplete
Missing: previous_analysis, requirements
```

**解決策:**
```javascript
// ハンドオフ時にコンテキストを明示的に渡す
await engine.executePattern('handoff', {
  from: 'requirements-analyst',
  to: 'system-architect',
  context: {
    previous_analysis: analysisResult,
    requirements: reqList,
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'requirements-phase'
    }
  }
});
```

---

## Platform-Specific Issues

### Claude Code

#### Issue: /sdd commands not recognized

**症状:**
```
Unknown command: /sdd-requirements
```

**解決策:**
1. `CLAUDE.md` が存在することを確認
2. セッションを再起動
3. 適切な接頭辞を使用:
```
# Claude Code uses slash commands
/sdd-requirements feature-name
```

### GitHub Copilot

#### Issue: #sdd prompts not working

**症状:**
Agent doesn't recognize #sdd commands

**解決策:**
1. `AGENTS.md` がルートに存在することを確認
2. Copilot Chat を使用（コード補完ではなく）
3. 正しい構文:
```
#sdd-requirements Create user authentication
```

### Cursor

#### Issue: Rules not applied

**症状:**
Cursor ignores MUSUBI rules

**解決策:**
1. `.cursor/rules` ディレクトリを確認
2. ルールファイルの形式を確認:
```markdown
# .cursor/rules/musubi.md

## MUSUBI Rules

Always follow EARS format for requirements.
Check constitution compliance before code changes.
```

### Windsurf

#### Issue: Custom rules not loaded

**解決策:**
```bash
# Windsurf設定を再生成
npx musubi-sdd init --platform windsurf --force
```

---

## CI/CD Issues

### GitHub Actions

#### Issue: Action fails with "No specs found"

**症状:**
```
Error: No specification files found in storage/specs/
```

**解決策:**
```yaml
# .github/workflows/musubi.yml
jobs:
  validate:
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 全履歴を取得
      
      - name: Check specs exist
        run: |
          if [ ! -d "storage/specs" ]; then
            mkdir -p storage/specs
            echo "# Placeholder" > storage/specs/.gitkeep
          fi
```

#### Issue: Traceability report not generated

**解決策:**
```yaml
- name: Generate Traceability
  run: npx musubi-trace --output reports/traceability.md
  
- name: Upload Report
  uses: actions/upload-artifact@v4
  with:
    name: traceability-report
    path: reports/traceability.md
```

### GitLab CI

#### Issue: Cache not working

**解決策:**
```yaml
# .gitlab-ci.yml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/
  policy: pull-push
```

---

## Performance Optimization

### Issue: Validation is slow

**症状:**
```
Validation took 45s (expected < 10s)
```

**解決策:**
```bash
# 特定のファイルのみ検証
npx musubi-validate ears --file storage/specs/auth.md

# 並列検証を有効化
npx musubi-validate all --parallel

# キャッシュを使用
npx musubi-validate all --cache
```

### Issue: Large project performance

**大規模プロジェクト向け設定:**
```javascript
// musubi.config.js
module.exports = {
  validation: {
    parallel: true,
    workers: 4,
    cache: {
      enabled: true,
      ttl: 3600 // 1時間
    }
  },
  traceability: {
    incremental: true,
    excludePatterns: [
      'node_modules/**',
      'dist/**',
      'coverage/**'
    ]
  }
};
```

---

## Migration Guide

### From v2.x to v3.x

**Breaking Changes:**
1. `register()` → `registerSkill()`
2. `stopHealthCheck()` → `stopHealthMonitoring()`
3. Config file format changed

**Migration Script:**
```bash
# 自動マイグレーション
npx musubi-sdd migrate --from 2 --to 3

# 手動確認
npx musubi-validate all --verbose
```

### From other SDD tools

```bash
# 既存の仕様をインポート
npx musubi-convert import --format openapi --file api-spec.yaml
npx musubi-convert import --format gherkin --dir features/
```

---

## Getting More Help

### リソース

- **Documentation**: https://nahisaho.github.io/musubi
- **GitHub Issues**: https://github.com/nahisaho/musubi/issues
- **Discussions**: https://github.com/nahisaho/musubi/discussions

### デバッグモード

```bash
# 詳細ログを有効化
DEBUG=musubi:* npx musubi-validate all

# 特定のモジュールのみ
DEBUG=musubi:validator npx musubi-validate ears
```

### バグ報告

```bash
# 診断情報を収集
npx musubi-sdd diagnose > musubi-diagnostic.txt

# GitHub Issueを作成
# https://github.com/nahisaho/musubi/issues/new
# diagnostic.txtを添付
```

---

**MUSUBI v3.12.0** - Specification Driven Development

[ドキュメント](../USER-GUIDE.md) | [GitHub](https://github.com/nahisaho/musubi) | [npm](https://www.npmjs.com/package/musubi-sdd)
