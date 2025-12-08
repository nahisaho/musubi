# C4 Model Guide

## Overview

The C4 model is a set of hierarchical diagrams for visualizing software architecture at different levels of abstraction. MUSUBI SDD uses C4 for all architecture documentation.

---

## C4 Diagram Levels

### Level 1: System Context Diagram

**Purpose**: Shows how the system fits into the world around it.

**Scope**: Single software system

**Primary Elements**:
- Your system (center)
- Users (people)
- External systems

**Audience**: Everyone - both technical and non-technical

```mermaid
C4Context
    title System Context Diagram - E-Commerce Platform
    
    Person(customer, "Customer", "A user who purchases products")
    Person(admin, "Admin", "System administrator")
    
    System(ecommerce, "E-Commerce Platform", "Allows customers to browse and purchase products")
    
    System_Ext(payment, "Payment Gateway", "Processes credit card payments")
    System_Ext(shipping, "Shipping API", "Calculates shipping rates")
    System_Ext(email, "Email Service", "Sends transactional emails")
    
    Rel(customer, ecommerce, "Browses, purchases")
    Rel(admin, ecommerce, "Manages products, orders")
    Rel(ecommerce, payment, "Processes payments")
    Rel(ecommerce, shipping, "Gets shipping rates")
    Rel(ecommerce, email, "Sends emails")
```

**Template**:
```markdown
## Level 1: System Context

### System
- **Name**: [System Name]
- **Description**: [What the system does]

### Users
| User | Description |
|------|-------------|
| [User Type] | [User description and goals] |

### External Systems
| System | Description | Integration |
|--------|-------------|-------------|
| [External System] | [What it does] | [How we integrate] |
```

---

### Level 2: Container Diagram

**Purpose**: Shows high-level technology choices and how containers communicate.

**Scope**: Single software system

**Primary Elements**:
- Containers (applications, data stores, etc.)
- Relationships between containers

**Audience**: Technical people

```mermaid
C4Container
    title Container Diagram - E-Commerce Platform
    
    Person(customer, "Customer")
    
    Container_Boundary(c1, "E-Commerce Platform") {
        Container(web, "Web Application", "React", "Delivers the web frontend")
        Container(api, "API Server", "Node.js/Express", "Provides REST API")
        Container(worker, "Background Worker", "Node.js", "Processes async tasks")
        ContainerDb(db, "Database", "PostgreSQL", "Stores users, products, orders")
        ContainerDb(cache, "Cache", "Redis", "Caches sessions, products")
        ContainerDb(queue, "Message Queue", "RabbitMQ", "Handles async messaging")
    }
    
    System_Ext(payment, "Payment Gateway")
    
    Rel(customer, web, "Uses", "HTTPS")
    Rel(web, api, "API calls", "HTTPS/JSON")
    Rel(api, db, "Reads/Writes")
    Rel(api, cache, "Reads/Writes")
    Rel(api, queue, "Publishes")
    Rel(worker, queue, "Consumes")
    Rel(api, payment, "Processes payments", "HTTPS")
```

**Template**:
```markdown
## Level 2: Container Diagram

### Containers

| Container | Technology | Description |
|-----------|------------|-------------|
| Web App | React | Frontend SPA |
| API Server | Node.js/Express | REST API backend |
| Database | PostgreSQL | Persistent storage |
| Cache | Redis | Session and data cache |
| Queue | RabbitMQ | Async message processing |

### Communication

| From | To | Protocol | Purpose |
|------|----|-----------| --------|
| Web App | API Server | HTTPS/REST | API calls |
| API Server | Database | TCP | Data persistence |
| API Server | Cache | TCP | Caching |
```

---

### Level 3: Component Diagram

**Purpose**: Shows how a container is made up of components.

**Scope**: Single container

**Primary Elements**:
- Components (modules, services, controllers)
- Relationships between components

**Audience**: Developers

