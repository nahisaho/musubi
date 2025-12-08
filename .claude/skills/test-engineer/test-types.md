# Test Types Guide

## Overview

This guide covers the different types of tests used in MUSUBI SDD and when to apply each type.

---

## Test Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲        ← Fewest tests (slow, expensive)
                 ╱──────╲
                ╱        ╲
               ╱Integration╲    ← More tests (medium speed)
              ╱────────────╲
             ╱              ╲
            ╱   Unit Tests   ╲  ← Most tests (fast, cheap)
           ╱──────────────────╲

Speed:      ◀── Slow ──────────────── Fast ──▶
Cost:       ◀── Expensive ──────────── Cheap ──▶
Confidence: ◀── High ───────────────── Low ───▶
```

---

## Unit Tests

### Purpose
Test individual units (functions, methods, classes) in isolation.

### Characteristics
- Fast execution (milliseconds)
- Dependencies are mocked
- Test single behavior per test
- High code coverage

### When to Use
- Testing business logic
- Testing algorithms
- Testing edge cases
- Testing error handling

### Example
```typescript
// tests/services/calculator.test.ts
describe('Calculator', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      const calc = new Calculator();
      expect(calc.add(2, 3)).toBe(5);
    });
    
    it('should handle negative numbers', () => {
      const calc = new Calculator();
      expect(calc.add(-2, 3)).toBe(1);
    });
    
    it('should return 0 when adding number to its negative', () => {
      const calc = new Calculator();
      expect(calc.add(5, -5)).toBe(0);
    });
  });
});
```

### Best Practices
- One assertion per test (when practical)
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

---

## Integration Tests

### Purpose
Test how multiple components work together.

### Characteristics
- Medium speed (seconds)
- Uses real or test databases
- Tests component interactions
- Validates data flow

### When to Use
- Testing API endpoints
- Testing database operations
- Testing service interactions
- Testing middleware chains

### Example
```typescript
// tests/integration/auth.test.ts
describe('Authentication Flow', () => {
  let app: Express;
  let db: TestDatabase;
  
  beforeAll(async () => {
    db = await TestDatabase.connect();
    app = createApp({ database: db });
  });
  
  afterAll(async () => {
    await db.disconnect();
  });
  
  describe('POST /api/auth/login', () => {
    it('should authenticate user and return token', async () => {
      // Arrange
      await db.createUser({
        email: 'test@example.com',
        password: 'hashed_password'
      });
      
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });
    
    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});
```

### Best Practices
- Use test database (not production)
- Clean database between tests
- Test both success and error paths
- Verify side effects (database state, events)

---

## End-to-End (E2E) Tests

### Purpose
Test complete user journeys through the application.

### Characteristics
- Slow execution (minutes)
- Uses real browser/environment
- Tests full system
- Highest confidence

### When to Use
- Critical user journeys
- Happy path validation
- Regression testing
- Pre-release verification

### Example
```typescript
// tests/e2e/checkout.test.ts
describe('Checkout Flow', () => {
  it('should complete purchase successfully', async () => {
    // Navigate to product
    await page.goto('/products/123');
    
    // Add to cart
    await page.click('[data-testid="add-to-cart"]');
    
    // Go to cart
    await page.click('[data-testid="cart-icon"]');
    expect(await page.textContent('.cart-count')).toBe('1');
    
    // Proceed to checkout
    await page.click('[data-testid="checkout-button"]');
    
    // Fill shipping info
    await page.fill('[name="address"]', '123 Main St');
    await page.fill('[name="city"]', 'New York');
    await page.fill('[name="zip"]', '10001');
    
    // Fill payment info
    await page.fill('[name="cardNumber"]', '4111111111111111');
    await page.fill('[name="expiry"]', '12/25');
    await page.fill('[name="cvv"]', '123');
    
    // Complete order
    await page.click('[data-testid="place-order"]');
    
    // Verify success
    await page.waitForSelector('.order-confirmation');
    expect(await page.textContent('.order-number')).toMatch(/ORD-\d+/);
  });
});
```

### Best Practices
- Focus on critical paths
- Keep tests minimal (expensive to run)
- Use stable selectors (data-testid)
- Handle async operations properly

---

## Component Tests (Frontend)

### Purpose
Test React/Vue/Angular components in isolation.

### Characteristics
- Fast execution
- Tests rendering and interactions
- Mocks external services
- Uses testing library

### Example
```typescript
// tests/components/LoginForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should render email and password fields', () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });
  
  it('should call onSubmit with form data', async () => {
    const handleSubmit = jest.fn();
    render(<LoginForm onSubmit={handleSubmit} />);
    
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });
  
  it('should show validation error for invalid email', async () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'invalid-email' }
    });
    fireEvent.blur(screen.getByLabelText('Email'));
    
    expect(await screen.findByText('Invalid email format')).toBeInTheDocument();
  });
});
```

---

## Contract Tests

### Purpose
Verify API contracts between services.

### Characteristics
- Tests API schema compliance
- Uses Pact or similar
- Consumer-driven contracts
- Prevents breaking changes

### Example
```typescript
// tests/contracts/user-api.pact.ts
describe('User API Contract', () => {
  const provider = new Pact({
    consumer: 'WebApp',
    provider: 'UserService'
  });
  
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  
  describe('GET /users/:id', () => {
    it('should return user by ID', async () => {
      // Define expected interaction
      await provider.addInteraction({
        state: 'user with ID 123 exists',
        uponReceiving: 'a request for user 123',
        withRequest: {
          method: 'GET',
          path: '/users/123'
        },
        willRespondWith: {
          status: 200,
          body: {
            id: '123',
            name: like('John Doe'),
            email: like('john@example.com')
          }
        }
      });
      
      // Execute request
      const response = await userClient.getUser('123');
      
      // Verify
      expect(response.id).toBe('123');
      await provider.verify();
    });
  });
});
```

---

## Performance Tests

### Purpose
Verify system performance under load.

### Characteristics
- Tests response times
- Tests throughput
- Tests under stress
- Identifies bottlenecks

### Example (k6)
```javascript
// tests/performance/api-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up
    { duration: '1m', target: 20 },    // Stay at 20
    { duration: '30s', target: 50 },   // Ramp up more
    { duration: '1m', target: 50 },    // Stay at 50
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% < 200ms
    http_req_failed: ['rate<0.01'],    // <1% errors
  },
};

export default function() {
  const response = http.get('http://api.example.com/users');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```

---

## Test Naming Convention

### Format
```
describe('[Subject]', () => {
  describe('[Method/Action]', () => {
    it('should [expected behavior] when [condition]', () => {});
  });
});
```

### Examples
```typescript
// Good names
it('should return user when credentials are valid')
it('should throw InvalidCredentialsError when password is wrong')
it('should send welcome email when user registers')

// Bad names
it('test login')
it('works')
it('should work correctly')
```

---

## Test Organization

```
tests/
├── unit/                    # Unit tests
│   ├── services/
│   ├── models/
│   └── utils/
├── integration/             # Integration tests
│   ├── api/
│   ├── database/
│   └── services/
├── e2e/                     # End-to-end tests
│   ├── flows/
│   └── journeys/
├── contracts/               # Contract tests
├── performance/             # Performance tests
└── fixtures/                # Shared test data
    ├── users.json
    └── orders.json
```
