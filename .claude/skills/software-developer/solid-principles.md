# SOLID Principles Guide

## Overview

SOLID is an acronym for five design principles that make software designs more understandable, flexible, and maintainable.

---

## S - Single Responsibility Principle (SRP)

> **A class should have only one reason to change.**

### Definition
A class should have only one job or responsibility. If a class has multiple responsibilities, changes to one responsibility may affect the other.

### Bad Example ❌
```typescript
class UserService {
  createUser(data: UserData): User {
    // Create user
    const user = this.repository.create(data);
    
    // Send welcome email (second responsibility!)
    this.emailService.send(user.email, 'Welcome!');
    
    // Log activity (third responsibility!)
    this.logger.log(`User created: ${user.id}`);
    
    return user;
  }
}
```

### Good Example ✅
```typescript
class UserService {
  createUser(data: UserData): User {
    return this.repository.create(data);
  }
}

class UserEventHandler {
  onUserCreated(user: User): void {
    this.emailService.sendWelcome(user);
    this.activityLogger.logCreation(user);
  }
}
```

### Checklist
- [ ] Does the class have only one reason to change?
- [ ] Can you describe the class responsibility in one sentence without "and"?
- [ ] Are all methods related to the same responsibility?

---

## O - Open/Closed Principle (OCP)

> **Software entities should be open for extension but closed for modification.**

### Definition
You should be able to extend a class's behavior without modifying its existing code.

### Bad Example ❌
```typescript
class PaymentProcessor {
  processPayment(type: string, amount: number): void {
    if (type === 'credit') {
      // Process credit card
    } else if (type === 'paypal') {
      // Process PayPal
    } else if (type === 'crypto') {
      // Process crypto - had to modify existing class!
    }
  }
}
```

### Good Example ✅
```typescript
interface PaymentMethod {
  process(amount: number): PaymentResult;
}

class CreditCardPayment implements PaymentMethod {
  process(amount: number): PaymentResult {
    // Credit card processing
  }
}

class PayPalPayment implements PaymentMethod {
  process(amount: number): PaymentResult {
    // PayPal processing
  }
}

class CryptoPayment implements PaymentMethod {
  process(amount: number): PaymentResult {
    // New payment method - no modification to existing classes!
  }
}

class PaymentProcessor {
  process(method: PaymentMethod, amount: number): PaymentResult {
    return method.process(amount);
  }
}
```

### Checklist
- [ ] Can new features be added without modifying existing code?
- [ ] Are extension points (interfaces, abstract classes) defined?
- [ ] Does adding a new case require only adding new code?

---

## L - Liskov Substitution Principle (LSP)

> **Subtypes must be substitutable for their base types.**

### Definition
Objects of a superclass should be replaceable with objects of its subclasses without affecting program correctness.

### Bad Example ❌
```typescript
class Rectangle {
  constructor(public width: number, public height: number) {}
  
  setWidth(width: number): void {
    this.width = width;
  }
  
  setHeight(height: number): void {
    this.height = height;
  }
  
  area(): number {
    return this.width * this.height;
  }
}

class Square extends Rectangle {
  setWidth(width: number): void {
    this.width = width;
    this.height = width; // Violates LSP!
  }
  
  setHeight(height: number): void {
    this.width = height;
    this.height = height; // Violates LSP!
  }
}

// This test fails for Square!
function testRectangle(rect: Rectangle): void {
  rect.setWidth(5);
  rect.setHeight(4);
  assert(rect.area() === 20); // Fails for Square (returns 16)
}
```

### Good Example ✅
```typescript
interface Shape {
  area(): number;
}

class Rectangle implements Shape {
  constructor(public width: number, public height: number) {}
  
  area(): number {
    return this.width * this.height;
  }
}

class Square implements Shape {
  constructor(public side: number) {}
  
  area(): number {
    return this.side * this.side;
  }
}
```

### Checklist
- [ ] Can subclass be used anywhere parent is expected?
- [ ] Do subclasses honor the parent's contract?
- [ ] Are there any overridden methods that change expected behavior?

