# 技術スタック

**プロジェクト**: musubi
**最終更新**: 2025-12-12
**バージョン**: 5.9.0

---

## 概要

MUSUBI は Node.js/JavaScript で構築された仕様駆動開発 (SDD) ツールです。

## 言語

- JavaScript (メイン)
- TypeScript (型定義)
- Markdown (ドキュメント)
- YAML (設定ファイル)
- JSON (スキーマ)

## フレームワーク

| フレームワーク | バージョン | 用途 |
|--------------|-----------|------|
| Jest | ^29.0.0 | テスティング |
| Commander.js | ^12.0.0 | CLI フレームワーク |
| AJV | ^8.12.0 | JSON Schema 検証 |
| ajv-formats | ^2.1.1 | フォーマット検証 |
| js-yaml | ^4.1.0 | YAML パース |
| CodeGraph MCP | 0.8.0 | コードグラフ分析 |

## ツール

- **ESLint** (^8.50.0) - リンティング
- **Prettier** (^3.0.0) - フォーマッティング
- **CodeGraph MCP Server** - GraphRAG コード分析

## CodeGraph MCP v0.8.0 機能

- 14 MCP ツール (query, dependencies, callers, callees など)
- 4 MCP リソース (entities, files, communities, stats)
- 6 MCP プロンプト (code review, explain, implement, debug, refactor, test)
- ファイル監視と自動再インデックス
- コミュニティ検出 (Louvain アルゴリズム)
- Global/Local GraphRAG 検索

## MUSUBI v5.9.0 機能

### エンタープライズ機能 (Phase 1-4)

| 機能 | 説明 |
|------|------|
| **ワークフローモード** | small (5段階), medium (6段階), large (8段階) |
| **モノレポサポート** | packages.yml, PackageManager |
| **Constitution レベル** | critical (必須), advisory (推奨), flexible (柔軟) |
| **project.yml v2.0** | JSON Schema 検証、マイグレーションサポート |

### 新規 CLI コマンド

- `musubi-release` - リリース管理
- `musubi-config` - プロジェクト設定管理 (validate/migrate/show/init)

### 組み込みスキル

- `release-manager` - リリース管理スキル
- `workflow-mode-manager` - ワークフローモード管理
- `package-manager` - モノレポパッケージ管理
- `constitution-level-manager` - Constitution レベル管理
- `project-config-manager` - プロジェクト設定管理

---

*更新: 2025-12-12 - MUSUBI v5.9.0 エンタープライズ機能*
