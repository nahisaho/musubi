# CodeGraph MCP Server セットアップ

CodeGraph MCP Server をインストール・設定します。

## トリガーフレーズ

以下のいずれかのフレーズで実行できます：

- `CodeGraph MCP Server をインストールして`
- `CodeGraph MCP をインストールして`
- `CodeGraph MCP を設定して`
- `CodeGraph をセットアップして`

## 自動実行手順

### 1. Python 環境確認

```bash
python3 --version
which pipx || which pip3
```

### 2. CodeGraph MCP Server インストール

**pipx がある場合（推奨）:**

```bash
pipx install --force codegraph-mcp-server
```

**pipx がない場合（venv 使用）:**

```bash
python3 -m venv ~/.codegraph-mcp
~/.codegraph-mcp/bin/pip install codegraph-mcp-server
```

### 3. プロジェクトのインデックス作成

```bash
codegraph-mcp index . --full
```

または venv の場合:

```bash
~/.codegraph-mcp/bin/codegraph-mcp index . --full
```

### 4. VS Code MCP 設定ファイル作成

`.vscode/mcp.json` を作成:

```json
{
  "servers": {
    "codegraph": {
      "command": "codegraph-mcp",
      "args": ["serve", "--repo", "${workspaceFolder}"]
    }
  }
}
```

**注意**: pipx ではなく venv を使用した場合は、`command` をフルパスに変更:

```json
{
  "servers": {
    "codegraph": {
      "command": "/home/USER/.codegraph-mcp/bin/codegraph-mcp",
      "args": ["serve", "--repo", "${workspaceFolder}"]
    }
  }
}
```

### 5. 完了メッセージ

設定完了後、以下を報告:

- インデックス結果（Entities, Relations, Files, Communities）
- 作成した設定ファイル
- 利用可能な MCP ツール一覧

## 利用可能な CodeGraph MCP ツール

| ツール | 説明 |
|--------|------|
| `find_dependencies` | 依存関係分析 |
| `find_callers` | 呼び出し元追跡 |
| `find_callees` | 呼び出し先追跡 |
| `local_search` | ローカルコンテキスト検索 |
| `global_search` | グローバル検索 |
| `query_codebase` | 自然言語クエリ |
| `analyze_module_structure` | モジュール構造分析 |
| `get_code_snippet` | ソースコード取得 |
| `stats` | コードベース統計 |
| `community` | コミュニティ検出 |

## 関連リンク

- [CodeGraph MCP Server GitHub](https://github.com/nahisaho/CodeGraphMCPServer)
- [MUSUBI × CodeGraph 統合ガイド](../docs/Qiita/MUSUBI-CodeGraph-MCP-Integration.md)
