# Video Tutorial Plan: Managing Changes in Existing Projects

Planning document for MUSUBI video tutorial series focusing on brownfield project change management.

## Tutorial Overview

### Title
"Managing Changes in Existing Projects with MUSUBI"

### Target Audience
- Software developers working with existing codebases
- Technical leads managing legacy systems
- Teams transitioning to specification-driven development
- Anyone maintaining brownfield projects

### Duration
15-20 minutes (main tutorial)

### Learning Objectives
By the end of this tutorial, viewers will be able to:
1. Initialize MUSUBI in an existing project
2. Create and validate change proposals
3. Apply requirement changes safely
4. Verify traceability and detect gaps
5. Archive completed changes

### Key Value Proposition
"Transform how you manage changes in existing codebases with traceable, validated, and systematic approach"

## Tutorial Structure

### Part 1: Introduction (0:00-2:00)

**Visual**: Split screen - Messy codebase vs MUSUBI-managed project

**Narration**:
```
"If you've ever worked on an existing codebase, you know the challenges:
- Undocumented requirements
- Changes without traceability
- Fear of breaking existing functionality
- No clear audit trail

MUSUBI solves these problems with a systematic approach to change management.

In this tutorial, I'll show you how to:
- Track requirement changes in existing projects
- Validate changes before applying them
- Maintain 100% traceability from requirements to code
- Build confidence when modifying legacy systems

Let's get started."
```

**On-screen Text**:
- ✓ Track changes systematically
- ✓ Validate before applying
- ✓ Maintain traceability
- ✓ Confidence in modifications

### Part 2: Setup & Onboarding (2:00-4:00)

**Visual**: Terminal with command execution + directory structure

**Commands to Demo**:
```bash
# Terminal 1: Install MUSUBI
npm install -g musubi-sdd

# Verify installation
musubi --version
# Output: 0.8.8

# Terminal 2: Sample project directory
cd ~/projects/ecommerce-api
ls -la
# Show existing codebase structure
```

**Narration**:
```
"First, install MUSUBI globally using npm.

Now let's onboard an existing project. I have a simple e-commerce API here.
It's a typical Node.js project with some existing code but no documentation.

We'll use MUSUBI to add structure and traceability."
```

**Commands to Demo**:
```bash
# Initialize MUSUBI
musubi init
# Select: Existing project (brownfield)
# Language: JavaScript
# Framework: Express.js

# Onboard existing code
musubi-onboard
# Analyzing codebase...
# Found: 15 source files, 8 test files
# Detected: API endpoints, database models, middleware
```

**On-screen Text**:
- Step 1: Install MUSUBI
- Step 2: Initialize in project
- Step 3: Onboard existing code

**Screenshot Captures**:
- Installation output
- Directory structure before/after init
- Onboarding analysis results

### Part 3: Creating a Change Proposal (4:00-7:00)

**Visual**: Split screen - VS Code + Terminal

**Scenario Introduction**:
```
"Let's say we need to add user authentication to our API.
This is a common brownfield scenario - adding a feature to existing code.

We'll use MUSUBI's change management workflow."
```

**Commands to Demo**:
```bash
# Create change proposal
musubi-change init

# Interactive prompts:
# Change ID: CHG-001-auth
# Title: Add user authentication
# Description: Implement JWT-based authentication for API endpoints
# Impact: All API routes, user database schema, middleware
```

**Visual**: Show generated file `changes/CHG-001-auth.md`

**Narration**:
```
"MUSUBI creates a delta specification template.
This is where we document our requirement changes.

Let me show you the key sections."
```

**VS Code Demo**: Edit `changes/CHG-001-auth.md`

