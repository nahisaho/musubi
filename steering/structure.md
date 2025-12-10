# Project Structure

**Project**: MUSUBI (Ultimate Specification Driven Development)
**Last Updated**: 2025-12-10
**Version**: 5.0.0

---

## Architecture Pattern

**Primary Pattern**: Modular Monolith with Library-First Architecture

MUSUBI follows a modular monolith architecture where each feature is implemented as an independent module in `src/`, with clear separation of concerns and explicit dependencies.

---

## Directory Organization

### Root Structure

```
musubi/
├── bin/                  # CLI entry points (20 commands)
│   ├── musubi.js         # Main CLI entry
│   ├── musubi-init.js    # Project initialization
│   ├── musubi-requirements.js  # EARS requirements
│   ├── musubi-design.js  # C4 + ADR design
│   ├── musubi-tasks.js   # Task breakdown
│   ├── musubi-validate.js # Constitutional validation
│   ├── musubi-trace.js   # Traceability
│   ├── musubi-change.js  # Change management
│   ├── musubi-gaps.js    # Gap detection
│   ├── musubi-sync.js    # Steering sync
│   ├── musubi-analyze.js # Code analysis
│   ├── musubi-share.js   # Team collaboration
│   ├── musubi-onboard.js # Project onboarding
│   ├── musubi-orchestrate.js # Skill orchestration
│   ├── musubi-workflow.js # Workflow execution
│   ├── musubi-browser.js # Browser automation
│   ├── musubi-gui.js     # Web GUI
│   ├── musubi-remember.js # Memory management
│   ├── musubi-resolve.js # Issue resolution
│   └── musubi-convert.js # Format conversion
├── src/                  # Source modules
│   ├── agents/           # AI agent implementations
│   │   ├── agentic/      # Sprint 4.4: CodeGenerator, CodeReviewer
│   │   ├── browser/      # Browser automation
│   │   └── index.js      # Agent exports
│   ├── analyzers/        # Code analysis tools
│   │   ├── repository-map.js    # Sprint 4.2: RepositoryMap
│   │   ├── ast-extractor.js     # Sprint 4.2: ASTExtractor
│   │   └── context-optimizer.js # Sprint 4.2: ContextOptimizer
│   ├── converters/       # Format converters
│   ├── generators/       # Document generators
│   ├── gui/              # Web GUI components
│   ├── integrations/     # External integrations (MCP, etc.)
│   ├── managers/         # State managers
│   ├── monitoring/       # Sprint 5.3: QualityDashboard
│   ├── orchestration/    # Skill orchestration & workflows
│   │   ├── reasoning.js  # Sprint 4.3: ReasoningEngine, PlanningEngine
│   │   └── index.js      # Orchestration exports
│   ├── reporters/        # Report generators
│   ├── resolvers/        # Issue resolvers
│   ├── steering/         # Sprint 5.1: SteeringAutoUpdate, SteeringValidator
│   ├── templates/        # Sprint 5.2: TemplateConstraints, ThinkingChecklist
│   ├── validators/       # Sprint 5.4: AdvancedValidation
│   ├── phase4-integration.js # Phase 4 unified exports
│   └── phase5-integration.js # Phase 5 unified exports
├── steering/             # Project memory (this directory)
│   ├── structure.md      # This file
│   ├── tech.md           # Technology stack
│   ├── product.md        # Product context
│   ├── project.yml       # Project configuration
│   ├── rules/            # Constitutional governance
│   │   ├── constitution.md
│   │   └── workflow.md
│   ├── templates/        # Document templates
│   └── memories/         # Agent memories
├── storage/              # SDD artifacts
│   ├── specs/            # Requirements, design, tasks
│   ├── changes/          # Delta specifications
│   └── features/         # Feature tracking
├── templates/            # CLI templates
├── tests/                # Test suites (3,378 tests)
│   ├── agents/
│   ├── analyzers/
│   ├── converters/
│   ├── generators/
│   ├── gui/
│   ├── integrations/
│   ├── managers/
│   ├── monitoring/
│   ├── orchestration/    # 1,072 tests
│   ├── reporters/
│   ├── resolvers/
│   ├── steering/
│   └── validators/
├── docs/                 # Documentation
│   ├── guides/           # User guides
│   ├── Qiita/            # Qiita articles
│   └── assets/           # Images, diagrams
├── website/              # Documentation website
└── coverage/             # Test coverage reports
```

