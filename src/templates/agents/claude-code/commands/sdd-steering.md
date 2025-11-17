# SDD Steering Command

Generate or update project memory (steering context).

---

## Instructions for Claude

You are executing the `/sdd-steering` command to generate or update the project's steering context.

### What is Steering?

Steering provides **project memory** for all Claude Code skills. It consists of 3 core files that document:

1. **structure.md** - Architecture patterns, directory structure, naming conventions
2. **tech.md** - Technology stack, frameworks, tools
3. **product.md** - Business context, product goals, users

### Your Task

**Mode Detection**: Determine which mode to use:

1. **Bootstrap Mode** - No steering files exist
   - Analyze entire codebase
   - Generate initial steering files
   - Create both English (.md) and Japanese (.ja.md) versions

2. **Sync Mode** - Steering files exist, codebase has changed
   - Compare current steering with codebase
   - Identify discrepancies
   - Update steering files to match reality
   - Preserve both English and Japanese versions

3. **Review Mode** - User wants to review/improve steering
   - Present current steering
   - Suggest improvements
   - Ask user for feedback

---

## Mode 1: Bootstrap (First Time)

### Detection

- `steering/` directory doesn't exist OR
- `steering/structure.md`, `steering/tech.md`, `steering/product.md` don't exist

### Steps

1. **Analyze Codebase** (use Glob, Grep, Read tools extensively):
   - Directory structure
   - File organization patterns
   - Technology stack (package.json, requirements.txt, go.mod, etc.)
   - Frameworks detected
   - Database technologies
   - API patterns
   - Testing frameworks
   - Build tools
   - Deployment configurations

2. **Infer Product Context**:
   - README.md analysis
   - Package descriptions
   - Domain concepts from code
   - User types from code

3. **Generate Steering Files** (Bilingual):

   **IMPORTANT**: Create BOTH English and Japanese versions for each file.

   **English version is always the reference/source.**

   Create `steering/structure.md` (English) with:
   - Architecture pattern (monolith, microservices, library-first, etc.)
   - Directory organization rules
   - Naming conventions
   - Component boundaries
   - Integration patterns

   Create `steering/structure.ja.md` (Japanese) with:
   - Translation of structure.md content
   - All technical terms consistent with English version

   Create `steering/tech.md` (English) with:
   - Primary language(s) and versions
   - Frameworks and versions
   - Database(s) and versions
   - API technologies (REST, GraphQL, gRPC)
   - Testing frameworks
   - Build/deployment tools
   - Development tools

   Create `steering/tech.ja.md` (Japanese) with:
   - Translation of tech.md content
   - Technology names kept in English with Japanese explanations

   Create `steering/product.md` (English) with:
   - Product vision (inferred from README)
   - Target users (inferred from code)
   - Core capabilities
   - Business domain
   - Success metrics (if available)

   Create `steering/product.ja.md` (Japanese) with:
   - Translation of product.md content
   - Product terminology consistent with English version

4. **Bilingual File Generation**:
   - Generate English version (.md) FIRST
   - Then generate Japanese translation (.ja.md)
   - English version is the reference for all skills
   - Japanese version for Japanese-speaking team members

5. **Create Rules Directory**:
   - Copy constitutional governance files
   - Copy workflow guide
   - Copy EARS format guide

### Output

Present summary:

```markdown
## ✅ Steering Bootstrap Complete

Created steering files:

- steering/structure.md (+ .ja.md)
- steering/tech.md (+ .ja.md)
- steering/product.md (+ .ja.md)
- steering/rules/ (constitution, workflow, EARS)

### Key Findings:

- **Architecture**: [detected pattern]
- **Tech Stack**: [primary technologies]
- **Product**: [inferred purpose]

Please review the generated files and adjust as needed.
```

---

## Mode 2: Sync (Update Existing)

### Detection

- Steering files exist
- Codebase may have changed since last steering update

### Steps

1. **Read Current Steering**:
   - Read `steering/structure.md`
   - Read `steering/tech.md`
   - Read `steering/product.md`

2. **Analyze Current Codebase**:
   - Same analysis as Bootstrap mode
   - Compare with current steering

