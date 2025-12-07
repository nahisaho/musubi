# MUSUBI P1 ロードマップ - 機能差別化フェーズ

## 概要

本ドキュメントは、MUSUBI v2.5.0 ～ v3.0.0 の P1（High Priority）要件の実装ロードマップを定義します。

### P1 要件一覧

| ID | 要件名 | 工数 | 依存関係 | ターゲット | 状態 |
|----|--------|------|----------|-----------|------|
| REQ-P1-001 | Browser Automation Agent | 4週間 | なし | v3.0.0 | ✅ 完了 |
| REQ-P1-002 | Web GUI Dashboard | 4週間 | なし | v3.0.0 | ✅ 完了 |
| REQ-P1-003 | VS Code Extension | 3週間 | なし | v2.2.0 | ✅ 完了 |
| REQ-P1-004 | Spec Kit Compatibility | 3週間 | なし | v2.2.0 | ✅ 完了 |

**全 P1 要件完了** 🎉

## 完了サマリー

### REQ-P1-001 Browser Automation Agent ✅
- **コミット**: af4c26c
- **成果物**:
  - `src/agents/browser-agent.js` - Playwright統合
  - `src/templates/skills/browser-agent.md` - Claude Codeスキル
  - E2Eテスト生成、スクリーンショット比較機能

### REQ-P1-002 Web GUI Dashboard ✅
- **コミット**: 9204e3f
- **成果物**:
  - `bin/musubi-gui.js` - CLI (start, dev, status, matrix)
  - `src/gui/server.js` - Express + WebSocket サーバー
  - `src/gui/services/` - ProjectScanner, FileWatcher, WorkflowService, TraceabilityService
  - REST API: /api/project, /api/specs, /api/traceability, /api/workflow, /api/steering

### REQ-P1-003 VS Code Extension ✅
- **公開**: VS Code Marketplace
- **成果物**:
  - サイドバー、ステータスバー、コマンドパレット統合
  - SDDワークフローコマンド

### REQ-P1-004 Spec Kit Compatibility ✅
- **コミット**: 86b3721
- **成果物**:
  - `src/managers/speckit-manager.js` - 変換マネージャー
  - `musubi-convert` コマンド
  - MUSUBI ↔ Spec Kit 双方向変換

---

## タイムライン（実績）

```
2025 Q1
├── 1月: REQ-P1-003 VS Code Extension（3週間）
│   ├── Week 1-2: 基盤 + サイドバー
│   └── Week 3: ステータスバー + 公開
│
├── 2月: REQ-P1-004 Spec Kit Compatibility（3週間）
│   ├── Week 1: IR スキーマ + パーサー
│   ├── Week 2: ライター + マッパー
│   └── Week 3: 検証 + ラウンドトリップ
│
└── 3月: REQ-P1-001 Browser Automation（4週間）
    ├── Week 1-2: Playwright 統合
    └── Week 3-4: スクリーンショット比較 + AI

2025 Q2
├── 4月: REQ-P1-002 Web GUI Dashboard（4週間）
│   ├── Week 1-2: サーバー + 基本UI
│   └── Week 3-4: ビジュアライゼーション
│
└── 5月: v3.0.0 リリース準備
    ├── 統合テスト
    ├── ドキュメント整備
    └── リリース
```

## 実装順序の根拠

### 1. REQ-P1-003 VS Code Extension（最優先）

**理由**:
- ✅ 高インパクト: 開発者の日常ワークフローに直接統合
- ✅ 中複雑度: 既存 CLI のラッパーとして実装可能
- ✅ マーケティング効果: Marketplace 公開でリーチ拡大
- ✅ 依存関係なし: 独立して開発可能

**成果物**:
- VS Code Marketplace 公開
- サイドバー、ステータスバー、コマンドパレット

### 2. REQ-P1-004 Spec Kit Compatibility（2番目）

**理由**:
- ✅ エコシステム統合: GitHub 公式ツールとの互換性
- ✅ 移行パス提供: Spec Kit ユーザーの獲得
- ✅ 技術的学習: 変換システムの知見を他フォーマットに応用可能
- ✅ 中規模工数: 3週間で完了可能

**成果物**:
- `musubi-convert` コマンド
- MUSUBI ↔ Spec Kit 双方向変換

### 3. REQ-P1-001 Browser Automation（3番目）

**理由**:
- ✅ 差別化機能: 競合ツールにない独自機能
- ⚠️ 高複雑度: Playwright 統合、AI スクリーンショット比較
- ⚠️ 4週間の工数が必要
- ✅ E2E テスト自動化のニーズは高い

**成果物**:
- `browser-agent` Claude Code スキル
- Playwright テストコード生成
- スクリーンショット比較（95%+ 精度）

### 4. REQ-P1-002 Web GUI Dashboard（最後）

