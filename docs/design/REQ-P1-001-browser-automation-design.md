# REQ-P1-001: Browser Automation Agent 設計書

## 概要

ブラウザ自動化エージェントは、自然言語コマンドによるブラウザ操作、スクリーンショット取得・比較、E2E テストコード生成を提供する MUSUBI スキルです。

### 目的

1. **自然言語でのブラウザ操作**: 「ログインページに移動して、メールを入力」のような指示を実行
2. **スクリーンショット検証**: 期待される画面と実際の画面を AI で比較
3. **テストコード生成**: 操作履歴から Playwright テストコードを自動生成
4. **仕様とのトレーサビリティ**: MUSUBI 仕様からブラウザテストを生成

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Automation Agent                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐ │
│  │ NL Command   │────▶│ Action       │────▶│ Playwright       │ │
│  │ Parser       │     │ Executor     │     │ Driver           │ │
│  └──────────────┘     └──────────────┘     └──────────────────┘ │
│         │                    │                      │            │
│         ▼                    ▼                      ▼            │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐ │
│  │ Action       │     │ Context      │     │ Browser          │ │
│  │ Schema       │     │ Manager      │     │ Instance         │ │
│  └──────────────┘     └──────────────┘     └──────────────────┘ │
│                              │                      │            │
│                              ▼                      ▼            │
│                       ┌──────────────┐     ┌──────────────────┐ │
│                       │ Session      │     │ Screenshot       │ │
│                       │ Storage      │     │ Capture          │ │
│                       └──────────────┘     └──────────────────┘ │
│                                                     │            │
│                                                     ▼            │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐ │
│  │ Test Code    │◀────│ Action       │◀────│ AI Comparator    │ │
│  │ Generator    │     │ Recorder     │     │ (Vision)         │ │
│  └──────────────┘     └──────────────┘     └──────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## コンポーネント詳細

### 1. NL Command Parser (`src/agents/browser/nl-parser.js`)

自然言語コマンドを構造化されたアクションに変換します。

```javascript
// 入力例
"ログインページ https://example.com/login に移動して、メールフィールドに test@example.com を入力"

// 出力例
{
  actions: [
    { type: 'navigate', url: 'https://example.com/login' },
    { type: 'fill', selector: 'input[type="email"]', value: 'test@example.com' }
  ]
}
```

#### サポートするアクション

| アクション | 構文パターン | 例 |
|-----------|-------------|-----|
| navigate | "〜に移動", "〜を開く" | "https://example.com を開く" |
| click | "〜をクリック", "〜を押す" | "ログインボタンをクリック" |
| fill | "〜に入力", "〜と入力" | "メール欄に test@example.com と入力" |
| select | "〜を選択" | "国のドロップダウンから Japan を選択" |
| wait | "〜秒待つ", "〜を待つ" | "3秒待つ", "ローディングが消えるまで待つ" |
| screenshot | "スクリーンショット", "画面を保存" | "現在の画面をスクリーンショット" |
| assert | "〜が表示される", "〜があること" | "「ログイン成功」が表示されること" |

### 2. Action Executor (`src/agents/browser/action-executor.js`)

パースされたアクションを Playwright API 呼び出しに変換して実行します。

```javascript
class ActionExecutor {
  async execute(action, context) {
    switch (action.type) {
      case 'navigate':
        await context.page.goto(action.url);
        break;
      case 'click':
        await context.page.click(action.selector);
        break;
      case 'fill':
        await context.page.fill(action.selector, action.value);
        break;
      // ...
    }
  }
}
```

### 3. Context Manager (`src/agents/browser/context-manager.js`)

ブラウザセッション、ページ、状態を管理します。

```javascript
class ContextManager {
  constructor() {
    this.browser = null;
    this.contexts = new Map(); // 名前付きコンテキスト
    this.pages = new Map();    // アクティブページ
    this.history = [];         // アクション履歴
  }
  
  async createContext(name, options = {}) {
    // 新しいブラウザコンテキストを作成
  }
  
  async getOrCreatePage(contextName = 'default') {
    // ページを取得または作成
  }
}
```

### 4. Screenshot Capture (`src/agents/browser/screenshot.js`)

スクリーンショットの取得と管理を行います。