---

## Module Organization

### Phase 4: Agent Loop & Agentic Features

```
src/
├── agents/agentic/
│   ├── code-generator.js   # Code generation with templates
│   ├── code-reviewer.js    # Code review with rules
│   └── index.js            # Exports
├── analyzers/
│   ├── repository-map.js   # Repository structure analysis
│   ├── ast-extractor.js    # AST parsing and extraction
│   └── context-optimizer.js # Context window optimization
├── orchestration/
│   └── reasoning.js        # ReasoningEngine, PlanningEngine, SelfCorrection
└── phase4-integration.js   # Unified Phase 4 exports
```

### Phase 5: Advanced Features

```
src/
├── steering/
│   ├── steering-auto-update.js  # Auto-sync with 5 triggers
│   └── steering-validator.js    # Validation engine
├── templates/
│   └── template-constraints.js  # TemplateConstraints, ThinkingChecklist
├── monitoring/
│   └── quality-dashboard.js     # A-F grade metrics
├── validators/
│   └── advanced-validation.js   # Cross-artifact validation
└── phase5-integration.js        # Unified Phase 5 exports
```

---

## Library-First Pattern (Article I)

All features begin as independent modules in `src/`.

### Module Structure

Each module follows this structure:

```
src/{{feature}}/
├── index.js              # Public API exports
├── {{feature}}.js        # Main implementation
└── {{feature}}.test.js   # Tests (in tests/ directory)
```

### Module Guidelines

- **Independence**: Modules MUST NOT have circular dependencies
- **Public API**: All exports via `index.js`
- **Testing**: Independent test suite in `tests/`
- **CLI**: Modules accessible via CLI commands (Article II)

---

## Naming Conventions

### File Naming

- **JavaScript**: `kebab-case.js` for modules
- **Classes**: `PascalCase` inside files
- **Tests**: `*.test.js`
- **Constants**: `SCREAMING_SNAKE_CASE`

### Directory Naming

- **Features**: `kebab-case` (e.g., `steering-auto-update/`)
- **Categories**: `kebab-case` (e.g., `orchestration/`)

### Variable Naming

- **Variables**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Classes**: `PascalCase`
- **Enums**: `SCREAMING_SNAKE_CASE` for values

---

## Test Organization

### Test Structure

```
tests/
├── agents/               # Agent tests
├── analyzers/            # Analyzer tests
├── converters/           # Converter tests
├── generators/           # Generator tests
├── gui/                  # GUI tests
├── integrations/         # Integration tests
├── managers/             # Manager tests
├── monitoring/           # Monitoring tests (40 tests)
├── orchestration/        # Orchestration tests (1,072 tests)
├── reporters/            # Reporter tests
├── resolvers/            # Resolver tests
├── steering/             # Steering tests (108 tests)
└── validators/           # Validator tests (40 tests)
```

### Test Guidelines

- **Test-First**: Tests written BEFORE implementation (Article III)
- **Coverage**: Minimum 80% coverage
- **Naming**: `*.test.js`
- **Total**: 3,378 tests across 115 suites

---

## Constitutional Compliance

This structure enforces:

- **Article I**: Library-first pattern in `src/`
- **Article II**: CLI interfaces in `bin/`
- **Article III**: Test structure supports Test-First
- **Article VI**: Steering files maintain project memory
- **Article VII**: Modular monolith (no unnecessary splitting)

---

## Changelog

### Version 5.0.0 (2025-12-10)
- Added Phase 5 module structure
- Added Phase 4 module structure
- Updated test counts (3,378 tests)
- Added 20 CLI commands

### Version 3.11.0 (2025-12-10)
- Added skill system architecture

---

**Last Updated**: 2025-12-10
**Maintained By**: MUSUBI Team
