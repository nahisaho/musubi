## はじめに

**「1人のAIより、チームで働くAI」** ── これが次世代のコーディング体験です。

GitHub Copilot は優秀な「個人プレイヤー」ですが、**MUSUBI** と **CodeGraph MCP Server** を組み合わせることで、**専門家チームとして協調するSwarm coding** が実現します。

**3,958のテスト、132のテストスイート、12,093のコードエンティティ、59,222のリレーション**を持つMUSUBI v5.7.0は、エンタープライズグレードの開発基盤として設計されています。

### GitHub Copilot単体の限界

GitHub Copilotは素晴らしいツールですが、**エンタープライズアプリケーション開発**には以下の課題があります。

| 課題 | 具体例 | エンタープライズでの影響 |
|------|--------|------------------------|
| **コンテキストの断片化** | ファイル単位でしかコードを理解できない | 大規模コードベースで依存関係を見落とす |
| **仕様との紐付けなし** | 「なぜこのコードが必要か」を知らない | 要件変更時に影響範囲が不明 |
| **設計判断の欠如** | アーキテクチャを考慮せずにコード生成 | 技術的負債の蓄積 |
| **品質基準の不在** | プロジェクト固有のルールを知らない | コーディング規約違反、セキュリティホール |
| **トレーサビリティなし** | 要件→設計→実装→テストの追跡不可 | 監査・コンプライアンス対応が困難 |
| **一貫性の欠如** | セッションごとに回答がブレる | チーム開発での混乱 |

:::note warn
**エンタープライズ開発に必要なもの**
- 仕様に基づいた一貫した実装
- プロジェクト全体のコンテキスト把握
- アーキテクチャ決定の記録（ADR）
- 品質ゲートと自動検証
- 変更の影響分析
- 監査可能なトレーサビリティ

**GitHub Copilot + MUSUBI + CodeGraph** で、これらすべてを実現します。
:::

:::note info
**Swarm Coding（スウォームコーディング）とは？**
複数のAIエージェントが連携してソフトウェア開発を行う手法です。人間がチームで開発するのと同じように、AIたちが役割分担し、協力しながら複雑なタスクを自律的に遂行します。

**主な特徴：**
- **マルチエージェントシステム**: 単一の巨大AIではなく、特定の役割（プランナー、コーダー、テスター、レビュアーなど）を持つ複数のAIエージェントで構成
- **自律的な連携**: 各エージェントは蜂の群れ（swarm）のように自律的に協調動作し、全体の目標達成に向けてタスクを処理
- **動的なタスク管理**: 問題発生時やより良い解決策が見つかった場合に、AI自身がタスクプランを動的に修正・再計画（リプランニング）
- **現実環境との統合**: コードベース検索、テスト実行、バージョン管理（Git）といった実際の開発ツールと統合
- **効率化と生産性向上**: AIエージェントが同時並行で作業を進めるため、開発速度の大幅な向上が可能

このアプローチは、OpenAI Agents SDK や AutoGen に触発されたマルチエージェント協調パターンであり、ソフトウェア開発に革命をもたらす可能性を秘めた新しい概念として注目されています。
:::

## SDD（仕様駆動開発）とは

MUSUBIは**SDD（Specification Driven Development：仕様駆動開発）** を実現するフレームワークです。

### なぜSDDなのか？

従来のAIコーディングでは「コードを生成する」ことがゴールでした。しかし、エンタープライズ開発では**仕様→設計→実装→テスト→運用**という一貫したプロセスが求められます。

| 課題 | 従来のAI開発 | SDD（MUSUBI） |
|------|-------------|---------------|
| **仕様の曖昧さ** | 自然言語のまま実装 | EARS形式で形式化 |
| **設計の欠如** | いきなりコード生成 | C4モデル + ADRで設計 |
| **トレーサビリティ** | なし | REQ → Design → Code → Test を追跡 |
| **品質保証** | 手動レビュー頼み | 憲法 + ガードレールで自動検証 |
| **変更管理** | 差分が不明確 | Delta仕様で変更を明示 |

### SDDの8ステージワークフロー

MUSUBIのSDDワークフローは8つのステージで構成されています。

| ステージ | 名前 | 内容 | 成果物 |
|---------|------|------|--------|
| 1 | **Steering** | プロジェクトメモリの初期化・更新 | `steering/` ディレクトリ |
| 2 | **Requirements** | EARS形式での要件定義 | `storage/specs/*.ears.md` |
| 3 | **Design** | C4モデル + ADR作成 | `storage/specs/*.design.md` |
| 4 | **Tasks** | 実装タスクへの分解 | `storage/specs/*.tasks.md` |
| 5 | **Implement** | Swarm Codingによる実装 | ソースコード |
| 6 | **Validate** | 憲法準拠の検証 | 検証レポート |
| 7 | **Review** | Human-in-Loopレビュー | 承認/修正指示 |
| 8 | **Release** | リリース準備・変更ログ | CHANGELOG, タグ |

### EARS形式とは

**EARS（Easy Approach to Requirements Syntax）** は、自然言語の曖昧さを排除するための要件記述形式です。

| パターン | テンプレート | 例 |
|----------|-------------|-----|
| **Ubiquitous** | The system shall... | システムは認証トークンを暗号化しなければならない |
| **Event-Driven** | When [event], the system shall... | ログインボタンが押されたとき、システムは認証処理を開始する |
| **State-Driven** | While [state], the system shall... | オフライン状態の間、システムはローカルキャッシュを使用する |
| **Optional** | Where [feature], the system shall... | 二要素認証が有効な場合、システムはSMSコードを送信する |
| **Unwanted** | If [condition], the system shall not... | 5回連続で失敗した場合、システムはアカウントをロックする |

:::note info
**SDDのメリット**
- **AIの一貫性**: 仕様に基づいてAIが判断するため、ブレが少ない
- **レビューの効率化**: 仕様 vs 実装の差分が明確
- **ドキュメントの自動生成**: 仕様からAPIドキュメントやテストケースを生成
- **変更の影響分析**: 仕様変更時に影響範囲を自動検出
:::

## なぜMUSUBIなのか？── 圧倒的なスケール

### v5.7.0の実績データ

| メトリクス | 数値 | 意味 |
|-----------|------|------|
| **テスト数** | 3,958 | 業界最高水準のテストカバレッジ |
| **テストスイート** | 132 | 包括的な品質保証 |
| **コードエンティティ** | 12,093 | 関数、クラス、変数等の解析対象 |
| **コードリレーション** | 59,222 | 依存関係・呼び出し関係の把握 |
| **コミュニティ（モジュール）** | 140 | 自動検出されたモジュール境界 |
| **対応プラットフォーム** | 13+ | Claude, Copilot, Cursor, Windsurf, Gemini, Codex... |
| **専門スキル** | 25 | 仕様からデプロイまで網羅 |
| **オーケストレーションパターン** | 9 | Swarm, Handoff, Triage, Human-in-Loop... |

### v5.7.0 新機能：Performance Optimization

v5.7.0 では、エンタープライズ向けのパフォーマンス最適化モジュールを追加しました。

