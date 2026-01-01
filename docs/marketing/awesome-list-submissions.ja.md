# Awesome List 掲載計画書 - MUSUBI

> REQ-P0-002: Awesome List掲載
> 目標: 4つのAwesome Listへの掲載

## 📊 調査結果サマリー

### 発見事項
- sindresorhus/awesome に **Claude Code** と **Gemini CLI** が既に登録済み
- awesome-claude-code (17.7k stars) がメインターゲット
- MUSUBIは「Workflows & Knowledge Guides」カテゴリに最適

---

## 🎯 ターゲットリスト

### 1. awesome-claude-code（最優先）

| 項目 | 内容 |
|------|------|
| リポジトリ | https://github.com/hesreallyhim/awesome-claude-code |
| Stars | 17.7k+ |
| 提出方法 | [Issue Template](https://github.com/hesreallyhim/awesome-claude-code/issues/new?template=submit-resource.yml) |
| カテゴリ | Workflows & Knowledge Guides > General |

#### 提出内容

```
リソース名: MUSUBI (musubi-sdd)

URL: https://github.com/nahisaho/MUSUBI

カテゴリ: Workflows & Knowledge Guides > General

説明:
A comprehensive SDD (Specification-Driven Development) framework for Claude Code 
that provides constitutional governance, multi-agent orchestration, and 
structured project memory. Features 25+ skills, EARS requirements format, 
C4+ADR design generation, and full traceability matrix support. Includes 
bilingual (English/Japanese) documentation and VS Code/GitHub Copilot integration.

ライセンス: MIT

作者: nahisaho
```

#### このカテゴリに適合する理由
- **Workflow**: 完全なSDDワークフロー提供（Analyze → Requirements → Design → Tasks → Implement → Validate）
- **Knowledge Guides**: steeringファイルによるプロジェクトコンテキスト管理
- **Claude Code Native**: スキル、エージェント、コマンドを備えたClaude Code専用設計

#### 類似エントリ
- [AB Method](https://github.com/ayoubben18/ab-method) - スペック駆動ワークフロー
- [Simone](https://github.com/Helmi/claude-simone) - プロジェクト管理ワークフロー
- [RIPER Workflow](https://github.com/tony/claude-code-riper-5) - 構造化開発ワークフロー

---

### 2. awesome-gemini-cli（二次ターゲット）

| 項目 | 内容 |
|------|------|
| リポジトリ | https://github.com/Piebald-AI/awesome-gemini-cli |
| Stars | 178+ |
| 提出方法 | README.mdへのPR |
| カテゴリ | Frameworks |

#### PR内容

```markdown
### Frameworks

- [MUSUBI](https://github.com/nahisaho/MUSUBI) - A comprehensive SDD framework 
  compatible with multiple AI coding agents. Provides constitutional governance, 
  multi-agent orchestration, and structured project memory.
```

---

### 3. awesome-copilot-agents（GitHub Copilot フォーカス）

| 項目 | 内容 |
|------|------|
| リポジトリ | https://github.com/Code-and-Sorts/awesome-copilot-agents |
| 提出方法 | PR |
| カテゴリ | Frameworks/Workflows |

---

### 4. awesome-ddd（ドメイン駆動設計）

| 項目 | 内容 |
|------|------|
| リポジトリ | https://github.com/heynickc/awesome-ddd |
| 適合理由 | MUSUBIの憲法アプローチがDDD原則と合致 |
| 提出方法 | PR |

---

## 📅 提出スケジュール

| 週 | アクション | ターゲット |
|----|------------|-----------|
| 第1週 | Issue提出 | awesome-claude-code |
| 第1週 | PR作成 | awesome-gemini-cli |
| 第2週 | PR作成 | awesome-copilot-agents |
| 第2週 | PR作成 | awesome-ddd |
| 第3-4週 | フォローアップ | 全提出 |

---

## ✅ 提出前チェックリスト

| 項目 | 状態 |
|------|------|
| READMEに明確な説明 | ✅ |
| デモGIF/SVG利用可能 | ✅ |
| MITライセンス | ✅ |
| npm公開済み (musubi-sdd) | ✅ |
| バイリンガルドキュメント | ✅ |
| GitHub Stars > 50 | ⏳ (推奨) |
| アクティブなメンテナンス | ✅ |

---

## 📈 進捗トラッキング

| リスト | ステータス | PR/Issue | 日付 | 備考 |
|--------|----------|----------|------|------|
| awesome-claude-code | 📝 準備中 | - | - | 最優先 |
| awesome-gemini-cli | 📝 準備中 | - | - | 二次 |
| awesome-copilot-agents | 📝 準備中 | - | - | Copilot向け |
| awesome-ddd | 📝 準備中 | - | - | DDD連携 |

---

## 🚀 次のアクション

1. **今すぐ実行可能**: awesome-claude-codeへのIssue提出
2. **準備**: 各リストのCONTRIBUTING.mdを確認
3. **フォローアップ**: 1週間後に未マージのPRを確認

---

*最終更新: 2025-01-XX*
*REQ-P0-002 目標: 4つのAwesome Listへの掲載*
