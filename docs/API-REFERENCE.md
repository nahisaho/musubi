# MUSUBI SDD API Reference

## Overview

MUSUBI SDD は仕様駆動開発のための包括的なツールキットです。このドキュメントでは主要なモジュールとAPIについて説明します。

## Installation

```bash
npm install musubi-sdd
```

## Module Index

| Module | Description |
|--------|-------------|
| [Analyzers](#analyzers) | コード解析ツール |
| [Generators](#generators) | 要件・設計・タスク生成 |
| [Orchestration](#orchestration) | ワークフローオーケストレーション |
| [Validators](#validators) | 憲法準拠検証 |
| [Performance](#performance) | パフォーマンス最適化 |
| [Enterprise](#enterprise) | マルチテナント・RBAC |
| [AI](#ai) | 高度なAI機能 |

---

## Analyzers

### LargeProjectAnalyzer

大規模プロジェクト解析のためのクラス。

```javascript
const { LargeProjectAnalyzer } = require('musubi-sdd');

const analyzer = new LargeProjectAnalyzer({
  maxFiles: 1000,
  chunkSize: 50,
  enableParallel: true
});

const analysis = await analyzer.analyze('./src');
console.log(analysis.summary);
```

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| maxFiles | number | 1000 | 解析する最大ファイル数 |
| chunkSize | number | 50 | バッチ処理のチャンクサイズ |
| enableParallel | boolean | true | 並列処理を有効化 |

### ComplexityAnalyzer

コード複雑度を分析します。

```javascript
const { ComplexityAnalyzer } = require('musubi-sdd');

const analyzer = new ComplexityAnalyzer();
const result = analyzer.analyzeFile('./src/index.js');

console.log(`Cyclomatic Complexity: ${result.cyclomatic}`);
console.log(`Cognitive Complexity: ${result.cognitive}`);
```

### GapDetector

要件とコード間のギャップを検出します。

```javascript
const { GapDetector } = require('musubi-sdd');

const detector = new GapDetector();
const gaps = await detector.detectGaps({
  requirements: './steering/requirements.md',
  codebase: './src'
});

gaps.forEach(gap => {
  console.log(`${gap.requirementId}: ${gap.status}`);
});
```

---

## Generators

### RequirementsGenerator

EARS形式で要件を生成します。

```javascript
const { RequirementsGenerator } = require('musubi-sdd');

const generator = new RequirementsGenerator({
  format: 'EARS',
  language: 'ja'
});

const requirements = await generator.generate({
  feature: 'ユーザー認証',
  context: 'Webアプリケーション'
});
```

### DesignGenerator

C4モデルベースの設計ドキュメントを生成します。

```javascript
const { DesignGenerator } = require('musubi-sdd');

const generator = new DesignGenerator();
const design = await generator.generate({
  requirements: requirements,
  outputFormat: 'mermaid'
});
```

### TaskGenerator

設計からタスクを生成します。

```javascript
const { TaskGenerator } = require('musubi-sdd');

const generator = new TaskGenerator({
  granularity: 'fine',
  estimateEffort: true
});

const tasks = await generator.generate(design);
```

---

## Orchestration

### OrchestrationEngine

ワークフローを実行するメインエンジン。

```javascript
const { OrchestrationEngine } = require('musubi-sdd');

const engine = new OrchestrationEngine({
  llmProvider: 'openai',
  model: 'gpt-4o',
  costTracking: true
});

const result = await engine.execute({
  workflow: 'full-sdd',
  feature: 'ユーザー管理機能'
});

console.log(`Total cost: $${result.totalCost}`);
```

### WorkflowOrchestrator

カスタムワークフローを定義・実行します。

```javascript
const { WorkflowOrchestrator } = require('musubi-sdd');

const orchestrator = new WorkflowOrchestrator();

orchestrator.defineWorkflow('custom', [
  { step: 'analyze', skill: 'codebase-analysis' },
  { step: 'generate', skill: 'requirements-generation' },
  { step: 'validate', skill: 'constitutional-validation' }
]);

await orchestrator.run('custom', context);
```

---

## Validators

### ConstitutionalValidator

9条憲法に準拠しているか検証します。

```javascript
const { ConstitutionalValidator } = require('musubi-sdd');

const validator = new ConstitutionalValidator();
const result = await validator.validate({
  feature: 'user-auth',
  requirements: requirements,
  design: design,
  implementation: './src/auth'
});

if (result.passed) {
  console.log('All constitutional articles satisfied');
} else {
  result.violations.forEach(v => console.error(v));
}
```

**9 Constitutional Articles:**
1. 要件からの追跡可能性
2. EARS形式の要件
3. C4モデルベース設計
4. ADR記録
5. タスク粒度の適切性
6. コード品質基準
7. テストカバレッジ
8. セキュリティ考慮
9. ドキュメント完全性

---

## Performance

### LazyLoader

モジュールの遅延ロードを実現します。

```javascript
const { performance } = require('musubi-sdd');
const { LazyLoader } = performance;

const loader = new LazyLoader();

loader.register('heavyModule', () => require('./heavy'));
loader.preloadHint('heavyModule');

const module = await loader.load('heavyModule');
```

### CacheManager

TTL付きLRUキャッシュを提供します。

```javascript
const { CacheManager } = require('musubi-sdd').performance;

const cache = new CacheManager({
  maxSize: 1000,
  defaultTtl: 60000 // 1分
});

cache.set('key', value);
const cached = cache.get('key');
```

### StartupOptimizer

起動時間を最適化します。

```javascript
const { StartupOptimizer, InitStage } = require('musubi-sdd').performance;

const optimizer = new StartupOptimizer();

optimizer.register('core', {
  stage: InitStage.CORE,
  init: async () => { /* 初期化処理 */ }
});

await optimizer.initialize();
```

---

## Enterprise

### TenantManager

マルチテナント環境を管理します。

```javascript
const { enterprise } = require('musubi-sdd');
const { TenantManager, TenantRole } = enterprise;

const manager = new TenantManager();

const tenant = manager.createTenant({
  name: 'Acme Corp',
  plan: 'enterprise',
  quotas: { maxTokensPerDay: 1000000 }
});

const user = manager.addUser(tenant.id, {
  email: 'admin@acme.com',
  role: TenantRole.ADMIN
});

const context = manager.createContext(tenant.id, user.id);
```

### RBAC

ロールベースアクセス制御。

```javascript
const { Permission, ROLE_PERMISSIONS } = require('musubi-sdd').enterprise;

if (user.hasPermission(Permission.ORCHESTRATE)) {
  // オーケストレーション実行可能
}

if (user.hasAllPermissions([Permission.READ, Permission.WRITE])) {
  // 読み書き両方可能
}
```

---

## AI

### ModelRouter

タスクに最適なモデルを選択します。

```javascript
const { ai } = require('musubi-sdd');
const { ModelRouter, TaskType } = ai;

const router = new ModelRouter();

const model = router.route({
  taskType: TaskType.CODE_GENERATION,
  complexity: 'high',
  tokens: 50000
});

console.log(`Selected model: ${model.name}`);
```

### RAGPipeline

コード知識のRAG検索を実現します。

```javascript
const { RAGPipeline } = require('musubi-sdd').ai;

const rag = new RAGPipeline({ topK: 5 });

await rag.index([
  { id: 'auth', content: authCode, path: 'src/auth.ts' },
  { id: 'user', content: userCode, path: 'src/user.ts' }
]);

const augmented = await rag.augment(
  'authentication',
  'How to implement login?'
);
```

### ContextWindowManager

大きなコンテキストを管理します。

```javascript
const { ContextWindowManager } = require('musubi-sdd').ai;

const manager = new ContextWindowManager();

const chunks = manager.chunkSemantic(largeCode, 4000);
const relevant = manager.prioritize(chunks, 'login function', 5);
```

---

## CLI Commands

```bash
# 初期化
musubi init

# 要件生成
musubi requirements <feature>

# 設計生成
musubi design <feature>

# タスク生成
musubi tasks <feature>

# 憲法検証
musubi validate <feature>

# フルオーケストレーション
musubi orchestrate <feature>

# コスト追跡
musubi costs --report
```

---

## TypeScript Support

```typescript
import {
  OrchestrationEngine,
  RequirementsGenerator,
  ConstitutionalValidator,
  type OrchestrationResult,
  type Requirement
} from 'musubi-sdd';

const engine = new OrchestrationEngine();
const result: OrchestrationResult = await engine.execute({
  workflow: 'full-sdd',
  feature: 'user-auth'
});
```

---

## Error Handling

```javascript
const { MUSUBIError, ValidationError } = require('musubi-sdd');

try {
  await validator.validate(feature);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.violations);
  } else if (error instanceof MUSUBIError) {
    console.error('MUSUBI error:', error.message);
  }
}
```

---

## Configuration

### steering/project.yml

```yaml
project:
  name: my-project
  version: 1.0.0

musubi:
  llm:
    provider: openai
    model: gpt-4o
    temperature: 0.2
  
  validation:
    strictMode: true
    requiredCoverage: 80
  
  performance:
    enableCaching: true
    lazyLoading: true
```

---

## License

MIT License - See [LICENSE](LICENSE)
