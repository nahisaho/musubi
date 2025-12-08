# Database Tuning Guide

## Overview

Guide for optimizing database performance.

---

## Query Optimization

### Analyze Query Plans

```sql
-- PostgreSQL
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;

-- MySQL
EXPLAIN SELECT * FROM orders WHERE user_id = 123;
```

### Common Query Plan Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Seq Scan | Full table scan | Add index |
| Nested Loop | Slow joins | Review join strategy |
| Sort | Excessive sorting | Add sorted index |
| Hash Join | Large hash tables | Increase work_mem |

---

## Indexing Strategies

### When to Create Indexes

```sql
-- Frequently filtered columns
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Frequently sorted columns
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Composite index for common query patterns
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Partial index for filtered queries
CREATE INDEX idx_active_users ON users(id) WHERE status = 'active';

-- Expression index
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
```

### Index Types

| Type | Use Case | PostgreSQL | MySQL |
|------|----------|------------|-------|
| B-tree | Equality, range | Default | Default |
| Hash | Equality only | `USING HASH` | Memory only |
| GIN | Full-text, JSONB | `USING GIN` | N/A |
| GiST | Geometric, range | `USING GIST` | N/A |

### Avoid Over-Indexing

```sql
-- Bad: Too many single-column indexes
CREATE INDEX idx_a ON table(a);
CREATE INDEX idx_b ON table(b);
CREATE INDEX idx_c ON table(c);

-- Good: Composite index for common queries
CREATE INDEX idx_abc ON table(a, b, c);
```

---

## Connection Pooling

### PostgreSQL with PgBouncer

```ini
# pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
```

### Application Pool Configuration

```typescript
// Node.js with pg-pool
const pool = new Pool({
  host: 'localhost',
  database: 'mydb',
  max: 20,              // Maximum connections
  min: 5,               // Minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Configuration Tuning

### PostgreSQL

```conf
# postgresql.conf

# Memory
shared_buffers = 4GB          # 25% of RAM
effective_cache_size = 12GB   # 75% of RAM
work_mem = 256MB              # Per-operation memory
maintenance_work_mem = 1GB    # For VACUUM, CREATE INDEX

# Write Ahead Log
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB

# Query Planner
random_page_cost = 1.1        # SSD (use 4.0 for HDD)
effective_io_concurrency = 200

# Connections
max_connections = 200
```

### MySQL

```ini
# my.cnf

[mysqld]
# InnoDB
innodb_buffer_pool_size = 4G  # 70-80% of RAM
innodb_log_file_size = 1G
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Query Cache (disable in MySQL 8.0+)
query_cache_type = 0

# Connections
max_connections = 200
thread_cache_size = 50

# Logging
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
```

---

## Monitoring Queries

### Find Slow Queries

```sql
-- PostgreSQL: Enable pg_stat_statements
CREATE EXTENSION pg_stat_statements;

SELECT 
  query,
  calls,
  total_exec_time / 1000 AS total_seconds,
  mean_exec_time AS avg_ms,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Find Missing Indexes

```sql
-- PostgreSQL: Tables with sequential scans
SELECT 
  schemaname,
  relname,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_live_tup
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 10;
```

### Find Unused Indexes

```sql
-- PostgreSQL: Unused indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelid NOT IN (
  SELECT conindid FROM pg_constraint
)
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Table Maintenance

### VACUUM and ANALYZE

```sql
-- PostgreSQL
-- Regular maintenance
VACUUM ANALYZE tablename;

-- Full vacuum (locks table)
VACUUM FULL tablename;

-- Auto-vacuum settings
ALTER TABLE tablename SET (
  autovacuum_vacuum_threshold = 50,
  autovacuum_vacuum_scale_factor = 0.1
);
```

### Table Statistics

```sql
-- Update statistics
ANALYZE tablename;

-- View statistics
SELECT 
  attname,
  n_distinct,
  most_common_vals,
  correlation
FROM pg_stats
WHERE tablename = 'orders';
```

---

## Partitioning

### Range Partitioning

```sql
-- PostgreSQL: Partition by date
CREATE TABLE orders (
  id BIGINT,
  user_id BIGINT,
  amount DECIMAL(10,2),
  created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_01 
  PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE orders_2024_02 
  PARTITION OF orders
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

### Benefits of Partitioning
- Faster queries with partition pruning
- Easier data archival (drop old partitions)
- Smaller indexes per partition
- Parallel query execution

---

## Performance Checklist

### Query Level
- [ ] Query plan analyzed
- [ ] Appropriate indexes exist
- [ ] No unnecessary columns selected
- [ ] Pagination implemented

### Configuration Level
- [ ] Buffer pool sized appropriately
- [ ] Connection pool configured
- [ ] Slow query logging enabled

### Maintenance Level
- [ ] Regular VACUUM/ANALYZE
- [ ] Index bloat monitored
- [ ] Unused indexes removed
- [ ] Table statistics current

### Monitoring Level
- [ ] Query performance tracked
- [ ] Connection count monitored
- [ ] Disk I/O monitored
- [ ] Lock contention tracked
