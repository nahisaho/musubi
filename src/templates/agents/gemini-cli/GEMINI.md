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

## Learn More

- [MUSUBI Documentation](https://github.com/your-org/musubi)
- [Constitutional Governance](steering/rules/constitution.md)
- [8-Stage SDD Workflow](steering/rules/workflow.md)

---

**MUSUBI for Gemini CLI** - むすび - Bringing specifications, design, and code together.
