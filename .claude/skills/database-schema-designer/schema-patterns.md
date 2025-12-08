# Schema Design Patterns

## Overview

Best practices for designing database schemas.

---

## Naming Conventions

### Tables
```sql
-- Use plural, lowercase, snake_case
users
order_items
user_profiles

-- Avoid prefixes
-- Bad: tbl_users, t_orders
-- Good: users, orders
```

### Columns
```sql
-- Use lowercase snake_case
first_name
created_at
is_active

-- Foreign keys: table_id
user_id
order_id
category_id

-- Boolean: is_, has_, can_
is_active
has_verified_email
can_edit
```

### Indexes
```sql
-- idx_table_column
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id_created_at ON orders(user_id, created_at);
```

---

## Primary Keys

### Auto-increment
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  ...
);
```

### UUID
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);
```

### Composite Key
```sql
CREATE TABLE order_items (
  order_id BIGINT,
  product_id BIGINT,
  quantity INT,
  PRIMARY KEY (order_id, product_id)
);
```

---

## Common Patterns

### Timestamps
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  ...
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();
```

### Soft Delete
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  ...
  deleted_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN GENERATED ALWAYS AS (deleted_at IS NOT NULL) STORED
);

-- Index for queries
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;
```

### Audit Trail
```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id BIGINT NOT NULL,
  action VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  changed_by BIGINT REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Relationships

### One-to-Many
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  total DECIMAL(10,2)
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### Many-to-Many
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE
);

CREATE TABLE user_roles (
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);
```

### Self-Referencing
```sql
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100),
  parent_id BIGINT REFERENCES categories(id)
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
```

---

## Data Types

### PostgreSQL Types

| Use Case | Type |
|----------|------|
| Auto ID | BIGSERIAL |
| UUID | UUID |
| Short text | VARCHAR(n) |
| Long text | TEXT |
| Integer | INT, BIGINT |
| Decimal | NUMERIC(p,s), DECIMAL |
| Money | NUMERIC(10,2) |
| Boolean | BOOLEAN |
| Date | DATE |
| Timestamp | TIMESTAMP WITH TIME ZONE |
| JSON | JSONB |
| Array | INTEGER[], TEXT[] |
| Enum | Custom ENUM or VARCHAR |

### Enums vs Lookup Tables

```sql
-- Enum (simple, limited values)
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered');

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  status order_status DEFAULT 'pending'
);

-- Lookup table (flexible, more metadata)
CREATE TABLE order_statuses (
  id SMALLINT PRIMARY KEY,
  code VARCHAR(20) UNIQUE,
  name VARCHAR(50),
  is_final BOOLEAN DEFAULT FALSE
);

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  status_id SMALLINT REFERENCES order_statuses(id)
);
```

---

## Constraints

```sql
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  
  -- NOT NULL
  name VARCHAR(100) NOT NULL,
  
  -- UNIQUE
  sku VARCHAR(50) UNIQUE,
  
  -- CHECK
  price DECIMAL(10,2) CHECK (price >= 0),
  quantity INT CHECK (quantity >= 0),
  
  -- DEFAULT
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- FOREIGN KEY
  category_id BIGINT REFERENCES categories(id)
);

-- Named constraints
ALTER TABLE products ADD CONSTRAINT chk_price_positive 
  CHECK (price >= 0);
```

---

## Schema Template

```sql
-- ============================================
-- Schema: [Schema Name]
-- Description: [Purpose of this schema]
-- Version: 1.0
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

-- Tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  status user_status DEFAULT 'active',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Comments
COMMENT ON TABLE users IS 'User accounts';
COMMENT ON COLUMN users.status IS 'Account status: active, inactive, suspended';
```

---

## Schema Checklist

### Naming
- [ ] Consistent naming convention
- [ ] Descriptive names
- [ ] No reserved words

### Structure
- [ ] Appropriate primary keys
- [ ] Proper data types
- [ ] Necessary constraints

### Performance
- [ ] Indexes on foreign keys
- [ ] Indexes on filtered columns
- [ ] Indexes on sorted columns

### Integrity
- [ ] Foreign key relationships
- [ ] NOT NULL where required
- [ ] CHECK constraints

### Audit
- [ ] Created/updated timestamps
- [ ] Soft delete if needed
- [ ] Audit trail for sensitive data
