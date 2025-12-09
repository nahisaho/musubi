# MUSUBI Guardrails System Guide

**Version**: 3.9.0  
**Last Updated**: 2025-12-09

---

## Overview

MUSUBI Guardrails provide input/output validation, safety checks, and constitutional compliance for AI workflows. Inspired by the [OpenAI Agents SDK](https://github.com/openai/agents-sdk) guardrails pattern.

---

## Quick Start

### CLI Usage

```bash
# Input validation
npx musubi-validate guardrails "user input here" --type input

# Output validation with PII redaction
npx musubi-validate guardrails "output content" --type output --redact

# Safety check with constitutional compliance
npx musubi-validate guardrails "code or content" --type safety --constitutional

# Run guardrail chain
npx musubi-validate guardrails-chain "content" --parallel
```

### Programmatic Usage

```javascript
const { 
  InputGuardrail, 
  OutputGuardrail, 
  SafetyCheckGuardrail,
  GuardrailChain,
  createInputGuardrail,
  createOutputGuardrail
} = require('musubi-sdd/orchestration/guardrails');

// Create guardrails
const inputGuardrail = createInputGuardrail('security');
const outputGuardrail = createOutputGuardrail('redact');

// Run validation
const inputResult = await inputGuardrail.run('user input');
const outputResult = await outputGuardrail.run('output content');

console.log(inputResult.passed);  // true/false
console.log(outputResult.content); // sanitized content
```

---

## Guardrail Types

### 1. InputGuardrail

Validates and sanitizes user input.

**Features**:
- Input sanitization (trim, normalize, escape)
- PII detection (email, phone, credit card, SSN)
- Injection attack prevention (SQL, XSS, command injection)
- Field-level validation

**Presets**:

| Preset | Description | Use Case |
|--------|-------------|----------|
| `userInput` | Standard user input validation | Forms, chat |
| `security` | Security-focused validation | Auth, payments |
| `strict` | Maximum validation | Sensitive data |
| `minimal` | Basic sanitization only | Trusted sources |

```javascript
// Using presets
const guard = createInputGuardrail('security');

// Custom configuration
const customGuard = new InputGuardrail({
  sanitize: {
    trim: true,
    normalizeWhitespace: true,
    removeHtml: true,
    escape: true,
    maxLength: 1000
  },
  detectPII: true,
  detectInjection: true,
  tripwire: true  // Fail immediately on violation
});
```

### 2. OutputGuardrail

Validates and sanitizes AI output.

**Features**:
- Sensitive data redaction
- Content policy enforcement
- Quality checks
- Format validation

**Redaction Patterns**:
- Email addresses → `[EMAIL REDACTED]`
- Phone numbers → `[PHONE REDACTED]`
- API keys → `[API_KEY REDACTED]`
- Passwords → `[PASSWORD REDACTED]`
- Connection strings → `[CONNECTION_STRING REDACTED]`

**Presets**:

| Preset | Description | Use Case |
|--------|-------------|----------|
| `safe` | Basic content safety | General output |
| `security` | Security-focused | Auth, secrets |
| `strict` | Maximum sanitization | Production |
| `redact` | Aggressive redaction | PII protection |

```javascript
// Using presets
const guard = createOutputGuardrail('redact');

// Custom configuration
const customGuard = new OutputGuardrail({
  redact: {
    email: true,
    phone: true,
    apiKey: true,
    password: true,
    connectionString: true
  },
  maxLength: 10000,
  tripwire: false  // Continue on violation
});
```

### 3. SafetyCheckGuardrail

Constitutional compliance and content safety.

**Safety Levels**:

| Level | Description | Use Case |
|-------|-------------|----------|
| `LOW` | Permissive | Development |
| `MEDIUM` | Balanced | Default |
| `HIGH` | Strict | Production |
| `CRITICAL` | Maximum | Security-critical |

**Content Categories**:
- `SAFE` - Content is safe
- `HARMFUL` - Potentially harmful content
- `HATE_SPEECH` - Hate or discrimination
- `VIOLENCE` - Violent content
- `SEXUAL` - Sexual content
- `MISINFORMATION` - False information
- `PII_EXPOSURE` - Personal data exposure
- `ILLEGAL` - Illegal activities

```javascript
const { SafetyCheckGuardrail, SafetyLevel } = require('musubi-sdd/orchestration/guardrails');

const safetyGuard = new SafetyCheckGuardrail({
  level: SafetyLevel.HIGH,
  checkConstitutional: true,  // Check 9 Constitutional Articles
  checkPII: true,
  tripwire: true
});

const result = await safetyGuard.run(content);
console.log(result.safetyLevel);   // 'HIGH'
console.log(result.category);      // 'SAFE'
console.log(result.constitutional); // { passed: true, violations: [] }
```

---

## GuardrailChain

Compose multiple guardrails for pipeline execution.

```javascript
const { GuardrailChain, InputGuardrail, OutputGuardrail, SafetyCheckGuardrail } = require('musubi-sdd/orchestration/guardrails');

// Create chain
const chain = new GuardrailChain([
  new InputGuardrail({ preset: 'security' }),
  new SafetyCheckGuardrail({ level: 'HIGH' }),
  new OutputGuardrail({ preset: 'redact' })
], {
  parallel: false,       // Sequential execution
  stopOnFail: true,      // Stop on first failure
  aggregateResults: true // Collect all results
});

// Run chain
const result = await chain.run(content);
console.log(result.passed);      // All guardrails passed
console.log(result.violations);  // Array of violations
console.log(result.results);     // Individual guardrail results
```

### Parallel Execution

```javascript
const chain = new GuardrailChain([
  new InputGuardrail(),
  new SafetyCheckGuardrail(),
  new OutputGuardrail()
], {
  parallel: true  // Run all guardrails concurrently
});

// Faster for independent checks
const result = await chain.run(content);
```

---

## GuardrailRules DSL

Build custom validation rules with fluent API.

```javascript
const { RuleBuilder, RuleRegistry, CommonRuleSets } = require('musubi-sdd/orchestration/guardrails');

// Build custom rules
const customRules = new RuleBuilder()
  .required()
  .minLength(10)
  .maxLength(1000)
  .pattern(/^[a-zA-Z0-9\s]+$/, 'Alphanumeric only')
  .noPII()
  .noInjection()
  .noHarmful()
  .custom((value) => !value.includes('forbidden'), 'Contains forbidden word')
  .build();

// Use built-in rule sets
const securityRules = CommonRuleSets.security;
const strictRules = CommonRuleSets.strictContent;

// Register custom rule set
RuleRegistry.register('myRules', customRules);

// Retrieve later
const rules = RuleRegistry.get('myRules');
```

### Built-in Rule Sets

| Rule Set | Description |
|----------|-------------|
| `security` | Security-focused (injection, XSS) |
| `strictContent` | Strict content validation |
| `userInput` | Standard user input rules |
| `agentOutput` | Agent output validation |

---

## CLI Reference

### guardrails Command

```bash
npx musubi-validate guardrails [content] [options]

Options:
  --type <type>        Guardrail type: input, output, safety (default: input)
  --level <level>      Safety level: low, medium, high, critical
  --preset <preset>    Use preset configuration
  --constitutional     Enable constitutional compliance check
  --redact             Enable PII redaction
  --file <path>        Read content from file
  --output <path>      Write result to file
  --verbose            Verbose output
```

### guardrails-chain Command

```bash
npx musubi-validate guardrails-chain [content] [options]

Options:
  --parallel           Run guardrails in parallel
  --stop-on-fail       Stop on first failure
  --types <types>      Comma-separated guardrail types
  --file <path>        Read content from file
  --output <path>      Write result to file
```

### Examples

```bash
# Validate user input
npx musubi-validate guardrails "Hello, my email is test@example.com" --type input

# Validate with security preset
npx musubi-validate guardrails "SELECT * FROM users" --type input --preset security

# Check safety with constitutional compliance
npx musubi-validate guardrails "$(cat src/feature.js)" --type safety --constitutional --level high

# Redact PII from output
npx musubi-validate guardrails "Contact: john@example.com, 555-1234" --type output --redact

# Run full chain
npx musubi-validate guardrails-chain "user content here" --parallel

# Validate file
npx musubi-validate guardrails --type safety --file src/module.js --constitutional

# Batch validation
for file in src/*.js; do
  npx musubi-validate guardrails --type safety --file "$file" --level high
done
```

---

## Integration Examples

### With Orchestration

```javascript
const { createOrchestrationEngine, PatternType } = require('musubi-sdd/orchestration');
const { InputGuardrail, OutputGuardrail } = require('musubi-sdd/orchestration/guardrails');

const engine = createOrchestrationEngine();

// Add guardrails to skill execution
engine.use('pre-execute', async (context) => {
  const inputGuard = new InputGuardrail({ preset: 'security' });
  const result = await inputGuard.run(context.input);
  if (!result.passed) {
    throw new Error(`Input validation failed: ${result.violations.join(', ')}`);
  }
  context.input = result.content; // Use sanitized input
});

engine.use('post-execute', async (context, output) => {
  const outputGuard = new OutputGuardrail({ preset: 'redact' });
  const result = await outputGuard.run(output);
  return result.content; // Return sanitized output
});
```

### With Swarm Pattern

```javascript
const result = await engine.execute({
  pattern: PatternType.SWARM,
  input: {
    tasks: [...],
    guardrails: {
      input: { preset: 'security' },
      output: { preset: 'redact' },
      safety: { level: 'HIGH', constitutional: true }
    }
  }
});
```

### With Human-in-Loop

```javascript
const result = await engine.execute({
  pattern: PatternType.HUMAN_IN_LOOP,
  input: {
    skills: ['code-generator'],
    checkpoints: [{
      after: 'code-generator',
      guardrails: [
        { type: 'safety', level: 'HIGH' },
        { type: 'output', preset: 'security' }
      ],
      message: 'Review generated code for security'
    }]
  }
});
```

---

## Tripwire Behavior

Tripwire mode causes immediate failure on violation.

```javascript
// With tripwire (throws exception)
const strictGuard = new InputGuardrail({
  tripwire: true,
  detectInjection: true
});

try {
  await strictGuard.run("SELECT * FROM users; DROP TABLE users;");
} catch (error) {
  // GuardrailTripwireException thrown
  console.log(error.violation);
  console.log(error.guardrail);
}

// Without tripwire (returns result)
const lenientGuard = new InputGuardrail({
  tripwire: false,
  detectInjection: true
});

const result = await lenientGuard.run("SELECT * FROM users");
console.log(result.passed);     // false
console.log(result.violations); // ['SQL injection detected']
```

---

## Constitutional Compliance

Check content against the 9 Constitutional Articles:

```javascript
const { SafetyCheckGuardrail } = require('musubi-sdd/orchestration/guardrails');

const guard = new SafetyCheckGuardrail({
  checkConstitutional: true,
  level: 'HIGH'
});

const result = await guard.run(codeContent);

// Constitutional check results
console.log(result.constitutional.passed);      // true/false
console.log(result.constitutional.violations);  // Array of article violations
console.log(result.constitutional.articles);    // Checked articles
```

### Articles Checked

1. **Article I**: Library-First Principle
2. **Article II**: CLI Interface Mandate
3. **Article III**: Test-First Imperative
4. **Article IV**: EARS Requirements Format
5. **Article V**: Traceability Mandate
6. **Article VI**: Project Memory
7. **Article VII**: Simplicity Gate
8. **Article VIII**: Anti-Abstraction Gate
9. **Article IX**: Integration-First Testing

---

## Best Practices

1. **Layer Guardrails**: Use chain for defense in depth
2. **Set Appropriate Levels**: Match safety level to context
3. **Enable Tripwire for Critical**: Use tripwire for security-critical paths
4. **Redact in Production**: Always redact PII in production
5. **Log Violations**: Track and analyze guardrail violations
6. **Test Your Rules**: Unit test custom rule sets
7. **Constitutional in CI**: Add constitutional checks to CI/CD

---

## Related Documentation

- [Orchestration Patterns](./orchestration-patterns.md)
- [Constitutional Governance](../steering/rules/constitution.md)
- [CLI Reference](./cli-reference.md)
- [Security Auditor Skill](../skills/security-auditor.md)
