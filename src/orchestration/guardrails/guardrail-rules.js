/**
 * @fileoverview Guardrail validation rules DSL
 * 
 * Provides a declarative DSL for defining guardrail validation rules.
 * 
 * @module orchestration/guardrails/guardrail-rules
 * @version 3.9.0
 */

'use strict';

/**
 * Rule definition
 * @typedef {Object} RuleDefinition
 * @property {string} id - Unique rule identifier
 * @property {string} name - Human-readable name
 * @property {string} [description] - Rule description
 * @property {string} severity - 'error' | 'warning' | 'info'
 * @property {Function} check - Validation function (value, context) => boolean | {passed, message}
 * @property {string} [message] - Default error message
 * @property {Object} [options] - Rule-specific options
 */

/**
 * Built-in rule types
 */
const RuleType = {
  // Content rules
  REQUIRED: 'required',
  MAX_LENGTH: 'maxLength',
  MIN_LENGTH: 'minLength',
  PATTERN: 'pattern',
  
  // Security rules
  NO_PII: 'noPII',
  NO_PROHIBITED_WORDS: 'noProhibitedWords',
  NO_INJECTION: 'noInjection',
  
  // Format rules
  TYPE: 'type',
  ENUM: 'enum',
  
  // Custom rules
  CUSTOM: 'custom'
};

/**
 * Common patterns for security checks
 */
