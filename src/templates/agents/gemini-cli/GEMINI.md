# MUSUBI for Gemini CLI

**Ultimate Specification Driven Development**

This project uses **MUSUBI** (Ultimate Specification Driven Development) configured for Gemini CLI.

## Features

- 📋 **Constitutional Governance** - 9 immutable articles + Phase -1 Gates
- 📝 **EARS Requirements Format** - Unambiguous requirements with complete traceability
- 🧭 **Auto-Updating Project Memory** - Steering system maintains architecture, tech stack, and product context
- 🌐 **Bilingual Documentation** - All documents created in both English and Japanese

## Commands

Gemini CLI uses commands in `.gemini/commands/`:

```bash
# Generate project memory
/sdd-steering

# Create requirements
/sdd-requirements <feature>

# Design architecture
/sdd-design <feature>

# Break down into tasks
/sdd-tasks <feature>

# Implement feature
/sdd-implement <feature>

# Validate constitutional compliance
/sdd-validate <feature>
```

## Project Memory (Steering System)

**IMPORTANT**: Before starting any task, check if steering files exist in `steering/` directory:

- `steering/structure.md` - Architecture patterns, directory organization, naming conventions
- `steering/tech.md` - Technology stack, frameworks, development tools
- `steering/product.md` - Business context, product purpose, users

If these files exist, ALWAYS read them first to understand project context.

## SDD Workflow (8 Stages)

```
Research → Requirements → Design → Tasks → Implementation → Testing → Deployment → Monitoring
```

Each stage has:

- Quality gates
- Traceability requirements
- Constitutional validation

## EARS Requirements Format

All requirements must use EARS patterns:

```markdown
### Requirement: User Login

WHEN user provides valid credentials,
THEN the system SHALL authenticate the user
AND the system SHALL create a session.
```

## Constitutional Governance

MUSUBI enforces 9 immutable constitutional articles:

1. **Library-First Principle** - Features start as libraries
2. **CLI Interface Mandate** - All libraries expose CLI
3. **Test-First Imperative** - Tests before code (Red-Green-Blue)
4. **EARS Requirements Format** - Unambiguous requirements
5. **Traceability Mandate** - 100% coverage required
6. **Project Memory** - All commands check steering first
7. **Simplicity Gate** - Maximum 3 projects initially
8. **Anti-Abstraction Gate** - Use framework features directly
9. **Integration-First Testing** - Real services over mocks

## Bilingual Documentation

**All agent-generated documents are created in both English and Japanese.**

### Language Policy

- **English**: Reference/source documents (`.md`)
- **Japanese**: Translations (`.ja.md`)
- **Commands**: Always read English versions for work
- **Code References**: Requirement IDs, technical terms stay in English

## OpenHands-Inspired Modules (v3.0.0)

MUSUBI provides advanced AI agent assistance modules:

| Module                 | Purpose                       | Import                               |
| ---------------------- | ----------------------------- | ------------------------------------ |
| **StuckDetector**      | Detect agent stuck states     | `src/analyzers/stuck-detector.js`    |
| **MemoryCondenser**    | Compress session history      | `src/managers/memory-condenser.js`   |
| **AgentMemoryManager** | Extract & persist learnings   | `src/managers/agent-memory.js`       |
| **CriticSystem**       | Evaluate SDD stage quality    | `src/validators/critic-system.js`    |
| **SecurityAnalyzer**   | Detect security risks         | `src/analyzers/security-analyzer.js` |
| **IssueResolver**      | GitHub Issue analysis         | `src/resolvers/issue-resolver.js`    |
| **SkillLoader**        | Load keyword-triggered skills | `src/managers/skill-loader.js`       |
| **RepoSkillManager**   | Manage project skills         | `src/managers/repo-skill-manager.js` |

## Quick Start

### First Time Setup

1. Generate project memory:

   ```
   /sdd-steering
   ```

2. Review steering context in `steering/` directory

3. Start development

### Example Usage

```bash
# Greenfield Project (0→1)
/sdd-steering
/sdd-requirements user-authentication
/sdd-design user-authentication
/sdd-tasks user-authentication
/sdd-implement user-authentication
```

## CLI Commands (v3.5.0)

MUSUBI provides powerful CLI tools. Install with:

```bash
npm install -g musubi-sdd
# or use directly
npx musubi-sdd <command>
```

### Core Commands

| Command               | Purpose                   | Example                                  |
| --------------------- | ------------------------- | ---------------------------------------- |
| `musubi-workflow`     | Workflow state & metrics  | `npx musubi-workflow status`             |
| `musubi-requirements` | EARS requirements         | `npx musubi-requirements init <feature>` |
| `musubi-design`       | C4 + ADR design           | `npx musubi-design init <feature>`       |
| `musubi-tasks`        | Task breakdown            | `npx musubi-tasks init <feature>`        |
| `musubi-trace`        | Traceability              | `npx musubi-trace matrix`                |
| `musubi-validate`     | Constitutional validation | `npx musubi-validate all`                |

