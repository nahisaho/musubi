/**
 * @fileoverview Safety Check integration for Guardrails
 * 
 * Provides safety checks that can integrate with MUSUBI's
 * Constitutional Articles for governance compliance.
 * 
 * @module orchestration/guardrails/safety-check
 * @version 3.9.0
 */

'use strict';

const { BaseGuardrail } = require('./base-guardrail');
const { rules } = require('./guardrail-rules');

/**
 * Safety check levels
 */
const SafetyLevel = {
  /** Basic safety checks */
  BASIC: 'basic',
  /** Standard safety checks including content moderation */
  STANDARD: 'standard',
  /** Strict safety checks with constitutional compliance */
  STRICT: 'strict',
  /** Maximum safety with all checks enabled */
  PARANOID: 'paranoid'
};

/**
 * Constitutional article mappings for guardrail rules
 */
const ConstitutionalMapping = {
  // Article I: Spec Supremacy
  SPEC_SUPREMACY: {
    article: 'I',
    title: 'Spec Supremacy',
    checks: ['required', 'format']
  },
  // Article II: Traceability Mandate  
  TRACEABILITY: {
    article: 'II',
    title: 'Traceability Mandate',
    checks: ['traceId']
  },
  // Article III: Immutable History
  IMMUTABLE_HISTORY: {
    article: 'III',
    title: 'Immutable History',
    checks: ['noModification']
  },
  // Article IV: Validation Gates
  VALIDATION_GATES: {
    article: 'IV',
    title: 'Validation Gates',
    checks: ['validate']
  },
  // Article V: Agent Boundaries
  AGENT_BOUNDARIES: {
    article: 'V',
    title: 'Agent Boundaries',
    checks: ['agentScope']
  },
  // Article VI: Graceful Degradation
  GRACEFUL_DEGRADATION: {
    article: 'VI',
    title: 'Graceful Degradation',
    checks: ['fallback']
  },
  // Article VII: Quality Assurance
  QUALITY_ASSURANCE: {
    article: 'VII',
    title: 'Quality Assurance',
    checks: ['quality']
  },
  // Article VIII: Human Override
  HUMAN_OVERRIDE: {
    article: 'VIII',
    title: 'Human Override',
    checks: ['humanApproval']
  },
  // Article IX: Continuous Improvement
  CONTINUOUS_IMPROVEMENT: {
    article: 'IX',
    title: 'Continuous Improvement',
    checks: ['metrics']
  }
};

/**
 * Safety check result with constitutional compliance
 * @typedef {Object} SafetyCheckResult
 * @property {boolean} safe - Whether the content is safe
 * @property {string} level - Safety level applied
 * @property {Array<string>} violations - List of violations
 * @property {Array<Object>} constitutionalViolations - Constitutional article violations
 * @property {Object} scores - Safety scores by category
 */

/**
 * Safety Check Guardrail with Constitutional Integration
 * @extends BaseGuardrail
 */
class SafetyCheckGuardrail extends BaseGuardrail {
  /**
   * @param {Object} config - Configuration
   * @param {string} [config.level='standard'] - Safety level
   * @param {boolean} [config.enforceConstitution=false] - Enforce constitutional articles
   * @param {Array<string>} [config.enabledArticles] - Specific articles to enforce
   * @param {Object} [config.customChecks] - Custom safety checks
   */
  constructor(config = {}) {
    super({
      name: config.name || 'SafetyCheckGuardrail',
      description: config.description || 'Safety and constitutional compliance check',
      enabled: config.enabled,
      failFast: config.failFast,
      severity: config.severity || 'error',
      tripwireEnabled: config.tripwireEnabled
    });

    this.level = config.level || SafetyLevel.STANDARD;
    this.enforceConstitution = config.enforceConstitution || false;
    this.enabledArticles = config.enabledArticles || Object.keys(ConstitutionalMapping);
    this.customChecks = config.customChecks || {};

    // Build rules based on safety level
    this.rules = this.buildRules();
  }

  /**
   * Build validation rules based on safety level
   * @private
   * @returns {Array}
   */
  buildRules() {
    const builder = rules();

    switch (this.level) {
      case SafetyLevel.BASIC:
        builder.required();
        break;

      case SafetyLevel.STANDARD:
        builder
          .required()
          .maxLength(50000)
          .noInjection({ sql: true, xss: true, command: false });
        break;

      case SafetyLevel.STRICT:
        builder
          .required()
          .maxLength(50000)
          .noInjection()
          .noPII();
        break;

      case SafetyLevel.PARANOID:
        builder
          .required()
          .maxLength(10000)
          .noInjection()
          .noPII()
          .noProhibitedWords(['hack', 'exploit', 'bypass', 'override']);
        break;
    }

    return builder.build();
  }

