# Phase -1 Gates

## Overview

Phase -1 Gates are pre-implementation validation gates that MUST pass before any code is written. These gates enforce constitutional compliance and prevent governance violations early in the development lifecycle.

---

## Gate Structure

```
User Request
    │
    ▼
┌─────────────────────────────────────────┐
│           PHASE -1 GATES                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Gate 1: Steering Check          │   │
│  │ Gate 2: EARS Validation         │   │
│  │ Gate 3: Library-First Check     │   │
│  │ Gate 4: Test-First Confirmation │   │
│  │ Gate 5: Traceability Setup      │   │
│  │ Gate 6: Simplicity Gate         │   │
│  │ Gate 7: Anti-Abstraction Gate   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ALL GATES MUST PASS                    │
└─────────────────────────────────────────┘
    │
    ▼
Implementation Begins
```

---

## Gate 1: Steering Check (Article VI)

**Purpose**: Ensure project memory is consulted before work begins.

**Validation**:
```bash
# Check if steering files exist
required_files=(
    "steering/structure.md"
    "steering/tech.md"
    "steering/product.md"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        FAIL "Steering file missing: $file"
    fi
done

# Check if steering was read (agent must confirm)
PASS "Steering files exist and will be consulted"
```

**Pass Criteria**:
- [ ] `steering/structure.md` exists
- [ ] `steering/tech.md` exists
- [ ] `steering/product.md` exists
- [ ] Agent confirms steering review

**Failure Action**:
→ Run `steering` skill to generate missing files

---

## Gate 2: EARS Validation (Article IV)

**Purpose**: Ensure requirements use EARS format.

**Validation**:
```python
def validate_ears_format(requirements_file):
    """
    Check requirements for EARS patterns.
    """
    valid_patterns = [
        r"WHEN .+ (SHALL|MUST)",           # Event-driven
        r"WHILE .+ (SHALL|MUST)",          # State-driven
        r"WHERE .+ (SHALL|MUST)",          # Optional feature
        r"IF .+ THEN .+ (SHALL|MUST)",     # Conditional
        r"The system (SHALL|MUST)",        # Ubiquitous
    ]
    
    invalid_keywords = ["should", "may", "could", "might"]
    
    for line in requirements_file:
        if any(kw in line.lower() for kw in invalid_keywords):
            FAIL(f"Ambiguous keyword found: {line}")
        
        if "REQ-" in line and not any(re.match(p, line) for p in valid_patterns):
            WARN(f"Requirement may not follow EARS: {line}")
    
    PASS("All requirements follow EARS format")
```

**Pass Criteria**:
- [ ] All requirements use SHALL/MUST (not should/may)
- [ ] Requirements follow EARS patterns
- [ ] Each requirement has unique ID (REQ-XXX)

**Failure Action**:
→ Rewrite requirements with `requirements-analyst` skill

---

## Gate 3: Library-First Check (Article I)

**Purpose**: Ensure features are implemented as standalone libraries first.

**Validation**:
```bash
# For new features, check target directory
feature_path="$1"

if [[ "$feature_path" == *"/app/"* ]] || [[ "$feature_path" == *"/web/"* ]]; then
    # Check if corresponding lib exists
    lib_path=$(echo "$feature_path" | sed 's/app\//lib\//; s/web\//lib\//')
    
    if [ ! -d "$lib_path" ]; then
        FAIL "Feature must be in lib/ first before app/ or web/"
    fi
fi

PASS "Library-First principle satisfied"
```

**Pass Criteria**:
- [ ] New feature targets `lib/` directory first
- [ ] OR: Existing `lib/` module exists for the feature
- [ ] Library has no framework dependencies

**Failure Action**:
→ Restructure to create `lib/` module first

---

## Gate 4: Test-First Confirmation (Article III)

**Purpose**: Confirm tests will be written before implementation.

**Validation**:
```bash
# This is a confirmation gate - agent must commit to test-first
echo "TEST-FIRST CONFIRMATION REQUIRED"
echo ""
echo "Do you confirm that:"
echo "1. Tests will be written BEFORE implementation code?"
echo "2. Tests will be committed BEFORE source code?"
echo "3. Red-Green-Refactor cycle will be followed?"
echo ""

# Agent must explicitly confirm
if [ "$CONFIRMATION" != "yes" ]; then
    FAIL "Test-First commitment not confirmed"
fi

PASS "Test-First commitment confirmed"
```

**Pass Criteria**:
- [ ] Agent confirms test-first commitment
- [ ] Test file paths identified
- [ ] Test framework confirmed in steering/tech.md

**Failure Action**:
→ Cannot proceed until test-first is confirmed

---

## Gate 5: Traceability Setup (Article V)

**Purpose**: Ensure traceability chain is established.

**Validation**:
```python
def validate_traceability_setup(feature_name):
    """
    Verify traceability chain is ready.
    """
    required_artifacts = {
        "requirements": f"storage/features/{feature_name}/requirements.md",
        "design": f"storage/features/{feature_name}/design.md",
        "tasks": f"storage/features/{feature_name}/tasks.md",
    }
    
    for artifact, path in required_artifacts.items():
        if artifact == "requirements":
            # Requirements MUST exist before design
            if not os.path.exists(path):
                FAIL(f"Requirements must exist before implementation: {path}")
    
    # Confirm traceability matrix will be maintained
    PASS("Traceability setup confirmed")
```

