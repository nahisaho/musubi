# GitHub Actions CI/CD Design Document

## メタデータ
- **ドキュメント種別**: 設計書 (SDD Stage 3)
- **作成日**: 2025-11-17
- **プロジェクト**: MUSUBI v0.1.4
- **関連要件**: [github-actions-requirements.md](./github-actions-requirements.md)
- **Constitutional Compliance**: Article III (Design-First), Article V (Traceability)

---

## 1. Architecture Decision Record (ADR)

### ADR-001: GitHub Actions を CI/CD プラットフォームとして採用

**Status**: Accepted  
**Date**: 2025-11-17  
**Context**:  
MUSUBI は現在、手動でのテスト実行、npm 公開、バージョン管理を行っている。これは人的エラーのリスクが高く、品質保証の一貫性が保てない。

**Decision**:  
GitHub Actions を CI/CD プラットフォームとして採用し、以下を自動化する:
- PR 時の自動テスト・Lint・ビルド検証
- main ブランチへのプッシュ時の完全テスト実行
- バージョンタグ作成時の npm 自動公開
- Dependabot による依存関係の自動更新

**Consequences**:
- ✅ 一貫した品質チェック
- ✅ 人的エラーの削減
- ✅ リリースプロセスの高速化
- ✅ GitHub ネイティブ統合(PR status checks, branch protection)
- ⚠️ GitHub Actions の利用制限(パブリックリポジトリは無料)
- ⚠️ YAML ベースの設定管理が必要

---

### ADR-002: CI と Release を別ワークフローに分離

**Status**: Accepted  
**Date**: 2025-11-17  
**Context**:  
CI(継続的インテグレーション)と Release(リリース自動化)は異なるトリガーと目的を持つ。

**Decision**:  
以下の2つのワークフローに分離:
1. **ci.yml**: PR・push トリガー、品質チェック
2. **release.yml**: バージョンタグトリガー、npm 公開

**Rationale**:
- 関心の分離 (Separation of Concerns)
- 再利用可能性の向上
- トラブルシューティングの容易化
- 異なるパーミッション設定の適用

**Consequences**:
- ✅ 明確な責任分離
- ✅ 個別のメンテナンス性向上
- ⚠️ ワークフロー数の増加

---

### ADR-003: Matrix Strategy でマルチプラットフォームテストを実施

**Status**: Accepted  
**Date**: 2025-11-17  
**Context**:  
MUSUBI は7つのプラットフォーム(Claude Code, GitHub Copilot, Cursor, Gemini CLI, Windsurf, Codex, Qwen Code)をサポートしており、各プラットフォームでの初期化が正しく動作することを保証する必要がある。

**Decision**:  
GitHub Actions の matrix strategy を使用して、全7プラットフォームの初期化テストを並列実行する。

```yaml
strategy:
  matrix:
    platform: [claude-code, copilot, cursor, gemini, windsurf, codex, qwen]
```

**Consequences**:
- ✅ 全プラットフォームの網羅的検証
- ✅ 並列実行による高速化
- ✅ プラットフォーム固有の問題の早期発見
- ⚠️ ワークフロー実行時間の増加(並列化で緩和)

---

### ADR-004: Caching Strategy で CI 実行時間を短縮

**Status**: Accepted  
**Date**: 2025-11-17  
**Context**:  
`npm install` は毎回実行すると時間がかかる。REQ-GHA-010 では 80% のキャッシュヒット率を目標としている。

**Decision**:  
`actions/setup-node@v4` の組み込みキャッシュ機能を使用する:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '18.x'
    cache: 'npm'
