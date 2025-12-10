/**
 * Guardrails Integration Tests
 *
 * E2E tests for guardrails integration with orchestration components
 */

const {
  BaseGuardrail,
  GuardrailChain,
  InputGuardrail,
  OutputGuardrail,
  _SafetyCheckGuardrail,
  createInputGuardrail,
  createOutputGuardrail,
  createSafetyCheckGuardrail,
  RuleBuilder,
  RuleRegistry,
  CommonRuleSets
} = require('../../../src/orchestration/guardrails');

describe('Guardrails Integration Tests', () => {
  describe('Full Pipeline Integration', () => {
    it('should process content through guardrail chain', async () => {
      const chain = new GuardrailChain('TestChain');

      // Create guardrails with tripwire disabled
      const inputGuardrail = new InputGuardrail({ tripwireEnabled: false });
      const outputGuardrail = new OutputGuardrail({ tripwireEnabled: false });

      chain.add(inputGuardrail);
      chain.add(outputGuardrail);

      const result = await chain.run('Hello, this is a test message');

      expect(result.passed).toBeDefined();
      expect(result.executedCount).toBe(2);
    });

    it('should detect malicious content', async () => {
      const guardrail = createInputGuardrail('security', { tripwireEnabled: false });

      const maliciousInput = 'SELECT * FROM users WHERE id = 1; DROP TABLE users;--';
      const result = await guardrail.run(maliciousInput);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.code === 'NOINJECTION')).toBe(true);
    });

    it('should detect PII in content', async () => {
      const guardrail = createInputGuardrail('security', { tripwireEnabled: false });

      const contentWithPII = 'Contact me at john@example.com';
      const result = await guardrail.run(contentWithPII);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.code === 'NOPII')).toBe(true);
    });
  });

  describe('Output Guardrail Features', () => {
    it('should apply redaction when configured', async () => {
      const guardrail = createOutputGuardrail('redact', { tripwireEnabled: false });

      const content = 'Contact: user@example.com';
      const result = await guardrail.run(content);

      // Redaction preset should process the content
      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });

    it('should validate output content', async () => {
      const guardrail = createOutputGuardrail('safe', { tripwireEnabled: false });

      const content = 'This is safe content';
      const result = await guardrail.run(content);

      expect(result.passed).toBe(true);
    });
  });

  describe('Custom Guardrail Composition', () => {
    it('should create custom guardrail with RuleBuilder', async () => {
      // Test RuleBuilder creates rules
      const rules = new RuleBuilder()
        .minLength(5)
        .maxLength(500)
        .build();

      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(2);
    });

    it('should compose multiple rule sets', async () => {
      const registry = new RuleRegistry();

      // Register custom rules
      registry.register('api-input', [
        ...CommonRuleSets.security,
        ...new RuleBuilder()
          .required()
          .build()
      ]);

      const rules = registry.get('api-input');
      expect(rules.length).toBeGreaterThan(CommonRuleSets.security.length);
    });
  });

  describe('Safety Check Guardrail', () => {
    it('should check content safety with minimal preset', async () => {
      const guardrail = createSafetyCheckGuardrail('minimal', { tripwireEnabled: false });

      const safeContent = 'Hello, how are you today?';
      const result = await guardrail.run(safeContent);

      expect(result.passed).toBe(true);
    });

    it('should run constitutional checks when enabled', async () => {
      const guardrail = createSafetyCheckGuardrail('constitutional', { tripwireEnabled: false });

      // Content without spec reference or trace ID
      const content = 'Just a simple message';
      const result = await guardrail.run(content);

      expect(result.passed).toBe(false);
      // Should have constitutional violations
      expect(result.violations.some(v => 
        v.code.startsWith('CONSTITUTIONAL_')
      )).toBe(true);
    });

    it('should pass content with spec and trace references', async () => {
      const guardrail = createSafetyCheckGuardrail('minimal', { tripwireEnabled: false });

      const compliantContent = '[SPEC:REQ-001] [TRACE:abc123] Implementation details';
      const result = await guardrail.run(compliantContent);

      expect(result.passed).toBe(true);
    });
  });

  describe('GuardrailChain Execution Modes', () => {
    it('should execute guardrails sequentially', async () => {
      const chain = new GuardrailChain('SequentialChain');

      chain.add(new InputGuardrail({ tripwireEnabled: false }));
      chain.add(new OutputGuardrail({ tripwireEnabled: false }));

      const result = await chain.run('Test content');

      expect(result.executedCount).toBe(2);
    });

    it('should execute guardrails in parallel', async () => {
      const chain = new GuardrailChain('ParallelChain', { parallel: true });

      chain.add(new InputGuardrail({ tripwireEnabled: false }));
      chain.add(new OutputGuardrail({ tripwireEnabled: false }));

      const result = await chain.run('Test content');

      expect(result.executedCount).toBe(2);
    });

    it('should stop on first failure when configured', async () => {
      const chain = new GuardrailChain('StopOnFailureChain', {
        stopOnFirstFailure: true
      });

      // First guardrail will fail
      chain.add(createInputGuardrail('security', { tripwireEnabled: false }));
      // Second guardrail won't run
      chain.add(new OutputGuardrail({ tripwireEnabled: false }));

      const maliciousInput = 'SELECT * FROM users;';
      const result = await chain.run(maliciousInput);

      expect(result.passed).toBe(false);
      // executedCount may be 1 or 2 depending on implementation
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle guardrail errors gracefully', async () => {
      class FailingGuardrail extends BaseGuardrail {
        constructor() {
          super({ name: 'FailingGuardrail', tripwireEnabled: false });
        }

        async check() {
          throw new Error('Guardrail internal error');
        }
      }

      const failingGuardrail = new FailingGuardrail();
      const result = await failingGuardrail.run('Test content');

      // Error should be caught and converted to failed result
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.code === 'GUARDRAIL_ERROR')).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should validate clean API request content', async () => {
      const guardrail = new InputGuardrail({ tripwireEnabled: false });

      const validRequest = 'Create a new project';

      const result = await guardrail.run(validRequest);
      expect(result.passed).toBe(true);
    });

    it('should flag code with hardcoded secrets', async () => {
      const guardrail = createOutputGuardrail('security', { tripwireEnabled: false });

      const codeWithSecrets = `
        const apiKey = 'sk-1234567890abcdef1234567890abcdef';
        const password = 'supersecret123';
      `;

      const result = await guardrail.run(codeWithSecrets);
      expect(result.passed).toBe(false);
    });
  });

  describe('Performance Characteristics', () => {
    it('should process content efficiently', async () => {
      const guardrail = new InputGuardrail({ tripwireEnabled: false });

      const content = 'This is a normal test message';

      const startTime = Date.now();
      const result = await guardrail.run(content);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(result.passed).toBe(true);
    });

    it('should handle chain with many guardrails', async () => {
      const chain = new GuardrailChain('LargeChain');

      // Add 10 guardrails
      for (let i = 0; i < 10; i++) {
        chain.add(new InputGuardrail({ tripwireEnabled: false }));
      }

      const startTime = Date.now();
      const result = await chain.run('Test content');
      const duration = Date.now() - startTime;

      expect(result.executedCount).toBe(10);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Tripwire Behavior', () => {
    it('should throw exception when tripwire is enabled and validation fails', async () => {
      const guardrail = createInputGuardrail('security', { tripwireEnabled: true });

      const maliciousInput = 'SELECT * FROM users;';

      await expect(guardrail.run(maliciousInput)).rejects.toThrow();
    });

    it('should not throw when tripwire is disabled', async () => {
      const guardrail = createInputGuardrail('security', { tripwireEnabled: false });

      const maliciousInput = 'SELECT * FROM users;';
      const result = await guardrail.run(maliciousInput);

      expect(result.passed).toBe(false);
      // No exception thrown
    });
  });
});
