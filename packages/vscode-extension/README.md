# MUSUBI SDD - VS Code Extension

**Ultimate Specification Driven Development Tool**

27 Skills • 7 AI Platforms • Constitutional Governance

[![Version](https://img.shields.io/visual-studio-marketplace/v/nahisaho.musubi-sdd)](https://marketplace.visualstudio.com/items?itemName=nahisaho.musubi-sdd)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/nahisaho.musubi-sdd)](https://marketplace.visualstudio.com/items?itemName=nahisaho.musubi-sdd)

## Features

### 🎯 Project Steering
- View and edit steering documents (product, structure, tech)
- Constitutional rules viewer
- Project memories management

### 📋 Requirements Management
- EARS format requirements viewer
- Priority-based organization (P0, P1, P2)
- Quick navigation to requirements files

### ✅ Task Tracking
- View task breakdown files
- Status indicators (completed, in-progress, not-started)
- Direct file access

### 🤖 Skills Explorer
- 27 specialized AI skills
- Categorized by function
- Quick reference

### 📊 Status Bar
- Real-time compliance score
- Click to refresh
- Visual indicators (🟢 🟡 🔴)

## Commands

Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type:

| Command | Description |
|---------|-------------|
| `MUSUBI: Initialize Project` | Initialize MUSUBI in workspace |
| `MUSUBI: Validate Constitutional Compliance` | Check compliance |
| `MUSUBI: Show Compliance Score` | Calculate score (0-100%) |
| `MUSUBI: Generate Requirements` | Create EARS requirements |
| `MUSUBI: Generate Design` | Create C4 + ADR design |
| `MUSUBI: Generate Tasks` | Create task breakdown |
| `MUSUBI: Sync Steering Documents` | Sync with codebase |
| `MUSUBI: Analyze Codebase` | Run code analysis |
| `MUSUBI: Refresh Views` | Refresh all tree views |

## Supported Platforms

Initialize with your preferred AI coding platform:

- **Claude Code** (default)
- **GitHub Copilot**
- **Cursor**
- **Gemini CLI**
- **Windsurf**
- **Codex CLI**
- **Qwen Code**

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `musubi.autoValidate` | `true` | Auto-validate on save |
| `musubi.showStatusBar` | `true` | Show status bar item |
| `musubi.defaultPlatform` | `claude-code` | Default platform |
| `musubi.cliPath` | `npx musubi-sdd` | CLI executable path |

## Requirements

- **VS Code** 1.85.0+
- **Node.js** 18.0.0+
- **MUSUBI CLI** (`npm install -g musubi-sdd`)

## Installation

### From Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "MUSUBI SDD"
4. Click Install

### From VSIX
```bash
code --install-extension musubi-sdd-0.1.0.vsix
```

## Getting Started

1. Open a project in VS Code
2. Open Command Palette (`Ctrl+Shift+P`)
3. Run `MUSUBI: Initialize Project`
4. Select your AI platform
5. Start using SDD workflow!

## Links

- [MUSUBI Documentation](https://github.com/nahisaho/MUSUBI)
- [npm Package](https://www.npmjs.com/package/musubi-sdd)
- [Report Issues](https://github.com/nahisaho/MUSUBI/issues)

## License

MIT © 2025 nahisaho
