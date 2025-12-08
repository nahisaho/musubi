# Change Impact Analysis

## Overview

Framework for analyzing the impact of proposed changes on a system.

---

## Impact Analysis Process

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Identify │───▶│ Analyze  │───▶│ Assess   │───▶│ Document │
│  Change  │    │ Impact   │    │  Risk    │    │ Decision │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## Change Request Template

```markdown
# Change Impact Analysis: [Change Name]

## Change Overview
| Field | Value |
|-------|-------|
| Request ID | CHG-[XXX] |
| Requested By | [Name] |
| Date | YYYY-MM-DD |
| Priority | Low / Medium / High / Critical |
| Status | Draft / Under Review / Approved / Rejected |

---

## 1. Change Description

### What is being changed?
[Clear description of the proposed change]

### Why is this change needed?
[Business justification]

### What is the expected outcome?
[Success criteria]

---

## 2. Scope Analysis

### Files Affected

| File/Module | Change Type | Effort |
|-------------|-------------|--------|
| src/auth/login.ts | Modify | Medium |
| src/api/users.ts | Modify | Low |
| tests/auth.test.ts | Add | Medium |

### Dependencies

| Dependency | Impact | Action Needed |
|------------|--------|---------------|
| User Service | Breaking | Update API |
| Auth Library | Compatible | None |
| Database | Schema change | Migration |

### APIs Affected

| API | Change | Breaking |
|-----|--------|----------|
| POST /login | New field | No |
| GET /user | New response field | No |

---

## 3. Impact Matrix

### Technical Impact

| Area | Impact Level | Description |
|------|--------------|-------------|
| Performance | Low | No significant change |
| Security | Medium | New auth flow |
| Scalability | Low | No change |
| Maintainability | Medium | Added complexity |

### Business Impact

| Area | Impact Level | Description |
|------|--------------|-------------|
| Users | Medium | New login step |
| Operations | Low | Minor training |
| Revenue | None | N/A |

---

## 4. Risk Assessment

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User confusion | Medium | Medium | Clear UI guidance |
| Integration failure | Low | High | Thorough testing |
| Performance regression | Low | Medium | Load testing |

### Rollback Plan
1. [Step 1 to revert]
2. [Step 2 to revert]
3. [Verification steps]

---

## 5. Implementation Plan

### Tasks

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Update auth logic | [Name] | 2 days | None |
| Add tests | [Name] | 1 day | Auth logic |
| Update documentation | [Name] | 0.5 days | Implementation |

### Timeline

| Phase | Start | End | Owner |
|-------|-------|-----|-------|
| Development | MM/DD | MM/DD | Dev Team |
| Testing | MM/DD | MM/DD | QA Team |
| Deployment | MM/DD | MM/DD | DevOps |

---

## 6. Testing Requirements

- [ ] Unit tests for changed code
- [ ] Integration tests for affected APIs
- [ ] Regression testing
- [ ] Performance testing
- [ ] User acceptance testing

---

## 7. Communication Plan

| Audience | Channel | When | Owner |
|----------|---------|------|-------|
| Dev Team | Slack | Before start | [Name] |
| Stakeholders | Email | Before deploy | [Name] |
| Users | In-app | After deploy | [Name] |

---

## 8. Approval

| Approver | Role | Decision | Date |
|----------|------|----------|------|
| [Name] | Tech Lead | | |
| [Name] | Product Owner | | |
| [Name] | Security | | |

---

## 9. Post-Implementation

### Verification Steps
- [ ] [Verification 1]
- [ ] [Verification 2]

### Monitoring
- [ ] Error rates checked
- [ ] Performance baseline compared
- [ ] User feedback collected
```

---

## Dependency Analysis

### Code Dependency Map

```
┌─────────────────┐
│   Changed File   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐  ┌───────┐
│Direct │  │Direct │
│Dep 1  │  │Dep 2  │
└───┬───┘  └───┬───┘
    │          │
    ▼          ▼
┌───────┐  ┌───────┐
│Indirect│ │Indirect│
│Dep    │  │Dep    │
└───────┘  └───────┘
```

### Finding Dependencies

```bash
# Find files that import the changed file
grep -r "import.*from.*'./changed-file'" src/

# TypeScript: Find usages
npx ts-unused-exports tsconfig.json

# Git: Find files that change together
git log --oneline --name-only -- src/changed-file.ts | \
  grep -v "^[a-f0-9]" | sort | uniq -c | sort -rn
```

---

## Impact Severity Matrix

| Probability ↓ / Impact → | Low | Medium | High |
|---------------------------|-----|--------|------|
| **High** | Medium | High | Critical |
| **Medium** | Low | Medium | High |
| **Low** | Low | Low | Medium |

---

## Quick Impact Checklist

### Before Approving
- [ ] All affected files identified
- [ ] Breaking changes documented
- [ ] Dependencies analyzed
- [ ] Risks assessed
- [ ] Rollback plan exists
- [ ] Testing requirements defined
- [ ] Timeline realistic
- [ ] Stakeholders notified

### Red Flags
- 🚩 Many files affected
- 🚩 Database schema changes
- 🚩 Public API breaking changes
- 🚩 Security-related changes
- 🚩 No rollback plan
- 🚩 No testing plan
- 🚩 Rushed timeline
