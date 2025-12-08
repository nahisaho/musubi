# OWASP Top 10 Security Guide

## Overview

The OWASP Top 10 represents the most critical security risks to web applications. This guide helps identify and prevent these vulnerabilities.

---

## A01:2021 - Broken Access Control

### Description
Users can act outside their intended permissions.

### Examples
- Accessing other users' data by modifying URL
- Privilege escalation
- CORS misconfiguration

### Prevention
```typescript
// Always verify authorization
async function getUserData(userId: string, requesterId: string) {
  const user = await userRepo.findById(userId);
  
  if (user.id !== requesterId && !isAdmin(requesterId)) {
    throw new ForbiddenError('Access denied');
  }
  
  return user;
}
```

### Checklist
- [ ] Deny by default
- [ ] Implement access control at server side
- [ ] Validate user permissions for every request
- [ ] Disable directory listing
- [ ] Log access control failures

---

## A02:2021 - Cryptographic Failures

### Description
Failures related to cryptography leading to data exposure.

### Examples
- Transmitting data in clear text
- Using weak algorithms (MD5, SHA1)
- Hardcoded secrets

### Prevention
```typescript
// Use strong password hashing
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Use TLS for all connections
// Store secrets in environment variables
const apiKey = process.env.API_KEY; // Not hardcoded
```

### Checklist
- [ ] Classify data by sensitivity
- [ ] Use TLS for all data in transit
- [ ] Use strong, up-to-date algorithms
- [ ] Store passwords with bcrypt/Argon2
- [ ] Never hardcode secrets

---

## A03:2021 - Injection

### Description
Untrusted data is sent to an interpreter as part of a command or query.

### Examples
- SQL injection
- NoSQL injection
- Command injection
- LDAP injection

### Prevention
```typescript
// BAD: SQL Injection vulnerable
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// GOOD: Parameterized query
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// GOOD: ORM with parameterized input
const user = await userRepo.findOne({ where: { id: userId } });
```

### Checklist
- [ ] Use parameterized queries
- [ ] Use ORM/ODM frameworks
- [ ] Validate and sanitize input
- [ ] Escape special characters
- [ ] Use positive allowlist validation

---

## A04:2021 - Insecure Design

### Description
Flaws in design that cannot be fixed by implementation.

### Examples
- Missing rate limiting
- No anti-automation
- Insufficient fraud controls

### Prevention
```typescript
// Implement rate limiting
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts'
});

app.post('/login', loginLimiter, loginHandler);
```

### Checklist
- [ ] Threat modeling during design
- [ ] Security requirements defined
- [ ] Rate limiting implemented
- [ ] Resource quotas enforced

---

## A05:2021 - Security Misconfiguration

### Description
Insecure default configurations or missing security hardening.

### Examples
- Default credentials
- Unnecessary features enabled
- Verbose error messages
- Missing security headers

### Prevention
```typescript
// Add security headers
import helmet from 'helmet';

app.use(helmet());

// Disable verbose errors in production
if (process.env.NODE_ENV === 'production') {
  app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Internal server error' });
  });
}
```

### Checklist
- [ ] Remove unused features
- [ ] Disable default accounts
- [ ] Set security headers
- [ ] Keep software updated
- [ ] Review cloud permissions

---

## A06:2021 - Vulnerable Components

### Description
Using components with known vulnerabilities.

### Prevention
```bash
# Check for vulnerabilities
npm audit
pip check
snyk test

# Update dependencies
npm update
pip install --upgrade
```

### Checklist
- [ ] Remove unused dependencies
- [ ] Use only official sources
- [ ] Monitor for vulnerabilities
- [ ] Regular updates

---

## A07:2021 - Authentication Failures

### Description
Weak authentication mechanisms.

### Examples
- Weak passwords allowed
- Credential stuffing
- Missing MFA
- Session fixation

### Prevention
```typescript
// Validate password strength
function validatePassword(password: string): boolean {
  return password.length >= 12 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /[0-9]/.test(password) &&
         /[^A-Za-z0-9]/.test(password);
}

// Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  }
}));
```

### Checklist
- [ ] Enforce strong passwords
- [ ] Implement MFA
- [ ] Rate limit authentication
- [ ] Use secure session management
- [ ] Invalidate sessions on logout

---

## A08:2021 - Software and Data Integrity Failures

### Description
Failures related to code and infrastructure that doesn't protect against integrity violations.

### Examples
- Unsigned software updates
- Insecure CI/CD pipelines
- Deserialization attacks

### Prevention
```typescript
// Verify package integrity
// package-lock.json with integrity hashes

// Subresource Integrity for CDN
<script src="https://cdn.example.com/lib.js" 
        integrity="sha384-hash..." 
        crossorigin="anonymous">
</script>
```

### Checklist
- [ ] Use signed packages
- [ ] Verify integrity hashes
- [ ] Secure CI/CD pipeline
- [ ] Code review for all changes

---

## A09:2021 - Security Logging and Monitoring Failures

### Description
Insufficient logging and monitoring to detect attacks.

### Prevention
```typescript
// Log security events
logger.warn('Login failure', {
  event: 'authentication_failure',
  email: email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString()
});

// Alert on suspicious activity
if (failedAttempts >= 5) {
  alertService.notify('Possible brute force attack', { email, ip });
}
```

### Checklist
- [ ] Log authentication events
- [ ] Log access control failures
- [ ] Centralized log management
- [ ] Alert on anomalies
- [ ] Incident response plan

---

## A10:2021 - Server-Side Request Forgery (SSRF)

### Description
Application fetches remote resources without validating the URL.

### Prevention
```typescript
// Validate and allowlist URLs
const ALLOWED_HOSTS = ['api.trusted.com', 'cdn.example.com'];

function validateUrl(url: string): boolean {
  const parsed = new URL(url);
  return ALLOWED_HOSTS.includes(parsed.hostname);
}

async function fetchRemote(url: string) {
  if (!validateUrl(url)) {
    throw new Error('URL not allowed');
  }
  return fetch(url);
}
```

### Checklist
- [ ] Validate and sanitize URLs
- [ ] Use allowlists
- [ ] Block internal addresses
- [ ] Disable redirects or validate

---

## Security Review Checklist

For each feature, verify:

- [ ] Input validation on all user input
- [ ] Output encoding for displayed data
- [ ] Authentication required where needed
- [ ] Authorization checked for each action
- [ ] Sensitive data encrypted
- [ ] No hardcoded secrets
- [ ] Logging of security events
- [ ] Dependencies up to date
- [ ] Security headers configured
- [ ] Error messages don't leak info
