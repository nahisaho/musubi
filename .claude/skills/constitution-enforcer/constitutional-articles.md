# 9 Constitutional Articles

## Overview

The 9 Constitutional Articles define immutable governance rules for MUSUBI SDD. These articles cannot be modified and must be enforced at all stages of development.

---

## Article I: Library-First Principle

> **Every feature MUST begin as a standalone library.**

### Rationale
- Libraries are reusable across projects
- Encourages modular design
- Enables testing in isolation
- Prevents tight coupling to frameworks

### Compliance Criteria
```
✅ COMPLIANT:
- Feature implemented in lib/[feature]/
- No framework dependencies in library
- Library can be used standalone

❌ NON-COMPLIANT:
- Feature implemented directly in app/
- Library depends on web framework
- Cannot be extracted from application
```

### Enforcement
```bash
# Check implementation location
if [[ "$feature_path" =~ ^(src/app/|web/) ]]; then
    if [[ ! -d "lib/${feature_name}" ]]; then
        VIOLATION "Article I: Feature not in library first"
    fi
fi
```

---

## Article II: CLI Interface Mandate

> **All libraries MUST expose CLI interfaces.**

### Rationale
- CLI enables testing without UI
- Supports automation and scripting
- Provides consistent interface across platforms
- Enables quick validation and debugging

### Compliance Criteria
```
✅ COMPLIANT:
- lib/auth/cli.ts or lib/auth/__main__.py exists
- CLI exposes core functionality
- CLI has --help documentation

❌ NON-COMPLIANT:
- Library has no CLI entry point
- CLI only available through framework
- Core functions not accessible via CLI
```

### Enforcement
```bash
# Check for CLI entry point
cli_files=("cli.ts" "cli.js" "__main__.py" "main.go")
for lib_dir in lib/*/; do
    has_cli=false
    for cli_file in "${cli_files[@]}"; do
        if [ -f "${lib_dir}${cli_file}" ]; then
            has_cli=true
            break
        fi
    done
    if [ "$has_cli" = false ]; then
        VIOLATION "Article II: ${lib_dir} missing CLI interface"
    fi
done
```

---

## Article III: Test-First Imperative

> **NON-NEGOTIABLE: No code before tests.**

### Rationale
- Tests define expected behavior
- Prevents untested code from entering codebase
- Enforces Red-Green-Refactor discipline
- Creates living documentation

### Compliance Criteria
```
✅ COMPLIANT:
- Test file committed before source file
- Test covers intended functionality
- Red-Green-Refactor cycle followed

❌ NON-COMPLIANT:
- Source code committed before tests
- Tests written after implementation
- Untested code merged to main
```

### Enforcement
```bash
# Check git history for test-first
for commit in $(git log --oneline feature-branch..HEAD); do
    files=$(git show --name-only $commit)
    
    # Check if source files added before tests
    if echo "$files" | grep -q "src/" && ! echo "$files" | grep -q "test"; then
        # Check previous commits for tests
        prev_tests=$(git log --oneline --all -- "tests/")
        if [ -z "$prev_tests" ]; then
            VIOLATION "Article III: Code committed before tests"
        fi
    fi
done
```

---

## Article IV: EARS Requirements Format

> **All requirements MUST use EARS patterns.**

### Rationale
- Unambiguous requirement language
- Testable specifications
- Industry-standard format
- Reduces misinterpretation

### EARS Patterns
| Pattern | Template | Use Case |
|---------|----------|----------|
| Ubiquitous | The system SHALL [action] | Always applicable |
| Event-driven | WHEN [event] the system SHALL [action] | Triggered by event |
| State-driven | WHILE [state] the system SHALL [action] | During condition |
| Optional | WHERE [feature] the system SHALL [action] | Optional features |
| Unwanted | IF [condition] THEN the system SHALL [action] | Error handling |

### Compliance Criteria
```
✅ COMPLIANT:
"WHEN user clicks login, the system SHALL validate credentials"
"The system SHALL encrypt all passwords using bcrypt"

❌ NON-COMPLIANT:
"User should be able to log in" (ambiguous 'should')
"The system may support SSO" (ambiguous 'may')
"Login functionality" (not a complete requirement)
```

### Enforcement
```python
invalid_keywords = ["should", "may", "could", "might", "would"]
required_keywords = ["SHALL", "MUST"]

for line in requirements:
    if any(kw in line.lower() for kw in invalid_keywords):
        VIOLATION(f"Article IV: Ambiguous keyword in '{line}'")
    
    if "REQ-" in line and not any(kw in line for kw in required_keywords):
        WARNING(f"Article IV: Missing SHALL/MUST in '{line}'")
```

---

## Article V: Traceability Mandate

> **100% traceability required: Requirement ↔ Design ↔ Task ↔ Code ↔ Test.**

### Rationale
- Ensures every requirement is implemented
- Prevents orphaned code
- Enables impact analysis
- Supports audit and compliance

### Traceability Chain
```
REQ-001 (Requirement)
    ↓ (referenced in)
AUTH-SERVICE (Design Component)
    ↓ (broken down to)
P1-001 (Task)
    ↓ (implemented in)
src/auth/service.ts (Code)
    ↓ (tested by)
T-001 (Test)
```

### Compliance Criteria
```
✅ COMPLIANT:
- 100% requirements have design mappings
- 100% design components have tasks
- 100% tasks have implementations
- 100% requirements have tests

❌ NON-COMPLIANT:
- Orphaned requirements (no implementation)
- Orphaned tests (no requirement)
- Untested code
- Incomplete traceability matrix
```

