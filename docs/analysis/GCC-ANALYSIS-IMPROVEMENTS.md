# MUSUBI改善提案: GCCプロジェクト分析からの学び

**作成日**: 2025-12-10
**分析対象**: GCC (580,595エンティティ、109,073ファイル、1,436,920リレーション)

## Executive Summary

GCC（約1,000万行、301,193関数）という超大規模プロジェクトの分析を通じて、
MUSUBIフレームワークに以下の改善点が明らかになりました。

---

## 1. 🔴 Critical: 大規模プロジェクト対応

### 問題
現在のMUSUBIは中小規模プロジェクト（〜10万行）を想定した設計。
GCCのような1,000万行規模のプロジェクトでは以下の問題が発生：

- `musubi-analyze` がメモリ不足でクラッシュする可能性
- 全ファイルスキャンによるタイムアウト
- 複雑度計算の精度低下

### 改善提案

```javascript
// bin/musubi-analyze.js に追加
const LARGE_PROJECT_THRESHOLD = 10000; // 10,000ファイル以上は大規模

async function analyzeWithScaling(files) {
  if (files.length > LARGE_PROJECT_THRESHOLD) {
    // ストリーミング分析モード
    return streamingAnalyze(files);
  }
  return batchAnalyze(files);
}

async function streamingAnalyze(files) {
  const CHUNK_SIZE = 1000;
  const results = [];
  
  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunk = files.slice(i, i + CHUNK_SIZE);
    const chunkResults = await analyzeChunk(chunk);
    results.push(...chunkResults);
    
    // メモリ解放
    if (global.gc) global.gc();
  }
  
  return aggregateResults(results);
}
```

**ファイル**: `bin/musubi-analyze.js`
**優先度**: P0
**工数**: 3日

---

## 2. 🟠 High: CodeGraph MCP統合

### 問題
MUSUBIはファイルベースの静的分析のみ。GCCで見たように：
- 関数間の呼び出し関係（1,436,920リレーション）
- 影響範囲の特定
- リファクタリング影響分析

これらがCodeGraph MCPを使えば可能になる。

### 改善提案

```javascript
// src/integrations/codegraph-mcp.js (新規)
const { spawn } = require('child_process');

class CodeGraphIntegration {
  constructor(repoPath) {
    this.repoPath = repoPath;
    this.dbPath = path.join(repoPath, '.codegraph', 'graph.db');
  }
  
  async indexRepository() {
    return new Promise((resolve, reject) => {
      const proc = spawn('codegraph-mcp', ['index', this.repoPath, '--full']);
      // ...
    });
  }
  
  async getCallGraph(functionName) {
    const query = `
      SELECT e.name, r.type, t.name as target
      FROM entities e
      JOIN relations r ON e.id = r.source_id
      JOIN entities t ON r.target_id = t.id
      WHERE e.name = ?
    `;
    return this.query(query, [functionName]);
  }
  
  async getImpactAnalysis(changedFiles) {
    // 変更されたファイルの影響範囲を特定
    const affected = new Set();
    for (const file of changedFiles) {
      const deps = await this.getDependents(file);
      deps.forEach(d => affected.add(d));
    }
    return [...affected];
  }
}

module.exports = { CodeGraphIntegration };
```

**新規ファイル**: `src/integrations/codegraph-mcp.js`
**優先度**: P1
**工数**: 5日

---

## 3. 🟠 High: 複雑度検出の強化

### 問題
GCCには1,000行以上の関数が95個存在（`find_comparison_args`: 4,884行など）。
現在のMUSUBIでは：
- 循環的複雑度のみ計測
- 巨大関数の検出・分割提案がない

### 改善提案

```javascript
// src/analyzers/complexity-analyzer.js に追加
const COMPLEXITY_THRESHOLDS = {
  functionLines: {
    warning: 100,
    critical: 500,
    extreme: 1000
  },
  cyclomaticComplexity: {
    warning: 10,
    critical: 25,
    extreme: 50
  },
  dependencies: {
    warning: 10,
    critical: 30,
    extreme: 100
  }
};

function detectGiantFunctions(entities) {
  const giants = entities.filter(e => 
    e.type === 'function' && 
    (e.end_line - e.start_line) > COMPLEXITY_THRESHOLDS.functionLines.critical
  );
  
  return giants.map(g => ({
    ...g,
    severity: getSeverity(g.end_line - g.start_line, 'functionLines'),
    recommendations: generateSplitRecommendations(g)
  }));
}

function generateSplitRecommendations(func) {
  // 関数分割の提案を生成
  return [
    `Consider extracting helper functions`,
    `Split by responsibility (current: ${estimateResponsibilities(func)})`,
    `Target: ${Math.ceil((func.end_line - func.start_line) / 50)} smaller functions`
  ];
}
```

**ファイル**: `src/analyzers/complexity-analyzer.js`
**優先度**: P1
**工数**: 2日

---

## 4. 🟡 Medium: Rustリライト支援

### 問題
GCCのRust置き換え分析で、MUSUBIにはC/C++→Rust変換支援がない。
セキュリティ強化のためのRust化は今後増える傾向。

### 改善提案