| 機能 | 説明 | 効果 |
|------|------|------|
| **LazyLoader** | オンデマンドモジュール読み込み | 起動時間短縮、メモリ効率化 |
| **CacheManager** | LRUキャッシュ + TTL管理 | API応答時間 30%+ 改善 |
| **BatchProcessor** | バルク処理の並列実行 | 大量データ処理の効率化 |
| **ConnectionPool** | 接続プーリング | リソース管理の最適化 |
| **PerformanceMonitor** | パーセンタイル計算付きメトリクス | ボトルネック特定 |

```javascript
// LazyLoader 使用例
const { defaultLoader } = require('musubi-sdd/src/performance');
const analyzer = await defaultLoader.load('complexity-analyzer');

// CacheManager 使用例  
const { defaultCacheManager } = require('musubi-sdd/src/performance');
await defaultCacheManager.set('api-response', 'key', data, { ttl: 300000 });
```

### 実証検証プロジェクト

MUSUBIのエンタープライズ機能は、実際の大規模プロジェクトで開発・検証しました。

#### Linuxカーネル（3,000万行）── 超大規模コードベースの効率的開発

**Linuxカーネル**は、世界最大級のオープンソースプロジェクトです。MUSUBIがこのような超大規模コードベースでも効率的に開発を支援できるかを検証しています。

| 項目 | 結果 |
|------|------|
| ファイル数 | 80,000+ |
| コード行数 | 30,000,000+ |
| サブシステム数 | 100+ |
| 年間コミット数 | 70,000+ |

**Linuxカーネル開発の課題とMUSUBIの対応**

| 課題 | 従来の開発 | MUSUBI + CodeGraph |
|------|-----------|-------------------|
| **コードナビゲーション** | cscope/ctags、手動検索 | CodeGraph `global_search` で即座に特定 |
| **サブシステム理解** | ドキュメント + 経験 | `community` でモジュール境界を自動検出 |
| **変更影響分析** | メンテナーの経験頼み | `find_dependencies` で波及範囲を可視化 |
| **コーディング規約** | checkpatch.pl | 憲法 + ガードレールで自動検証 |
| **ドライバ開発** | テンプレートからコピペ | SDD + Swarm Codingで構造化生成 |

**検証シナリオ：新規デバイスドライバの開発**

1. **要件定義**: EARS形式で新規ドライバの仕様を記述
2. **アーキテクチャ確認**: CodeGraphで既存ドライバのパターンを分析
3. **Swarm Coding**: 複数スキルが協調してドライバコードを生成
4. **品質検証**: Linuxカーネルコーディング規約への準拠を自動チェック

:::note info
**なぜLinuxカーネルで検証するのか？**
Linuxカーネルは、コード量・複雑度・開発者数のすべてにおいて世界最高レベルのプロジェクトです。ここで効率的に動作することを確認できれば、ほぼすべてのエンタープライズプロジェクトに対応できると言えます。
:::

#### GCCコードベース（1,000万行）── 相関の強いコードの改修

**GCC（GNU Compiler Collection）** の実際の解析で、**相関の強いコードの改修**における巨大コードベース対応を検証しました。

GCCのようなコンパイラは、各モジュールが密接に連携しており、1箇所の変更が広範囲に波及します。MUSUBIのCodeGraph連携により、この「相関の強さ」を可視化し、安全な改修を実現しています。

| 項目 | 結果 |
|------|------|
| ファイル数 | 100,000+ |
| コード行数 | 10,000,000+ |
| 検出された巨大関数 | 1,000行超の関数を複数検出 |
| メモリ効率 | ストリーミング分析で2GB以内で処理可能 |

**相関分析による改修支援**

| 分析項目 | MUSUBIの機能 | GCCでの活用 |
|----------|-------------|-------------|
| **依存関係の可視化** | CodeGraph `find_dependencies` | 変更による影響範囲の特定 |
| **呼び出し元追跡** | CodeGraph `find_callers` | 関数変更時の波及先を把握 |
| **コミュニティ検出** | CodeGraph `community` | 密結合モジュールの特定 |
| **影響分析** | MUSUBI Impact Analyzer | 改修前にリスク評価 |

**Rust置換によるセキュリティ強化実験**

GCCのC/C++コードをRustに置き換えることで、メモリ安全性を向上させる実験も行っています。MUSUBIの **Rust Migration Generator** を使用して、危険なパターンを自動検出し、安全なRustコードへの移行を支援しています。

| 検出カテゴリ | GCCでの検出数 | セキュリティリスク |
|-------------|--------------|------------------|
| メモリ管理（malloc/free） | 多数 | メモリリーク、二重解放 |
| 文字列操作（strcpy/sprintf） | 多数 | バッファオーバーフロー |
| ポインタ演算 | 多数 | 不正メモリアクセス |
| 並行処理（pthread） | 多数 | データ競合 |

この実験により、MUSUBIのCodeGraphとRust Migration Generatorが、**相関の強い巨大コードベースでも安全な改修を支援**できることを確認しています。

#### ウラノス・エコシステム・データスペーシズ（IPA/経産省）

