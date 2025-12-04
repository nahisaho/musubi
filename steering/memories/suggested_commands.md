# Suggested Commands

Frequently used commands for musubi-sdd.

## Package Management

```bash
# Install dependencies
npm install

# Add new dependency
npm install <package>

# Update dependencies
npm update
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test <file>

# Run with coverage
npm run test:coverage
```

## Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check (if TypeScript)
npm run type-check
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/<feature-name>

# Commit with conventional commits
git commit -m "feat: add new feature"

# Push and create PR
git push -u origin feature/<feature-name>
```

## CodeGraph MCP Server

CodeGraph MCP Server のインストールと設定コマンド。

### インストール

```bash
# pipx でインストール（推奨）
pipx install --force codegraph-mcp-server

# または Python venv で手動インストール
python3 -m venv ~/.codegraph-mcp
~/.codegraph-mcp/bin/pip install codegraph-mcp-server

# GitHub から最新版をインストール
pipx install --force git+https://github.com/nahisaho/CodeGraphMCPServer.git
```

### インデックス作成

```bash
# インクリメンタルインデックス（高速）
codegraph-mcp index .

# フルインデックス（完全再構築）
codegraph-mcp index . --full

# 特定ディレクトリをインデックス
codegraph-mcp index /path/to/project --full
```

### MCP サーバー起動

```bash
# サーバーを起動
codegraph-mcp serve --repo .

# 特定ディレクトリで起動
codegraph-mcp serve --repo /path/to/project
```

### VS Code 設定

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

### Claude Desktop 設定

`~/.claude/claude_desktop_config.json` に追加:

```json
{
  "mcpServers": {
    "CodeGraph": {
      "command": "codegraph-mcp",
      "args": ["serve", "--repo", "/absolute/path/to/project"]
    }
  }
}
```

---

*Add your frequently used commands here*
