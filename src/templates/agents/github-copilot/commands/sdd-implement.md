# SDD Implement Command

Execute implementation tasks for a feature.

---

## Instructions for Claude

You are executing the `/sdd-implement [feature-name]` command to implement a feature following SDD workflow.

### Command Format

```bash
/sdd-implement authentication
/sdd-implement payment-processing
/sdd-implement user-dashboard
```

### Your Task

Implement the feature by executing tasks from the task breakdown document, following Test-First principles (Article III) and constitutional governance.

---

## Process

### 1. Read All Context

**CRITICAL**: Read these files first:

**IMPORTANT**: Always read ENGLISH versions (.md) as they are the reference/source.

```bash
# Task Breakdown (English version)
storage/specs/{{feature-name}}-tasks.md

# Design (English version)
storage/specs/{{feature-name}}-design.md

# Requirements (English version)
storage/specs/{{feature-name}}-requirements.md

# Steering Context (English version)
steering/structure.md
steering/tech.md
steering/product.md
```

**Note**: Japanese versions (.ja.md) are translations only. Always use English versions for implementation.

---

### 2. Verify Prerequisites

**Check task breakdown exists**:

```markdown
❌ **Error**: Task breakdown not found

Expected: storage/specs/{{feature-name}}-tasks.md

Please run `/sdd-tasks {{feature-name}}` first.

Implementation requires task breakdown.
```

**Check design exists**:

```markdown
❌ **Error**: Design document not found

Expected: storage/specs/{{feature-name}}-design.md

Implementation requires design document.
```

---

### 3. Use TodoWrite Tool

**IMPORTANT**: Use TodoWrite tool to track implementation progress.

```markdown
Create todos for P0 tasks:

1. TASK-001: Set Up Project Structure
2. TASK-002: Write Tests for REQ-XXX-001 (RED)
3. TASK-003: Implement [Component] (GREEN)
4. TASK-004: Refactor [Component] (BLUE)
5. TASK-005: Implement Database Repository
6. TASK-006: Implement CLI Interface
7. TASK-007: Implement API Endpoints
```

**Mark tasks as**:

- `in_progress` when starting
- `completed` when finished
- Keep EXACTLY ONE task `in_progress` at a time

---

### 4. Execute Tasks in Order

Follow task dependencies from task breakdown document.

#### TASK-001: Set Up Project Structure

**Create library-first structure** (Article I):

```typescript
// Create directory structure
lib/{{feature}}/
├── src/
│   ├── index.ts          // Public API exports
│   ├── service.ts        // Business logic
│   ├── repository.ts     // Data access
│   ├── types.ts          // TypeScript types
│   └── errors.ts         // Custom errors
├── tests/
│   ├── service.test.ts
│   ├── repository.test.ts
│   └── integration.test.ts
├── cli.ts                // CLI interface (Article II)
├── package.json
├── tsconfig.json
└── README.md
```

**Create files**:

1. **lib/{{feature}}/package.json**:

```json
{
  "name": "@{{project}}/{{feature}}",
  "version": "1.0.0",
  "description": "{{Feature}} library",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "{{feature}}": "./cli.ts"
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src/"
  }
}
```

2. **lib/{{feature}}/src/index.ts** (Public API):

```typescript
// REQ-{{COMPONENT}}-001: Export public API
export { {{COMPONENT}}Service } from './service';
export { {{COMPONENT}}Repository } from './repository';
export type {
  {{Resource}},
  Create{{Resource}}Request,
  Create{{Resource}}Response
} from './types';
```

3. **lib/{{feature}}/src/types.ts**:

```typescript
// REQ-{{COMPONENT}}-004: Define domain types
export interface {{Resource}} {
  id: string;
  field1: string;
  field2: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Create{{Resource}}Request {
  field1: string;
  field2: number;
}

export interface Create{{Resource}}Response {
  id: string;
  field1: string;
  field2: number;
}
```

**Mark TASK-001 as completed**.

---

