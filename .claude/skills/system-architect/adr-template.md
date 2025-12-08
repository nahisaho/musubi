# Architecture Decision Record (ADR) Template

## Overview

An Architecture Decision Record (ADR) captures an important architectural decision along with its context and consequences.

---

## ADR Template

```markdown
# ADR-[NUMBER]: [TITLE]

## Status

[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Date

YYYY-MM-DD

## Context

[Describe the issue motivating this decision, the context, and any constraints.]

What is the issue that we're seeing that is motivating this decision or change?

## Decision

[Describe the change that we're proposing or have made.]

We will...

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Tradeoff 1]
- [Tradeoff 2]

### Neutral
- [Neither positive nor negative consequence]

## Alternatives Considered

### Alternative 1: [Name]
- **Pros**: [Benefits]
- **Cons**: [Drawbacks]
- **Reason for rejection**: [Why not chosen]

### Alternative 2: [Name]
- **Pros**: [Benefits]
- **Cons**: [Drawbacks]
- **Reason for rejection**: [Why not chosen]

## Related

- [Link to related ADRs]
- [Link to requirements]
- [Link to design documents]
```

---

## ADR Example

```markdown
# ADR-001: Use PostgreSQL as Primary Database

## Status

Accepted

## Date

2025-01-15

## Context

We need to choose a primary database for our e-commerce platform. The system needs to:
- Handle complex relational data (users, orders, products)
- Support ACID transactions for payment processing
- Scale to 10,000+ concurrent users
- Provide full-text search capabilities

Our team has experience with both PostgreSQL and MySQL. The project has 12 months to production.

## Decision

We will use **PostgreSQL 16** as our primary database.

Specific configuration:
- Managed PostgreSQL on AWS RDS
- Primary-replica setup for read scaling
- pg_trgm extension for full-text search
- Connection pooling via PgBouncer

## Consequences

### Positive
- Rich feature set (JSON, full-text search, extensions)
- Strong ACID compliance for financial transactions
- Excellent open-source community support
- Team has PostgreSQL experience
- Cost-effective (open source)

### Negative
- More complex configuration than MySQL
- Requires dedicated DBA knowledge for optimization
- Memory-intensive for complex queries

### Neutral
- Similar performance to MySQL for our use case
- Learning curve for advanced features (CTEs, window functions)

## Alternatives Considered

### Alternative 1: MySQL 8.0
- **Pros**: Simpler setup, lower memory footprint, wide hosting support
- **Cons**: Weaker JSON support, limited extensions
- **Reason for rejection**: PostgreSQL's richer feature set better suits complex e-commerce queries

### Alternative 2: MongoDB
- **Pros**: Flexible schema, horizontal scaling, JSON-native
- **Cons**: Weak transactions, eventual consistency concerns for payments
- **Reason for rejection**: ACID transactions required for financial operations

### Alternative 3: CockroachDB
- **Pros**: Distributed, PostgreSQL-compatible, auto-scaling
- **Cons**: Higher cost, newer technology, fewer DBAs available
- **Reason for rejection**: Overkill for initial scale, can migrate later if needed

## Related

- REQ-NF-001: Database must support ACID transactions
- REQ-NF-002: System must scale to 10,000 concurrent users
- ADR-002: Use Redis for Caching (complementary decision)
```

---

## ADR Categories

### Technology Selection
- Database choice
- Framework selection
- Cloud provider
- Third-party services

### Architecture Patterns
- Microservices vs. Monolith
- Event-driven architecture
- API design (REST vs. GraphQL)
- Caching strategy

### Development Practices
- Testing strategy
- CI/CD approach
- Code organization
- Dependency management

### Security
- Authentication method
- Authorization model
- Data encryption
- Secret management

### Performance
- Scaling strategy
- Caching layers
- Database optimization
- CDN usage

---

## ADR Lifecycle

```
┌──────────────┐
│   Proposed   │
└──────┬───────┘
       │ Review & Discussion
       ▼
┌──────────────┐
│   Accepted   │
└──────┬───────┘
       │ Over time...
       ▼
┌──────────────────────────┐
│   Deprecated    OR       │
│   Superseded by ADR-XXX  │
└──────────────────────────┘
```

---

## ADR Best Practices

### Do

1. **Write ADRs early**: Capture decisions when context is fresh
2. **Keep them short**: 1-2 pages maximum
3. **Focus on why**: Context and rationale are most important
4. **Link to requirements**: Show traceability
5. **Review with team**: ADRs should be collaborative
6. **Update status**: Mark deprecated/superseded when things change
7. **Use clear titles**: "Use X for Y" format works well

### Don't

1. **Don't over-document**: Not every decision needs an ADR
2. **Don't delete ADRs**: Keep history, mark as deprecated
3. **Don't forget alternatives**: Show what was considered
4. **Don't ignore consequences**: Be honest about tradeoffs
5. **Don't delay updates**: Keep ADRs current

---

## When to Write an ADR

Write an ADR when:

- [ ] Decision affects multiple components
- [ ] Decision is difficult to reverse
- [ ] Decision involves significant tradeoffs
- [ ] Team needs to align on approach
- [ ] Future developers need to understand "why"

Skip ADR when:

- [ ] Decision is trivial (variable naming, etc.)
- [ ] Decision follows established patterns
- [ ] Decision is easily reversible
- [ ] Decision is project-specific implementation detail

---

## ADR Numbering

```
ADR-001: First major decision
ADR-002: Second major decision
...
ADR-NNN: Nth decision

Superseded:
ADR-005 (Superseded by ADR-012)
```

---

## ADR Directory Structure

```
docs/
└── adr/
    ├── README.md           # ADR index
    ├── template.md         # ADR template
    ├── ADR-001-database.md
    ├── ADR-002-caching.md
    ├── ADR-003-auth.md
    └── ...
```

---

## ADR Index Template

```markdown
# Architecture Decision Records

## Active ADRs

| ADR | Title | Date | Status |
|-----|-------|------|--------|
| [ADR-001](ADR-001-database.md) | Use PostgreSQL as Primary Database | 2025-01-15 | Accepted |
| [ADR-002](ADR-002-caching.md) | Use Redis for Caching | 2025-01-16 | Accepted |
| [ADR-003](ADR-003-auth.md) | Use JWT for Authentication | 2025-01-17 | Accepted |

## Superseded ADRs

| ADR | Title | Superseded By |
|-----|-------|---------------|
| [ADR-004](ADR-004-old-api.md) | REST API v1 Design | ADR-010 |

## How to Propose a New ADR

1. Copy `template.md` to `ADR-NNN-title.md`
2. Fill in the template
3. Submit PR for review
4. After approval, update this index
```
