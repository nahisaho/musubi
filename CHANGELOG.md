# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