#### TASK-002: Write Tests (RED Phase) 🔴

**CRITICAL (Article III)**: Tests BEFORE implementation.

**Create test file**:

```typescript
// lib/{{feature}}/tests/service.test.ts

describe('REQ-{{COMPONENT}}-001: [Requirement Title]', () => {
  let service: {{COMPONENT}}Service;
  let mockRepository: jest.Mocked<{{COMPONENT}}Repository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      // ... other methods
    } as any;

    service = new {{COMPONENT}}Service(mockRepository);
  });

  // Acceptance Criterion 1
  it('should [acceptance criterion 1]', async () => {
    // Arrange
    const input = { field1: 'test', field2: 42 };
    mockRepository.create.mockResolvedValue({
      id: 'uuid',
      ...input,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Act
    const result = await service.create(input);

    // Assert
    expect(result).toMatchObject({
      id: expect.any(String),
      field1: 'test',
      field2: 42
    });
    expect(mockRepository.create).toHaveBeenCalledWith(input);
  });

  // Acceptance Criterion 2
  it('should [acceptance criterion 2]', async () => {
    // Test error handling
    const invalidInput = { field1: '', field2: -1 };

    await expect(service.create(invalidInput)).rejects.toThrow(
      'Validation failed'
    );
  });

  // Add tests for ALL acceptance criteria
});
```

**Run tests** (should FAIL):

```bash
npm test lib/{{feature}}/tests/service.test.ts
# Expected: Tests FAIL (service.ts doesn't exist yet)
```

**Git commit**:

```bash
git add lib/{{feature}}/tests/
git commit -m "test: add failing tests for REQ-{{COMPONENT}}-001"
```

**Mark TASK-002 as completed**.

---

#### TASK-003: Implement Code (GREEN Phase) 💚

**Create minimal implementation** to pass tests:

```typescript
// lib/{{feature}}/src/service.ts

import { {{COMPONENT}}Repository } from './repository';
import { Create{{Resource}}Request, Create{{Resource}}Response } from './types';
import { ValidationError } from './errors';

export class {{COMPONENT}}Service {
  constructor(private repository: {{COMPONENT}}Repository) {}

  /**
   * REQ-{{COMPONENT}}-001: [Requirement title]
   *
   * Acceptance Criteria:
   * - [Criterion 1]
   * - [Criterion 2]
   */
  async create(data: Create{{Resource}}Request): Promise<Create{{Resource}}Response> {
    // Acceptance Criterion 1: Validate input
    this.validateInput(data);

    // Acceptance Criterion 2: Create resource
    const result = await this.repository.create(data);

    return {
      id: result.id,
      field1: result.field1,
      field2: result.field2
    };
  }

  private validateInput(data: Create{{Resource}}Request): void {
    if (!data.field1 || data.field1.length === 0) {
      throw new ValidationError('field1 is required');
    }
    if (!data.field2 || data.field2 <= 0) {
      throw new ValidationError('field2 must be positive');
    }
  }
}
```

**Create error classes**:

```typescript
// lib/{{feature}}/src/errors.ts

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

**Run tests** (should PASS):

```bash
npm test lib/{{feature}}/tests/service.test.ts
# Expected: Tests PASS ✅
```

**Git commit**:

```bash
git add lib/{{feature}}/src/
git commit -m "feat: implement REQ-{{COMPONENT}}-001 ([requirement title])"
```

**Mark TASK-003 as completed**.

---

#### TASK-004: Refactor (BLUE Phase) 💙

**Improve code design** while keeping tests green:

```typescript
// lib/{{feature}}/src/service.ts

export class {{COMPONENT}}Service {
  constructor(
    private repository: {{COMPONENT}}Repository,
    private validator: {{COMPONENT}}Validator  // Extract validation
  ) {}

  async create(data: Create{{Resource}}Request): Promise<Create{{Resource}}Response> {
    // Use validator
    this.validator.validate(data);

    const result = await this.repository.create(data);

    // Use mapper for response transformation
    return this.mapToResponse(result);
  }

