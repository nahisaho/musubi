# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
