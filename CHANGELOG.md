# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Improved
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

### Fixed
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

### Status

- **Phase 1 Core Framework**: Constitutional Governance System complete
- **Phase 2 Change Management**: 100% complete (v0.8.5-v0.8.8)
- **Next Priority**: Verify existing CLI commands (requirements, design, tasks)

---

## [0.8.8] - 2025-11-23

### Added
- **Phase 2 Documentation** - Comprehensive guides for change management
  - Brownfield project tutorial (step-by-step workflow)
  - Delta specification format guide
  - Change management workflow guide
  - Traceability matrix guide
  - Video tutorial planning document
  - Integration examples (gaps + trace + change)
  - Best practices for brownfield projects
  - Troubleshooting guides

### Documentation
- `docs/guides/brownfield-tutorial.md` - Complete brownfield workflow
- `docs/guides/delta-spec-guide.md` - Delta specification reference
- `docs/guides/change-management-workflow.md` - Change workflow guide
- `docs/guides/traceability-matrix-guide.md` - Traceability guide
- `docs/guides/video-tutorial-plan.md` - Video content planning

### Phase 2 Completion
- All 5 Phase 2 deliverables complete (100%)
- Delta Specification System (v0.8.6) ✅
- Change Workflow Commands (v0.8.6) ✅
- Validation Gates (v0.8.7) ✅
- Traceability System (v0.8.5) ✅
- Documentation (v0.8.8) ✅
- Ready for Phase 3 (Multi-Skill Orchestration)

## [0.8.7] - 2025-11-23

### Added
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

### Technical Details
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

### Added
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

### Technical Details
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

### Added
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

### Technical Details
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

### Added
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

### Technical Details
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

### Added
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

### Technical Details
- **DesignGenerator**: Core generator engine (`src/generators/design.js`)
- **C4 Templates**: 4 levels × 2 formats = 8 diagram templates
- **Article V Compliance**: Requirement-to-design traceability
- **Interactive Prompts**: Inquirer-based UI for diagram and ADR creation
- **Template Processing**: Variables replaced: {{FEATURE_NAME}}, {{PROJECT_NAME}}, {{DATE}}, {{AUTHOR}}, {{SYSTEM}}

## [0.8.0] - 2025-11-23

### Added
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

### Technical Details
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

### Changed
- **package.json**: Version bumped to 0.8.0
- **bin/**: Added `musubi-requirements.js` CLI command
- **Phase 1 status**: EARS Requirements Generator operational (Priority 2/P0 complete)

## [0.7.0] - 2025-11-23

### Added
- **Constitutional Governance System** - Enforce 9 immutable articles governing all development
  - `musubi-validate constitution` - Validate all 9 Constitutional Articles
  - `musubi-validate article <1-9>` - Validate specific article
  - `musubi-validate gates` - Validate Phase -1 Gates (Simplicity, Anti-Abstraction)
  - `musubi-validate complexity` - Validate complexity limits (modules ≤1500 lines, functions ≤50 lines)
  - `musubi-validate all` - Run comprehensive validation (constitution + gates + complexity)
  - Output formats: console (default), JSON, Markdown
  - Verbose mode with detailed violation reports

### Technical Details
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

### Changed
- **package.json**: Version bumped to 0.7.0
- **bin/**: Added `musubi-validate.js` CLI command
- **Phase 1 status**: Constitutional Governance System operational (Priority 1/P0 complete)

## [0.1.4] - 2025-11-17

### Fixed
- **Skills API initialization fix** - Fixed TypeError when initializing GitHub Copilot and other non-Claude Code platforms
  - Added skillsDir existence check in copySkill() function
  - Restricted skill selection prompt to Claude Code only (Skills API exclusive)
  - Fixed async/await handling in musubi.js init command
  - Only Claude Code supports Skills API (.claude/skills/), other platforms use AGENTS.md
- **Test verification** - All platforms (Claude Code, GitHub Copilot, Cursor, Gemini CLI, Windsurf, Codex, Qwen Code) now initialize correctly

### Technical Details
- Skills API is exclusive to Claude Code platform
- Other 6 platforms use AGENTS.md for 25 agent definitions (OpenAI specification)
- copySkill() now returns early if agent.layout.skillsDir is undefined
- Skill installation logic now checks `agentKey === 'claude-code'` before proceeding

## [0.1.3] - 2025-01-17

### Added
- **Multi-platform 25-agent support via AGENTS.md** - Industry first: All 7 AI coding platforms now have equal access to 25 specialized agents
- GitHub Copilot official AGENTS.md support (`.github/AGENTS.md`)
- Cursor official AGENTS.md support (`.cursor/AGENTS.md`)
- Gemini CLI integration via `GEMINI.md` (root level)
- Windsurf support via `.windsurf/AGENTS.md`
- Codex support via `.codex/AGENTS.md`
- Qwen Code support via `.qwen/AGENTS.md`
- Platform-specific agent file properties in registry (agentsFile)
- Automated AGENTS.md file copying in musubi-init.js for all 7 platforms

### Changed
- **Documentation updates** - All documentation now reflects multi-platform equality
  - Updated Qiita article (Ultimate-SDD-Tool-MUSUBI.md) with 7-platform support details
  - Updated README.md with comprehensive multi-platform support table
  - Updated README.ja.md with Japanese translations
  - Added "25 Agents" column to support comparison table
  - Emphasized "industry first" achievement across all documentation
- **Registry updates** - All 7 platforms now have `hasSkills: true` and platform-specific `agentsFile` properties
- **Test expectations** - Updated test suite to validate all platforms support agents (53/53 tests passing)

### Fixed
- Registry tests now correctly validate that all platforms have agent support (previously expected Claude Code only)
- Test expectations updated from "only Claude Code should have skills" to "all platforms should have skills (AGENTS.md)"

### Technical Details
- **Implementation Strategy**: Skills API for Claude Code, AGENTS.md (OpenAI specification) for other 6 platforms
- **Test Coverage**: Maintained 100% coverage (53/53 tests passing)
- **AGENTS.md Format**: OpenAI specification standard with 25 agent definitions
- **Feature Parity**: All 7 platforms now offer complete SDD workflow coverage

### Migration Notes
- Existing Claude Code projects: No changes required, Skills API continues to work
- New projects: Use `npx musubi-sdd init --[platform]` to initialize with your preferred AI coding agent
- Multi-platform projects: AGENTS.md files are automatically copied to appropriate locations

## [0.1.2] - 2025-01-15

### Added
- Initial release of MUSUBI with 25 Claude Code Skills
- Constitutional governance with 9 articles
- EARS (Easy Approach to Requirements Syntax) format support
- Steering system for project memory
- 8-stage SDD workflow support
- Traceability matrix support

### Features
- 25 specialized skills covering orchestration, requirements, architecture, development, quality, security, infrastructure, and documentation
- Multi-language support (English and Japanese)
- CLI tools for project initialization and status checking
- Constitutional validation

## [0.1.1] - 2025-01-10

### Fixed
- CLI initialization bug fixes
- Documentation improvements

## [0.1.0] - 2025-01-08

### Added
- Initial proof of concept
- Basic skill structure
- Project scaffolding

---

**Note**: v0.1.3 represents a major milestone - the transition from "Claude Code exclusive 25 skills" to "7 platforms with 25 universal agents", achieving industry-first multi-platform equality in SDD tooling.