```markdown
## ADDED Requirements

- **REQ-AUTH-001**: System shall authenticate users with email/password
- **REQ-AUTH-002**: System shall implement JWT token-based session management
- **REQ-AUTH-003**: System shall enforce password complexity requirements

## MODIFIED Requirements

- **REQ-API-001**: 
  - **Before**: API endpoints are publicly accessible
  - **After**: API endpoints require valid JWT token (except /login, /register)

## Impact Analysis

- **Affected Components**: API routes, user model, auth middleware
- **Breaking Changes**: Existing API clients must include JWT token
- **Dependencies**: bcrypt, jsonwebtoken packages
```

**On-screen Text**:
- ADDED: New requirements
- MODIFIED: Changed requirements
- REMOVED: Deleted requirements
- Impact: What will change

**Screenshot Captures**:
- Empty delta spec template
- Filled delta spec with requirements
- Impact analysis section

### Part 4: Validation (7:00-9:00)

**Visual**: Terminal with validation output

**Narration**:
```
"Before applying changes, we validate the delta specification.
This catches format errors and ensures completeness."
```

**Commands to Demo**:
```bash
# Validate delta spec
musubi-change validate changes/CHG-001-auth.md

# Output:
# ✓ Delta specification is valid
# ✓ Found 3 ADDED requirements
# ✓ Found 1 MODIFIED requirement
# ✓ REQ pattern format: OK
# ✓ Impact analysis: OK
# ✓ Testing checklist: OK
```

**Demo Error Case**:
```bash
# Show validation catching an error
# Edit file with invalid REQ pattern: REQ-auth-1

musubi-change validate changes/CHG-001-auth.md

# Output:
# ✗ Invalid REQ pattern: REQ-auth-1
# Expected format: REQ-XXX-NNN
```

**Narration**:
```
"See how validation catches the error?
Let's fix it to use the correct format: REQ-AUTH-001"
```

**On-screen Text**:
- Validation catches errors early
- REQ-XXX-NNN pattern enforced
- Impact analysis required

**Screenshot Captures**:
- Successful validation output
- Error validation output
- Fixed validation

### Part 5: Design & Tasks (9:00-12:00)

**Visual**: Terminal + generated design docs

**Narration**:
```
"Now we create design documents and break down tasks.
This ensures our new requirements are properly planned before implementation."
```

**Commands to Demo**:
```bash
# Create design documents
musubi-design
# Interactive: Select requirements REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-003
# Template: C4 Container diagram
# Output: docs/design/authentication-system.md

# Break down into tasks
musubi-tasks
# Interactive: Select design DSN-AUTH-001
# Output: docs/tasks/authentication-tasks.md
```

**Visual**: Show generated files

**File**: `docs/design/authentication-system.md`
```markdown
## Design: Authentication System (DSN-AUTH-001)

### Requirements
- REQ-AUTH-001: User authentication
- REQ-AUTH-002: JWT token management
- REQ-AUTH-003: Password complexity

### C4 Container Diagram
[System Context]
- User → API Gateway → Auth Service
- Auth Service → User Database

### Components
- Login endpoint (/api/auth/login)
- Token verification middleware
- Password hashing service
```

**File**: `docs/tasks/authentication-tasks.md`
```markdown
## Tasks for DSN-AUTH-001

### TASK-AUTH-001: Implement login endpoint
- Design: DSN-AUTH-001
- Estimate: 4 hours
- Dependencies: None

### TASK-AUTH-002: JWT middleware
- Design: DSN-AUTH-001
- Estimate: 3 hours
- Dependencies: TASK-AUTH-001

### TASK-AUTH-003: Password validation
- Design: DSN-AUTH-001
- Estimate: 2 hours
- Dependencies: None
```

**On-screen Text**:
- Design: Architecture planning
- Tasks: Implementation breakdown
- Traceability: Requirements linked

**Screenshot Captures**:
- Design document with C4 diagram
- Task breakdown with estimates
- Requirement references highlighted

### Part 6: Apply Changes (12:00-15:00)

**Visual**: Terminal with apply commands

**Narration**:
```
"Time to apply our changes to the requirements.
Always use dry-run mode first to preview changes."
```