```

**Rationale**:
- package-lock.json のハッシュ値をキーとした自動キャッシュ
- GitHub Actions の標準機能で追加設定不要
- クロスジョブでのキャッシュ共有

**Consequences**:
- ✅ CI 実行時間の大幅短縮(目標: < 5分)
- ✅ GitHub Actions の無料枠の節約
- ✅ 開発体験の向上

---

### ADR-005: Branch Protection Rules で品質ゲートを強制

**Status**: Accepted  
**Date**: 2025-11-17  
**Context**:  
main ブランチへの直接プッシュは品質リスクが高い。CI チェックの通過を必須とする必要がある。

**Decision**:  
GitHub Settings で以下の Branch Protection Rules を設定:
- Require status checks to pass before merging
- Required status checks: `lint`, `test`, `build`, `audit`
- Require branches to be up to date before merging
- Require linear history
- Do not allow bypassing the above settings

**Consequences**:
- ✅ main ブランチの品質保証
- ✅ コードレビューの強制
- ✅ CI チェック通過の必須化
- ⚠️ 緊急修正時のワークフローが複雑化(hotfix ブランチで対応)

---

## 2. Workflow Design

### 2.1 CI Workflow (ci.yml)

**トリガー**:
- `pull_request`: 任意のブランチへの PR
- `push`: main ブランチへのプッシュ

**ジョブ構成**:

```yaml
name: CI

on:
  pull_request:
    branches: ['**']
  push:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: ESLint & Prettier
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    name: Jest Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18.x'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - name: Upload coverage
        if: github.event_name == 'pull_request'
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests

  build:
    name: Build Verification
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18.x'
          cache: 'npm'
      - run: npm ci
      - run: npm pack --dry-run

  audit:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18.x'
          cache: 'npm'
      - run: npm audit --audit-level=moderate

  platform-tests:
    name: Platform Init Tests
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        platform:
          - claude-code
          - copilot
          - cursor
          - gemini
          - windsurf
          - codex
          - qwen
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18.x'
          cache: 'npm'
      - run: npm ci
      - name: Test ${{ matrix.platform }} init
        run: npm test -- tests/init-platforms.test.js -t "${{ matrix.platform }}"
```

**パフォーマンス目標**:
- Total execution time: < 5 分
- 並列実行: lint, test, build, audit, platform-tests(7 variants)

---

### 2.2 Release Workflow (release.yml)

**トリガー**:
- `push`: tags matching `v*.*.*` (例: v0.1.5, v1.0.0)

**ジョブ構成**:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

permissions:
  contents: write
  id-token: write

jobs:
  verify:
    name: Pre-release Verification
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18.x'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm audit --audit-level=moderate

  publish-npm:
    name: Publish to npm
    runs-on: ubuntu-latest
    needs: verify
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18.x'
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'
      - run: npm ci
      - run: npm publish --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  create-github-release:
    name: Create GitHub Release
    runs-on: ubuntu-latest
    needs: publish-npm
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Generate Release Notes
        id: release-notes
        run: |
          TAG_NAME=${GITHUB_REF#refs/tags/}
          PREV_TAG=$(git describe --abbrev=0 --tags ${TAG_NAME}^ 2>/dev/null || echo "")
          
          if [ -n "$PREV_TAG" ]; then
            CHANGELOG=$(git log ${PREV_TAG}..${TAG_NAME} --pretty=format:"- %s (%h)" --reverse)
          else
            CHANGELOG=$(git log ${TAG_NAME} --pretty=format:"- %s (%h)" --reverse)
          fi
          
          echo "changelog<<EOF" >> $GITHUB_OUTPUT
          echo "$CHANGELOG" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref_name }}
          release_name: Release ${{ github.ref_name }}
          body: |
            ## Changes
            ${{ steps.release-notes.outputs.changelog }}
            
            ## Installation
            ```bash
            npm install musubi-sdd@${{ github.ref_name }}
            ```
          draft: false
          prerelease: false
```

**パフォーマンス目標**:
- Total execution time: < 3 分
- npm publish 成功率: > 99.9%

---

### 2.3 Dependabot Configuration

**ファイル**: `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '09:00'
      timezone: 'Asia/Tokyo'
    open-pull-requests-limit: 5
    reviewers:
      - 'nahisaho'
    labels:
      - 'dependencies'
      - 'automated'
    commit-message:
      prefix: 'chore(deps)'
      include: 'scope'
    allow:
      - dependency-type: 'all'
    ignore:
      - dependency-name: '*'
        update-types: ['version-update:semver-major']
```

---

## 3. Security Design

### 3.1 Secrets Management

**必要な Secrets**:

