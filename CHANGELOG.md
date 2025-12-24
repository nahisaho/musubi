# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.1.1] - 2025-12-25

### Fixed

- **Strict 1-question-at-a-time dialogue** in `/sdd-requirements`:
  - Added CRITICAL RULE section with explicit STOP AND WAIT instructions
  - Added Dialogue Rules (MANDATORY) with clear constraints
  - Provided example dialogue flow showing turn-by-turn conversation
  - Removed question list format that caused batch questioning
  - AI must END response after asking one question

## [6.1.0] - 2025-12-25

### Changed

- **Directory structure unified**: `storage/features/` → `storage/specs/`
  - All spec files now use flat naming: `{feature}-requirements.md`, `{feature}-design.md`, `{feature}-tasks.md`
  - Follows Article VIII Anti-Abstraction principle
  - Simpler, more intuitive file structure

### Enhanced

- **Requirements definition workflow** (`/sdd-requirements`):
  - Added **Interactive Dialogue Phase**: 1-on-1 Q&A to discover "true purpose" behind user requests
  - 5 question types: Goal Clarification, Background/Context, Scope Definition, Success Criteria, Constraints
  - Added **MECE Analysis**: Comprehensive requirement coverage using 4 dimensions (User Journey, Data Flow, System States, Edge Cases)

### Updated

- **Documentation unified** to use `storage/specs/` path:
  - All `.claude/skills/` files (7 files)
  - All `src/templates/agents/claude-code/skills/` templates (7 files)
  - User guides, tutorials, and examples
  - `bin/musubi-init.js` now creates `storage/archive/` instead of `storage/features/`

### Fixed

- Consistent directory references across all agents and skills

## [6.0.0] - 2025-12-24

### Changed - **BREAKING**

- **GitHub Copilot prompt file extension**: `.md` → `.prompt.md`
  - Per VS Code official documentation, GitHub Copilot prompt files now use `.prompt.md` extension
  - All prompt files in `.github/prompts/` renamed to `*.prompt.md`
  - Template files in `src/templates/agents/github-copilot/commands/` updated
  - Test file `tests/init-platforms.test.js` updated for new extension detection

### Updated

- **Documentation updates for `.prompt.md`**:
  - `steering/structure.md` / `steering/structure.ja.md` - Added 7 platform support table with file extensions
  - `steering/tech.md` / `steering/tech.ja.md` - Updated AI platform extension information
  - `MULTI-AGENT-DESIGN.md` - Updated directory structure example
  - `README.md` / `README.ja.md` - Updated platform comparison tables and notes

### Technical Details

- **Files renamed** (19 files total):
  - `.github/prompts/*.md` → `*.prompt.md` (10 files)
  - `src/templates/agents/github-copilot/commands/*.md` → `*.prompt.md` (9 files)

- **Test updates**:
  - Extension detection logic now handles 3 cases: `.toml` (Gemini), `.prompt.md` (GitHub Copilot), `.md` (others)

### Migration Guide

If you have existing projects initialized with MUSUBI for GitHub Copilot:

```bash
# Rename prompt files to use .prompt.md extension
cd .github/prompts/
for f in *.md; do [ "$f" != "AGENTS.md" ] && mv "$f" "${f%.md}.prompt.md"; done
```

## [5.9.1] - 2025-12-22

### Added

- **Indonesian Language Support (Bahasa Indonesia)** - Added `id` locale to multi-language templates
- Expanded from 7 languages to 8 languages support (en, ja, zh, ko, de, fr, es, id)
- Updated documentation to reflect 8-language internationalization

## [5.9.0] - 2025-12-12

### Added

**Phase 1-4 Enterprise Features** 🏢

Major update with enterprise-ready features for large-scale projects and monorepo support.

#### Phase 1: Workflow Flexibility

- **3 Workflow Modes**: `small`, `medium`, `large` with configurable stages
- **`steering/rules/workflow-modes.yml`** - Centralized workflow configuration
- **WorkflowModeManager** - Mode detection and stage management
- **`musubi-release`** - New CLI for release automation with CHANGELOG generation
- **Auto-detection** - Feature name pattern matching for mode selection

```bash
# Auto-generate CHANGELOG from commits
musubi-release

# Dry run with custom version
musubi-release --dry-run --version 2.0.0
```

#### Phase 2: Monorepo Support

- **`steering/packages.yml`** - Package registry with dependency graphs
- **PackageManager** - Package discovery and dependency analysis
- **Mermaid diagram generation** - Visual dependency graphs
- **Coverage tracking** - Per-package test coverage reporting

```javascript
const { PackageManager } = require('musubi-sdd');
const pm = new PackageManager('/path/to/monorepo');
const graph = pm.generateDependencyGraph('mermaid');
```

#### Phase 3: Constitution Level Management

- **3 Enforcement Levels**: `critical`, `advisory`, `flexible`
- **`steering/rules/constitution-levels.yml`** - Level configuration
- **ConstitutionLevelManager** - Level-aware validation
- **Blocking vs Warning separation** - Critical violations block, others warn
- **Project-specific overrides** - Custom level settings per project

| Level | Articles | Enforcement |
|-------|----------|-------------|
| Critical | CONST-001, 002, 003, 005, 009 | Blocks workflow |
| Advisory | CONST-004, 006, 007 | Warnings only |
| Flexible | CONST-008 | Suggestions |

#### Phase 4: Project Configuration

- **`musubi-config`** - New CLI for configuration management
- **ProjectValidator** - Schema validation with AJV
- **v1.0 → v2.0 Migration** - Automatic config migration
- **Effective configuration** - Defaults merged with project settings

```bash
# Validate project.yml
musubi-config validate

# Migrate to v2.0 schema
musubi-config migrate

# Show effective configuration
musubi-config show
```

#### Orchestrator Integration

- **5 Built-in Skills** - Programmable access to Phase 1-4 features
- **3 New Skill Categories**: `release`, `workflow`, `configuration`
- **BuiltInSkills module** - Pre-registered skills with execute functions

| Skill ID | Category | Actions |
|----------|----------|----------|
| `release-manager` | release | Generate CHANGELOG |
| `workflow-mode-manager` | workflow | get, detect, compare |
| `package-manager` | configuration | list, graph, validate, coverage |
| `constitution-level-manager` | validation | summary, level, validate |
| `project-config-manager` | configuration | validate, migrate, show |

```javascript
const { workflowModeSkill } = require('musubi-sdd/src/orchestration');

// Execute skill programmatically
const result = await workflowModeSkill.execute({
  action: 'detect',
  featureName: 'fix: small bug'
});
console.log(result.detectedMode); // 'small'
```

### Changed

- Updated `src/managers/workflow.js` to use `WorkflowModeManager`
- Stage names standardized: `implementation` → `implement`, `validation` → `validate`
- Enhanced `ConstitutionalValidator` with level-aware validation
- Extended `SkillRegistry` with new skill categories
- Updated `src/index.js` with comprehensive exports

### Fixed

- Workflow transition tests updated for new stage names
- Fixed mode detection for `medium` mode patterns

### Tests

- Added 96 tests for Phase 1-4 features
- Added 20 tests for built-in skills
- Total tests: 4,358 → 4,408 (50+ new tests)

## [5.8.2] - 2025-12-11

### Fixed

- ESLint unused variable errors in CodeGraph MCP integration
- Fixed `_type` parameter naming in `suggestRefactoring()`
- Fixed mock parameters in `better-sqlite3.js`
- Removed unused `path` import in tests

## [5.8.1] - 2025-12-11

### Changed

- Documentation updates for CodeGraph MCP v0.8.0 integration
- Updated steering docs with project statistics
- Version bump for npm publish

## [5.8.0] - 2025-12-11

### Added

**CodeGraph MCP v0.8.0 Integration** 🔗

Major update to CodeGraph MCP integration with expanded language support:

- **16 Language Support**
  - NEW: Kotlin (`.kt`, `.kts`) - classes, interfaces, objects, functions, properties
  - NEW: Swift (`.swift`) - classes, structs, protocols, functions, extensions
  - NEW: Scala (`.scala`, `.sc`) - classes, traits, objects, functions
  - NEW: Lua (`.lua`) - functions, local functions, table assignments
  - Existing: Python, TypeScript, JavaScript, Rust, Go, Java, PHP, C#, C, C++, HCL, Ruby

- **File Watching & Auto Re-indexing (v0.7.0)**
  - `startWatch()` - Start file monitoring with configurable debounce
  - `stopWatch()` - Stop file watching
  - `isWatching()` - Check watch status
  - `--community` flag for community detection after re-index

- **Enhanced MCP Tools Integration**
  - `queryCodebase()` - Natural language codebase search
  - `findDependencies()` - Entity dependency analysis with depth control
  - `findCallers()` / `findCallees()` - Call graph traversal
  - `findImplementations()` - Interface implementation discovery
  - `analyzeModuleStructure()` - Module structure analysis
  - `getCodeSnippet()` - Source code retrieval with context
  - `suggestRefactoring()` - Refactoring recommendations
  - `globalSearch()` / `localSearch()` - GraphRAG-powered search

- **Entity ID Partial Matching**
  - Exact match, name match, qualified_name suffix match
  - `file::name` pattern support (e.g., `auth.py::login`)

- **Security Improvements (v0.7.3)**
  - Path traversal protection
  - Command injection prevention
  - Connection pooling
  - Caching for performance

### Changed

- Updated `src/integrations/codegraph-mcp.js` to v5.8.0
- Added 68 new tests for CodeGraph MCP integration
- Added `tests/__mocks__/better-sqlite3.js` for test isolation
- Total tests: 4,290 → 4,358 (68 new tests)

## [5.7.2] - 2025-12-11

### Added

**Phase 6 P2: Startup Time Optimization Module** ⚡

New `src/performance/startup-optimizer.js` for optimized application startup:

- **InitStage Enum**
  - Staged initialization: CORE, EXTENDED, OPTIONAL, ON_DEMAND
  - Priority-based ordering within stages

- **InitModule**
  - Deferred initialization with dependency resolution
  - State tracking: PENDING, LOADING, READY, ERROR
  - Duration measurement for profiling

- **StartupOptimizer**
  - Parallel module loading with configurable concurrency limit
  - Automatic dependency resolution
  - Stage-based initialization (core first, optional deferred)
  - Initialization profiling and statistics

- **WarmupCache**
  - Pre-computed cache for frequently accessed data
  - Parallel warmup execution
  - Hit tracking for optimization

- **InitProfiler**
  - High-resolution timing with `process.hrtime.bigint()`
  - Named marks and measurements
  - Duration summary and slowest module identification

### Changed

- Added 44 new tests for startup optimizer (3,998 → 4,042 total)
- Test suites increased from 133 to 134
- Updated phase6-planning.md with P0/P1/P2 completion status

## [5.7.1] - 2025-12-11

### Added

**Phase 6 P1: Memory Optimization Module** 🧠

New `src/performance/memory-optimizer.js` for enterprise-grade memory management:

- **ObjectPool**
  - Reusable object pooling to reduce GC pressure
  - Configurable initial/max size with reset function
  - Recycle rate tracking for optimization

- **WeakCache**
  - Weak reference caching for large objects
  - Automatic cleanup when memory is needed
  - Hit/miss rate statistics

- **MemoryMonitor**
  - Heap usage tracking with pressure levels (LOW/MODERATE/HIGH/CRITICAL)
  - Memory trend analysis (stable/increasing/decreasing)
  - Pressure level listeners for automatic actions

- **StreamingBuffer**
  - Memory-efficient large data processing
  - Configurable chunk size and max buffered items

- **MemoryOptimizer**
  - Coordinator for pools and caches
  - Auto-GC on HIGH/CRITICAL pressure
  - Comprehensive statistics

### Changed

- Added 40 new tests for memory optimization (3,958 → 3,998 total)
- Test suites increased from 132 to 133
- Jest config: Added `forceExit` to handle pending swarm timers

## [5.7.0] - 2025-12-11

### Added

**Phase 6 P0: Performance Optimization Module** 🚀

New `src/performance/` module for enterprise-grade performance optimization:

- **LazyLoader** (`lazy-loader.js`)
  - On-demand module loading with preload hints
  - MODULE_REGISTRY with 14 module categories
  - `createLazyProxy()` for transparent lazy loading

- **CacheManager** (`cache-manager.js`)
  - LRU cache with TTL-based expiration
  - Namespace support for cache isolation
  - RequestCoalescer for duplicate request deduplication
  - Memoization helper for function results

- **BatchProcessor** (`index.js`)
  - Bulk operations with concurrency control
  - Configurable batch size and flush interval

- **ConnectionPool** (`index.js`)
  - Resource pooling with acquire/release pattern
  - Timeout handling for connection acquisition

- **PerformanceMonitor** (`index.js`)
  - Timing metrics with percentile calculation (p50, p95, p99)
  - Histogram-based performance tracking

### Changed

- Added 108 new tests for performance module (3,850 → 3,958 total)
- Test suites increased from 129 to 132
- Performance module coverage: 93.1%

## [5.6.3] - 2025-12-11

### Changed

- Fixed Prettier code style issues in 6 test files
- Version bump for npm publish

## [5.6.2] - 2025-12-11

### Added

- **P2 Coverage Improvements**: Enhanced test coverage for 3 critical modules
  - `steering-auto-update.js`: 60.73% → 86.38% (+25.65%)
  - `steering-validator.js`: 45.69% → 98.67% (+52.98%)
  - `monitoring/index.js`: 40.83% → 100% (+59.17%)
- **116 new tests** added (3,734 → 3,850 total tests)
- **Phase 6 Planning Document**: Enterprise features roadmap
  - Multi-tenant support (P0)
  - Performance optimization (P0)
  - Advanced AI capabilities (P1)
  - Enterprise integrations (P1)
  - VSCode extension enhancements (P2)

