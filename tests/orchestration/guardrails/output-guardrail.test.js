/**
 * @fileoverview Tests for OutputGuardrail
 * 
 * @version 3.9.0
 */

'use strict';

const {
  OutputGuardrail,
  createOutputGuardrail,
  GuardrailTripwireException,
  rules
} = require('../../../src/orchestration/guardrails');

describe('OutputGuardrail', () => {
  describe('constructor', () => {
    test('should create with default configuration', () => {
      const guardrail = new OutputGuardrail({ name: 'TestOutput' });
      
      expect(guardrail.name).toBe('TestOutput');
      expect(guardrail.enabled).toBe(true);
      expect(guardrail.rules).toBeDefined();
    });

    test('should create with custom rules', () => {
      const customRules = rules().required().noPII().build();
      const guardrail = new OutputGuardrail({
        name: 'CustomOutput',
        rules: customRules
      });
      
      expect(guardrail.rules).toEqual(customRules);
    });

    test('should enable redaction', () => {
      const guardrail = new OutputGuardrail({
        name: 'RedactOutput',
        redact: true
      });
      
      expect(guardrail.redact).toBe(true);
    });
  });

  describe('check()', () => {
    test('should pass valid output', async () => {
      const guardrail = new OutputGuardrail({
        name: 'TestOutput',
        rules: rules().required().build()
      });
      
      const result = await guardrail.run('This is a valid response.');
      
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should fail on empty required output', async () => {
      const guardrail = new OutputGuardrail({
        name: 'TestOutput',
        rules: rules().required().build()
      });
      
      const result = await guardrail.run('');
      
      expect(result.passed).toBe(false);
      expect(result.violations[0].code).toBe('REQUIRED');
    });

    test('should detect PII in output', async () => {
      const guardrail = new OutputGuardrail({
        name: 'PIIOutput',
        rules: rules().noPII().build()
      });
      
      const result = await guardrail.run('User email: test@example.com');
      
      expect(result.passed).toBe(false);
      expect(result.violations[0].code).toBe('NOPII');
    });

    test('should handle object output with content field', async () => {
      const guardrail = new OutputGuardrail({
        name: 'ObjectOutput',
        rules: rules().required().build()
      });
      
      const result = await guardrail.run({ content: 'Response content' });
      
      expect(result.passed).toBe(true);
    });

    test('should handle object output with response field', async () => {
      const guardrail = new OutputGuardrail({
        name: 'ObjectOutput',
        rules: rules().required().build()
      });
      
      const result = await guardrail.run({ response: 'API response' });
      
      expect(result.passed).toBe(true);
    });
  });

  describe('redaction', () => {
    test('should redact email addresses', async () => {
      const guardrail = new OutputGuardrail({
        name: 'RedactOutput',
        rules: [],
        redact: true,
        redactOptions: { redactPII: true }
      });
      
      const result = await guardrail.run('Contact: user@example.com');
      
      expect(result.passed).toBe(true);
      expect(result.metadata.processedOutput).toBe('Contact: [REDACTED]');
      expect(result.metadata.redactionCount).toBeGreaterThan(0);
    });

    test('should redact phone numbers', async () => {
      const guardrail = new OutputGuardrail({
        name: 'RedactOutput',
        rules: [],
        redact: true,
        redactOptions: { redactPII: true }
      });
      
      const result = await guardrail.run('Call: 555-123-4567');
      
      expect(result.metadata.processedOutput).toBe('Call: [REDACTED]');
    });

    test('should redact credit card numbers', async () => {
      const guardrail = new OutputGuardrail({
        name: 'RedactOutput',
        rules: [],
        redact: true,
        redactOptions: { redactPII: true }
      });
      
      const result = await guardrail.run('Card: 4111-1111-1111-1111');
      
      expect(result.metadata.processedOutput).toBe('Card: [REDACTED]');
    });

    test('should redact API keys', async () => {
      const guardrail = new OutputGuardrail({
        name: 'RedactOutput',
        rules: [],
        redact: true,
        redactOptions: { redactSecrets: true }
      });
      
      const result = await guardrail.run('API Key: api_key=sk_live_12345678901234567890');
      
      expect(result.metadata.processedOutput).not.toContain('sk_live');
    });

    test('should redact passwords', async () => {
      const guardrail = new OutputGuardrail({
        name: 'RedactOutput',
        rules: [],
        redact: true,
        redactOptions: { redactSecrets: true }
      });
      
      const result = await guardrail.run('password=mySecretPass123');
      
      expect(result.metadata.processedOutput).not.toContain('mySecretPass');
    });

    test('should redact connection strings', async () => {
      const guardrail = new OutputGuardrail({
        name: 'RedactOutput',
        rules: [],
        redact: true,
        redactOptions: { redactSecrets: true }
      });
      
      const result = await guardrail.run('DB: mongodb://user:pass@host:27017/db');
      
      expect(result.metadata.processedOutput).not.toContain('mongodb://');
    });

    test('should use custom replacement text', async () => {
      const guardrail = new OutputGuardrail({
        name: 'RedactOutput',
        rules: [],
        redact: true,
        redactOptions: {
          redactPII: true,
          replacement: '***HIDDEN***'
        }
      });
      
      const result = await guardrail.run('Email: test@test.com');
      
      expect(result.metadata.processedOutput).toContain('***HIDDEN***');
    });

    test('should apply custom patterns', async () => {
      const guardrail = new OutputGuardrail({
        name: 'RedactOutput',
        rules: [],
        redact: true,
        redactOptions: {
          customPatterns: [/SECRET-\w+/gi]
        }
      });
      
      const result = await guardrail.run('Code: SECRET-ABC123');
      
      expect(result.metadata.processedOutput).toBe('Code: [REDACTED]');
    });

    test('should redact nested object fields', async () => {
      const guardrail = new OutputGuardrail({
        name: 'RedactOutput',
        rules: [],
        redact: true,
        redactOptions: { redactPII: true }
      });
      
      const result = await guardrail.run({
        user: {
          email: 'user@example.com',
          name: 'John Doe'
        }
      });
      
      expect(result.metadata.processedOutput.user.email).toBe('[REDACTED]');
      expect(result.metadata.processedOutput.user.name).toBe('John Doe');
    });
  });

  describe('content policies', () => {
    test('should apply content policy', async () => {
      const guardrail = new OutputGuardrail({
        name: 'PolicyOutput',
        rules: []
      });
      
      guardrail.addContentPolicy({
        name: 'no-profanity',
        check: (content) => ({
          passed: !content.toLowerCase().includes('badword'),
          message: 'Contains profanity'
        })
      });
      
      const result = await guardrail.run('This contains badword');
      
      expect(result.passed).toBe(false);
      expect(result.violations[0].code).toBe('POLICY_NO-PROFANITY');
    });

    test('should pass multiple policies', async () => {
      const guardrail = new OutputGuardrail({
        name: 'PolicyOutput',
        rules: []
      });
      
      guardrail.addContentPolicy({
        name: 'length-check',
        check: (content) => ({ passed: content.length < 1000 })
      });
      
      guardrail.addContentPolicy({
        name: 'format-check',
        check: (content) => ({ passed: content.startsWith('Response:') })
      });
      
      const result = await guardrail.run('Response: Valid output');
      
      expect(result.passed).toBe(true);
    });
  });

  describe('quality checks', () => {
    test('should run quality check', async () => {
      const guardrail = new OutputGuardrail({
        name: 'QualityOutput',
        rules: []
      });
      
      guardrail.addQualityCheck({
        name: 'clarity',
        check: (content) => ({
          passed: true,
          score: 0.8,
          message: 'Good clarity'
        }),
        threshold: 0.5
      });
      
      const result = await guardrail.run('Clear and concise response');
      
      expect(result.passed).toBe(true);
      expect(result.metadata.qualityScores.clarity).toBe(0.8);
    });

    test('should warn on low quality score', async () => {
      const guardrail = new OutputGuardrail({
        name: 'QualityOutput',
        rules: []
      });
      
      guardrail.addQualityCheck({
        name: 'clarity',
        check: (content) => ({
          passed: true,
          score: 0.3,
          message: 'Low clarity'
        }),
        threshold: 0.5
      });
      
      const result = await guardrail.run('Unclear response');
      
      // Quality issues are warnings, not errors
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('warning');
    });
  });

  describe('custom validator', () => {
    test('should run custom validator', async () => {
      const guardrail = new OutputGuardrail({
        name: 'CustomOutput',
        rules: [],
        validator: async (output) => {
          return output.length > 10;
        }
      });
      
      const result = await guardrail.run('This is a valid output');
      expect(result.passed).toBe(true);
    });

    test('should fail on custom validator returning false', async () => {
      const guardrail = new OutputGuardrail({
        name: 'CustomOutput',
        rules: [],
        validator: async (output) => {
          return output.length > 100;
        }
      });
      
      const result = await guardrail.run('Short');
      expect(result.passed).toBe(false);
    });
  });

  describe('custom transformer', () => {
    test('should apply custom transformer', async () => {
      const guardrail = new OutputGuardrail({
        name: 'TransformOutput',
        rules: [],
        transformer: async (output) => {
          return output.toUpperCase();
        }
      });
      
      const result = await guardrail.run('hello');
      
      expect(result.passed).toBe(true);
    });

    test('should handle transformer error', async () => {
      const guardrail = new OutputGuardrail({
        name: 'TransformOutput',
        rules: [],
        transformer: async () => {
          throw new Error('Transform failed');
        }
      });
      
      const result = await guardrail.run('hello');
      
      expect(result.passed).toBe(false);
      expect(result.violations[0].code).toBe('TRANSFORMER_ERROR');
    });
  });

  describe('tripwire', () => {
    test('should throw exception when tripwire is enabled', async () => {
      const guardrail = new OutputGuardrail({
        name: 'TripwireOutput',
        rules: rules().required().build(),
        tripwireEnabled: true
      });
      
      await expect(guardrail.run('')).rejects.toThrow(GuardrailTripwireException);
    });
  });

  describe('getInfo()', () => {
    test('should return guardrail info', () => {
      const guardrail = new OutputGuardrail({
        name: 'InfoOutput',
        description: 'Test output guardrail',
        redact: true
      });
      
      guardrail.addContentPolicy({ name: 'test', check: () => ({ passed: true }) });
      guardrail.addQualityCheck({ name: 'quality', check: () => ({ passed: true, score: 1 }) });
      
      const info = guardrail.getInfo();
      
      expect(info.name).toBe('InfoOutput');
      expect(info.description).toBe('Test output guardrail');
      expect(info.redact).toBe(true);
      expect(info.contentPoliciesCount).toBe(1);
      expect(info.qualityChecksCount).toBe(1);
    });
  });
});

describe('createOutputGuardrail', () => {
  test('should create safe preset', () => {
    const guardrail = createOutputGuardrail('safe');
    
    expect(guardrail.name).toBe('SafeOutputGuardrail');
  });

  test('should create security preset', () => {
    const guardrail = createOutputGuardrail('security');
    
    expect(guardrail.name).toBe('SecurityOutputGuardrail');
    expect(guardrail.tripwireEnabled).toBe(true);
  });

  test('should create strict preset', () => {
    const guardrail = createOutputGuardrail('strict');
    
    expect(guardrail.name).toBe('StrictOutputGuardrail');
    expect(guardrail.tripwireEnabled).toBe(true);
    expect(guardrail.failFast).toBe(true);
  });

  test('should create redact preset', () => {
    const guardrail = createOutputGuardrail('redact');
    
    expect(guardrail.name).toBe('RedactingOutputGuardrail');
    expect(guardrail.redact).toBe(true);
  });

  test('should apply overrides', () => {
    const guardrail = createOutputGuardrail('safe', {
      name: 'CustomName',
      redact: true
    });
    
    expect(guardrail.name).toBe('CustomName');
    expect(guardrail.redact).toBe(true);
  });
});