**Commands to Demo**:
```bash
# Dry-run mode (safe preview)
musubi-change apply changes/CHG-001-auth.md --dry-run

# Output:
# Preview of changes:
# ✓ Would add REQ-AUTH-001 to docs/requirements/functional/authentication.md
# ✓ Would add REQ-AUTH-002 to docs/requirements/functional/authentication.md
# ✓ Would add REQ-AUTH-003 to docs/requirements/functional/authentication.md
# ✓ Would modify REQ-API-001 in docs/requirements/functional/api.md
# 
# No changes applied (dry-run mode)
```

**Narration**:
```
"Looks good! Now let's apply for real."
```

**Commands to Demo**:
```bash
# Apply changes
musubi-change apply changes/CHG-001-auth.md

# Output:
# ✓ Applied 3 ADDED requirements
# ✓ Applied 1 MODIFIED requirement
# ✓ Updated traceability links
# ✓ Changes applied successfully
```

**Visual**: Show updated requirement files

**File**: `docs/requirements/functional/authentication.md` (new file)
```markdown
## REQ-AUTH-001: User Authentication
System shall authenticate users with email/password.

## REQ-AUTH-002: JWT Token Management
System shall implement JWT token-based session management.

## REQ-AUTH-003: Password Complexity
System shall enforce password complexity requirements.
```

**On-screen Text**:
- Dry-run: Preview first
- Apply: Make it real
- Traceability: Links updated

**Screenshot Captures**:
- Dry-run output
- Apply output
- New requirement files created

### Part 7: Verify Traceability (15:00-18:00)

**Visual**: Terminal with gap detection and traceability

**Narration**:
```
"After applying changes, we verify traceability and detect gaps.
This ensures nothing is missed."
```

**Commands to Demo**:
```bash
# Detect gaps
musubi-gaps detect

# Output:
# Gap Detection Report
# 
# Orphaned Requirements: 0
# Unimplemented Requirements: 3
# - REQ-AUTH-001 (no code implementation)
# - REQ-AUTH-002 (no code implementation)
# - REQ-AUTH-003 (no code implementation)
# 
# Untested Code: 0
# 
# This is expected - we just created requirements!
```

**Narration**:
```
"Now let's generate the traceability matrix to see the full picture."
```

**Commands to Demo**:
```bash
# Generate traceability matrix
musubi-trace matrix --format table

# Output:
# Traceability Matrix
# 
# Requirement     Design          Task            Code    Test
# ─────────────────────────────────────────────────────────────
# REQ-AUTH-001    DSN-AUTH-001    TASK-AUTH-001   -       -
# REQ-AUTH-002    DSN-AUTH-001    TASK-AUTH-002   -       -
# REQ-AUTH-003    DSN-AUTH-001    TASK-AUTH-003   -       -
```

**Narration**:
```
"Perfect! We have full traceability from requirements to tasks.
After implementing the code, we'll run this again to verify complete traceability."
```

**Commands to Demo**:
```bash
# Check coverage
musubi-trace coverage

# Output:
# Traceability Coverage Report
# 
# Requirements Coverage:
#   Total Requirements: 3
#   With Design: 3 (100%)
#   With Tasks: 3 (100%)
#   With Code: 0 (0%)
#   With Tests: 0 (0%)
# 
# Overall Coverage: 50%
```

**On-screen Text**:
- Gap detection: Find missing work
- Traceability matrix: Full picture
- Coverage: Percentage metrics

**Screenshot Captures**:
- Gap detection output
- Traceability matrix table
- Coverage report

### Part 8: Archive & Summary (18:00-20:00)

**Visual**: Terminal + summary slide

**Narration**:
```
"After implementing and testing the authentication feature,
we archive the change proposal for future reference."
```

**Commands to Demo**:
```bash
# Archive completed change
musubi-change archive changes/CHG-001-auth.md

# Output:
# ✓ Moved to specs/changes/CHG-001-auth.md
# ✓ Updated status to 'Completed'
# ✓ Added completion timestamp: 2025-11-23T10:30:00Z
# ✓ Change archived successfully
```