**[ウラノス・エコシステム・データスペーシズ リファレンスアーキテクチャモデル（ODS-RAM）](https://www.ipa.go.jp/digital/architecture/reports/ouranos-ecosystem-dataspaces-ram-white-paper.html)** のホワイトペーパーを参照し、**実際に動作するモデルが生成できるかどうか**を検証しています。

| 項目 | 内容 |
|------|------|
| **提供元** | IPA（情報処理推進機構）/ 経済産業省 |
| **目的** | 企業・業界・国境を横断した産業データ連携 |
| **アーキテクチャ** | 4レイヤ × 4パースペクティブ |
| **課題領域** | データ連携・利活用の13の構造的課題 |
| **MUSUBIでの検証** | ホワイトペーパーから動作するモデルを生成 |

**検証アプローチ:**

1. **ホワイトペーパー解析**: ODS-RAMホワイトペーパーをMUSUBIで解析し、アーキテクチャ要件を抽出
2. **SDD変換**: 抽出した要件をEARS形式の仕様書に変換
3. **コード生成**: Swarm Codingによるリファレンス実装の自動生成
4. **動作検証**: 生成されたモデルが実際に動作することを確認

:::note info
**ODS-RAMとは？**
ウラノス・エコシステムにおけるサービス主導のデータスペース構築に向けた技術参照文書です。データ主権を担保しながら、分散・連邦ハイブリッド型のサービスエコシステムを実現するためのアーキテクチャモデルを提供しています。

MUSUBIは、このホワイトペーパーを入力として、**仕様書 → 設計 → 実装 → 検証**の一連のプロセスを自動化し、実際に動作するリファレンス実装を生成できることを検証しています。
:::

## Swarm Codingの仕組み

### 従来のAIコーディング vs Swarm Coding

従来のAIコーディングは「1人の万能AI」に頼るアプローチでした。しかし、複雑なプロジェクトでは限界があります。Swarm Codingは、人間のチーム開発と同じように、**専門性を持った複数のAIエージェントが協調**して作業を進めます。

| 従来 | Swarm Coding (MUSUBI) |
|------|----------------------|
| 1つのAIに全部任せる | 専門家チームが協調 |
| コンテキストが不足 | CodeGraphで全体像を把握 |
| 一発勝負 | Handoff/Triage で適切にルーティング |
| 品質は運次第 | 9つの憲法条項でガバナンス |
| トレーサビリティなし | REQ → Design → Code → Test 完全追跡 |

### 9つのオーケストレーションパターン

MUSUBIは、タスクの性質や状況に応じて**9つの協調パターン**を使い分けます。これはOpenAI Agents SDKやAutoGenのマルチエージェントパターンに触発されたもので、単純な順次処理から複雑な群知能まで対応します。

| # | パターン | 説明 | ユースケース |
|---|----------|------|-------------|
| 1 | **Sequential** | 順次実行 | 仕様→設計→実装→テスト |
| 2 | **Parallel** | 並列実行 | フロント/バック同時開発 |
| 3 | **Swarm** | 群知能協調 | 全員で問題解決 |
| 4 | **Handoff** | 委譲 | 専門家にバトンタッチ |
| 5 | **Triage** | 振り分け | 適切なエージェントへルーティング |
| 6 | **Human-in-Loop** | 人間承認 | 重要決定は人間が判断 |
| 7 | **Nested** | 入れ子 | 複雑なワークフロー |
| 8 | **Group Chat** | グループチャット | 複数エージェント議論 |
| 9 | **Auto** | 自動選択 | 状況に応じて最適パターン |

## CodeGraph MCP Server とは

**CodeGraph MCP Server** は、ソースコードをグラフ構造として解析し、MCP（Model Context Protocol）経由でAIエージェントに提供するサーバーです。

### なぜCodeGraphが必要なのか？

従来のAIコーディングアシスタントは「ファイル単位」でしかコードを理解できません。CodeGraphはプロジェクト全体を**グラフ構造**として把握し、以下を可能にします。

| 課題 | 従来のAI | CodeGraph連携 |
|------|----------|---------------|
| 関数の呼び出し元 | grep検索、見落としあり | `find_callers` で完全リスト |
| 依存関係 | import文を目視 | `find_dependencies` で深い依存も検出 |
| 変更の影響範囲 | 「たぶん大丈夫」 | 影響分析で波及範囲を完全把握 |
| コード構造理解 | ファイルを1つずつ | `stats` + `community` で即座に全体像 |

### CodeGraphが提供する14のMCPツール

```
コードグラフ操作
├── init_graph          - グラフ初期化
├── get_code_snippet    - ソースコード取得
├── find_callers        - 呼び出し元追跡
├── find_callees        - 呼び出し先追跡
└── find_dependencies   - 依存関係分析

検索機能
├── local_search        - ローカルコンテキスト検索
├── global_search       - グローバル検索
└── query_codebase      - 自然言語クエリ

分析機能
├── analyze_module_structure  - モジュール構造分析
├── suggest_refactoring       - リファクタリング提案
├── stats                     - コードベース統計
└── community                 - コミュニティ検出
```

### 対応言語（14言語）

Python, JavaScript, TypeScript, Java, C#, Go, Rust, Ruby, PHP, C++, Swift, Kotlin, Scala, HCL（Terraform）

### musubi-analyze vs codegraph：どちらを使う？

MUSUBIには`musubi-analyze`コマンドがあり、CodeGraph MCP Serverとは別の分析機能を提供します。用途に応じて使い分けてください。

| 項目 | `musubi-analyze` | `codegraph` (MCP Server) |
|------|------------------|--------------------------|
| **提供元** | MUSUBI内蔵 | 外部MCPサーバー |
| **主な用途** | プロジェクト統計、複雑度分析、巨大関数検出 | コードグラフ構築、依存関係追跡、影響分析 |
| **出力先** | コンソール / レポート | `steering/memories/codegraph.md` |
| **AIとの連携** | 分析結果をAIに提供 | MCPプロトコルでリアルタイム連携 |
| **インストール** | `npm install -g musubi-sdd` | `uvx codegraph-mcp` |

**使い分けの目安：**

| やりたいこと | 使うコマンド |
|-------------|-------------|
| プロジェクトの統計情報を見たい | `npx musubi-analyze` |
| 複雑度が高い関数を見つけたい | `npx musubi-analyze --complexity` |
| 巨大関数を検出したい | `npx musubi-analyze --giant-functions` |
| 関数の呼び出し元を追跡したい | CodeGraph (`find_callers`) |
| 変更の影響範囲を知りたい | CodeGraph (`find_dependencies`) |
| AIに全体像を把握させたい | `npx musubi-analyze --codegraph-full` |

:::note info
**ベストプラクティス**
両方を併用するのがおすすめです。`musubi-analyze --codegraph-full` を実行すると、MUSUBIの分析結果とCodeGraphインデックスの両方が生成され、AIエージェントが最大限の情報を活用できます。
:::

### 自然言語でインデックス操作

MUSUBIでは、CodeGraphのインデックス作成・更新も自然言語で行えます。

```
GitHub Copilotに話しかけるだけ：

「CodeGraph MCP Index を作成」
「CodeGraph MCP Index を更新」
「コードグラフを再構築して」

→ MUSUBIが自動的に以下を実行：
   1. リポジトリ全体をスキャン
   2. エンティティ（関数、クラス、変数）を抽出
   3. リレーション（呼び出し、依存、継承）を解析
   4. コミュニティ（モジュール境界）を検出
   5. インデックスを steering/memories/codegraph.md に保存
```

## セットアップ（1分）

:::note warn
**Windowsの場合：WSL（Windows Subsystem for Linux）上にインストールしてください**

MUSUBIとCodeGraph MCP Serverは**WSL上のUbuntu**で動作させることを推奨します。

**事前にWSL（Ubuntu）上でインストールしておくパッケージ：**

```bash
# Node.js（v18以上）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python 3, pip, pipx（CodeGraph MCP Serverに必要）
sudo apt-get update
sudo apt-get install -y python3 python3-pip pipx
pipx ensurepath

# Git（必須）
sudo apt-get install -y git
```

**VSCodeからWSLに接続：**
1. VSCodeで `Ctrl+Shift+P` → `WSL: Connect to WSL`
2. WSL上でプロジェクトを開く
3. WSL上のターミナルで `npx musubi-sdd init --copilot` を実行

**なぜWSLが必要？**
- CodeGraph MCP Serverは Python環境が必要
- ファイルシステムのパフォーマンスが向上
- LinuxネイティブなCLIツールがそのまま動作
:::

### 1. GitHub Copilot用にプロジェクト初期化

**CLI:**
```bash
npx musubi-sdd init --copilot
```

#### 初期化時の選択肢

`npx musubi-sdd init --copilot` を実行すると、対話形式でプロジェクト設定を行います。

```
🎯 MUSUBI - Ultimate Specification Driven Development


Initializing for: GitHub Copilot
```

| 質問 | 選択肢 | 説明 |
|------|--------|------|
| **Project name** | (入力) | プロジェクト名。デフォルトはカレントディレクトリ名 |
| **Project description** | (入力) | プロジェクトの説明文 |
| **Documentation language** | English / 日本語 / 中文 / 한국어 / Español / Deutsch / Français | ドキュメントの言語。Steeringファイルがこの言語で生成される |
| **Project structure** | Single package / Workspace / Microservices | プロジェクト構造 |
| **Project type** | Greenfield (0→1) / Brownfield (1→n) / Both | 新規開発か既存プロジェクトか |
| **Technology stack approach** | Single language / Multiple languages / Undecided / Help me decide | 技術スタックの選択方法 |
| **Generate initial steering context?** | Yes / No | Steeringファイルを自動生成するか |
| **Create constitutional governance?** | Yes / No | 憲法（9条項）を作成するか |

**Project structure の詳細：**

| 選択肢 | 説明 | 向いているプロジェクト |
|--------|------|----------------------|
| **Single package** | 単一パッケージ構成 | 小〜中規模のアプリケーション |
| **Workspace / Monorepo** | 複数パッケージの単一リポジトリ | 共通ライブラリを持つ大規模プロジェクト |
| **Microservices** | マイクロサービス構成 | 分散システム、独立デプロイが必要なサービス群 |

**Project type の詳細：**

| 選択肢 | 説明 | Steeringの初期化 |
|--------|------|-----------------|
| **Greenfield (0→1)** | ゼロから新規開発 | テンプレートから空のSteeringを生成 |
| **Brownfield (1→n)** | 既存プロジェクトに導入 | 既存コードを解析してSteeringを推論 |
| **Both** | 両方対応 | 汎用的な設定で初期化 |

:::note info
**Greenfield（0→1）の場合：要件定義からスタート**

新規開発では、GitHub Copilotに自然言語で話しかけるだけで、**要件定義から**開発を始められます。

**自然言語での指示例：**
```
ECサイトの開発をするので、要件定義から開始して
```

```
タスク管理アプリを新規開発したい。要件定義からお願い
```

```
社内向けチャットボットを作りたい。ゼロから設計して
```

MUSUBIはこの指示を受けて、以下のSDDワークフローを自動的に実行します。

1. **要件定義**: EARS形式で仕様を記述 → `storage/specs/xxx.ears.md`
2. **設計**: C4モデル + ADR → `storage/specs/xxx.design.md`
3. **タスク分解**: 実装タスクへ分解 → `storage/specs/xxx.tasks.md`
4. **実装**: Swarm Codingで自動実装 → ソースコード
5. **検証**: 憲法準拠を確認 → 検証レポート

**Greenfieldでの開発フロー例：ECサイトの構築**

| ステージ | 自然言語での指示 | 成果物 |
|---------|-----------------|--------|
| 要件定義 | `ECサイトの要件を定義して` | `storage/specs/ecommerce.ears.md` |
| 設計 | `ECサイトを設計して` | `storage/specs/ecommerce.design.md` |
| タスク分解 | `ECサイトのタスクを洗い出して` | `storage/specs/ecommerce.tasks.md` |
| 実装 | `ECサイトを実装して` | ソースコード一式 |
| 検証 | `ECサイトを検証して` | 検証レポート |

このように、**コードを1行も書かない状態から、仕様→設計→実装→検証**まで一貫してSwarm Codingで進められます。
:::

:::note warn
**Tips：次に何をしていいかわからないときは**

開発中に迷ったら、オーケストレーターに聞いてみましょう。

| やりたいこと | 自然言語での指示 |
|-------------|-----------------|
| 次のタスクを実行 | `@orchestrator 次のタスクを実行して` |
| 残タスクを確認 | `@orchestrator 残タスクを確認して` |
| 進捗を確認 | `@orchestrator 進捗状況を教えて` |
| 全体の計画を確認 | `@orchestrator 現在の計画を見せて` |
| タスクの優先順位を変更 | `@orchestrator P0タスクを先に実行して` |
| 問題があれば再計画 | `@orchestrator 再計画して` |

オーケストレーターがプロジェクトの状態を把握し、最適な次のアクションを提案します。
:::

**Technology stack approach の詳細：**

| 選択肢 | 説明 | 次のステップ |
|--------|------|-------------|
| **Single language** | 単一言語 | 言語選択（JS/TS, Python, Rust, Go, Java, C#, C++, Swift, Ruby, PHP） |
| **Multiple languages** | 複数言語 | 使用言語を複数選択 |
| **Undecided** | 未定 | 後で決定可能 |
| **Help me decide** | 推奨してほしい | 要件を入力すると最適な言語を提案 |

#### 初期化完了後の出力

```
✨ Initializing MUSUBI...

  Created .github/
  Created .github/prompts/
  Created steering/
  Created steering/rules/
  Created templates/
  Created storage/specs/
  Created storage/changes/
  Created storage/features/
  Installed prompts
  Installed 25 agent definitions (AGENTS.md)
  Generated steering context
  Created constitutional governance
  Created AGENTS.md guide

✅ MUSUBI initialization complete for GitHub Copilot!

Next steps:
  1. Review steering/ context files
  2. Review steering/rules/constitution.md
  3. Start using GitHub Copilot with MUSUBI skills
  4. Try commands: #sdd-requirements authentication
```

これにより以下が生成されます。
- `AGENTS.md` - GitHub Copilot用のエントリポイント
- `steering/` - プロジェクト憲法・アーキテクチャ定義
- `storage/` - 仕様・設計・変更管理

### Steering（プロジェクトメモリ）とは

**Steering** はMUSUBIの中核となる「プロジェクトの長期記憶」です。AIエージェントが一貫した判断を行うための基盤を提供します。

#### ゼロスタート vs 既存プロジェクト

| シナリオ | Steeringの初期化方法 | 特徴 |
|----------|---------------------|------|
| **ゼロスタート** | `npx musubi-sdd init --copilot` | インストール時にテンプレートから生成。プロジェクトに合わせて編集 |
| **既存プロジェクト** | `Steeringを生成して` | 既存コードを解析し、構造・技術スタックを自動推論 |

**ゼロスタートの場合：**
- 空のテンプレートが生成される
- `structure.md`、`tech.md`、`product.md` を手動で記述
- 憲法（`constitution.md`）はデフォルト値が設定される

**既存プロジェクトの場合：**
- MUSUBIがコードベースを解析
- 使用言語、フレームワーク、ディレクトリ構造を自動検出
- `package.json`、`requirements.txt`等から依存関係を抽出
- 既存の設計パターンを推論して `structure.md` を生成

```
steering/
├── structure.md      # アーキテクチャパターン（レイヤー構造、設計原則）
├── tech.md           # 技術スタック（言語、フレームワーク、ツール）
├── product.md        # プロダクトコンテキスト（ドメイン知識、用語集）
├── project.yml       # プロジェクト設定（メタデータ、依存関係）
├── rules/
│   └── constitution.md   # 9つの憲法条項（不変のルール）
└── memories/
    ├── codegraph.md      # CodeGraphインデックス
    ├── architecture_decisions.md  # アーキテクチャ決定履歴
    ├── lessons_learned.md         # 学んだ教訓
    └── domain_knowledge.md        # ドメイン知識
```

| ファイル | 役割 | 更新タイミング |
|----------|------|----------------|
| `structure.md` | レイヤー構造、依存方向、設計パターン | アーキテクチャ変更時 |
| `tech.md` | 言語バージョン、フレームワーク、ライブラリ | 技術選定・更新時 |
| `product.md` | ビジネスドメイン、ユビキタス言語、コンテキスト | 要件変更時 |
| `constitution.md` | 品質基準、ガバナンスルール | **変更禁止**（不変） |
| `memories/` | 動的に蓄積される知識 | 自動更新 |

:::note info
**Steeringの自動同期**
MUSUBIはプロジェクトの変更を検知し、Steeringドキュメントを自動的に同期します。

**自然言語でも同期可能：**
```
Steeringを更新
```
これだけでプロジェクトメモリが最新状態に同期されます。

```bash
npx musubi-sync  # CLIでの手動同期
```
:::

### 2. CodeGraph MCP Serverの設定

```bash
# Copilot MCP設定ファイル
cat > ~/.config/github-copilot/mcp.json << 'EOF'
{
  "servers": {
    "codegraph": {
      "command": "uvx",
      "args": ["codegraph-mcp"],
      "env": {
        "CODEGRAPH_REPO_PATH": "/path/to/your/project"
      }
    }
  }
}
EOF
```

### 3. コードグラフの構築

**CLI:**
```bash
# MUSUBIのCodeGraph統合機能を使用
npx musubi-analyze --codegraph-full
```

**自然言語（GitHub Copilotに話しかける）:**
```
CodeGraph MCP Index を作成
コードグラフを構築して
プロジェクトを解析して
```

**出力例：**
```
CodeGraph Analysis Complete
   Entities: 12,093
   Relations: 59,222
   Communities: 140
   Index saved to: steering/memories/codegraph.md
```

## 実践例：Swarm Codingでフィーチャー開発

### シナリオ：ユーザー認証機能の追加

GitHub Copilotで `#sdd-implement auth` を実行すると、MUSUBIが以下のSwarmを自動編成します。

```
🐝 Swarm Assembly for "auth" feature:

Phase 1: Requirements (Sequential)
├── Requirements Analyst → EARS形式で要件定義
└── Constitution Enforcer → 要件の憲法適合確認

Phase 2: Design (Parallel)
├── System Architect → C4モデルでアーキテクチャ設計
├── Security Auditor → 認証のセキュリティ設計
└── Database Schema Designer → ユーザーテーブル設計

Phase 3: Implementation (Swarm)
├── Backend Developer → API実装
├── Frontend Developer → ログインUI実装
└── Test Engineer → テスト実装

Phase 4: Validation (Human-in-Loop)
├── Code Reviewer → コードレビュー
├── Quality Assurance → E2Eテスト
└── Human Approval → 最終確認
```

### CodeGraphによる影響分析

認証機能を追加する際、CodeGraphが自動的に影響範囲を特定：

```
Impact Analysis for auth feature:

Affected Files (Direct):
├── src/routes/index.js (API routes need auth middleware)
├── src/middleware/index.js (new auth middleware)
└── src/models/user.js (new model)

Affected Files (Indirect):
├── src/controllers/profile.js (requires authenticated user)
├── src/services/notification.js (user context needed)
└── tests/integration/api.test.js (needs auth setup)

Recommended Test Updates:
├── tests/unit/auth.test.js (new)
├── tests/integration/auth.test.js (new)
└── tests/e2e/login.test.js (new)
```

## 25の専門スキル

MUSUBIには25の専門スキルが搭載されています。

### 分析・設計フェーズ
| スキル | 役割 | 主な機能 |
|--------|------|----------|
| Requirements Analyst | 要件分析 | EARS形式要件定義、ステークホルダー分析 |
| System Architect | システム設計 | C4モデル、ADR作成、アーキテクチャ判断 |
| API Designer | API設計 | OpenAPI、REST/GraphQL設計 |
| Database Schema Designer | DB設計 | ER図、マイグレーション設計 |

### 実装フェーズ
| スキル | 役割 | 主な機能 |
|--------|------|----------|
| Software Developer | コード実装 | SOLID原則、クリーンコード |
| Frontend Developer | フロント実装 | React/Vue/Angular、アクセシビリティ |
| Backend Developer | バック実装 | API実装、データベース連携 |
| DevOps Engineer | インフラ | CI/CD、Docker、Kubernetes |

### 品質保証フェーズ
| スキル | 役割 | 主な機能 |
|--------|------|----------|
| Test Engineer | テスト設計 | ユニット/統合/E2E、EARS→テスト変換 |
| Code Reviewer | コードレビュー | ベストプラクティス、セキュリティ |
| Security Auditor | セキュリティ監査 | OWASP Top 10、脆弱性検出 |
| Quality Assurance | 品質保証 | テスト戦略、品質メトリクス |

### 運用・管理フェーズ
| スキル | 役割 | 主な機能 |
|--------|------|----------|
| Project Manager | プロジェクト管理 | スプリント計画、リスク管理 |
| Technical Writer | ドキュメント | API文書、ユーザーガイド |
| Release Coordinator | リリース管理 | バージョン管理、変更ログ |
| Site Reliability Engineer | SRE | 可観測性、インシデント対応 |

## エンタープライズ機能（v5.5.0+）

### Large Project Analyzer

**何をするか：** 10万ファイル規模の巨大プロジェクトでも、メモリ効率よく分析できます。

プロジェクトのサイズに応じて、最適な分析戦略を自動選択します。

| プロジェクトサイズ | 戦略 | 説明 |
|-------------------|------|------|
| ≤100 ファイル | Batch | 一括分析（最速） |
| ≤1,000 ファイル | Optimized Batch | 最適化バッチ |
| ≤10,000 ファイル | Chunked | チャンク分割（メモリ節約） |
| >10,000 ファイル | Streaming | ストリーミング（2GB以内で処理） |

**自然言語での利用：**
```
プロジェクト全体を分析して
巨大関数を検出して
コードベースの統計を出して
```

### Complexity Analyzer

**何をするか：** コードの複雑さを数値化し、リファクタリングが必要な箇所を特定します。

| 指標 | 説明 | 基準値 |
|------|------|--------|
| **循環的複雑度** | 条件分岐の数（if/switch/loop等） | 10以下が理想 |
| **認知的複雑度** | 人間が理解するのにかかる負荷 | 15以下が理想 |

**検出結果の例：**
| 重要度 | 状態 | 推奨アクション |
|--------|------|----------------|
| 🟢 OK | 複雑度 ≤10 | そのまま維持 |
| 🟡 Warning | 複雑度 11-20 | リファクタリング検討 |
| 🔴 Critical | 複雑度 >20 | 関数分割を強く推奨 |

**自然言語での利用：**
```
コードの複雑さを分析して
リファクタリングが必要な関数を見つけて
```

### Rust Migration Generator

**何をするか：** C/C++コードをRustに移行する際に、危険なパターンを自動検出し、安全な移行を支援します。

| 検出パターン | リスク | Rustでの代替 |
|-------------|--------|--------------|
| `malloc/free/realloc` | メモリリーク、二重解放 | 所有権システム |
| `strcpy/strcat/sprintf` | バッファオーバーフロー | `String`、`format!` |
| ポインタ演算 | 不正メモリアクセス | スライス、イテレータ |
| `pthread/volatile` | データ競合 | `Arc<Mutex<T>>`、`Atomic` |

**自然言語での利用：**
```
C言語の危険なパターンを検出して
Rust移行の準備をして
```

## ガードレールシステム

MUSUBIは3層のガードレールで品質を自動保証します。開発者が意識しなくても、危険なコードやデータが本番環境に流出することを防ぎます。

### 1. Input Guardrail（入力検証）

**何をするか：** ユーザーからの入力やAIへのプロンプトを検証し、危険なデータをブロックします。

| 検出対象 | 説明 | 例 |
|----------|------|------|
| **PII（個人情報）** | 氏名、住所、電話番号、メールアドレス等 | `田中太郎 090-1234-5678` |
| **SQLインジェクション** | データベースを攻撃する悪意あるコード | `'; DROP TABLE users;--` |
| **XSS攻撃** | Webページを改ざんするスクリプト | `<script>alert('hack')</script>` |
| **機密情報** | APIキー、パスワード、トークン | `sk-xxxxx`, `password123` |

**自然言語での利用：**
```
入力を検証して
セキュリティチェックして
```

### 2. Output Guardrail（出力検証）

**何をするか：** AIが生成したコードや出力から、機密情報を自動的にマスク（隠蔽）します。

| マスク対象 | 変換前 | 変換後 |
|-----------|--------|--------|
| APIキー | `OPENAI_API_KEY=sk-abc123...` | `OPENAI_API_KEY=***REDACTED***` |
| パスワード | `password: "secret123"` | `password: "***REDACTED***"` |
| 接続文字列 | `mongodb://user:pass@host` | `mongodb://***REDACTED***` |
| 個人情報 | `email: "taro@example.com"` | `email: "***REDACTED***"` |

これにより、ログやドキュメントに機密情報が漏れることを防ぎます。

### 3. Constitutional Guardrail（憲法準拠）

**何をするか：** 生成されたコードがプロジェクトの「憲法」（9つの品質ルール）に違反していないかを自動検証します。

| 条項 | 内容 | 検証方法 |
|------|------|----------|
| 第1条 | 仕様優先 | `[SPEC:xxx]` 参照の確認 |
| 第2条 | トレーサビリティ | `[TRACE:xxx]` リンクの確認 |
| 第3条 | EARS準拠 | 要件形式の検証 |
| 第4条 | 変更追跡 | Delta仕様の存在確認 |
| 第5条 | 品質ゲート | テストカバレッジ確認 |
| 第6条 | ドキュメント | JSDoc/README確認 |
| 第7条 | シンプルさ | 過剰抽象化の検出 |
| 第8条 | ガバナンス | 承認プロセス確認 |
| 第9条 | 継続的改善 | フィードバックループ確認 |

## P-ラベル優先度システム

タスクをP-ラベルで優先順位付け：

```
P0 (Critical)  → すべてをブロック、即時対応
P1 (High)      → 次に実行、重要タスク
P2 (Medium)    → 通常優先度
P3 (Low)       → バックグラウンド、時間があれば
```

**並列実行の例：**

**CLI:**
```bash
# P0は即座に実行、P1-P3は優先度順に並列実行
npx musubi-orchestrate parallel \
  --skills "frontend-developer,backend-developer,test-engineer" \
  --strategy "priority"
```

**自然言語（GitHub Copilotに話しかける）:**
```
フロントエンド、バックエンド、テストを並列で実行して
優先度順にタスクを処理して
```

## リアルタイム再計画（Replanning）

予期しない問題が発生した場合、MUSUBIは自動的に再計画：

```
Replanning triggered:

Original Plan:
1. ✅ Requirements Analysis
2. ✅ System Design
3. ❌ Implementation (blocked: external API not available)

Detected Issue:
- External payment API is under maintenance

Alternative Path Generated:
3a. Mock payment API implementation
3b. Continue with other features
3c. Retry payment integration after 2 hours

Human Approval Required: Yes/No?
```

## 品質ダッシュボード

A-Fグレードで品質を可視化：

**CLI:**
```bash
npx -p musubi-gui start --port 3000
```

**自然言語（GitHub Copilotに話しかける）:**
```
品質ダッシュボードを表示して
プロジェクトの品質をチェックして
憲法準拠を検証して
```

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/78535/7815702a-83c9-41a5-a7de-9293b0b8d62a.png)


