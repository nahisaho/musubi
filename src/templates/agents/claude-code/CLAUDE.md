# MUSUBI for Claude Code

**Ultimate Specification Driven Development with 25 Specialized Skills**

This project uses **MUSUBI** (Ultimate Specification Driven Development) configured for Claude Code.

## Features

- 🎯 **25 Specialized Skills** - Orchestrator, Steering, Requirements, Architecture, Development, Quality, Security, Infrastructure
- 📋 **Constitutional Governance** - 9 immutable articles + Phase -1 Gates
- 📝 **EARS Requirements Format** - Unambiguous requirements with complete traceability
- 🧭 **Auto-Updating Project Memory** - Steering system maintains architecture, tech stack, and product context
- 🌐 **Bilingual Documentation** - All documents created in both English and Japanese

## 25 Skills Overview

### Orchestration & Management (3)

- **@orchestrator** - Master coordinator for multi-skill workflows
- **@steering** - Project memory manager (auto-updating context)
- **@constitution-enforcer** - Governance validation (9 Articles + Phase -1 Gates)

### Requirements & Planning (3)

- **@requirements-analyst** - EARS format requirements generation
- **@project-manager** - Project planning, scheduling, risk management
- **@change-impact-analyzer** - Brownfield change analysis

### Architecture & Design (4)

- **@system-architect** - C4 model + ADR architecture design
- **@api-designer** - REST/GraphQL/gRPC API design
- **@database-schema-designer** - Database design, ER diagrams, DDL
- **@ui-ux-designer** - UI/UX design, wireframes, prototypes

### Development (1)

- **@software-developer** - Multi-language code implementation

### Quality & Review (5)

- **@test-engineer** - Unit, integration, E2E testing with EARS mapping
- **@code-reviewer** - Code review, SOLID principles
- **@bug-hunter** - Bug investigation, root cause analysis
- **@quality-assurance** - QA strategy, test planning
- **@traceability-auditor** - Requirements ↔ Code ↔ Test coverage validation

### Security & Performance (2)

- **@security-auditor** - OWASP Top 10, vulnerability detection
- **@performance-optimizer** - Performance analysis, optimization

### Infrastructure & Operations (5)

- **@devops-engineer** - CI/CD pipelines, Docker/Kubernetes
- **@cloud-architect** - AWS/Azure/GCP, IaC (Terraform/Bicep)
- **@database-administrator** - Database operations, tuning
- **@site-reliability-engineer** - Production monitoring, SLO/SLI
- **@release-coordinator** - Multi-component release management

### Documentation & Specialized (2)

- **@technical-writer** - Technical documentation, API docs
- **@ai-ml-engineer** - ML model development, MLOps

## Slash Commands

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

- Dedicated skills
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
6. **Project Memory** - All skills check steering first
7. **Simplicity Gate** - Maximum 3 projects initially
8. **Anti-Abstraction Gate** - Use framework features directly
9. **Integration-First Testing** - Real services over mocks

## Bilingual Documentation

**All agent-generated documents are created in both English and Japanese.**

### Language Policy

- **English**: Reference/source documents (`.md`)
- **Japanese**: Translations (`.ja.md`)
- **Skills**: Always read English versions for work
- **Code References**: Requirement IDs, technical terms stay in English

### Files Generated Bilingually

**Steering Context**:

- `steering/structure.md` + `steering/structure.ja.md`
- `steering/tech.md` + `steering/tech.ja.md`
- `steering/product.md` + `steering/product.ja.md`

**Specifications**:

- `storage/specs/[feature]-requirements.md` + `.ja.md`
- `storage/specs/[feature]-design.md` + `.ja.md`
- `storage/specs/[feature]-tasks.md` + `.ja.md`

## Quick Start

### First Time Setup

1. Generate project memory:

   ```
   /sdd-steering
   ```

2. Review steering context in `steering/` directory

3. Start development with skills

