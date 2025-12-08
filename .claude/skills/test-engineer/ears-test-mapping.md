# EARS-to-Test Mapping Guide

## Overview

This guide describes how to map EARS (Easy Approach to Requirements Syntax) requirements directly to test cases, ensuring 100% traceability as mandated by Constitutional Article V.

---

## EARS Pattern to Test Mapping

### Pattern 1: Ubiquitous Requirements

**EARS Pattern**: `The [system] SHALL [action]`

**Test Template**:
```typescript
describe('[REQ-ID]: Ubiquitous Requirement', () => {
  it('should always [action]', () => {
    // This behavior should work in any state
  });
});
```

**Example**:
```markdown
REQ-SEC-001: The system SHALL encrypt all passwords using bcrypt.
```

```typescript
describe('REQ-SEC-001: Password Encryption', () => {
  it('should encrypt password using bcrypt', () => {
    const plainPassword = 'testPassword123';
    const hashedPassword = passwordService.hash(plainPassword);
    
    expect(hashedPassword).not.toBe(plainPassword);
    expect(bcrypt.getRounds(hashedPassword)).toBeGreaterThanOrEqual(12);
  });
  
  it('should always use bcrypt regardless of user type', () => {
    const adminPassword = passwordService.hash('adminPass');
    const userPassword = passwordService.hash('userPass');
    
    expect(adminPassword).toMatch(/^\$2[aby]?\$/); // bcrypt prefix
    expect(userPassword).toMatch(/^\$2[aby]?\$/);
  });
});
```

---

### Pattern 2: Event-Driven Requirements

**EARS Pattern**: `WHEN [event], the [system] SHALL [action]`

**Test Template**:
```typescript
describe('[REQ-ID]: Event-Driven Requirement', () => {
  describe('WHEN [event]', () => {
    it('should [action]', () => {
      // Trigger event
      // Verify action occurred
    });
  });
  
  describe('WHEN [event] does not occur', () => {
    it('should not [action]', () => {
      // Don't trigger event
      // Verify action did not occur
    });
  });
});
```

**Example**:
```markdown
REQ-AUTH-001: WHEN user submits login form with valid credentials, the system SHALL authenticate user and create session.
```

```typescript
describe('REQ-AUTH-001: Login Authentication', () => {
  describe('WHEN user submits login form with valid credentials', () => {
    it('should authenticate user', async () => {
      const result = await authService.login('user@test.com', 'validPassword');
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });
    
    it('should create session', async () => {
      const result = await authService.login('user@test.com', 'validPassword');
      
      expect(result.session).toBeDefined();
      expect(result.session.expiresAt).toBeInstanceOf(Date);
    });
  });
  
  describe('WHEN user submits login form with invalid credentials', () => {
    it('should NOT authenticate user', async () => {
      await expect(
        authService.login('user@test.com', 'wrongPassword')
      ).rejects.toThrow('Invalid credentials');
    });
    
    it('should NOT create session', async () => {
      try {
        await authService.login('user@test.com', 'wrongPassword');
      } catch {
        const sessions = await sessionStore.findByEmail('user@test.com');
        expect(sessions.filter(s => s.isActive)).toHaveLength(0);
      }
    });
  });
});
```

---

### Pattern 3: State-Driven Requirements

**EARS Pattern**: `WHILE [state], the [system] SHALL [action]`

**Test Template**:
```typescript
describe('[REQ-ID]: State-Driven Requirement', () => {
  describe('WHILE [state] is true', () => {
    beforeEach(() => {
      // Set up state
    });
    
    it('should [action]', () => {
      // Verify action
    });
  });
  
  describe('WHILE [state] is false', () => {
    beforeEach(() => {
      // Set up opposite state
    });
    
    it('should NOT [action]', () => {
      // Verify action does not occur
    });
  });
});
```

**Example**:
```markdown
REQ-MAINT-001: WHILE maintenance mode is active, the system SHALL show maintenance page to users.
```

```typescript
describe('REQ-MAINT-001: Maintenance Mode', () => {
  describe('WHILE maintenance mode is active', () => {
    beforeEach(() => {
      config.set('maintenanceMode', true);
    });
    
    afterEach(() => {
      config.set('maintenanceMode', false);
    });
    
    it('should show maintenance page', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(503);
      expect(response.text).toContain('Maintenance');
    });
    
    it('should show maintenance page for all routes', async () => {
      const routes = ['/', '/products', '/cart', '/account'];
      
      for (const route of routes) {
        const response = await request(app).get(route);
        expect(response.status).toBe(503);
      }
    });
  });
  
  describe('WHILE maintenance mode is NOT active', () => {
    beforeEach(() => {
      config.set('maintenanceMode', false);
    });
    
    it('should NOT show maintenance page', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).not.toBe(503);
      expect(response.text).not.toContain('Maintenance');
    });
  });
});
```

---

### Pattern 4: Optional Feature Requirements

**EARS Pattern**: `WHERE [feature] is enabled, the [system] SHALL [action]`

**Test Template**:
```typescript
describe('[REQ-ID]: Optional Feature Requirement', () => {
  describe('WHERE [feature] is enabled', () => {
    beforeEach(() => {
      // Enable feature
    });
    
    it('should [action]', () => {
      // Verify action
    });
  });
  
  describe('WHERE [feature] is NOT enabled', () => {
    beforeEach(() => {
      // Disable feature
    });
    
    it('should NOT [action]', () => {
      // Verify action does not occur
    });
  });
});
```

**Example**:
```markdown
REQ-2FA-001: WHERE two-factor authentication is enabled, the system SHALL require OTP after password verification.
```

