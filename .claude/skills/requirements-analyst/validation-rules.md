# Requirements Validation Rules

## Overview

This document defines the validation rules for EARS requirements in MUSUBI SDD.

---

## Automated Validation Rules

### Rule 1: Unique Requirement IDs

**Check**: Each requirement must have a unique identifier.

```python
def validate_unique_ids(requirements):
    ids = [req.id for req in requirements]
    duplicates = [id for id in ids if ids.count(id) > 1]
    
    if duplicates:
        FAIL(f"Duplicate requirement IDs: {duplicates}")
    
    PASS("All requirement IDs are unique")
```

**Examples**:
```
✅ PASS: REQ-001, REQ-002, REQ-003
❌ FAIL: REQ-001, REQ-002, REQ-001 (duplicate)
```

---

### Rule 2: EARS Pattern Compliance

**Check**: Each requirement follows EARS patterns.

```python
EARS_PATTERNS = [
    r"^(The (system|component|service|API) (SHALL|MUST))",  # Ubiquitous
    r"^(WHEN .+, the (system|component|service|API) (SHALL|MUST))",  # Event-driven
    r"^(WHILE .+, the (system|component|service|API) (SHALL|MUST))",  # State-driven
    r"^(WHERE .+, the (system|component|service|API) (SHALL|MUST))",  # Optional
    r"^(IF .+, THEN the (system|component|service|API) (SHALL|MUST))",  # Unwanted
]

def validate_ears_pattern(requirement):
    for pattern in EARS_PATTERNS:
        if re.match(pattern, requirement.text, re.IGNORECASE):
            return PASS(f"{requirement.id} follows EARS pattern")
    
    return FAIL(f"{requirement.id} does not follow EARS pattern")
```

---

### Rule 3: No Ambiguous Keywords

**Check**: Requirements must not contain ambiguous modal verbs.

```python
FORBIDDEN_KEYWORDS = [
    "should", "may", "could", "might", "would",
    "probably", "possibly", "hopefully", "ideally"
]

def validate_no_ambiguous_keywords(requirement):
    text_lower = requirement.text.lower()
    
    for keyword in FORBIDDEN_KEYWORDS:
        if keyword in text_lower:
            FAIL(f"{requirement.id} contains ambiguous keyword: '{keyword}'")
    
    PASS(f"{requirement.id} has no ambiguous keywords")
```

---

### Rule 4: Mandatory Keywords Present

**Check**: Requirements must contain SHALL or MUST.

```python
REQUIRED_KEYWORDS = ["SHALL", "MUST"]

def validate_mandatory_keywords(requirement):
    for keyword in REQUIRED_KEYWORDS:
        if keyword in requirement.text.upper():
            return PASS(f"{requirement.id} contains '{keyword}'")
    
    return FAIL(f"{requirement.id} missing SHALL or MUST")
```

---

### Rule 5: Atomic Requirements

**Check**: Each requirement describes a single action.

```python
ATOMIC_VIOLATIONS = [
    r"\bAND\b.*\bSHALL\b",  # Multiple SHALL with AND
    r"\bSHALL\b.*\bAND\b.*\bSHALL\b",  # Two SHALLs
    r"\bSHALL\b.*\bSHALL\b",  # Multiple SHALLs
]

def validate_atomic(requirement):
    for pattern in ATOMIC_VIOLATIONS:
        if re.search(pattern, requirement.text, re.IGNORECASE):
            WARN(f"{requirement.id} may not be atomic - consider splitting")
    
    PASS(f"{requirement.id} appears atomic")
```

---

### Rule 6: Measurable Criteria

**Check**: Non-functional requirements must have measurable criteria.

```python
NF_REQUIREMENT_PATTERN = r"REQ-NF-\d+"
MEASUREMENT_PATTERNS = [
    r"\d+\s*(ms|seconds|minutes|hours)",  # Time
    r"\d+\s*(MB|GB|KB)",  # Size
    r"\d+\s*%",  # Percentage
    r"\d+\s*(users|requests|connections)",  # Capacity
    r"\d+\.\d+%\s*uptime",  # Availability
]

def validate_measurable(requirement):
    if not re.match(NF_REQUIREMENT_PATTERN, requirement.id):
        return PASS(f"{requirement.id} is functional requirement")
    
    for pattern in MEASUREMENT_PATTERNS:
        if re.search(pattern, requirement.text):
            return PASS(f"{requirement.id} has measurable criteria")
    
    return WARN(f"{requirement.id} (non-functional) may lack measurable criteria")
```

---

### Rule 7: Testable Requirements

**Check**: Requirements must be verifiable through testing.

```python
UNTESTABLE_PATTERNS = [
    r"\buser-friendly\b",
    r"\bintuitive\b",
    r"\beasy to use\b",
    r"\bseamless\b",
    r"\brobust\b",
    r"\bscalable\b",  # Unless quantified
    r"\bfast\b",  # Unless quantified
]

def validate_testable(requirement):
    for pattern in UNTESTABLE_PATTERNS:
        if re.search(pattern, requirement.text, re.IGNORECASE):
            WARN(f"{requirement.id} contains vague term '{pattern}' - make testable")
    
    PASS(f"{requirement.id} appears testable")
```