### For Complex Projects

```
@orchestrator [describe your complete task]
```

### For Specific Tasks

```
@requirements-analyst Create requirements for authentication
@system-architect Design architecture based on requirements.md
@software-developer Implement UserService following design.md
@test-engineer Generate tests from requirements.md
```

## Example Usage

### Greenfield Project (0→1)

```bash
# 1. Generate steering
/sdd-steering

# 2. Create requirements
/sdd-requirements user-authentication

# 3. Design architecture
/sdd-design user-authentication

# 4. Break into tasks
/sdd-tasks user-authentication

# 5. Implement
/sdd-implement user-authentication
```

### Brownfield Project (1→n)

```bash
# 1. Generate steering from existing code
/sdd-steering

# 2. Create change proposal
/sdd-change-init add-2fa

# 3. Impact analysis (automatic via change-impact-analyzer skill)

# 4. Implement change
/sdd-change-apply add-2fa

# 5. Archive change
/sdd-change-archive add-2fa
```

## CLI Commands (v3.5.0)

MUSUBI provides powerful CLI tools that can be used from any terminal. Install with:

```bash
npm install -g musubi-sdd
# or use directly
npx musubi-sdd <command>
```

### Core Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `musubi-workflow` | Workflow state & metrics | `npx musubi-workflow status` |
| `musubi-requirements` | EARS requirements | `npx musubi-requirements init <feature>` |
| `musubi-design` | C4 + ADR design | `npx musubi-design init <feature>` |
| `musubi-tasks` | Task breakdown | `npx musubi-tasks init <feature>` |
| `musubi-trace` | Traceability | `npx musubi-trace matrix` |
| `musubi-validate` | Constitutional validation | `npx musubi-validate all` |

### Advanced Commands (v3.5.0 NEW)

| Command | Purpose | Example |
|---------|---------|---------|
| `musubi-orchestrate` | Multi-skill orchestration | `npx musubi-orchestrate auto <task>` |
| `musubi-browser` | Browser automation & E2E | `npx musubi-browser run "click login"` |
| `musubi-gui` | Web GUI dashboard | `npx musubi-gui start` |
| `musubi-remember` | Agent memory management | `npx musubi-remember extract` |
| `musubi-resolve` | GitHub Issue resolution | `npx musubi-resolve <issue-number>` |
| `musubi-convert` | Format conversion | `npx musubi-convert to-speckit` |

### Replanning Commands (v3.6.0 NEW)

| Command | Purpose | Example |
|---------|---------|---------|
| `musubi-orchestrate replan` | Execute dynamic replanning | `npx musubi-orchestrate replan <context-id>` |
| `musubi-orchestrate goal register` | Register a new goal | `npx musubi-orchestrate goal register --name "Deploy API"` |
| `musubi-orchestrate goal update` | Update goal progress | `npx musubi-orchestrate goal update <goal-id> --progress 50` |
| `musubi-orchestrate goal status` | View goal status | `npx musubi-orchestrate goal status [goal-id]` |
| `musubi-orchestrate optimize run` | Run path optimization | `npx musubi-orchestrate optimize run <path-id>` |
| `musubi-orchestrate optimize suggest` | Get optimization suggestions | `npx musubi-orchestrate optimize suggest <path-id>` |
| `musubi-orchestrate path analyze` | Analyze execution path | `npx musubi-orchestrate path analyze <path-id>` |
| `musubi-orchestrate path optimize` | Optimize execution path | `npx musubi-orchestrate path optimize <path-id>` |

## Learn More

- [MUSUBI Documentation](https://github.com/your-org/musubi)
- [Constitutional Governance](steering/rules/constitution.md)
- [8-Stage SDD Workflow](steering/rules/workflow.md)
- [EARS Format Guide](steering/rules/ears-format.md)

---

**MUSUBI for Claude Code** - むすび - Bringing specifications, design, and code together.