**理由**:
- ✅ CLI/Extension が完成後の補完機能
- ⚠️ 最大工数: フロントエンド開発が必要
- ✅ 可視化機能で MUSUBI の価値を直感的に伝達
- ✅ 他の機能が完成していると UI 統合が容易

**成果物**:
- `musubi-gui` コマンド
- ダッシュボード（localhost:3000）
- トレーサビリティマトリクス可視化

---

## REQ-P1-003: VS Code Extension 詳細計画

### 設計ドキュメント

- [ADR-P1-003: VS Code Extension](./adr/ADR-P1-003-vscode-extension.md)
- [REQ-P1-003 設計書](./REQ-P1-003-vscode-extension-design.md)

### マイルストーン

| Week | 成果物 | 受入基準 |
|------|--------|----------|
| 1 | プロジェクト基盤 | TypeScript ビルド成功 |
| 1 | サイドバー TreeView | steering/ 表示 |
| 2 | ステータスバー | 憲法準拠率表示 |
| 2 | コマンドパレット | /sdd-* コマンド動作 |
| 3 | パッケージング | .vsix 生成 |
| 3 | Marketplace 公開 | "MUSUBI SDD" 公開 |

### 技術スタック

- **言語**: TypeScript 5.x
- **フレームワーク**: VS Code Extension API
- **Webview**: React 18
- **ビルド**: esbuild
- **テスト**: @vscode/test-electron

### リスク

| リスク | 確率 | 影響 | 対策 |
|--------|------|------|------|
| Marketplace 審査遅延 | 中 | 低 | 余裕を持ったスケジュール |
| API 互換性問題 | 低 | 中 | VS Code 最新安定版をターゲット |

---

## REQ-P1-004: Spec Kit Compatibility 詳細計画

### 設計ドキュメント

- [ADR-P1-004: Spec Kit Compatibility](./adr/ADR-P1-004-speckit-compatibility.md)
- [REQ-P1-004 設計書](./REQ-P1-004-speckit-compatibility-design.md)

### マイルストーン

| Week | 成果物 | 受入基準 |
|------|--------|----------|
| 1 | IR スキーマ | TypeScript 型定義完了 |
| 1 | Spec Kit パーサー | constitution.md パース成功 |
| 2 | MUSUBI ライター | steering/ 生成 |
| 2 | 憲法マッパー | 9条項マッピング |
| 2 | 要件マッパー | EARS ↔ User Stories |
| 3 | CLI 実装 | musubi-convert 動作 |
| 3 | ラウンドトリップテスト | 95%+ 類似度 |

### 技術スタック

- **言語**: JavaScript (ES Modules)
- **CLI**: Commander.js
- **パーサー**: marked（Markdown）
- **テスト**: Jest

### リスク

| リスク | 確率 | 影響 | 対策 |
|--------|------|------|------|
| Spec Kit 仕様変更 | 中 | 中 | バージョン固定、抽象化層 |
| 情報損失 | 低 | 高 | 徹底的なラウンドトリップテスト |

---

## REQ-P1-001: Browser Automation Agent 詳細計画

### 概要設計

```
┌─────────────────────────────────────────────────────────┐
│                   Browser Agent Skill                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ NL Command  │  │ Playwright  │  │  Screenshot     │ │
│  │ Interpreter │──│   Driver    │──│  Comparator     │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         │                │                   │          │
│  ┌──────┴──────┐  ┌─────┴─────┐     ┌──────┴──────┐   │
│  │ LLM Action  │  │ Browser   │     │ AI Vision   │   │
│  │ Parser      │  │ Context   │     │ (GPT-4V)    │   │
│  └─────────────┘  └───────────┘     └─────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### マイルストーン

| Week | 成果物 | 受入基準 |
|------|--------|----------|
| 1 | Playwright 統合基盤 | ブラウザ起動成功 |
| 1 | NL コマンドパーサー | 基本操作パース |
| 2 | ブラウザ操作実装 | click/type/navigate 動作 |
| 2 | コンテキスト管理 | 複数タブ/ページ対応 |
| 3 | スクリーンショット取得 | 自動キャプチャ |
| 3 | AI 比較エンジン | GPT-4V 統合 |
| 4 | E2E コード生成 | Playwright テスト出力 |
| 4 | Claude Code スキル登録 | browser-agent 動作 |

### 技術スタック

- **ブラウザ自動化**: Playwright
- **AI ビジョン**: GPT-4V / Claude 3 Vision
- **テスト生成**: Playwright Test 形式
- **スキル統合**: Claude Code Skills API

### リスク

| リスク | 確率 | 影響 | 対策 |
|--------|------|------|------|
| AI 比較精度不足 | 中 | 高 | 複数モデル併用、閾値調整 |
| Playwright バージョン互換 | 低 | 中 | バージョン固定 |
| コスト（Vision API） | 中 | 中 | キャッシュ、バッチ処理 |

---

## REQ-P1-002: Web GUI Dashboard 詳細計画

### 概要設計

```
┌─────────────────────────────────────────────────────────┐
│                     musubi-gui                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │                  Frontend (React)                │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │   │
│  │  │Dashboard│  │Workflow │  │  Traceability   │  │   │
│  │  │  Panel  │  │ Editor  │  │     Matrix      │  │   │
│  │  └─────────┘  └─────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │                 Backend (Express)                │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │   │
│  │  │  REST   │  │WebSocket│  │  File Watcher   │  │   │
│  │  │   API   │  │  (Live) │  │   (steering/)   │  │   │
│  │  └─────────┘  └─────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### マイルストーン

