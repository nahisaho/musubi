/**
 * @fileoverview Tests for SafetyCheckGuardrail
 * 
 * @version 3.9.0
 */

'use strict';

const {
  SafetyCheckGuardrail,
  createSafetyCheckGuardrail,
  SafetyLevel,
  ConstitutionalMapping,
  GuardrailTripwireException
} = require('../../../src/orchestration/guardrails');

describe('SafetyCheckGuardrail', () => {
  describe('constructor', () => {
    test('should create with default configuration', () => {
      const guardrail = new SafetyCheckGuardrail();
      
      expect(guardrail.name).toBe('SafetyCheckGuardrail');
      expect(guardrail.level).toBe(SafetyLevel.STANDARD);
      expect(guardrail.enforceConstitution).toBe(false);
    });

    test('should create with custom safety level', () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.STRICT
      });
      
      expect(guardrail.level).toBe(SafetyLevel.STRICT);
    });

    test('should enable constitutional compliance', () => {
      const guardrail = new SafetyCheckGuardrail({
        enforceConstitution: true
      });
      
      expect(guardrail.enforceConstitution).toBe(true);
    });

    test('should accept custom checks', () => {
      const guardrail = new SafetyCheckGuardrail({
        customChecks: {
          lengthCheck: (input) => ({ passed: input.length < 100, score: 0.8 })
        }
      });
      
      expect(Object.keys(guardrail.customChecks)).toHaveLength(1);
    });
  });

  describe('check() - Basic Level', () => {
    test('should pass valid content', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.BASIC
      });
      
      const result = await guardrail.run('Hello, World!');
      
      expect(result.passed).toBe(true);
    });

    test('should fail on empty content', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.BASIC
      });
      
      const result = await guardrail.run('');
      
      expect(result.passed).toBe(false);
    });
  });

  describe('check() - Standard Level', () => {
    test('should pass safe content', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.STANDARD
      });
      
      const result = await guardrail.run('This is a normal message.');
      
      expect(result.passed).toBe(true);
    });

    test('should detect SQL injection', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.STANDARD
      });
      
      const result = await guardrail.run("SELECT * FROM users WHERE id = 1; DROP TABLE users;");
      
      expect(result.passed).toBe(false);
    });

    test('should detect XSS', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.STANDARD
      });
      
      const result = await guardrail.run('<script>alert("xss")</script>');
      
      expect(result.passed).toBe(false);
    });
  });

  describe('check() - Strict Level', () => {
    test('should detect PII', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.STRICT
      });
      
      const result = await guardrail.run('Contact me at user@example.com');
      
      expect(result.passed).toBe(false);
    });

    test('should pass clean content', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.STRICT
      });
      
      const result = await guardrail.run('This is a clean message without PII.');
      
      expect(result.passed).toBe(true);
    });
  });

  describe('check() - Paranoid Level', () => {
    test('should detect prohibited words', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.PARANOID
      });
      
      const result = await guardrail.run('How to hack the system');
      
      expect(result.passed).toBe(false);
    });

    test('should enforce max length', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.PARANOID
      });
      
      const longContent = 'a'.repeat(15000);
      const result = await guardrail.run(longContent);
      
      expect(result.passed).toBe(false);
    });
  });

  describe('Constitutional Compliance', () => {
    test('should check constitutional articles when enabled', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.STANDARD,
        enforceConstitution: true
      });
      
      const result = await guardrail.run('Test content', {
        specId: 'SPEC-001',
        traceId: 'trace-123'
      });
      
      expect(result.passed).toBe(true);
      expect(result.metadata.constitutionalCompliance).toBe(true);
    });

    test('should include constitutional scores', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.STANDARD,
        enforceConstitution: true
      });
      
      const result = await guardrail.run('Test content');
      
      expect(result.metadata.scores.constitutional).toBeDefined();
    });

    test('should check agent boundaries', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.STANDARD,
        enforceConstitution: true,
        enabledArticles: ['AGENT_BOUNDARIES']
      });
      
      const result = await guardrail.run('Test', {
        agentId: 'agent-a',
        allowedAgents: ['agent-b', 'agent-c']
      });
      
      expect(result.passed).toBe(false);
    });

    test('should pass valid agent', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.STANDARD,
        enforceConstitution: true,
        enabledArticles: ['AGENT_BOUNDARIES']
      });
      
      const result = await guardrail.run('Test', {
        agentId: 'agent-a',
        allowedAgents: ['agent-a', 'agent-b']
      });
      
      expect(result.passed).toBe(true);
    });
  });

  describe('Custom Checks', () => {
    test('should run custom checks', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.BASIC,
        customChecks: {
          hasGreeting: (input) => ({
            passed: input.toLowerCase().includes('hello'),
            score: 1.0,
            message: 'Must include greeting'
          })
        }
      });
      
      const result = await guardrail.run('Hello, World!');
      
      expect(result.passed).toBe(true);
      expect(result.metadata.scores.hasGreeting).toBe(1.0);
    });

    test('should fail on custom check failure', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.BASIC,
        customChecks: {
          hasGreeting: (input) => ({
            passed: input.toLowerCase().includes('hello'),
            severity: 'error',
            message: 'Must include greeting'
          })
        }
      });
      
      const result = await guardrail.run('Goodbye!');
      
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.code === 'CUSTOM_HASGREETING')).toBe(true);
    });

    test('should handle custom check errors', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.BASIC,
        customChecks: {
          errorCheck: () => {
            throw new Error('Check error');
          }
        }
      });
      
      const result = await guardrail.run('Test');
      
      // Custom check errors are warnings, not blocking
      expect(result.violations.some(v => v.code === 'CUSTOM_CHECK_ERROR')).toBe(true);
    });
  });

  describe('Object Input', () => {
    test('should extract content from object', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.BASIC
      });
      
      const result = await guardrail.run({ content: 'Test content' });
      
      expect(result.passed).toBe(true);
    });

    test('should extract message from object', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.BASIC
      });
      
      const result = await guardrail.run({ message: 'Test message' });
      
      expect(result.passed).toBe(true);
    });
  });

  describe('Tripwire', () => {
    test('should throw on tripwire enabled', async () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.BASIC,
        tripwireEnabled: true
      });
      
      await expect(guardrail.run('')).rejects.toThrow(GuardrailTripwireException);
    });
  });

  describe('getInfo()', () => {
    test('should return complete info', () => {
      const guardrail = new SafetyCheckGuardrail({
        level: SafetyLevel.STRICT,
        enforceConstitution: true,
        customChecks: {
          check1: () => ({ passed: true })
        }
      });
      
      const info = guardrail.getInfo();
      
      expect(info.level).toBe(SafetyLevel.STRICT);
      expect(info.enforceConstitution).toBe(true);
      expect(info.customChecksCount).toBe(1);
    });
  });
});