### Changed

- Overall test coverage improved to 76.62%
- Added mock-fs based tests for filesystem-dependent validation

## [5.6.1] - 2025-12-10

### Added

- E2E tests for enterprise-scale modules (LargeProjectAnalyzer, ComplexityAnalyzer, RustMigrationGenerator, HierarchicalReporter)
- Enterprise Scale Modules documentation to all platform templates (Cursor, Windsurf, Codex, GitHub Copilot, Qwen, Gemini)

### Changed

- Updated README.md and README.ja.md with v5.6.0 Enterprise Scale features
- Updated USER-GUIDE.md to v5.6.0 with Enterprise Scale Analysis section
- Updated GCC-ANALYSIS-IMPROVEMENTS.md with implementation completion status
- Updated CodeGraph MCP index (12,093 entities, 59,222 relations, 140 communities)
- Synced steering documents (project.yml, tech.md, structure.md)

### Fixed

- E2E test assertions for correct API return structures

## [5.6.0] - 2025-12-10

### Fixed

- Lint errors in v5.5.0 modules (unused variables)

### Changed

- Version bump for npm publish

## [5.5.0] - 2025-12-10

### Added

**Enterprise-Scale Analysis & Rust Migration Support** 🏢🦀

Major improvements based on analysis of GCC codebase (10+ million lines, 100,000+ files).

#### Large Project Analyzer (`src/analyzers/large-project-analyzer.js`)
- **Scale-aware analysis**: Automatically detects project size and selects appropriate strategy
  - Small (≤100 files): Batch analysis
  - Medium (≤1,000 files): Batch analysis with optimizations
  - Large (≤10,000 files): Chunked analysis
  - Massive (>10,000 files): Streaming analysis
- **Memory-efficient processing**: Chunk-based processing with garbage collection
- **Multi-language support**: JavaScript, TypeScript, C, C++, Python, Rust, Go, Java
- **Giant function detection**: Flags functions with 100+ (warning), 500+ (critical), 1000+ (extreme) lines
- **Progress tracking**: Real-time progress callbacks and memory monitoring

#### CodeGraph MCP Integration (`src/integrations/codegraph-mcp.js`)
- **Deep code graph analysis**: Integration with CodeGraph MCP for relationship analysis
- **Call graph generation**: Track callers and callees with configurable depth
- **Impact analysis**: Identify affected files when code changes
- **Circular dependency detection**: Find cycles in module dependencies
- **Hotspot identification**: Detect highly-connected entities (refactoring candidates)
- **Community detection**: Group related code modules

#### Enhanced Complexity Analyzer (`src/analyzers/complexity-analyzer.js`)
- **Cyclomatic complexity**: Standard decision-point counting
- **Cognitive complexity**: SonarSource-style readability measurement
- **Severity levels**: Ideal → Warning → Critical → Extreme thresholds
- **Automatic recommendations**: Split function suggestions, complexity reduction tips
- **Multi-language patterns**: Language-specific function detection

#### Rust Migration Generator (`src/generators/rust-migration-generator.js`)
- **Unsafe pattern detection**:
  - Memory management: malloc, calloc, realloc, free
  - Buffer overflow: strcpy, strcat, sprintf, gets
  - Pointer operations: arithmetic, casts, double pointers
  - Concurrency: pthread, volatile misuse
  - Format strings: printf with variable format
- **Security component identification**: Stack protection, sanitizers, crypto, auth
- **Risk scoring**: Weighted calculation based on pattern severity
- **Migration planning**: Phased approach with effort estimation
- **Report generation**: Markdown reports with priorities and recommendations

#### Hierarchical Reporter (`src/reporters/hierarchical-reporter.js`)
- **Directory-based grouping**: Aggregate stats by directory hierarchy
- **Drill-down support**: Navigate from project → module → file
- **Hotspot visualization**: Highlight problem areas
- **Health scoring**: Overall project health (0-100)
- **Multiple formats**: Markdown and JSON output

### Thresholds (Configurable)

| Metric | Ideal | Warning | Critical | Extreme |
|--------|-------|---------|----------|---------|
| Function Lines | 50 | 100 | 500 | 1,000 |
| Cyclomatic Complexity | 5 | 10 | 25 | 50 |
| Cognitive Complexity | 8 | 15 | 30 | 60 |
| File Lines | 300 | 500 | 1,000 | 2,000 |

### Tests
- 75 new tests for enterprise features
- All tests passing

### Documentation
- `docs/analysis/GCC-ANALYSIS-IMPROVEMENTS.md`: Detailed improvement proposals from GCC analysis

---

## [5.4.0] - 2025-12-10

### Added

**GitHub Reference & Repository Analysis** 📦

New feature to reference multiple GitHub repositories for pattern analysis and improvement suggestions.

#### `--reference` / `-r` Option
- **Multiple repository references** with `--reference` or `-r` (can be specified multiple times)
- **Flexible formats**:
  - `owner/repo` - Simple format
  - `https://github.com/owner/repo` - HTTPS URL
  - `git@github.com:owner/repo.git` - SSH URL
  - `owner/repo@branch` - Branch specification
  - `owner/repo#path` - Subpath specification

#### Repository Analysis
- **GitHub API integration** with metadata, structure, and key file fetching
- **GITHUB_TOKEN support** for API rate limit handling
- **Key files analyzed**: README.md, package.json, Cargo.toml, pyproject.toml, go.mod, pom.xml

#### Pattern Detection
- **Architecture patterns**:
  - Clean Architecture (domain, application, infrastructure, interface)
  - Hexagonal Architecture (adapters, ports, core)
  - Domain-Driven Design (aggregates, entities, valueobjects)
  - Monorepo (packages, apps, libs)
- **Technology detection**: React, Vue, Angular, Next.js, Express, Fastify, TypeScript, Tokio, Axum, FastAPI, Django
- **Configuration detection**: Jest, Vitest, Mocha, ESLint, Prettier, Biome, pytest

#### Improvement Suggestions
- **Architecture recommendations** based on common patterns across referenced repos
- **Technology suggestions** based on popular choices
- **Best practices** detected from README badges and CI/CD references

#### Output
- **Analysis saved to** `steering/references/github-references-YYYY-MM-DD.md`
- **Includes**: Repository metadata, directory structure, detected patterns, technologies, and improvement suggestions

### Usage Examples

```bash
# Single repository reference
musubi init --reference facebook/react

# Multiple repositories (short form)
musubi init -r vercel/next.js -r facebook/react -r denoland/deno

# Full URL format
musubi init --reference https://github.com/tokio-rs/tokio

# With branch specification
musubi init -r owner/repo@develop
```

### Tests
- Added 59 new tests for GitHub reference feature
- All 3,571 tests passing

---

## [5.3.0] - 2025-12-10

### Added

**Multi-Language Support & Language Recommendation Engine** 🌐

Complete implementation of multi-language project initialization with intelligent language recommendations.

#### Technology Stack Approach Selection
- **Four initialization modes**:
  - `Single language` - Select one primary language
  - `Multiple languages` - Select multiple languages for polyglot projects
  - `Undecided` - Generate placeholder tech.md for later decisions
  - `Help me decide` - AI-powered language recommendations

#### Language Recommendation Engine
- **Intelligent language selection** based on:
  - Application type (10 types: web-frontend, web-backend, cli, desktop, mobile, data, ml, embedded, game, systems)
  - Performance requirements (high, moderate, rapid development)
  - Team expertise (boost languages team knows)
- **Scoring system** with weighted factors
- **Top 3 recommendations** with reasons

#### 10 Language Support
- JavaScript/TypeScript, Python, Rust, Go
- Java/Kotlin, C#/.NET, C/C++
- Swift, Ruby, PHP
- Each with version, runtime, package manager, frameworks, testing info

#### Dynamic tech.md Generation
- **Language-specific templates** with appropriate frameworks and tools
- **Undecided mode** generates decision criteria and TODO checklist
- **project.yml** updated with `tech_stack` configuration

### Tests
- Added 16 new tests for language recommendation engine
- All 3,425 tests passing

---

## [5.2.0] - 2025-12-10

### Fixed

**ESLint & Prettier Compliance** 🔧

- Fixed 282 ESLint errors across bin/, src/, tests/
- Fixed Prettier formatting for 242 files
- All 3,409 tests passing

---

## [5.0.0] - 2025-12-10

### Added

**Phase 5: Advanced Features - Complete Implementation** 🚀

Complete implementation of advanced steering, validation, and quality monitoring features.

#### Sprint 5.1: Steering Auto-Update
- **SteeringAutoUpdate** (`src/steering/steering-auto-update.js`)
  - Automatic project memory synchronization
  - 5 trigger types: MANUAL, SCHEDULED, FILE_CHANGE, AGENT_WORK, PROJECT_INIT
  - Priority-based update queue with deduplication
  - File watcher integration for real-time updates
  - Update history tracking and rollback support

- **SteeringValidator** (`src/steering/steering-validator.js`)
  - Comprehensive validation for steering documents
  - 4 steering types: STRUCTURE, TECH, PRODUCT, RULES
  - Schema validation with required/optional fields
  - Cross-reference validation between documents
  - Severity levels: INFO, WARNING, ERROR, CRITICAL

#### Sprint 5.2: Template Constraints
- **TemplateConstraints** (`src/templates/template-constraints.js`)
  - Template structure enforcement with constraints
  - 5 constraint types: REQUIRED, PATTERN, LENGTH, CUSTOM, ENUM
  - Section validation with required/optional markers
  - Constraint inheritance for template hierarchies

- **ThinkingChecklist** (`src/templates/template-constraints.js`)
  - Structured thinking process enforcement
  - Uncertainty markers (HIGH, MEDIUM, LOW)
  - 3 marker types: UNCERTAINTY, ASSUMPTION, DECISION
  - Checklist validation for completeness

#### Sprint 5.3: Quality Metrics Dashboard
- **QualityDashboard** (`src/monitoring/quality-dashboard.js`)
  - A-F grade quality metrics (90-100=A, 80-89=B, etc.)
  - 6 metric categories: CODE, DOCUMENTATION, TESTING, ARCHITECTURE, SECURITY, COMPLIANCE
  - Health status monitoring (HEALTHY, WARNING, CRITICAL, UNKNOWN)
  - 9 Constitutional Articles compliance tracking
  - Trend analysis and historical data

#### Sprint 5.4: Advanced Validation
- **AdvancedValidation** (`src/validators/advanced-validation.js`)
  - Cross-artifact consistency validation
  - Gap detection across requirements, design, implementation, tests
  - Traceability validation with coverage analysis
  - 4 validation types: SYNTAX, SEMANTIC, CONSISTENCY, TRACEABILITY
  - 5 artifact types: REQUIREMENT, DESIGN, IMPLEMENTATION, TEST, DOCUMENTATION
  - Gap severity levels: LOW, MEDIUM, HIGH, CRITICAL

#### Sprint 5.5: Final Integration
- **Phase5Integration** (`src/phase5-integration.js`)
  - Unified access to all Phase 5 features
  - Integration status tracking (NOT_STARTED, IN_PROGRESS, COMPLETED, FAILED)
  - Combined quality assessment
  - Automated workflow orchestration

### Phase 4 Integration
- Complete orchestrator integration for Phase 4 & 5 tools
- Correct exports: RepositoryMap, ASTExtractor, ContextOptimizer
- All 57 integration tests passing

### Tests
- Sprint 5.1: 50 tests (Steering Auto-Update)
- Sprint 5.2: 58 tests (Template Constraints)
- Sprint 5.3: 40 tests (Quality Dashboard)
- Sprint 5.4: 40 tests (Advanced Validation)
- Sprint 5.5: 39 tests (Final Integration)
- Orchestration: 1,072 tests
- **Total: 3,378 tests passing (115 suites)**

### Fixed
- Orchestrator Phase 4 exports corrected (CodebaseIntelligence → RepositoryMap/ASTExtractor/ContextOptimizer)

---

## [3.11.0] - 2025-12-10

### Added

**Phase 3: Skill System Architecture & Advanced Workflows** 🎯

Complete implementation of OpenAI Agents SDK inspired skill architecture and advanced workflow execution.

#### Skill System Architecture
- **Skill Registry** (`src/orchestration/skill-registry.js`)
  - Centralized skill registration and discovery
  - Skill metadata with inputs/outputs/tags
  - Category-based and tag-based filtering
  - Dependency validation and resolution
  - Health monitoring and circuit breaker integration

- **Skill Executor** (`src/orchestration/skill-executor.js`)
  - Parallel and sequential execution with P-labels (P0-P3)
  - Input/output validation with JSON Schema
  - Retry logic with exponential backoff
  - Execution hooks (before/after/onError)
  - Guardrail integration for safety checks
  - Comprehensive metrics and event emission

- **Agent-Skill Binding** (`src/orchestration/agent-skill-binding.js`)
  - Dynamic capability-based skill binding
  - Agent capability scoring system
  - Permission and context-based matching
  - Skill affinity management

- **MCP Tool Adapters** (`src/orchestration/mcp-tool-adapters.js`)
  - MCP-to-Skill adapter for external tools
  - Skill-to-MCP adapter for tool exposure
  - Automatic schema conversion
  - Event emission for tool operations

#### Advanced Workflows
- **Workflow Executor** (`src/orchestration/workflow-executor.js`)
  - End-to-end workflow execution engine
  - 8 step types: task, parallel, conditional, loop, human-approval, error-handler, transform, aggregate
  - Variable resolution with ${variable} syntax
  - Condition evaluation with operators ($eq, $and, $or, $gt, $lt, etc.)
  - Checkpoint management for rollback
  - Pause/resume/cancel execution control

