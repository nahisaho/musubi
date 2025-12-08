# Release Plan Template

## Overview

Template for planning and executing software releases.

---

## Release Plan Document

```markdown
# Release Plan: v[X.Y.Z]

## Release Information

| Field | Value |
|-------|-------|
| Version | v[X.Y.Z] |
| Codename | [Optional] |
| Release Date | YYYY-MM-DD |
| Release Manager | [Name] |
| Status | Planning / Ready / Released |

---

## 1. Release Summary

### Highlights
[Brief summary of major changes in this release]

### Release Type
- [ ] Major (breaking changes)
- [ ] Minor (new features, backwards compatible)
- [ ] Patch (bug fixes only)

---

## 2. Features & Changes

### New Features
| ID | Feature | Owner | Status |
|----|---------|-------|--------|
| FEAT-001 | [Description] | [Name] | ✅ Done |
| FEAT-002 | [Description] | [Name] | ✅ Done |

### Bug Fixes
| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| BUG-001 | [Description] | High | ✅ Fixed |
| BUG-002 | [Description] | Medium | ✅ Fixed |

### Breaking Changes
| Change | Migration Path |
|--------|----------------|
| [Describe breaking change] | [How to migrate] |

### Deprecations
| Feature | Deprecated In | Remove In |
|---------|---------------|-----------|
| [Feature] | v[X.Y.Z] | v[X+1.0.0] |

---

## 3. Quality Checklist

### Testing
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance tests passing
- [ ] Security scan completed

### Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] CHANGELOG updated
- [ ] Migration guide (if breaking)

### Review
- [ ] Code review completed
- [ ] Security review completed
- [ ] Product owner sign-off

---

## 4. Deployment Plan

### Pre-Release Tasks
| Task | Owner | Due Date | Status |
|------|-------|----------|--------|
| Freeze feature branch | [Name] | MM/DD | ⬜ |
| Create release branch | [Name] | MM/DD | ⬜ |
| Final QA testing | [Name] | MM/DD | ⬜ |

### Deployment Steps
1. [ ] Create Git tag
2. [ ] Build release artifacts
3. [ ] Deploy to staging
4. [ ] Smoke test staging
5. [ ] Deploy to production
6. [ ] Smoke test production
7. [ ] Announce release

### Rollback Plan
**Trigger conditions**:
- Error rate > 1%
- P1 bug discovered
- Performance degradation > 20%

**Rollback steps**:
1. Revert to previous version
2. Notify stakeholders
3. Create incident ticket

---

## 5. Communication

### Internal
| Audience | Channel | When |
|----------|---------|------|
| Engineering | Slack #releases | Day of release |
| Support | Email | Day of release |
| All Hands | Meeting | Next all-hands |

### External
| Audience | Channel | When |
|----------|---------|------|
| Users | Release Notes | Day of release |
| Blog | Blog Post | Day of release |
| Social | Twitter | Day of release |

---

## 6. Post-Release

### Monitoring
- [ ] Error rates monitored for 24h
- [ ] Performance metrics tracked
- [ ] User feedback collected

### Follow-up
- [ ] Retro scheduled
- [ ] Metrics reviewed
- [ ] Lessons documented

---

## Appendix

### A. Version History
| Version | Date | Notes |
|---------|------|-------|
| v[X.Y.Z] | MM/DD | Current release |
| v[X.Y.Z-1] | MM/DD | Previous release |

### B. Related Links
- [Release Branch]
- [Test Reports]
- [CHANGELOG]
```

---

## Release Checklist

### 1 Week Before
- [ ] Feature freeze
- [ ] Create release branch
- [ ] Update version number
- [ ] Begin final testing

### 1 Day Before
- [ ] All tests passing
- [ ] Documentation complete
- [ ] CHANGELOG finalized
- [ ] Stakeholder sign-off

### Release Day
- [ ] Create Git tag
- [ ] Build and publish
- [ ] Deploy to production
- [ ] Announce release

### 1 Day After
- [ ] Monitor metrics
- [ ] Address urgent issues
- [ ] Collect feedback

---

## CHANGELOG Template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Features to be removed in future

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements

## [X.Y.Z] - YYYY-MM-DD

### Added
- Feature A (#123)
- Feature B (#124)

### Fixed
- Bug C (#125)
```
