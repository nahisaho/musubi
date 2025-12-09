/**
 * @fileoverview Input Guardrail for validating agent inputs
 * 
 * InputGuardrail validates and sanitizes inputs before they reach agents.
 * Inspired by OpenAI Agents SDK guardrails pattern.
 * 
 * @module orchestration/guardrails/input-guardrail
 * @version 3.9.0
 */

'use strict';

const { BaseGuardrail } = require('./base-guardrail');
const { RuleBuilder, rules, globalRuleRegistry } = require('./guardrail-rules');

/**
 * Input guardrail configuration
 * @typedef {Object} InputGuardrailConfig
 * @property {string} name - Guardrail name
 * @property {string} [description] - Description
 * @property {Array<RuleDefinition>} [rules] - Validation rules
 * @property {string} [ruleSet] - Name of registered rule set to use
 * @property {boolean} [sanitize=false] - Whether to sanitize input
 * @property {Object} [sanitizeOptions] - Sanitization options
 * @property {Function} [validator] - Custom validator function
 */

/**
 * Sanitization options
 * @typedef {Object} SanitizeOptions
 * @property {boolean} [trimWhitespace=true] - Trim whitespace
 * @property {boolean} [removeHtmlTags=false] - Remove HTML tags
 * @property {boolean} [normalizeWhitespace=false] - Normalize whitespace
 * @property {boolean} [escapeHtml=false] - Escape HTML entities
 * @property {number} [maxLength] - Truncate to max length
 */

/**
 * Input guardrail for validating agent inputs
 * @extends BaseGuardrail
 */
class InputGuardrail extends BaseGuardrail {
  /**
   * @param {InputGuardrailConfig} config - Configuration
   */
  constructor(config) {
    super({
      name: config.name || 'InputGuardrail',
      description: config.description || 'Validates agent input',
      enabled: config.enabled,
      failFast: config.failFast,
      severity: config.severity,
      tripwireEnabled: config.tripwireEnabled,
      options: config.options
    });

    // Load rules from config, rule set, or default
    if (config.rules && Array.isArray(config.rules)) {
      this.rules = config.rules;
    } else if (config.ruleSet && globalRuleRegistry.has(config.ruleSet)) {
      this.rules = globalRuleRegistry.get(config.ruleSet);
    } else {
      // Default: basic user input rules
      this.rules = rules().required().maxLength(10000).noInjection().build();
    }

    this.sanitize = config.sanitize || false;
    this.sanitizeOptions = config.sanitizeOptions || {};
    this.customValidator = config.validator || null;

    // Field-specific rules for structured input
    this.fieldRules = new Map();
  }

  /**
   * Add rules for a specific field (for structured input)
   * @param {string} fieldName - Field name
   * @param {Array<RuleDefinition>|RuleBuilder} rulesOrBuilder - Rules for the field
   * @returns {InputGuardrail} this for chaining
   */
  addFieldRules(fieldName, rulesOrBuilder) {
    const fieldRules = rulesOrBuilder instanceof RuleBuilder 
      ? rulesOrBuilder.build() 
      : rulesOrBuilder;
    this.fieldRules.set(fieldName, fieldRules);
    return this;
  }

  /**
   * Check the input against all rules
   * @param {*} input - Input to validate
   * @param {Object} [context] - Execution context
   * @returns {Promise<GuardrailResult>}
   */
  async check(input, context = {}) {
    const violations = [];
    let sanitizedInput = input;

    // Sanitize if enabled
    if (this.sanitize) {
      sanitizedInput = this.sanitizeInput(input);
    }

    // Run custom validator first if provided
    if (this.customValidator) {
      try {
        const customResult = await this.customValidator(sanitizedInput, context);
        if (customResult === false || (customResult && customResult.passed === false)) {
          violations.push(this.createViolation(
            'CUSTOM_VALIDATION_FAILED',
            customResult.message || 'Custom validation failed',
            'error',
            { custom: true }
          ));
        }
      } catch (error) {
        violations.push(this.createViolation(
          'CUSTOM_VALIDATOR_ERROR',
          `Custom validator error: ${error.message}`,
          'error',
          { error: error.message }
        ));
      }
    }

    // Check if input is structured (object) and has field rules
    if (typeof sanitizedInput === 'object' && sanitizedInput !== null && !Array.isArray(sanitizedInput)) {
      // Validate each field with field-specific rules
      for (const [fieldName, fieldRules] of this.fieldRules) {
        const fieldValue = sanitizedInput[fieldName];
        const fieldViolations = await this.validateValue(fieldValue, fieldRules, fieldName);
        violations.push(...fieldViolations);

        if (this.failFast && fieldViolations.length > 0) {
          break;
        }
      }
    }

    // Apply general rules to the input (or string content)
    const inputToValidate = this.extractValidatableContent(sanitizedInput);
    const generalViolations = await this.validateValue(inputToValidate, this.rules, 'input');
    violations.push(...generalViolations);

    const passed = violations.length === 0;

    return this.createResult(
      passed,
      violations,
      passed ? 'Input validation passed' : `Input validation failed with ${violations.length} violation(s)`,
      0,
      {
        sanitized: this.sanitize,
        originalInput: input,
        sanitizedInput: this.sanitize ? sanitizedInput : undefined
      }
    );
  }