## まとめ：なぜMUSUBI + CodeGraph + GitHub Copilotなのか

### 従来の開発
```
開発者 → (考える) → AI → (コード生成) → 開発者 → (レビュー) → 完成？
                    ↓
              コンテキスト不足
              品質のばらつき
              トレーサビリティなし
```

### MUSUBI Swarm Coding
```
開発者 → MUSUBI → [25スキルのSwarm] → ガードレール → 品質保証済みコード
           ↓           ↓                  ↓
    CodeGraph     専門家協調          憲法準拠
    (全体像把握)   (最適配置)         (品質保証)
```

### 選ばれる理由

| 理由 | 詳細 |
|------|------|
| **圧倒的なテスト品質** | 3,850テスト、129スイート |
| **エンタープライズ対応** | 10万ファイル、1000万行の実績 |
| **専門家チーム** | 25スキルによる分業 |
| **9パターンの協調** | 状況に応じた最適編成 |
| **完全な追跡** | REQ→Design→Code→Test |
| **品質保証** | 3層ガードレール + 9憲法条項 |
| **マルチプラットフォーム** | 13+のAIアシスタント対応 |

## リンク

- **GitHub**: https://github.com/nahisaho/musubi
- **npm**: https://www.npmjs.com/package/musubi-sdd
- **CodeGraph MCP Server**: https://github.com/alohays/codegraph-mcp
- **Documentation**: https://nahisaho.github.io/musubi

