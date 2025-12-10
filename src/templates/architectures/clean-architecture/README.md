# Clean Architecture Template

## Overview

Clean Architecture separates concerns into concentric circles, with dependencies pointing inward.

## Directory Structure

```
src/
├── domain/                 # Enterprise Business Rules (innermost)
│   ├── entities/           # Business entities
│   ├── value-objects/      # Immutable value types
│   ├── errors/             # Domain-specific errors
│   └── services/           # Domain services (no I/O)
│
├── application/            # Application Business Rules
│   ├── use-cases/          # Application-specific use cases
│   ├── ports/              # Interfaces for external services
│   │   ├── input/          # Input ports (use case interfaces)
│   │   └── output/         # Output ports (repository interfaces)
│   ├── dtos/               # Data Transfer Objects
│   └── services/           # Application services
│
├── infrastructure/         # Frameworks & Drivers (outermost)
│   ├── persistence/        # Database implementations
│   │   ├── repositories/   # Repository implementations
│   │   └── mappers/        # Entity <-> DB mappers
│   ├── external/           # External API clients
│   ├── messaging/          # Message queue adapters
│   └── config/             # Configuration
│
└── interface/              # Interface Adapters
    ├── controllers/        # HTTP/gRPC controllers
    ├── presenters/         # Response formatters
    ├── cli/                # CLI handlers
    └── gateways/           # External service gateways
```

## Dependency Rules

1. **Domain** has NO external dependencies
2. **Application** depends only on Domain
3. **Infrastructure** implements Application ports
4. **Interface** orchestrates Application use cases

## Key Principles

- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Separation of Concerns**: Each layer has a single responsibility
- **Testability**: Business logic is testable without frameworks
- **Independence**: Framework/database changes don't affect business logic

## Example Structure by Language

### TypeScript

```
src/
├── domain/
│   └── user/
│       ├── User.ts           # Entity
│       ├── UserId.ts         # Value Object
│       └── UserRepository.ts # Port (interface)
├── application/
│   └── user/
│       ├── CreateUser.ts     # Use Case
│       └── GetUser.ts        # Use Case
├── infrastructure/
│   └── persistence/
│       └── PrismaUserRepository.ts
└── interface/
    └── http/
        └── UserController.ts
```

### Rust

```
src/
├── domain/
│   └── user/
│       ├── mod.rs
│       ├── entity.rs         # User struct
│       ├── value_objects.rs  # UserId, Email
│       └── repository.rs     # Trait definition
├── application/
│   └── user/
│       ├── mod.rs
│       ├── create_user.rs    # Use case
│       └── get_user.rs       # Use case
├── infrastructure/
│   └── persistence/
│       ├── mod.rs
│       └── postgres_user_repo.rs
└── interface/
    └── api/
        ├── mod.rs
        └── user_handler.rs
```

## Testing Strategy

| Layer          | Test Type          | Dependencies     |
| -------------- | ------------------ | ---------------- |
| Domain         | Unit               | None             |
| Application    | Unit + Integration | Mocked ports     |
| Infrastructure | Integration        | Real DB/Services |
| Interface      | E2E                | Full stack       |

---

_Clean Architecture Template - MUSUBI SDD_
