# Test-First Workflow

## Overview

Test-First Development (TDD) is a software development practice where tests are written before the implementation code. This is mandated by Constitutional Article III: Test-First Imperative.

---

## The Red-Green-Refactor Cycle

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│     ┌─────────┐     ┌─────────┐     ┌──────────┐       │
│     │   RED   │────▶│  GREEN  │────▶│ REFACTOR │       │
│     └─────────┘     └─────────┘     └──────────┘       │
│          │                                   │          │
│          └───────────────────────────────────┘          │
│                                                         │
└─────────────────────────────────────────────────────────┘

RED:      Write a failing test
GREEN:    Write minimal code to pass the test
REFACTOR: Improve code quality while keeping tests green
```

---

## Detailed Workflow

### Step 1: RED - Write a Failing Test

**Goal**: Define expected behavior through a test that fails.

```typescript
// 1. Create test file FIRST
// tests/auth/login.test.ts

describe('AuthService', () => {
  describe('login', () => {
    it('should return user when credentials are valid', async () => {
      // Arrange
      const authService = new AuthService(mockUserRepo);
      const email = 'test@example.com';
      const password = 'validPassword123';
      
      // Act
      const result = await authService.login(email, password);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.user.email).toBe(email);
    });
    
    it('should throw error when credentials are invalid', async () => {
      // Arrange
      const authService = new AuthService(mockUserRepo);
      
      // Act & Assert
      await expect(
        authService.login('test@example.com', 'wrongPassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

**Run test**: `npm test -- auth/login.test.ts`
**Expected result**: ❌ FAIL (AuthService doesn't exist yet)

### Step 2: GREEN - Write Minimal Implementation

**Goal**: Write the simplest code that makes the test pass.

```typescript
// 2. Create implementation file
// src/auth/service.ts

export class AuthService {
  constructor(private userRepository: UserRepository) {}
  
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(email);
    
    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new Error('Invalid credentials');
    }
    
    return { success: true, user };
  }
  
  private verifyPassword(password: string, hash: string): boolean {
    // Minimal implementation - just enough to pass test
    return bcrypt.compareSync(password, hash);
  }
}
```

**Run test**: `npm test -- auth/login.test.ts`
**Expected result**: ✅ PASS

### Step 3: REFACTOR - Improve Code Quality

**Goal**: Improve code without changing behavior (tests stay green).

```typescript
// 3. Refactor with tests as safety net
// src/auth/service.ts

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService, // Extract dependency
    private logger: Logger // Add observability
  ) {}
  
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.findUserOrFail(email);
    await this.validatePasswordOrFail(password, user);
    
    this.logger.info('User logged in', { userId: user.id });
    
    return { success: true, user };
  }
  
  private async findUserOrFail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }
    return user;
  }
  
  private async validatePasswordOrFail(password: string, user: User): Promise<void> {
    const isValid = await this.passwordService.verify(password, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }
  }
}
```

**Run test**: `npm test -- auth/login.test.ts`
**Expected result**: ✅ PASS (behavior unchanged)

---

## Test-First Commit Strategy

### Git Commit Order

```bash
# 1. Commit test file FIRST
git add tests/auth/login.test.ts
git commit -m "test: add login tests (RED)"

# 2. Commit implementation
git add src/auth/service.ts
git commit -m "feat: implement login (GREEN)"

# 3. Commit refactoring
git add src/auth/service.ts
git commit -m "refactor: extract password service"
```

### Constitutional Compliance Check

The constitution-enforcer can verify test-first by checking git history:

```bash
# Get first commit of test file
git log --oneline --diff-filter=A -- "tests/auth/login.test.ts" | tail -1

# Get first commit of source file
git log --oneline --diff-filter=A -- "src/auth/service.ts" | tail -1

# Test commit should be earlier than source commit
```

---

## Test Types and Order

### Integration-First (Constitutional Article IX)

```
1. Integration tests (happy path) ──▶ Define expected behavior
2. Integration tests (error paths) ──▶ Define error handling
3. Unit tests (edge cases) ──▶ Fill coverage gaps
4. Unit tests (internal logic) ──▶ Test complex algorithms
```

### Example Test Order

```typescript
// 1. FIRST: Integration test (happy path)
describe('POST /api/auth/login', () => {
  it('should return 200 and token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'password123' });
    
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});

// 2. SECOND: Integration test (error paths)
describe('POST /api/auth/login', () => {
  it('should return 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'wrong' });
    
    expect(response.status).toBe(401);
  });
});

// 3. THIRD: Unit test (edge cases)
describe('AuthService.validatePassword', () => {
  it('should handle empty password', () => {
    expect(() => authService.validatePassword('')).toThrow();
  });
});

// 4. FOURTH: Unit test (internal logic)
describe('PasswordService.hash', () => {
  it('should generate different hashes for same password', () => {
    const hash1 = passwordService.hash('password');
    const hash2 = passwordService.hash('password');
    expect(hash1).not.toBe(hash2);
  });
});
```

---

## Test-First Templates

### Unit Test Template

```typescript
describe('[ClassName]', () => {
  // Setup
  let sut: ClassName; // System Under Test
  let mockDependency: jest.Mocked<Dependency>;
  
  beforeEach(() => {
    mockDependency = {
      method: jest.fn(),
    };
    sut = new ClassName(mockDependency);
  });
  
  describe('[methodName]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      const input = 'test input';
      mockDependency.method.mockReturnValue('mocked result');
      
      // Act
      const result = sut.methodName(input);
      
      // Assert
      expect(result).toBe('expected result');
      expect(mockDependency.method).toHaveBeenCalledWith(input);
    });
    
    it('should throw [ErrorType] when [error condition]', () => {
      // Arrange
      const invalidInput = null;
      
      // Act & Assert
      expect(() => sut.methodName(invalidInput)).toThrow(ErrorType);
    });
  });
});
```

### Integration Test Template

```typescript
describe('[API Endpoint]', () => {
  // Setup
  let app: Express;
  let db: TestDatabase;
  
  beforeAll(async () => {
    db = await TestDatabase.create();
    app = createApp({ database: db });
  });
  
  afterAll(async () => {
    await db.close();
  });
  
  beforeEach(async () => {
    await db.clear();
    await db.seed();
  });
  
  describe('[HTTP Method] [Path]', () => {
    it('should return [status] when [condition]', async () => {
      // Arrange
      const payload = { key: 'value' };
      
      // Act
      const response = await request(app)
        .post('/api/resource')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
      
      // Assert
      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      
      // Verify side effects
      const record = await db.find('resources', response.body.id);
      expect(record).toBeDefined();
    });
  });
});
```

---

## Common Test-First Mistakes

### Mistake 1: Writing Test and Code Together
```
❌ Creating test and implementation in same commit
✅ Always commit test first, then implementation
```

### Mistake 2: Testing Implementation Details
```
❌ expect(service.internalCache.size).toBe(1);
✅ expect(service.getData()).toEqual(expectedData);
```

### Mistake 3: Skipping Integration Tests
```
❌ Only unit tests with mocks
✅ Integration tests first, then unit tests for gaps
```

### Mistake 4: Writing Too Many Tests at Once
```
❌ Writing 10 tests before any implementation
✅ One test at a time: RED → GREEN → REFACTOR
```

---

## Test-First Checklist

Before implementation:
- [ ] Test file created before source file
- [ ] Test describes expected behavior
- [ ] Test is failing (RED)

During implementation:
- [ ] Minimal code written to pass test
- [ ] Test is passing (GREEN)
- [ ] No code without corresponding test

After implementation:
- [ ] Code refactored for quality
- [ ] Tests still passing
- [ ] Test committed before source in git history