- **Error Handler** (`src/orchestration/error-handler.js`)
  - Error classification with pattern matching
  - Circuit breaker for service protection (closed/open/half-open)
  - Graceful degradation with fallback strategies
  - Retry with exponential backoff
  - Error aggregation and reporting

- **Workflow Templates** (`src/orchestration/workflow-examples.js`)
  - 5 real-world workflow templates:
    - Feature development workflow
    - CI/CD pipeline workflow
    - Code review workflow
    - Incident response workflow
    - Documentation workflow

### Documentation
- Added `docs/guides/incremental-adoption.md` - Migration guide for gradual adoption

### Tests
- Added 286+ new tests for skill system and workflows
- Skill Registry: 42 tests
- Skill Executor: 56 tests
- Agent-Skill Binding: 34 tests
- MCP Tool Adapters: 68 tests
- Workflow Executor: 36 tests
- Error Handler: 50 tests
- All 2574 tests passing

### Fixed
- CI/CD pipelines now exclude E2E tests that require Ollama environment

---

## [3.10.0] - 2025-12-09

### Added

**Phase 3: Multi-Skill Orchestration Documentation** 📚

Comprehensive documentation for orchestration patterns, P-label parallelization, and guardrails system.

#### Orchestration Patterns Guide
- **Complete pattern documentation** (`docs/guides/orchestration-patterns.md`)
  - All 9 patterns: Auto, Sequential, Nested, Group Chat, Swarm, Human-in-Loop, Handoff, Triage
  - CLI examples for each pattern
  - Complete workflow examples (end-to-end feature development)
  - Integration with guardrails
  - Best practices and recommendations

#### P-Label Parallelization Tutorial
- **P-label priority system** (`docs/guides/p-label-parallelization.md`)
  - P0-P3 priority levels explained
  - Execution order and timing diagrams
  - Real-world examples (feature development, code review, testing)
  - Dependency management
  - Execution strategies (all, first, majority, quorum)
  - Error handling and retry configuration
  - Performance optimization tips
  - Integration with replanning engine

#### Guardrails System Guide
- **Comprehensive guardrails documentation** (`docs/guides/guardrails-guide.md`)
  - InputGuardrail, OutputGuardrail, SafetyCheckGuardrail
  - GuardrailChain for pipeline execution
  - GuardrailRules DSL with RuleBuilder
  - CLI reference with examples
  - Integration with orchestration patterns
  - Constitutional compliance checking
  - Tripwire behavior explanation
  - Best practices for security

### Documentation
- Added `docs/guides/orchestration-patterns.md`
- Added `docs/guides/p-label-parallelization.md`
- Added `docs/guides/guardrails-guide.md`

---

## [3.9.0] - 2025-12-09

### Added

**Swarm Enhancement Phase 2 - Guardrails System** 🛡️

OpenAI Agents SDK inspired guardrails for input/output validation, safety checks, and constitutional compliance.

#### BaseGuardrail - Core Guardrail Infrastructure
- **BaseGuardrail class** (`src/orchestration/guardrails/base-guardrail.js`)
  - Abstract base class for all guardrails
  - Tripwire functionality for immediate failure handling
  - Configurable severity levels (info, warning, error, critical)
  - Execution time tracking and metadata

- **GuardrailChain** - Compose multiple guardrails
  - Sequential and parallel execution modes
  - Stop-on-first-failure option
  - Aggregated results with all violations

- **GuardrailTripwireException** - Custom exception for tripwire failures

#### InputGuardrail - Input Validation & Sanitization
- **InputGuardrail class** (`src/orchestration/guardrails/input-guardrail.js`)
  - Input validation with configurable rules
  - Sanitization: trim, normalize whitespace, remove HTML, escape, truncate
  - PII detection: email, phone, credit card, SSN
  - Injection attack detection: SQL, XSS, command injection
  - Field-level validation for structured input

- **Factory function** `createInputGuardrail(preset, options)`
  - Presets: `userInput`, `security`, `strict`, `minimal`

#### OutputGuardrail - Output Validation & Redaction
- **OutputGuardrail class** (`src/orchestration/guardrails/output-guardrail.js`)
  - Output content validation
  - Sensitive data redaction: email, phone, API keys, passwords, connection strings
  - Content policy enforcement
  - Quality checks for output content

- **Factory function** `createOutputGuardrail(preset, options)`
  - Presets: `safe`, `security`, `strict`, `redact`

#### GuardrailRules DSL - Rule Definition System
- **RuleBuilder** - Fluent API for building validation rules
  - `.required()`, `.minLength(n)`, `.maxLength(n)`
  - `.pattern(regex)`, `.noPII()`, `.noInjection()`
  - `.custom(fn, message)`, `.noHarmful()`

- **RuleRegistry** - Central registry for rule sets
  - Register and retrieve named rule sets
  - List all registered rules

- **CommonRuleSets** - Pre-built rule sets
  - `security` - Security-focused rules
  - `strictContent` - Strict content validation
  - `userInput` - Standard user input rules
  - `agentOutput` - Agent output validation

- **SecurityPatterns** - Regex patterns for detection
  - EMAIL, PHONE, CREDIT_CARD, SSN, API_KEY
  - SQL_INJECTION, XSS, COMMAND_INJECTION

#### SafetyCheckGuardrail - Constitutional Compliance
- **SafetyCheckGuardrail class** (`src/orchestration/guardrails/safety-check.js`)
  - Content safety analysis
  - Constitutional Articles compliance checking
  - PII detection and flagging

- **SafetyLevel enum** - LOW, MEDIUM, HIGH, CRITICAL

- **ContentCategory enum** - SAFE, HARMFUL, HATE_SPEECH, VIOLENCE, SEXUAL, MISINFORMATION, PII_EXPOSURE, ILLEGAL

- **ConstitutionalArticleChecker** - 9 Constitutional Articles validation
  - Article I: Spec Supremacy (`[SPEC:xxx]` reference required)
  - Article II: Traceability Mandate (`[TRACE:xxx]` required)
  - Article III-VI: Context-dependent checks
  - Article VII: Simplicity Gate (no over-abstraction)
  - Article VIII-IX: Governance checks

- **Factory function** `createSafetyCheckGuardrail(preset, options)`
  - Presets: `minimal`, `standard`, `strict`, `constitutional`

#### CLI Integration
- **musubi-validate guardrails** command
  - `--type <input|output|safety>` - Guardrail type
  - `--level <basic|standard|strict|paranoid>` - Safety level
  - `--constitutional` - Enable constitutional compliance
  - `--redact` - Enable output redaction
  - Rich console output with violations and redaction details

- **musubi-validate guardrails-chain** command
  - Chain multiple guardrails together
  - `--parallel` - Run guardrails in parallel
  - `--stop-on-failure` - Stop on first failure

### Testing
- **183 guardrails tests** across 5 test suites
  - base-guardrail.test.js - Core guardrail infrastructure
  - guardrail-rules.test.js - Rules DSL
  - input-guardrail.test.js - Input validation
  - output-guardrail.test.js - Output validation
  - safety-check.test.js - Safety checks
  - guardrails-integration.test.js - E2E integration tests

- **Total test count: 2332 tests**

### Technical Details
- OpenAI Agents SDK guardrails pattern implementation
- Full tripwire support for critical violations
- Composable guardrail chains
- Extensible rule system
- Constitutional governance integration

---

## [3.8.0] - 2025-12-09

### Added

**Swarm Enhancement Phase 1 - OpenAI Agents SDK Inspired Patterns** 🤖

#### HandoffPattern - Explicit Agent Delegation
- **HandoffPattern class** (`src/orchestration/patterns/handoff.js`)
  - Explicit agent-to-agent task delegation
  - Multiple strategies: SINGLE, FIRST_MATCH, ROUND_ROBIN, WEIGHTED, CONDITIONAL
  - Handoff chain tracking across multiple delegations
  - Configurable timeout and max handoffs limit

- **Input/Output Filters**
  - `removeAllTools` - Strip tool information from history
  - `userMessagesOnly` - Keep only user messages
  - `lastN(n)` - Keep last N messages
  - `summarize` - Create summary of conversation
  - `keepAll` - Preserve full history

- **EscalationData** - Structured escalation context
  - Priority levels (low, normal, high, urgent)
  - Callback support for escalation handling
  - Source/target agent tracking

#### TriagePattern - Request Classification & Routing
- **TriagePattern class** (`src/orchestration/patterns/triage.js`)
  - Intelligent request classification and agent routing
  - Multiple classification strategies: KEYWORD, INTENT, CAPABILITY, HYBRID, LLM
  - Agent capability scoring with priority and load balancing

- **Classification Categories**
  - BILLING, SUPPORT, SALES, TECHNICAL, REFUND, GENERAL, ESCALATION, UNKNOWN
  - Configurable keyword mappings per category
  - Intent detection with confidence scoring

- **AgentCapability** - Agent skill definition
  - Category handling declarations
  - Keyword matching
  - Load balancing with max concurrent limits

#### CLI Integration
- **`musubi-orchestrate handoff`** - Delegate tasks between agents
  - `--from`/`--to` for source/target agents
  - `--filter` for input filtering options
  - `--reason` for documentation
  - `--priority` for task urgency

- **`musubi-orchestrate triage`** - Classify and route requests
  - `--message` for request text
  - `--strategy` for classification method
  - `--threshold` for confidence cutoff
  - `--auto-handoff` for automatic delegation

- **`musubi-orchestrate triage-categories`** - List available categories

#### Orchestration Engine Integration
- Added `PatternType.HANDOFF` and `PatternType.TRIAGE`
- Auto-registration of new patterns in `createOrchestrationEngine()`
- Event emission for pattern lifecycle (started, completed, failed)

### Tests
- 30 unit tests for HandoffPattern
- 43 unit tests for TriagePattern
- 17 integration tests for combined workflows
- Total: 90 new tests (516 orchestration tests total)

### Documentation
- `docs/plans/SWARM-ENHANCEMENT-ROADMAP.md` - 4-phase implementation roadmap
  - Phase 1: Handoff + Triage (Current)
  - Phase 2: Guardrails System
  - Phase 3: Agent Loop
  - Phase 4: Advanced Features

---

## [3.7.1] - 2025-12-09

### Fixed

**GUI Quick Actions Enhancement** 🔧

#### Modal Dialog for New Requirement
- **Interactive Requirement Modal** (`src/gui/public/index.html`)
  - GUI modal dialog for creating requirements without terminal
  - Form-based input: Title, Description, Priority, Category
  - Real-time validation and success/error feedback
  - Backdrop click and close button support

#### Validate Project Fix
- **Fixed validation command** (`src/gui/server.js`)
  - Changed from `musubi-validate` to `musubi-validate all`
  - Proper subcommand handling for CLI integration
  - Enhanced error handling and output parsing

#### Export Report API
- **TraceabilityService.generateReport()** (`src/gui/services/traceability-service.js`)
  - New method for generating traceability reports
  - Integrated with Export Report quick action
  - Report download functionality

### Added

- **POST /api/requirements** endpoint for creating requirements via GUI
- **POST /api/actions/validate** endpoint for project validation
- **POST /api/actions/export-report** endpoint for report generation

---

## [3.7.0] - 2025-12-09

### Added

**Major Feature Release** 🚀

#### GUI & Browser Integration
- **WebSocket Real-time Replanning Updates** (`src/gui/ws-handler.js`)
  - Live replanning state synchronization via WebSocket
  - `replan:triggered`, `replan:progress`, `replan:completed` events
  - Real-time plan update broadcasting to connected clients

- **Browser Agent Tests** (`tests/agents/browser-agent.test.js`)
  - Comprehensive test coverage for musubi-browser functionality

#### GitHub Actions Integration
- **musubi-action** (`.github/actions/musubi-action/`)
  - GitHub Action for CI/CD integration
  - Reusable workflow for MUSUBI validation
  - Automatic MUSUBI checks in pull requests

#### Conversion & Interoperability
- **OpenAPI/Swagger Converter** (`src/converters/openapi-converter.js`)
  - Convert OpenAPI 3.x and Swagger 2.x specs to MUSUBI format
  - Automatic API endpoint discovery and documentation
  - Integration with Spec Kit ecosystem
  - CLI: `musubi-convert openapi <spec-file>`
  - 29 tests passing

#### Multi-language Templates
- **LocaleManager** (`src/templates/locale-manager.js`)
  - 7 language support: English, Japanese, Chinese, Korean, Spanish, German, French
  - Automatic locale detection from project files
  - CLI: `musubi-init --locale <lang>`
  - Templates: `requirements.{en,ja,zh,ko,es,de,fr}.md`
  - 31 tests passing

#### Local LLM Integration
- **Ollama Provider** (`src/llm-providers/ollama-provider.js`)
  - Full Ollama API integration for local LLM inference
  - 9 model presets: llama3.2, codellama, mistral, deepseek-coder, qwen2.5, etc.
  - Streaming support with async generators
  - Embedding generation via nomic-embed-text
  - Model management: pull, list, info
  - 26 tests passing + 12 E2E tests with real Ollama server

#### Cost Tracking & Monitoring
- **CostTracker** (`src/monitoring/cost-tracker.js`)
  - Token usage and cost tracking per provider
  - Session and lifetime statistics
  - Budget alerts with configurable thresholds
  - Pricing for OpenAI, Anthropic, Google, Local (free)
  - Report generation in text/JSON/CSV formats
  - CLI: `musubi-costs`, `musubi-costs report`, `musubi-costs budget`
  - 39 tests passing

