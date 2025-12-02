# 技術スタック

**プロジェクト**: MUSUBI (musubi-sdd)
**最終更新**: 2025-12-03
**バージョン**: 2.0.0

---

## CodeGraph分析連携

> 📊 **CodeGraphMCPServer v0.7.1** によるコード分析が利用可能（2025-12-03）

### 分析機能

| 機能 | MCPツール | 活用シーン |
| --- | --- | --- |
| **依存関係追跡** | `find_dependencies` | 変更影響分析 |
| **呼び出し元追跡** | `find_callers` | リファクタリング影響確認 |
| **コミュニティ検出** | `community` | モジュール境界の識別 |
| **セマンティック検索** | `local_search`, `global_search` | コードパターン検索 |
| **モジュール構造分析** | `analyze_module_structure` | アーキテクチャ検証 |

### コードベースグラフ統計

| 指標 | 値 |
| --- | --- |
| 総エンティティ数 | 1,006 |
| リレーション数 | 4,624 |
| コミュニティ数 | 36 |
| インデックス済みファイル | 70 |

---

## 概要

MUSUBIはNode.jsベースのCLIツールです。このドキュメントは承認された技術スタックを定義します。

---

## プライマリ技術

### プログラミング言語

| 言語 | バージョン | 用途 | 備考 |
|-----|----------|------|------|
| JavaScript | ES2022+ | コアロジック | Node.js 18+ |
| Markdown | - | ドキュメント | EARS形式、C4ダイアグラム |
| YAML | - | 設定 | project.yml |
| JSON | - | データ | package.json、MCP設定 |

### ランタイム

| ランタイム | バージョン | 用途 |
|-----------|----------|------|
| Node.js | 18.0.0+ | CLIランタイム |
| npm | 9.0.0+ | パッケージマネージャー |

---

## 依存関係

### 本番依存関係

| パッケージ | バージョン | 用途 |
|-----------|----------|------|
| chalk | ^5.3.0 | ターミナルカラー |
| commander | ^12.0.0 | CLIフレームワーク |
| fs-extra | ^11.2.0 | ファイル操作 |
| glob | ^10.3.0 | ファイルパターンマッチング |
| inquirer | ^9.2.0 | 対話式プロンプト |
| js-yaml | ^4.1.0 | YAML解析 |

### 開発依存関係

| パッケージ | バージョン | 用途 |
|-----------|----------|------|
| jest | ^29.7.0 | テストフレームワーク |
| eslint | ^8.56.0 | コード品質 |
| prettier | ^3.2.0 | コードフォーマット |

---

## MCP Server 連携

### CodeGraphMCPServer

v2.0.0から、MUSUBIはCodeGraphMCPServerと連携してコード分析機能を強化します。

```json
{
  "mcpServers": {
    "CodeGraph": {
      "command": "npx",
      "args": ["-y", "@anthropic/codegraph-mcp", "--codebase", "."]
    }
  }
}
```

### 利用可能なMCPツール（14ツール）

**コードグラフ操作**:

- `init_graph` - コードグラフ初期化
- `get_code_snippet` - ソースコード取得
- `find_callers` - 呼び出し元追跡
- `find_callees` - 呼び出し先追跡
- `find_dependencies` - 依存関係分析

**検索**:

- `local_search` - ローカルコンテキスト検索
- `global_search` - GraphRAG駆動のグローバル検索
- `query_codebase` - 自然言語クエリ

**分析**:

- `analyze_module_structure` - モジュール構造分析
- `suggest_refactoring` - リファクタリング提案

---

## 対応プラットフォーム

| プラットフォーム | エージェント形式 | 設定ファイル |
|-----------------|-----------------|-------------|
| Claude Code | Skills API | `.claude/skills/` |
| GitHub Copilot | AGENTS.md | `.github/AGENTS.md` |
| Cursor | AGENTS.md | `.cursor/AGENTS.md` |
| Gemini CLI | GEMINI.md | `GEMINI.md` |
| Windsurf | AGENTS.md | `.windsurf/AGENTS.md` |
| Codex CLI | AGENTS.md | `.codex/AGENTS.md` |
| Qwen Code | AGENTS.md | `.qwen/AGENTS.md` |

---

## テスト設定

### Jest設定

```javascript
module.exports = {
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

---

## 憲法準拠

- **Article III**: Jest + 80%カバレッジ閾値
- **Article VIII**: 直接的なフレームワーク使用（抽象化レイヤーなし）
- **Article IX**: 統合テストで実サービス使用

---

**最終更新**: 2025-12-03
**管理者**: nahisaho（MUSUBI Contributors）
