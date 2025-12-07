---
name: browser-agent
description: ブラウザ自動化エージェント - 自然言語でブラウザを操作し、スクリーンショットを取得・比較、E2Eテストを生成
version: 1.0.0
category: testing
platform: claude-code
---

# Browser Agent スキル

自然言語コマンドでブラウザを操作し、スクリーンショット取得・比較、E2E テストコード生成を行うエージェントです。

## 機能

1. **ブラウザ操作**: 日本語/英語の自然言語でブラウザを操作
2. **スクリーンショット**: 画面を自動キャプチャ・保存
3. **AI比較**: 期待画面と実際の画面を Vision AI で比較
4. **テスト生成**: 操作履歴から Playwright テストコードを自動生成
5. **MUSUBI連携**: EARS 仕様からブラウザテストを生成

## 使用方法

### インタラクティブモード

```bash
npx musubi browser
```

ブラウザを起動し、自然言語コマンドを受け付けます。

### 単一コマンド実行

```bash
npx musubi browser run "https://example.com を開いてログインボタンをクリック"
```

### スクリプト実行

```bash
npx musubi browser script ./test-script.txt
```

### スクリーンショット比較

```bash
npx musubi browser compare expected.png actual.png --threshold 0.95
```

### テスト生成

```bash
npx musubi browser generate-test --history actions.json --output tests/e2e/login.spec.ts
```

## サポートするコマンド

### ナビゲーション
- `https://example.com を開く`
- `go to https://example.com`
- `ログインページにアクセス`

### クリック
- `ログインボタンをクリック`
- `click login button`
- `送信ボタンを押す`

### 入力
- `メール欄に「test@example.com」と入力`
- `type "hello" in email field`
- `パスワードに "secret" を入力`

### 待機
- `3秒待つ`
- `wait 5 seconds`
- `ローディングが消えるまで待つ`

### スクリーンショット
- `スクリーンショットを取る`
- `画面を「login-page」として保存`
- `take screenshot`

### 検証
- `「ログイン成功」が表示される`
- `verify "Welcome" is visible`
- `ダッシュボードが表示されること`

## セッションコマンド（インタラクティブモード）

| コマンド | 説明 |
|---------|------|
| `history` | アクション履歴を表示 |
| `clear` | 履歴をクリア |
| `save-test <file>` | 履歴から Playwright テストを保存 |
| `exit` / `quit` / `q` | ブラウザを閉じて終了 |
| `help` / `?` | ヘルプを表示 |

## オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--headless` | ヘッドレスモードで実行 | `true` |
| `--no-headless` | ブラウザを表示 | - |
| `-b, --browser` | ブラウザ種類 | `chromium` |
| `-o, --output` | スクリーンショット保存先 | `./screenshots` |
| `-t, --timeout` | タイムアウト（ms） | `30000` |
| `--threshold` | 類似度閾値 | `0.95` |

## MUSUBI 仕様連携

EARS 形式の仕様からブラウザテストを生成できます：

```markdown
## Requirements

### REQ-001: User Login

WHEN the user clicks the login button with valid credentials,
the system SHALL display the dashboard page.
```

↓ 生成されるテスト

```javascript
test('REQ-001: User Login', async ({ page }) => {
  // Pattern: event-driven
  // Trigger: the user clicks the login button with valid credentials
  // Action: display the dashboard page
  
  // TODO: Implement test based on requirement
});
```

## API

```javascript
const BrowserAgent = require('musubi-sdd/src/agents/browser');

const agent = new BrowserAgent({
  headless: true,
  browser: 'chromium',
  outputDir: './screenshots',
});

await agent.launch();
await agent.execute('https://example.com を開く');
await agent.execute('ログインボタンをクリック');

const testCode = await agent.generateTest({
  name: 'Login Test',
  output: 'tests/login.spec.ts',
});

await agent.close();
```

## 要件

- Node.js 18+
- Playwright（自動インストール）

## 関連

- [Playwright Documentation](https://playwright.dev/)
- [MUSUBI SDD](https://github.com/nahisaho/musubi)