#### Checkpoint Management
- **CheckpointManager** (`src/managers/checkpoint-manager.js`)
  - Development state snapshots with file preservation
  - Create, restore, compare, archive checkpoints
  - Tag-based organization
  - Automatic backup before restore
  - Auto-checkpoint with configurable interval
  - CLI: `musubi-checkpoint create/list/restore/compare`
  - 44 tests passing

### CLI Commands (v3.7.0 NEW)

| Command | Purpose |
|---------|---------|
| `musubi-init --locale <lang>` | Initialize with specific language |
| `musubi-convert openapi <spec>` | Convert OpenAPI to MUSUBI |
| `musubi-costs` | View current session costs |
| `musubi-costs report` | Generate cost report |
| `musubi-costs budget <amount>` | Set budget limit |
| `musubi-checkpoint create` | Create state checkpoint |
| `musubi-checkpoint list` | List all checkpoints |
| `musubi-checkpoint restore <id>` | Restore a checkpoint |
| `musubi-checkpoint compare <id1> <id2>` | Compare checkpoints |

### New Files Created

```
.github/actions/musubi-action/
bin/musubi-costs.js
bin/musubi-checkpoint.js
src/converters/openapi-converter.js
src/llm-providers/ollama-provider.js
src/monitoring/cost-tracker.js
src/managers/checkpoint-manager.js
src/managers/index.js
src/templates/index.js
src/templates/locale-manager.js
steering/templates/requirements.zh.md
steering/templates/requirements.ko.md
steering/templates/requirements.es.md
steering/templates/requirements.de.md
steering/templates/requirements.fr.md
tests/e2e/ollama-e2e.test.js
tests/converters/openapi-converter.test.js
tests/llm-providers/ollama-provider.test.js
tests/monitoring/cost-tracker.test.js
tests/managers/checkpoint-manager.test.js
tests/templates/locale-manager.test.js
```

### Tests

- New tests: 181 tests added
- E2E Tests: 12 Ollama integration tests with real server
- Total estimated: 2000+ tests passing

---

## [3.6.1] - 2025-12-09

### Added

**Advanced Replanning Components** 🚀

Building on v3.6.0's Dynamic Replanning Engine, this release adds three powerful components for proactive optimization and goal management:

#### ProactivePathOptimizer (`src/orchestration/replanning/proactive-path-optimizer.js`)
- Continuous path optimization even during successful execution
- Resource utilization analysis and bottleneck detection
- Parallel execution opportunity identification
- Optimization suggestions with confidence scoring
- Metrics: optimization count, improvement rate, suggestions generated

#### GoalProgressTracker (`src/orchestration/replanning/goal-progress-tracker.js`)
- Real-time goal progress monitoring with percentage tracking
- Milestone management with automatic progress calculation
- Goal dependency tracking and blocking detection
- Progress velocity and ETA estimation
- Goal status: pending, in-progress, completed, blocked, failed

#### AdaptiveGoalModifier (`src/orchestration/replanning/adaptive-goal-modifier.js`)
- Dynamic goal adjustment based on execution context
- Constraint relaxation when goals become unachievable
- Goal splitting for complex objectives
- Priority recalculation based on dependencies
- Modification history with rollback support

### CLI Commands (v3.6.1 NEW)

| Command | Purpose |
|---------|---------|
| `musubi-orchestrate replan <context-id>` | Execute dynamic replanning |
| `musubi-orchestrate goal register` | Register a new goal |
| `musubi-orchestrate goal update <goal-id>` | Update goal progress |
| `musubi-orchestrate goal status` | View goal status |
| `musubi-orchestrate optimize run <path-id>` | Run path optimization |
| `musubi-orchestrate optimize suggest <path-id>` | Get optimization suggestions |
| `musubi-orchestrate path analyze <path-id>` | Analyze execution path |
| `musubi-orchestrate path optimize <path-id>` | Optimize execution path |

### Updated

- All 7 agent templates with Replanning Commands section
- Orchestrator skill with detailed replanning CLI documentation
- `patterns.md` with Pattern 7: Replanning Pattern
- Pattern Selection Matrix with replanning scenarios

### Tests

- 122 replanning tests (78 new tests added)
- Total test count: 1841 tests passing

---

## [3.6.0] - 2025-12-09

### Added

**Dynamic Replanning Engine** 🧠

A new intelligent replanning system that enables AI agents to dynamically adjust execution plans when tasks fail, timeout, or encounter obstacles - inspired by cutting-edge agentic AI research.

#### LLM Provider Abstraction (`src/llm-providers/`)
- `BaseLLMProvider` - Abstract base class for all LLM providers
- `CopilotProvider` - GitHub Copilot LM API integration (priority provider)
- `AnthropicProvider` - Anthropic Claude API integration
- `OpenAIProvider` - OpenAI GPT API integration
- `LLMProviderFactory` - Auto-detection and instantiation of appropriate provider
- Platform-aware provider selection (VS Code → Copilot, otherwise fallback chain)

#### Replanning Core (`src/orchestration/replanning/`)
- `ReplanningEngine` - Core orchestration engine with dynamic replanning
- `PlanMonitor` - Real-time plan execution monitoring with event emission
- `PlanEvaluator` - Progress evaluation, efficiency metrics, and recommendations
- `AlternativeGenerator` - LLM-powered alternative path generation
- `ReplanHistory` - Audit logging with JSONL persistence
- `ReplanTrigger` - Trigger types (failure, timeout, quality, manual, dependency)
- `ReplanDecision` - Decision types (continue, retry, alternative, abort, human)

#### Configuration & Integration
- Configurable trigger thresholds (failure count, timeout, quality degradation)
- Confidence-based decision making (threshold 0.7 for human approval)
- SwarmPattern integration with `enableReplanning` option
- Event-driven architecture with `replan:*` event emission
- Full backward compatibility with existing orchestration patterns

### Changed

- Updated `src/orchestration/index.js` with Replanning exports
- Enhanced `SwarmPattern` with `_handleReplanningWithContext()` and `_applyReplan()` methods
- Added comprehensive test suite (44 tests) for Replanning Engine

### Technical Details

| Component | Purpose |
|-----------|---------|
| `plan-monitor.js` | Watch execution, detect failures/timeouts, emit triggers |
| `plan-evaluator.js` | Calculate progress, efficiency, generate recommendations |
| `alternative-generator.js` | LLM-based alternative path generation with confidence scoring |
| `replan-history.js` | Audit trail with filtering, metrics, and export (MD/JSON) |
| `replanning-engine.js` | Main orchestrator with plan normalization and modification |

### Documentation

- `storage/features/replanning-engine.md` - EARS requirements (12 requirements)
- `storage/specs/design-replanning-engine.md` - C4 design + ADR
- `storage/specs/tasks-replanning-engine.md` - Task breakdown

---

## [3.5.1] - 2025-12-08

### Added

**CLI Integration Across All Platforms**

- Added CLI command references to 8 Claude Code skills:
  - `orchestrator` - All 20 CLI commands with detailed options
  - `issue-resolver` - `musubi-resolve` quick start guide
  - `agent-assistant` - `musubi-remember` memory management
  - `test-engineer` - `musubi-browser` E2E testing
  - `ui-ux-designer` - `musubi-browser` UI testing
  - `site-reliability-engineer` - `musubi-gui` dashboard
  - `steering` - `musubi-remember` memory CLI
  - `project-manager` - `musubi-orchestrate` multi-skill coordination

- Added CLI Commands section to all 6 non-Claude platforms:
  - GitHub Copilot (`AGENTS.md`)
  - Cursor (`AGENTS.md`)
  - Codex (`AGENTS.md`)
  - Windsurf (`AGENTS.md`)
  - Gemini CLI (`GEMINI.md`)
  - Qwen Code (`QWEN.md`)

### Changed

- Updated Learn More sections with CLI Reference links across all platforms
- Updated Agent↔CLI mapping in Orchestrator skill
- Fixed documentation URLs from `your-org` to `nahisaho`

### Documentation

- Added v3.5.0 NEW CLI commands documentation:
  - `musubi-orchestrate` - Multi-skill workflow orchestration
  - `musubi-browser` - Browser automation & E2E testing
  - `musubi-gui` - Web GUI dashboard
  - `musubi-remember` - Agent memory management
  - `musubi-resolve` - GitHub Issue auto-resolution
  - `musubi-convert` - Format conversion (Spec Kit)

---

## [3.4.0] - 2025-06-14

### Added - Phase 5 Advanced Features Complete 🎉

**MUSUBI v3.4.0 completes Phase 5 of the project roadmap.**

#### Phase 5 Deliverables (4 Sprints)

| Sprint | Description | Status |
|--------|-------------|--------|
| Sprint 5.1 | Steering Auto-Update | ✅ Complete |
| Sprint 5.2 | Template Constraints | ✅ Complete |
| Sprint 5.3 | Quality Metrics Dashboard | ✅ Complete |
| Sprint 5.4 | Advanced Validation | ✅ Complete |

#### New Features

**Steering Auto-Update** (`src/steering/auto-updater.js`):
- `ChangeDetector` - Detect file changes affecting steering files
- `SteeringUpdater` - Generate updates for structure/tech/product
- `ProjectYmlSync` - Sync project.yml with package.json
- `CustomSteeringRules` - Custom update rules from markdown
- `SteeringAutoUpdater` - Full auto-update orchestration

**Template Constraints** (`src/steering/template-constraints.js`):
- `Constraint` - Validation constraints with custom validators
- `ChecklistItem` / `Checklist` - Required checklists with validation
- `UncertaintyParser` - Parse {?unknown?}, {~estimate~}, {!todo!} markers
- `TemplateSection` - Section definitions with dependencies
- `TemplateDefinition` - Full template with sections and checklists
- `TemplateConstraintEngine` - LLM-constraining syntax validation

**Quality Metrics Dashboard** (`src/steering/quality-metrics.js`):
- `Metric` / `CoverageMetric` / `ComplianceMetric` - Metric types
- `HealthIndicator` - Health status with async checkers
- `TrendAnalyzer` - Trend detection (up/down/stable)
- `QualityScoreCalculator` - A-F grade calculation
- `QualityMetricsDashboard` - Full dashboard with reports

**Advanced Validation** (`src/steering/advanced-validation.js`):
- `ConsistencyChecker` - Cross-artifact consistency validation
- `GapDetector` - Gap detection between requirements/design/tests
- `CompletenessChecker` - Required fields and sections validation
- `DependencyValidator` - Dependency cycle detection
- `ReferenceValidator` - Reference validation (REQ-xxx, DES-xxx)
- `AdvancedValidator` - Unified validation with reporting

#### Test Coverage

| Module | Tests |
|--------|-------|
| Steering Auto-Update | 28 |
| Template Constraints | 54 |
| Quality Metrics | 57 |
| Advanced Validation | 50 |
| Index Integration | 44 |
| **Phase 5 Total** | **233** |

**Total Tests: 1490 (56 suites)**

---

## [3.3.0] - 2025-06-14

### Added - Phase 4 Monitoring & Operations Complete 🎉

**MUSUBI v3.3.0 completes Phase 4 of the project roadmap.**

#### Phase 4 Deliverables (2 Sprints)

| Sprint | Description | Status |
|--------|-------------|--------|
| Sprint 4.1 | SRE Capabilities | ✅ Complete |
| Sprint 4.2 | Observability Architecture | ✅ Complete |

#### New Features

**SRE Capabilities** (`src/monitoring/index.js`):
- `SLI` / `SLO` - Service Level Indicator/Objective definitions
- `AlertRule` - Prometheus-compatible alert expressions
- `HealthCheck` - Health check patterns with dependencies
- `MonitoringConfig` - Unified monitoring configuration
- `SLOTemplates` / `AlertTemplates` - Pre-defined templates

**Release Management** (`src/monitoring/release-manager.js`):
- `Release` - Full release lifecycle (planning → production → completed)
- `FeatureFlag` - Feature flag with percentage rollout
- `ReleaseManager` - Release coordination with rollback procedures
- Release notes generation (Markdown/JSON)
- Canary deployment support

**Incident Management** (`src/monitoring/incident-manager.js`):
- `Incident` - SEV1-SEV5 severity levels with timeline tracking
- `Runbook` - Runbook definitions with step tracking
- `RunbookExecution` - Runbook execution context
- `PostMortem` - Blameless post-mortem generation
- `IncidentManager` - On-call and incident lifecycle
- MTTR/MTTA metrics calculation

**Observability** (`src/monitoring/observability.js`):
- `Logger` - Structured logging with levels and child loggers
- `ConsoleOutput` / `FileOutput` - Multiple output destinations
- `MetricsCollector` - Counter, Gauge, Histogram metrics
- Prometheus export format support
- `Span` / `Tracer` - Distributed tracing
- `CorrelationContext` - HTTP header propagation
- `ObservabilityProvider` - Unified observability access

### Statistics
- **Total Tests**: 1257 (174 new in Phase 4)
- **Test Suites**: 51
- **New Modules**: 4 (monitoring, release-manager, incident-manager, observability)

---

## [3.2.0] - 2025-06-14

### Added - Phase 3 Multi-Skill Orchestration Complete 🎉

**MUSUBI v3.2.0 completes Phase 3 of the project roadmap.**

#### Phase 3 Deliverables (4 Sprints)

| Sprint | Description | Status |
|--------|-------------|--------|
| Sprint 3.1 | Orchestration Core | ✅ Complete |
| Sprint 3.2 | Advanced Patterns | ✅ Complete |
| Sprint 3.3 | Parallel Execution | ✅ Complete |
| Sprint 3.4 | Workflow Orchestrator | ✅ Complete |

#### New Features

**Orchestration Engine** (`src/orchestration/engine.js`):
- Multi-skill execution engine
- Context management across skills
- Result aggregation and error handling