---

**今すぐ始めましょう：**

```bash
npx musubi-sdd init --copilot
```

**自然言語（インストール後、GitHub Copilotに話しかける）:**
```
MUSUBIを初期化して
CodeGraph MCP Index を作成
Steeringを更新
```

**1人のAIから、チームで働くAIへ。**

**MUSUBI v5.7.0** で Swarm Coding を体験してください。

---

## 付録A：CLIコマンド一覧

MUSUBIは21のCLIコマンドを提供しています。すべて`npx`で実行可能です。

:::note info
**コマンドの実行方法**

MUSUBIのコマンドは`musubi-sdd`パッケージに含まれています。

```bash
# 方法1: -p オプションでパッケージを指定（推奨）
npx -p musubi-sdd musubi-gui start --port 3000
npx -p musubi-sdd musubi-analyze --codegraph-full

# 方法2: グローバルインストール後に直接実行
npm install -g musubi-sdd
musubi-gui start --port 3000
```

以下のコマンド例では簡略化のため `npx musubi-xxx` と表記していますが、
実際には `npx -p musubi-sdd musubi-xxx` または グローバルインストール後の `musubi-xxx` で実行してください。
:::

### 初期化・セットアップ

| コマンド | 説明 |
|---------|------|
| `npx musubi-sdd init` | プロジェクト初期化 |
| `npx musubi-onboard` | 既存プロジェクトの解析・Steering生成 |
| `npx musubi-sync` | Steeringドキュメントの同期 |

