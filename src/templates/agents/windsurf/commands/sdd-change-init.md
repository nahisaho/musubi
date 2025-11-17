# SDD Change Init Command

Initialize a change proposal for brownfield projects.

---

## Instructions for GitHub Copilot

You are executing the `#sdd-change-init [change-name]` command to create a change proposal for an existing codebase.

### Command Format

```bash
#sdd-change-init add-2fa
#sdd-change-init migrate-to-graphql
#sdd-change-init refactor-auth-service
```

### Your Task

Generate a change proposal specification that documents what will be added, modified, or removed in the existing system.

---

## Process

### 1. Read Steering Context (Article VI)

**IMPORTANT**: Before starting, read steering files to understand current system:

```bash
# Read these files first
steering/product.md      # Current product context
steering/structure.md    # Existing architecture
steering/tech.md         # Current technology stack
```

**Extract**:

- Current architecture patterns
- Existing components
- Technology stack
- Known constraints

---

### 2. Analyze Existing System

**Research Current Implementation**:

```bash
# Search for related code
grep -r "{{related-feature}}" src/
grep -r "{{related-feature}}" lib/

# Find existing requirements
ls storage/specs/*requirements.md

# Check existing design documents
ls storage/specs/*design.md
```

**Document Current State**:

- What exists now?
- What components are affected?
- What dependencies exist?
- What tests cover this area?

---

### 3. Gather Change Requirements

**Methods**:

#### A. Stakeholder Interview

Use `AskUserQuestion` tool to ask:

- Why is this change needed?
- What problem does it solve?
- What are the business drivers?
- What is the scope of the change?
- What must NOT change (backward compatibility)?
- What is the timeline/deadline?

#### B. Impact Analysis

Identify affected areas:

- [ ] Frontend components
- [ ] Backend services
- [ ] Database schema
- [ ] APIs (internal/external)
- [ ] Third-party integrations
- [ ] Tests
- [ ] Documentation

---

### 4. Create Change Proposal Document

Use template from `templates/change-proposal.md`:

**Structure**:

