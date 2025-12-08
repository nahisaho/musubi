# Gap Detection Rules

## Overview

Rules for detecting traceability gaps in MUSUBI SDD projects.

---

## Gap Types

### 1. Orphaned Requirements

**Definition**: Requirements with no design, code, or tests.

**Detection Rule**:
```python
for req in requirements:
    if req.id not in design.references:
        report_gap("orphaned_requirement", req.id, 
                   "Requirement not referenced in design")
```

**Severity**: 🔴 Critical

### 2. Orphaned Tests

**Definition**: Tests with no corresponding requirement.

**Detection Rule**:
```python
for test in tests:
    if not has_requirement_reference(test):
        report_gap("orphaned_test", test.id,
                   "Test has no requirement reference")
```

**Severity**: 🟠 Warning

### 3. Untested Code

**Definition**: Source files with no test coverage.

**Detection Rule**:
```python
for src_file in source_files:
    test_file = get_corresponding_test(src_file)
    if not exists(test_file):
        report_gap("untested_code", src_file,
                   "No test file found")
```

**Severity**: 🔴 Critical

### 4. Unimplemented Tasks

**Definition**: Tasks with no code.

**Detection Rule**:
```python
for task in tasks:
    if not exists(task.target_file):
        report_gap("unimplemented_task", task.id,
                   "Task has no implementation")
```

**Severity**: 🟠 Warning

### 5. Broken References

**Definition**: References to non-existent items.

**Detection Rule**:
```python
for ref in all_references:
    if not exists(ref.target):
        report_gap("broken_reference", ref.id,
                   f"Reference to non-existent {ref.target}")
```

**Severity**: 🔴 Critical

---

## Detection Scripts

### Find Orphaned Requirements

```bash
#!/bin/bash
# find-orphaned-requirements.sh

REQ_FILE="storage/features/$1/requirements.md"
DESIGN_FILE="storage/features/$1/design.md"

# Extract requirement IDs
grep -oP 'REQ-[\w-]+' "$REQ_FILE" | sort -u > /tmp/reqs.txt

# Check each in design
while read req_id; do
    if ! grep -q "$req_id" "$DESIGN_FILE" 2>/dev/null; then
        echo "ORPHAN: $req_id not in design"
    fi
done < /tmp/reqs.txt
```

### Find Untested Code

```bash
#!/bin/bash
# find-untested-code.sh

for src_file in src/**/*.ts; do
    test_file="${src_file/src\//tests/}"
    test_file="${test_file/.ts/.test.ts}"
    
    if [ ! -f "$test_file" ]; then
        echo "UNTESTED: $src_file"
    fi
done
```

---

## Gap Report Template

```markdown
# Traceability Gap Report

**Feature**: [Name]
**Date**: YYYY-MM-DD
**Auditor**: traceability-auditor

## Summary

| Gap Type | Count | Severity |
|----------|-------|----------|
| Orphaned Requirements | 2 | 🔴 Critical |
| Orphaned Tests | 1 | 🟠 Warning |
| Untested Code | 3 | 🔴 Critical |
| Broken References | 0 | - |

## Detailed Gaps

### Orphaned Requirements

| REQ ID | Description | Recommended Action |
|--------|-------------|-------------------|
| REQ-003 | 2FA login | Add to design or defer |
| REQ-007 | Email notify | Add to design |

### Untested Code

| File | Functions | Action |
|------|-----------|--------|
| src/auth/otp.ts | generateOTP | Create tests |
| src/user/profile.ts | updateAvatar | Create tests |

## Resolution Plan

1. [ ] Review REQ-003 with PM (defer/implement)
2. [ ] Create design for REQ-007
3. [ ] Write tests for otp.ts by Friday

## Constitutional Compliance

**Article V Status**: ❌ FAIL (gaps detected)
**Action Required**: Resolve gaps before merge
```

---

## Automated Gap Detection

```python
# gap_detector.py

class GapDetector:
    def __init__(self, feature_path):
        self.feature_path = feature_path
        self.gaps = []
    
    def detect_all(self):
        self.detect_orphaned_requirements()
        self.detect_orphaned_tests()
        self.detect_untested_code()
        self.detect_broken_references()
        return self.gaps
    
    def get_report(self):
        return {
            "feature": self.feature_path,
            "total_gaps": len(self.gaps),
            "critical": len([g for g in self.gaps if g.severity == "critical"]),
            "gaps": self.gaps,
            "compliant": len(self.gaps) == 0
        }
```

---

## Integration with CI/CD

```yaml
# .github/workflows/traceability.yml
name: Traceability Check

on:
  pull_request:
    paths:
      - 'storage/features/**'
      - 'src/**'
      - 'tests/**'

jobs:
  check-gaps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run gap detection
        run: python scripts/gap_detector.py
      - name: Fail on critical gaps
        run: |
          if grep -q "critical" gap_report.json; then
            echo "Critical gaps detected!"
            exit 1
          fi
```