**Patterns**:
- `AutoPattern` - Autonomous skill selection
- `SequentialPattern` - Ordered skill execution
- `NestedPattern` - Hierarchical orchestration
- `GroupChatPattern` - Multi-agent discussion
- `HumanInLoopPattern` - Human approval gates
- `SwarmPattern` - P-label parallel execution

**Workflow Orchestrator** (`src/orchestration/workflow-orchestrator.js`):
- Complex multi-pattern workflows
- 6 step types: SKILL, CONDITION, LOOP, PARALLEL, HUMAN_GATE, NESTED
- 3 SDD templates: SIMPLE_FEATURE, FULL_SDD, CODE_REVIEW

---

## [3.1.0] - 2025-12-08

### Added - Phase 2 Change Management Complete 🎉

**MUSUBI v3.1.0 completes Phase 2 of the project roadmap.**

#### Phase 2 Deliverables (5 Sprints)

| Sprint | Description | Status |
|--------|-------------|--------|
| Sprint 2.1 | Delta Specification System | ✅ Complete |
| Sprint 2.2 | Impact Analyzer | ✅ Complete |
| Sprint 2.3 | Validation Gates | ✅ Complete |
| Sprint 2.4 | Bidirectional Traceability & CI | ✅ Complete |
| Sprint 2.5 | Documentation | ✅ Complete |

#### New Features

**Delta Specification System**:
- `DeltaSpecManager` - Manage change proposals with ADDED/MODIFIED/REMOVED/RENAMED markers
- `DeltaFormatValidator` - Validate delta specification format
- Change workflow: init → review → approve → apply → archive

**Impact Analyzer**:
- `ImpactAnalyzer` - Full dependency chain analysis
- Risk assessment (LOW/MEDIUM/HIGH/CRITICAL)
- Recommendations for affected components

**Validation Gates**:
- `TraceabilityValidator` - Configurable strictness levels (strict/standard/relaxed)
- `CoverageReporter` - Multiple output formats (markdown/json/html/text)
- Rule-based validation with severity levels (ERROR/WARNING/INFO)

**Bidirectional Traceability**:
- Forward traceability: Requirements → Design → Tasks → Code → Tests
- Backward traceability: Tests → Code → Tasks → Design → Requirements
- Orphaned item detection

**Interactive HTML Reports**:
- `TraceabilityMatrixReport` - Visual traceability matrix
- Light/dark theme support
- Interactive filtering and search
- Collapsible sections

**CI/CD Integration**:
- GitHub Action workflow for traceability checks
- `ci-check` command with exit codes
- `strict-validate` command for 100% coverage validation
- PR comments with coverage summary

#### New CLI Commands

| Command | Description |
|---------|-------------|
| `musubi-trace bidirectional` | Analyze forward/backward traceability |
| `musubi-trace html-report` | Generate interactive HTML report |
| `musubi-trace ci-check` | CI/CD integration with exit codes |
| `musubi-trace strict-validate` | 100% coverage validation mode |
| `musubi-change diff` | View before/after comparison |
| `musubi-change status` | Workflow summary |

#### New Documentation

- **Delta Specs Guide** - Format, workflow, and best practices
- **Brownfield Tutorial** - Step-by-step conversion guide
- **Change Management Guide** - Full lifecycle documentation
- **Traceability Examples** - Practical matrix examples

#### Test Coverage

- **798 tests** passing (up from 726)
- 27 new tests for TraceabilityMatrixReport
- 24 new tests for TraceabilityValidator
- 21 new tests for CoverageReporter
- 29 new tests for ImpactAnalyzer

---

## [3.0.1] - 2025-12-08

### Added - Phase 1 Core Framework Complete 🎉

**MUSUBI v3.0.1 completes Phase 1 of the project roadmap.**

#### Phase 1 Deliverables (5 Major)

| Deliverable | Description | Status |
|-------------|-------------|--------|
| 25 Claude Code Skills | Full skill implementations | ✅ 27 skills (108%) |
| Constitutional Governance | 9 Articles + Phase -1 Gates | ✅ Complete |
| Core Templates | Requirements, Design, Tasks | ✅ 15 templates |
| CLI Implementation | Full command set | ✅ 19 commands |
| Documentation Website | VitePress documentation | ✅ 13 pages |

#### Claude Code Skills (27 total)

**Core Skills**:
- `orchestrator` - Multi-skill coordination
- `steering` - Project memory management
- `constitution-enforcer` - Constitutional compliance

**Requirements & Development**:
- `requirements-analyst` - EARS requirements
- `system-architect` - C4 architecture design
- `software-developer` - Implementation
- `test-engineer` - Testing strategy
- `code-reviewer` - Code quality review

**Quality & Infrastructure**:
- `security-auditor` - Security analysis
- `performance-optimizer` - Performance tuning
- `traceability-auditor` - Traceability verification
- `devops-engineer` - CI/CD pipelines
- `release-coordinator` - Release management
- `site-reliability-engineer` - SRE practices
- `database-administrator` - Database management
- `cloud-architect` - Cloud infrastructure

**Design & Documentation**:
- `api-designer` - API design
- `database-schema-designer` - Schema design
- `ui-ux-designer` - UI/UX design
- `ai-ml-engineer` - AI/ML integration
- `technical-writer` - Documentation

**Management**:
- `project-manager` - Project coordination
- `change-impact-analyzer` - Change analysis

**Additional**:
- `general` - General-purpose skill
- `context-synthesis` - Context synthesis
- `browser-agent` - E2E testing
- `web-gui` - Dashboard

#### Documentation Website

- **Technology**: VitePress v1.6.4
- **Location**: `website/` directory
- **Deployment**: GitHub Pages via GitHub Actions

**Pages**:
- Getting Started Guide
- SDD Workflow (8 stages)
- Constitutional Governance (9 Articles)
- EARS Requirements Format
- Traceability Guide
- CLI Reference (19 commands)
- Skills Reference (25 skills)
- AI Agents Guide (7 platforms)
- Examples

#### Constitutional Governance

**Templates** (`steering/templates/constitutional/`):
- `compliance-checklist.md`
- `constitutional-amendment-proposal.md`
- `gate-verification.md`
- `violation-report.md`
- `waiver-request.md`

**Validator**: `src/validators/constitution-validator.js`

### Changed

- Moved documentation site from `docs/` to `website/` to avoid conflicts
- Updated VitePress configuration for ESM compatibility
- Enhanced skill registry with utility functions

### Fixed

- Fixed `musubi-validate.js` duplicate code issue
- Fixed ESM module loading in VitePress build

---

## [3.0.0] - 2025-12-07

### Added - P1 Feature Completion 🎉

**MUSUBI v3.0.0 completes all P1 roadmap features**, introducing Browser Automation Agent and Web GUI Dashboard.

#### New Features (2 Major)

| Feature | Description | Status |
|---------|-------------|--------|
| **REQ-P1-001** | Browser Automation Agent with Playwright | ✅ Complete |
| **REQ-P1-002** | Web GUI Dashboard with real-time updates | ✅ Complete |
| **REQ-P1-003** | VS Code Extension | ✅ Complete (v2.2.0) |
| **REQ-P1-004** | Spec Kit Compatibility | ✅ Complete (v2.2.0) |

#### Browser Automation Agent (REQ-P1-001)

- **New Agent**: `browser-agent` - Playwright-based E2E testing specialist
- **New CLI**: `musubi-browser` command for browser automation
- **Capabilities**:
  - E2E test scenario design and implementation
  - Cross-browser testing (Chromium, Firefox, WebKit)
  - Visual regression testing (screenshot comparison)
  - Web accessibility auditing
  - Performance measurement (Core Web Vitals)

```bash
# Run browser automation
npx musubi-browser navigate "https://example.com"
npx musubi-browser screenshot "/dashboard" --output dashboard.png
npx musubi-browser test login-flow.spec.js
```

#### Web GUI Dashboard (REQ-P1-002)

- **New CLI**: `musubi-gui` command with 4 subcommands
- **New Server**: Express + WebSocket real-time server
- **New Services**:
  - `ProjectScanner`: Comprehensive project structure analysis (547 lines)
  - `FileWatcher`: File system monitoring with debounce
  - `WorkflowService`: 8-stage SDD workflow management
  - `TraceabilityService`: Traceability matrix builder with gap detection

```bash
# Launch dashboard
npx musubi-gui start           # Start server at localhost:3000
npx musubi-gui dev             # Development mode with hot reload
npx musubi-gui matrix          # Display traceability matrix
npx musubi-gui start --port 4000  # Custom port
```

**REST API Endpoints**:
| Endpoint | Description |
|----------|-------------|
| `GET /api/project` | Project overview (files, stats) |
| `GET /api/specs` | Specifications list (EARS format) |
| `GET /api/traceability` | Traceability matrix |
| `GET /api/workflow` | Workflow state (8 stages) |
| `GET /api/steering` | Steering documents |
| `GET /api/health` | Health check |

**WebSocket Events**:
- `file:changed` - File modification notification
- `file:added` - New file notification
- `file:removed` - File deletion notification

#### New Skills (2 total, 27 Agents now)

- **browser-agent**: E2E testing with Playwright
- **web-gui**: Dashboard visualization skill

### Dependencies

- Added: `express` ^4.18.2 - Web server
- Added: `ws` ^8.14.2 - WebSocket support
- Added: `cors` ^2.8.5 - Cross-origin support
- Added: `gray-matter` ^4.0.3 - Frontmatter parsing
- Added: `chokidar` ^3.5.3 - File watching
- Added: `playwright` ^1.40.0 - Browser automation

### Tests

- **673 tests passing** (up from 483 in v2.2.0)
- 190 new tests for P1 features
  - `tests/gui/project-scanner.test.js` - 20 tests
  - `tests/gui/file-watcher.test.js` - 16 tests
  - `tests/gui/workflow-service.test.js` - 16 tests
  - `tests/gui/traceability-service.test.js` - 21 tests
  - `tests/gui/server.test.js` - 17 tests
  - `tests/agents/browser-agent.test.js` - 100+ tests

### Breaking Changes

- None - fully backward compatible

---

## [2.2.0] - 2025-12-07

### Added - OpenHands-Inspired Features 🤖

**MUSUBI v2.2.0 introduces 8 new modules** inspired by OpenHands autonomous agent framework, significantly enhancing agent reliability and automation capabilities.

#### New Modules (8 total)

| Module | Purpose | Tests |
|--------|---------|-------|
| **StuckDetector** | Detect agent stuck patterns (5 scenarios) | 74 |
| **SkillsLoader** | Keyword-triggered skill loading | 26 |
| **MemoryCondenser** | Compress conversation history | 24 |
| **CriticSystem** | Multi-critic validation system | 35 |
| **IssueResolver** | GitHub Issue auto-resolution | 35 |
| **SecurityAnalyzer** | Code security analysis | 35 |
| **AgentMemoryManager** | Persistent agent memory | 30 |
| **GitHubClient** | GitHub API integration | - |

#### New CLI Commands

```bash
# Stuck pattern detection
musubi-analyze --detect-stuck

# Constitutional compliance scoring
musubi-validate score
musubi-validate score --threshold 80 --format json

# Agent memory management
musubi-remember add "Important insight" --type decision --priority high
musubi-remember list --type insight
musubi-remember search "authentication"
musubi-remember condense
musubi-remember clear --force

# GitHub Issue resolution
musubi-resolve 42
musubi-resolve --url https://github.com/owner/repo/issues/42
musubi-resolve 42 --dry-run
musubi-resolve list
```

#### New GitHub Actions Workflows

- **musubi-issue-resolver.yml**: Automated Issue resolution with PR creation
- **musubi-security-check.yml**: Security analysis on PRs
- **musubi-validate.yml**: Constitutional validation with scoring

#### New Skills (2 total, 27 total now)

- **agent-assistant**: StuckDetector, MemoryCondenser, AgentMemoryManager integration
- **issue-resolver**: IssueResolver, GitHub API integration

#### Updated Skills (4)

- **security-auditor**: SecurityAnalyzer integration
- **orchestrator**: All 8 modules overview
- **bug-hunter**: StuckDetector, IssueResolver, SecurityAnalyzer
- **quality-assurance**: CriticSystem, MemoryCondenser, AgentMemoryManager

#### Platform Updates

All 6 agent platform configurations updated with OpenHands modules section:
- GitHub Copilot (`AGENTS.md`)
- Cursor (`AGENTS.md`)
- Windsurf (`AGENTS.md`)
- Gemini CLI (`GEMINI.md`)
- Codex (`AGENTS.md`)
- Qwen Code (`QWEN.md`)

### Dependencies

- Added: `@octokit/rest` for GitHub API integration

### Tests

- **483 tests passing** (up from 224 in v2.1.1)
- 259 new tests for OpenHands modules

---

## [2.1.1] - 2025-12-05

### Added - Workflow Engine Integration to All Key Agents

- **8 Agents now support `musubi-workflow`**:
  - **Orchestrator**: Full workflow management, initialization, metrics
  - **Project Manager**: Progress tracking, metrics analysis
  - **Requirements Analyst**: Stage 1 (Requirements) with completion checklist
  - **System Architect**: Stage 2 (Design) with C4/ADR checklist
  - **Software Developer**: Stage 4 (Implementation) with code checklist
  - **Code Reviewer**: Stage 5 (Review) with quality checklist
  - **Test Engineer**: Stage 6 (Testing) with coverage checklist
  - **Release Coordinator**: Stage 7 (Deployment) with release checklist

- **Each agent includes**:
  - Workflow stage responsibility documentation
  - Stage transition commands (`musubi-workflow next <stage>`)
  - Completion checklists for stage validation
  - Feedback loop examples for iterative development

