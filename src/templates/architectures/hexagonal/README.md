# Hexagonal Architecture Template

## Overview

Hexagonal Architecture (Ports & Adapters) focuses on isolating the application core from external concerns.

## Directory Structure

```
src/
├── core/                   # Application Core (Hexagon)
│   ├── domain/             # Domain model
│   │   ├── models/         # Entities and aggregates
│   │   ├── events/         # Domain events
│   │   └── services/       # Domain services
│   │
│   ├── ports/              # Ports (interfaces)
│   │   ├── inbound/        # Driving ports (use cases)
│   │   │   ├── UserService.ts
│   │   │   └── OrderService.ts
│   │   └── outbound/       # Driven ports (repositories, external)
│   │       ├── UserRepository.ts
│   │       └── PaymentGateway.ts
│   │
│   └── application/        # Application logic
│       ├── commands/       # Command handlers
│       ├── queries/        # Query handlers
│       └── services/       # Application services
│
└── adapters/               # Adapters (outside the hexagon)
    ├── inbound/            # Driving adapters
    │   ├── http/           # REST API
    │   ├── grpc/           # gRPC services
    │   ├── graphql/        # GraphQL resolvers
    │   └── cli/            # CLI interface
    │
    └── outbound/           # Driven adapters
        ├── persistence/    # Database implementations
        ├── messaging/      # Message queue clients
        ├── http-clients/   # External API clients
        └── cache/          # Cache implementations
```

## Port Types

### Inbound Ports (Driving)

Define what the application CAN DO:

```typescript
// ports/inbound/UserService.ts
interface UserService {
  createUser(command: CreateUserCommand): Promise<User>;
  getUser(id: UserId): Promise<User | null>;
  updateUser(command: UpdateUserCommand): Promise<User>;
}
```

### Outbound Ports (Driven)

Define what the application NEEDS:

```typescript
// ports/outbound/UserRepository.ts
interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
}
```

## Adapter Types

### Inbound Adapters (Driving)

Translate external input to port calls:

```typescript
// adapters/inbound/http/UserController.ts
class UserController {
  constructor(private userService: UserService) {}

  async create(req: Request): Promise<Response> {
    const user = await this.userService.createUser(req.body);
    return Response.created(user);
  }
}
```

### Outbound Adapters (Driven)

Implement ports with external systems:

```typescript
// adapters/outbound/persistence/PostgresUserRepository.ts
class PostgresUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    await this.db.query('INSERT INTO users ...');
  }
}
```

## Key Principles

1. **Core Independence**: The core knows nothing about adapters
2. **Ports as Contracts**: Ports define the API between core and outside
3. **Swappable Adapters**: Any adapter can be replaced without changing the core
4. **Testability**: Core can be tested with mock adapters

## Dependency Injection

```typescript
// Composition root
const userRepository = new PostgresUserRepository(db);
const userService = new UserServiceImpl(userRepository);
const userController = new UserController(userService);
```

## Testing Strategy

| Component   | Test Type   | Approach                 |
| ----------- | ----------- | ------------------------ |
| Domain      | Unit        | Pure functions, no mocks |
| Ports       | Contract    | Interface compliance     |
| Application | Unit        | Mock outbound ports      |
| Adapters    | Integration | Real external systems    |

---

_Hexagonal Architecture Template - MUSUBI SDD_