```markdown
# Change Proposal: {{CHANGE_NAME}}

## Metadata

- **Change ID**: CHG-{{NUMBER}}
- **Status**: Proposed
- **Created**: {{DATE}}
- **Author**: {{AUTHOR}}
- **Priority**: P0/P1/P2/P3
- **Type**: Feature | Enhancement | Refactor | Bug Fix | Migration

## Executive Summary

[2-3 sentences describing the change and its business value]

## Current State

### Existing Functionality

[What exists now]

### Problems/Limitations

[What problems does this change solve]

### Affected Components

- Component A (lib/component-a/)
- Component B (src/services/component-b/)
- Database: users table
- API: /api/auth endpoints

## Proposed Change

### ADDED Requirements

#### REQ-NEW-001: [New Requirement Title]

[EARS Pattern]

**Justification**: Why this is needed
**Impact**: What components are affected
**Breaking Change**: Yes/No

[Repeat for all new requirements]

---

### MODIFIED Requirements

#### REQ-AUTH-001: [Existing Requirement - MODIFIED]

**Previous Behavior**:
[What it did before]

**New Behavior**:
[What it will do after]

**Reason**: Why we're changing it
**Breaking Change**: Yes/No
**Migration Path**: How to migrate existing data/code
**Backward Compatibility**: Details

[Repeat for all modified requirements]

---

### REMOVED Requirements

#### REQ-AUTH-015: [Feature Being Removed]

**Current Behavior**: [What it does now]
**Reason for Removal**: [Why we're removing it]
**Breaking Change**: Yes
**Deprecation Period**: 30/60/90 days
**Migration Path**: Alternative approach
**User Communication**: Email/in-app notice plan

[Repeat for all removed requirements]

## Impact Analysis

### Breaking Changes

| Change                  | Component            | Severity | Mitigation                       |
| ----------------------- | -------------------- | -------- | -------------------------------- |
| API schema change       | /api/auth            | High     | Version API, 6-month deprecation |
| Database column removal | users.remember_token | Medium   | Data migration script            |

### Dependencies

- [ ] Requires library upgrade: prisma@5.0 → 6.0
- [ ] Requires new service: Redis for session storage
- [ ] Affects: mobile app (API changes)
- [ ] Affects: partner integrations (webhook schema)

### Risks

| Risk                       | Probability | Impact | Mitigation                 |
| -------------------------- | ----------- | ------ | -------------------------- |
| Data loss during migration | Low         | High   | Backup + rollback plan     |
| Performance degradation    | Medium      | Medium | Load testing before deploy |

### Testing Requirements

- [ ] Unit tests for new functions
- [ ] Integration tests for modified APIs
- [ ] E2E tests for user workflows
- [ ] Performance tests (load/stress)
- [ ] Security audit (if auth/payment related)
- [ ] Backward compatibility tests

## Implementation Plan

### Phase 1: Preparation (Week 1)

- [ ] Create feature flag: `enable_{{feature}}`
- [ ] Set up monitoring/alerts
- [ ] Write migration scripts
- [ ] Update CI/CD pipeline

### Phase 2: Development (Week 2-3)

- [ ] Implement new requirements (library-first)
- [ ] Modify existing code
- [ ] Write tests (80%+ coverage)
- [ ] Update documentation

### Phase 3: Testing (Week 4)

- [ ] QA testing
- [ ] Performance testing
- [ ] Security review
- [ ] Stakeholder demo

### Phase 4: Deployment (Week 5)

- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production (canary: 5% → 50% → 100%)
- [ ] Monitor metrics

### Phase 5: Cleanup (Week 6)

- [ ] Remove feature flag (after 2 weeks stable)
- [ ] Archive old code
- [ ] Update steering files

## Rollback Plan

### Trigger Conditions

- Error rate > 1%
- P95 latency > 500ms
- Critical bug reported
- Data inconsistency detected

### Rollback Steps

1. Disable feature flag
2. Revert database migration (run rollback script)
3. Deploy previous version
4. Verify system health
5. Communicate to stakeholders

### Rollback Time

- Estimated: 15 minutes
- Tested: Yes/No

## Success Metrics

### Acceptance Criteria

- [ ] All requirements implemented
- [ ] Test coverage ≥ 80%
- [ ] No P0/P1 bugs
- [ ] Performance within SLA
- [ ] Security audit passed

### KPIs

- Response time: < 200ms (P95)
- Error rate: < 0.1%
- User adoption: 50% within 1 month
- Customer satisfaction: NPS > 8

## Communication Plan

### Stakeholders

| Stakeholder      | Communication      | Timing                |
| ---------------- | ------------------ | --------------------- |
| Engineering team | Kickoff meeting    | Week 1 Day 1          |
| Product team     | Weekly updates     | Every Monday          |
| Customers        | Email notification | 2 weeks before launch |
| Support team     | Training session   | 1 week before launch  |

### Documentation Updates

- [ ] API documentation
- [ ] User guide
- [ ] Migration guide
- [ ] Changelog
- [ ] Release notes

## Constitutional Compliance

### Article IV: EARS Format

- [ ] All new requirements use EARS patterns
- [ ] No ambiguous keywords (SHOULD, MUST, MAY)

### Article V: Traceability

- [ ] Change ID assigned (CHG-NNN)
- [ ] All requirements have IDs
- [ ] Links to affected components

### Article I & II: Library-First + CLI

- [ ] New features implemented in lib/
- [ ] CLI interface available

## Appendix

### References

- Original requirements: `storage/specs/{{feature}}-requirements.md`
- Current design: `storage/specs/{{feature}}-design.md`
- Related issues: #123, #456

### Change History

| Version | Date     | Author     | Changes          |
| ------- | -------- | ---------- | ---------------- |
| 1.0     | {{DATE}} | {{AUTHOR}} | Initial proposal |
```

---

### 5. Assign Change ID

**Format**: `CHG-[NUMBER]`

**Examples**:

- `CHG-001` - First change proposal
- `CHG-042` - 42nd change proposal

**Rules**:

- All uppercase
- Sequential numbering starting from 001
- Unique across entire project
- Track in `storage/changes/change-log.md`

---

### 6. Categorize Change Type

**Types**:

- **Feature**: New user-facing functionality
- **Enhancement**: Improvement to existing feature
- **Refactor**: Code restructuring (no behavior change)
- **Bug Fix**: Correcting incorrect behavior
- **Migration**: Technology/platform upgrade
- **Performance**: Optimization work
- **Security**: Security enhancement

**Priority**:

- **P0**: Critical, blocking production issue
- **P1**: High priority, needed for next release
- **P2**: Medium priority, nice to have
- **P3**: Low priority, future consideration

---

### 7. Impact Analysis

**Assess Breaking Changes**:

````markdown
### Breaking Changes Assessment

#### API Changes

- **Endpoint**: `/api/auth/login`
- **Change**: Add required field `device_id`
- **Breaking**: Yes
- **Affected**: Mobile app, web app, partner integrations
- **Mitigation**:
  - Version API: `/v2/auth/login`
  - Deprecation period: 6 months
  - Communication: Email all partners 3 months before sunset

#### Database Changes

- **Table**: `users`
- **Change**: Remove column `remember_token`
- **Breaking**: Yes
- **Affected**: Session management, remember me feature
- **Migration**:

  ```sql
  -- Backup data
  CREATE TABLE users_remember_token_backup AS
  SELECT id, remember_token FROM users WHERE remember_token IS NOT NULL;

  -- Remove column
  ALTER TABLE users DROP COLUMN remember_token;
  ```
````

- **Rollback**: Restore from backup table

````

**Dependency Analysis**:
- List all affected services/components
- Identify version requirements
- Check for circular dependencies
- Verify compatibility

---

### 8. Create Traceability Matrix