```typescript
describe('REQ-2FA-001: Two-Factor Authentication', () => {
  describe('WHERE 2FA is enabled for user', () => {
    let user: User;
    
    beforeEach(async () => {
      user = await createUser({ twoFactorEnabled: true });
    });
    
    it('should require OTP after password verification', async () => {
      const result = await authService.login(user.email, 'password');
      
      expect(result.requiresOtp).toBe(true);
      expect(result.authenticated).toBe(false);
      expect(result.otpSent).toBe(true);
    });
    
    it('should authenticate only after valid OTP', async () => {
      const loginResult = await authService.login(user.email, 'password');
      const otp = await getOtpForUser(user);
      
      const finalResult = await authService.verifyOtp(loginResult.token, otp);
      
      expect(finalResult.authenticated).toBe(true);
    });
  });
  
  describe('WHERE 2FA is NOT enabled for user', () => {
    let user: User;
    
    beforeEach(async () => {
      user = await createUser({ twoFactorEnabled: false });
    });
    
    it('should NOT require OTP', async () => {
      const result = await authService.login(user.email, 'password');
      
      expect(result.requiresOtp).toBe(false);
      expect(result.authenticated).toBe(true);
    });
  });
});
```

---

### Pattern 5: Unwanted Behavior Requirements

**EARS Pattern**: `IF [condition], THEN the [system] SHALL [response]`

**Test Template**:
```typescript
describe('[REQ-ID]: Unwanted Behavior Requirement', () => {
  describe('IF [unwanted condition] occurs', () => {
    it('should [response action]', () => {
      // Simulate unwanted condition
      // Verify response
    });
  });
  
  describe('IF [unwanted condition] does NOT occur', () => {
    it('should proceed normally', () => {
      // Normal flow
    });
  });
});
```

**Example**:
```markdown
REQ-LOCK-001: IF login fails 5 consecutive times, THEN the system SHALL lock account for 30 minutes.
```

```typescript
describe('REQ-LOCK-001: Account Lockout', () => {
  describe('IF login fails 5 consecutive times', () => {
    let user: User;
    
    beforeEach(async () => {
      user = await createUser();
    });
    
    it('should lock account for 30 minutes', async () => {
      // Fail 5 times
      for (let i = 0; i < 5; i++) {
        await expect(
          authService.login(user.email, 'wrongPassword')
        ).rejects.toThrow();
      }
      
      // Verify lockout
      await expect(
        authService.login(user.email, 'correctPassword')
      ).rejects.toThrow('Account locked');
      
      // Verify 30 minute lockout
      const lockedUser = await userRepository.findByEmail(user.email);
      const lockDuration = lockedUser.lockedUntil - Date.now();
      expect(lockDuration).toBeCloseTo(30 * 60 * 1000, -4); // 30 min ± 10 sec
    });
    
    it('should allow login after 30 minutes', async () => {
      // Fail 5 times
      for (let i = 0; i < 5; i++) {
        await expect(
          authService.login(user.email, 'wrongPassword')
        ).rejects.toThrow();
      }
      
      // Time travel 30 minutes
      jest.advanceTimersByTime(30 * 60 * 1000);
      
      // Should work now
      const result = await authService.login(user.email, 'correctPassword');
      expect(result.authenticated).toBe(true);
    });
  });
  
  describe('IF login fails less than 5 times', () => {
    it('should NOT lock account', async () => {
      const user = await createUser();
      
      // Fail 4 times
      for (let i = 0; i < 4; i++) {
        await expect(
          authService.login(user.email, 'wrongPassword')
        ).rejects.toThrow();
      }
      
      // Should still work with correct password
      const result = await authService.login(user.email, 'correctPassword');
      expect(result.authenticated).toBe(true);
    });
  });
});
```

---

## Traceability Matrix Template

```markdown
# Test Traceability Matrix

| REQ ID | EARS Pattern | Test File | Test Names | Status |
|--------|--------------|-----------|------------|--------|
| REQ-AUTH-001 | Event-driven | auth.test.ts | login tests | ✅ |
| REQ-SEC-001 | Ubiquitous | security.test.ts | encryption tests | ✅ |
| REQ-2FA-001 | Optional | 2fa.test.ts | 2FA tests | ✅ |
| REQ-LOCK-001 | Unwanted | lockout.test.ts | lockout tests | ✅ |
| REQ-MAINT-001 | State-driven | maintenance.test.ts | mode tests | ✅ |

## Coverage Summary

- Total Requirements: 5
- Requirements with Tests: 5
- Coverage: 100% ✅
```

---

## Test Documentation Header

```typescript
/**
 * @requirement REQ-AUTH-001
 * @ears WHEN user submits login form with valid credentials, 
 *       the system SHALL authenticate user and create session.
 * @pattern Event-driven
 * @priority P1
 */
describe('REQ-AUTH-001: Login Authentication', () => {
  // Tests...
});
```

---

## Automated Traceability Check

```python
# scripts/check-traceability.py

import re
from pathlib import Path

def extract_requirements(req_file):
    """Extract REQ-IDs from requirements.md"""
    content = req_file.read_text()
    return set(re.findall(r'REQ-[\w-]+', content))

def extract_tested_requirements(test_dir):
    """Extract REQ-IDs referenced in test files"""
    tested = set()
    for test_file in test_dir.glob('**/*.test.ts'):
        content = test_file.read_text()
        tested.update(re.findall(r'REQ-[\w-]+', content))
    return tested

def check_coverage(req_file, test_dir):
    requirements = extract_requirements(req_file)
    tested = extract_tested_requirements(test_dir)
    
    untested = requirements - tested
    orphaned = tested - requirements
    
    coverage = len(tested & requirements) / len(requirements) * 100
    
    print(f"Coverage: {coverage:.1f}%")
    print(f"Untested: {untested}")
    print(f"Orphaned: {orphaned}")
    
    return coverage == 100
```