```javascript
class ScreenshotCapture {
  constructor(outputDir) {
    this.outputDir = outputDir;
    this.screenshots = [];
  }
  
  async capture(page, options = {}) {
    const filename = `${Date.now()}-${options.name || 'screenshot'}.png`;
    const path = join(this.outputDir, filename);
    await page.screenshot({ path, fullPage: options.fullPage });
    this.screenshots.push({ path, timestamp: Date.now(), ...options });
    return path;
  }
}
```

### 5. AI Comparator (`src/agents/browser/ai-comparator.js`)

スクリーンショットを AI（GPT-4V または Claude Vision）で比較します。

```javascript
class AIComparator {
  constructor(options = {}) {
    this.model = options.model || 'gpt-4-vision-preview';
    this.threshold = options.threshold || 0.95;
  }
  
  async compare(expected, actual, description) {
    const prompt = `
      これは2つのウェブページのスクリーンショットです。
      
      期待される画面: [image1]
      実際の画面: [image2]
      
      検証内容: ${description}
      
      以下を評価してください:
      1. 視覚的な類似度（0-100%）
      2. レイアウトの差異
      3. コンテンツの差異
      4. 致命的な差異があるか
      
      JSON形式で回答してください。
    `;
    
    // Vision API 呼び出し
    const result = await this.callVisionAPI(prompt, expected, actual);
    return {
      similarity: result.similarity,
      passed: result.similarity >= this.threshold * 100,
      differences: result.differences,
      details: result.details,
    };
  }
}
```

### 6. Test Code Generator (`src/agents/browser/test-generator.js`)

アクション履歴から Playwright テストコードを生成します。

```javascript
class TestCodeGenerator {
  generateTest(actions, options = {}) {
    const lines = [
      `import { test, expect } from '@playwright/test';`,
      ``,
      `test('${options.name || 'generated test'}', async ({ page }) => {`,
    ];
    
    for (const action of actions) {
      lines.push(`  ${this.actionToCode(action)}`);
    }
    
    lines.push(`});`);
    return lines.join('\n');
  }
  
  actionToCode(action) {
    switch (action.type) {
      case 'navigate':
        return `await page.goto('${action.url}');`;
      case 'click':
        return `await page.click('${action.selector}');`;
      case 'fill':
        return `await page.fill('${action.selector}', '${action.value}');`;
      case 'screenshot':
        return `await page.screenshot({ path: '${action.path}' });`;
      case 'assert':
        return `await expect(page.locator('${action.selector}')).toBeVisible();`;
      default:
        return `// Unknown action: ${action.type}`;
    }
  }
}
```

## Claude Code スキル定義

### browser-agent スキル

```markdown
---
name: browser-agent
description: ブラウザ自動化エージェント - 自然言語でブラウザを操作し、スクリーンショットを取得・比較、E2Eテストを生成
version: 1.0.0
---

## 機能

1. **ブラウザ操作**: 自然言語でブラウザを操作
2. **スクリーンショット**: 画面を自動キャプチャ
3. **AI比較**: 期待画面と実際の画面を比較
4. **テスト生成**: 操作履歴からPlaywrightテストを生成

## 使用方法

### 基本操作

```
browser-agent: https://example.com を開いて、ログインボタンをクリック
```

### スクリーンショット取得

```
browser-agent: 現在の画面をスクリーンショットして "login-page" として保存
```

### 画面比較

```
browser-agent: 現在の画面を expected/login.png と比較して、95%以上の類似度か検証
```

### テスト生成

```
browser-agent: これまでの操作履歴からPlaywrightテストコードを生成
```

## 実行

```bash
npx musubi browser-agent "https://example.com を開いて、ログインをテスト"
```
```

## CLI インターフェース

### `musubi-browser` コマンド

```bash
# インタラクティブモード
npx musubi browser

# 単一コマンド実行
npx musubi browser --command "https://example.com を開く"

# スクリプト実行
npx musubi browser --script ./browser-script.txt

# スクリーンショット比較
npx musubi browser --compare expected.png actual.png --threshold 0.95

