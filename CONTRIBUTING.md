# Contributing to MUSUBI

Thank you for your interest in contributing to MUSUBI! This document provides guidelines for contributing to this Specification Driven Development framework.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

---

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

**Expected Behavior**:
- Be respectful and inclusive
- Welcome newcomers
- Focus on what is best for the community
- Show empathy towards others

---

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

**Bug Report Template**:
```markdown
## Description
[Clear description of the bug]

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
[What you expected to happen]

## Actual Behavior
[What actually happened]

## Environment
- OS: [e.g., macOS 14.0, Ubuntu 22.04]
- Node.js: [e.g., v20.10.0]
- npm: [e.g., 10.2.0]
- MUSUBI version: [e.g., 0.1.0]

## Additional Context
[Screenshots, logs, etc.]
```

### Suggesting Enhancements

Enhancement suggestions are welcome! Please include:

**Enhancement Template**:
```markdown
## Problem
[What problem does this solve?]

## Proposed Solution
[How should this work?]

## Alternatives Considered
[Other approaches you've considered]

## Additional Context
[Mockups, examples, etc.]
```

### Contributing Code

We love pull requests! Here's how to contribute code:

1. **Check existing issues** - See if your contribution is already planned
2. **Discuss first** - For large changes, open an issue to discuss before coding
3. **Follow the workflow** - See [Development Workflow](#development-workflow)
4. **Write tests** - All code changes require tests
5. **Update docs** - Update relevant documentation

---

## Development Setup

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher (or pnpm 8.0.0+)
- **Git**: Latest version

### Setup Steps

1. **Fork the repository**:
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/musubi.git
   cd musubi
   ```

2. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/nahisaho/MUSUBI.git
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Link package locally**:
   ```bash
   npm link
   ```

5. **Verify setup**:
   ```bash
   musubi --version
   ```

---

## Project Structure

```
musubi/
├── bin/                  # Executable scripts
│   ├── musubi.js         # Main CLI entry
│   └── musubi-init.js    # Init command
├── src/
│   ├── templates/        # Templates for initialization
│   │   ├── skills/       # 25 Claude Code Skills
│   │   ├── commands/     # Slash commands
│   │   ├── constitution/ # Governance documents
│   │   ├── documents/    # Requirements, design, tasks templates
│   │   └── steering/     # Steering templates
│   ├── cli/              # CLI implementation (future)
│   └── lib/              # Core library code (future)
├── tests/                # Test suites
├── docs/                 # Documentation
├── package.json
├── README.md
├── CONTRIBUTING.md       # This file
└── LICENSE
```

---

## Development Workflow

### 1. Create a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
# OR for bug fixes
git checkout -b fix/issue-number-description
```

**Branch Naming Conventions**:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `chore/` - Maintenance tasks

### 2. Make Changes

Follow our [Coding Standards](#coding-standards).

### 3. Write Tests

```bash
# Run tests
npm test

# Run specific test file
npm test tests/skills/orchestrator.test.js

# Run tests in watch mode
npm test -- --watch

# Check coverage
npm test -- --coverage
```

**Test Requirements**:
- All new features require tests
- Bug fixes require regression tests
- Minimum 80% code coverage
- Tests must pass before PR submission

### 4. Commit Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <subject>
git commit -m "feat(skills): add traceability-auditor skill"
git commit -m "fix(cli): handle missing steering files gracefully"
git commit -m "docs(readme): update installation instructions"
```

**Commit Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Test additions or fixes
- `chore`: Build process, dependencies, etc.

**Commit Message Rules**:
- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Limit first line to 72 characters
- Reference issues: `Closes #123`, `Fixes #456`

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Go to GitHub and create Pull Request
```

---

## Pull Request Process

### Before Submitting

Ensure your PR:
- [ ] Passes all tests (`npm test`)
- [ ] Passes linting (`npm run lint`)
- [ ] Has no TypeScript errors (`npm run type-check`)
- [ ] Includes tests for new features
- [ ] Updates documentation if needed
- [ ] Follows coding standards
- [ ] Has descriptive commit messages

**CI/CD Requirements**:

All Pull Requests must pass the following CI checks before merging:

1. **ESLint & Prettier** - Code style and quality
2. **Jest Tests** - All tests passing with ≥80% coverage
3. **Build Verification** - `npm pack` succeeds
4. **Security Audit** - No moderate/high vulnerabilities
5. **Platform Tests** - All 7 platform template validations pass:
   - claude-code
   - github-copilot
   - cursor
   - gemini-cli
   - windsurf
   - codex
   - qwen-code

These checks run automatically on every PR. The merge button will be disabled until all checks pass.

### PR Description Template

```markdown
## Description
[Clear description of changes]

## Motivation and Context
[Why is this change needed? What problem does it solve?]

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## How Has This Been Tested?
[Describe tests you ran and how to reproduce]

## Screenshots (if applicable)

## Checklist
- [ ] Tests pass locally
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Follows coding standards
- [ ] Commit messages follow conventions
```

### Review Process

1. **Automated Checks**: CI/CD will run tests and linting
2. **Code Review**: Maintainers will review your code
3. **Feedback**: Address review comments
4. **Approval**: PR must be approved by at least 1 maintainer
5. **Merge**: Maintainer will merge your PR

---

## Coding Standards

### JavaScript/TypeScript

**ESLint Configuration**: We use ESLint with strict TypeScript rules.

```javascript
// ✅ Good
const getUserById = async (id: string): Promise<User | null> => {
  const user = await repository.findById(id);
  if (!user) {
    throw new NotFoundError(`User ${id} not found`);
  }
  return user;
};

// ❌ Bad
const getUserById = async (id) => {  // Missing types
  const user = await repository.findById(id);
  return user;  // No null check
};
```

**Code Style**:
- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Use async/await over promises
- No `any` types (use `unknown` if needed)
- Explicit return types for functions

### File Organization

- One class/component per file
- Index files only for re-exports
- Co-locate tests with source files (or in `tests/` directory)
- Group related functionality in directories

### Naming Conventions

```typescript
// Variables and functions: camelCase
const userName = 'John';
const getUserData = () => { ... };

// Classes and interfaces: PascalCase
class UserService { ... }
interface User { ... }

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// Files: kebab-case
// user-service.ts, auth-controller.ts
```

### Comments and Documentation

```typescript
/**
 * Authenticate user with email and password.
 *
 * REQ-AUTH-001: User login functionality
 *
 * @param credentials - User email and password
 * @returns Session token and user data
 * @throws UnauthorizedError if credentials are invalid
 */
async function login(credentials: LoginRequest): Promise<LoginResponse> {
  // Implementation
}
```

**Comment Guidelines**:
- Write self-documenting code (good names > comments)
- Comment WHY, not WHAT
- Document complex algorithms
- Reference requirement IDs (REQ-XXX-NNN)
- Keep comments up-to-date

---

## Testing Guidelines

### Test Structure

```typescript
// tests/skills/orchestrator.test.ts

describe('Orchestrator Skill', () => {
  describe('skill selection', () => {
    it('should select requirements-analyst for requirements tasks', () => {
      const task = 'Create requirements for authentication';
      const skill = orchestrator.selectSkill(task);

      expect(skill).toBe('requirements-analyst');
    });

    it('should select system-architect for design tasks', () => {
      const task = 'Design authentication architecture';
      const skill = orchestrator.selectSkill(task);

      expect(skill).toBe('system-architect');
    });
  });

  describe('error handling', () => {
    it('should throw error if no suitable skill found', () => {
      const task = 'Invalid task';

      expect(() => orchestrator.selectSkill(task)).toThrow(
        'No skill found for task'
      );
    });
  });
});
```

**Test Naming**:
- Describe what the code does, not implementation details
- Use "should" for expected behavior
- Group related tests with `describe` blocks

**Test Coverage**:
- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical user workflows
- Minimum 80% code coverage

---

## Documentation

### Documentation Types

1. **Code Documentation**: TSDoc/JSDoc comments
2. **API Documentation**: OpenAPI specs, README
3. **User Documentation**: README, guides in `docs/`
4. **Skill Documentation**: Each skill has SKILL.md

### Updating Documentation

When you change functionality:
- [ ] Update README if user-facing changes
- [ ] Update API docs if API changes
- [ ] Update skill documentation if skill changes
- [ ] Add/update examples
- [ ] Update changelog

### Writing Good Documentation

- Use clear, concise language
- Provide examples
- Include screenshots/diagrams when helpful
- Keep it up-to-date
- Use proper markdown formatting

---

## Skill Contributions

### Adding a New Skill

1. **Check necessity**: Discuss with maintainers first
2. **Follow template**: Use existing skills as reference
3. **YAML frontmatter**: Include name, description, trigger terms, allowed-tools
4. **Comprehensive documentation**: Include all sections from template
5. **Constitutional alignment**: Ensure skill supports constitutional articles
6. **Test skill**: Verify Claude Code invokes it correctly

**Skill Template**: See `src/templates/skills/orchestrator/SKILL.md` for reference.

---

## Release Process

(For maintainers)

1. **Version Bump**: Update `package.json` version
2. **Changelog**: Update CHANGELOG.md with changes
3. **Git Tag**: Create git tag (`v0.1.0`)
4. **Publish**: `npm publish`
5. **GitHub Release**: Create GitHub release with notes

**Versioning**: We follow [Semantic Versioning](https://semver.org/):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

---

## Questions?

- **Documentation**: Check [README.md](README.md) and [docs/](docs/)
- **Issues**: Search [existing issues](https://github.com/nahisaho/MUSUBI/issues)
- **Discussions**: Use [GitHub Discussions](https://github.com/nahisaho/MUSUBI/discussions)

---

## License

By contributing to MUSUBI, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to MUSUBI!** 🎯
