# MUSUBI User Guide

**Version 6.0.0** | Complete Reference for Specification Driven Development

---

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Concepts](#core-concepts)
4. [CLI Reference](#cli-reference)
5. [Enterprise Scale Analysis](#enterprise-scale-analysis)
6. [Orchestration Patterns](#orchestration-patterns)
7. [Multi-Platform Support](#multi-platform-support)
8. [CI/CD Integration](#cicd-integration)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)
11. [API Reference](#api-reference)

---

## Introduction

MUSUBI (結び - "binding/connection") is a Specification Driven Development (SDD) framework that transforms software development from code-first to specification-first.

### Key Features

- **27 Specialized Agents** - AI-powered development roles
- **9 Orchestration Patterns** - Multi-agent workflow management
- **Constitutional Governance** - 9 articles ensuring quality
- **Delta Specifications** - Brownfield change management
- **Full Traceability** - Requirement ↔ Code ↔ Test mapping
- **7 Platform Support** - Claude Code, GitHub Copilot, Cursor, Gemini CLI, Codex CLI, Qwen Code, Windsurf
- **8 Language Support** - en, ja, zh, ko, de, fr, es, id

### Philosophy

```
Specification → Design → Implementation → Validation → Monitoring
     ↑                                                    |
     └────────────── Continuous Feedback ─────────────────┘
```

---

## Getting Started

### Installation

```bash
# Global installation
npm install -g musubi-sdd

# Or use npx
npx musubi-sdd init
```

### Quick Start (5 Minutes)

```bash
# 1. Initialize project
npx musubi-sdd init

# 2. Generate requirements
npx musubi-requirements "User authentication feature"

# 3. Generate design
npx musubi-design auth-feature

# 4. Generate tasks
npx musubi-tasks auth-feature

# 5. Validate everything
npx musubi-validate all
```

### Project Structure

```
project/
├── AGENTS.md              # Universal entry point
├── CLAUDE.md              # Claude Code specific
├── steering/
│   ├── structure.md       # Architecture patterns
│   ├── tech.md           # Technology stack
│   ├── product.md        # Product context
│   └── rules/
│       └── constitution.md  # 9 Articles
├── storage/
│   ├── specs/            # EARS requirements
│   ├── features/         # C4 designs
│   └── changes/          # Delta specifications
└── .github/
    └── workflows/        # CI/CD automation
```

---

## Core Concepts

### 1. EARS Requirements

Every requirement follows the EARS (Easy Approach to Requirements Syntax) format:

| Type             | Pattern                      | Example                                            |
| ---------------- | ---------------------------- | -------------------------------------------------- |
| **Ubiquitous**   | The system shall...          | The system shall encrypt passwords                 |
| **Event-Driven** | When X, the system shall...  | When login fails, the system shall log the attempt |
| **State-Driven** | While X, the system shall... | While offline, the system shall queue requests     |
| **Optional**     | Where X, the system shall... | Where enabled, the system shall show analytics     |

### 2. Constitutional Governance

9 immutable articles ensuring quality:

1. **Specification-First** - Specs before code
2. **Constitutional Supremacy** - Constitution cannot be overridden
3. **EARS Compliance** - Standard requirement format
4. **Traceability** - Full requirement mapping
5. **Change Tracking** - Delta-based modifications
6. **Quality Gates** - Automated validation
7. **Documentation** - Complete documentation
8. **Testing** - Comprehensive test coverage
9. **Continuous Improvement** - Feedback loops

### 3. P-Label Priority System

Tasks are prioritized with P-labels:

| Label  | Priority | Execution           |
| ------ | -------- | ------------------- |
| **P0** | Critical | Blocks everything   |
| **P1** | High     | Execute soon        |
| **P2** | Medium   | Normal priority     |
| **P3** | Low      | Background/optional |

### 4. Traceability Matrix

Links requirements to implementation and tests:

```
REQ-AUTH-001 ←→ src/auth/login.js ←→ tests/auth.test.js
```

---

## CLI Reference

### Core Commands

| Command                         | Description                     |
| ------------------------------- | ------------------------------- |
| `musubi init`                   | Initialize MUSUBI project       |
| `musubi requirements <feature>` | Generate EARS requirements      |
| `musubi design <feature>`       | Generate C4 + ADR design        |
| `musubi tasks <feature>`        | Break down into P-labeled tasks |
| `musubi validate [type]`        | Validate artifacts              |
| `musubi trace`                  | Generate traceability matrix    |
| `musubi gaps`                   | Identify coverage gaps          |

### Orchestration Commands

| Command                         | Description                 |
| ------------------------------- | --------------------------- |
| `musubi orchestrate sequential` | Execute skills sequentially |
| `musubi orchestrate parallel`   | Execute skills in parallel  |
| `musubi orchestrate swarm`      | Multi-agent collaboration   |
| `musubi orchestrate handoff`    | Delegate to specialist      |
| `musubi orchestrate triage`     | Route to appropriate agent  |

### Validation Commands

| Command                        | Description               |
| ------------------------------ | ------------------------- |
| `musubi validate all`          | Full validation           |
| `musubi validate ears`         | EARS format check         |
| `musubi validate constitution` | Constitutional compliance |
| `musubi validate delta`        | Delta spec validation     |

### Change Management

| Command                 | Description           |
| ----------------------- | --------------------- |
| `musubi change create`  | Create change request |
| `musubi change analyze` | Impact analysis       |
| `musubi change apply`   | Apply delta spec      |
| `musubi sync`           | Sync specs with code  |

---

## Orchestration Patterns

MUSUBI supports 9 orchestration patterns inspired by OpenAI Agents SDK and AutoGen:

### 1. Sequential Pattern

```bash
musubi orchestrate sequential \
  --skills "requirements-analyst,system-architect,backend-developer" \
  --context "Build user authentication"
```

### 2. Parallel Pattern (Swarm)

```bash
musubi orchestrate parallel \
  --skills "frontend-developer,backend-developer" \
  --strategy "all"
```

### 3. Handoff Pattern

Explicit delegation between agents:

```bash
musubi orchestrate handoff \
  --from "requirements-analyst" \
  --to "system-architect" \
  --context "Requirements complete, ready for design"
```

### 4. Triage Pattern

Automatic routing based on request:

```bash
musubi orchestrate triage \
  --request "Fix the login bug" \
  --agents "backend-developer,frontend-developer,security-engineer"
```

### 5. Human-in-the-Loop

```bash
musubi orchestrate workflow \
  --pattern "human-approval" \
  --approval-required "deploy,security"
```

---

## Multi-Platform Support

### Supported Platforms (v6.0.0)

| Platform       | Config File          | Extension       | Command Syntax   |
| -------------- | -------------------- | --------------- | ---------------- |
| Claude Code    | `CLAUDE.md`          | `.md`           | `/command`       |
| GitHub Copilot | `.github/prompts/`   | `.prompt.md`    | `#command`       |
| Cursor         | `.cursor/rules/`     | `.md`           | Natural language |
| Gemini CLI     | `GEMINI.md`          | `.md`           | `#command`       |
| Codex CLI      | `CODEX.md`           | `.md`           | `#command`       |
| Qwen Code      | `QWEN.md`            | `.md`           | `#command`       |
| Windsurf       | `.windsurf/rules/`   | `.md`           | Natural language |

> **Note (v6.0.0 Breaking Change)**: GitHub Copilot prompt files now use `.prompt.md` extension per VS Code official documentation. This is a breaking change from previous versions.

### Platform-Specific Setup

```bash
# Claude Code (primary)
npx musubi-sdd init --platform claude-code

# GitHub Copilot
npx musubi-sdd init --platform github-copilot

# Cursor
npx musubi-sdd init --platform cursor

# Universal (all platforms)
npx musubi-sdd init --platform all
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/musubi.yml
name: MUSUBI Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx musubi-validate all
      - run: npx musubi-trace --output reports/traceability.md
```

### GitLab CI

```yaml
# .gitlab-ci.yml
validate:
  script:
    - npm ci
    - npx musubi-validate all
```

### Jenkins

```groovy
// Jenkinsfile
stage('Validate') {
  steps {
    sh 'npx musubi-validate all'
  }
}
```

---

## Best Practices

### 1. Start Small

Begin with 2-file workflow, then expand:

```
AGENTS.md + steering/structure.md → Full SDD
```

### 2. Validate Early

Run validation in pre-commit hooks:

```bash
npx husky add .husky/pre-commit "npx musubi-validate ears"
```

### 3. Use P-Labels

Prioritize tasks clearly:

- P0: Critical path
- P1: Important features
- P2: Nice-to-have
- P3: Future consideration

### 4. Maintain Traceability

Link requirements in code comments:

```javascript
// REQ-AUTH-001: User authentication
function login(username, password) { ... }
```

### 5. Review Delta Specs

Before applying changes, review impact:

```bash
npx musubi-change analyze --delta storage/changes/auth-v2.md
```

---

## Troubleshooting

### Common Issues

#### "EARS validation failed"

```bash
# Check specific file
npx musubi-validate ears --file storage/specs/feature.md

# Fix: Ensure requirements start with "The system shall", "When...", etc.
```

#### "Constitution violation"

```bash
# Check which article
npx musubi-validate constitution --verbose

# Common fix: Add missing tests or documentation
```

#### "Traceability gap"

```bash
# Find gaps
npx musubi-gaps --verbose

# Fix: Add REQ-XXX comments to implementation
```

### Getting Help

```bash
# Show help
npx musubi-sdd --help

# Show version
npx musubi-sdd --version

# Verbose output
npx musubi-validate all --verbose
```

---

## API Reference

### Node.js API

```javascript
const { SkillRegistry, SkillExecutor } = require('musubi-sdd');

// Register skill
const registry = new SkillRegistry();
registry.registerSkill({
  id: 'my-skill',
  name: 'My Custom Skill',
  category: 'custom',
  handler: async input => ({ result: 'done' }),
});

// Execute skill
const executor = new SkillExecutor({ registry });
const result = await executor.execute('my-skill', { data: 'input' });
```

### Orchestration API

```javascript
const { OrchestrationEngine } = require('musubi-sdd');

const engine = new OrchestrationEngine();

// Sequential execution
await engine.executePattern('sequential', {
  skills: ['skill-a', 'skill-b'],
  context: { feature: 'auth' },
});

// Parallel execution
await engine.executePattern('parallel', {
  skills: ['frontend', 'backend'],
  strategy: 'all',
});
```

### Validation API

```javascript
const { EARSValidator, ConstitutionalValidator } = require('musubi-sdd');

// Validate EARS
const ears = new EARSValidator();
const result = ears.validate(requirementText);

// Validate Constitution
const constitution = new ConstitutionalValidator();
const compliance = constitution.check(artifacts);
```

---

## Enterprise Scale Analysis (v5.5.0+)

### Large Project Analyzer

Analyze projects with 10,000+ files efficiently:

```javascript
const { LargeProjectAnalyzer } = require('musubi-sdd');

const analyzer = new LargeProjectAnalyzer('/path/to/large-project', {
  chunkSize: 1000, // Files per chunk
  enableGC: true, // Enable garbage collection
  maxMemoryMB: 2048, // Memory limit
});

const result = await analyzer.analyze();
console.log(result.stats);
// { totalFiles: 100000, totalLines: 5000000, ... }
```

### Complexity Analyzer

Calculate cyclomatic and cognitive complexity:

```javascript
const { ComplexityAnalyzer } = require('musubi-sdd');

const analyzer = new ComplexityAnalyzer();

// Cyclomatic complexity
const cyclomatic = analyzer.calculateCyclomaticComplexity(code, 'javascript');

// Cognitive complexity (SonarSource method)
const cognitive = analyzer.calculateCognitiveComplexity(code, 'javascript');

// Full analysis with recommendations
const analysis = analyzer.analyzeCode(code, 'javascript');
// { cyclomatic, cognitive, severity, recommendations }
```

### Rust Migration Generator

Analyze C/C++ code for Rust migration:

```javascript
const { RustMigrationGenerator } = require('musubi-sdd');

const generator = new RustMigrationGenerator('/path/to/c-project');
const analysis = await generator.analyze();

console.log(analysis.summary);
// { totalFiles, unsafePatterns, securityComponents, migrationPriorities }
```

### CodeGraph MCP Integration

Deep code relationship analysis:

```javascript
const { CodeGraphMCP } = require('musubi-sdd');

const mcp = new CodeGraphMCP('/path/to/project');
await mcp.indexRepository();

// Call graph
const callGraph = await mcp.getCallGraph('main', { depth: 3 });

// Impact analysis
const affected = await mcp.getImpactAnalysis(['src/parser.c']);

// Circular dependencies
const cycles = await mcp.detectCircularDependencies();
```

### Hierarchical Reporter

Generate drilldown reports for large projects:

```javascript
const { HierarchicalReporter } = require('musubi-sdd');

const reporter = new HierarchicalReporter({
  maxDepth: 4,
  hotspotThreshold: 25,
});

const report = reporter.generateReport(analysis);
// { summary, hierarchy, hotspots, recommendations }
```

---

## Related Documentation

- [Quick Start (5 min)](./guides/quick-start-5min.md)
- [Platform Setup](./guides/platform-setup.md)
- [Orchestration Patterns](./guides/orchestration-patterns.md)
- [P-Label Tutorial](./guides/p-label-parallelization.md)
- [Guardrails Guide](./guides/guardrails-guide.md)
- [CI/CD Integration](./guides/ci-cd-integration.md)
- [Change Management](./guides/change-management.md)
- [Traceability Matrix](./guides/traceability-matrix-guide.md)

---

**MUSUBI v6.0.0** - Specification Driven Development for the AI Age

[GitHub](https://github.com/nahisaho/MUSUBI) | [npm](https://www.npmjs.com/package/musubi-sdd) | [Documentation](https://nahisaho.github.io/musubi)