```javascript
// src/generators/rust-migration-generator.js (新規)
class RustMigrationGenerator {
  constructor() {
    this.unsafePatterns = [
      { pattern: /malloc|calloc|realloc|free/, risk: 'memory' },
      { pattern: /strcpy|strcat|sprintf/, risk: 'buffer-overflow' },
      { pattern: /\*\s*\w+\s*=/, risk: 'pointer-dereference' }
    ];
  }
  
  analyzeForRustMigration(codebase) {
    const risks = [];
    const priorities = [];
    
    for (const file of codebase.files) {
      if (file.language === 'c' || file.language === 'cpp') {
        const fileRisks = this.detectUnsafePatterns(file);
        risks.push(...fileRisks);
        
        if (fileRisks.length > 5) {
          priorities.push({
            file: file.path,
            priority: 'high',
            reason: 'Multiple unsafe patterns detected',
            rustBenefit: this.estimateRustBenefit(fileRisks)
          });
        }
      }
    }
    
    return { risks, priorities, migrationPlan: this.generatePlan(priorities) };
  }
}
```

**新規ファイル**: `src/generators/rust-migration-generator.js`
**優先度**: P2
**工数**: 4日

---

## 5. 🟡 Medium: 階層的分析レポート

### 問題
GCCのような大規模プロジェクトでは、フラットなレポートは読みづらい。
- 580,595エンティティを1つのレポートにすると巨大
- 階層的なドリルダウンが必要

### 改善提案

```javascript
// src/reporters/hierarchical-reporter.js (新規)
class HierarchicalReporter {
  generateReport(analysis, options = {}) {
    const depth = options.depth || 3;
    
    return {
      summary: this.generateSummary(analysis),
      modules: this.groupByModule(analysis, depth),
      hotspots: this.identifyHotspots(analysis),
      drillDown: (path) => this.getDetailedReport(analysis, path)
    };
  }
  
  groupByModule(analysis, depth) {
    // ディレクトリ階層でグループ化
    const tree = {};
    
    for (const entity of analysis.entities) {
      const parts = entity.file.split('/').slice(0, depth);
      let current = tree;
      
      for (const part of parts) {
        current[part] = current[part] || { _stats: { files: 0, entities: 0 } };
        current = current[part];
      }
      
      current._stats.entities++;
    }
    
    return tree;
  }
  
  identifyHotspots(analysis) {
    // 問題が集中している箇所を特定
    return analysis.entities
      .filter(e => e.complexity > 25 || e.issues.length > 3)
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 20);
  }
}
```

**新規ファイル**: `src/reporters/hierarchical-reporter.js`
**優先度**: P2
**工数**: 3日

---

## 6. 🟢 Low: マルチ言語サポート強化

### 問題
GCCは複数言語を含む（C, C++, Ada, Fortran, Go, Rust, COBOL）。
MUSUBIは主にJavaScript/TypeScript中心。

### 改善提案

```yaml
# steering/tech.md に追加するパターン
## Multi-Language Project Support

### Detection Rules
- If `.c` or `.h` files > 50%: Primary = C
- If `.rs` files present: Check for `Cargo.toml`
- If mixed: Use polyglot analysis mode

### Language-Specific Analyzers
- C/C++: Use tree-sitter-c, clang-tidy integration
- Rust: Use rust-analyzer, clippy integration
- Go: Use go vet, golint integration
- Python: Use pylint, mypy integration
```

**ファイル**: `steering/tech.md`, `src/analyzers/language-detector.js`
**優先度**: P3
**工数**: 5日

---

## 実装ロードマップ

| Phase | 項目 | 優先度 | 工数 | 期限 |
|-------|------|--------|------|------|
| 1 | 大規模プロジェクト対応 | P0 | 3日 | 2025-12-17 |
| 2 | CodeGraph MCP統合 | P1 | 5日 | 2025-12-24 |
| 2 | 複雑度検出強化 | P1 | 2日 | 2025-12-24 |
| 3 | Rustリライト支援 | P2 | 4日 | 2026-01-07 |
| 3 | 階層的分析レポート | P2 | 3日 | 2026-01-07 |
| 4 | マルチ言語サポート | P3 | 5日 | 2026-01-21 |

**合計工数**: 22日

---

## テスト計画

### 大規模プロジェクトテスト
```bash
# GCCでのテスト
cd /tmp/gcc-repo
musubi analyze --streaming --chunk-size=1000

# 期待結果
# - メモリ使用量 < 2GB
# - 処理時間 < 30分
# - 全ファイル分析完了
```

### CodeGraph統合テスト
```bash
musubi analyze --with-codegraph
musubi impact-analysis src/core/parser.c

# 期待結果
# - 影響を受けるファイル一覧
# - コールグラフ可視化
```

---

## まとめ

GCCプロジェクトの分析を通じて、MUSUBIには以下の改善が必要：

1. **スケーラビリティ**: 大規模プロジェクト対応（ストリーミング分析）
2. **深い分析**: CodeGraph MCP統合による関係性分析
3. **検出精度**: 巨大関数・複雑度の検出強化
4. **言語対応**: C/C++/Rustなど多言語サポート
5. **レポート**: 階層的・ドリルダウン可能なレポート

これらを実装することで、MUSUBIは10万行〜1,000万行規模の
エンタープライズプロジェクトにも対応可能になります。