**Narration**:
```
"Let's recap what we learned today:

1. Initialize MUSUBI in existing projects with musubi init and musubi-onboard
2. Create change proposals with musubi-change init
3. Document requirement changes in delta specifications
4. Validate changes before applying with musubi-change validate
5. Create design documents and tasks with musubi-design and musubi-tasks
6. Apply changes safely with --dry-run mode first
7. Verify traceability with musubi-trace and musubi-gaps
8. Archive completed changes with musubi-change archive

With MUSUBI, you can confidently manage changes in existing codebases
with full traceability and validation."
```

**On-screen Summary Slide**:
```
MUSUBI Change Management Workflow

1. Initialize: musubi init, musubi-onboard
2. Create: musubi-change init
3. Document: Edit delta specification
4. Validate: musubi-change validate
5. Design: musubi-design
6. Tasks: musubi-tasks
7. Apply: musubi-change apply --dry-run, then apply
8. Verify: musubi-gaps, musubi-trace
9. Archive: musubi-change archive

Learn more: https://github.com/nahisaho/MUSUBI
```

**Closing**:
```
"Thanks for watching! Links to documentation and the MUSUBI repository
are in the description. Happy coding with confidence!"
```

## Production Details

### Required Screenshots

1. **Installation**
   - npm install output
   - Version verification

2. **Initialization**
   - musubi init interactive prompts
   - Directory structure before/after
   - musubi-onboard analysis results

3. **Change Proposal**
   - Empty delta spec template
   - Filled delta spec with requirements
   - Impact analysis section

4. **Validation**
   - Successful validation output
   - Error validation example
   - Fixed validation

5. **Design & Tasks**
   - Generated design document
   - Generated task breakdown
   - Requirement references

6. **Apply Changes**
   - Dry-run output
   - Actual apply output
   - Updated requirement files

7. **Traceability**
   - Gap detection report
   - Traceability matrix
   - Coverage report

8. **Archive**
   - Archive command output
   - Archived file location

### Narration Script

See inline narration in each section above.

**Tone**: Professional but friendly, educational

**Pace**: Moderate (not too fast, allow time to read outputs)

**Key Phrases to Emphasize**:
- "Systematic approach"
- "Full traceability"
- "Validate before applying"
- "Confidence in modifications"

### Visual Elements

#### Screen Layout
- **Primary**: Terminal (60% of screen)
- **Secondary**: VS Code or file viewer (40%)
- Switch to full-screen for code/file viewing

#### Highlighting
- Use terminal cursor/mouse to highlight key outputs
- Zoom in on important command results
- Use arrows/circles to point out REQ references

#### Transitions
- Smooth fade between sections
- Quick cuts within sections
- Pause briefly after command outputs

### Audio

#### Music
- Background: Subtle, professional (low volume)
- Intro/Outro: More prominent

#### Voice
- Clear, professional narration
- Microphone: High-quality USB mic (Blue Yeti or similar)
- Post-processing: Noise reduction, normalization

#### Sound Effects
- Subtle "ping" for successful commands
- Avoid overuse of sound effects

### Captions

- Enable auto-generated captions
- Review and correct errors
- Add timestamps for major sections
- Highlight key commands in captions

### Video Editing

#### Software Options
- OBS Studio (recording)
- DaVinci Resolve (editing, free)
- Adobe Premiere Pro (professional)

#### Editing Checklist
- [ ] Remove long pauses
- [ ] Add intro/outro animations
- [ ] Insert chapter markers
- [ ] Color correct terminal output
- [ ] Add on-screen text highlights
- [ ] Verify audio levels consistent
- [ ] Export in 1080p, 60fps

### Publishing

#### Platform
- YouTube (primary)
- Embed in GitHub README

#### Title
"Managing Changes in Existing Projects with MUSUBI | Specification-Driven Development"