| Secret 名 | 用途 | スコープ | 設定場所 |
|-----------|------|---------|---------|
| `NPM_TOKEN` | npm publish 認証 | Automation token | GitHub Repository Secrets |
| `GITHUB_TOKEN` | GitHub API アクセス | 自動生成 | GitHub Actions 標準 |

**設定手順**:
1. npm にログイン → Account Settings → Access Tokens
2. "Generate New Token" → Automation token 選択
3. GitHub → Settings → Secrets and variables → Actions
4. "New repository secret" → `NPM_TOKEN` を追加

### 3.2 Permission Model

**CI Workflow**:
```yaml
permissions:
  contents: read        # コード読み取り
  pull-requests: write  # PR コメント投稿(カバレッジレポート)
```

**Release Workflow**:
```yaml
permissions:
  contents: write    # GitHub Release 作成
  id-token: write    # npm provenance 署名
```

---

## 4. Test Strategy

### 4.1 Platform Initialization Tests

**新規テストファイル**: `tests/init-platforms.test.js`

```javascript
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const PLATFORMS = [
  'claude-code',
  'copilot',
  'cursor',
  'gemini',
  'windsurf',
  'codex',
  'qwen'
];

describe('Platform Initialization Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'musubi-test-'));
  });

  afterEach(() => {
    fs.removeSync(tempDir);
  });

  PLATFORMS.forEach(platform => {
    test(`should initialize ${platform} successfully`, () => {
      const binPath = path.join(__dirname, '..', 'bin', 'musubi.js');
      const cmd = `node ${binPath} init --${platform}`;
      
      expect(() => {
        execSync(cmd, { cwd: tempDir, stdio: 'pipe' });
      }).not.toThrow();

      // Verify core files
      expect(fs.existsSync(path.join(tempDir, '.github', 'AGENTS.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'steering', 'structure.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'steering', 'tech.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'steering', 'product.md'))).toBe(true);

      // Verify platform-specific files
      if (platform === 'claude-code') {
        expect(fs.existsSync(path.join(tempDir, '.github', 'prompts'))).toBe(true);
      } else {
        expect(fs.existsSync(path.join(tempDir, '.github', 'prompts', 'README.md'))).toBe(true);
      }
    });
  });
});
```

**テスト戦略**:
- Matrix strategy で7プラットフォーム並列実行
- 各プラットフォームで必須ファイルの生成を検証
- Skills API (Claude Code 専用)の条件付き検証

---

## 5. Branch Protection Configuration

**GitHub Settings → Branches → Branch protection rules**

**ルール名**: `main`

**設定項目**:
- ✅ Require a pull request before merging
  - ✅ Require approvals: 0 (small team, 1人開発)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - **Required status checks**:
    - `lint / ESLint & Prettier`
    - `test / Jest Tests`
    - `build / Build Verification`
    - `audit / Security Audit`
    - `platform-tests / Platform Init Tests (claude-code)`
    - `platform-tests / Platform Init Tests (copilot)`
    - `platform-tests / Platform Init Tests (cursor)`
    - `platform-tests / Platform Init Tests (gemini)`
    - `platform-tests / Platform Init Tests (windsurf)`
    - `platform-tests / Platform Init Tests (codex)`
    - `platform-tests / Platform Init Tests (qwen)`
- ✅ Require conversation resolution before merging
- ✅ Require linear history
- ❌ Do not allow bypassing the above settings

---

## 6. Monitoring & Observability

### 6.1 Workflow Metrics

**監視項目**:
- CI 実行時間(目標: < 5分)
- Release 実行時間(目標: < 3分)
- キャッシュヒット率(目標: > 80%)
- テスト成功率(目標: 100%)
- npm publish 成功率(目標: > 99.9%)

**監視方法**:
- GitHub Actions の "Insights" タブ
- Workflow run history の定期レビュー

### 6.2 Notification Strategy

**成功時**:
- GitHub Status Check の緑チェック
- PR への自動コメント(カバレッジレポート)

**失敗時**:
- GitHub Status Check の赤 X
- PR への自動コメント(エラー詳細)
- Email 通知(GitHub Settings で設定)

---

## 7. Rollout Plan