**musubi-sdd init オプション：**
- `--copilot` / `--github-copilot` - GitHub Copilot用
- `--claude` / `--claude-code` - Claude Code用（デフォルト）
- `--cursor` - Cursor IDE用
- `--gemini` / `--gemini-cli` - Gemini CLI用
- `--codex` / `--codex-cli` - Codex CLI用
- `--qwen` / `--qwen-code` - Qwen Code用
- `--windsurf` - Windsurf IDE用

### SDDワークフロー

| コマンド | 説明 |
|---------|------|
| `npx musubi-requirements` | EARS形式の要件定義 |
| `npx musubi-design` | C4モデル + ADR設計 |
| `npx musubi-tasks` | タスク分解（P0-P3優先度） |
| `npx musubi-workflow` | ワークフロー管理 |

**musubi-requirements サブコマンド：**
- `init <feature>` - 機能の要件ドキュメント初期化
- `add` - EARS形式で要件を追加（インタラクティブ）
- `list` - 全要件を一覧表示
- `validate` - EARS形式への準拠を検証
- `metrics` - 要件の品質メトリクス計算
- `trace` - トレーサビリティマトリクス表示

**musubi-design サブコマンド：**
- `init <feature>` - 設計ドキュメント初期化
- `add-c4 <level>` - C4モデル追加（context/container/component/code）
- `add-adr <decision>` - ADR（Architecture Decision Record）追加
- `validate` - 設計ドキュメントの完全性検証
- `trace` - 要件から設計へのトレース