# テスト生成
npx musubi browser --generate-test --output tests/e2e/login.spec.ts
```

### オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--headless` | ヘッドレスモードで実行 | `true` |
| `--browser` | ブラウザ種類 (chromium/firefox/webkit) | `chromium` |
| `--timeout` | タイムアウト（ミリ秒） | `30000` |
| `--output-dir` | スクリーンショット保存先 | `./screenshots` |
| `--vision-model` | Vision AI モデル | `gpt-4-vision-preview` |
| `--threshold` | 類似度閾値 | `0.95` |

## ファイル構成

```
src/
├── agents/
│   └── browser/
│       ├── index.js              # エントリポイント
│       ├── nl-parser.js          # 自然言語パーサー
│       ├── action-executor.js    # アクション実行
│       ├── context-manager.js    # コンテキスト管理
│       ├── screenshot.js         # スクリーンショット
│       ├── ai-comparator.js      # AI比較
│       ├── test-generator.js     # テスト生成
│       └── actions/              # アクション定義
│           ├── navigate.js
│           ├── click.js
│           ├── fill.js
│           ├── select.js
│           ├── wait.js
│           └── assert.js
├── bin/
│   └── musubi-browser.js         # CLI
└── skills/
    └── browser-agent.md          # Claude Code スキル
```

## API

### BrowserAgent クラス

```javascript
import { BrowserAgent } from 'musubi/agents/browser';

const agent = new BrowserAgent({
  headless: true,
  browser: 'chromium',
  outputDir: './screenshots',
  visionModel: 'gpt-4-vision-preview',
});

// ブラウザ起動
await agent.launch();

// 自然言語コマンド実行
await agent.execute('https://example.com を開く');
await agent.execute('ログインボタンをクリック');
await agent.execute('スクリーンショットを取得');

// スクリーンショット比較
const result = await agent.compare('expected.png', 'actual.png', {
  threshold: 0.95,
  description: 'ログインページが正しく表示されること',
});

// テストコード生成
const testCode = await agent.generateTest({
  name: 'Login Flow Test',
  output: 'tests/e2e/login.spec.ts',
});

// 終了
await agent.close();
```

## 仕様連携

### MUSUBI 仕様からテスト生成

```javascript
// spec.md の要件からブラウザテストを生成
const spec = await parseSpecification('storage/specs/auth/spec.md');

for (const req of spec.requirements) {
  if (req.pattern === 'event-driven') {
    // WHEN ... the system SHALL ...
    const testCase = await agent.specToTest(req);
    console.log(testCase);
  }
}
```

### 例: REQ-001 からのテスト生成

```markdown
## 要件
WHEN the user clicks the login button with valid credentials,
the system SHALL display the dashboard page.
```

↓ 生成されるテスト

```javascript
test('REQ-001: ログイン成功でダッシュボード表示', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');
  
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
});
```

## セキュリティ考慮事項

1. **認証情報**: 環境変数から取得、ログに出力しない
2. **URL 制限**: 許可リストによるアクセス制御
3. **ファイルアクセス**: サンドボックス内のみ
4. **Vision API**: 機密情報のマスク処理

## 実装フェーズ

### Phase 1: 基盤（Week 1）
- [ ] Playwright 統合基盤
- [ ] 基本アクション (navigate, click, fill)
- [ ] コンテキストマネージャー

### Phase 2: 高度な機能（Week 2）
- [ ] 完全な NL パーサー
- [ ] 全アクションタイプ実装
- [ ] セッション管理

### Phase 3: AI 連携（Week 3）
- [ ] スクリーンショット取得
- [ ] AI 比較エンジン
- [ ] 比較レポート生成

### Phase 4: 統合（Week 4）
- [ ] テストコード生成
- [ ] Claude Code スキル登録
- [ ] MUSUBI 仕様連携
- [ ] ドキュメント整備

## 成功基準

| 基準 | 目標 |
|------|------|
| 基本操作成功率 | 99%+ |
| NL パース精度 | 95%+ |
| スクリーンショット比較精度 | 95%+ |
| テスト生成成功率 | 90%+ |
| E2E テストカバレッジ | 80%+ |

## 依存関係

```json
{
  "dependencies": {
    "playwright": "^1.40.0"
  },
  "optionalDependencies": {
    "openai": "^4.0.0"
  }
}
```

## 参考

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [GPT-4V Documentation](https://platform.openai.com/docs/guides/vision)
- [Claude Vision](https://docs.anthropic.com/claude/docs/vision)