describe('createSafetyCheckGuardrail', () => {
  test('should create basic preset', () => {
    const guardrail = createSafetyCheckGuardrail('basic');
    
    expect(guardrail.name).toBe('BasicSafetyGuardrail');
    expect(guardrail.level).toBe(SafetyLevel.BASIC);
  });

  test('should create standard preset', () => {
    const guardrail = createSafetyCheckGuardrail('standard');
    
    expect(guardrail.name).toBe('StandardSafetyGuardrail');
    expect(guardrail.level).toBe(SafetyLevel.STANDARD);
  });

  test('should create strict preset', () => {
    const guardrail = createSafetyCheckGuardrail('strict');
    
    expect(guardrail.name).toBe('StrictSafetyGuardrail');
    expect(guardrail.level).toBe(SafetyLevel.STRICT);
    expect(guardrail.enforceConstitution).toBe(true);
  });

  test('should create paranoid preset', () => {
    const guardrail = createSafetyCheckGuardrail('paranoid');
    
    expect(guardrail.name).toBe('ParanoidSafetyGuardrail');
    expect(guardrail.level).toBe(SafetyLevel.PARANOID);
    expect(guardrail.tripwireEnabled).toBe(true);
  });

  test('should create constitutional preset', () => {
    const guardrail = createSafetyCheckGuardrail('constitutional');
    
    expect(guardrail.name).toBe('ConstitutionalGuardrail');
    expect(guardrail.enforceConstitution).toBe(true);
  });

  test('should apply overrides', () => {
    const guardrail = createSafetyCheckGuardrail('standard', {
      name: 'CustomSafety',
      tripwireEnabled: true
    });
    
    expect(guardrail.name).toBe('CustomSafety');
    expect(guardrail.tripwireEnabled).toBe(true);
  });
});

describe('SafetyLevel', () => {
  test('should have all expected levels', () => {
    expect(SafetyLevel.BASIC).toBe('basic');
    expect(SafetyLevel.STANDARD).toBe('standard');
    expect(SafetyLevel.STRICT).toBe('strict');
    expect(SafetyLevel.PARANOID).toBe('paranoid');
  });
});

describe('ConstitutionalMapping', () => {
  test('should have all 9 articles', () => {
    expect(ConstitutionalMapping.SPEC_SUPREMACY.article).toBe('I');
    expect(ConstitutionalMapping.TRACEABILITY.article).toBe('II');
    expect(ConstitutionalMapping.IMMUTABLE_HISTORY.article).toBe('III');
    expect(ConstitutionalMapping.VALIDATION_GATES.article).toBe('IV');
    expect(ConstitutionalMapping.AGENT_BOUNDARIES.article).toBe('V');
    expect(ConstitutionalMapping.GRACEFUL_DEGRADATION.article).toBe('VI');
    expect(ConstitutionalMapping.QUALITY_ASSURANCE.article).toBe('VII');
    expect(ConstitutionalMapping.HUMAN_OVERRIDE.article).toBe('VIII');
    expect(ConstitutionalMapping.CONTINUOUS_IMPROVEMENT.article).toBe('IX');
  });

  test('each mapping should have checks array', () => {
    for (const [_key, mapping] of Object.entries(ConstitutionalMapping)) {
      expect(mapping.checks).toBeDefined();
      expect(Array.isArray(mapping.checks)).toBe(true);
    }
  });
});
