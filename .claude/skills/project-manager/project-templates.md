# Project Management Templates

## Overview

Templates for project planning, tracking, and reporting.

---

## Project Charter Template

```markdown
# Project Charter: [Project Name]

## Overview
| Field | Value |
|-------|-------|
| Project Name | [Name] |
| Project Manager | [Name] |
| Sponsor | [Name] |
| Start Date | YYYY-MM-DD |
| Target End Date | YYYY-MM-DD |
| Status | Planning / Active / Complete |

---

## 1. Project Purpose
[Why are we doing this project?]

## 2. Objectives
- [Objective 1]
- [Objective 2]
- [Objective 3]

## 3. Scope

### In Scope
- [Item 1]
- [Item 2]

### Out of Scope
- [Item 1]
- [Item 2]

## 4. Deliverables
| Deliverable | Description | Due Date |
|-------------|-------------|----------|
| [D1] | [Description] | [Date] |
| [D2] | [Description] | [Date] |

## 5. Success Criteria
- [Criterion 1]
- [Criterion 2]

## 6. Stakeholders
| Name | Role | Involvement |
|------|------|-------------|
| [Name] | Sponsor | Approver |
| [Name] | Lead Developer | Contributor |

## 7. Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk 1] | High | High | [Mitigation] |

## 8. Budget
| Category | Amount |
|----------|--------|
| Development | $X |
| Infrastructure | $Y |
| Total | $Z |

## 9. Approvals
| Name | Role | Date | Signature |
|------|------|------|-----------|
| [Name] | Sponsor | | |
| [Name] | PM | | |
```

---

## Sprint Planning Template

```markdown
# Sprint [N] Planning

**Sprint Duration**: [Start Date] - [End Date] (2 weeks)
**Sprint Goal**: [One sentence goal]

---

## Capacity

| Team Member | Capacity (days) | Notes |
|-------------|-----------------|-------|
| [Name] | 8 | PTO Friday |
| [Name] | 10 | Full capacity |
| **Total** | **18** | |

---

## Sprint Backlog

| ID | Story | Points | Assignee | Status |
|----|-------|--------|----------|--------|
| US-001 | [User story] | 5 | [Name] | To Do |
| US-002 | [User story] | 3 | [Name] | To Do |
| **Total** | | **8** | | |

---

## Technical Tasks

| Task | Story | Estimate | Assignee |
|------|-------|----------|----------|
| [Task 1] | US-001 | 4h | [Name] |
| [Task 2] | US-001 | 2h | [Name] |

---

## Dependencies

| Dependency | From | Status |
|------------|------|--------|
| [Dependency] | [Team/System] | Pending |

---

## Definition of Done

- [ ] Code complete and reviewed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Product owner approved
```

---

## Status Report Template

```markdown
# Weekly Status Report

**Project**: [Project Name]
**Period**: [Start Date] - [End Date]
**Author**: [Name]

---

## Summary

🟢 On Track | 🟡 At Risk | 🔴 Off Track

**Overall Status**: 🟢

---

## Accomplishments This Week

- [Accomplishment 1]
- [Accomplishment 2]
- [Accomplishment 3]

---

## Planned for Next Week

- [ ] [Task 1]
- [ ] [Task 2]
- [ ] [Task 3]

---

## Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Sprint velocity | 30 pts | 28 pts | 🟢 |
| Bug count | < 5 | 3 | 🟢 |
| Test coverage | > 80% | 75% | 🟡 |

---

## Risks and Issues

### Risks
| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| [Risk] | Medium | High | [Mitigation] | [Name] |

### Issues
| Issue | Impact | Action | Owner | Due |
|-------|--------|--------|-------|-----|
| [Issue] | [Impact] | [Action] | [Name] | [Date] |

---

## Blockers

- [ ] [Blocker 1] - Need [action] from [person]

---

## Resource Requests

- [Request 1]
```

---

## Meeting Notes Template

```markdown
# Meeting Notes

**Meeting**: [Meeting Name]
**Date**: YYYY-MM-DD HH:MM
**Attendees**: [Names]
**Facilitator**: [Name]
**Note Taker**: [Name]

---

## Agenda

1. [Topic 1] (10 min)
2. [Topic 2] (15 min)
3. [Topic 3] (10 min)

---

## Discussion Notes

### Topic 1: [Name]
- [Key point]
- [Key point]
- **Decision**: [Decision made]

### Topic 2: [Name]
- [Key point]
- **Decision**: [Decision made]

---

## Action Items

| Action | Owner | Due Date |
|--------|-------|----------|
| [Action 1] | [Name] | [Date] |
| [Action 2] | [Name] | [Date] |

---

## Decisions Made

1. [Decision 1]
2. [Decision 2]

---

## Next Meeting

**Date**: YYYY-MM-DD
**Topics**: [Topics for next meeting]
```

---

## Retrospective Template

```markdown
# Sprint [N] Retrospective

**Date**: YYYY-MM-DD
**Facilitator**: [Name]
**Participants**: [Names]

---

## What Went Well 👍

- [Item 1]
- [Item 2]
- [Item 3]

---

## What Could Be Improved 👎

- [Item 1]
- [Item 2]
- [Item 3]

---

## Action Items

| Action | Owner | Status |
|--------|-------|--------|
| [Action 1] | [Name] | Open |
| [Action 2] | [Name] | Open |

---

## Previous Action Items

| Action | Owner | Status |
|--------|-------|--------|
| [Previous action] | [Name] | ✅ Done |
| [Previous action] | [Name] | 🔄 In Progress |

---

## Team Health

| Category | Score (1-5) |
|----------|-------------|
| Collaboration | ⭐⭐⭐⭐ |
| Velocity | ⭐⭐⭐ |
| Quality | ⭐⭐⭐⭐ |
| Morale | ⭐⭐⭐⭐ |
```

---

## RACI Matrix Template

```markdown
# RACI Matrix

| Task | PM | Dev Lead | Developer | QA | Stakeholder |
|------|:--:|:--------:|:---------:|:--:|:-----------:|
| Requirements | A | C | I | C | R |
| Architecture | C | R | C | I | I |
| Development | I | A | R | C | I |
| Testing | I | C | C | R | I |
| Deployment | A | R | C | C | I |
| Sign-off | A | I | I | I | R |

**Legend**:
- **R** = Responsible (does the work)
- **A** = Accountable (final decision)
- **C** = Consulted (provides input)
- **I** = Informed (kept updated)
```