---

### Rule 8: No Implementation Details

**Check**: Requirements should specify WHAT, not HOW.

```python
IMPLEMENTATION_PATTERNS = [
    r"\bRedis\b",
    r"\bPostgreSQL\b",
    r"\bMongoDB\b",
    r"\bReact\b",
    r"\bAWS\b",
    r"\bKubernetes\b",
    r"\bDocker\b",
]

def validate_no_implementation(requirement):
    for pattern in IMPLEMENTATION_PATTERNS:
        if re.search(pattern, requirement.text):
            WARN(f"{requirement.id} contains implementation detail: '{pattern}'")
    
    PASS(f"{requirement.id} appears technology-agnostic")
```

---

## Semantic Validation Rules

### Rule 9: Consistent Terminology

**Check**: Terms must be used consistently across requirements.

```python
def validate_terminology(requirements, glossary):
    for req in requirements:
        for term, definition in glossary.items():
            synonyms = definition.get("synonyms", [])
            for synonym in synonyms:
                if synonym in req.text and term not in req.text:
                    WARN(f"{req.id}: Use '{term}' instead of '{synonym}'")
    
    PASS("Terminology is consistent")
```

---

### Rule 10: No Conflicting Requirements

**Check**: Requirements must not contradict each other.

```python
def validate_no_conflicts(requirements):
    # Group by subject
    by_subject = group_by_subject(requirements)
    
    for subject, reqs in by_subject.items():
        # Check for conflicting actions
        actions = [extract_action(req) for req in reqs]
        if has_conflicts(actions):
            FAIL(f"Conflicting requirements for {subject}")
    
    PASS("No conflicts detected")
```

---

### Rule 11: Complete Coverage

**Check**: All use cases have corresponding requirements.

```python
def validate_coverage(requirements, use_cases):
    covered = set()
    for req in requirements:
        use_case = extract_use_case(req)
        if use_case:
            covered.add(use_case)
    
    missing = set(use_cases) - covered
    if missing:
        WARN(f"Use cases without requirements: {missing}")
    
    coverage_percent = len(covered) / len(use_cases) * 100
    REPORT(f"Use case coverage: {coverage_percent:.1f}%")
```

---

## Traceability Validation

### Rule 12: Forward Traceability

**Check**: Each requirement is traced to design.

```python
def validate_forward_traceability(requirements, design):
    untraced = []
    for req in requirements:
        if req.id not in design.requirement_references:
            untraced.append(req.id)
    
    if untraced:
        FAIL(f"Requirements not traced to design: {untraced}")
    
    PASS("All requirements traced to design")
```

---

### Rule 13: Backward Traceability

**Check**: Each design element traces back to requirement.

```python
def validate_backward_traceability(design, requirements):
    req_ids = {req.id for req in requirements}
    orphaned = []
    
    for component in design.components:
        for ref in component.requirement_refs:
            if ref not in req_ids:
                orphaned.append((component.name, ref))
    
    if orphaned:
        WARN(f"Design references non-existent requirements: {orphaned}")
    
    PASS("All design elements trace to valid requirements")
```

---

## Validation Report Template

```markdown
# Requirements Validation Report

**Document**: [Requirements Document Name]
**Date**: YYYY-MM-DD
**Validator**: requirements-analyst

## Summary

| Rule | Status | Issues |
|------|--------|--------|
| Unique IDs | ✅ PASS | 0 |
| EARS Pattern | ✅ PASS | 0 |
| No Ambiguous Keywords | ✅ PASS | 0 |
| Mandatory Keywords | ✅ PASS | 0 |
| Atomic Requirements | ⚠️ WARN | 2 |
| Measurable Criteria | ⚠️ WARN | 1 |
| Testable | ✅ PASS | 0 |
| No Implementation | ✅ PASS | 0 |
| Forward Traceability | ✅ PASS | 0 |

## Total: 15 requirements validated

### Passed: 15 (100%)
### Warnings: 3
### Failures: 0

## Issues

### Warnings

1. **REQ-USER-003**: May not be atomic - consider splitting
2. **REQ-AUTH-005**: May not be atomic - consider splitting  
3. **REQ-NF-002**: May lack measurable criteria

## Recommendations

1. Review REQ-USER-003 for splitting into multiple requirements
2. Add specific metrics to REQ-NF-002

## Conclusion

Requirements document is **APPROVED** with minor warnings.
```

---

## Validation Checklist (Manual)

For human review:

- [ ] Business stakeholders have reviewed requirements
- [ ] Technical feasibility confirmed by architect
- [ ] No missing edge cases
- [ ] Error handling requirements complete
- [ ] Security requirements addressed
- [ ] Performance requirements defined
- [ ] Internationalization considered
- [ ] Accessibility requirements included