| Week | 成果物 | 受入基準 |
|------|--------|----------|
| 1 | Express サーバー | localhost:3000 起動 |
| 1 | REST API 基盤 | /api/steering GET |
| 2 | React フロントエンド | ダッシュボード表示 |
| 2 | ファイルウォッチャー | 変更リアルタイム反映 |
| 3 | ワークフローエディタ | ドラッグ＆ドロップ |
| 3 | WebSocket 統合 | ライブアップデート |
| 4 | トレーサビリティ可視化 | D3.js グラフ |
| 4 | 統合テスト | E2E テスト通過 |

### 技術スタック

- **バックエンド**: Express.js, WebSocket
- **フロントエンド**: React 18, Tailwind CSS
- **可視化**: D3.js, React Flow
- **ビルド**: Vite
- **テスト**: Playwright (E2E)

### リスク

| リスク | 確率 | 影響 | 対策 |
|--------|------|------|------|
| フロントエンド工数超過 | 中 | 中 | MVP 優先、段階リリース |
| ブラウザ互換性 | 低 | 低 | 主要ブラウザのみサポート |

---

## マイルストーン・リリース計画

### v2.5.0（2025年1月末）

**主要機能**: VS Code Extension
- ✅ VS Code Marketplace 公開
- ✅ サイドバー TreeView
- ✅ ステータスバー
- ✅ コマンドパレット統合

### v2.6.0（2025年2月中旬）

**主要機能**: Spec Kit Compatibility
- ✅ musubi-convert CLI
- ✅ MUSUBI → Spec Kit エクスポート
- ✅ Spec Kit → MUSUBI インポート
- ✅ ラウンドトリップ検証

### v2.7.0（2025年3月末）

**主要機能**: Browser Automation Agent
- ✅ browser-agent スキル
- ✅ Playwright 統合
- ✅ スクリーンショット比較
- ✅ E2E テストコード生成

### v2.8.0（2025年4月末）

**主要機能**: Web GUI Dashboard
- ✅ musubi-gui コマンド
- ✅ ダッシュボード
- ✅ ワークフローエディタ
- ✅ トレーサビリティ可視化

### v3.0.0（2025年5月）

**メジャーリリース**: 全 P1 機能統合
- 全 P1 機能の統合テスト
- ドキュメント整備
- パフォーマンス最適化
- 正式リリース

---

## リソース計画

### 開発リソース

| 役割 | 工数 | 担当フェーズ |
|------|------|-------------|
| コア開発 | 100% | 全フェーズ |
| フロントエンド | 40% | P1-002, P1-003 |
| テスト/QA | 20% | 全フェーズ |

### 外部リソース

| リソース | 用途 | コスト |
|----------|------|--------|
| VS Code Marketplace | 拡張機能公開 | 無料 |
| GitHub Actions | CI/CD | 無料 (OSS) |
| OpenAI API | Vision 比較 | 従量課金 |

---

## 成功指標 (KPI)

### P1 完了基準

| 指標 | ターゲット | 測定方法 |
|------|-----------|----------|
| VS Code インストール数 | 1,000+ | Marketplace 統計 |
| Spec Kit 変換成功率 | 95%+ | ラウンドトリップテスト |
| Browser Agent 精度 | 95%+ | スクリーンショット比較テスト |
| GUI ユーザー満足度 | 4.0+/5.0 | フィードバック調査 |

### v3.0.0 リリース基準

| 基準 | 状態 |
|------|------|
| 全 P1 要件の受入基準達成 | ☐ |
| 全ユニットテスト通過 | ☐ |
| 全統合テスト通過 | ☐ |
| ドキュメント完備 | ☐ |
| セキュリティレビュー完了 | ☐ |

---

## 次のアクション

1. **即時**: REQ-P1-003 VS Code Extension 実装開始
2. **Week 1**: プロジェクト構造作成、TypeScript 設定
3. **Week 2**: サイドバー TreeView 実装
4. **Week 3**: Marketplace 公開準備

---

## 関連ドキュメント

- [SRS v3.0.0](../requirements/srs/srs-musubi-v3.0.0.md)
- [Project Plan v3.0.0](../plans/project-plan-v3.0.0.md)
- [ADR-P1-003: VS Code Extension](./adr/ADR-P1-003-vscode-extension.md)
- [ADR-P1-004: Spec Kit Compatibility](./adr/ADR-P1-004-speckit-compatibility.md)
