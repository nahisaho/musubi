# QA Plan Template

## Overview

Template for creating comprehensive Quality Assurance plans.

---

## QA Plan Document

```markdown
# QA Plan: [Project/Feature Name]

## Document Information

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Date | YYYY-MM-DD |
| Author | quality-assurance |
| Status | Draft / Approved |
| Reviewers | [Names] |

---

## 1. Introduction

### 1.1 Purpose
[Describe the purpose of this QA plan]

### 1.2 Scope
- **In Scope**: [What will be tested]
- **Out of Scope**: [What won't be tested]

### 1.3 References
- Requirements: [Link to requirements]
- Design: [Link to design docs]
- Related ADRs: [Links]

---

## 2. Test Strategy

### 2.1 Test Levels

| Level | Description | Tools |
|-------|-------------|-------|
| Unit | Individual functions/methods | Jest/pytest |
| Integration | Component interactions | Supertest |
| E2E | Full user journeys | Playwright |
| Performance | Load/stress testing | k6 |
| Security | Vulnerability testing | OWASP ZAP |

### 2.2 Test Types

- [ ] Functional Testing
- [ ] Regression Testing
- [ ] Smoke Testing
- [ ] Acceptance Testing
- [ ] Performance Testing
- [ ] Security Testing
- [ ] Accessibility Testing

### 2.3 Test Approach

**Test-First (Mandatory - Article III)**:
- All tests written before implementation
- Red-Green-Refactor cycle followed

**Integration-First (Article IX)**:
- Integration tests before unit tests
- E2E tests for critical paths

---

## 3. Test Environment

### 3.1 Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Developer testing | localhost |
| Staging | Integration testing | staging.example.com |
| Production | Live system | example.com |

### 3.2 Test Data

- **Strategy**: [Synthetic / Masked Production / Generated]
- **Reset Process**: [How test data is managed]
- **Sensitive Data**: [How handled]

---

## 4. Test Coverage Requirements

### 4.1 Coverage Targets

| Metric | Target | Current |
|--------|--------|---------|
| Line Coverage | 80% | - |
| Branch Coverage | 75% | - |
| Requirements Coverage | 100% | - |

### 4.2 Critical Paths

Must have 100% test coverage:
1. Authentication flow
2. Payment processing
3. User data operations

---

## 5. Entry/Exit Criteria

### 5.1 Entry Criteria
- [ ] Requirements approved
- [ ] Design complete
- [ ] Test environment ready
- [ ] Test data available

### 5.2 Exit Criteria
- [ ] All critical tests pass
- [ ] Coverage targets met
- [ ] No P1/P2 bugs open
- [ ] Performance targets met
- [ ] Security audit passed

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tight timeline | High | High | Early testing, automation |
| Environment issues | Medium | High | Backup environments |
| Data quality | Medium | Medium | Data validation |

---

## 7. Schedule

| Phase | Start | End | Owner |
|-------|-------|-----|-------|
| Test Planning | MM/DD | MM/DD | QA Lead |
| Test Development | MM/DD | MM/DD | QA Team |
| Test Execution | MM/DD | MM/DD | QA Team |
| Bug Fixes | MM/DD | MM/DD | Dev Team |
| Regression | MM/DD | MM/DD | QA Team |
| Sign-off | MM/DD | MM/DD | QA Lead |

---

## 8. Deliverables

- [ ] Test Plan (this document)
- [ ] Test Cases
- [ ] Test Reports
- [ ] Bug Reports
- [ ] Coverage Reports
- [ ] Sign-off Document

---

## 9. Roles & Responsibilities

| Role | Responsibility | Person |
|------|----------------|--------|
| QA Lead | Plan, coordinate | [Name] |
| QA Engineer | Execute tests | [Name] |
| Developer | Fix bugs, unit tests | [Name] |
| PM | Review, approve | [Name] |

---

## 10. Tools

| Purpose | Tool |
|---------|------|
| Test Management | [Tool name] |
| Bug Tracking | [Tool name] |
| Automation | [Tool name] |
| CI/CD | [Tool name] |
| Coverage | [Tool name] |

---

## Appendix

### A. Test Case Template
[Link to template]

### B. Bug Report Template
[Link to template]

### C. Glossary
[Terms and definitions]
```

---

## Quick QA Checklist

### Before Development
- [ ] Requirements are testable (EARS format)
- [ ] Acceptance criteria defined
- [ ] Test environment ready

### During Development
- [ ] Tests written first
- [ ] CI/CD running tests
- [ ] Code review includes test review

### Before Release
- [ ] All tests passing
- [ ] Coverage targets met
- [ ] No critical bugs open
- [ ] Performance validated
- [ ] Security checked
- [ ] Stakeholder sign-off