### Advanced Commands (v3.5.0 NEW)

| Command              | Purpose                   | Example                                |
| -------------------- | ------------------------- | -------------------------------------- |
| `musubi-orchestrate` | Multi-skill orchestration | `npx musubi-orchestrate auto <task>`   |
| `musubi-browser`     | Browser automation & E2E  | `npx musubi-browser run "click login"` |
| `musubi-gui`         | Web GUI dashboard         | `npx musubi-gui start`                 |
| `musubi-remember`    | Agent memory management   | `npx musubi-remember extract`          |
| `musubi-resolve`     | GitHub Issue resolution   | `npx musubi-resolve <issue-number>`    |
| `musubi-convert`     | Format conversion         | `npx musubi-convert to-speckit`        |

### Replanning Commands (v3.6.0 NEW)

| Command                               | Purpose                      | Example                                                      |
| ------------------------------------- | ---------------------------- | ------------------------------------------------------------ |
| `musubi-orchestrate replan`           | Execute dynamic replanning   | `npx musubi-orchestrate replan <context-id>`                 |
| `musubi-orchestrate goal register`    | Register a new goal          | `npx musubi-orchestrate goal register --name "Deploy API"`   |
| `musubi-orchestrate goal update`      | Update goal progress         | `npx musubi-orchestrate goal update <goal-id> --progress 50` |
| `musubi-orchestrate goal status`      | View goal status             | `npx musubi-orchestrate goal status [goal-id]`               |
| `musubi-orchestrate optimize run`     | Run path optimization        | `npx musubi-orchestrate optimize run <path-id>`              |
| `musubi-orchestrate optimize suggest` | Get optimization suggestions | `npx musubi-orchestrate optimize suggest <path-id>`          |
| `musubi-orchestrate path analyze`     | Analyze execution path       | `npx musubi-orchestrate path analyze <path-id>`              |
| `musubi-orchestrate path optimize`    | Optimize execution path      | `npx musubi-orchestrate path optimize <path-id>`             |

### Guardrails Commands (v3.9.0 NEW)

| Command                                    | Purpose                           | Example                                                          |
| ------------------------------------------ | --------------------------------- | ---------------------------------------------------------------- |
| `musubi-validate guardrails`               | Input/Output guardrail validation | `npx musubi-validate guardrails --type input`                    |
| `musubi-validate guardrails --type output` | Output content validation         | `echo "content" \| npx musubi-validate guardrails --type output` |
| `musubi-validate guardrails --type safety` | Safety check with constitutional  | `npx musubi-validate guardrails --type safety --constitutional`  |
| `musubi-validate guardrails-chain`         | Chain multiple guardrails         | `npx musubi-validate guardrails-chain --parallel`                |

## Enterprise Scale Modules (v5.5.0 NEW)

MUSUBI v5.5.0 adds advanced modules for analyzing enterprise-scale projects (10,000+ files):

| Module                     | Purpose                              | Import                                       |
| -------------------------- | ------------------------------------ | -------------------------------------------- |
| **LargeProjectAnalyzer**   | Streaming analysis for 100K+ files   | `src/analyzers/large-project-analyzer.js`    |
| **ComplexityAnalyzer**     | Cyclomatic & cognitive complexity    | `src/analyzers/complexity-analyzer.js`       |
| **RustMigrationGenerator** | C/C++ to Rust migration analysis     | `src/generators/rust-migration-generator.js` |
| **CodeGraphMCP**           | MCP-based code intelligence server   | `src/integrations/code-graph-mcp.js`         |
| **HierarchicalReporter**   | Drilldown reports for large projects | `src/reporters/hierarchical-reporter.js`     |

### Usage Examples

```javascript
// Analyze large projects (100,000+ files)
const { LargeProjectAnalyzer } = require('musubi-sdd');
const analyzer = new LargeProjectAnalyzer('/path/to/project');
const result = await analyzer.analyze();
console.log(result.stats.totalFiles);

// Calculate code complexity
const { ComplexityAnalyzer } = require('musubi-sdd');
const complexity = new ComplexityAnalyzer();
const score = complexity.calculateCyclomaticComplexity(code, 'javascript');

// Analyze C/C++ for Rust migration
const { RustMigrationGenerator } = require('musubi-sdd');
const generator = new RustMigrationGenerator('/path/to/cpp-project');
const analysis = await generator.analyze();
```

## Learn More

- [MUSUBI Documentation](https://github.com/nahisaho/MUSUBI)
- [CLI Reference](https://github.com/nahisaho/MUSUBI#cli-commands) - Detailed CLI options
- [Constitutional Governance](steering/rules/constitution.md)
- [8-Stage SDD Workflow](steering/rules/workflow.md)

**Tip**: Run `npx musubi-sdd --help` for complete CLI documentation.

---

**MUSUBI for Gemini CLI** - むすび - Bringing specifications, design, and code together.
