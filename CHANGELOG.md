# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