---

## [2.1.0] - 2025-12-05

### Added - Workflow Engine & Enhanced SDD Stages 🔄

**MUSUBI v2.1.0 introduces a comprehensive Workflow Engine** for managing SDD stages, tracking metrics, and enabling continuous improvement.

#### New CLI: `musubi-workflow`

```bash
# Initialize workflow for a feature
musubi-workflow init <feature-name>

# Check current status
musubi-workflow status

# Transition to next stage
musubi-workflow next design

# Record feedback loop
musubi-workflow feedback review implementation -r "Refactoring needed"

# Complete workflow with summary
musubi-workflow complete

# View history and metrics
musubi-workflow history
musubi-workflow metrics
```

#### New SDD Stages

- **Stage 0: Spike/PoC** - Research and prototyping before requirements
- **Stage 5.5: Code Review** - Structured review between implementation and testing
- **Stage 9: Retrospective** - Continuous improvement after monitoring

#### Workflow Features

- **State Management** - Track current stage per feature in `storage/workflow-state.yml`
- **Metrics Collection** - Time per stage, iteration counts, feedback loops
- **Valid Transitions** - Enforced stage transitions with feedback loop support
- **Stage Validation Guide** - Checklists for each stage transition

#### New Files

- `src/managers/workflow.js` - Workflow engine core
- `bin/musubi-workflow.js` - CLI for workflow management
- `steering/rules/stage-validation.md` - Stage validation checklists
- `tests/managers/workflow.test.js` - 13 tests for workflow engine

#### Updated Files

- `steering/rules/workflow.md` - Added Spike, Review, Retrospective stages
- `steering/memories/lessons_learned.md` - Added retrospective template
- `package.json` - Added `musubi-workflow` binary

---

## [2.0.6] - 2025-12-04

### Fixed - CodeGraph MCP Install Always Updates to Latest

- **Changed `pipx install` to `pipx install --force`**
  - Ensures latest version is always installed, even if already installed
  - Fixes issue where existing installation would skip update
  - All documentation updated with `--force` flag

- **Updated files**:
  - `README.md` and `README.ja.md`
  - `docs/Qiita/MUSUBI-CodeGraph-MCP-Integration.md`
  - `src/templates/agents/claude-code/skills/orchestrator/SKILL.md`
  - `.claude/skills/orchestrator/SKILL.md`
  - `CHANGELOG.md`

---

## [2.0.5] - 2025-12-04

### Changed - CodeGraph MCP Installation Method

- **Switch to pipx installation** (recommended over venv + pip)
  - Simpler installation: `pipx install --force codegraph-mcp-server`
  - No need for virtual environment management
  - Commands available globally without path prefix

- **VS Code MCP configuration updated**
  - Changed from `settings.json` to `.vscode/mcp.json` format
  - Updated JSON structure with `servers` and `type: "stdio"`

- **Simplified command paths**
  - Removed `~/codegraph-venv/bin/` prefix from all commands
  - Direct `codegraph-mcp` command usage

- **Updated documentation**:
  - `src/templates/agents/claude-code/skills/orchestrator/SKILL.md`
  - `.claude/skills/orchestrator/SKILL.md`
  - `README.md` and `README.ja.md`
  - `docs/Qiita/MUSUBI-CodeGraph-MCP-Integration.md`

---

## [2.0.1] - 2025-12-03

### Fixed - Orchestrator CodeGraph MCP Auto-Setup

- **Orchestrator Auto-Execution Flow**: Changed from "guide" to "auto-execute" instructions
  - Step 1: Environment check (`which python3`, `which codegraph-mcp`)
  - Step 2: Auto-install with user confirmation (venv + pip install)
  - Step 3: Project indexing (`codegraph-mcp index --full`)
  - Step 4: Config file creation based on user's environment

- **Dialog Flow Added**: Interactive setup with clear progress indicators
  - Environment detection and status display
  - User confirmation before installation
  - Platform selection (Claude Code / VS Code / Claude Desktop)

- **Both SKILL.md Files Updated**:
  - `src/templates/agents/claude-code/skills/orchestrator/SKILL.md`
  - `.claude/skills/orchestrator/SKILL.md`

---

## [2.0.0] - 2025-12-03

### Added - MCP Server Integration 🚀

**MUSUBI v2.0.0 introduces CodeGraphMCPServer integration**, enabling advanced code analysis capabilities through the Model Context Protocol (MCP).

- **CodeGraphMCPServer Integration** - 14 MCP tools for enhanced code analysis
  - **Code Graph Tools**: `init_graph`, `get_code_snippet`, `find_callers`, `find_dependencies`
  - **Search Tools**: `local_search`, `global_search`, `query_codebase`
  - **Analysis Tools**: `analyze_module_structure`, `suggest_refactoring`
  - **Navigation Tools**: `jump_to_definition`, `find_implementations`
  - **Resources**: `file://`, `graph://`, `analysis://`, `search://`

- **GraphRAG-Powered Search** - Semantic code understanding
  - Louvain community detection for code structure analysis
  - 12 language support (Python, TypeScript, JavaScript, Java, Go, Rust, C++, etc.)
  - Intelligent code snippet retrieval with context

- **11 Key Agents Enhanced with MCP Tools**:
  - `@change-impact-analyzer` - `find_dependencies`, `find_callers`, `query_codebase`
  - `@code-reviewer` - `suggest_refactoring`, `get_code_snippet`, `analyze_module_structure`
  - `@constitution-enforcer` - `find_dependencies`, `analyze_module_structure`
  - `@orchestrator` - `query_codebase`, `global_search`
  - `@system-architect` - `global_search`, `analyze_module_structure`, `find_dependencies`
  - `@test-engineer` - `find_callers`, `find_dependencies`, `get_code_snippet`
  - `@traceability-auditor` - `query_codebase`, `find_callers`, `find_dependencies`
  - `@bug-hunter` - `find_callers`, `local_search`, `get_code_snippet`
  - `@software-developer` - `get_code_snippet`, `local_search`, `find_dependencies`
  - `@steering` - `query_codebase`, `analyze_module_structure`
  - `@security-auditor` - `find_callers`, `query_codebase`, `find_dependencies`

- **Orchestrator CodeGraph MCP Setup Guide**:
  - 4 installation options (Python venv, Claude Code, VS Code, Claude Desktop)
  - Project indexing commands (`codegraph-mcp index --full`)
  - 12 MCP tools documentation with agent mapping
  - Impact analysis and refactoring workflow examples

- **Steering Documentation Updates**:
  - `steering/tech.md` - Added MCP Server Integration section with tool mapping
  - `steering/structure.md` - Added MCP configuration and agent mapping
  - `src/templates/agents/shared/AGENTS.md` - Added MCP tools references to agents

### Changed

- **Major Version Bump**: 1.1.2 → 2.0.0
  - Breaking: Agents now reference MCP tools (optional enhancement, backward compatible)
  - New capability: MCP server integration for advanced code analysis

### Setup

```bash
# Claude Code
claude mcp add codegraph -- codegraph-mcp serve --repo .

# VS Code (settings.json)
{
  "mcp.servers": {
    "codegraph": {
      "command": "codegraph-mcp",
      "args": ["serve", "--repo", "${workspaceFolder}"]
    }
  }
}
```

### MCP Tool × Agent Mapping

| Agent | Primary MCP Tools | Use Case |
|-------|-------------------|----------|
| @change-impact-analyzer | `find_dependencies`, `find_callers` | Impact analysis |
| @traceability-auditor | `query_codebase`, `find_callers` | Traceability validation |
| @system-architect | `analyze_module_structure`, `global_search` | Architecture analysis |
| @code-reviewer | `suggest_refactoring`, `get_code_snippet` | Code quality review |
| @security-auditor | `find_callers`, `query_codebase` | Security vulnerability detection |

---

## [1.0.0] - 2025-11-23

### Added - Production Release 🎉

**MUSUBI v1.0.0 is now production-ready!** This release marks the completion of comprehensive testing and validation, achieving 100% specification-level traceability.

- **Production-Ready CLI Commands** (12 commands fully operational):
  - `musubi-init` - Multi-platform initialization (7 AI platforms)
  - `musubi-requirements` - EARS requirements generation with flexible ID patterns
  - `musubi-design` - C4 + ADR design document generation
  - `musubi-tasks` - Task breakdown with dependency tracking
  - `musubi-trace` - Complete traceability system with 4 analysis modes
  - `musubi-change` - Change management for brownfield projects
  - `musubi-gaps` - Gap detection and coverage validation
  - `musubi-validate` - Constitutional compliance validation
  - `musubi-onboard` - Automated project analysis (2-5 minutes)
  - `musubi-sync` - Auto-sync steering documents
  - `musubi-analyze` - Code quality analysis
  - `musubi-share` - Team collaboration and memory sharing

- **Verified Traceability Features**:
  - ✅ Requirements → Design → Tasks (100% coverage)
  - ✅ Bidirectional analysis (0 orphaned items)
  - ✅ Impact analysis with effort estimation
  - ✅ Comprehensive statistics and health metrics
  - ✅ Flexible requirement ID patterns (REQ-TODO-F-001 support)

- **Real-World Testing**:
  - ✅ Todo Web App project (10 requirements, 7 designs, 8 tasks)
  - ✅ Complete specification workflow validated
  - ✅ Zero orphaned items in traceability graph
  - ✅ All 213 tests passing

### Changed (v1.0.0)

- **Version Numbering**: Major version bump (0.9.7 → 1.0.0)
  - Signals production readiness and API stability
  - Semantic versioning commitment for future releases

- **Documentation Updates**:
  - README reflects production status
  - All CLI commands documented with examples
  - Installation instructions finalized
  - Multi-platform support confirmed (7 AI platforms)

### Status (v1.0.0)

**Project Maturity**:

- ✅ Core Framework: Complete
- ✅ CLI Infrastructure: 12 commands operational
- ✅ Traceability System: 100% functional
- ✅ Multi-Platform Support: 7 platforms verified
- ✅ Testing: 213/213 tests passing
- ✅ Documentation: Comprehensive guides available

**Production Readiness Checklist**:

- [x] All core CLI commands functional
- [x] Traceability system validated
- [x] Flexible requirement ID detection
- [x] Real-world project testing complete
- [x] Multi-platform support verified
- [x] Documentation comprehensive
- [x] npm package published and tested
- [x] Zero critical bugs

**Next Steps** (Post-1.0.0):

- Community adoption and feedback collection
- Additional example projects
- Video tutorials and guides
- Enterprise feature development (Phase 2+)

---

## [0.9.7] - 2025-11-23

### Fixed

- **Requirement ID Pattern**: Enhanced traceability analyzer to support flexible requirement ID formats
  - Now supports: `REQ-ABC-001` (original), `REQ-ABC-F-001` (with category), `REQ-ABCF-001` (category without hyphen)
  - Regex pattern updated: `/### (REQ-[A-Z0-9]+-(?:[A-Z]+-)?(?:[A-Z0-9]+-)?\d{3}): (.+)/g`
  - Fixes issue where `REQ-TODO-F-001` and `REQ-TODO-NF-001` were not detected
  - Tested with Todo web app project (10 requirements detected correctly)

## [0.9.6] - 2025-11-23

### Fixed (v0.9.6)

- **Bidirectional Traceability**: Fixed `musubi-trace bidirectional` command
  - Changed method call from `generateBidirectionalTrace()` to `analyzeBidirectional()`
  - Updated output formatting to match actual method return structure (`completeness` and `orphaned`)
  - Fixed forward/backward traceability percentage reporting
  - Added detailed orphaned items breakdown (requirements, design, tasks, code, tests)

## [0.9.5] - 2025-11-23

### Improved - Orchestrator Enhancement

- **Enhanced Orchestrator Skill**: Updated to support all 25 specialized agents
  - Added CLI Commands Reference section with all MUSUBI commands
  - Updated agent count from 18 to 25 (added 7 new agents)
  - New agents: Orchestrator, Steering, Constitution Enforcer, Site Reliability Engineer, Release Coordinator, Change Impact Analyzer, Traceability Auditor
  - Comprehensive CLI integration guide for all commands
  - Enhanced Agent Selection Matrix with CLI command mappings
  - Updated welcome messages (English and Japanese) to reflect 25 agents

- **CLI Commands Integration**
  - `musubi-requirements` - EARS requirements management
  - `musubi-design` - C4 + ADR design documents
  - `musubi-tasks` - Task breakdown management
  - `musubi-trace` - Traceability analysis (including v0.9.4 enhancements)
  - `musubi-change` - Change management for brownfield projects
  - `musubi-gaps` - Gap detection & coverage validation
  - `musubi-validate` - Constitutional validation
  - `musubi-init` - Project initialization
  - `musubi-share` - Memory sharing across projects
  - `musubi-sync` - Steering files synchronization
  - `musubi-analyze` - Project analysis
  - `musubi-onboard` - AI platform onboarding

- **Documentation Updates**
  - All 25 agents now properly categorized (Orchestration, Design, Development, Operations, Specialists)
  - CLI command mapping for each agent where applicable
  - Enhanced workflow examples with CLI integration
  - Better agent selection logic with command references

### Example Usage (v0.9.5)

```bash
# Orchestrator can now guide users through all MUSUBI commands
# Example: Full project initialization
musubi init --claude-code
musubi-requirements init authentication
musubi-design init authentication
musubi-tasks init authentication
musubi-trace matrix
musubi-validate all
```

---

## [0.9.4] - 2025-11-23

### Added - Enhanced Traceability Analysis

