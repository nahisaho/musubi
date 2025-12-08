# Steering Auto-Update Rules

## Overview

This document defines the rules for automatically detecting when steering files need to be updated based on codebase changes.

---

## Trigger Events

### 1. New Dependencies Added

**Detection**:
```bash
# package.json changes (Node.js)
git diff --name-only | grep -E "(package\.json|package-lock\.json)"

# requirements.txt changes (Python)
git diff --name-only | grep -E "(requirements\.txt|pyproject\.toml|setup\.py)"

# go.mod changes (Go)
git diff --name-only | grep -E "go\.(mod|sum)"
```

**Action**: Update `steering/tech.md` with new dependencies

**Example**:
```markdown
# Add to tech.md Dependencies section
- **New**: express@4.18.0 (Web framework)
- **New**: jest@29.0.0 (Testing framework)
```

---

### 2. New Directory Structure Created

**Detection**:
```bash
# New directories created
git diff --name-only --diff-filter=A | grep "/" | cut -d'/' -f1 | sort -u
```

**Action**: Update `steering/structure.md` with new directories

**Patterns to Watch**:
- `src/` - Source code organization
- `lib/` - Library modules (Constitutional Article I)
- `tests/` - Test organization
- `docs/` - Documentation structure
- `config/` - Configuration files

---

### 3. Architecture Pattern Changes

**Detection**:
```bash
# Major architectural changes
git diff --name-only | grep -E "(src/.*index\.(ts|js|py)|main\.(ts|js|py))"

# New service/module directories
find src -type d -maxdepth 2 -newer .git/COMMIT_EDITMSG
```

**Action**: Update `steering/structure.md` with pattern changes

**Example**:
```markdown
# Update Architecture Patterns section
## Detected Pattern: Microservices
- services/auth/
- services/user/
- services/order/
```

---

### 4. Technology Stack Updates

**Detection**:
```bash
# Framework version updates
git diff package.json | grep -E '"(react|vue|angular|express|fastapi)"'

# Build tool changes
git diff --name-only | grep -E "(webpack|vite|rollup|esbuild)\.config\."
```

**Action**: Update `steering/tech.md` with version changes

---

### 5. New Feature Implementation

**Detection**:
```bash
# New feature directories
git diff --name-only --diff-filter=A | grep "storage/features/"

# New requirement files
git diff --name-only --diff-filter=A | grep "requirements\.md"
```

**Action**: Update `steering/product.md` with new features

---

## Update Workflows

### Workflow 1: Dependency Update

```
1. Detect package.json/requirements.txt change
2. Read new dependencies
3. Categorize (production/development)
4. Update steering/tech.md
5. Generate steering/tech.ja.md (Japanese translation)
```

### Workflow 2: Structure Update

```
1. Detect new directory creation
2. Analyze directory purpose
3. Update steering/structure.md
4. Generate steering/structure.ja.md (Japanese translation)
```

### Workflow 3: Product Context Update

```
1. Detect new feature files
2. Read requirements.md
3. Extract feature purpose
4. Update steering/product.md
5. Generate steering/product.ja.md (Japanese translation)
```

---

## Memory System Updates

### memories/architecture_decisions.md

**Trigger**: New ADR created in `storage/features/*/design.md`

**Action**:
```markdown
# Append to architecture_decisions.md
## ADR-XXX: [Decision Title]
- **Date**: YYYY-MM-DD
- **Status**: Accepted
- **Context**: [Extracted from ADR]
- **Decision**: [Extracted from ADR]
```

### memories/development_workflow.md

**Trigger**: New CI/CD config or build scripts added

**Action**:
```markdown
# Update development_workflow.md
## Build Process
- npm run build (detected from package.json)
- npm test (detected from package.json)
```

### memories/domain_knowledge.md

**Trigger**: New business logic files or domain models

**Action**:
```markdown
# Update domain_knowledge.md
## Core Concepts
- User: Represents system users (src/models/user.ts)
- Order: Purchase transaction (src/models/order.ts)
```

### memories/suggested_commands.md

**Trigger**: New CLI commands or scripts added

**Action**:
```markdown
# Update suggested_commands.md
## Development Commands
- `npm run dev` - Start development server
- `npm run test:watch` - Run tests in watch mode
```

### memories/lessons_learned.md

**Trigger**: Post-mortem or retrospective files created

**Action**:
```markdown
# Append to lessons_learned.md
## [Date]: [Lesson Title]
- **Context**: [What happened]
- **Insight**: [What we learned]
- **Action**: [What we changed]
```

---

## Divergence Detection

### Check for Outdated Information

```bash
# Compare steering files with actual codebase

# 1. Check if tech.md dependencies match package.json
diff <(grep "dependencies" steering/tech.md) <(cat package.json | jq '.dependencies')

# 2. Check if structure.md directories match actual structure
diff <(grep -E "^-\s+" steering/structure.md | cut -d' ' -f2) <(find src -type d -maxdepth 2)

# 3. Check if product.md features match storage/features/
diff <(grep "Feature" steering/product.md) <(ls storage/features/)
```

### Report Divergence

```markdown
# Steering Divergence Report

## Detected Issues

### tech.md
- ⚠️ Missing: express@4.18.0 (added in package.json)
- ⚠️ Outdated: react@17.0.0 → react@18.2.0

### structure.md
- ⚠️ Missing directory: src/services/payment/
- ⚠️ Removed directory: src/legacy/ (no longer exists)

### product.md
- ⚠️ Missing feature: payment-integration (in storage/features/)

## Recommendations
1. Run steering skill to update all files
2. Review changes before committing
```

---

## Automation Configuration

### Git Hooks Integration

**pre-commit hook**:
```bash
#!/bin/bash
# Check if steering files need update

CHANGED_FILES=$(git diff --cached --name-only)

if echo "$CHANGED_FILES" | grep -qE "(package\.json|requirements\.txt)"; then
    echo "⚠️ Dependencies changed - consider updating steering/tech.md"
fi

if echo "$CHANGED_FILES" | grep -qE "^src/"; then
    echo "⚠️ Source structure changed - consider updating steering/structure.md"
fi
```

### CI/CD Integration

```yaml
# .github/workflows/steering-check.yml
name: Steering Consistency Check

on:
  pull_request:
    paths:
      - 'package.json'
      - 'src/**'
      - 'storage/features/**'

jobs:
  check-steering:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check steering consistency
        run: |
          npm run musubi-analyze -- --check-steering
```

---

## Best Practices

1. **Run After Major Changes**: Always run steering skill after significant codebase changes
2. **Review Before Commit**: Manually review auto-generated steering updates
3. **Keep Atomic**: Update steering files in the same commit as codebase changes
4. **Bilingual Updates**: Always update both `.md` and `.ja.md` versions
5. **Version Control**: Track all steering changes in git history

---

## Exclusion Rules

### Files to Ignore

```
# Do not trigger steering updates for:
- node_modules/
- dist/
- build/
- coverage/
- .git/
- *.log
- *.lock (except for dependency analysis)
- *.min.js
- *.map
```

### Changes to Ignore

- Whitespace-only changes
- Comment-only changes
- Version bumps without functional changes
- Test data files
