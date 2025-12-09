/**
 * @fileoverview Tests for InputGuardrail
 * 
 * @version 3.9.0
 */

'use strict';

const {
  InputGuardrail,
  createInputGuardrail,
  BaseGuardrail,
  GuardrailTripwireException,
  rules,
  globalRuleRegistry
} = require('../../../src/orchestration/guardrails');

describe('InputGuardrail', () => {
  describe('constructor', () => {
    test('should create with default configuration', () => {
      const guardrail = new InputGuardrail({ name: 'TestGuardrail' });
      
      expect(guardrail.name).toBe('TestGuardrail');
      expect(guardrail.enabled).toBe(true);
      expect(guardrail.rules).toBeDefined();
      expect(guardrail.rules.length).toBeGreaterThan(0);
    });

    test('should create with custom rules', () => {
      const customRules = rules().required().maxLength(100).build();
      const guardrail = new InputGuardrail({
        name: 'CustomGuardrail',
        rules: customRules
      });
      
      expect(guardrail.rules).toEqual(customRules);
    });

    test('should load rules from registry', () => {
      const guardrail = new InputGuardrail({
        name: 'RegistryGuardrail',
        ruleSet: 'security'
      });
      
      expect(guardrail.rules).toEqual(globalRuleRegistry.get('security'));
    });

    test('should enable sanitization', () => {
      const guardrail = new InputGuardrail({
        name: 'SanitizeGuardrail',
        sanitize: true,
        sanitizeOptions: { trimWhitespace: true }
      });
      
      expect(guardrail.sanitize).toBe(true);
    });
  });

  describe('check()', () => {
    test('should pass valid input', async () => {
      const guardrail = new InputGuardrail({
        name: 'TestGuardrail',
        rules: rules().required().build()
      });
      
      const result = await guardrail.run('Hello, World!');
      
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should fail on empty required input', async () => {
      const guardrail = new InputGuardrail({
        name: 'TestGuardrail',
        rules: rules().required().build()
      });
      
      const result = await guardrail.run('');
      
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].code).toBe('REQUIRED');
    });

    test('should fail on max length exceeded', async () => {
      const guardrail = new InputGuardrail({
        name: 'TestGuardrail',
        rules: rules().maxLength(10).build()
      });
      
      const result = await guardrail.run('This is a very long input string');
      
      expect(result.passed).toBe(false);
      expect(result.violations[0].code).toBe('MAXLENGTH_10');
    });

    test('should detect SQL injection', async () => {
      const guardrail = new InputGuardrail({
        name: 'SecurityGuardrail',
        rules: rules().noInjection().build()
      });
      
      const result = await guardrail.run("SELECT * FROM users WHERE id = 1; DROP TABLE users;--");
      
      expect(result.passed).toBe(false);
      expect(result.violations[0].code).toBe('NOINJECTION');
    });

    test('should detect XSS attempt', async () => {
      const guardrail = new InputGuardrail({
        name: 'SecurityGuardrail',
        rules: rules().noInjection().build()
      });
      
      const result = await guardrail.run('<script>alert("xss")</script>');
      
      expect(result.passed).toBe(false);
      expect(result.violations[0].code).toBe('NOINJECTION');
    });

    test('should detect PII (email)', async () => {
      const guardrail = new InputGuardrail({
        name: 'PIIGuardrail',
        rules: rules().noPII().build()
      });
      
      const result = await guardrail.run('Contact me at user@example.com');
      
      expect(result.passed).toBe(false);
      expect(result.violations[0].context.detections).toContain('email');
    });

    test('should detect PII (phone number)', async () => {
      const guardrail = new InputGuardrail({
        name: 'PIIGuardrail',
        rules: rules().noPII().build()
      });
      
      const result = await guardrail.run('Call me at 555-123-4567');
      
      expect(result.passed).toBe(false);
      expect(result.violations[0].context.detections).toContain('phone');
    });

    test('should detect PII (credit card)', async () => {
      const guardrail = new InputGuardrail({
        name: 'PIIGuardrail',
        rules: rules().noPII().build()
      });
      
      const result = await guardrail.run('My card is 4111-1111-1111-1111');
      
      expect(result.passed).toBe(false);
      expect(result.violations[0].context.detections).toContain('credit_card');
    });

    test('should detect prohibited words', async () => {
      const guardrail = new InputGuardrail({
        name: 'ContentGuardrail',
        rules: rules().noProhibitedWords(['spam', 'blocked']).build()
      });
      
      const result = await guardrail.run('This is spam content');
      
      expect(result.passed).toBe(false);
      expect(result.violations[0].context.foundWords).toContain('spam');
    });

    test('should handle object input with known fields', async () => {
      const guardrail = new InputGuardrail({
        name: 'ObjectGuardrail',
        rules: rules().required().maxLength(100).build()
      });
      
      const result = await guardrail.run({ message: 'Hello, World!' });
      
      expect(result.passed).toBe(true);
    });

    test('should return disabled result when guardrail is disabled', async () => {
      const guardrail = new InputGuardrail({
        name: 'DisabledGuardrail',
        enabled: false,
        rules: rules().required().build()
      });
      
      const result = await guardrail.run('');
      
      expect(result.passed).toBe(true);
      expect(result.message).toBe('Guardrail is disabled');
    });
  });

  describe('sanitization', () => {
    test('should trim whitespace', async () => {
      const guardrail = new InputGuardrail({
        name: 'SanitizeGuardrail',
        rules: rules().required().build(),
        sanitize: true,
        sanitizeOptions: { trimWhitespace: true }
      });
      
      const result = await guardrail.run('  Hello, World!  ');
      
      expect(result.passed).toBe(true);
      expect(result.metadata.sanitizedInput).toBe('Hello, World!');
    });

    test('should normalize whitespace', async () => {
      const guardrail = new InputGuardrail({
        name: 'SanitizeGuardrail',
        rules: rules().required().build(),
        sanitize: true,
        sanitizeOptions: { normalizeWhitespace: true }
      });
      
      const result = await guardrail.run('Hello    World');
      
      expect(result.metadata.sanitizedInput).toBe('Hello World');
    });

    test('should remove HTML tags', async () => {
      const guardrail = new InputGuardrail({
        name: 'SanitizeGuardrail',
        rules: rules().required().build(),
        sanitize: true,
        sanitizeOptions: { removeHtmlTags: true }
      });
      
      const result = await guardrail.run('<p>Hello <b>World</b></p>');
      
      expect(result.metadata.sanitizedInput).toBe('Hello World');
    });

    test('should escape HTML entities', async () => {
      const guardrail = new InputGuardrail({
        name: 'SanitizeGuardrail',
        rules: rules().required().build(),
        sanitize: true,
        sanitizeOptions: { escapeHtml: true }
      });
      
      const result = await guardrail.run('<script>alert("xss")</script>');
      
      expect(result.metadata.sanitizedInput).not.toContain('<script>');
      expect(result.metadata.sanitizedInput).toContain('&lt;script&gt;');
    });

    test('should truncate to max length', async () => {
      const guardrail = new InputGuardrail({
        name: 'SanitizeGuardrail',
        rules: rules().required().build(),
        sanitize: true,
        sanitizeOptions: { maxLength: 10 }
      });
      
      const result = await guardrail.run('This is a very long string');
      
      expect(result.metadata.sanitizedInput).toBe('This is a ');
      expect(result.metadata.sanitizedInput.length).toBe(10);
    });

    test('should sanitize object fields', async () => {
      const guardrail = new InputGuardrail({
        name: 'SanitizeGuardrail',
        rules: rules().required().build(),
        sanitize: true,
        sanitizeOptions: { trimWhitespace: true }
      });
      
      const result = await guardrail.run({
        message: '  Hello  ',
        nested: { value: '  World  ' }
      });
      
      expect(result.metadata.sanitizedInput.message).toBe('Hello');
      expect(result.metadata.sanitizedInput.nested.value).toBe('World');
    });
  });

  describe('field-specific rules', () => {
    test('should validate specific fields', async () => {
      const guardrail = new InputGuardrail({
        name: 'FieldGuardrail',
        rules: []
      });
      
      guardrail.addFieldRules('email', rules().required().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));
      guardrail.addFieldRules('age', rules().type('number'));
      
      const result = await guardrail.run({
        email: 'test@example.com',
        age: 25
      });
      
      expect(result.passed).toBe(true);
    });

    test('should fail on invalid field', async () => {
      const guardrail = new InputGuardrail({
        name: 'FieldGuardrail',
        rules: []
      });
      
      guardrail.addFieldRules('email', rules().required().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));
      
      const result = await guardrail.run({
        email: 'not-an-email'
      });
      
      expect(result.passed).toBe(false);
    });
  });

  describe('custom validator', () => {
    test('should run custom validator', async () => {
      const guardrail = new InputGuardrail({
        name: 'CustomGuardrail',
        rules: [],
        validator: async (input) => {
          return input.startsWith('Hello');
        }
      });
      
      const result = await guardrail.run('Hello, World!');
      expect(result.passed).toBe(true);
    });

    test('should fail on custom validator returning false', async () => {
      const guardrail = new InputGuardrail({
        name: 'CustomGuardrail',
        rules: [],
        validator: async (input) => {
          return input.startsWith('Hello');
        }
      });
      
      const result = await guardrail.run('Goodbye, World!');
      expect(result.passed).toBe(false);
      expect(result.violations[0].code).toBe('CUSTOM_VALIDATION_FAILED');
    });

    test('should handle custom validator with detailed result', async () => {
      const guardrail = new InputGuardrail({
        name: 'CustomGuardrail',
        rules: [],
        validator: async (input) => {
          if (input.length < 5) {
            return { passed: false, message: 'Input too short' };
          }
          return { passed: true };
        }
      });
      
      const result = await guardrail.run('Hi');
      expect(result.passed).toBe(false);
      expect(result.violations[0].message).toBe('Input too short');
    });
  });

  describe('tripwire', () => {
    test('should throw exception when tripwire is enabled', async () => {
      const guardrail = new InputGuardrail({
        name: 'TripwireGuardrail',
        rules: rules().required().build(),
        tripwireEnabled: true
      });
      
      await expect(guardrail.run('')).rejects.toThrow(GuardrailTripwireException);
    });

    test('should not throw when validation passes', async () => {
      const guardrail = new InputGuardrail({
        name: 'TripwireGuardrail',
        rules: rules().required().build(),
        tripwireEnabled: true
      });
      
      const result = await guardrail.run('Valid input');
      expect(result.passed).toBe(true);
    });

    test('tripwire exception should contain result', async () => {
      const guardrail = new InputGuardrail({
        name: 'TripwireGuardrail',
        rules: rules().required().build(),
        tripwireEnabled: true
      });
      
      try {
        await guardrail.run('');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GuardrailTripwireException);
        expect(error.result).toBeDefined();
        expect(error.violations).toBeDefined();
      }
    });
  });

  describe('execution timing', () => {
    test('should record execution time', async () => {
      const guardrail = new InputGuardrail({
        name: 'TimingGuardrail',
        rules: rules().required().build()
      });
      
      const result = await guardrail.run('Hello');
      
      expect(result.executionTimeMs).toBeDefined();
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getInfo()', () => {
    test('should return guardrail info', () => {
      const guardrail = new InputGuardrail({
        name: 'InfoGuardrail',
        description: 'Test guardrail',
        sanitize: true
      });
      
      const info = guardrail.getInfo();
      
      expect(info.name).toBe('InfoGuardrail');
      expect(info.description).toBe('Test guardrail');
      expect(info.sanitize).toBe(true);
      expect(info.rulesCount).toBeGreaterThan(0);
    });
  });
});

describe('createInputGuardrail', () => {
  test('should create userInput preset', () => {
    const guardrail = createInputGuardrail('userInput');
    
    expect(guardrail.name).toBe('UserInputGuardrail');
    expect(guardrail.sanitize).toBe(true);
  });

  test('should create security preset', () => {
    const guardrail = createInputGuardrail('security');
    
    expect(guardrail.name).toBe('SecurityGuardrail');
    expect(guardrail.tripwireEnabled).toBe(true);
  });

  test('should create strict preset', () => {
    const guardrail = createInputGuardrail('strict');
    
    expect(guardrail.name).toBe('StrictInputGuardrail');
    expect(guardrail.tripwireEnabled).toBe(true);
    expect(guardrail.failFast).toBe(true);
  });

  test('should create minimal preset', () => {
    const guardrail = createInputGuardrail('minimal');
    
    expect(guardrail.name).toBe('MinimalInputGuardrail');
    expect(guardrail.rules.length).toBe(1);
  });

  test('should apply overrides', () => {
    const guardrail = createInputGuardrail('userInput', {
      name: 'CustomName',
      failFast: true
    });
    
    expect(guardrail.name).toBe('CustomName');
    expect(guardrail.failFast).toBe(true);
  });
});