```markdown
## Traceability Matrix

| Change Requirement | Affected Component | Current Requirement | Action |
|--------------------|-------------------|---------------------|--------|
| REQ-NEW-001: 2FA | lib/auth/ | - | ADD |
| REQ-AUTH-001: Password | lib/auth/password.ts | REQ-AUTH-001 | MODIFY |
| REQ-AUTH-015: Remember Me | lib/auth/session.ts | REQ-AUTH-015 | REMOVE |
````

---

### 9. Save Document (Bilingual)

**IMPORTANT**: Create BOTH English and Japanese versions.

**English version (Primary/Reference)**:
Save to: `storage/changes/{{change-name}}-proposal.md`

**Japanese version (Translation)**:
Save to: `storage/changes/{{change-name}}-proposal.ja.md`

**File Naming**:

- Use kebab-case
- Include change name
- Add `-proposal` suffix
- Add `.ja` before `.md` for Japanese version

**Examples**:

- `storage/changes/add-2fa-proposal.md` (English)
- `storage/changes/add-2fa-proposal.ja.md` (Japanese)

**Update Change Log**:
Add entry to `storage/changes/change-log.md`:

```markdown
| CHG-042 | add-2fa | Proposed | 2025-11-17 | Two-factor authentication |
```

---

### 10. Generate Summary

Present summary to user:

```markdown
## ✅ Change Proposal Created

**Change**: {{CHANGE_NAME}}
**Change ID**: CHG-{{NUMBER}}
**Files**:

- English: storage/changes/{{change-name}}-proposal.md
- Japanese: storage/changes/{{change-name}}-proposal.ja.md

### Summary:

- **Type**: {{TYPE}}
- **Priority**: {{PRIORITY}}
- **Status**: Proposed

### Impact:

- **ADDED Requirements**: [N]
- **MODIFIED Requirements**: [N]
- **REMOVED Requirements**: [N]
- **Breaking Changes**: Yes/No
- **Affected Components**: [N]

### Timeline:

- **Development**: [X] weeks
- **Testing**: [X] weeks
- **Deployment**: [X] weeks
- **Total**: [X] weeks

### Risks:

- High: [N]
- Medium: [N]
- Low: [N]

### Next Steps:

1. Review proposal with stakeholders
2. Get approval from product/engineering leads
3. Run impact analysis: `#sdd-change-apply {{change-name}}`
4. Implement changes following the plan
```

---

## Example Execution

### User Command:

```bash
#sdd-change-init add-2fa
```

### GitHub Copilot Actions:

1. **Read Steering**:
   - `steering/structure.md` → Current auth in `lib/auth/`
   - `steering/tech.md` → Using Prisma, PostgreSQL
   - `steering/product.md` → B2B SaaS, security critical

2. **Analyze Existing**:

   ```bash
   grep -r "authentication" src/
   # Found: lib/auth/password.ts, lib/auth/session.ts
   ```

3. **Ask User**:

   ```
   Questions about 2FA implementation:
   1. 2FA methods: SMS, TOTP (Google Authenticator), both?
   2. Required for all users or optional?
   3. Backup codes needed?
   4. Grace period for existing users?
   ```

4. **Generate Proposal**:

   ```markdown
   # Change Proposal: add-2fa

   ## ADDED Requirements

   ### REQ-NEW-001: TOTP Generation

   WHEN a user enables 2FA,
   THEN the system SHALL generate a TOTP secret
   AND the system SHALL display QR code
   AND the system SHALL require verification code.

   ## MODIFIED Requirements

   ### REQ-AUTH-001: Login Flow (MODIFIED)

   **Previous**: Email + password → session
   **New**: Email + password → (if 2FA enabled) → OTP → session

   **Breaking Change**: No (backward compatible)

   [... more details ...]
   ```

5. **Save**: `storage/changes/add-2fa-proposal.md`

6. **Summarize**: Present summary to user

---

## Validation Checklist

Before completing, verify:

- [ ] Steering context read and applied
- [ ] Current system analyzed
- [ ] Change ID assigned (CHG-NNN)
- [ ] ADDED/MODIFIED/REMOVED sections complete
- [ ] Impact analysis done
- [ ] Breaking changes identified
- [ ] Migration path documented
- [ ] Rollback plan defined
- [ ] Timeline estimated
- [ ] Risks assessed
- [ ] Documents saved to storage/changes/
- [ ] Change log updated
- [ ] Summary presented to user

---

## Edge Cases

### No Existing Requirements

If no requirements docs exist:

```markdown
⚠️ **No existing requirements found**

This appears to be a greenfield project. Consider using:

- `#sdd-requirements {{feature}}` for new features

Use change proposals for:

- Modifying existing documented features
- Refactoring existing code
```

### Change Already Exists

If `storage/changes/{{change-name}}-proposal.md` exists:

- Read existing file
- Ask user: Update existing or create new version?
- If update: Increment version number

---

**Execution**: Begin change proposal generation now for the specified change.