  /**
   * Check content for safety and constitutional compliance
   * @param {*} input - Content to check
   * @param {Object} [context] - Execution context
   * @returns {Promise<SafetyCheckResult>}
   */
  async check(input, context = {}) {
    const violations = [];
    const constitutionalViolations = [];
    const scores = {};

    // Extract content
    const content = this.extractContent(input);

    // Run standard safety rules
    for (const rule of this.rules) {
      try {
        const result = await Promise.resolve(rule.check(content));
        let passed = typeof result === 'object' ? result.passed : result;

        if (!passed) {
          violations.push(this.createViolation(
            rule.id.toUpperCase(),
            rule.message,
            rule.severity || 'error',
            { rule: rule.id }
          ));
        }
      } catch (error) {
        violations.push(this.createViolation(
          'RULE_ERROR',
          `Rule '${rule.id}' error: ${error.message}`,
          'error'
        ));
      }
    }

    // Check constitutional compliance if enabled
    if (this.enforceConstitution) {
      const constitutionalResult = await this.checkConstitutionalCompliance(input, context);
      constitutionalViolations.push(...constitutionalResult.violations);
      scores.constitutional = constitutionalResult.score;
    }

    // Run custom checks
    for (const [checkName, checkFn] of Object.entries(this.customChecks)) {
      try {
        const result = await checkFn(input, context);
        scores[checkName] = result.score || (result.passed ? 1.0 : 0.0);
        
        if (!result.passed) {
          violations.push(this.createViolation(
            `CUSTOM_${checkName.toUpperCase()}`,
            result.message || `Custom check '${checkName}' failed`,
            result.severity || 'warning'
          ));
        }
      } catch (error) {
        violations.push(this.createViolation(
          'CUSTOM_CHECK_ERROR',
          `Custom check '${checkName}' error: ${error.message}`,
          'warning'
        ));
      }
    }

    // Calculate overall safety score
    const allViolations = [...violations, ...constitutionalViolations];
    const errorCount = allViolations.filter(v => v.severity === 'error').length;
    const safe = errorCount === 0;

    return this.createResult(
      safe,
      allViolations,
      safe ? 'Safety check passed' : `Safety check failed with ${errorCount} error(s)`,
      0,
      {
        level: this.level,
        safe,
        constitutionalCompliance: this.enforceConstitution,
        constitutionalViolations,
        scores
      }
    );
  }

  /**
   * Check constitutional article compliance
   * @private
   * @param {*} input - Input to check
   * @param {Object} context - Execution context
   * @returns {Promise<Object>}
   */
  async checkConstitutionalCompliance(input, context) {
    const violations = [];
    let complianceScore = 1.0;
    const articleScores = {};

    for (const articleKey of this.enabledArticles) {
      const mapping = ConstitutionalMapping[articleKey];
      if (!mapping) continue;

      const articleResult = await this.checkArticle(articleKey, mapping, input, context);
      articleScores[mapping.article] = articleResult.score;

      if (!articleResult.compliant) {
        complianceScore -= (1 / this.enabledArticles.length) * (1 - articleResult.score);
        violations.push(this.createViolation(
          `CONSTITUTIONAL_ARTICLE_${mapping.article}`,
          `Constitutional Article ${mapping.article} (${mapping.title}) violation: ${articleResult.message}`,
          'error',
          { article: mapping.article, title: mapping.title }
        ));
      }
    }

    return {
      compliant: violations.length === 0,
      score: Math.max(0, complianceScore),
      violations,
      articleScores
    };
  }

  /**
   * Check a specific constitutional article
   * @private
   * @param {string} articleKey - Article key
   * @param {Object} mapping - Article mapping
   * @param {*} input - Input to check
   * @param {Object} context - Execution context
   * @returns {Promise<Object>}
   */
  async checkArticle(articleKey, mapping, input, context) {
    // Default implementation - can be overridden for specific article checks
    switch (articleKey) {
      case 'SPEC_SUPREMACY':
        // Check that input references specifications
        return this.checkSpecSupremacy(input, context);

      case 'TRACEABILITY':
        // Check for trace IDs
        return this.checkTraceability(input, context);

      case 'VALIDATION_GATES':
        // Check validation status
        return this.checkValidationGates(input, context);

      case 'AGENT_BOUNDARIES':
        // Check agent scope
        return this.checkAgentBoundaries(input, context);

      default:
        // Default: compliant
        return { compliant: true, score: 1.0, message: 'Check not implemented' };
    }
  }