const SecurityPatterns = {
  // PII patterns (simplified, not exhaustive)
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  PHONE_US: /\b(\+1)?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  PHONE_JP: /\b0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{4}\b/g,
  SSN: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  CREDIT_CARD: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  IP_ADDRESS: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  
  // Injection patterns
  SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b.*\b(FROM|INTO|WHERE|TABLE)\b)|(--.*)|(\/\*.*\*\/)/gi,
  XSS: /<script[^>]*>[\s\S]*?<\/script>|javascript:|on\w+\s*=/gi,
  COMMAND_INJECTION: /[;&|`$(){}[\]]/g
};

/**
 * Rule builder for creating validation rules
 */
class RuleBuilder {
  constructor() {
    this.rules = [];
  }

  /**
   * Add a required field rule
   * @param {string} [message] - Custom error message
   * @returns {RuleBuilder}
   */
  required(message = 'Field is required') {
    this.rules.push({
      id: 'required',
      type: RuleType.REQUIRED,
      check: (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      },
      message,
      severity: 'error'
    });
    return this;
  }

  /**
   * Add a maximum length rule
   * @param {number} max - Maximum length
   * @param {string} [message] - Custom error message
   * @returns {RuleBuilder}
   */
  maxLength(max, message = null) {
    this.rules.push({
      id: `maxLength_${max}`,
      type: RuleType.MAX_LENGTH,
      check: (value) => {
        if (value === null || value === undefined) return true;
        const len = typeof value === 'string' ? value.length : 
                    Array.isArray(value) ? value.length : 0;
        return len <= max;
      },
      message: message || `Exceeds maximum length of ${max}`,
      severity: 'error',
      options: { max }
    });
    return this;
  }

  /**
   * Add a minimum length rule
   * @param {number} min - Minimum length
   * @param {string} [message] - Custom error message
   * @returns {RuleBuilder}
   */
  minLength(min, message = null) {
    this.rules.push({
      id: `minLength_${min}`,
      type: RuleType.MIN_LENGTH,
      check: (value) => {
        if (value === null || value === undefined) return false;
        const len = typeof value === 'string' ? value.length : 
                    Array.isArray(value) ? value.length : 0;
        return len >= min;
      },
      message: message || `Below minimum length of ${min}`,
      severity: 'error',
      options: { min }
    });
    return this;
  }

  /**
   * Add a pattern matching rule
   * @param {RegExp} pattern - Regular expression to match
   * @param {string} [message] - Custom error message
   * @returns {RuleBuilder}
   */
  pattern(pattern, message = null) {
    this.rules.push({
      id: `pattern_${pattern.source}`,
      type: RuleType.PATTERN,
      check: (value) => {
        if (value === null || value === undefined) return true;
        if (typeof value !== 'string') return false;
        return pattern.test(value);
      },
      message: message || `Does not match required pattern`,
      severity: 'error',
      options: { pattern: pattern.source }
    });
    return this;
  }

  /**
   * Add a no-pattern rule (value must NOT match pattern)
   * @param {RegExp} pattern - Regular expression that should NOT match
   * @param {string} [message] - Custom error message
   * @returns {RuleBuilder}
   */
  noPattern(pattern, message = null) {
    this.rules.push({
      id: `noPattern_${pattern.source}`,
      type: RuleType.PATTERN,
      check: (value) => {
        if (value === null || value === undefined) return true;
        if (typeof value !== 'string') return true;
        return !pattern.test(value);
      },
      message: message || `Contains prohibited pattern`,
      severity: 'error',
      options: { pattern: pattern.source, inverted: true }
    });
    return this;
  }

  /**
   * Add a no-PII rule
   * @param {Object} [options] - PII detection options
   * @param {boolean} [options.detectEmail=true] - Detect email addresses
   * @param {boolean} [options.detectPhone=true] - Detect phone numbers
   * @param {boolean} [options.detectSSN=true] - Detect SSN
   * @param {boolean} [options.detectCreditCard=true] - Detect credit cards
   * @returns {RuleBuilder}
   */
  noPII(options = {}) {
    const detectEmail = options.detectEmail !== false;
    const detectPhone = options.detectPhone !== false;
    const detectSSN = options.detectSSN !== false;
    const detectCreditCard = options.detectCreditCard !== false;

    this.rules.push({
      id: 'noPII',
      type: RuleType.NO_PII,
      check: (value) => {
        if (value === null || value === undefined) return { passed: true };
        if (typeof value !== 'string') return { passed: true };
        
        const detections = [];
        
        if (detectEmail && SecurityPatterns.EMAIL.test(value)) {
          detections.push('email');
          SecurityPatterns.EMAIL.lastIndex = 0;
        }
        if (detectPhone) {
          if (SecurityPatterns.PHONE_US.test(value)) {
            detections.push('phone');
            SecurityPatterns.PHONE_US.lastIndex = 0;
          }
          if (SecurityPatterns.PHONE_JP.test(value)) {
            detections.push('phone');
            SecurityPatterns.PHONE_JP.lastIndex = 0;
          }
        }
        if (detectSSN && SecurityPatterns.SSN.test(value)) {
          detections.push('ssn');
          SecurityPatterns.SSN.lastIndex = 0;
        }
        if (detectCreditCard && SecurityPatterns.CREDIT_CARD.test(value)) {
          detections.push('credit_card');
          SecurityPatterns.CREDIT_CARD.lastIndex = 0;
        }

        return {
          passed: detections.length === 0,
          detections
        };
      },
      message: 'Contains personally identifiable information (PII)',
      severity: 'error',
      options
    });
    return this;
  }

  /**
   * Add prohibited words rule
   * @param {Array<string>} words - List of prohibited words
   * @param {Object} [options] - Options
   * @param {boolean} [options.caseSensitive=false] - Case sensitive matching
   * @returns {RuleBuilder}
   */
  noProhibitedWords(words, options = {}) {
    const caseSensitive = options.caseSensitive || false;
    
    this.rules.push({
      id: 'noProhibitedWords',
      type: RuleType.NO_PROHIBITED_WORDS,
      check: (value) => {
        if (value === null || value === undefined) return { passed: true };
        if (typeof value !== 'string') return { passed: true };
        
        const checkValue = caseSensitive ? value : value.toLowerCase();
        const foundWords = words.filter(word => {
          const checkWord = caseSensitive ? word : word.toLowerCase();
          return checkValue.includes(checkWord);
        });

        return {
          passed: foundWords.length === 0,
          foundWords
        };
      },
      message: 'Contains prohibited content',
      severity: 'error',
      options: { words, caseSensitive }
    });
    return this;
  }

  /**
   * Add injection prevention rule
   * @param {Object} [options] - Options
   * @param {boolean} [options.sql=true] - Check SQL injection
   * @param {boolean} [options.xss=true] - Check XSS
   * @param {boolean} [options.command=true] - Check command injection
   * @returns {RuleBuilder}
   */
  noInjection(options = {}) {
    const checkSql = options.sql !== false;
    const checkXss = options.xss !== false;
    const checkCommand = options.command !== false;

    this.rules.push({
      id: 'noInjection',
      type: RuleType.NO_INJECTION,
      check: (value) => {
        if (value === null || value === undefined) return { passed: true };
        if (typeof value !== 'string') return { passed: true };
        
        const detections = [];
        
        if (checkSql && SecurityPatterns.SQL_INJECTION.test(value)) {
          detections.push('sql');
          SecurityPatterns.SQL_INJECTION.lastIndex = 0;
        }
        if (checkXss && SecurityPatterns.XSS.test(value)) {
          detections.push('xss');
          SecurityPatterns.XSS.lastIndex = 0;
        }
        if (checkCommand && SecurityPatterns.COMMAND_INJECTION.test(value)) {
          detections.push('command');
          SecurityPatterns.COMMAND_INJECTION.lastIndex = 0;
        }

        return {
          passed: detections.length === 0,
          detections
        };
      },
      message: 'Contains potential injection attack',
      severity: 'error',
      options
    });
    return this;
  }

  /**
   * Add type check rule
   * @param {string} expectedType - Expected type ('string', 'number', 'object', 'array', 'boolean')
   * @param {string} [message] - Custom error message
   * @returns {RuleBuilder}
   */
  type(expectedType, message = null) {
    this.rules.push({
      id: `type_${expectedType}`,
      type: RuleType.TYPE,
      check: (value) => {
        if (value === null || value === undefined) return true;
        
        if (expectedType === 'array') {
          return Array.isArray(value);
        }
        return typeof value === expectedType;
      },
      message: message || `Expected type ${expectedType}`,
      severity: 'error',
      options: { expectedType }
    });
    return this;
  }

  /**
   * Add enum validation rule
   * @param {Array} allowedValues - List of allowed values
   * @param {string} [message] - Custom error message
   * @returns {RuleBuilder}
   */
  enum(allowedValues, message = null) {
    this.rules.push({
      id: 'enum',
      type: RuleType.ENUM,
      check: (value) => {
        if (value === null || value === undefined) return true;
        return allowedValues.includes(value);
      },
      message: message || `Must be one of: ${allowedValues.join(', ')}`,
      severity: 'error',
      options: { allowedValues }
    });
    return this;
  }

  /**
   * Add a custom validation rule
   * @param {string} id - Rule identifier
   * @param {Function} checkFn - Validation function
   * @param {string} [message] - Error message
   * @param {string} [severity='error'] - Severity level
   * @returns {RuleBuilder}
   */
  custom(id, checkFn, message = 'Custom validation failed', severity = 'error') {
    this.rules.push({
      id,
      type: RuleType.CUSTOM,
      check: checkFn,
      message,
      severity
    });
    return this;
  }

  /**
   * Build and return the rules array
   * @returns {Array<RuleDefinition>}
   */
  build() {
    return [...this.rules];
  }

  /**
   * Clear all rules
   * @returns {RuleBuilder}
   */
  clear() {
    this.rules = [];
    return this;
  }
}

/**
 * Rule registry for managing reusable rule sets
 */
class RuleRegistry {
  constructor() {
    this.ruleSets = new Map();
  }

  /**
   * Register a rule set
   * @param {string} name - Rule set name
   * @param {Array<RuleDefinition>} rules - Rules to register
   */
  register(name, rules) {
    this.ruleSets.set(name, rules);
  }

  /**
   * Get a registered rule set
   * @param {string} name - Rule set name
   * @returns {Array<RuleDefinition>|undefined}
   */
  get(name) {
    return this.ruleSets.get(name);
  }

  /**
   * Check if a rule set exists
   * @param {string} name - Rule set name
   * @returns {boolean}
   */
  has(name) {
    return this.ruleSets.has(name);
  }

  /**
   * Remove a rule set
   * @param {string} name - Rule set name
   * @returns {boolean}
   */
  remove(name) {
    return this.ruleSets.delete(name);
  }

  /**
   * Get all registered rule set names
   * @returns {Array<string>}
   */
  list() {
    return Array.from(this.ruleSets.keys());
  }

  /**
   * Clear all registered rule sets
   */
  clear() {
    this.ruleSets.clear();
  }
}

/**
 * Create a new rule builder
 * @returns {RuleBuilder}
 */
function rules() {
  return new RuleBuilder();
}

/**
 * Pre-built rule sets for common use cases
 */
const CommonRuleSets = {
  /**
   * Basic security rules
   */
  security: rules()
    .noPII()
    .noInjection()
    .build(),

  /**
   * Strict content rules
   */
  strictContent: rules()
    .required()
    .maxLength(10000)
    .noPII()
    .noInjection()
    .build(),

  /**
   * User input rules
   */
  userInput: rules()
    .required()
    .maxLength(5000)
    .noInjection()
    .build(),

  /**
   * Agent output rules
   */
  agentOutput: rules()
    .required()
    .noPII()
    .build()
};

// Global registry instance
const globalRuleRegistry = new RuleRegistry();

// Pre-register common rule sets
Object.entries(CommonRuleSets).forEach(([name, ruleSet]) => {
  globalRuleRegistry.register(name, ruleSet);
});

module.exports = {
  RuleType,
  SecurityPatterns,
  RuleBuilder,
  RuleRegistry,
  rules,
  CommonRuleSets,
  globalRuleRegistry
};
