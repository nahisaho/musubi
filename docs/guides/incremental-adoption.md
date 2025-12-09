# Incremental Adoption Guide

> Migrate to MUSUBI step-by-step without disrupting your existing workflow

## Overview

This guide provides a practical path to adopt MUSUBI gradually, allowing teams to experience benefits incrementally while minimizing risk and learning curve.

## Adoption Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                    MUSUBI Adoption Journey                       │
├──────────┬──────────┬──────────┬──────────┬──────────┬─────────┤
│  Phase 0 │  Phase 1 │  Phase 2 │  Phase 3 │  Phase 4 │ Phase 5 │
│  Explore │  Basics  │  Skills  │  MCP     │  Workflow│ Optimize│
│  1 day   │  1 week  │  2 weeks │  2 weeks │  2 weeks │ Ongoing │
└──────────┴──────────┴──────────┴──────────┴──────────┴─────────┘
```

---

## Phase 0: Exploration (1 day)

### Goals
- Understand MUSUBI's value proposition
- See it working in your environment
- Make an informed adoption decision

### Steps

#### 1. Install MUSUBI
```bash
npm install -g musubi-sdd
```

#### 2. Initialize in a Test Project
```bash
# Use a non-critical project first
cd your-test-project
musubi init --platform copilot
```

#### 3. Explore Generated Structure
```
your-project/
├── steering/
│   ├── product.md          # Product context
│   ├── structure.md        # Architecture patterns
│   ├── tech.md            # Technology stack
│   └── rules/
│       └── constitution.md # 9 Constitutional Articles
└── .github/
    └── copilot-instructions.md
```

#### 4. Try Basic Commands
```bash
# Generate requirements
musubi requirements "Add user authentication"

# Create design
musubi design "user-auth"

# Break into tasks
musubi tasks "user-auth"
```

### Success Criteria
- [ ] MUSUBI installed and running
- [ ] Understood project structure
- [ ] Generated at least one requirement/design

---

## Phase 1: Steering Files (1 week)

### Goals
- Create meaningful steering files for your real project
- Experience improved AI context understanding
- Build foundation for advanced features

### Steps

#### 1. Start with `product.md`
```markdown
# Product Context

