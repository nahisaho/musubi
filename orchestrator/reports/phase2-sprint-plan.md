# Phase 2: Change Management
## Sprint Planning

**Duration**: Months 4-6 (Feb 2026 - May 2026)
**Status**: 🚀 Ready to Start
**Prerequisites**: ✅ Phase 1 Complete (v3.0.1 released)

---

## Objectives

Enable brownfield (existing project) support with delta specification tracking and change management workflow.

---

## Deliverables

### 1. Delta Specification System

**Priority**: P0 (Critical)

| Task | Description | Effort |
|------|-------------|--------|
| Delta format parser | Parse ADDED/MODIFIED/REMOVED/RENAMED markers | 2 days |
| Delta spec validator | Validate delta format compliance | 2 days |
| Storage workflow | `storage/changes/` directory management | 1 day |
| Archive mechanism | Merge completed deltas to `specs/` | 2 days |
| Change-impact-analyzer | Dependency graph and impact analysis | 3 days |

**Files to Create**:
- `src/managers/delta-spec.js`
- `src/validators/delta-format.js`
- `src/analyzers/impact-analyzer.js`
- `src/templates/shared/delta-spec-template.md`

### 2. Change Workflow Commands

**Priority**: P0 (Critical)

| Command | Description | Effort |
|---------|-------------|--------|
| `musubi-change init` | Create change proposal | 2 days |
| `musubi-change apply` | Apply change to codebase | 2 days |
| `musubi-change archive` | Archive completed change | 1 day |
| `musubi-change validate` | Validate delta format | 1 day |
| `musubi-change list` | List active changes | 1 day |
| `musubi-change show` | Show change details | 1 day |

**Files to Modify**:
- `bin/musubi-change.js` (enhance existing)

### 3. Validation Gates

**Priority**: P1 (High)

| Gate | Description | Effort |
|------|-------------|--------|
| Delta format validation | Validate ADDED/MODIFIED/REMOVED syntax | 2 days |
| Traceability validation | Verify requirement ↔ code ↔ test links | 3 days |
| Gap detection | Find orphaned requirements | 2 days |
| Coverage reporting | Calculate % implemented/tested | 2 days |

**Files to Create**:
- `src/validators/delta-format.js`
- `src/validators/traceability-validator.js`
- `src/reporters/coverage-report.js`

### 4. Traceability System Enhancement

**Priority**: P1 (High)

| Feature | Description | Effort |
|---------|-------------|--------|
| Matrix generation | Generate full traceability matrix | 2 days |
| Bi-directional links | REQ ↔ Design ↔ Task ↔ Code ↔ Test | 3 days |
| HTML report | Visual traceability report | 2 days |
| CI integration | GitHub Action for traceability check | 1 day |

**Files to Modify**:
- `src/analyzers/traceability.js` (enhance)
- `bin/musubi-trace.js` (enhance)

### 5. Documentation

**Priority**: P2 (Medium)

| Document | Description | Effort |
|----------|-------------|--------|
| Delta spec guide | How to use delta specs | 1 day |
| Brownfield tutorial | Converting existing projects | 2 days |
| Change workflow guide | Change management process | 1 day |
| Traceability examples | Matrix examples | 1 day |

**Files to Create**:
- `website/guide/delta-specs.md`
- `website/guide/brownfield.md`
- `website/guide/change-management.md`
- `website/examples/traceability-matrix.md`

---

## Sprint Breakdown

### Sprint 2.1 (Week 1-2) ✅ COMPLETE
- [x] Delta format parser (`DeltaSpecManager.parseDeltas`)
- [x] Delta spec validator (`DeltaFormatValidator`)
- [x] Storage workflow (`storage/changes/` + `delta-spec.js`)
- [x] CLI enhancements (show, impact, approve, reject, create, validate-all)
- [x] 24 unit tests (all passing)

### Sprint 2.2 (Week 3-4) ✅ COMPLETE
- [x] Impact Analyzer (`src/analyzers/impact-analyzer.js`)
  - Full dependency chain analysis
  - Risk identification and recommendations
  - Category and level-based impact scoring
- [x] Archive mechanism enhanced (DeltaSpecManager integration)
- [x] CLI enhancements:
  - Enhanced `impact` command with full analysis
  - New `diff` command for before/after comparison
  - New `status` command for workflow summary
- [x] 29 unit tests for Impact Analyzer (all passing)

### Sprint 2.3 (Week 5-6) ✅ COMPLETE
- [x] Traceability validation (REQ ↔ Design ↔ Code ↔ Test)
  - TraceabilityValidator with configurable strictness (strict/standard/relaxed)
  - Rule-based validation with severity levels (ERROR/WARNING/INFO)
- [x] Gap detection (orphaned requirements)
  - Orphaned item detection for requirements, design, and code
- [x] Coverage reporting
  - CoverageReporter with multiple formats (markdown/json/html/text)
- [x] CLI enhancements:
  - `strict-validate` command for CI/CD integration
  - `report` command for coverage report generation
  - `ci-check` command with exit codes
- [x] 45 unit tests (24 TraceabilityValidator + 21 CoverageReporter)

### Sprint 2.4 (Week 7-8) ✅ COMPLETE
- [x] Bi-directional traceability links
  - Forward links: REQ → Design → Task → Code → Test
  - Backward links: Test → Code → Task → Design → REQ
  - `bidirectional` command for analysis
- [x] HTML report generation
  - Interactive traceability matrix visualization
  - Light/dark theme support
  - Expandable/collapsible orphaned sections
  - `html-report` command
- [x] CI integration
  - GitHub Action workflow (`traceability-check.yml`)
  - `ci-check` command with exit codes
  - `strict-validate` command
- [x] 27 unit tests for TraceabilityMatrixReport

### Sprint 2.5 (Week 9-10)
- [ ] Documentation
- [ ] Testing and bug fixes
- [ ] Phase 2 release (v3.1.0)

---

## Acceptance Criteria

- [ ] Delta specs validate correctly (ADDED/MODIFIED/REMOVED)
- [ ] Change workflow creates, applies, and archives changes
- [ ] Traceability matrix shows 100% coverage
- [ ] Gap detection identifies orphaned requirements
- [ ] Brownfield tutorial demonstrates full workflow
- [ ] All tests pass (≥80% coverage)
- [ ] Documentation complete

---

## Dependencies

| Dependency | Status |
|------------|--------|
| Phase 1 complete | ✅ v3.0.1 released |
| CLI infrastructure | ✅ 19 commands |
| Traceability base | ✅ `musubi-trace` exists |
| Change base | ✅ `musubi-change` exists |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Complex delta parsing | Start with simple format, iterate |
| Performance with large codebases | Incremental processing, caching |
| Traceability false positives | Configurable strictness levels |

---

## Next Actions

1. **Start Sprint 2.1**: Delta format parser implementation
2. **Create tests**: Test cases for delta spec validation
3. **Review existing**: Audit `musubi-change.js` for enhancements needed

---

**Created**: December 8, 2025
**Target Completion**: May 16, 2026