### Phase 1: CI Workflow (Week 1)
1. `ci.yml` 作成・コミット
2. テスト PR での動作検証
3. Branch Protection Rules 設定
4. チーム通知・ドキュメント更新

### Phase 2: Platform Tests (Week 1)
1. `tests/init-platforms.test.js` 実装
2. Local での動作確認
3. CI Workflow に統合
4. 全7プラットフォームの検証

### Phase 3: Release Workflow (Week 2)
1. `release.yml` 作成・コミット
2. テストタグでの動作検証(例: v0.1.5-test)
3. npm token の設定
4. 本番リリース(v0.1.5)

### Phase 4: Dependabot (Week 2)
1. `.github/dependabot.yml` 作成・コミット
2. 初回依存関係更新 PR の確認
3. マージプロセスの確立

---

## 8. Risk Management

### Risk 1: CI Failure による開発ブロック

**Mitigation**:
- `fail-fast: false` を使用して全テストを実行
- 明確なエラーメッセージとログ出力
- Local での事前テスト推奨

### Risk 2: npm Publish Failure

**Mitigation**:
- Pre-release verification ジョブで事前検証
- npm token の有効期限管理
- 手動 rollback 手順のドキュメント化

### Risk 3: GitHub Actions 利用制限

**Mitigation**:
- キャッシュ戦略で実行時間短縮
- 不要なワークフローの削減
- Public repository の無料枠活用

---

## 9. Traceability Matrix

| Design Decision | Related Requirements | Implementation |
|-----------------|---------------------|----------------|
| ADR-001: GitHub Actions 採用 | REQ-GHA-001, REQ-GHA-002, REQ-GHA-003 | ci.yml, release.yml |
| ADR-002: ワークフロー分離 | REQ-GHA-001, REQ-GHA-003 | ci.yml, release.yml |
| ADR-003: Matrix Strategy | REQ-GHA-006 | ci.yml (platform-tests job) |
| ADR-004: Caching | REQ-GHA-010 | actions/setup-node@v4 with cache |
| ADR-005: Branch Protection | REQ-GHA-007 | GitHub Settings |
| CI Workflow | REQ-GHA-001, REQ-GHA-002, REQ-GHA-004, REQ-GHA-005 | ci.yml |
| Release Workflow | REQ-GHA-003, REQ-GHA-008 | release.yml |
| Dependabot | REQ-GHA-009 | dependabot.yml |
| Platform Tests | REQ-GHA-006 | tests/init-platforms.test.js |
| Security Model | REQ-GHA-004 (npm audit) | ci.yml (audit job), release.yml (verify job) |

---

## 10. Next Steps

1. ✅ 設計書レビュー・承認
2. ⏳ タスク分解(実装優先順位の決定)
3. ⏳ CI Workflow 実装
4. ⏳ Platform Tests 実装
5. ⏳ Release Workflow 実装
6. ⏳ Branch Protection 設定
7. ⏳ Dependabot 有効化
8. ⏳ ドキュメント更新(README.md, CONTRIBUTING.md)

---

## Appendix A: Workflow Diagrams

### CI Workflow Flow

```
PR/Push → Trigger CI
    ↓
  ┌─────────────────────────────────────┐
  │ Parallel Jobs                       │
  ├─────────────────────────────────────┤
  │ lint (ESLint, Prettier)             │
  │ test (Jest, Coverage)               │
  │ build (npm pack --dry-run)          │
  │ audit (npm audit)                   │
  │ platform-tests (7 variants)         │
  └─────────────────────────────────────┘
    ↓
  All Pass → ✅ Green Check
  Any Fail → ❌ Red X (Block Merge)
```

### Release Workflow Flow

```
Git Tag (v*.*.*)
    ↓
  verify (Full Test Suite)
    ↓
  publish-npm (npm publish --provenance)
    ↓
  create-github-release (Generate Notes, Create Release)
    ↓
  ✅ Release Complete
```

---

**Constitutional Compliance**:
- ✅ Article III: Design-First approach followed
- ✅ Article V: Traceability matrix established
- ✅ Article VII: Risk management addressed
- ✅ Article VIII: Performance targets defined (< 5min CI, < 3min Release)
