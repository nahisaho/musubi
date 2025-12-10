/**
 * @fileoverview Output Guardrail for validating agent outputs
 * 
 * OutputGuardrail validates and filters agent outputs before they reach users.
 * Inspired by OpenAI Agents SDK guardrails pattern.
 * 
 * @module orchestration/guardrails/output-guardrail
 * @version 3.9.0
 */

'use strict';

const { BaseGuardrail } = require('./base-guardrail');
const { RuleBuilder: _RuleBuilder, rules, globalRuleRegistry, SecurityPatterns } = require('./guardrail-rules');

/**
 * Output guardrail configuration
 * @typedef {Object} OutputGuardrailConfig
 * @property {string} name - Guardrail name
 * @property {string} [description] - Description
 * @property {Array<RuleDefinition>} [rules] - Validation rules
 * @property {string} [ruleSet] - Name of registered rule set to use
 * @property {boolean} [redact=false] - Whether to redact sensitive content
 * @property {Object} [redactOptions] - Redaction options
 * @property {boolean} [enforceTone=false] - Enforce output tone/style
 * @property {Object} [toneOptions] - Tone enforcement options
 * @property {Function} [validator] - Custom validator function
 * @property {Function} [transformer] - Custom output transformer
 */

/**
 * Redaction options
 * @typedef {Object} RedactOptions
 * @property {boolean} [redactPII=true] - Redact PII
 * @property {boolean} [redactSecrets=true] - Redact secrets/credentials
 * @property {string} [replacement='[REDACTED]'] - Replacement text
 * @property {Array<RegExp>} [customPatterns] - Custom patterns to redact
 */

/**
 * Secret patterns for redaction
 */