  /**
   * Validate a value against a set of rules
   * @private
   * @param {*} value - Value to validate
   * @param {Array<RuleDefinition>} rulesToApply - Rules to apply
   * @param {string} fieldName - Field name for error context
   * @returns {Promise<Array<GuardrailViolation>>}
   */
  async validateValue(value, rulesToApply, fieldName) {
    const violations = [];

    for (const rule of rulesToApply) {
      try {
        const result = await Promise.resolve(rule.check(value));
        
        let passed = result;
        let additionalContext = {};

        if (typeof result === 'object' && result !== null) {
          passed = result.passed;
          additionalContext = { ...result };
          delete additionalContext.passed;
        }

        if (!passed) {
          violations.push(this.createViolation(
            rule.id.toUpperCase(),
            `${fieldName}: ${rule.message}`,
            rule.severity || this.defaultSeverity,
            { field: fieldName, rule: rule.id, ...additionalContext }
          ));

          if (this.failFast) {
            break;
          }
        }
      } catch (error) {
        violations.push(this.createViolation(
          'RULE_ERROR',
          `Rule '${rule.id}' execution error: ${error.message}`,
          'error',
          { field: fieldName, rule: rule.id, error: error.message }
        ));
      }
    }

    return violations;
  }

  /**
   * Extract validatable content from input
   * @private
   * @param {*} input - Input value
   * @returns {string}
   */
  extractValidatableContent(input) {
    if (typeof input === 'string') {
      return input;
    }
    
    if (typeof input === 'object' && input !== null) {
      // For structured input, extract 'message', 'content', or 'text' fields
      if (input.message) return input.message;
      if (input.content) return input.content;
      if (input.text) return input.text;
      if (input.input) return input.input;
      
      // If no known field, stringify the object
      return JSON.stringify(input);
    }
    
    return String(input);
  }

  /**
   * Sanitize input based on options
   * @private
   * @param {*} input - Input to sanitize
   * @returns {*}
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      // For non-string input, recursively sanitize string fields in objects
      if (typeof input === 'object' && input !== null) {
        return this.sanitizeObject(input);
      }
      return input;
    }

    return this.sanitizeString(input);
  }

  /**
   * Sanitize a string value
   * @private
   * @param {string} str - String to sanitize
   * @returns {string}
   */
  sanitizeString(str) {
    const opts = this.sanitizeOptions;
    let result = str;

    // Trim whitespace (default: true)
    if (opts.trimWhitespace !== false) {
      result = result.trim();
    }

    // Normalize whitespace
    if (opts.normalizeWhitespace) {
      result = result.replace(/\s+/g, ' ');
    }

    // Remove HTML tags
    if (opts.removeHtmlTags) {
      result = result.replace(/<[^>]*>/g, '');
    }

    // Escape HTML entities
    if (opts.escapeHtml) {
      result = result
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Truncate to max length
    if (opts.maxLength && result.length > opts.maxLength) {
      result = result.substring(0, opts.maxLength);
    }

    return result;
  }

  /**
   * Recursively sanitize string fields in an object
   * @private
   * @param {Object} obj - Object to sanitize
   * @returns {Object}
   */
  sanitizeObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeInput(item));
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Get guardrail info including rules
   * @override
   * @returns {Object}
   */
  getInfo() {
    return {
      ...super.getInfo(),
      rulesCount: this.rules.length,
      fieldRulesCount: this.fieldRules.size,
      sanitize: this.sanitize,
      rules: this.rules.map(r => ({ id: r.id, type: r.type, severity: r.severity }))
    };
  }
}

/**
 * Create an InputGuardrail with common presets
 * @param {string} preset - Preset name ('security', 'userInput', 'strict')
 * @param {Object} [overrides] - Configuration overrides
 * @returns {InputGuardrail}
 */
function createInputGuardrail(preset = 'userInput', overrides = {}) {
  const presets = {
    security: {
      name: 'SecurityGuardrail',
      description: 'Security-focused input validation',
      ruleSet: 'security',
      tripwireEnabled: true
    },
    userInput: {
      name: 'UserInputGuardrail',
      description: 'Validates user input',
      ruleSet: 'userInput',
      sanitize: true,
      sanitizeOptions: { trimWhitespace: true }
    },
    strict: {
      name: 'StrictInputGuardrail',
      description: 'Strict input validation with PII detection',
      ruleSet: 'strictContent',
      sanitize: true,
      tripwireEnabled: true,
      failFast: true
    },
    minimal: {
      name: 'MinimalInputGuardrail',
      description: 'Minimal validation',
      rules: rules().required().build()
    }
  };

  const config = { ...presets[preset] || presets.userInput, ...overrides };
  return new InputGuardrail(config);
}

module.exports = {
  InputGuardrail,
  createInputGuardrail
};