  /**
   * Check Article I: Spec Supremacy compliance
   * @private
   */
  async checkSpecSupremacy(input, context) {
    // Check if the operation references specification
    const hasSpecRef = context.specId || context.requirementId || 
                       (typeof input === 'object' && (input.specId || input.requirementId));
    
    return {
      compliant: hasSpecRef !== false,
      score: hasSpecRef ? 1.0 : 0.5,
      message: hasSpecRef ? 'Specification reference found' : 'No specification reference'
    };
  }

  /**
   * Check Article II: Traceability Mandate compliance
   * @private
   */
  async checkTraceability(input, context) {
    const hasTraceId = context.traceId || context.correlationId ||
                       (typeof input === 'object' && (input.traceId || input.correlationId));
    
    return {
      compliant: hasTraceId !== false,
      score: hasTraceId ? 1.0 : 0.5,
      message: hasTraceId ? 'Trace ID found' : 'No trace ID'
    };
  }

  /**
   * Check Article IV: Validation Gates compliance
   * @private
   */
  async checkValidationGates(input, context) {
    const isValidated = context.validated === true ||
                        (typeof input === 'object' && input.validated === true);
    
    return {
      compliant: true, // Validation is optional at input stage
      score: isValidated ? 1.0 : 0.7,
      message: isValidated ? 'Content validated' : 'Content not yet validated'
    };
  }

  /**
   * Check Article V: Agent Boundaries compliance
   * @private
   */
  async checkAgentBoundaries(input, context) {
    const agentId = context.agentId || (typeof input === 'object' && input.agentId);
    const allowedAgents = context.allowedAgents || [];
    
    if (!agentId) {
      return { compliant: true, score: 0.8, message: 'No agent specified' };
    }
    
    if (allowedAgents.length > 0 && !allowedAgents.includes(agentId)) {
      return {
        compliant: false,
        score: 0.0,
        message: `Agent '${agentId}' not in allowed list`
      };
    }
    
    return { compliant: true, score: 1.0, message: 'Agent within boundaries' };
  }

  /**
   * Extract content to check
   * @private
   */
  extractContent(input) {
    if (typeof input === 'string') return input;
    if (typeof input === 'object' && input !== null) {
      return input.content || input.message || input.text || JSON.stringify(input);
    }
    return String(input);
  }

  /**
   * Get guardrail info
   * @override
   */
  getInfo() {
    return {
      ...super.getInfo(),
      level: this.level,
      enforceConstitution: this.enforceConstitution,
      enabledArticles: this.enabledArticles,
      customChecksCount: Object.keys(this.customChecks).length
    };
  }
}

/**
 * Create a SafetyCheckGuardrail with preset configuration
 * @param {string} preset - Preset name
 * @param {Object} [overrides] - Configuration overrides
 * @returns {SafetyCheckGuardrail}
 */
function createSafetyCheckGuardrail(preset = 'standard', overrides = {}) {
  const presets = {
    basic: {
      name: 'BasicSafetyGuardrail',
      level: SafetyLevel.BASIC
    },
    standard: {
      name: 'StandardSafetyGuardrail',
      level: SafetyLevel.STANDARD
    },
    strict: {
      name: 'StrictSafetyGuardrail',
      level: SafetyLevel.STRICT,
      enforceConstitution: true
    },
    paranoid: {
      name: 'ParanoidSafetyGuardrail',
      level: SafetyLevel.PARANOID,
      enforceConstitution: true,
      tripwireEnabled: true,
      failFast: true
    },
    constitutional: {
      name: 'ConstitutionalGuardrail',
      level: SafetyLevel.STANDARD,
      enforceConstitution: true,
      enabledArticles: Object.keys(ConstitutionalMapping)
    }
  };

  const config = { ...presets[preset] || presets.standard, ...overrides };
  return new SafetyCheckGuardrail(config);
}

module.exports = {
  SafetyCheckGuardrail,
  createSafetyCheckGuardrail,
  SafetyLevel,
  ConstitutionalMapping
};