const SecretPatterns = {
  API_KEY: /\b(api[_-]?key|apikey)\s*[:=]\s*['"]?[\w-]{20,}['"]?/gi,
  PASSWORD: /\b(password|passwd|pwd)\s*[:=]\s*['"]?[^\s'"]{4,}['"]?/gi,
  TOKEN: /\b(token|bearer|auth)\s*[:=]\s*['"]?[\w.-]{20,}['"]?/gi,
  AWS_KEY: /\b(AKIA[0-9A-Z]{16})\b/g,
  PRIVATE_KEY: /-----BEGIN\s+(RSA\s+)?PRIVATE KEY-----/g,
  CONNECTION_STRING: /\b(mongodb|mysql|postgres|redis):\/\/[^\s]+/gi
};

/**
 * Output guardrail for validating agent outputs
 * @extends BaseGuardrail
 */
class OutputGuardrail extends BaseGuardrail {
  /**
   * @param {OutputGuardrailConfig} config - Configuration
   */
  constructor(config) {
    super({
      name: config.name || 'OutputGuardrail',
      description: config.description || 'Validates agent output',
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
      // Default: agent output rules
      this.rules = rules().required().noPII().build();
    }

    this.redact = config.redact || false;
    this.redactOptions = {
      redactPII: true,
      redactSecrets: true,
      replacement: '[REDACTED]',
      customPatterns: [],
      ...config.redactOptions
    };

    this.enforceTone = config.enforceTone || false;
    this.toneOptions = config.toneOptions || {};
    this.customValidator = config.validator || null;
    this.customTransformer = config.transformer || null;

    // Content policies
    this.contentPolicies = [];

    // Quality checks
    this.qualityChecks = [];
  }

  /**
   * Add a content policy
   * @param {Object} policy - Policy configuration
   * @param {string} policy.name - Policy name
   * @param {Function} policy.check - Check function (content) => {passed, message}
   * @param {string} [policy.severity='error'] - Violation severity
   * @returns {OutputGuardrail} this for chaining
   */
  addContentPolicy(policy) {
    this.contentPolicies.push({
      name: policy.name,
      check: policy.check,
      severity: policy.severity || 'error'
    });
    return this;
  }

  /**
   * Add a quality check
   * @param {Object} check - Quality check configuration
   * @param {string} check.name - Check name
   * @param {Function} check.check - Check function (content) => {passed, message, score}
   * @param {number} [check.threshold=0.5] - Minimum score threshold
   * @returns {OutputGuardrail} this for chaining
   */
  addQualityCheck(check) {
    this.qualityChecks.push({
      name: check.name,
      check: check.check,
      threshold: check.threshold || 0.5
    });
    return this;
  }

  /**
   * Check the output against all rules and policies
   * @param {*} output - Output to validate
   * @param {Object} [context] - Execution context
   * @returns {Promise<GuardrailResult>}
   */
  async check(output, context = {}) {
    const violations = [];
    let processedOutput = output;

    // Apply custom transformer first
    if (this.customTransformer) {
      try {
        processedOutput = await this.customTransformer(output, context);
      } catch (error) {
        violations.push(this.createViolation(
          'TRANSFORMER_ERROR',
          `Output transformer error: ${error.message}`,
          'error',
          { error: error.message }
        ));
      }
    }

    // Run custom validator if provided
    if (this.customValidator) {
      try {
        const customResult = await this.customValidator(processedOutput, context);
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

    // Extract content to validate
    const contentToValidate = this.extractContent(processedOutput);

    // Apply validation rules
    const ruleViolations = await this.validateContent(contentToValidate);
    violations.push(...ruleViolations);

    // Apply content policies
    for (const policy of this.contentPolicies) {
      try {
        const result = await policy.check(contentToValidate, context);
        if (!result.passed) {
          violations.push(this.createViolation(
            `POLICY_${policy.name.toUpperCase()}`,
            result.message || `Content policy '${policy.name}' violated`,
            policy.severity,
            { policy: policy.name }
          ));
        }
      } catch (error) {
        violations.push(this.createViolation(
          'POLICY_ERROR',
          `Policy '${policy.name}' error: ${error.message}`,
          'error',
          { policy: policy.name, error: error.message }
        ));
      }
    }

    // Apply quality checks
    const qualityScores = {};
    for (const qualityCheck of this.qualityChecks) {
      try {
        const result = await qualityCheck.check(contentToValidate, context);
        qualityScores[qualityCheck.name] = result.score;
        
        if (result.score < qualityCheck.threshold) {
          violations.push(this.createViolation(
            `QUALITY_${qualityCheck.name.toUpperCase()}`,
            result.message || `Quality check '${qualityCheck.name}' below threshold`,
            'warning',
            { check: qualityCheck.name, score: result.score, threshold: qualityCheck.threshold }
          ));
        }
      } catch (error) {
        // Quality check errors are warnings, not failures
        violations.push(this.createViolation(
          'QUALITY_ERROR',
          `Quality check '${qualityCheck.name}' error: ${error.message}`,
          'warning',
          { check: qualityCheck.name, error: error.message }
        ));
      }
    }

    // Apply redaction if enabled (even on successful validation)
    let redactedOutput = processedOutput;
    const redactions = [];
    if (this.redact) {
      const redactionResult = this.redactContent(processedOutput);
      redactedOutput = redactionResult.content;
      redactions.push(...redactionResult.redactions);
    }

    // Determine if passed (only 'error' severity violations cause failure)
    const errorViolations = violations.filter(v => v.severity === 'error');
    const passed = errorViolations.length === 0;

    return this.createResult(
      passed,
      violations,
      passed 
        ? 'Output validation passed' 
        : `Output validation failed with ${errorViolations.length} error(s)`,
      0,
      {
        originalOutput: output,
        processedOutput: redactedOutput,
        redactionApplied: this.redact,
        redactionCount: redactions.length,
        redactions: redactions.length > 0 ? redactions : undefined,
        qualityScores: Object.keys(qualityScores).length > 0 ? qualityScores : undefined
      }
    );
  }

  /**
   * Extract content from output
   * @private
   * @param {*} output - Output value
   * @returns {string}
   */
  extractContent(output) {
    if (typeof output === 'string') {
      return output;
    }
    
    if (typeof output === 'object' && output !== null) {
      // Look for common output fields
      if (output.content) return output.content;
      if (output.message) return output.message;
      if (output.text) return output.text;
      if (output.response) return output.response;
      if (output.output) return output.output;
      if (output.result) {
        return typeof output.result === 'string' ? output.result : JSON.stringify(output.result);
      }
      
      return JSON.stringify(output);
    }
    
    return String(output);
  }

  /**
   * Validate content against rules
   * @private
   * @param {string} content - Content to validate
   * @returns {Promise<Array<GuardrailViolation>>}
   */
  async validateContent(content) {
    const violations = [];

    for (const rule of this.rules) {
      try {
        const result = await Promise.resolve(rule.check(content));
        
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
            rule.message,
            rule.severity || this.defaultSeverity,
            { rule: rule.id, ...additionalContext }
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
          { rule: rule.id, error: error.message }
        ));
      }
    }

    return violations;
  }

  /**
   * Redact sensitive content
   * @private
   * @param {*} output - Output to redact
   * @returns {Object} { content, redactions }
   */
  redactContent(output) {
    if (typeof output !== 'string') {
      if (typeof output === 'object' && output !== null) {
        return this.redactObject(output);
      }
      return { content: output, redactions: [] };
    }

    return this.redactString(output);
  }

  /**
   * Redact sensitive content from a string
   * @private
   * @param {string} str - String to redact
   * @returns {Object} { content, redactions }
   */
  redactString(str) {
    const redactions = [];
    let result = str;
    const replacement = this.redactOptions.replacement;

    // Redact PII
    if (this.redactOptions.redactPII) {
      const piiPatterns = [
        { name: 'email', pattern: SecurityPatterns.EMAIL },
        { name: 'phone_us', pattern: SecurityPatterns.PHONE_US },
        { name: 'phone_jp', pattern: SecurityPatterns.PHONE_JP },
        { name: 'ssn', pattern: SecurityPatterns.SSN },
        { name: 'credit_card', pattern: SecurityPatterns.CREDIT_CARD }
      ];

      for (const { name, pattern } of piiPatterns) {
        // Reset lastIndex for global patterns
        pattern.lastIndex = 0;
        const matches = result.match(pattern);
        if (matches) {
          redactions.push({ type: name, count: matches.length });
          result = result.replace(pattern, replacement);
          pattern.lastIndex = 0;
        }
      }
    }

    // Redact secrets
    if (this.redactOptions.redactSecrets) {
      for (const [name, pattern] of Object.entries(SecretPatterns)) {
        pattern.lastIndex = 0;
        const matches = result.match(pattern);
        if (matches) {
          redactions.push({ type: name.toLowerCase(), count: matches.length });
          result = result.replace(pattern, replacement);
          pattern.lastIndex = 0;
        }
      }
    }

    // Apply custom patterns
    for (const pattern of this.redactOptions.customPatterns || []) {
      const matches = result.match(pattern);
      if (matches) {
        redactions.push({ type: 'custom', count: matches.length, pattern: pattern.source });
        result = result.replace(pattern, replacement);
      }
    }

    return { content: result, redactions };
  }

  /**
   * Recursively redact an object
   * @private
   * @param {Object} obj - Object to redact
   * @returns {Object} { content, redactions }
   */
  redactObject(obj) {
    const allRedactions = [];

    const redactValue = (value) => {
      if (typeof value === 'string') {
        const { content, redactions } = this.redactString(value);
        allRedactions.push(...redactions);
        return content;
      }
      if (Array.isArray(value)) {
        return value.map(item => redactValue(item));
      }
      if (typeof value === 'object' && value !== null) {
        const result = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = redactValue(val);
        }
        return result;
      }
      return value;
    };

    const content = redactValue(obj);
    return { content, redactions: allRedactions };
  }

  /**
   * Get guardrail info
   * @override
   * @returns {Object}
   */
  getInfo() {
    return {
      ...super.getInfo(),
      rulesCount: this.rules.length,
      contentPoliciesCount: this.contentPolicies.length,
      qualityChecksCount: this.qualityChecks.length,
      redact: this.redact,
      rules: this.rules.map(r => ({ id: r.id, type: r.type, severity: r.severity }))
    };
  }
}

/**
 * Create an OutputGuardrail with common presets
 * @param {string} preset - Preset name ('security', 'safe', 'strict', 'redact')
 * @param {Object} [overrides] - Configuration overrides
 * @returns {OutputGuardrail}
 */
function createOutputGuardrail(preset = 'safe', overrides = {}) {
  const presets = {
    security: {
      name: 'SecurityOutputGuardrail',
      description: 'Security-focused output validation',
      ruleSet: 'security',
      tripwireEnabled: true
    },
    safe: {
      name: 'SafeOutputGuardrail',
      description: 'Safe output validation with PII check',
      ruleSet: 'agentOutput'
    },
    strict: {
      name: 'StrictOutputGuardrail',
      description: 'Strict output validation',
      ruleSet: 'strictContent',
      tripwireEnabled: true,
      failFast: true
    },
    redact: {
      name: 'RedactingOutputGuardrail',
      description: 'Output validation with automatic redaction',
      ruleSet: 'agentOutput',
      redact: true,
      redactOptions: {
        redactPII: true,
        redactSecrets: true,
        replacement: '[REDACTED]'
      }
    }
  };

  const config = { ...presets[preset] || presets.safe, ...overrides };
  return new OutputGuardrail(config);
}

module.exports = {
  OutputGuardrail,
  createOutputGuardrail,
  SecretPatterns
};