#### Description
```
Learn how to manage changes in existing codebases with MUSUBI's systematic change management workflow.

In this tutorial, you'll learn:
✓ How to initialize MUSUBI in brownfield projects
✓ Creating and validating change proposals
✓ Applying requirement changes safely
✓ Maintaining 100% traceability
✓ Detecting gaps and verifying coverage

Timeline:
0:00 Introduction
2:00 Setup & Onboarding
4:00 Creating Change Proposal
7:00 Validation
9:00 Design & Tasks
12:00 Apply Changes
15:00 Verify Traceability
18:00 Archive & Summary

Resources:
📦 Install: npm install -g musubi-sdd
📖 Documentation: https://github.com/nahisaho/MUSUBI
📝 Brownfield Tutorial: https://github.com/nahisaho/MUSUBI/blob/main/docs/guides/brownfield-tutorial.md
📊 Traceability Guide: https://github.com/nahisaho/MUSUBI/blob/main/docs/guides/traceability-matrix-guide.md

#MUSUBI #SDD #ChangeManagement #SoftwareDevelopment
```

#### Tags
- MUSUBI
- Specification-Driven Development
- Change Management
- Software Development
- Brownfield Projects
- Requirements Engineering
- Traceability
- DevOps

#### Thumbnail
- Screenshot of traceability matrix
- "MUSUBI" logo
- Text: "Manage Changes with Confidence"
- Professional design, high contrast

## Additional Tutorial Ideas

### Short Tutorial Series (5-7 minutes each)

1. **"Quick Start: MUSUBI in 5 Minutes"**
   - Fast-paced overview
   - Key commands only
   - Target: Developers wanting quick intro

2. **"Deep Dive: Delta Specifications"**
   - Focus on delta spec format
   - ADDED/MODIFIED/REMOVED sections
   - Best practices
   - Target: Teams adopting MUSUBI

3. **"Traceability Matrix Explained"**
   - How traceability works
   - Reading matrix output
   - Coverage metrics
   - Target: Technical leads, QA

4. **"CI/CD Integration with MUSUBI"**
   - GitHub Actions setup
   - Validation gates
   - Coverage enforcement
   - Target: DevOps engineers

5. **"Real-World Example: E-commerce API"**
   - Complete feature addition
   - Actual code implementation
   - End-to-end workflow
   - Target: Practical learners

## Success Metrics

### Viewership Goals
- 1,000 views in first month
- 50% average watch time
- 100+ likes
- 20+ comments

### Engagement Goals
- GitHub stars increase by 100+
- npm downloads increase by 50%
- 10+ community questions/discussions

### Quality Metrics
- Positive like/dislike ratio (>90%)
- Low bounce rate (<30%)
- High engagement rate (>5%)

## Next Steps

1. **Pre-production** (Week 1)
   - [ ] Finalize script
   - [ ] Prepare demo project
   - [ ] Set up recording environment
   - [ ] Test audio/video quality

2. **Production** (Week 2)
   - [ ] Record screen capture
   - [ ] Record narration
   - [ ] Capture all screenshots

3. **Post-production** (Week 3)
   - [ ] Edit video
   - [ ] Add captions
   - [ ] Create thumbnail
   - [ ] Review and quality check

4. **Publishing** (Week 4)
   - [ ] Upload to YouTube
   - [ ] Add to GitHub README
   - [ ] Share on social media
   - [ ] Monitor engagement

## Conclusion

This video tutorial will serve as the primary educational resource for MUSUBI's change management capabilities, helping developers adopt specification-driven development in their brownfield projects.

**Key Takeaways**:
- Clear, structured workflow demonstration
- Practical, real-world example
- Professional production quality
- Comprehensive coverage of features
- Strong call-to-action for adoption

For additional documentation, see:
- [Brownfield Tutorial](brownfield-tutorial.md)
- [Delta Specification Guide](delta-spec-guide.md)
- [Change Management Workflow](change-management-workflow.md)
- [Traceability Matrix Guide](traceability-matrix-guide.md)
