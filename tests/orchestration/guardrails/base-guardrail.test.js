/**
 * @fileoverview Tests for BaseGuardrail, GuardrailChain, and Rules DSL
 * 
 * @version 3.9.0
 */

'use strict';

const {
  BaseGuardrail,
  GuardrailChain,
  GuardrailTripwireException,
  RuleBuilder,
  RuleRegistry,
  RuleType,
  SecurityPatterns,
  rules,
  CommonRuleSets,
  globalRuleRegistry
} = require('../../../src/orchestration/guardrails');

describe('BaseGuardrail', () => {
  test('should not be instantiable directly', () => {
    expect(() => new BaseGuardrail({ name: 'Test' })).toThrow('abstract');
  });

  test('should be extendable', () => {
    class TestGuardrail extends BaseGuardrail {
      async check(input) {
        return this.createResult(input === 'valid', []);
      }
    }
    
    const guardrail = new TestGuardrail({ name: 'TestGuardrail' });
    expect(guardrail.name).toBe('TestGuardrail');
  });

  describe('run()', () => {
    let TestGuardrail;
    
    beforeEach(() => {
      TestGuardrail = class extends BaseGuardrail {
        async check(input) {
          if (input === 'valid') {
            return this.createResult(true, [], 'Validation passed');
          }
          return this.createResult(
            false,
            [this.createViolation('INVALID', 'Invalid input')],
            'Validation failed'
          );
        }
      };
    });

    test('should return passed result for valid input', async () => {
      const guardrail = new TestGuardrail({ name: 'Test' });
      const result = await guardrail.run('valid');
      
      expect(result.passed).toBe(true);
      expect(result.guardrailName).toBe('Test');
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    test('should return failed result for invalid input', async () => {
      const guardrail = new TestGuardrail({ name: 'Test' });
      const result = await guardrail.run('invalid');
      
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    test('should skip execution when disabled', async () => {
      const guardrail = new TestGuardrail({ name: 'Test', enabled: false });
      const result = await guardrail.run('invalid');
      
      expect(result.passed).toBe(true);
      expect(result.message).toBe('Guardrail is disabled');
    });

    test('should handle check errors gracefully', async () => {
      const ErrorGuardrail = class extends BaseGuardrail {
        async check() {
          throw new Error('Check failed');
        }
      };
      
      const guardrail = new ErrorGuardrail({ name: 'Error' });
      const result = await guardrail.run('input');
      
      expect(result.passed).toBe(false);
      expect(result.violations[0].code).toBe('GUARDRAIL_ERROR');
    });
  });

  describe('enable/disable', () => {
    test('should enable guardrail', () => {
      class TestGuardrail extends BaseGuardrail {
        async check() { return this.createResult(true, []); }
      }
      
      const guardrail = new TestGuardrail({ name: 'Test', enabled: false });
      expect(guardrail.enabled).toBe(false);
      
      guardrail.enable();
      expect(guardrail.enabled).toBe(true);
    });

    test('should disable guardrail', () => {
      class TestGuardrail extends BaseGuardrail {
        async check() { return this.createResult(true, []); }
      }
      
      const guardrail = new TestGuardrail({ name: 'Test' });
      expect(guardrail.enabled).toBe(true);
      
      guardrail.disable();
      expect(guardrail.enabled).toBe(false);
    });
  });

  describe('tripwire', () => {
    test('should enable tripwire', () => {
      class TestGuardrail extends BaseGuardrail {
        async check() { return this.createResult(true, []); }
      }
      
      const guardrail = new TestGuardrail({ name: 'Test' });
      guardrail.enableTripwire();
      expect(guardrail.tripwireEnabled).toBe(true);
    });

    test('should disable tripwire', () => {
      class TestGuardrail extends BaseGuardrail {
        async check() { return this.createResult(true, []); }
      }
      
      const guardrail = new TestGuardrail({ name: 'Test', tripwireEnabled: true });
      guardrail.disableTripwire();
      expect(guardrail.tripwireEnabled).toBe(false);
    });
  });
});

describe('GuardrailChain', () => {
  let PassGuardrail, FailGuardrail;

  beforeEach(() => {
    PassGuardrail = class extends BaseGuardrail {
      async check(input) {
        return this.createResult(true, [], 'Passed');
      }
    };
    
    FailGuardrail = class extends BaseGuardrail {
      async check(input) {
        return this.createResult(
          false,
          [this.createViolation('FAIL', 'Validation failed')],
          'Failed'
        );
      }
    };
  });

  describe('constructor', () => {
    test('should create with default options', () => {
      const chain = new GuardrailChain();
      
      expect(chain.name).toBe('GuardrailChain');
      expect(chain.parallel).toBe(false);
      expect(chain.stopOnFirstFailure).toBe(false);
    });

    test('should create with custom options', () => {
      const chain = new GuardrailChain({
        name: 'CustomChain',
        parallel: true,
        stopOnFirstFailure: true
      });
      
      expect(chain.name).toBe('CustomChain');
      expect(chain.parallel).toBe(true);
      expect(chain.stopOnFirstFailure).toBe(true);
    });
  });

  describe('add()', () => {
    test('should add guardrail to chain', () => {
      const chain = new GuardrailChain();
      const guardrail = new PassGuardrail({ name: 'Pass' });
      
      chain.add(guardrail);
      
      expect(chain.guardrails).toHaveLength(1);
    });

    test('should support method chaining', () => {
      const chain = new GuardrailChain();
      
      chain
        .add(new PassGuardrail({ name: 'Pass1' }))
        .add(new PassGuardrail({ name: 'Pass2' }));
      
      expect(chain.guardrails).toHaveLength(2);
    });

    test('should reject non-guardrail objects', () => {
      const chain = new GuardrailChain();
      
      expect(() => chain.add({ name: 'NotAGuardrail' })).toThrow();
    });
  });

  describe('addAll()', () => {
    test('should add multiple guardrails', () => {
      const chain = new GuardrailChain();
      
      chain.addAll([
        new PassGuardrail({ name: 'Pass1' }),
        new PassGuardrail({ name: 'Pass2' }),
        new PassGuardrail({ name: 'Pass3' })
      ]);
      
      expect(chain.guardrails).toHaveLength(3);
    });
  });

  describe('run() - sequential', () => {
    test('should run all guardrails and pass', async () => {
      const chain = new GuardrailChain();
      
      chain
        .add(new PassGuardrail({ name: 'Pass1' }))
        .add(new PassGuardrail({ name: 'Pass2' }));
      
      const result = await chain.run('input');
      
      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.executedCount).toBe(2);
    });

    test('should collect violations from failing guardrails', async () => {
      const chain = new GuardrailChain();
      
      chain
        .add(new PassGuardrail({ name: 'Pass' }))
        .add(new FailGuardrail({ name: 'Fail' }));
      
      const result = await chain.run('input');
      
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    test('should stop on first failure when configured', async () => {
      const chain = new GuardrailChain({ stopOnFirstFailure: true });
      
      chain
        .add(new FailGuardrail({ name: 'Fail1' }))
        .add(new FailGuardrail({ name: 'Fail2' }));
      
      const result = await chain.run('input');
      
      expect(result.passed).toBe(false);
      expect(result.executedCount).toBe(1);
    });
  });

  describe('run() - parallel', () => {
    test('should run guardrails in parallel', async () => {
      const chain = new GuardrailChain({ parallel: true });
      
      chain
        .add(new PassGuardrail({ name: 'Pass1' }))
        .add(new PassGuardrail({ name: 'Pass2' }));
      
      const result = await chain.run('input');
      
      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    test('should collect all violations in parallel mode', async () => {
      const chain = new GuardrailChain({ parallel: true });
      
      chain
        .add(new FailGuardrail({ name: 'Fail1' }))
        .add(new FailGuardrail({ name: 'Fail2' }));
      
      const result = await chain.run('input');
      
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
    });
  });

  describe('getGuardrails()', () => {
    test('should return guardrail info', () => {
      const chain = new GuardrailChain();
      
      chain
        .add(new PassGuardrail({ name: 'Pass1', description: 'First' }))
        .add(new PassGuardrail({ name: 'Pass2', description: 'Second' }));
      
      const guardrails = chain.getGuardrails();
      
      expect(guardrails).toHaveLength(2);
      expect(guardrails[0].name).toBe('Pass1');
      expect(guardrails[1].name).toBe('Pass2');
    });
  });

  describe('clear()', () => {
    test('should remove all guardrails', () => {
      const chain = new GuardrailChain();
      
      chain
        .add(new PassGuardrail({ name: 'Pass1' }))
        .add(new PassGuardrail({ name: 'Pass2' }));
      
      chain.clear();
      
      expect(chain.guardrails).toHaveLength(0);
    });
  });
});

describe('RuleBuilder', () => {
  describe('required()', () => {
    test('should fail on null', async () => {
      const rule = rules().required().build()[0];
      expect(rule.check(null)).toBe(false);
    });

    test('should fail on undefined', async () => {
      const rule = rules().required().build()[0];
      expect(rule.check(undefined)).toBe(false);
    });

    test('should fail on empty string', async () => {
      const rule = rules().required().build()[0];
      expect(rule.check('')).toBe(false);
    });

    test('should pass on non-empty value', async () => {
      const rule = rules().required().build()[0];
      expect(rule.check('hello')).toBe(true);
    });
  });

  describe('maxLength()', () => {
    test('should pass when within limit', () => {
      const rule = rules().maxLength(10).build()[0];
      expect(rule.check('hello')).toBe(true);
    });

    test('should fail when exceeding limit', () => {
      const rule = rules().maxLength(5).build()[0];
      expect(rule.check('hello world')).toBe(false);
    });
  });

  describe('minLength()', () => {
    test('should pass when meeting minimum', () => {
      const rule = rules().minLength(3).build()[0];
      expect(rule.check('hello')).toBe(true);
    });

    test('should fail when below minimum', () => {
      const rule = rules().minLength(10).build()[0];
      expect(rule.check('hi')).toBe(false);
    });
  });

  describe('pattern()', () => {
    test('should pass when pattern matches', () => {
      const rule = rules().pattern(/^[A-Z]+$/).build()[0];
      expect(rule.check('HELLO')).toBe(true);
    });

    test('should fail when pattern does not match', () => {
      const rule = rules().pattern(/^[A-Z]+$/).build()[0];
      expect(rule.check('Hello')).toBe(false);
    });
  });

  describe('noPattern()', () => {
    test('should pass when pattern does not match', () => {
      const rule = rules().noPattern(/badword/).build()[0];
      expect(rule.check('good content')).toBe(true);
    });

    test('should fail when pattern matches', () => {
      const rule = rules().noPattern(/badword/).build()[0];
      expect(rule.check('contains badword')).toBe(false);
    });
  });

  describe('noPII()', () => {
    test('should detect email', () => {
      const rule = rules().noPII().build()[0];
      const result = rule.check('email: test@example.com');
      expect(result.passed).toBe(false);
      expect(result.detections).toContain('email');
    });

    test('should pass clean content', () => {
      const rule = rules().noPII().build()[0];
      const result = rule.check('Hello World');
      expect(result.passed).toBe(true);
    });
  });

  describe('noProhibitedWords()', () => {
    test('should detect prohibited words', () => {
      const rule = rules().noProhibitedWords(['spam', 'blocked']).build()[0];
      const result = rule.check('this is spam');
      expect(result.passed).toBe(false);
      expect(result.foundWords).toContain('spam');
    });

    test('should pass clean content', () => {
      const rule = rules().noProhibitedWords(['spam', 'blocked']).build()[0];
      const result = rule.check('this is fine');
      expect(result.passed).toBe(true);
    });
  });

  describe('noInjection()', () => {
    test('should detect SQL injection', () => {
      const rule = rules().noInjection().build()[0];
      const result = rule.check('SELECT * FROM users');
      expect(result.passed).toBe(false);
      expect(result.detections).toContain('sql');
    });

    test('should detect XSS', () => {
      const rule = rules().noInjection().build()[0];
      const result = rule.check('<script>alert(1)</script>');
      expect(result.passed).toBe(false);
      expect(result.detections).toContain('xss');
    });

    test('should pass clean content', () => {
      const rule = rules().noInjection({ command: false }).build()[0];
      const result = rule.check('Normal text content');
      expect(result.passed).toBe(true);
    });
  });

  describe('type()', () => {
    test('should validate string type', () => {
      const rule = rules().type('string').build()[0];
      expect(rule.check('hello')).toBe(true);
      expect(rule.check(123)).toBe(false);
    });

    test('should validate number type', () => {
      const rule = rules().type('number').build()[0];
      expect(rule.check(123)).toBe(true);
      expect(rule.check('123')).toBe(false);
    });

    test('should validate array type', () => {
      const rule = rules().type('array').build()[0];
      expect(rule.check([1, 2, 3])).toBe(true);
      expect(rule.check('array')).toBe(false);
    });
  });

  describe('enum()', () => {
    test('should pass for allowed values', () => {
      const rule = rules().enum(['a', 'b', 'c']).build()[0];
      expect(rule.check('b')).toBe(true);
    });

    test('should fail for disallowed values', () => {
      const rule = rules().enum(['a', 'b', 'c']).build()[0];
      expect(rule.check('d')).toBe(false);
    });
  });

  describe('custom()', () => {
    test('should run custom validation', () => {
      const rule = rules().custom('even', (v) => v % 2 === 0, 'Must be even').build()[0];
      expect(rule.check(4)).toBe(true);
      expect(rule.check(3)).toBe(false);
    });
  });

  describe('chaining', () => {
    test('should build multiple rules', () => {
      const builtRules = rules()
        .required()
        .maxLength(100)
        .noPII()
        .build();
      
      expect(builtRules).toHaveLength(3);
    });

    test('should clear rules', () => {
      const builder = rules().required().maxLength(100);
      builder.clear();
      
      expect(builder.build()).toHaveLength(0);
    });
  });
});

describe('RuleRegistry', () => {
  test('should register and retrieve rule sets', () => {
    const registry = new RuleRegistry();
    const testRules = rules().required().build();
    
    registry.register('test', testRules);
    
    expect(registry.get('test')).toEqual(testRules);
    expect(registry.has('test')).toBe(true);
  });

  test('should list registered rule sets', () => {
    const registry = new RuleRegistry();
    registry.register('set1', []);
    registry.register('set2', []);
    
    const list = registry.list();
    
    expect(list).toContain('set1');
    expect(list).toContain('set2');
  });

  test('should remove rule sets', () => {
    const registry = new RuleRegistry();
    registry.register('test', []);
    
    expect(registry.remove('test')).toBe(true);
    expect(registry.has('test')).toBe(false);
  });

  test('should clear all rule sets', () => {
    const registry = new RuleRegistry();
    registry.register('set1', []);
    registry.register('set2', []);
    
    registry.clear();
    
    expect(registry.list()).toHaveLength(0);
  });
});

describe('globalRuleRegistry', () => {
  test('should have pre-registered rule sets', () => {
    expect(globalRuleRegistry.has('security')).toBe(true);
    expect(globalRuleRegistry.has('userInput')).toBe(true);
    expect(globalRuleRegistry.has('strictContent')).toBe(true);
    expect(globalRuleRegistry.has('agentOutput')).toBe(true);
  });
});

describe('CommonRuleSets', () => {
  test('security rule set should exist', () => {
    expect(CommonRuleSets.security).toBeDefined();
    expect(CommonRuleSets.security.length).toBeGreaterThan(0);
  });

  test('strictContent rule set should exist', () => {
    expect(CommonRuleSets.strictContent).toBeDefined();
  });

  test('userInput rule set should exist', () => {
    expect(CommonRuleSets.userInput).toBeDefined();
  });

  test('agentOutput rule set should exist', () => {
    expect(CommonRuleSets.agentOutput).toBeDefined();
  });
});

describe('SecurityPatterns', () => {
  test('should detect emails', () => {
    expect(SecurityPatterns.EMAIL.test('test@example.com')).toBe(true);
    SecurityPatterns.EMAIL.lastIndex = 0;
  });

  test('should detect US phone numbers', () => {
    expect(SecurityPatterns.PHONE_US.test('555-123-4567')).toBe(true);
    SecurityPatterns.PHONE_US.lastIndex = 0;
  });

  test('should detect credit card numbers', () => {
    expect(SecurityPatterns.CREDIT_CARD.test('4111-1111-1111-1111')).toBe(true);
    SecurityPatterns.CREDIT_CARD.lastIndex = 0;
  });
});