  private mapToResponse(entity: {{Resource}}): Create{{Resource}}Response {
    return {
      id: entity.id,
      field1: entity.field1,
      field2: entity.field2
    };
  }
}
```

**Extract validator**:

```typescript
// lib/{{feature}}/src/validator.ts

export class {{COMPONENT}}Validator {
  validate(data: Create{{Resource}}Request): void {
    const errors: string[] = [];

    if (!data.field1 || data.field1.length === 0) {
      errors.push('field1 is required');
    }
    if (data.field1 && data.field1.length > 255) {
      errors.push('field1 max 255 characters');
    }
    if (!data.field2 || data.field2 <= 0) {
      errors.push('field2 must be positive');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }
}
```

**Run tests** (should STILL PASS):

```bash
npm test lib/{{feature}}/tests/service.test.ts
# Expected: Tests STILL PASS ✅
```

**Git commit**:

```bash
git add lib/{{feature}}/src/
git commit -m "refactor: extract validator and improve {{component}} service"
```

**Mark TASK-004 as completed**.

---

#### TASK-005: Implement Database Repository

**Create Prisma schema**:

```prisma
// prisma/schema.prisma

model {{Resource}} {
  id        String   @id @default(uuid())
  field1    String
  field2    Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([field1])
}
```

**Generate migration**:

```bash
npx prisma migrate dev --name create_{{resource}}_table
```

**Implement repository**:

```typescript
// lib/{{feature}}/src/repository.ts

import { PrismaClient } from '@prisma/client';
import { {{Resource}}, Create{{Resource}}Request } from './types';

export class {{COMPONENT}}Repository {
  constructor(private prisma: PrismaClient) {}

  /**
   * REQ-{{COMPONENT}}-004: Persist {{resource}} to database
   */
  async create(data: Create{{Resource}}Request): Promise<{{Resource}}> {
    return this.prisma.{{resource}}.create({
      data: {
        field1: data.field1,
        field2: data.field2
      }
    });
  }

  async findById(id: string): Promise<{{Resource}} | null> {
    return this.prisma.{{resource}}.findUnique({
      where: { id }
    });
  }
}
```

**Write integration tests** (Article IX: Real database):

```typescript
// lib/{{feature}}/tests/integration.test.ts

import { PrismaClient } from '@prisma/client';
import { {{COMPONENT}}Repository } from '../src/repository';

describe('{{COMPONENT}}Repository Integration Tests', () => {
  let prisma: PrismaClient;
  let repository: {{COMPONENT}}Repository;

  beforeAll(async () => {
    // Use test database (Docker container)
    prisma = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL
    });
    repository = new {{COMPONENT}}Repository(prisma);

    // Clean database
    await prisma.{{resource}}.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create {{resource}} in real database', async () => {
    const data = { field1: 'test', field2: 42 };

    const result = await repository.create(data);

    expect(result).toMatchObject({
      id: expect.any(String),
      field1: 'test',
      field2: 42
    });

    // Verify in database
    const found = await repository.findById(result.id);
    expect(found).toMatchObject(data);
  });
});
```

**Run integration tests**:

```bash
docker-compose up -d test-db
npm test lib/{{feature}}/tests/integration.test.ts
```

**Mark TASK-005 as completed**.

---

#### TASK-006: Implement CLI Interface (Article II)

```typescript
#!/usr/bin/env node
// lib/{{feature}}/cli.ts

import { Command } from 'commander';
import { {{COMPONENT}}Service } from './src/service';
import { {{COMPONENT}}Repository } from './src/repository';
import { PrismaClient } from '@prisma/client';

const program = new Command();
const prisma = new PrismaClient();
const repository = new {{COMPONENT}}Repository(prisma);
const service = new {{COMPONENT}}Service(repository);

