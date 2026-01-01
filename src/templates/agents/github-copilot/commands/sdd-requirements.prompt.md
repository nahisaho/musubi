# SDD Requirements Command

Create EARS-format requirements specification through interactive dialogue.

---

## Instructions for AI Agent

You are executing the `/sdd-requirements [feature-name]` command to create a requirements specification.

### Command Format

```bash
/sdd-requirements authentication
/sdd-requirements payment-processing
/sdd-requirements user-dashboard
```

### Your Task

**CRITICAL**: Before generating requirements, you MUST engage in an interactive 1-on-1 dialogue with the user to uncover the TRUE PURPOSE behind their request. Surface-level requirements often hide deeper needs.

### Output Directory

**Requirements documents are saved to**: `storage/specs/`

- English: `storage/specs/{{feature-name}}-requirements.md`
- Japanese: `storage/specs/{{feature-name}}-requirements.ja.md`

---

## Process

### 1. Read Steering Context (Article VI)

**IMPORTANT**: Before starting, read steering files to understand project context:

```bash
# Read these files first
steering/product.md      # Business context, users, goals
steering/structure.md    # Architecture patterns
steering/tech.md         # Technology stack
```

**Extract**:

- Target users
- Product goals
- Existing architecture patterns
- Technology constraints

---

### 2. Interactive True Purpose Discovery (1-on-1 Dialogue)

**CRITICAL RULE**: You MUST ask exactly ONE question, then STOP and WAIT for the user's response. Do NOT ask multiple questions at once. Do NOT list all questions. Do NOT proceed until the user answers.

#### Dialogue Rules (MANDATORY)

1. **ONE QUESTION ONLY**: Ask a single question per turn
2. **STOP AND WAIT**: After asking, end your response immediately
3. **NO QUESTION LISTS**: Never show "Q1, Q2, Q3..." format
4. **SEQUENTIAL FLOW**: Move to next question only after receiving an answer

#### Phase 1: Surface Purpose → True Purpose Discovery

**Question Sequence** (Ask ONE at a time, wait for answer before next):

**Turn 1**: Start with the WHY question

```
この機能で解決したい『本当の課題』は何ですか？
```

→ STOP HERE. Wait for user response.

**Turn 2**: Based on answer, ask WHO question

```
この機能を最も必要としているのは誰ですか？
```

→ STOP HERE. Wait for user response.

**Turn 3**: Ask WHAT-IF question

```
もしこの機能が完璧に動作したら、何が変わりますか？
```

→ STOP HERE. Wait for user response.

**Turn 4**: Ask CONSTRAINT question

```
この機能で『絶対にやってはいけないこと』はありますか？
```

→ STOP HERE. Wait for user response.

**Turn 5**: Ask SUCCESS CRITERIA question

```
この機能が『成功した』と言えるのはどんな状態ですか？
```

→ STOP HERE. Wait for user response.

**After 5+ turns**: Summarize and confirm

```
ここまでの理解を確認させてください：
[Summary]
この理解で正しいですか？
```

#### Example Dialogue Flow

**AI Turn 1**:

> まず、この機能について教えてください。
>
> **この機能で解決したい『本当の課題』は何ですか？**

**User**: "CSVから社員データをインポートしたい"

**AI Turn 2**:

> なるほど、社員データのCSVインポートですね。
>
> **このインポート機能を最も必要としているのは誰ですか？**（人事部？IT管理者？）

**User**: "人事部です"

**AI Turn 3**:

> 人事部の方が使うのですね。
>
> **もしこの機能が完璧に動作したら、人事部の業務はどう変わりますか？**

...(continues one question at a time)

---

### 3. MECE Analysis (Comprehensive Coverage)

**After understanding the TRUE PURPOSE, apply MECE to ensure completeness.**

#### MECE Dimensions for Requirements

**Dimension 1: User Journey (Who × When × Where)**
| Stage | Questions to Cover |
|-------|--------------------|
| Before | How do users discover/access this feature? |
| During | What is the core interaction flow? |
| After | What happens after completion? Notifications? |
| Error | What happens when something goes wrong? |

**Dimension 2: Data Lifecycle (CRUD)**
| Operation | Check |
|-----------|-------|
| Create | What data is created? By whom? |
| Read | Who can view? What format? |
| Update | What can be modified? By whom? |
| Delete | Soft delete? Hard delete? Retention? |

**Dimension 3: Cross-Cutting Concerns**
| Concern | Requirements |
|---------|-------------|
| Security | Authentication, Authorization, Encryption |
| Performance | Response time, Throughput, Concurrency |
| Reliability | Error handling, Recovery, Failover |
| Scalability | Load limits, Growth capacity |
| Compliance | GDPR, SOC2, PCI-DSS (if applicable) |