## Mission
[Your product's core purpose]

## Target Users
[Who uses your product]

## Key Features
- Feature 1: Description
- Feature 2: Description

## Success Metrics
- Metric 1: Target
- Metric 2: Target
```

#### 2. Document `structure.md`
```markdown
# Architecture

## Overview
[High-level architecture description]

## Key Components
### Component 1
- Purpose: ...
- Location: src/...
- Key files: ...

### Component 2
...

## Patterns
- Pattern 1: Used for...
- Pattern 2: Used for...

## Guidelines
- Do: ...
- Don't: ...
```

#### 3. Define `tech.md`
```markdown
# Technology Stack

## Languages
- TypeScript 5.x
- Python 3.11+

## Frameworks
- Backend: Express.js
- Frontend: React 18

## Infrastructure
- Cloud: AWS
- Database: PostgreSQL

## Tools
- Testing: Jest, Pytest
- CI/CD: GitHub Actions
```

#### 4. Customize `constitution.md`
```markdown
# Project Constitution

## Article I: Code Quality
All code must pass linting and have test coverage > 80%

## Article II: Security
Never commit secrets. Use environment variables.

## Article III: Documentation
All public APIs must have JSDoc/docstrings

[Add your project-specific rules]
```

### Validation
```bash
# Check your steering files
musubi validate --steering
```

### Success Criteria
- [ ] All 4 steering files created
- [ ] Files reflect actual project state
- [ ] AI responses show improved context awareness

---

## Phase 2: Skills Integration (2 weeks)

### Goals
- Leverage pre-built skills for common tasks
- Create custom skills for your workflow
- Experience guided development

### Week 1: Using Built-in Skills

#### 1. List Available Skills
```bash
musubi skills list
```

#### 2. Try Documentation Skill
```bash
musubi skills run documentation --input "src/components/Button.tsx"
```

#### 3. Try Refactoring Skill
```bash
musubi skills run refactor --input "src/legacy/utils.js" --pattern "extract-function"
```

#### 4. Try Test Generation
```bash
musubi skills run testing --input "src/services/auth.ts" --framework "jest"
```

### Week 2: Custom Skills

#### 1. Create Project-Specific Skill
```yaml
# steering/skills/api-endpoint.skill.md
---
name: api-endpoint
description: Create a new REST API endpoint
platform: copilot
---

# API Endpoint Creation

## Steps
1. Create route handler
2. Add validation schema
3. Implement business logic
4. Write tests
5. Update API documentation

## Templates
### Route Handler
\`\`\`typescript
// src/routes/{resource}.ts
import { Router } from 'express';
import { validate } from '../middleware/validation';
import { {Resource}Schema } from '../schemas/{resource}';

const router = Router();

router.{method}('/{path}', validate({Resource}Schema), async (req, res) => {
  // Implementation
});

export default router;
\`\`\`

## Checklist
- [ ] Route registered in main router
- [ ] Validation schema complete
- [ ] Error handling implemented
- [ ] Tests written
- [ ] API docs updated
```

#### 2. Register Custom Skill
```bash
musubi skills register steering/skills/api-endpoint.skill.md
```

#### 3. Use Custom Skill
```bash
musubi skills run api-endpoint --resource "users" --method "post"
```

### Success Criteria
- [ ] Used at least 3 built-in skills
- [ ] Created 1+ custom skills
- [ ] Team members can use skills independently

---

## Phase 3: MCP Integration (2 weeks)

### Goals
- Connect to MCP servers for extended capabilities
- Integrate with development tools
- Enable advanced automation

### Week 1: Core MCP Setup

#### 1. Configure MCP Servers
```yaml
# .musubi/mcp-config.yaml
servers:
  filesystem:
    transport: stdio
    command: npx
    args: ["@anthropic/mcp-fs-server", "./"]
    
  github:
    transport: stdio
    command: npx
    args: ["@anthropic/mcp-github-server"]
    env:
      GITHUB_TOKEN: ${GITHUB_TOKEN}
```

#### 2. Discover Available Tools
```bash
musubi mcp discover
```

#### 3. Test Tool Calls
```bash
musubi mcp call filesystem read_file --path "package.json"
```

### Week 2: Tool Integration with Skills

#### 1. Map Tools to Skills
```yaml
# steering/skills/code-review.skill.md
---
name: code-review
tools:
  - filesystem.read_file
  - filesystem.list_directory
  - github.create_review_comment
---
```

#### 2. Set Up Tool Restrictions
```yaml
# steering/tool-config.yaml
skills:
  code-review:
    allowed-tools:
      - filesystem.read_file
      - github.*
    restriction-level: standard
    
  deployment:
    allowed-tools:
      - "*"  # Full access for trusted operations
    restriction-level: unrestricted
```

#### 3. Test End-to-End Flow
```bash
musubi workflow run code-review --pr 123
```

### Success Criteria
- [ ] MCP servers connected and healthy
- [ ] Tool discovery working
- [ ] At least one skill using MCP tools

---

## Phase 4: Workflow Automation (2 weeks)

### Goals
- Create multi-step automated workflows
- Implement error handling patterns
- Enable human-in-the-loop processes

### Week 1: Basic Workflows

#### 1. Define Feature Development Workflow
```yaml
# workflows/feature-development.yaml
id: feature-development
name: Feature Development Workflow
version: "1.0.0"

inputs:
  - name: feature_name
    required: true
  - name: description
    required: true

steps:
  - id: requirements
    type: skill
    skillId: sdd-requirements
    input:
      feature: ${feature_name}
      description: ${description}
    outputVariable: requirements

  - id: design
    type: skill
    skillId: sdd-design
    input:
      feature: ${feature_name}
      requirements: ${requirements}
    outputVariable: design

  - id: review-checkpoint
    type: checkpoint
    name: design-complete

  - id: human-review
    type: human-review
    message: "Please review the design for ${feature_name}"
    options:
      - approve
      - request-changes
      - reject

  - id: tasks
    type: skill
    skillId: sdd-tasks
    when:
      $eq: [${review_result}, "approve"]
    input:
      feature: ${feature_name}
      design: ${design}
    outputVariable: tasks

outputs:
  - name: requirements
    from: requirements
  - name: design
    from: design
  - name: tasks
    from: tasks
```

#### 2. Run Workflow
```bash
musubi workflow run feature-development \
  --feature_name "user-dashboard" \
  --description "Add personalized user dashboard"
```

### Week 2: Error Handling & Recovery

#### 1. Add Error Handling
```yaml
# Enhanced workflow with error handling
steps:
  - id: risky-step
    type: tool
    toolName: external-api-call
    onError:
      strategy: fallback
      fallbackSteps:
        - id: fallback-local
          type: skill
          skillId: local-alternative
    retry:
      maxRetries: 3
      backoffMs: 1000
```

#### 2. Implement Circuit Breaker
```javascript
// In your custom integration
const { ErrorHandler } = require('musubi-sdd');

const handler = new ErrorHandler();
const breaker = handler.getCircuitBreaker('external-api', {
  failureThreshold: 5,
  timeout: 30000
});

await breaker.execute(async () => {
  return await externalApiCall();
});
```

#### 3. Monitor Workflow Health
```bash
musubi workflow status feature-development --execution-id exec-123
musubi workflow errors --report
```

### Success Criteria
- [ ] At least one multi-step workflow defined
- [ ] Error handling implemented
- [ ] Workflow monitoring in place

---

## Phase 5: Optimization (Ongoing)

### Goals
- Measure and improve efficiency
- Scale adoption across team
- Continuously refine processes

### Metrics to Track

#### Development Velocity
```yaml
# steering/metrics/velocity.yaml
metrics:
  - name: time_to_first_commit
    description: Time from task assignment to first commit
    target: < 2 hours
    
  - name: review_cycles
    description: Number of review iterations before merge
    target: <= 2
    
  - name: defect_rate
    description: Bugs found in production per feature
    target: < 0.5
```

#### AI Efficiency
```bash
# Generate AI usage report
musubi report ai-efficiency --period 30d
```

Expected output:
```
AI Efficiency Report (Last 30 days)
===================================
Total AI Interactions: 1,234
Successful Completions: 1,156 (93.7%)
Average Context Relevance: 87%
Time Saved (estimated): 45 hours

Top Performing Skills:
1. documentation (98% success)
2. refactor (94% success)
3. testing (91% success)
```

### Team Adoption

#### 1. Create Onboarding Guide
```bash
musubi onboard --generate-guide
```

#### 2. Set Up Team Templates
```bash
# Share skills and workflows
musubi share --export steering/skills/*.yaml
musubi share --export workflows/*.yaml
```

#### 3. Establish Review Process
- Weekly skill review: What's working? What needs improvement?
- Monthly metrics review: Are we hitting targets?
- Quarterly roadmap: What new capabilities do we need?

### Continuous Improvement

#### A. Feedback Loop
```yaml
# steering/feedback/skill-feedback.yaml
skill: code-review
feedback:
  - date: 2024-01-15
    issue: "Misses edge cases in error handling"
    resolution: "Added error-patterns.md to context"
    
  - date: 2024-01-20
    issue: "Slow on large files"
    resolution: "Split into file-chunk processing"
```

#### B. Skill Iteration
```bash
# Analyze skill performance
musubi analyze skill code-review --period 7d

# Update skill based on analysis
musubi skills update code-review --incorporate-feedback
```

#### C. Knowledge Base Growth
```bash
# Add learned patterns to steering
musubi remember "Pattern: Always validate input at API boundary"

# Sync team knowledge
musubi sync --team
```

---

## Common Adoption Patterns

### Pattern 1: Documentation First
Best for: Legacy codebases, onboarding-heavy teams

```
Phase 1 → Focus on product.md + structure.md
Phase 2 → Documentation skill extensively  
Phase 3 → Skip initially
Phase 4 → Documentation workflows
```

### Pattern 2: Testing Focus
Best for: Quality-critical projects, TDD teams

```
Phase 1 → Emphasize tech.md testing section
Phase 2 → Testing skill + custom test patterns
Phase 3 → Testing tool integrations
Phase 4 → Test-driven workflows
```

### Pattern 3: Rapid Feature Development
Best for: Startups, fast-moving teams

```
Phase 1 → Minimal steering files
Phase 2 → Feature-focused skills
Phase 3 → Full MCP integration early
Phase 4 → End-to-end feature workflows
```

### Pattern 4: Enterprise Governance
Best for: Compliance-heavy, large teams

```
Phase 1 → Detailed constitution.md
Phase 2 → Audit/compliance skills
Phase 3 → Restricted tool access
Phase 4 → Approval workflows with human review
```

---

## Troubleshooting Adoption Issues

### "AI responses aren't using context"
1. Check steering file formatting (valid Markdown)
2. Verify files are in correct locations
3. Run `musubi validate --steering`
4. Check platform-specific integration

### "Skills are too generic"
1. Add project-specific examples to skills
2. Create custom skills for common tasks
3. Include actual code samples from your project

### "MCP connections are flaky"
1. Check server health: `musubi mcp health`
2. Verify credentials and environment variables
3. Implement circuit breakers for resilience

### "Team adoption is slow"
1. Start with enthusiasts (champion model)
2. Show time savings with metrics
3. Create video walkthroughs
4. Pair programming with MUSUBI

---

## Quick Reference

### Essential Commands
```bash
# Initialization
musubi init --platform <copilot|cursor|windsurf>

# Validation
musubi validate --all

# Skills
musubi skills list
musubi skills run <name> --input <file>

# MCP
musubi mcp discover
musubi mcp health

# Workflows
musubi workflow run <name>
musubi workflow status <name>

# Reporting
musubi report ai-efficiency
musubi report adoption-progress
```

### File Locations
```
steering/
├── product.md           # What we're building
├── structure.md         # How it's organized
├── tech.md             # Technologies used
├── rules/
│   └── constitution.md  # Development rules
├── skills/              # Custom skills
├── memories/            # Learned patterns
└── templates/           # Project templates
```

---

## Getting Help

- **Documentation**: https://musubi.dev/docs
- **GitHub Issues**: https://github.com/nahisaho/musubi/issues
- **Discord Community**: https://discord.gg/musubi
- **Stack Overflow**: Tag `musubi-sdd`

---

*Start small, iterate often, measure everything. Welcome to specification-driven development with MUSUBI!*