**Pass Criteria**:
- [ ] Requirements file exists or will be created first
- [ ] Design will reference requirements
- [ ] Tasks will reference design
- [ ] Code will reference tasks
- [ ] Tests will reference requirements

**Failure Action**:
→ Create requirements before proceeding

---

## Gate 6: Simplicity Gate (Article VII)

**Purpose**: Enforce simplest viable solution.

**Validation**:
```markdown
## Simplicity Checklist

For the proposed solution, verify:

1. **Minimal Dependencies**
   - [ ] Uses only necessary dependencies
   - [ ] Avoids "nice-to-have" libraries
   - [ ] Each dependency is justified

2. **Minimal Abstractions**
   - [ ] No premature abstraction
   - [ ] Concrete implementations first
   - [ ] Abstractions only when pattern repeats 3+ times

3. **Minimal Scope**
   - [ ] Implements only specified requirements
   - [ ] No gold-plating
   - [ ] YAGNI (You Aren't Gonna Need It) applied

4. **Readability Over Cleverness**
   - [ ] Clear, simple code preferred
   - [ ] No clever tricks unless necessary
   - [ ] Comments explain "why", not "what"
```

**Pass Criteria**:
- [ ] Solution is the simplest that satisfies requirements
- [ ] No unnecessary complexity identified
- [ ] Dependencies are minimal and justified

**Failure Action**:
→ Simplify proposed approach

---

## Gate 7: Anti-Abstraction Gate (Article VIII)

**Purpose**: Prevent unnecessary abstraction layers.

**Validation**:
```markdown
## Anti-Abstraction Checklist

For the proposed solution, verify:

1. **No Premature Interfaces**
   - [ ] Interfaces created only for actual polymorphism
   - [ ] No "just in case" interfaces

2. **No Unnecessary Factories**
   - [ ] Factory patterns only when construction logic is complex
   - [ ] Direct instantiation preferred when possible

3. **No Over-Engineering**
   - [ ] No enterprise patterns for simple problems
   - [ ] Complexity justified by requirements

4. **Concrete First**
   - [ ] Start with concrete implementations
   - [ ] Refactor to abstractions when duplication appears
```

**Pass Criteria**:
- [ ] No premature abstraction patterns
- [ ] Concrete implementations prioritized
- [ ] Any abstraction is justified by requirements

**Failure Action**:
→ Remove unnecessary abstractions from proposal

---

## Gate Execution Workflow

```
1. Receive implementation request
    │
    ├── Gate 1: Check steering files exist
    │     └── FAIL? → Run steering skill
    │
    ├── Gate 2: Validate EARS format
    │     └── FAIL? → Run requirements-analyst
    │
    ├── Gate 3: Check library-first structure
    │     └── FAIL? → Restructure to lib/ first
    │
    ├── Gate 4: Confirm test-first commitment
    │     └── FAIL? → Cannot proceed
    │
    ├── Gate 5: Verify traceability setup
    │     └── FAIL? → Create requirements first
    │
    ├── Gate 6: Simplicity check
    │     └── FAIL? → Simplify approach
    │
    └── Gate 7: Anti-abstraction check
          └── FAIL? → Remove abstractions
    │
    ▼
ALL GATES PASSED → Proceed to implementation
```

---

## Gate Report Template

```markdown
# Phase -1 Gates Report

**Feature**: [Feature Name]
**Date**: [YYYY-MM-DD]
**Validator**: constitution-enforcer

## Gate Results

| Gate | Status | Notes |
|------|--------|-------|
| 1. Steering Check | ✅ PASS | All files exist |
| 2. EARS Validation | ✅ PASS | 5/5 requirements valid |
| 3. Library-First | ✅ PASS | Target: lib/auth/ |
| 4. Test-First | ✅ PASS | Commitment confirmed |
| 5. Traceability | ✅ PASS | Requirements exist |
| 6. Simplicity | ✅ PASS | Minimal approach |
| 7. Anti-Abstraction | ✅ PASS | No premature patterns |

## Overall Result: ✅ PASS

Implementation may proceed.

## Next Steps
1. Write tests (test-engineer)
2. Implement code (software-developer)
3. Review (code-reviewer)
```

---

## Gate Failure Escalation

### Automatic Remediation
- Gate 1: Auto-run steering skill
- Gate 2: Auto-run requirements-analyst
- Gate 5: Auto-create requirements template

### Manual Intervention Required
- Gate 3: Requires architectural decision
- Gate 4: Requires developer commitment
- Gate 6: Requires design simplification
- Gate 7: Requires refactoring proposal

### Blocking Gates
- Gate 4 (Test-First): MUST pass - no exceptions
- Gate 2 (EARS): MUST pass - no exceptions

### Waivable Gates (with justification)
- Gate 6 (Simplicity): Waivable with documented reason
- Gate 7 (Anti-Abstraction): Waivable with documented reason