3. **Detect Discrepancies**:
   - New technologies added?
   - Architecture changed?
   - New components added?
   - Directory structure evolved?

4. **Update Steering Files** (Bilingual):
   - Update English version (.md) FIRST
   - Update sections that changed
   - Preserve sections that are still accurate
   - Add changelog entries
   - Then update Japanese version (.ja.md) to match
   - Ensure both versions stay synchronized

5. **Generate Sync Report**:

   ```markdown
   ## 🔄 Steering Sync Report

   ### Changes Detected:

   - [Change 1]
   - [Change 2]

   ### Updated Files:

   - steering/structure.md (+ .ja.md)
   - steering/tech.md (+ .ja.md)

   ### No Changes:

   - steering/product.md (still accurate)
   ```

---

## Mode 3: Review (User-Initiated Review)

### Detection

- User explicitly asks to review steering
- OR user wants to improve steering

### Steps

1. **Present Current Steering**:
   - Show current structure.md summary
   - Show current tech.md summary
   - Show current product.md summary

2. **Identify Improvement Opportunities**:
   - Missing information
   - Outdated information
   - Unclear sections
   - Inconsistencies

3. **Ask User for Feedback**:
   - Use AskUserQuestion tool
   - Get user confirmation on changes
   - Update based on feedback

---

## Constitutional Compliance

This command supports **Article VI: Project Memory**:

> All skills SHALL consult project memory (steering files) before making decisions.

By maintaining accurate steering files, all skills can:

- Make context-aware decisions
- Follow established patterns
- Align with product goals
- Use correct technologies

---

## Example Outputs

### Bootstrap Example

```markdown
## ✅ Steering Bootstrap Complete

### Structure (steering/structure.md)

- **Architecture**: Library-first monorepo
- **Pattern**: Each feature as independent library in `lib/`
- **App Integration**: Next.js app in `app/`
- **Directories**:
  - `lib/` - Reusable libraries
  - `app/` - Next.js application
  - `tests/` - Integration tests

### Tech Stack (steering/tech.md)

- **Language**: TypeScript 5.3
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL 15 with Prisma ORM
- **API**: REST (Next.js API Routes)
- **Testing**: Jest + React Testing Library
- **CI/CD**: GitHub Actions

### Product (steering/product.md)

- **Vision**: SaaS authentication platform
- **Users**: B2B SaaS companies
- **Core Features**: SSO, MFA, user management
```

### Sync Example

```markdown
## 🔄 Steering Sync Report

### Changes Detected:

1. **New Technology**: Redis added for caching
2. **Architecture Evolution**: Added background job processing
3. **New Component**: `lib/notifications/` added

### Updated:

- ✅ steering/tech.md - Added Redis 7.0, BullMQ
- ✅ steering/structure.md - Documented background jobs pattern

### No Changes:

- steering/product.md - Product vision unchanged
```

---

## Tool Usage

Use these tools extensively:

1. **Glob**: Find all source files, configs

   ```
   pattern: "**/*.ts"
   pattern: "**/package.json"
   pattern: "**/*.md"
   ```

2. **Grep**: Analyze code patterns

   ```
   pattern: "import.*from"
   pattern: "export.*class"
   pattern: "interface\\s+\\w+"
   ```

3. **Read**: Read key files
   - package.json
   - tsconfig.json
   - README.md
   - docker-compose.yml
   - .env.example

---

## Validation

After generating/updating steering:

1. **Completeness Check**:
   - [ ] All 3 core files present
   - [ ] Both English and Japanese versions
   - [ ] Rules directory populated

2. **Accuracy Check**:
   - [ ] Technologies match package.json
   - [ ] Architecture matches codebase structure
   - [ ] Product context aligns with README

3. **Consistency Check**:
   - [ ] English and Japanese versions match
   - [ ] No contradictions between files
   - [ ] Steering aligns with constitutional articles

---

## Next Steps After Steering

Once steering is complete, users can:

1. Review and adjust steering files manually
2. Proceed with requirements analysis: `/sdd-requirements [feature]`
3. Use any skill (they will now have project context)

---

**Execution**: Begin steering generation/update now.
