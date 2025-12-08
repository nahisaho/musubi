# MUSUBI for GitHub Copilot

**Ultimate Specification Driven Development**

This project uses **MUSUBI** (Ultimate Specification Driven Development) configured for GitHub Copilot.

## Features

- 📋 **Constitutional Governance** - 9 immutable articles + Phase -1 Gates
- 📝 **EARS Requirements Format** - Unambiguous requirements with complete traceability
- 🧭 **Auto-Updating Project Memory** - Steering system maintains architecture, tech stack, and product context
- 🌐 **Bilingual Documentation** - All documents created in both English and Japanese

## Custom Prompts

GitHub Copilot uses custom prompts in `.github/prompts/`:

```bash
# Generate project memory
#sdd-steering

# Create requirements
#sdd-requirements <feature>

# Design architecture
#sdd-design <feature>

# Break down into tasks
#sdd-tasks <feature>

# Implement feature
#sdd-implement <feature>

# Validate constitutional compliance
#sdd-validate <feature>
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

#### Scenario: Successful login

- WHEN user enters correct email and password
- THEN system SHALL verify credentials
- AND system SHALL redirect to dashboard
```

## Constitutional Governance

MUSUBI enforces 9 immutable constitutional articles:

1. **Library-First Principle** - Features start as libraries
2. **CLI Interface Mandate** - All libraries expose CLI
3. **Test-First Imperative** - Tests before code (Red-Green-Blue)
4. **EARS Requirements Format** - Unambiguous requirements
5. **Traceability Mandate** - 100% coverage required
6. **Project Memory** - All prompts check steering first
7. **Simplicity Gate** - Maximum 3 projects initially
8. **Anti-Abstraction Gate** - Use framework features directly
9. **Integration-First Testing** - Real services over mocks

## Bilingual Documentation

**All agent-generated documents are created in both English and Japanese.**

### Language Policy

- **English**: Reference/source documents (`.md`)
- **Japanese**: Translations (`.ja.md`)
- **Prompts**: Always read English versions for work
- **Code References**: Requirement IDs, technical terms stay in English

## OpenHands-Inspired Modules (v3.0.0)

MUSUBI provides advanced AI agent assistance modules:

| Module | Purpose | Import |
|--------|---------|--------|
| **StuckDetector** | Detect agent stuck states | `src/analyzers/stuck-detector.js` |
| **MemoryCondenser** | Compress session history | `src/managers/memory-condenser.js` |
| **AgentMemoryManager** | Extract & persist learnings | `src/managers/agent-memory.js` |
| **CriticSystem** | Evaluate SDD stage quality | `src/validators/critic-system.js` |
| **SecurityAnalyzer** | Detect security risks | `src/analyzers/security-analyzer.js` |
| **IssueResolver** | GitHub Issue analysis | `src/resolvers/issue-resolver.js` |
| **SkillLoader** | Load keyword-triggered skills | `src/managers/skill-loader.js` |
| **RepoSkillManager** | Manage project skills | `src/managers/repo-skill-manager.js` |

### Usage Example

```javascript
// Detect if agent is stuck
const { StuckDetector } = require('musubi/src/analyzers/stuck-detector');
const detector = new StuckDetector();
detector.addEvent({ type: 'action', content: 'Read file' });
const analysis = detector.detect();

// Evaluate requirements quality
const { CriticSystem } = require('musubi/src/validators/critic-system');
const critic = new CriticSystem();
const result = await critic.evaluate('requirements', context);
```

## Quick Start

### First Time Setup

1. Generate project memory:

   ```
   #sdd-steering
   ```

2. Review steering context in `steering/` directory

3. Start development

### Example Usage

```bash
# Greenfield Project (0→1)
#sdd-steering
#sdd-requirements user-authentication
#sdd-design user-authentication
#sdd-tasks user-authentication
#sdd-implement user-authentication

# Brownfield Project (1→n)
#sdd-steering
#sdd-change-init add-2fa
#sdd-change-apply add-2fa
```

## CLI Commands (v3.5.0)

MUSUBI provides powerful CLI tools that can be used from any terminal. Install with:

```bash
npm install -g musubi-sdd
# or use directly
npx musubi-sdd <command>
```

### Core Workflow Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `musubi-workflow` | Workflow state & metrics | `npx musubi-workflow status` |
| `musubi-requirements` | EARS requirements management | `npx musubi-requirements init <feature>` |
| `musubi-design` | C4 + ADR design documents | `npx musubi-design init <feature>` |
| `musubi-tasks` | Task breakdown management | `npx musubi-tasks init <feature>` |
| `musubi-trace` | Traceability analysis | `npx musubi-trace matrix` |
| `musubi-change` | Change management (brownfield) | `npx musubi-change init <change-id>` |
| `musubi-gaps` | Gap detection & coverage | `npx musubi-gaps detect` |
| `musubi-validate` | Constitutional validation | `npx musubi-validate all` |

### Supporting Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `musubi-init` | Initialize MUSUBI in project | `npx musubi-init --copilot` |
| `musubi-share` | Memory sharing across projects | `npx musubi-share export` |
| `musubi-sync` | Sync steering files | `npx musubi-sync` |
| `musubi-analyze` | Project analysis | `npx musubi-analyze complexity` |
| `musubi-onboard` | AI platform onboarding | `npx musubi-onboard copilot` |

### Advanced Commands (v3.5.0 NEW)

| Command | Purpose | Example |
|---------|---------|---------|
| `musubi-orchestrate` | Multi-skill workflow orchestration | `npx musubi-orchestrate auto <task>` |
| `musubi-browser` | Browser automation & E2E testing | `npx musubi-browser run "click login"` |
| `musubi-gui` | Web GUI dashboard | `npx musubi-gui start` |
| `musubi-remember` | Agent memory management | `npx musubi-remember extract` |
| `musubi-resolve` | GitHub Issue auto-resolution | `npx musubi-resolve <issue-number>` |
| `musubi-convert` | Format conversion (Spec Kit) | `npx musubi-convert to-speckit` |

### CLI + Prompt Integration

Combine CLI commands with GitHub Copilot prompts for maximum efficiency:

```bash
# Initialize workflow, then use prompt
npx musubi-workflow init user-auth
#sdd-requirements user-auth

# Analyze issues, then resolve
npx musubi-resolve analyze 42
#sdd-implement issue-42-fix

# Start GUI dashboard for visual tracking
npx musubi-gui start
```

## Learn More

- [MUSUBI Documentation](https://github.com/nahisaho/musubi)
- [CLI Reference](https://github.com/nahisaho/musubi#cli-commands) - Detailed CLI options
- [Constitutional Governance](steering/rules/constitution.md)
- [8-Stage SDD Workflow](steering/rules/workflow.md)

**Tip**: Run `npx musubi-sdd --help` for complete CLI documentation.

---

**MUSUBI for GitHub Copilot** - むすび - Bringing specifications, design, and code together.
