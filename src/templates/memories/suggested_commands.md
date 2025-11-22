# Suggested Commands

Frequently used commands for {{PROJECT_NAME}}.

## Package Management

```bash
# Install dependencies
{{PACKAGE_MANAGER}} install

# Add new dependency
{{PACKAGE_MANAGER}} install <package>

# Update dependencies
{{PACKAGE_MANAGER}} update
```

## Testing

```bash
# Run all tests
{{PACKAGE_MANAGER}} test

# Run specific test file
{{PACKAGE_MANAGER}} test <file>

# Run with coverage
{{PACKAGE_MANAGER}} run test:coverage
```

## Code Quality

```bash
# Lint
{{PACKAGE_MANAGER}} run lint

# Format
{{PACKAGE_MANAGER}} run format

# Type check (if TypeScript)
{{PACKAGE_MANAGER}} run type-check
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/<feature-name>

# Commit with conventional commits
git commit -m "feat: add new feature"

# Push and create PR
git push -u origin feature/<feature-name>
```

---

*Add your frequently used commands here*