**Dimension 4: Integration Points**
| Integration | Check |
|-------------|-------|
| Upstream | What systems feed data to this feature? |
| Downstream | What systems consume this feature's output? |
| External | Any third-party APIs or services? |

**MECE Completeness Check**:

- [ ] All user types covered?
- [ ] All states (normal, edge, error) covered?
- [ ] All data flows covered?
- [ ] All integration points covered?
- [ ] No overlapping requirements?

---

### 4. Research Existing System (Brownfield)

**If modifying existing functionality**:

- Search for existing implementation: `grep -r "{{feature}}" src/`
- Read related code
- Identify current behavior
- Document what needs to change (delta spec)

---

### 5. Contextual Research

- Analyze steering/product.md for user types
- Review existing requirements docs
- Check for similar features in codebase

---

### 6. Generate Requirements Document

**Output Directory**: `storage/specs/`

Use template from `templates/requirements.md`:

**Structure**:

```markdown
# Requirements Specification: {{FEATURE_NAME}}

## Overview

- Purpose (True Purpose discovered through dialogue)
- Scope (in/out)
- Business context (from steering/product.md)

## True Purpose Statement

[Summary of TRUE PURPOSE uncovered through dialogue]

- Surface Request: [What user initially asked for]
- True Purpose: [What user actually needs]
- Key Insight: [Critical understanding gained]

## Stakeholders

[Table of roles identified through dialogue]

## MECE Coverage Summary

### User Journey Coverage

- [ ] Before: Entry/Discovery
- [ ] During: Core Flow
- [ ] After: Completion
- [ ] Error: Exception Handling

### Data Lifecycle Coverage

- [ ] Create
- [ ] Read
- [ ] Update
- [ ] Delete

### Cross-Cutting Concerns

- [ ] Security
- [ ] Performance
- [ ] Reliability
- [ ] Scalability

## Functional Requirements

### REQ-{{COMPONENT}}-001: [Title]

[EARS Pattern - choose appropriate pattern]

**MECE Category**: [User Journey Stage | Data Operation | etc.]

**Acceptance Criteria**:

- [Testable criterion 1]
- [Testable criterion 2]

**Priority**: P0/P1/P2/P3
**Status**: Draft
**Traceability**: (leave blank for now)

[Repeat for all requirements]

## Non-Functional Requirements

### REQ-PERF-001: Performance

### REQ-SEC-001: Security

### REQ-SCALE-001: Scalability

### REQ-AVAIL-001: Availability

## MECE Gap Analysis

[List any gaps identified during MECE analysis]

## Requirements Coverage Matrix

[Initial table - will be filled during design/implementation]
```

---

### 7. Apply EARS Format (Article IV)

**CRITICAL**: All requirements MUST use one of 5 EARS patterns.

#### Pattern Selection Guide

| Scenario              | EARS Pattern                         | Example                                     |
| --------------------- | ------------------------------------ | ------------------------------------------- |
| Always-active feature | **Ubiquitous**: `The [system] SHALL` | The API SHALL authenticate all requests     |
| User action triggers  | **Event-driven**: `WHEN ... THEN`    | WHEN user clicks Submit, THEN validate form |
| Continuous condition  | **State-driven**: `WHILE ... SHALL`  | WHILE loading, UI SHALL show spinner        |
| Error handling        | **Unwanted**: `IF ... THEN`          | IF timeout, THEN return HTTP 504            |
| Feature flag          | **Optional**: `WHERE ... SHALL`      | WHERE 2FA enabled, SHALL require OTP        |

#### Requirements Quality Checklist

Each requirement MUST have:

- [ ] Unique ID (REQ-COMPONENT-NNN)
- [ ] EARS pattern (one of 5)
- [ ] Clear SHALL/SHALL NOT (not SHOULD/MUST/MAY)
- [ ] Testable acceptance criteria
- [ ] Priority (P0/P1/P2/P3)
- [ ] Status (Draft initially)
- [ ] MECE Category (for traceability)

---

### 8. Assign Requirement IDs

**Format**: `REQ-[COMPONENT]-[NUMBER]`

**Examples**:

- `REQ-AUTH-001` - Authentication component
- `REQ-PAY-001` - Payment component
- `REQ-DASH-001` - Dashboard component

**Rules**:

- All uppercase
- Sequential numbering starting from 001
- Unique across entire project
- Never reuse IDs

---

### 9. Add Non-Functional Requirements (from MECE Cross-Cutting Concerns)

Always include these categories:

```markdown
### REQ-PERF-001: Response Time

The {{COMPONENT}} SHALL respond within 200ms for 95% of requests.

**Acceptance Criteria**:

- 95th percentile < 200ms
- 99th percentile < 500ms
- Tested with 1000 concurrent users

### REQ-SEC-001: OWASP Top 10

The {{COMPONENT}} SHALL prevent OWASP Top 10 vulnerabilities.

**Acceptance Criteria**:

- Input validation on all inputs
- Output encoding for XSS prevention
- Parameterized queries (SQL injection prevention)
- Authentication on protected endpoints

### REQ-SCALE-001: Concurrent Users

The {{COMPONENT}} SHALL support 10,000 concurrent users.

**Acceptance Criteria**:

- Load tested with 10,000 users
- No performance degradation
- Horizontal scaling supported

### REQ-AVAIL-001: Uptime

The {{COMPONENT}} SHALL maintain 99.9% uptime.

**Acceptance Criteria**:

- 99.9% uptime SLA
- Health check endpoint
- Graceful degradation on failure
```

---

### 10. Brownfield: Create Delta Specification

If this is a change to existing system, add delta sections:

```markdown
## ADDED Requirements

### REQ-AUTH-042: Two-Factor Authentication (NEW)

WHERE two-factor authentication is enabled,
the authentication system SHALL require OTP verification.

**Justification**: Security enhancement
**Impact**: Adds new authentication step; backward compatible

---

## MODIFIED Requirements

### REQ-AUTH-001: Password Hashing (MODIFIED)

**Previous**:
The authentication system SHALL hash passwords using bcrypt cost 10.

**Updated**:
The authentication system SHALL hash passwords using bcrypt cost 12.

**Reason**: Increased security standard
**Breaking Change**: No (existing hashes valid)
**Migration**: Rehash on next login

---

## REMOVED Requirements

### REQ-AUTH-015: Remember Me (REMOVED)

**Reason**: Security policy change
**Breaking Change**: Yes
**Migration**: Users must log in each visit
**Communication**: 30-day notice required
```

---

### 11. Constitutional Validation

Validate requirements against constitutional articles:

#### Article IV: EARS Format

- [ ] All requirements use EARS patterns
- [ ] No ambiguous keywords (SHOULD, MUST, MAY)
- [ ] All requirements have SHALL/SHALL NOT

#### Article V: Traceability

- [ ] All requirements have unique IDs
- [ ] IDs follow REQ-XXX-NNN format
- [ ] Requirement IDs never reused

Run validation:

```bash
@constitution-enforcer validate requirements.md
```

---

### 12. Save Document (Bilingual)

**IMPORTANT**: Create BOTH English and Japanese versions.

**Output Directory**: `storage/specs/`

**English version (Primary/Reference)**:
Save to: `storage/specs/{{feature-name}}-requirements.md`

**Japanese version (Translation)**:
Save to: `storage/specs/{{feature-name}}-requirements.ja.md`

**File Naming**:

- Use kebab-case
- Include feature name
- Add `-requirements` suffix
- Add `.ja` before `.md` for Japanese version

**Examples**:

- `storage/specs/authentication-requirements.md` (English)
- `storage/specs/authentication-requirements.ja.md` (Japanese)
- `storage/specs/payment-processing-requirements.md` (English)
- `storage/specs/payment-processing-requirements.ja.md` (Japanese)

**Generation Order**:

1. Generate English version FIRST
2. Then generate Japanese translation
3. Ensure requirement IDs are identical in both versions
4. Keep technical terms (REQ-XXX-NNN, EARS keywords) in English in Japanese version

---

### 13. Generate Summary

Present summary to user:

```markdown
## ✅ Requirements Specification Complete

**Feature**: {{FEATURE_NAME}}
**Output Directory**: `storage/specs/`
**Files**:

- English: storage/specs/{{feature-name}}-requirements.md
- Japanese: storage/specs/{{feature-name}}-requirements.ja.md

### True Purpose Discovery:

- Surface Request: [What user initially asked]
- True Purpose: [What user actually needs]
- Key Insight: [Critical understanding gained]

### MECE Coverage:

- User Journey: ✅ All stages covered
- Data Lifecycle: ✅ CRUD covered
- Cross-Cutting: ✅ Security/Performance/Reliability/Scalability
- Integrations: ✅ Upstream/Downstream/External

### Summary:

- **Total Requirements**: [N]
  - P0 (Critical): [N]
  - P1 (High): [N]
  - P2 (Medium): [N]
  - P3 (Low): [N]

### Requirements Breakdown:

- Functional: [N]
- Non-Functional: [N]
  - Performance: [N]
  - Security: [N]
  - Scalability: [N]
  - Availability: [N]

### EARS Patterns Used:

- Ubiquitous: [N]
- Event-driven: [N]
- State-driven: [N]
- Unwanted behavior: [N]
- Optional feature: [N]

### Constitutional Compliance:

- ✅ Article IV: All requirements in EARS format
- ✅ Article V: Unique IDs assigned
- ✅ Article VI: Aligned with steering context

### Next Steps:

1. Review requirements with stakeholders
2. Get approval
3. Run design phase: `/sdd-design {{feature-name}}`
```