### Enforcement
```python
def check_traceability():
    requirements = parse_requirements()
    design = parse_design()
    tasks = parse_tasks()
    tests = parse_tests()
    
    for req in requirements:
        if req.id not in design.references:
            VIOLATION(f"Article V: {req.id} not in design")
        if req.id not in tests.references:
            VIOLATION(f"Article V: {req.id} not tested")
    
    coverage = len(traced_requirements) / len(requirements) * 100
    if coverage < 100:
        VIOLATION(f"Article V: Traceability {coverage}% < 100%")
```

---

## Article VI: Project Memory

> **All skills MUST check steering before work.**

### Rationale
- Consistent architectural decisions
- Technology stack awareness
- Business context understanding
- Prevents conflicting approaches

### Required Steering Files
```
steering/
├── structure.md   # Architecture patterns
├── tech.md        # Technology stack
├── product.md     # Business context
└── rules/
    └── constitution.md  # These articles
```

### Compliance Criteria
```
✅ COMPLIANT:
- Steering files read at skill start
- Decisions align with steering
- New decisions update steering

❌ NON-COMPLIANT:
- Steering files not consulted
- Conflicting technology choices
- Patterns that violate structure.md
```

### Enforcement
```python
def check_steering_compliance():
    if not exists("steering/structure.md"):
        VIOLATION("Article VI: Missing steering/structure.md")
    if not exists("steering/tech.md"):
        VIOLATION("Article VI: Missing steering/tech.md")
    if not exists("steering/product.md"):
        VIOLATION("Article VI: Missing steering/product.md")
```

---

## Article VII: Simplicity Gate

> **Prefer the simplest solution that satisfies requirements.**

### Rationale
- Reduces maintenance burden
- Improves readability
- Faster development
- Easier testing

### Simplicity Principles
1. **YAGNI**: You Aren't Gonna Need It
2. **KISS**: Keep It Simple, Stupid
3. **Minimal Dependencies**: Only what's necessary
4. **Concrete Over Abstract**: Start simple, refactor when needed

### Compliance Criteria
```
✅ COMPLIANT:
- Minimal external dependencies
- No premature optimization
- Clear, readable code
- Only required features implemented

❌ NON-COMPLIANT:
- Over-engineered solutions
- Unnecessary design patterns
- Gold-plating (extra features)
- Complex when simple would work
```

### Enforcement
```python
def simplicity_check(proposal):
    # Check dependency count
    if len(proposal.dependencies) > THRESHOLD:
        WARNING("Article VII: High dependency count")
    
    # Check for design pattern overuse
    patterns = detect_patterns(proposal)
    if "factory" in patterns and "simple instantiation" in alternatives:
        WARNING("Article VII: Factory may be unnecessary")
```

---

## Article VIII: Anti-Abstraction Gate

> **No abstraction before the third occurrence.**

### Rationale
- Prevents premature generalization
- Abstractions emerge from patterns
- Concrete code is easier to change
- Wrong abstractions are costly

### Rule of Three
```
1st occurrence: Implement concrete solution
2nd occurrence: Copy and adapt (acceptable duplication)
3rd occurrence: NOW refactor to abstraction
```

### Compliance Criteria
```
✅ COMPLIANT:
- Concrete implementation first
- Abstraction only after duplication
- Each abstraction has 3+ implementations

❌ NON-COMPLIANT:
- Interface with single implementation
- Abstract class before concrete need
- Factory for simple construction
- Repository pattern for single entity
```

### Enforcement
```python
def anti_abstraction_check():
    for interface in find_interfaces():
        implementations = find_implementations(interface)
        if len(implementations) < 2:
            VIOLATION(f"Article VIII: {interface} has only {len(implementations)} implementations")
```

---

## Article IX: Integration-First Testing

> **Integration tests before unit tests for new features.**

### Rationale
- Validates end-to-end behavior first
- Catches integration issues early
- Unit tests fill gaps afterward
- User-centric testing approach

### Testing Order
```
1. Integration tests (happy path)
2. Integration tests (error paths)
3. Unit tests (edge cases)
4. Unit tests (internal logic)
```

### Compliance Criteria
```
✅ COMPLIANT:
- Integration tests written first
- Unit tests complement integration
- Both test types present

❌ NON-COMPLIANT:
- Only unit tests (no integration)
- Unit tests first, integration later
- Missing end-to-end validation
```

### Enforcement
```python
def integration_first_check(feature):
    integration_tests = find_tests(feature, type="integration")
    unit_tests = find_tests(feature, type="unit")
    
    if not integration_tests:
        VIOLATION("Article IX: No integration tests found")
    
    # Check commit order
    integration_date = get_first_commit(integration_tests)
    unit_date = get_first_commit(unit_tests)
    
    if unit_date < integration_date:
        WARNING("Article IX: Unit tests committed before integration")
```

---

## Constitutional Compliance Summary

### Quick Reference

| Article | Title | Key Rule |
|---------|-------|----------|
| I | Library-First | Features start as libraries |
| II | CLI Mandate | Libraries expose CLI |
| III | Test-First | Tests before code |
| IV | EARS Format | Unambiguous requirements |
| V | Traceability | 100% coverage |
| VI | Project Memory | Check steering first |
| VII | Simplicity | Simplest solution |
| VIII | Anti-Abstraction | Rule of three |
| IX | Integration-First | Integration before unit |

### Enforcement Priority

**Blocking (Must Pass)**:
- Article III: Test-First (no exceptions)
- Article IV: EARS Format (no exceptions)
- Article V: Traceability (no exceptions)

**Required (Strong Enforcement)**:
- Article I: Library-First
- Article II: CLI Mandate
- Article VI: Project Memory

**Advisory (With Justification)**:
- Article VII: Simplicity Gate
- Article VIII: Anti-Abstraction Gate
- Article IX: Integration-First
