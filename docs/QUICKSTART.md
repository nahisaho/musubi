# MUSUBI SDD クイックスタートガイド

## 🚀 5分で始める MUSUBI SDD

このガイドでは、MUSUBI SDD を使って最初の仕様駆動開発ワークフローを実行する方法を説明します。

## 前提条件

- Node.js 18+
- npm または yarn
- OpenAI API キー（または他のLLMプロバイダー）

## ステップ 1: インストール

```bash
# グローバルインストール（CLI用）
npm install -g musubi-sdd

# または、プロジェクトローカルにインストール
npm install musubi-sdd
```

## ステップ 2: プロジェクト初期化

```bash
# 新規プロジェクトで初期化
musubi init

# または既存プロジェクトに追加
musubi init --existing
```

これにより以下のファイルが作成されます：
- `steering/` - プロジェクトメモリ
- `steering/rules/constitution.md` - 9条憲法
- `steering/project.yml` - 設定ファイル

## ステップ 3: 環境変数の設定

```bash
# .envファイルを作成
echo "OPENAI_API_KEY=your-api-key-here" > .env

# または環境変数として設定
export OPENAI_API_KEY=your-api-key-here
```

## ステップ 4: 最初の機能を開発

### 4.1 要件生成

```bash
musubi requirements "ユーザー認証機能"
```

生成される内容（EARS形式）：
```
REQ-001: When a user provides valid credentials, the system shall authenticate the user within 2 seconds.
REQ-002: If authentication fails 3 times, the system shall lock the account for 15 minutes.
```

### 4.2 設計生成

```bash
musubi design "ユーザー認証機能"
```

生成される内容：
- C4コンテキスト図
- コンテナ図
- コンポーネント図
- ADR（アーキテクチャ決定記録）

### 4.3 タスク分解

```bash
musubi tasks "ユーザー認証機能"
```

生成される内容：
```
TASK-001: AuthController の作成 [2h]
TASK-002: AuthService の実装 [4h]
TASK-003: JWT トークン生成 [2h]
TASK-004: ユニットテスト作成 [3h]
```

### 4.4 憲法検証

```bash
musubi validate "ユーザー認証機能"
```

出力例：
```
✅ Article 1: Traceability - PASSED
✅ Article 2: EARS Requirements - PASSED
✅ Article 3: C4 Model Design - PASSED
⚠️ Article 7: Test Coverage - WARNING (75% < 80%)
```

## ステップ 5: フルオーケストレーション

すべてのステップを一度に実行：

```bash
musubi orchestrate "ユーザー認証機能"
```

## 📊 コスト追跡

トークン使用量とコストを確認：

```bash
musubi costs --report
```

出力例：
```
📊 Cost Report
─────────────────────────────
Total Tokens:     45,230
Total Cost:       $0.1358
─────────────────────────────
By Operation:
  Requirements:   $0.0234
  Design:         $0.0456
  Tasks:          $0.0234
  Validation:     $0.0434
```

## 🔧 プログラマティック利用

### Node.js から使用

```javascript
const { OrchestrationEngine } = require('musubi-sdd');

const engine = new OrchestrationEngine({
  llmProvider: 'openai',
  model: 'gpt-4o'
});

const result = await engine.execute({
  workflow: 'full-sdd',
  feature: 'ユーザー認証'
});

console.log(result.summary);
```

### VSCode 拡張機能

1. VSCode Marketplace で「MUSUBI SDD」を検索
2. インストール
3. コマンドパレット（Ctrl+Shift+P）から `MUSUBI: Orchestrate` を実行

## 📁 プロジェクト構造

初期化後の構造：

```
your-project/
├── steering/
│   ├── product.md          # 製品コンテキスト
│   ├── structure.md        # アーキテクチャパターン
│   ├── tech.md             # 技術スタック
│   ├── project.yml         # MUSUBI設定
│   ├── rules/
│   │   ├── constitution.md # 9条憲法
│   │   └── workflow.md     # ワークフロー定義
│   ├── memories/           # 機能別メモリ
│   └── templates/          # カスタムテンプレート
├── storage/
│   ├── specs/              # 生成された仕様
│   ├── features/           # 機能別ドキュメント
│   └── changes/            # 変更履歴
└── src/                    # ソースコード
```

## 🎯 ベストプラクティス

### 1. 機能を小さく保つ

❌ `musubi orchestrate "ECサイト全体"`

✅ `musubi orchestrate "商品検索機能"`

### 2. 既存コードを活用

```bash
# 既存コードを分析してから要件生成
musubi analyze ./src
musubi requirements "新機能" --context-from-analysis
```

### 3. 反復的に改善

```bash
# 初回
musubi requirements "機能X"

# フィードバック後に改善
musubi requirements "機能X" --refine
```

### 4. コストを意識

```bash
# 見積もりのみ（実行しない）
musubi orchestrate "機能X" --dry-run --estimate-cost
```

## 🔗 次のステップ

- [API リファレンス](./API-REFERENCE.md)
- [ユーザーガイド](./USER-GUIDE.md)
- [設定オプション](./guides/configuration.md)
- [VSCode 拡張機能ガイド](./guides/vscode-extension.md)
- [企業向け機能](./guides/enterprise.md)

## 🆘 トラブルシューティング

### エラー: API キーが無効

```bash
# API キーを確認
echo $OPENAI_API_KEY

# 設定をリセット
musubi init --reset-config
```

### エラー: 憲法検証に失敗

```bash
# 詳細なレポートを確認
musubi validate "機能X" --verbose

# 特定の条項のみ検証
musubi validate "機能X" --articles 1,2,3
```

### コストが高すぎる

```bash
# 小さいモデルを使用
musubi orchestrate "機能X" --model gpt-4o-mini

# チャンク処理を有効化
musubi orchestrate "機能X" --chunk-size 4000
```

## 📞 サポート

- GitHub Issues: https://github.com/nahisaho/musubi/issues
- ドキュメント: https://musubi.dev/docs
- Discord: https://discord.gg/musubi
