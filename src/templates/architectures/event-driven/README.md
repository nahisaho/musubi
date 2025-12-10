# Event-Driven Architecture Template

## Overview

Event-Driven Architecture (EDA) enables loose coupling through asynchronous event communication.

## Directory Structure

```
src/
├── domain/
│   ├── events/             # Domain events
│   │   ├── UserCreated.ts
│   │   ├── OrderPlaced.ts
│   │   └── PaymentReceived.ts
│   ├── aggregates/         # Aggregate roots
│   └── commands/           # Command definitions
│
├── application/
│   ├── command-handlers/   # Handle commands, emit events
│   ├── event-handlers/     # React to events
│   ├── sagas/              # Long-running processes
│   └── projections/        # Read model projections
│
├── infrastructure/
│   ├── messaging/          # Message broker adapters
│   │   ├── kafka/
│   │   ├── rabbitmq/
│   │   └── sqs/
│   ├── event-store/        # Event sourcing storage
│   └── projections/        # Projection storage
│
└── interface/
    ├── api/                # REST/GraphQL API
    ├── consumers/          # Event consumers
    └── publishers/         # Event publishers
```

## Event Types

### Domain Events

```typescript
// domain/events/UserCreated.ts
interface UserCreated {
  eventId: string;
  eventType: 'UserCreated';
  aggregateId: string;
  timestamp: Date;
  data: {
    userId: string;
    email: string;
    name: string;
  };
  metadata: {
    correlationId: string;
    causationId: string;
  };
}
```

### Integration Events

```typescript
// infrastructure/messaging/events/UserRegistrationCompleted.ts
interface UserRegistrationCompleted {
  eventId: string;
  eventType: 'UserRegistrationCompleted';
  source: 'user-service';
  timestamp: Date;
  data: {
    userId: string;
    email: string;
  };
}
```

## Patterns

### Command Handler

```typescript
class CreateUserHandler {
  async handle(command: CreateUserCommand): Promise<void> {
    const user = User.create(command);
    await this.repository.save(user);
    await this.eventPublisher.publish(new UserCreated(user));
  }
}
```

### Event Handler

```typescript
class SendWelcomeEmailHandler {
  async handle(event: UserCreated): Promise<void> {
    await this.emailService.sendWelcome(event.data.email);
  }
}
```

### Saga (Process Manager)

```typescript
class OrderFulfillmentSaga {
  async handle(event: OrderPlaced): Promise<void> {
    // Step 1: Reserve inventory
    await this.dispatch(new ReserveInventory(event.orderId));

    // Step 2: Process payment
    await this.dispatch(new ProcessPayment(event.orderId));

    // Step 3: Ship order (triggered by PaymentReceived)
  }

  async onPaymentReceived(event: PaymentReceived): Promise<void> {
    await this.dispatch(new ShipOrder(event.orderId));
  }
}
```

## Event Sourcing (Optional)

```
events/
├── event-store/
│   └── PostgresEventStore.ts
├── snapshots/
│   └── UserSnapshot.ts
└── projections/
    ├── UserProjection.ts
    └── OrderProjection.ts
```

## Message Broker Integration

| Broker        | Use Case                        | Configuration            |
| ------------- | ------------------------------- | ------------------------ |
| Kafka         | High-throughput, ordered events | Topics, partitions       |
| RabbitMQ      | Complex routing, reliability    | Exchanges, queues        |
| AWS SQS/SNS   | Serverless, AWS integration     | Queues, topics           |
| Redis Streams | Low-latency, in-memory          | Streams, consumer groups |

## Key Principles

1. **Eventual Consistency**: Accept that data will be consistent eventually
2. **Idempotency**: Handlers must be idempotent (safe to retry)
3. **Event Ordering**: Consider ordering requirements per aggregate
4. **Dead Letter Queues**: Handle failed events gracefully

## Testing Strategy

| Component | Test Type   | Approach                  |
| --------- | ----------- | ------------------------- |
| Events    | Schema      | JSON Schema validation    |
| Handlers  | Unit        | Mock event publisher      |
| Sagas     | Integration | In-memory event store     |
| E2E       | Contract    | Consumer-driven contracts |

---

_Event-Driven Architecture Template - MUSUBI SDD_
