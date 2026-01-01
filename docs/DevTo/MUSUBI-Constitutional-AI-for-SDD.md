# MUSUBI: Constitutional AI for Specification-Driven Development

> **Stop Vibe Coding. Start Building Software That Actually Works.**

![MUSUBI Banner](https://img.shields.io/badge/MUSUBI-v2.1.1-blue?style=for-the-badge) ![npm](https://img.shields.io/npm/v/musubi-sdd?style=for-the-badge) ![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

## The Problem: AI Coding Without Direction

You've seen it. Maybe you've done it:

```
Developer: "Build me a user authentication system"
AI: *generates 200 lines of code*
Developer: "Nice! Now add password reset"
AI: *generates more code*
Developer: "Great! Ship it!"

// 2 weeks later...
Bug Report: "Users can't log in after password reset"
Bug Report: "No rate limiting on login attempts"  
Bug Report: "Passwords stored in plain text" 😱
```

This is **Vibe Coding** - writing code based on vibes, not specifications.

AI coding assistants like GitHub Copilot and Claude Code are incredibly powerful, but they have a fundamental limitation: **they don't know what you actually need to build**.

## The Solution: Specification-Driven Development (SDD)

**SDD** flips the script. Instead of generating code and hoping for the best, you:

1. **Define requirements** in a testable format
2. **Design the architecture** with clear decisions documented
3. **Implement** with full traceability to requirements
4. **Validate** that every requirement is covered

The result? Software that actually works.

## Introducing MUSUBI

**MUSUBI** (むすび - "connection" in Japanese) is an open-source SDD framework that works with **7 major AI coding platforms**:

- ✅ Claude Code (Skills API)
- ✅ GitHub Copilot (AGENTS.md)
- ✅ Cursor IDE
- ✅ Gemini CLI
- ✅ Windsurf
- ✅ Codex CLI
- ✅ Qwen Code

### Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **25 Specialized Agents** | From requirements to deployment |
| 📋 **Constitutional Governance** | 9 immutable quality articles |
| 🔍 **Full Traceability** | Requirements → Design → Code → Tests |
| 🧠 **Project Memory** | AI remembers your architecture decisions |
| 🆕 **CodeGraph MCP** | AI understands your entire codebase |

## Quick Start: Just Use @orchestrator

Here's the magic: **you only need to remember one command**.

```bash
# Install MUSUBI
npx musubi-sdd init --copilot  # or --claude, --cursor, etc.
```

Then, just talk to `@orchestrator`:

```
You: @orchestrator I need a task commenting feature. Users should be able 
     to create, edit, and delete comments on tasks.

🤖 Orchestrator: I'll coordinate this for you. Let me:
   1. Call @requirements-analyst to define EARS requirements
   2. Call @system-architect for C4 model + ADR design
   3. Call @software-developer for implementation
   4. Call @test-engineer for test coverage
   
   Starting with requirements...
```

The orchestrator automatically calls the right specialists. You don't need to know all 25 agents.

## The EARS Requirements Format

MUSUBI uses **EARS (Easy Approach to Requirements Syntax)** to eliminate ambiguity:

```markdown
❌ Vague requirement:
"Users can log in"

✅ EARS requirement:
WHEN a user provides valid email and password,
THEN the system SHALL authenticate the user
AND the system SHALL issue a JWT token
AND the system SHALL redirect to the dashboard

IF the password is incorrect 3 times consecutively,
THEN the system SHALL lock the account for 15 minutes
AND the system SHALL send an email notification
```

Every requirement is:
- **Testable** - You know exactly what to verify
- **Traceable** - Linked to design and code
- **Unambiguous** - No room for interpretation

## Constitutional Governance: 9 Quality Articles

MUSUBI enforces quality through **9 immutable constitutional articles**:

```
Article I:   Library First (start in lib/)
Article II:  CLI Interface Mandatory
Article III: Test First (RED-GREEN-BLUE)
Article IV:  EARS Requirements Format
Article V:   Traceability Mandatory (100%)
Article VI:  Project Memory Reference
Article VII: Simplicity Gate (max 3 libraries initially)
Article VIII: Anti-Abstraction (no unnecessary wrappers)
Article IX:  Integration-First Testing
```

Before any code is generated, the `@constitution-enforcer` agent validates compliance.

## NEW in v2.0: CodeGraph MCP Integration

The biggest limitation of AI coding assistants? **They can't see your entire codebase.**

MUSUBI v2.0 integrates with [CodeGraph MCP Server](https://github.com/nahisaho/codegraph-mcp-server) to give AI agents a complete understanding of your project:

### Before vs After

| Task | Before (v1.x) | After (v2.0 + CodeGraph) |
|------|---------------|--------------------------|
| Find function callers | Manual grep (miss some) | `find_callers` → complete list |
| Refactoring planning | Gut feeling | `analyze_module_structure` → objective analysis |
| Dependency tracking | Read import statements | `find_dependencies` → deep dependencies |
| Security audit | Pattern matching only | Full input path tracing |

### Example: Impact Analysis

```
You: @change-impact-analyzer I want to modify calculatePrice(). 
     What's the impact?

🤖 Change Impact Analyzer (using CodeGraph):

Running find_callers("calculatePrice")...

【Direct Callers】(5 locations)
- OrderService.createOrder() - line 45
- CartController.updateCart() - line 78
- InvoiceGenerator.generate() - line 112

【Indirect Callers】(3 locations) ← Previously missed!
- APIController.handleRequest() → OrderService → calculatePrice
- ScheduledTask.dailyReport() → BatchProcessor → calculatePrice

【Affected Tests】
- tests/unit/price.test.ts (direct)
- tests/integration/order.test.ts (indirect)
```

## Real Results: Vibe Coding vs SDD

Same feature ("Task Comments"), two approaches:

### ❌ Vibe Coding

```
Development time: 3 days
Lines of code: 500
Test coverage: 45%
Production bugs: 8
  - Comment deletion deletes entire task
  - No edit history
  - Form data lost on error
  - N+1 query performance issues
Documentation: None
Traceability: 0%
```

### ✅ SDD with MUSUBI

```
Development time: 7 days (including design & tests)
Lines of code: 800 (including tests)
Test coverage: 87%
Production bugs: 0
  - All requirements tested
  - Edge cases covered
  - Error handling complete
Documentation: Complete (requirements, design, ADRs, traceability matrix)
Traceability: 100%
```

**The verdict**: 4 extra days upfront saves weeks of debugging later.

## Getting Started

### Installation

```bash
# Initialize with your AI platform
npx musubi-sdd init --claude     # Claude Code
npx musubi-sdd init --copilot    # GitHub Copilot
npx musubi-sdd init --cursor     # Cursor IDE
npx musubi-sdd init --gemini     # Gemini CLI
npx musubi-sdd init --windsurf   # Windsurf
npx musubi-sdd init --codex      # Codex CLI
npx musubi-sdd init --qwen       # Qwen Code
```

### Your First Feature

```
You: @orchestrator Set up this project. We're building a task management SaaS.
```

That's it. Orchestrator will:
1. Generate project memory (steering files)
2. Recommend tech stack
3. Propose directory structure
4. Set up constitutional rules

## The 25 Specialized Agents

For when you need direct control:

| Category | Agents |
|----------|--------|
| **Orchestration** | orchestrator, steering, constitution-enforcer |
| **Requirements** | requirements-analyst, project-manager, change-impact-analyzer |
| **Design** | system-architect, api-designer, database-schema-designer, ui-ux-designer |
| **Development** | software-developer, test-engineer, code-reviewer, bug-hunter, quality-assurance, traceability-auditor |
| **Security** | security-auditor, performance-optimizer |
| **Operations** | devops-engineer, cloud-architect, database-administrator, site-reliability-engineer, release-coordinator |
| **Documentation** | technical-writer, ai-ml-engineer |

## Brownfield Projects

Already have code? MUSUBI supports existing projects with **Delta Specs**:

```
You: @steering Analyze the existing codebase and generate steering files
```

The AI will:
1. Analyze your current architecture
2. Extract tech stack information
3. Generate project memory
4. Prepare for incremental improvements

## Resources

- 📦 **npm**: [musubi-sdd](https://www.npmjs.com/package/musubi-sdd)
- 🐙 **GitHub**: [nahisaho/musubi](https://github.com/nahisaho/MUSUBI)
- 📚 **Documentation**: [README](https://github.com/nahisaho/MUSUBI#readme)
- 🆕 **CodeGraph MCP**: [nahisaho/codegraph-mcp-server](https://github.com/nahisaho/codegraph-mcp-server)

## Conclusion

AI coding assistants are here to stay. But without proper guidance, they produce **Vibe Code** - code that works... until it doesn't.

**MUSUBI** brings **Constitutional AI** to software development:
- ✅ Clear requirements (EARS format)
- ✅ Quality enforcement (9 Constitutional Articles)
- ✅ Full traceability (Requirements → Code → Tests)
- ✅ Project memory (AI remembers your decisions)
- ✅ Complete codebase understanding (CodeGraph MCP)

Stop vibe coding. Start building software that actually works.

```bash
npx musubi-sdd init --copilot
```

---

**MUSUBI** - むすび - Connecting specifications, design, and code.

⭐ Star us on [GitHub](https://github.com/nahisaho/MUSUBI) if this helps!

---

*This article is part of the MUSUBI documentation. MUSUBI is an MIT-licensed open-source project.*

<!-- Dev.to specific -->
<!-- 
Tags: ai, coding, productivity, opensource
Cover Image: Consider creating a banner with MUSUBI logo
Series: None (standalone article)
-->