---

## Example Execution

### User Command:

```bash
#sdd-requirements authentication
```

### AI Agent Actions:

1. **Read Steering**:
   - `steering/product.md` → Target users: B2B SaaS companies
   - `steering/tech.md` → Stack: Next.js, PostgreSQL, Prisma
   - `steering/structure.md` → Pattern: Library-first

2. **Interactive Dialogue (1-on-1)**:

   **AI**: 「認証機能について、この機能で解決したい『本当の課題』は何ですか？」

   **User**: 「ユーザーがログインできるようにしたい」

   **AI**: 「なるほど。では、この機能がないと、誰がどのように困りますか？」

   **User**: 「顧客がサービスを使えない。また、管理者が顧客データを保護できない」

   **AI**: 「顧客データの保護が重要なのですね。この機能で『絶対にやってはいけないこと』はありますか？」

   **User**: 「データ漏洩。SOC2準拠が必要」

   **AI**: 「SOC2準拠が必要とのこと。この機能が『成功した』と言えるのはどんな状態ですか？」

   **User**: 「ログイン成功率99%以上、不正アクセスゼロ」

   **AI**: 「理解しました。確認させてください：
   - **表面的要求**: ユーザーがログインできること
   - **真の目的**: SOC2準拠でセキュアな顧客データ保護
   - **成功基準**: ログイン成功率99%以上、不正アクセスゼロ
     この理解で正しいですか？」

3. **MECE Analysis**:
   - User Journey: Login → Session → Logout → Error handling
   - Data: Credentials(C), Session(RUD), Audit Log(CR)
   - Security: Authentication, Authorization, Encryption, Audit

4. **Generate Requirements**:

   ```markdown
   ## True Purpose Statement

   - Surface Request: ユーザーログイン機能
   - True Purpose: SOC2準拠のセキュアな顧客データ保護基盤
   - Key Insight: 単なるログインではなく、コンプライアンス要件が重要

   ### REQ-AUTH-001: User Login

   WHEN a user provides valid credentials,
   THEN the authentication system SHALL authenticate the user
   AND the system SHALL create a session
   AND the system SHALL redirect to dashboard.

   **MECE Category**: User Journey - During

   ### REQ-AUTH-002: Audit Logging (SOC2)

   The authentication system SHALL log all authentication events
   with timestamp, user ID, IP address, and result.

   **MECE Category**: Cross-Cutting - Security/Compliance
   ```

5. **Save to Output Directory**: `storage/specs/authentication-requirements.md`

6. **Summarize**: Present summary with MECE coverage report

---

## Tool Usage

### Required Tools:

- **Read**: Read steering files, existing specs
- **Write**: Create requirements document
- **AskUserQuestion**: Gather stakeholder input (if needed)
- **Grep**: Search for existing implementations (brownfield)

### Optional Tools:

- **WebSearch**: Research best practices (if needed)
- **mcp**context7**get-library-docs**: Get framework documentation

---

## Validation Checklist

Before completing, verify:

- [ ] Interactive dialogue conducted (TRUE PURPOSE discovered)
- [ ] MECE analysis completed (all dimensions covered)
- [ ] Steering context read and applied
- [ ] All requirements in EARS format
- [ ] Requirement IDs assigned (REQ-XXX-NNN)
- [ ] MECE category assigned to each requirement
- [ ] Acceptance criteria defined for each requirement
- [ ] Priority assigned (P0/P1/P2/P3)
- [ ] Non-functional requirements included
- [ ] Constitutional validation passed
- [ ] Document saved to storage/specs/
- [ ] Summary with MECE coverage presented to user

---

## Edge Cases

### No Steering Files

If `steering/` doesn't exist:

```markdown
⚠️ **Steering files not found**

Please run `/sdd-steering` first to generate project context.

Steering provides critical context for requirements generation:

- Product goals and users
- Architecture patterns
- Technology constraints
```

### Brownfield with Existing Requirements

If `storage/specs/{{feature-name}}-requirements.md` exists:

- Read existing file
- Ask user: Update existing or create new version?
- If update: Create delta specification (ADDED/MODIFIED/REMOVED)

---

**Output Directory Summary**:

- Requirements documents: `storage/specs/{{feature-name}}-requirements.md`
- Japanese version: `storage/specs/{{feature-name}}-requirements.ja.md`

---

**Execution**: Begin interactive dialogue now for the specified feature.

---

**Execution**: Begin requirements generation now for the specified feature.
