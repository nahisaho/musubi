# Code Review Standards

## Overview

Guidelines and checklists for conducting effective code reviews.

---

## Review Process

### 1. Preparation

Before starting review:
- [ ] Understand the context (ticket/issue)
- [ ] Review related documentation
- [ ] Check if tests are included
- [ ] Verify CI checks passed

### 2. Review Order

1. **Architecture** - Overall design and patterns
2. **Logic** - Business logic correctness
3. **Security** - Vulnerabilities and risks
4. **Performance** - Efficiency concerns
5. **Testing** - Coverage and quality
6. **Style** - Code consistency

### 3. Time Guidelines

| PR Size | Max Review Time |
|---------|-----------------|
| XS (< 50 lines) | 10 minutes |
| S (50-200 lines) | 30 minutes |
| M (200-500 lines) | 1 hour |
| L (500-1000 lines) | 2 hours |
| XL (> 1000 lines) | Request split |

---

## Review Checklist

### Architecture & Design

- [ ] **Single Responsibility** - Each component has one purpose
- [ ] **DRY** - No unnecessary duplication
- [ ] **KISS** - Simplest solution for the problem
- [ ] **Appropriate abstraction** - Not over/under-engineered
- [ ] **Clear interfaces** - Well-defined boundaries
- [ ] **Follows existing patterns** - Consistent with codebase

### Code Quality

- [ ] **Readable** - Clear variable/function names
- [ ] **Self-documenting** - Intent is obvious
- [ ] **Appropriate comments** - Why, not what
- [ ] **No dead code** - Commented code removed
- [ ] **Error handling** - Proper exception handling
- [ ] **Logging** - Appropriate log levels

### Logic & Correctness

- [ ] **Edge cases** - Null, empty, boundary values
- [ ] **Off-by-one** - Loop bounds correct
- [ ] **Race conditions** - Concurrent access handled
- [ ] **Resource cleanup** - Connections/files closed
- [ ] **Idempotency** - Safe to retry where needed
- [ ] **Atomicity** - Transaction boundaries correct

### Security

- [ ] **Input validation** - All inputs validated
- [ ] **Output encoding** - XSS prevention
- [ ] **SQL injection** - Parameterized queries
- [ ] **Authentication** - Properly checked
- [ ] **Authorization** - Access control verified
- [ ] **Secrets** - No hardcoded credentials
- [ ] **Sensitive data** - Properly protected

### Performance

- [ ] **Query efficiency** - N+1 avoided
- [ ] **Appropriate caching** - Where beneficial
- [ ] **Memory usage** - No obvious leaks
- [ ] **Algorithm complexity** - Reasonable for use case
- [ ] **Database indexes** - Added where needed
- [ ] **Lazy loading** - Data loaded when needed

### Testing

- [ ] **Unit tests** - Core logic tested
- [ ] **Integration tests** - External dependencies tested
- [ ] **Edge cases** - Boundary conditions covered
- [ ] **Error scenarios** - Failure paths tested
- [ ] **Test readability** - Tests are clear
- [ ] **No test smells** - No flaky or slow tests

---

## Comment Guidelines

### Tone

```
❌ "This is wrong"
✅ "Consider using X instead because..."

❌ "Why didn't you..."
✅ "Have you considered..."

❌ "This is confusing"
✅ "I found this section unclear. Would it help to..."
```

### Categories

Use prefixes for clarity:

| Prefix | Meaning |
|--------|---------|
| `[blocking]` | Must fix before merge |
| `[suggestion]` | Optional improvement |
| `[question]` | Seeking understanding |
| `[nit]` | Minor style issue |
| `[praise]` | Positive feedback |

### Examples

```markdown
[blocking] This SQL query is vulnerable to injection. 
Please use parameterized queries.

[suggestion] Consider extracting this into a separate function 
for reusability.

[question] What's the expected behavior when `userId` is null?

[nit] Extra whitespace on line 42.

[praise] Great use of the strategy pattern here! 
Makes the code very extensible.
```

---

## Common Issues

### JavaScript/TypeScript

```typescript
// ❌ Type assertion without validation
const user = data as User;

// ✅ Validate or use type guards
if (isUser(data)) {
  const user = data;
}

// ❌ Callback hell
getData(id, (data) => {
  process(data, (result) => {
    save(result, (saved) => { ... });
  });
});

// ✅ Async/await
const data = await getData(id);
const result = await process(data);
await save(result);

// ❌ Missing error boundaries
return <Component data={data} />;

// ✅ With error handling
return (
  <ErrorBoundary>
    <Component data={data} />
  </ErrorBoundary>
);
```

### Python

```python
# ❌ Bare except
try:
    do_something()
except:
    pass

# ✅ Specific exception
try:
    do_something()
except ValueError as e:
    logger.warning(f"Invalid value: {e}")

# ❌ Mutable default argument
def append_to(element, to=[]):
    to.append(element)
    return to

# ✅ Use None
def append_to(element, to=None):
    if to is None:
        to = []
    to.append(element)
    return to

# ❌ Not using context managers
f = open('file.txt')
data = f.read()
f.close()

# ✅ Using with
with open('file.txt') as f:
    data = f.read()
```

---

## Automation Support

### Automated Checks

| Check | Tool |
|-------|------|
| Formatting | Prettier, Black |
| Linting | ESLint, Ruff |
| Type checking | TypeScript, mypy |
| Security | npm audit, Bandit |
| Test coverage | Jest, pytest-cov |

### GitHub PR Template

```markdown
## Description
[Describe changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Self-review completed
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No new warnings
```

---

## Review Response

### As Author

- Respond to all comments
- Don't take feedback personally
- Ask clarifying questions
- Mark resolved when addressed

### As Reviewer

- Be timely (within 24 hours)
- Focus on significant issues
- Acknowledge good work
- Approve when satisfied