**musubi-tasks サブコマンド：**
- `init <feature>` - 設計からタスク分解ドキュメント生成
- `add <title>` - 新規タスク追加（インタラクティブ）
- `list` - 全タスク一覧
- `update <id> <status>` - タスクステータス更新
- `validate` - タスク分解の完全性検証
- `graph` - タスク依存関係グラフ生成

**musubi-workflow サブコマンド：**
- `init <feature>` - 新機能のワークフロー初期化
- `status` - 現在のワークフロー状態表示
- `next [stage]` - 次のステージへ遷移
- `feedback <from> <to>` - フィードバックループ記録
- `complete` - ワークフロー完了
- `history` - ワークフロー履歴表示
- `metrics` - ワークフローメトリクス表示

### 分析・検証

| コマンド | 説明 |
|---------|------|
| `npx musubi-analyze` | コード品質分析 |
| `npx musubi-validate` | 憲法9条項への準拠検証 |
| `npx musubi-trace` | 要件→コード→テストのトレーサビリティ |
| `npx musubi-gaps` | 仕様と実装のギャップ検出 |

**musubi-analyze オプション：**
- `-t, --type <type>` - 分析タイプ（quality/dependencies/security/stuck/codegraph/all）
- `--codegraph` - CodeGraph MCPインデックス更新
- `--codegraph-full` - フルCodeGraphインデックス（非増分）
- `--detect-stuck` - スタックパターン検出（反復エラー、循環編集）
- `--threshold <level>` - 品質閾値（low/medium/high）

**musubi-validate サブコマンド：**
- `constitution` - 全9条項を検証
- `article <number>` - 特定条項（1-9）を検証
- `gates` - Phase -1 Gates検証（シンプリシティ、アンチ抽象化）
- `complexity` - 複雑度制限検証（モジュール≤1500行、関数≤50行）
- `guardrails [content]` - 入出力ガードレール検証
- `guardrails-chain [content]` - ガードレールチェーン実行
- `score` - 憲法準拠スコア計算（0-100）
- `all` - 全検証実行

**musubi-trace サブコマンド：**
- `matrix` - フルトレーサビリティマトリクス生成
- `coverage` - 要件カバレッジ統計計算
- `gaps` - 孤立した要件・設計・タスク・未テストコード検出
- `requirement <id>` - 特定要件の設計・タスク・コード・テストへのトレース
- `validate` - 100%トレーサビリティカバレッジ検証（憲法第5条）
- `bidirectional` - 双方向トレーサビリティ分析
- `impact <requirementId>` - 要件変更の影響分析
- `ci-check` - CI/CDパイプライン用検証（終了コード返却）
- `html-report` - インタラクティブHTMLレポート生成

**musubi-gaps サブコマンド：**
- `detect` - 全ギャップ検出（要件・コード・テスト）
- `requirements` - 孤立要件検出（設計・コードなし）
- `code` - 未テストコード検出
- `coverage` - カバレッジ統計計算

### オーケストレーション

| コマンド | 説明 |
|---------|------|
| `npx musubi-orchestrate` | マルチスキルオーケストレーション |

**musubi-orchestrate サブコマンド：**
- `run <pattern>` - オーケストレーションパターン実行
- `auto <task>` - タスクに最適なスキルを自動選択・実行
- `sequential` - スキルを順次実行
- `list-patterns` - 利用可能なパターン一覧
- `list-skills` - 利用可能なスキル一覧
- `goal <action>` - ゴール駆動型再計画のゴール管理
- `replan` - 再計画分析トリガー
- `modify-goal` - 制約に基づくゴール適応変更
- `optimize-path` - 実行パス分析・最適化
- `status` - オーケストレーションエンジン状態表示
- `handoff` - ハンドオフパターン実行（他エージェントへ委譲）
- `triage` - トリアージパターン実行（リクエスト分類・ルーティング）
- `triage-categories` - トリアージカテゴリ一覧

### 変更管理

| コマンド | 説明 |
|---------|------|
| `npx musubi-change` | 変更提案（Delta仕様）管理 |
| `npx musubi-checkpoint` | 開発状態のチェックポイント管理 |

**musubi-change サブコマンド：**
- `init <change-id>` - 新規変更提案作成（Delta仕様付き）
- `apply <change-id>` - 変更提案をコードベースに適用
- `archive <change-id>` - 完了した変更をspecs/にアーカイブ
- `list` - 全変更提案一覧
- `validate <change-id>` - Delta仕様形式検証
- `show <change-id>` - 変更の詳細情報表示
- `impact <change-id>` - 変更の影響分析詳細表示
- `approve <change-id>` - 変更提案を承認
- `reject <change-id>` - 変更提案を却下
- `create` - インタラクティブにDelta仕様作成
- `diff <change-id>` - Before/Afterの差分表示
- `status` - 全変更のステータスサマリー

**musubi-checkpoint サブコマンド：**
- `create` / `save` - 新規チェックポイント作成
- `list` / `ls` - 全チェックポイント一覧
- `show <id>` - チェックポイント詳細表示
- `restore <id>` - チェックポイントを復元
- `delete` / `rm <id>` - チェックポイント削除
- `archive <id>` - チェックポイントをアーカイブ
- `compare` / `diff <id1> <id2>` - 2つのチェックポイントを比較
- `tag <id> <tags...>` - タグを追加
- `current` - 現在のチェックポイント表示

### メモリ・共有

| コマンド | 説明 |
|---------|------|
| `npx musubi-remember` | エージェントメモリ管理 |
| `npx musubi-share` | チーム間メモリ共有 |

