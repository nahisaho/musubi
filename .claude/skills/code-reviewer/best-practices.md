# Code Review Best Practices

## Overview

Guidelines for conducting effective and constructive code reviews.

---

## For Reviewers

### Be Constructive
- Focus on the code, not the author
- Explain the "why" behind suggestions
- Offer alternatives, not just criticism
- Acknowledge good work with praise

### Be Specific
```
❌ "This is confusing"
✅ "This function is doing too much. Consider splitting authentication and session creation."
```

### Be Timely
- Review within 24 hours when possible
- Small PRs should be reviewed within hours
- Don't let reviews become bottlenecks

### Ask Questions
- "Could you explain the reasoning here?"
- "Have you considered using X instead?"
- Use questions instead of commands when appropriate

### Prioritize Issues
- Focus on correctness and security first
- Style issues are lower priority
- Don't nitpick on preferences

---

## For Authors

### Keep PRs Small
- Aim for < 400 lines of code
- Split large changes into logical chunks
- One logical change per PR

### Write Good Descriptions
```markdown
## What
Brief description of the change

## Why
Link to issue/requirement: REQ-AUTH-001

## How
Technical approach taken

## Testing
How this was tested

## Screenshots (if UI change)
```

### Self-Review First
- Review your own code before requesting review
- Check for obvious issues
- Ensure CI passes

### Respond Constructively
- Don't take feedback personally
- Ask for clarification if needed
- Explain your reasoning if you disagree

---

## Review Anti-Patterns

### ❌ Rubber Stamping
Quick approval without thorough review.

**Impact**: Bugs and issues slip through.

### ❌ Gatekeeping
Blocking PRs for minor style preferences.

**Impact**: Slows development, frustrates team.

### ❌ Inconsistency
Different standards for different people.

**Impact**: Unfair treatment, unclear expectations.

### ❌ Delayed Reviews
Letting PRs sit for days without attention.

**Impact**: Context lost, merge conflicts increase.

### ❌ Personal Attacks
Criticizing the author instead of the code.

**Impact**: Toxic culture, reduced productivity.

---

## Effective Feedback Examples

### Instead of
❌ "This is wrong"

### Say
✅ "This approach might cause issues when X happens. Consider handling that case by..."

---

### Instead of
❌ "Why did you do it this way?"

### Say
✅ "I see you chose approach X. I'm curious about the reasoning - was there a specific constraint? I was thinking Y might also work because..."

---

### Instead of
❌ "This is unreadable"

### Say
✅ "I had trouble following the logic here. Would extracting this into a named function with a descriptive name help clarify the intent?"

---

## Review Metrics (Optional)

Track to improve process:
- Average review turnaround time
- Average PR size
- Review comments per PR
- Rework rate (PRs requiring multiple rounds)

---

## Automation

Let automation handle:
- Code formatting (Prettier, Black)
- Linting (ESLint, Pylint)
- Type checking (TypeScript, mypy)
- Security scanning (Snyk, npm audit)
- Test coverage

Focus human review on:
- Logic and correctness
- Architecture decisions
- Maintainability
- Security implications
- Performance concerns