- **Bidirectional Traceability**: New `musubi-trace bidirectional` command
  - Forward traceability: Requirements → Design → Tasks → Code → Tests
  - Backward traceability: Tests → Code → Tasks → Design → Requirements
  - Orphaned item detection across all document types
  - Completeness percentage calculation for both directions
  - JSON export support

- **Impact Analysis**: New `musubi-trace impact <requirementId>` command
  - Identifies all impacted design, tasks, code, and test files
  - Calculates estimated effort (hours) for requirement changes
  - Impact severity classification (Low/Medium/High)
  - JSON export for project management tools

- **Comprehensive Statistics**: New `musubi-trace statistics` command
  - Document counts across all artifact types
  - Coverage statistics with percentages
  - Task completion tracking
  - Project health grade (A-F) and status (Excellent/Good/Fair/Poor/Critical)
  - JSON export for dashboards

### Improved (v0.9.4)

- Enhanced TraceabilityAnalyzer with advanced analysis methods
- Better gap detection with severity classification
- More accurate effort estimation for impact analysis
- Health scoring based on overall traceability coverage

### Example Usage (v0.9.4)

```bash
# Bidirectional analysis
musubi-trace bidirectional

# Analyze impact of requirement change
musubi-trace impact REQ-FUNC-001

# Generate project statistics
musubi-trace statistics

# Export statistics as JSON
musubi-trace statistics --format json -o stats.json
```

---

## [0.9.3] - 2025-11-23

### Added - Enhanced EARS Validation

- **Stricter EARS Validation**: Enhanced requirements validation with comprehensive quality checks
  - Detects ambiguous words (should, could, might, may, will, can, must)
  - Identifies vague terms (etc, as needed, appropriate, suitable, adequate, reasonable)
  - Validates statement length (flags too short <5 words or too long >50 words)
  - Pattern-specific validation for event, state, unwanted, optional, and ubiquitous requirements
  - Detailed warnings for incomplete descriptions in each EARS pattern

- **Quality Metrics Command**: New `musubi-requirements metrics` command
  - Calculate overall quality score (0-100%) with letter grades (A-F)
  - Pattern distribution analysis (ubiquitous, event, state, unwanted, optional)
  - Average words per requirement
  - Count of ambiguous words and vague terms
  - Identify too short or too long requirements
  - Actionable recommendations for improvement
  - JSON output support for automation

### Improved (v0.9.3)

- Enhanced `validateEARSFormat()` with context-aware validation
- Better error messages with specific improvement suggestions
- Pattern-specific validation now checks description quality
- ESLint compliance with proper case block scoping

### Example Usage (v0.9.3)

```bash
# Validate with detailed warnings
musubi-requirements validate --verbose

# Calculate quality metrics
musubi-requirements metrics

# Get metrics as JSON
musubi-requirements metrics --json
```

---

## [0.9.2] - 2025-11-23

### Added - Enhanced CLI Options

- **Dry Run Support**: Added `--dry-run` option to all init commands
  - `musubi-requirements init <feature> --dry-run`: Preview without creating files
  - `musubi-design init <feature> --dry-run`: Preview design document creation
  - `musubi-tasks init <feature> --dry-run`: Preview task breakdown creation
- **Verbose Mode**: Added `--verbose` option for detailed output
  - Shows all options and configuration values
  - Displays detailed error stack traces
  - Helpful for debugging and CI/CD integration
- **JSON Output**: Added `--json` option for machine-readable output
  - Structured JSON output for automation
  - Error messages in JSON format
  - Easy integration with external tools

### Improved (v0.9.2)

- Enhanced error handling with verbose stack traces
- Better user feedback with conditional output based on flags
- Improved automation support with structured JSON output

---

## [0.9.1] - 2025-11-23

### Changed - CLI Command Enhancement

- **Version Synchronization**: Synchronized all CLI command versions to 0.9.1
  - `musubi-requirements`: 0.8.0 → 0.9.1
  - `musubi-design`: 0.8.2 → 0.9.1
  - `musubi-tasks`: 0.8.4 → 0.9.1
- **Constitutional Compliance**: All CLI commands now reference Constitutional Articles
  - Requirements CLI enforces Article IV: EARS Format Imperative
  - Design CLI enforces Article V: C4 Model Imperative
  - Tasks CLI enforces Article VI: Task Breakdown Imperative

### Fixed (v0.9.1)

- Resolved version drift across CLI commands
- Improved consistency in command structure

---

## [0.9.0] - 2025-11-23

### Added - Constitutional Governance System (Phase 1 P0)

- **Phase -1 Gates Process**: Added `steering/rules/phase-gates.md` with approval process
  - Gate #001: Simplicity Gate approval for References directory
  - Gate #002: Anti-Abstraction approval for CLI wrappers
  - Documented approval template and workflow
- **Test Coverage Enforcement**: Added Jest configuration with 80% coverage thresholds
  - Enforces Article III: Test-First Imperative
  - Global thresholds: 80% branches, functions, lines, statements
- **Constitutional Validation**: Enhanced `musubi-validate` CLI (already implemented in v0.7.0)
  - Validates all 9 Constitutional Articles
  - Phase -1 Gates validation
  - Complexity limits enforcement
    - Multiple output formats (console, JSON, Markdown)

### Status (v0.9.0)

- **Phase 1 Core Framework**: Constitutional Governance System complete
- **Phase 2 Change Management**: 100% complete (v0.8.5-v0.8.8)
- **Next Priority**: Verify existing CLI commands (requirements, design, tasks)

---

## [0.8.8] - 2025-11-23

### Added (v0.8.8)

- **Phase 2 Documentation** - Comprehensive guides for change management
  - Brownfield project tutorial (step-by-step workflow)
  - Delta specification format guide
  - Change management workflow guide
  - Traceability matrix guide
  - Video tutorial planning document
  - Integration examples (gaps + trace + change)
  - Best practices for brownfield projects
  - Troubleshooting guides

### Documentation (v0.8.8)

- `docs/guides/brownfield-tutorial.md` - Complete brownfield workflow
- `docs/guides/delta-spec-guide.md` - Delta specification reference
- `docs/guides/change-management-workflow.md` - Change workflow guide
- `docs/guides/traceability-matrix-guide.md` - Traceability guide
- `docs/guides/video-tutorial-plan.md` - Video content planning

### Phase 2 Completion (v0.8.8)

- All 5 Phase 2 deliverables complete (100%)
- Delta Specification System (v0.8.6) ✅
- Change Workflow Commands (v0.8.6) ✅
- Validation Gates (v0.8.7) ✅
- Traceability System (v0.8.5) ✅
- Documentation (v0.8.8) ✅
- Ready for Phase 3 (Multi-Skill Orchestration)

## [0.8.7] - 2025-11-23

### Added (v0.8.7)

- **Gap Detection System** - Identify orphaned requirements and untested code
  - `musubi-gaps detect` - Detect all gaps (requirements, code, tests)
    - Orphaned requirements (no design/task references)
    - Unimplemented requirements (no code implementation)
    - Untested code (no test files)
    - Missing tests (requirements without test coverage)
  - `musubi-gaps requirements` - Detect orphaned requirements only
  - `musubi-gaps code` - Detect untested code only
  - `musubi-gaps coverage` - Calculate coverage statistics
    - Requirements coverage (design/tasks/code/tests)
    - Code coverage (tested vs untested)
    - Minimum coverage threshold validation
  - Gap detection workflow:
    - Extract requirements from docs/requirements
    - Extract references from design/tasks/code/tests
    - Identify missing traceability links
    - Report gaps with detailed reasoning
  - Output formats:
    - Table (console, color-coded)
    - JSON (machine-readable)
    - Markdown (exportable reports)
  - Coverage statistics:
    - Requirements: design/task/implementation/test coverage %
    - Code: test coverage %
    - Average coverage calculation
    - Configurable minimum threshold (--min-coverage)

### Technical Details (v0.8.7)

- **GapDetector**: Core gap detection engine (src/analyzers/gap-detector.js)
  - `detectAllGaps()` - Detect all gap types
  - `detectOrphanedRequirements()` - Find requirements without design/tasks
  - `detectUnimplementedRequirements()` - Find requirements without code
  - `detectUntestedCode()` - Find source files without tests
  - `detectMissingTests()` - Find requirements without test coverage
  - `calculateCoverage()` - Calculate comprehensive coverage statistics
  - `extractRequirements()` - Parse REQ-XXX-NNN from markdown
  - `extractDesignReferences()` - Extract requirement IDs from design docs
  - `extractTaskReferences()` - Extract requirement IDs from task docs
  - `extractCodeReferences()` - Extract requirement IDs from source code
  - `extractTestReferences()` - Extract requirement IDs from test files
  - `formatMarkdown()` - Export reports as markdown
  - Multi-format output (table/json/markdown)
- 14 new tests (213 total passing)
  - Extract requirements (2 tests)
  - Detect orphaned requirements (3 tests)
  - Detect untested code (3 tests)
  - Calculate coverage (2 tests)
  - Detect all gaps (2 tests)
  - Format markdown (2 tests)
- Phase 2 progress: 40% complete (Validation Gates operational)

## [0.8.6] - 2025-11-23

### Added (v0.8.6)

- **Delta Specification System** - Change management for brownfield projects
  - `musubi-change init <change-id>` - Create change proposal with delta specification
    - ADDED/MODIFIED/REMOVED/RENAMED requirement tracking
    - Structured change template with impact analysis
    - Traceability mapping (Requirements → Design → Code → Tests)
  - `musubi-change apply <change-id>` - Apply change to codebase
    - Dry-run mode for preview
    - Validation before applying
    - Statistics reporting (added/modified/removed/renamed counts)
  - `musubi-change archive <change-id>` - Archive completed change
    - Merge delta to canonical specs
    - Move from storage/changes/ to specs/
  - `musubi-change list` - List all change proposals
    - Filter by status (pending/applied/archived)
    - Table or JSON output formats
  - `musubi-change validate <change-id>` - Validate delta format
    - REQ-XXX-NNN pattern validation
    - Detailed error reporting
    - Verbose mode for statistics
  - Change management workflow:
    - Create proposal → Validate → Apply → Archive
    - Impact analysis section (affected components, breaking changes, migration steps)
    - Testing checklist (unit/integration/E2E coverage)
    - Approval gates (technical/product/security review)
  - Delta specification format:
    - ADDED: New requirements/design/code
    - MODIFIED: Changed requirements with before/after
    - REMOVED: Deleted requirements with rationale
    - RENAMED: Renamed requirements with mapping

### Technical Details (v0.8.6)

- **ChangeManager**: Core change management engine (src/managers/change.js)
  - `initChange(changeId, options)` - Create change proposal from template
  - `applyChange(changeId, options)` - Apply delta to codebase
  - `archiveChange(changeId, options)` - Archive to specs/
  - `listChanges(options)` - List all changes with filtering
  - `validateChange(changeId, options)` - Validate delta format
  - `parseDelta(file)` - Parse ADDED/MODIFIED/REMOVED/RENAMED sections
  - `validateDelta(delta)` - Validate REQ-XXX-NNN patterns
  - `mergeDeltaToSpecs(delta, specsDir)` - Merge changes to canonical specs
- 14 new tests (199 total passing)
  - Change initialization (create, duplicate detection, directory creation)
  - Apply operations (dry-run, validation, statistics)
  - Archive operations (move to specs, merge delta)
  - List operations (all changes, filtering, sorting)
  - Validation (valid delta, invalid IDs, statistics)
  - Delta parsing (ADDED/MODIFIED/REMOVED/RENAMED sections)
  - Template rendering
- Phase 2 progress: 20% complete (Delta Specification System operational)

## [0.8.5] - 2025-11-23

### Added (v0.8.5)

- **Traceability System** - End-to-end requirement traceability from requirements to tests
  - `musubi-trace matrix` - Generate full traceability matrix
    - Multiple output formats: table (console), markdown (docs), JSON (machine), HTML (web)
    - Shows Requirements → Design → Tasks → Code → Tests chain
    - Visual coverage indicators (✓/✗) for each stage
  - `musubi-trace coverage` - Calculate coverage statistics
    - Design coverage percentage (requirements → design)
    - Tasks coverage percentage (requirements → tasks)
    - Code coverage percentage (requirements → code)
    - Tests coverage percentage (requirements → tests)
    - Overall coverage score (average of all stages)
    - Progress bar visualization with color coding
  - `musubi-trace gaps` - Detect traceability gaps
    - Orphaned requirements (no design or tasks)
    - Orphaned design (no requirement references)
    - Orphaned tasks (no requirement references)
    - Untested code (no test coverage)
    - Missing tests (requirements without tests)
    - Color-coded output (red=critical, yellow=warning, green=pass)
  - `musubi-trace requirement <id>` - Trace specific requirement
    - Shows complete chain: REQ → Design → Tasks → Code → Tests
    - Identifies gaps in specific requirement coverage
  - `musubi-trace validate` - Validate 100% traceability (Article V)
    - Enforces Constitutional requirement for complete traceability
    - Exit code 0 for pass, 1 for fail (CI/CD integration)
    - Configurable minimum coverage threshold
  - Traceability features:
    - REQ-XXX-NNN pattern matching in all artifacts
    - Requirement extraction from docs/requirements/*.md
    - Design reference extraction (C4 diagrams, ADRs)
    - Task reference extraction from docs/tasks/*.md
    - Code reference extraction from src/**/*.{js,ts,py,java,go,rs}
    - Test reference extraction from tests/**/*.{test,spec}.{js,ts,py,java,go,rs}
    - Dependency graph building (Requirements → Tests)
    - Coverage calculation per stage
    - Multi-format matrix output

### Technical Details (v0.8.5)