---

## I - Interface Segregation Principle (ISP)

> **Clients should not be forced to depend on interfaces they do not use.**

### Definition
Many specific interfaces are better than one general-purpose interface. Don't force classes to implement methods they don't need.

### Bad Example ❌
```typescript
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
}

class HumanWorker implements Worker {
  work(): void { /* ... */ }
  eat(): void { /* ... */ }
  sleep(): void { /* ... */ }
}

class RobotWorker implements Worker {
  work(): void { /* ... */ }
  eat(): void { throw new Error('Robots don\'t eat!'); } // Forced to implement!
  sleep(): void { throw new Error('Robots don\'t sleep!'); } // Forced to implement!
}
```

### Good Example ✅
```typescript
interface Workable {
  work(): void;
}

interface Eatable {
  eat(): void;
}

interface Sleepable {
  sleep(): void;
}

class HumanWorker implements Workable, Eatable, Sleepable {
  work(): void { /* ... */ }
  eat(): void { /* ... */ }
  sleep(): void { /* ... */ }
}

class RobotWorker implements Workable {
  work(): void { /* ... */ }
  // No need to implement eat or sleep!
}
```

### Checklist
- [ ] Are interfaces focused and cohesive?
- [ ] Do implementing classes use all interface methods?
- [ ] Can large interfaces be split into smaller ones?

---

## D - Dependency Inversion Principle (DIP)

> **High-level modules should not depend on low-level modules. Both should depend on abstractions.**

### Definition
Depend on abstractions (interfaces), not concrete implementations. This allows for flexibility and easier testing.

### Bad Example ❌
```typescript
class MySQLDatabase {
  query(sql: string): any[] {
    // MySQL-specific implementation
  }
}

class UserRepository {
  private database = new MySQLDatabase(); // Tight coupling!
  
  findById(id: string): User {
    return this.database.query(`SELECT * FROM users WHERE id = '${id}'`);
  }
}
```

### Good Example ✅
```typescript
interface Database {
  query(sql: string): any[];
}

class MySQLDatabase implements Database {
  query(sql: string): any[] {
    // MySQL-specific implementation
  }
}

class PostgreSQLDatabase implements Database {
  query(sql: string): any[] {
    // PostgreSQL-specific implementation
  }
}

class UserRepository {
  constructor(private database: Database) {} // Injected!
  
  findById(id: string): User {
    return this.database.query(`SELECT * FROM users WHERE id = '${id}'`);
  }
}

// Usage - easy to swap implementations
const repository = new UserRepository(new MySQLDatabase());
// or
const repository = new UserRepository(new PostgreSQLDatabase());
// or for testing
const repository = new UserRepository(new MockDatabase());
```

### Checklist
- [ ] Do high-level modules depend on abstractions?
- [ ] Are dependencies injected rather than created internally?
- [ ] Can implementations be swapped without code changes?

---

## SOLID Summary Table

| Principle | Acronym | Key Idea |
|-----------|---------|----------|
| Single Responsibility | S | One class, one job |
| Open/Closed | O | Extend, don't modify |
| Liskov Substitution | L | Subtypes are replaceable |
| Interface Segregation | I | Small, focused interfaces |
| Dependency Inversion | D | Depend on abstractions |

---

## SOLID in MUSUBI Context

### Constitutional Alignment

| Principle | Constitutional Article |
|-----------|----------------------|
| SRP | Article VII: Simplicity Gate |
| OCP | Article I: Library-First (extensible libraries) |
| LSP | Article III: Test-First (substitutable mocks) |
| ISP | Article VIII: Anti-Abstraction (focused interfaces) |
| DIP | Article IX: Integration-First (testable dependencies) |

### When to Apply

1. **Always apply SRP**: Keep classes focused
2. **Apply OCP for extension points**: Payment methods, validators, etc.
3. **Apply LSP when using inheritance**: Prefer composition when unclear
4. **Apply ISP for public interfaces**: Internal code can be more flexible
5. **Apply DIP for external dependencies**: Databases, APIs, services