```mermaid
C4Component
    title Component Diagram - API Server
    
    Container_Boundary(api, "API Server") {
        Component(auth, "Auth Controller", "Express Router", "Handles authentication")
        Component(user, "User Controller", "Express Router", "User CRUD operations")
        Component(order, "Order Controller", "Express Router", "Order management")
        Component(authService, "Auth Service", "TypeScript", "Authentication logic")
        Component(userService, "User Service", "TypeScript", "User business logic")
        Component(orderService, "Order Service", "TypeScript", "Order business logic")
        Component(repo, "Repository Layer", "TypeScript", "Data access abstraction")
    }
    
    ContainerDb(db, "Database", "PostgreSQL")
    
    Rel(auth, authService, "Uses")
    Rel(user, userService, "Uses")
    Rel(order, orderService, "Uses")
    Rel(authService, repo, "Uses")
    Rel(userService, repo, "Uses")
    Rel(orderService, repo, "Uses")
    Rel(repo, db, "Reads/Writes")
```

**Template**:
```markdown
## Level 3: Component Diagram - [Container Name]

### Components

| Component | Type | Responsibility |
|-----------|------|----------------|
| Auth Controller | Controller | Handle auth endpoints |
| Auth Service | Service | Authentication logic |
| User Repository | Repository | User data access |

### Dependencies

| Component | Depends On | Purpose |
|-----------|------------|---------|
| Auth Controller | Auth Service | Business logic |
| Auth Service | User Repository | Data access |
```

---

### Level 4: Code Diagram (Optional)

**Purpose**: Shows how a component is implemented.

**Scope**: Single component

**Primary Elements**:
- Classes, interfaces, modules
- Relationships (inheritance, composition)

**Audience**: Developers

**Note**: Often generated automatically from code.

```mermaid
classDiagram
    class AuthService {
        -userRepository: UserRepository
        -jwtService: JwtService
        +login(email, password): AuthResult
        +register(userData): User
        +validateToken(token): boolean
        +refreshToken(token): string
    }
    
    class UserRepository {
        +findByEmail(email): User
        +create(user): User
        +update(id, data): User
    }
    
    class JwtService {
        +sign(payload): string
        +verify(token): Payload
    }
    
    AuthService --> UserRepository
    AuthService --> JwtService
```

---

## C4 Diagram Notation

### Element Types

| Element | Notation | Description |
|---------|----------|-------------|
| Person | ![Person](stick figure) | A user of the system |
| System | ![System](box) | The system being described |
| External System | ![External](dashed box) | External dependency |
| Container | ![Container](box in system) | Deployable unit |
| Component | ![Component](box in container) | Code module |
| Database | ![Database](cylinder) | Data storage |

### Relationship Arrows

```
[Source] --"description"--> [Target]

Examples:
- Customer --> Web App : "Uses"
- API --> Database : "Reads/Writes"
- Service --> External API : "Calls via HTTPS"
```

---

## Best Practices

### Do

1. **Start from Level 1**: Always create context diagram first
2. **Use consistent notation**: Follow C4 conventions
3. **Include descriptions**: Every element needs a description
4. **Show technology choices**: Especially at container/component level
5. **Keep it simple**: If diagram is too complex, zoom in

### Don't

1. **Don't mix levels**: Each diagram should be at one level
2. **Don't show too much**: 10-15 elements maximum per diagram
3. **Don't skip levels**: Create all relevant levels
4. **Don't forget relationships**: Show how elements communicate
5. **Don't use generic names**: Be specific (not "Database" but "User Database")

---

## MUSUBI C4 Template

```markdown
# Architecture Design: [Feature Name]

## Level 1: System Context

[Mermaid diagram]

### Systems and Users
| Element | Type | Description |
|---------|------|-------------|
| | | |

## Level 2: Container Diagram

[Mermaid diagram]

### Containers
| Container | Technology | Purpose |
|-----------|------------|---------|
| | | |

## Level 3: Component Diagram - [Container]

[Mermaid diagram]

### Components
| Component | Type | Responsibility |
|-----------|------|----------------|
| | | |

## Technology Decisions

See ADR-XXX for rationale.

## Requirements Traceability

| REQ ID | Addressed By |
|--------|--------------|
| REQ-001 | Auth Service |
```

---

## Tools for C4 Diagrams

| Tool | Format | Notes |
|------|--------|-------|
| Mermaid | Markdown | Recommended - works in GitHub |
| PlantUML | Text | Rich features |
| Structurizr | DSL | Official C4 tooling |
| Draw.io | Visual | Easy for non-technical |
| Lucidchart | Visual | Collaboration features |
