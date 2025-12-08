# Code Review Checklist

## Overview

A comprehensive checklist for conducting effective code reviews in MUSUBI SDD projects.

---

## Pre-Review Checks

### Before Starting Review
- [ ] PR/MR description clearly explains the change
- [ ] Linked requirements/issues are referenced
- [ ] CI/CD pipeline passes
- [ ] Tests are included and passing
- [ ] Documentation is updated if needed

---

## Code Quality Checklist

### 1. Functionality
- [ ] Code implements the requirements correctly
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No obvious bugs or logic errors
- [ ] Code works as intended (manually verified if needed)

### 2. Design & Architecture
- [ ] Follows existing architecture patterns (check `steering/structure.md`)
- [ ] SOLID principles are applied appropriately
- [ ] No unnecessary complexity (Article VII: Simplicity Gate)
- [ ] No premature abstraction (Article VIII: Anti-Abstraction)
- [ ] Library-first principle followed (Article I)

### 3. Code Style
- [ ] Consistent naming conventions
- [ ] Proper indentation and formatting
- [ ] Comments explain "why", not "what"
- [ ] No commented-out code
- [ ] No debug/console statements left behind

### 4. Testing
- [ ] Tests written before implementation (Article III)
- [ ] Unit tests cover core logic
- [ ] Integration tests verify component interaction
- [ ] Test names clearly describe behavior
- [ ] Edge cases and error paths are tested

### 5. Security
- [ ] No hardcoded secrets or credentials
- [ ] Input validation present
- [ ] Output encoding for user-facing data
- [ ] SQL/NoSQL injection prevention
- [ ] Authentication/authorization checked

### 6. Performance
- [ ] No obvious performance issues
- [ ] Database queries are optimized
- [ ] No N+1 query problems
- [ ] Appropriate caching used
- [ ] Large operations are async/background

### 7. Maintainability
- [ ] Code is readable and self-documenting
- [ ] Functions/methods are appropriately sized
- [ ] No code duplication
- [ ] Dependencies are justified
- [ ] Easy to modify/extend

---

## Review Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| 🔴 **Blocker** | Critical issue, must fix | Request changes |
| 🟠 **Major** | Significant issue, should fix | Request changes |
| 🟡 **Minor** | Small issue, nice to fix | Approve with comments |
| 🔵 **Suggestion** | Optional improvement | Approve with comments |
| 💬 **Question** | Need clarification | Comment |
| 👍 **Praise** | Good implementation | Comment |

---

## Review Comment Templates

### Blocker
```
🔴 **Blocker**: [Description]

This needs to be fixed before merge because [reason].

**Suggested fix:**
```code
// Example fix
```
```

### Major Issue
```
🟠 **Major**: [Description]

This could cause [problem]. Consider [alternative approach].
```

### Minor Issue
```
🟡 **Minor**: [Description]

Not critical, but would improve [aspect].
```

### Suggestion
```
🔵 **Suggestion**: [Description]

Optional: This could be improved by [suggestion].
```

### Praise
```
👍 Nice implementation of [feature]. Clean and readable!
```

---

## Constitutional Compliance Check

During review, verify:

- [ ] **Article I**: Library-First - Feature in `lib/` directory?
- [ ] **Article II**: CLI Interface - Library has CLI entry point?
- [ ] **Article III**: Test-First - Tests committed before code?
- [ ] **Article IV**: EARS - Requirements use EARS format?
- [ ] **Article V**: Traceability - REQ-ID referenced in code/tests?
- [ ] **Article VI**: Project Memory - Steering files consulted?
- [ ] **Article VII**: Simplicity - Simplest viable solution?
- [ ] **Article VIII**: Anti-Abstraction - No premature abstractions?
- [ ] **Article IX**: Integration-First - Integration tests present?

---

## Language-Specific Checks

### TypeScript/JavaScript
- [ ] Types are properly defined (no `any`)
- [ ] Async/await used correctly
- [ ] Error handling with try/catch
- [ ] No memory leaks (cleanup in useEffect, etc.)
- [ ] Imports are organized

### Python
- [ ] Type hints present
- [ ] Docstrings for public functions
- [ ] Context managers used for resources
- [ ] No mutable default arguments
- [ ] PEP 8 style followed

### SQL
- [ ] Parameterized queries (no string concatenation)
- [ ] Indexes for frequently queried columns
- [ ] Appropriate transaction boundaries
- [ ] No SELECT * in production code
- [ ] Migrations are reversible

---

## Review Outcome

### Approve ✅
- All blockers resolved
- All major issues resolved
- Minor issues acknowledged (can be fixed later)

### Request Changes 🔄
- Blockers or major issues exist
- Clearly list what needs to change
- Be specific and constructive

### Comment 💬
- Need more information
- Questions about approach
- Discussion needed before decision
