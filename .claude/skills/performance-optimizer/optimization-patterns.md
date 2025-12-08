# Performance Optimization Patterns

## Overview

Common patterns for optimizing application performance.

---

## 1. Caching Patterns

### Cache-Aside (Lazy Loading)

```typescript
async function getUser(id: string): Promise<User> {
  // Try cache first
  let user = await cache.get(`user:${id}`);
  
  if (!user) {
    // Cache miss - load from DB
    user = await db.users.findById(id);
    await cache.set(`user:${id}`, user, { ttl: 3600 });
  }
  
  return user;
}
```

**Use When**: Read-heavy workloads

### Write-Through Cache

```typescript
async function updateUser(id: string, data: Partial<User>): Promise<User> {
  // Update DB
  const user = await db.users.update(id, data);
  
  // Update cache
  await cache.set(`user:${id}`, user, { ttl: 3600 });
  
  return user;
}
```

**Use When**: Data consistency is critical

### Cache Invalidation

```typescript
async function deleteUser(id: string): Promise<void> {
  await db.users.delete(id);
  await cache.delete(`user:${id}`);
  await cache.delete(`user:${id}:*`); // Related keys
}
```

---

## 2. Database Patterns

### Connection Pooling

```typescript
const pool = new Pool({
  max: 20,        // Max connections
  min: 5,         // Min connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Indexing Strategy

```sql
-- Frequently queried columns
CREATE INDEX idx_users_email ON users(email);

-- Composite index for common queries
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);

-- Partial index for filtered queries
CREATE INDEX idx_active_users ON users(id) WHERE status = 'active';
```

### Query Optimization

```typescript
// BAD: N+1 Query
const users = await User.findAll();
for (const user of users) {
  user.orders = await Order.findByUserId(user.id); // N queries!
}

// GOOD: Eager loading
const users = await User.findAll({
  include: [{ model: Order }]  // 1 query with JOIN
});
```

### Pagination

```typescript
// Offset pagination (simple but slow for large offsets)
const page = await db.query(
  'SELECT * FROM items LIMIT $1 OFFSET $2',
  [pageSize, (page - 1) * pageSize]
);

// Cursor pagination (efficient)
const page = await db.query(
  'SELECT * FROM items WHERE id > $1 ORDER BY id LIMIT $2',
  [lastSeenId, pageSize]
);
```

---

## 3. API Patterns

### Response Compression

```typescript
import compression from 'compression';
app.use(compression());
```

### Field Selection (Sparse Fieldsets)

```typescript
// GET /users?fields=id,name,email
app.get('/users', (req, res) => {
  const fields = req.query.fields?.split(',') || ['*'];
  const users = await db.query(
    `SELECT ${fields.join(',')} FROM users`
  );
  res.json(users);
});
```

### Batch Operations

```typescript
// BAD: Multiple requests
await api.getUser(1);
await api.getUser(2);
await api.getUser(3);

// GOOD: Batch request
await api.getUsers([1, 2, 3]);
```

---

## 4. Async Patterns

### Background Jobs

```typescript
// Don't block request for slow operations
app.post('/orders', async (req, res) => {
  const order = await createOrder(req.body);
  
  // Queue async tasks
  await queue.add('send-confirmation-email', { orderId: order.id });
  await queue.add('update-inventory', { orderId: order.id });
  
  res.json(order); // Respond immediately
});
```

### Parallel Execution

```typescript
// BAD: Sequential
const users = await getUsers();
const products = await getProducts();
const orders = await getOrders();

// GOOD: Parallel
const [users, products, orders] = await Promise.all([
  getUsers(),
  getProducts(),
  getOrders()
]);
```

---

## 5. Frontend Patterns

### Code Splitting

```typescript
// Lazy load routes
const Dashboard = React.lazy(() => import('./Dashboard'));
const Settings = React.lazy(() => import('./Settings'));
```

### Image Optimization

```html
<!-- Responsive images -->
<img 
  srcset="image-300.jpg 300w, image-600.jpg 600w"
  sizes="(max-width: 600px) 300px, 600px"
  loading="lazy"
  alt="Product"
/>
```

### Debouncing

```typescript
// Debounce search input
const debouncedSearch = debounce((query) => {
  api.search(query);
}, 300);

input.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

---

## 6. Performance Metrics

### Key Metrics

| Metric | Target | Tool |
|--------|--------|------|
| TTFB | < 200ms | Lighthouse |
| FCP | < 1.8s | Lighthouse |
| LCP | < 2.5s | Lighthouse |
| API p95 | < 200ms | APM |
| DB p95 | < 50ms | DB monitoring |

### Monitoring Queries

```sql
-- Slow queries (PostgreSQL)
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Optimization Checklist

### Database
- [ ] Indexes on frequently queried columns
- [ ] Connection pooling configured
- [ ] N+1 queries eliminated
- [ ] Query plans analyzed (EXPLAIN)

### API
- [ ] Response compression enabled
- [ ] Pagination implemented
- [ ] Caching strategy in place
- [ ] Slow operations moved to background

### Frontend
- [ ] Code splitting implemented
- [ ] Images optimized and lazy loaded
- [ ] CDN for static assets
- [ ] Bundle size analyzed

### Infrastructure
- [ ] Auto-scaling configured
- [ ] Load balancing in place
- [ ] CDN configured
- [ ] Monitoring and alerts