program
  .name('{{feature}}')
  .description('CLI for {{feature}} operations')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new {{resource}}')
  .requiredOption('--field1 <value>', 'Field 1 value')
  .requiredOption('--field2 <value>', 'Field 2 value', parseInt)
  .action(async (options) => {
    try {
      const result = await service.create({
        field1: options.field1,
        field2: options.field2
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('get')
  .description('Get {{resource}} by ID')
  .requiredOption('--id <uuid>', 'Resource ID')
  .action(async (options) => {
    try {
      const result = await repository.findById(options.id);
      if (!result) {
        console.error('Not found');
        process.exit(1);
      }
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
```

**Test CLI**:

```bash
chmod +x lib/{{feature}}/cli.ts
./lib/{{feature}}/cli.ts --help
./lib/{{feature}}/cli.ts create --field1=test --field2=42
```

**Mark TASK-006 as completed**.

---

#### TASK-007: Implement API Endpoints

```typescript
// app/api/{{resource}}/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { {{COMPONENT}}Service } from '@/lib/{{feature}}';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // REQ-{{COMPONENT}}-001: Create {{resource}}
    const result = await service.create(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'ID required' },
      { status: 400 }
    );
  }

  const result = await repository.findById(id);

  if (!result) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
```

**Mark TASK-007 as completed**.

---

### 5. Run Validation After Each Task

After completing each task:

```bash
# Run tests
npm test

# Run linter
npm run lint

# Type check
npm run type-check

# Run security audit
npm audit
```

---

### 6. After All P0 Tasks Complete

Run comprehensive validation:

```bash
# Traceability validation
@traceability-auditor validate requirements.md tasks.md lib/{{feature}}/

# Constitutional validation
@constitution-enforcer validate lib/{{feature}}/

# Code review
@code-reviewer review lib/{{feature}}/src/

# Security audit
@security-auditor audit lib/{{feature}}/
```

---

### 7. Generate Implementation Summary

```markdown
## ✅ Implementation Complete

**Feature**: {{FEATURE_NAME}}

### Tasks Completed:

- ✅ TASK-001: Project structure (Library-First)
- ✅ TASK-002: Tests written (RED)
- ✅ TASK-003: Implementation (GREEN)
- ✅ TASK-004: Refactoring (BLUE)
- ✅ TASK-005: Database repository
- ✅ TASK-006: CLI interface
- ✅ TASK-007: API endpoints

### Test Results:

- Unit Tests: [N] passing
- Integration Tests: [N] passing
- Coverage: [%]% (target: 80%)

### Constitutional Compliance:

- ✅ Article I: Implemented as library (lib/{{feature}}/)
- ✅ Article II: CLI interface provided
- ✅ Article III: Test-First followed (Red-Green-Blue)
- ✅ Article V: All requirements implemented
- ✅ Article IX: Integration tests use real database

### Files Created:

- lib/{{feature}}/src/service.ts
- lib/{{feature}}/src/repository.ts
- lib/{{feature}}/src/types.ts
- lib/{{feature}}/cli.ts
- lib/{{feature}}/tests/\*.test.ts
- app/api/{{resource}}/route.ts

### Next Steps:

1. Run full test suite
2. Deploy to staging: `@devops-engineer deploy staging`
3. Run acceptance tests
4. Deploy to production
```

---

## Tool Usage

### Required:

- **Read**: Tasks, design, requirements, steering
- **Write**: Create source files
- **Edit**: Modify existing files
- **Bash**: Run tests, migrations, CLI commands
- **TodoWrite**: Track implementation progress

---

## Constitutional Compliance

Throughout implementation, ensure:

### Article I: Library-First ✅

- All code in `lib/{{feature}}/`
- No application dependencies

### Article II: CLI Interface ✅

- CLI commands implemented
- Help text provided

### Article III: Test-First ✅

- Tests written BEFORE code
- Red-Green-Blue cycle
- Git history proves it

### Article V: Traceability ✅

- Code comments reference REQ-IDs
- Commit messages reference REQ-IDs

### Article IX: Integration Testing ✅

- Integration tests use real database
- Docker Compose for test DB

---

**Execution**: Begin implementation now for the specified feature.
