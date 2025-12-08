# Security Audit Checklists

## Overview

Comprehensive security checklists for application and infrastructure audits.

---

## Application Security Checklist

### Authentication

- [ ] **Password requirements** - Minimum 12 chars, complexity requirements
- [ ] **MFA support** - TOTP/WebAuthn available and encouraged
- [ ] **Session management** - Secure cookies, rotation on login
- [ ] **Brute force protection** - Rate limiting, account lockout
- [ ] **Password storage** - bcrypt/argon2 with cost factor ≥12
- [ ] **Credential recovery** - Secure reset flow, token expiry

### Authorization

- [ ] **Access control** - RBAC/ABAC properly implemented
- [ ] **Privilege escalation** - No path to higher privileges
- [ ] **IDOR prevention** - Object-level authorization checks
- [ ] **Admin functions** - Separate admin interface/authentication
- [ ] **API authorization** - Every endpoint verified
- [ ] **Default deny** - Fail closed on authorization checks

### Input Validation

- [ ] **SQL injection** - Parameterized queries everywhere
- [ ] **XSS prevention** - Output encoding, CSP headers
- [ ] **Command injection** - No shell commands with user input
- [ ] **Path traversal** - Validate file paths
- [ ] **XML/XXE** - Disable external entities
- [ ] **Deserialization** - Avoid untrusted deserialization

### Data Protection

- [ ] **Encryption at rest** - Sensitive data encrypted
- [ ] **Encryption in transit** - TLS 1.2+ only
- [ ] **Sensitive data exposure** - No secrets in logs/URLs
- [ ] **Data masking** - PII masked in non-prod
- [ ] **Secure deletion** - Data properly purged
- [ ] **Key management** - Keys rotated, stored securely

### Session Security

- [ ] **Session ID** - Cryptographically random, sufficient length
- [ ] **Cookie flags** - Secure, HttpOnly, SameSite=Strict
- [ ] **Session expiry** - Appropriate idle/absolute timeout
- [ ] **Session fixation** - New session ID on login
- [ ] **Logout** - Proper session invalidation
- [ ] **Concurrent sessions** - Limited or monitored

---

## Infrastructure Security Checklist

### Network Security

- [ ] **Firewall rules** - Least privilege, documented
- [ ] **Network segmentation** - Proper VLANs/subnets
- [ ] **Ingress filtering** - Only required ports open
- [ ] **Egress filtering** - Outbound traffic controlled
- [ ] **DDoS protection** - Rate limiting, CDN/WAF
- [ ] **VPN/bastion** - Secure remote access

### Cloud Security (AWS/Azure/GCP)

- [ ] **IAM policies** - Least privilege, no wildcards
- [ ] **Root/admin access** - MFA, rarely used
- [ ] **Security groups** - Minimal required rules
- [ ] **Encryption** - Enabled for storage, databases
- [ ] **Logging** - CloudTrail/audit logs enabled
- [ ] **Public exposure** - No unintended public resources

### Container Security

- [ ] **Base images** - Official, minimal, updated
- [ ] **No secrets** - Secrets via env vars/mounts
- [ ] **Non-root** - Containers run as non-root
- [ ] **Read-only filesystem** - Where possible
- [ ] **Resource limits** - CPU/memory limits set
- [ ] **Image scanning** - Vulnerability scanning in CI

### Kubernetes Security

- [ ] **RBAC** - Proper roles, no cluster-admin
- [ ] **Network policies** - Default deny, whitelist
- [ ] **Pod security** - Security contexts applied
- [ ] **Secrets management** - External secrets operator
- [ ] **Image policies** - Only trusted registries
- [ ] **Audit logging** - Enabled and monitored

---

## Code Security Checklist

### Dependencies

- [ ] **Vulnerability scanning** - Automated in CI
- [ ] **Dependency updates** - Regular schedule
- [ ] **License compliance** - Approved licenses only
- [ ] **Lock files** - Version locked
- [ ] **Private registry** - Internal packages secure
- [ ] **Supply chain** - Verify package integrity

### Secrets Management

- [ ] **No hardcoded secrets** - Use env vars or vault
- [ ] **Git history** - No secrets ever committed
- [ ] **Rotation** - Regular secret rotation
- [ ] **Access audit** - Log secret access
- [ ] **Development** - Different secrets per env
- [ ] **CI/CD** - Secrets injected securely

### Secure Coding

- [ ] **Error handling** - No sensitive info in errors
- [ ] **Logging** - No PII/secrets in logs
- [ ] **Debug mode** - Disabled in production
- [ ] **Comments** - No sensitive info in code
- [ ] **CORS** - Properly configured origins
- [ ] **Headers** - Security headers enabled

---

## API Security Checklist

### Authentication

- [ ] **OAuth 2.0/OIDC** - Proper implementation
- [ ] **JWT validation** - Verify signature, claims
- [ ] **Token storage** - Secure client storage
- [ ] **Token expiry** - Short-lived access tokens
- [ ] **Refresh tokens** - Rotation on use
- [ ] **API keys** - Unique per client, revocable

### Rate Limiting

- [ ] **Global limits** - Overall rate limiting
- [ ] **Per-user limits** - User-specific throttling
- [ ] **Endpoint limits** - Sensitive endpoints restricted
- [ ] **Retry-After** - Header on rate limit
- [ ] **Graduated response** - Warn before block
- [ ] **Monitoring** - Alert on limit hits

### API Protection

- [ ] **Input validation** - Schema validation
- [ ] **Output filtering** - No excessive data
- [ ] **Pagination** - Limit response sizes
- [ ] **Field filtering** - Allow field selection
- [ ] **Versioning** - Deprecation strategy
- [ ] **Documentation** - Security noted

---

## Compliance Quick Reference

### OWASP Top 10 (2021)

| # | Vulnerability | Key Controls |
|---|---------------|--------------|
| A01 | Broken Access Control | RBAC, ABAC, deny by default |
| A02 | Cryptographic Failures | TLS, encryption at rest |
| A03 | Injection | Input validation, parameterized |
| A04 | Insecure Design | Threat modeling, secure patterns |
| A05 | Security Misconfiguration | Hardening, minimal install |
| A06 | Vulnerable Components | SCA, dependency updates |
| A07 | Auth Failures | MFA, session security |
| A08 | Integrity Failures | CI/CD security, signing |
| A09 | Logging Failures | Audit logs, monitoring |
| A10 | SSRF | Input validation, allowlists |

### Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=()
```

---

## Audit Report Template

```markdown
# Security Audit Report

**Application**: [Name]
**Date**: [Date]
**Auditor**: [Name]

## Executive Summary

[High-level findings and risk assessment]

## Scope

- [What was tested]
- [What was excluded]

## Findings

### Critical (Immediately address)

| ID | Finding | Risk | Recommendation |
|----|---------|------|----------------|
| C1 | [Finding] | Critical | [Fix] |

### High (Address within 7 days)

| ID | Finding | Risk | Recommendation |
|----|---------|------|----------------|
| H1 | [Finding] | High | [Fix] |

### Medium (Address within 30 days)

| ID | Finding | Risk | Recommendation |
|----|---------|------|----------------|
| M1 | [Finding] | Medium | [Fix] |

### Low (Address as resources allow)

| ID | Finding | Risk | Recommendation |
|----|---------|------|----------------|
| L1 | [Finding] | Low | [Fix] |

## Positive Findings

- [Good security practice observed]

## Recommendations Summary

1. [Priority recommendation]
2. [Next recommendation]
```