**musubi-remember サブコマンド：**
- `add <memory>` - 新規メモリエントリ追加
- `list` - 全メモリ一覧
- `condense` - メモリバンクを凝縮・要約
- `search <query>` - キーワードでメモリ検索
- `clear` - 全メモリをクリア

**musubi-share サブコマンド：**
- `export` - プロジェクトメモリを共有可能形式でエクスポート
- `import <file>` - ファイルからメモリをインポート・マージ
- `sync` - AIプラットフォーム間でメモリ同期
- `status` - 共有状態表示

### ユーティリティ

| コマンド | 説明 |
|---------|------|
| `npx musubi-gui` | Webダッシュボード |
| `npx musubi-browser` | ブラウザ自動化（自然言語） |
| `npx musubi-resolve` | GitHub Issue自動解決 |
| `npx musubi-convert` | Spec Kit形式との変換 |
| `npx musubi-costs` | LLM APIコスト追跡 |

**musubi-gui サブコマンド：**
- `start` - Webサーバー起動（`--port <port>`でポート指定）
- `build` - フロントエンドを本番用ビルド
- `dev` - 開発モード起動（ホットリロード）
- `status` - プロジェクト状態サマリー表示
- `matrix` - トレーサビリティマトリクス表示

**musubi-browser サブコマンド：**
- `interactive` / `i` - インタラクティブブラウザ自動化セッション開始
- `run <command>` - 単一の自然言語コマンド実行
- `script <file>` - スクリプトファイルからコマンド実行
- `compare <expected> <actual>` - AIでスクリーンショット比較
- `generate-test` - アクション履歴からPlaywrightテスト生成

**musubi-resolve オプション：**
- `<issue-number>` - 解決するGitHub Issue番号
- `-u, --url <url>` - GitHub Issue URL
- `--dry-run` - PRを作成せずに解決をプレビュー
- `--branch <name>` - カスタムブランチ名
- `list` - リポジトリの最近のOpen Issue一覧

**musubi-convert サブコマンド：**
- `from-speckit <path>` - Spec KitプロジェクトをMUSUBI形式に変換
- `to-speckit` - 現在のMUSUBIプロジェクトをSpec Kit形式に変換
- `validate <format> [path]` - プロジェクト形式検証（speckit/musubi）
- `from-openapi <specPath>` - OpenAPI/Swagger仕様をMUSUBI要件に変換
- `roundtrip <path>` - ラウンドトリップ変換テスト（A → B → A'）

**musubi-costs サブコマンド：**
- `summary` / `show` - 現在のセッション・期間コスト表示
- `report` - 詳細コストレポート生成（`--period`で期間指定）
- `budget set <$>` - 予算上限設定
- `budget status` - 予算使用状況表示
- `budget clear` - 予算上限削除
- `pricing [model]` - モデル料金表示
- `history [n]` - 直近n件のセッション履歴表示
- `export` - データをJSON出力

---

## 付録B：自然言語コマンド一覧

MUSUBIでは、CLIコマンドを覚えなくても、GitHub Copilotに自然言語で話しかけるだけで操作できます。

### セットアップ・初期化

| やりたいこと | 自然言語での命令 | 対応CLIコマンド |
|-------------|-----------------|----------------|
| プロジェクト初期化 | `MUSUBIを初期化して` | `npx musubi-sdd init --copilot` |
| | `プロジェクトをセットアップして` | |
| | `SDDを始めて` | |

### CodeGraph操作

| やりたいこと | 自然言語での命令 | 対応CLIコマンド |
|-------------|-----------------|----------------|
| インデックス作成 | `CodeGraph MCP Index を作成` | `npx musubi-analyze --codegraph-full` |
| | `コードグラフを構築して` | |
| | `プロジェクトを解析して` | |
| インデックス更新 | `CodeGraph MCP Index を更新` | - |
| | `コードグラフを再構築して` | |

### Steering（プロジェクトメモリ）

| やりたいこと | 自然言語での命令 | 対応CLIコマンド |
|-------------|-----------------|----------------|
| メモリ同期 | `Steeringを更新` | `npx musubi-sync` |
| | `プロジェクトメモリを同期して` | |
| メモリ確認 | `Steeringを確認して` | - |
| | `プロジェクトの設定を見せて` | |

### 要件・設計

| やりたいこと | 自然言語での命令 | 対応CLIコマンド |
|-------------|-----------------|----------------|
| 要件定義 | `認証機能の要件を定義して` | `npx musubi-requirements auth` |
| | `#sdd-requirements auth` | |
| 設計作成 | `認証機能を設計して` | `npx musubi-design auth` |
| | `#sdd-design auth` | |
| タスク分解 | `認証機能のタスクを洗い出して` | `npx musubi-tasks auth` |
| | `#sdd-tasks auth` | |

### 実装・開発

| やりたいこと | 自然言語での命令 | 対応CLIコマンド |
|-------------|-----------------|----------------|
| 機能実装 | `認証機能を実装して` | `npx musubi-workflow implement auth` |
| | `#sdd-implement auth` | |
| 並列実行 | `フロントとバックを同時に開発して` | `npx musubi-orchestrate parallel` |
| | `並列で実装して` | |

### 分析・検証

| やりたいこと | 自然言語での命令 | 対応CLIコマンド |
|-------------|-----------------|----------------|
| コード分析 | `プロジェクト全体を分析して` | `npx musubi-analyze` |
| | `コードベースの統計を出して` | |
| 複雑度分析 | `コードの複雑さを分析して` | - |
| | `リファクタリングが必要な関数を見つけて` | |
| 巨大関数検出 | `巨大関数を検出して` | - |
| | `長すぎる関数を探して` | |

### 品質・検証

| やりたいこと | 自然言語での命令 | 対応CLIコマンド |
|-------------|-----------------|----------------|
| 品質確認 | `品質ダッシュボードを表示して` | `npx musubi-gui start --port 3000` |
| | `プロジェクトの品質をチェックして` | |
| 憲法検証 | `憲法準拠を検証して` | `npx musubi-validate` |
| | `ルール違反がないか確認して` | |
| トレース確認 | `トレーサビリティを確認して` | `npx musubi-trace` |
| | `要件から実装への追跡を見せて` | |

### セキュリティ

| やりたいこと | 自然言語での命令 | 対応CLIコマンド |
|-------------|-----------------|----------------|
| 入力検証 | `入力を検証して` | - |
| | `セキュリティチェックして` | |
| 危険パターン検出 | `C言語の危険なパターンを検出して` | - |
| | `Rust移行の準備をして` | |

### その他

| やりたいこと | 自然言語での命令 | 対応CLIコマンド |
|-------------|-----------------|----------------|
| ギャップ分析 | `仕様と実装のギャップを見つけて` | `npx musubi-gaps` |
| 変更管理 | `変更履歴を見せて` | `npx musubi-change` |
| オンボーディング | `プロジェクトの概要を教えて` | `npx musubi-onboard` |

---

:::note warn
**ヒント：自然言語命令のコツ**
- 具体的な機能名を含める（例：「認証機能を...」「ログイン画面を...」）
- 動詞で終わる（例：「〜して」「〜を作成」「〜を確認」）
- 迷ったら「〜を手伝って」「〜について教えて」でOK
:::