- **TraceabilityAnalyzer**: Core analysis engine (src/analyzers/traceability.js)
  - `generateMatrix(options)` - Generate full traceability matrix
  - `calculateCoverage(options)` - Calculate coverage statistics
  - `detectGaps(options)` - Detect orphaned artifacts and untested code
  - `traceRequirement(id, options)` - Trace specific requirement through all stages
  - `validate(options)` - Validate 100% coverage (Article V compliance)
  - `formatMatrix(matrix, format)` - Format matrix (table|markdown|json|html)
  - `findRequirements(path)` - Parse REQ-XXX-NNN from requirements files
  - `findDesign(path)` - Parse design documents (C4, ADRs)
  - `findTasks(path)` - Parse task breakdown files
  - `findCode(path)` - Parse source code for REQ references
  - `findTests(path)` - Parse test files for REQ references
  - `linksToRequirement(doc, reqId)` - Check if document references requirement
  - `testCoversCode(test, code)` - Check if test covers code
  - `calculateMatrixSummary(matrix)` - Calculate coverage statistics
- 26 new tests (185 total passing)
  - Matrix generation (basic, full coverage, empty workspace)
  - Coverage calculation (100%, partial, 0%)
  - Gap detection (5 gap types)
  - Requirement tracing (full chain, missing stages, non-existent)
  - Validation (pass/fail scenarios)
  - Format conversion (table, markdown, json, html)
  - File parsing (requirements, design, tasks, code, tests)
- Article V compliance: Enforces 100% traceability coverage

## [0.8.4] - 2025-11-22

### Added (v0.8.4)

- **Task Breakdown System** - Break design into actionable implementation tasks
  - `musubi-tasks init <feature>` - Initialize task breakdown document
  - `musubi-tasks add <title>` - Add task with interactive prompts
  - `musubi-tasks list` - List all tasks with filtering
  - `musubi-tasks update <id> <status>` - Update task status
  - `musubi-tasks validate` - Validate task completeness
  - `musubi-tasks graph` - Generate dependency graph
  - P0-P3 priority system for sprint planning:
    - P0: Critical - Launch blockers
    - P1: High - Core features
    - P2: Medium - Nice-to-haves
    - P3: Low - Future enhancements
  - Task attributes:
    - Auto-numbered: TASK-001, TASK-002, TASK-003, etc.
    - Story points (Fibonacci): 1/2/3/5/8/13
    - Estimated hours
    - Assignee, Status (Not Started/In Progress/Blocked/Testing/Complete)
    - Requirements coverage (REQ-XXX-NNN links)
    - Dependencies (TASK-XXX references)
    - Acceptance criteria (testable checkboxes)
  - Test-First checklist integration (Article III):
    - Red: Tests written BEFORE implementation
    - Green: Minimal implementation passes test
    - Blue: Refactored with confidence
  - Dependency management:
    - Dependency graph generation (Mermaid/DOT format)
    - Parallel execution planning
    - Critical path detection
    - Circular dependency detection
  - Design-to-task traceability:
    - Maps design references to tasks
    - Shows requirements coverage per task
  - Sprint planning support:
    - Story point totals by priority
    - Estimated hours by priority
    - Parallel execution groups

### Technical Details (v0.8.4)

- **TasksGenerator**: Core engine (src/generators/tasks.js)
  - `init(feature, options)` - Initialize task document
  - `addTask(filePath, task)` - Add task with auto-numbering
  - `list(options)` - List tasks with filtering
  - `updateStatus(taskId, status)` - Update task status
  - `validate(filePath)` - Validate task completeness
  - `generateGraph(options)` - Generate dependency graph
  - `generateMermaidGraph(tasks, dependencies)` - Mermaid format
  - `generateDotGraph(tasks, dependencies)` - DOT format
  - `calculateParallelGroups(tasks, dependencies)` - Parallel execution
- **Tests**: 19 new tests (159 total passing)
- **Article III Compliance**: Test-First checklist in every task template

## [0.8.2] - 2025-11-23

### Added (v0.8.2)

- **Design Document Generator** - Create C4 models and Architecture Decision Records
  - `musubi-design init <feature>` - Initialize design document from template
  - `musubi-design add-c4 <level>` - Add C4 diagram (context|container|component|code)
  - `musubi-design add-adr <decision>` - Add Architecture Decision Record
  - `musubi-design validate` - Validate design document completeness
  - `musubi-design trace` - Show requirement-to-design traceability matrix
  - C4 Model support with 4 levels:
    - Level 1 Context: System in its environment with external dependencies
    - Level 2 Container: High-level technology choices and deployable units
    - Level 3 Component: Components within containers
    - Level 4 Code: Class/component implementation details
  - Diagram formats:
    - Mermaid (default): Modern, GitHub-compatible, renders in markdown
    - PlantUML: Traditional UML diagrams with C4-PlantUML library
  - ADR (Architecture Decision Record) generation:
    - Auto-numbered: ADR-001, ADR-002, ADR-003, etc.
    - Status tracking: proposed, accepted, rejected, deprecated
    - Structured format: Context, Decision, Consequences, Alternatives
  - Design validation rules:
    - Required sections: Architecture Design, Steering Context
    - Required content: At least one C4 diagram
  - Traceability matrix: Maps REQ-XXX-NNN requirements to design documents

### Technical Details (v0.8.2)

- **DesignGenerator**: Core generator engine (`src/generators/design.js`)
- **C4 Templates**: 4 levels × 2 formats = 8 diagram templates
- **Article V Compliance**: Requirement-to-design traceability
- **Interactive Prompts**: Inquirer-based UI for diagram and ADR creation
- **Template Processing**: Variables replaced: {{FEATURE_NAME}}, {{PROJECT_NAME}}, {{DATE}}, {{AUTHOR}}, {{SYSTEM}}

## [0.8.0] - 2025-11-23

### Added (v0.8.0)

- **EARS Requirements Generator** - Create unambiguous specifications following Article IV
  - `musubi-requirements init <feature>` - Initialize requirements document from template
  - `musubi-requirements add` - Add requirement with interactive EARS pattern selection
  - `musubi-requirements list` - List all requirements in project
  - `musubi-requirements validate` - Validate EARS format compliance
  - `musubi-requirements trace` - Show requirements traceability matrix
  - Support for all 5 EARS patterns:
    - Ubiquitous: `The [system] SHALL [requirement]`
    - Event-Driven: `WHEN [event], THEN [system] SHALL [response]`
    - State-Driven: `WHILE [state], [system] SHALL [response]`
    - Unwanted Behavior: `IF [error], THEN [system] SHALL [response]`
    - Optional Feature: `WHERE [feature], [system] SHALL [response]`
  - Auto-generate unique requirement IDs (REQ-XXX-001, REQ-XXX-002, etc.)
  - Interactive prompts for requirement creation
  - Multiple output formats: table (default), JSON, Markdown
  - Acceptance criteria templates
  - Traceability matrix initialization

### Technical Details (v0.8.0)

- **RequirementsGenerator**: Core generator engine (`src/generators/requirements.js`)
- **Article IV Compliance**: All generated requirements validated against EARS format
- **Template Processing**: Uses `src/templates/shared/documents/requirements.md`
- **Pattern Detection**: Automatic EARS pattern recognition in existing requirements
- **Validation Rules**:
  - SHALL keyword mandatory
  - Pattern-specific syntax validation (WHEN/THEN, WHILE, IF/THEN, WHERE)
  - Acceptance criteria presence check
- **Traceability**: Initialize Requirements → Design → Code → Tests mapping
- **25 new tests**: All EARS patterns, ID generation, validation, formatting

### Changed (v0.8.0)

- **package.json**: Version bumped to 0.8.0
- **bin/**: Added `musubi-requirements.js` CLI command
- **Phase 1 status**: EARS Requirements Generator operational (Priority 2/P0 complete)

## [0.7.0] - 2025-11-23

### Added (v0.7.0)

- **Constitutional Governance System** - Enforce 9 immutable articles governing all development
  - `musubi-validate constitution` - Validate all 9 Constitutional Articles
  - `musubi-validate article <1-9>` - Validate specific article
  - `musubi-validate gates` - Validate Phase -1 Gates (Simplicity, Anti-Abstraction)
  - `musubi-validate complexity` - Validate complexity limits (modules ≤1500 lines, functions ≤50 lines)
  - `musubi-validate all` - Run comprehensive validation (constitution + gates + complexity)
  - Output formats: console (default), JSON, Markdown
  - Verbose mode with detailed violation reports

### Technical Details (v0.7.0)

- **9 Constitutional Articles**:
  - Article I: Library-First Principle
  - Article II: CLI Interface Mandate
  - Article III: Test-First Imperative (Red-Green-Blue cycle)
  - Article IV: EARS Requirements Format
  - Article V: Traceability Mandate (Requirements ↔ Design ↔ Code ↔ Tests)
  - Article VI: Project Memory (Steering System)
  - Article VII: Simplicity Gate (≤3 sub-projects initially)
  - Article VIII: Anti-Abstraction Gate (use frameworks directly)
  - Article IX: Integration-First Testing (real services, minimize mocks)
- **Phase -1 Gates**: Pre-implementation validation checkpoints
- **ConstitutionValidator**: Core validation engine (`src/validators/constitution.js`)
- **Automated detection**: Project structure, test coverage, EARS patterns, complexity metrics
- **Exit codes**: 0 (pass), 1 (fail) - CI/CD integration ready

### Changed (v0.7.0)

- **package.json**: Version bumped to 0.7.0
- **bin/**: Added `musubi-validate.js` CLI command
- **Phase 1 status**: Constitutional Governance System operational (Priority 1/P0 complete)

## [0.1.4] - 2025-11-17

### Fixed (v0.1.4)

- **Skills API initialization fix** - Fixed TypeError when initializing GitHub Copilot and other non-Claude Code platforms
  - Added skillsDir existence check in copySkill() function
  - Restricted skill selection prompt to Claude Code only (Skills API exclusive)
  - Fixed async/await handling in musubi.js init command
  - Only Claude Code supports Skills API (.claude/skills/), other platforms use AGENTS.md
- **Test verification** - All platforms (Claude Code, GitHub Copilot, Cursor, Gemini CLI, Windsurf, Codex, Qwen Code) now initialize correctly

### Technical Details (v0.1.4)

- Skills API is exclusive to Claude Code platform
- Other 6 platforms use AGENTS.md for 25 agent definitions (OpenAI specification)
- copySkill() now returns early if agent.layout.skillsDir is undefined
- Skill installation logic now checks `agentKey === 'claude-code'` before proceeding

## [0.1.3] - 2025-11-17

### Added (v0.1.3)

- **Multi-platform 25-agent support via AGENTS.md** - Industry first: All 7 AI coding platforms now have equal access to 25 specialized agents
- GitHub Copilot official AGENTS.md support (`.github/AGENTS.md`)
- Cursor official AGENTS.md support (`.cursor/AGENTS.md`)
- Gemini CLI integration via `GEMINI.md` (root level)
- Windsurf support via `.windsurf/AGENTS.md`
- Codex support via `.codex/AGENTS.md`
- Qwen Code support via `.qwen/AGENTS.md`
- Platform-specific agent file properties in registry (agentsFile)
- Automated AGENTS.md file copying in musubi-init.js for all 7 platforms

### Changed (v0.1.3)

- **Documentation updates** - All documentation now reflects multi-platform equality
  - Updated Qiita article (Ultimate-SDD-Tool-MUSUBI.md) with 7-platform support details
  - Updated README.md with comprehensive multi-platform support table
  - Updated README.ja.md with Japanese translations
  - Added "25 Agents" column to support comparison table
  - Emphasized "industry first" achievement across all documentation
- **Registry updates** - All 7 platforms now have `hasSkills: true` and platform-specific `agentsFile` properties
- **Test expectations** - Updated test suite to validate all platforms support agents (53/53 tests passing)

### Fixed (v0.1.3)

- Registry tests now correctly validate that all platforms have agent support (previously expected Claude Code only)
- Test expectations updated from "only Claude Code should have skills" to "all platforms should have skills (AGENTS.md)"

### Technical Details (v0.1.3)

- **Implementation Strategy**: Skills API for Claude Code, AGENTS.md (OpenAI specification) for other 6 platforms
- **Test Coverage**: Maintained 100% coverage (53/53 tests passing)
- **AGENTS.md Format**: OpenAI specification standard with 25 agent definitions
- **Feature Parity**: All 7 platforms now offer complete SDD workflow coverage

### Migration Notes (v0.1.3)

- Existing Claude Code projects: No changes required, Skills API continues to work
- New projects: Use `npx musubi-sdd init --[platform]` to initialize with your preferred AI coding agent
- Multi-platform projects: AGENTS.md files are automatically copied to appropriate locations

## [0.1.2] - 2025-11-15

### Added (v0.1.2)

- Initial release of MUSUBI with 25 Claude Code Skills
- Constitutional governance with 9 articles
- EARS (Easy Approach to Requirements Syntax) format support
- Steering system for project memory
- 8-stage SDD workflow support
- Traceability matrix support

### Features (v0.1.2)

- 25 specialized skills covering orchestration, requirements, architecture, development, quality, security, infrastructure, and documentation
- Multi-language support (English and Japanese)
- CLI tools for project initialization and status checking
- Constitutional validation

## [0.1.1] - 2025-11-10

### Fixed (v0.1.1)

- CLI initialization bug fixes
- Documentation improvements

## [0.1.0] - 2025-11-08

### Added (v0.1.0)

- Initial proof of concept
- Basic skill structure
- Project scaffolding

---

**Note**: v0.1.3 represents a major milestone - the transition from "Claude Code exclusive 25 skills" to "7 platforms with 25 universal agents", achieving industry-first multi-platform equality in SDD tooling.
