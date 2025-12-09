/**
 * @fileoverview Base Guardrail class for MUSUBI Orchestration
 * 
 * Guardrails provide safety checks for agent inputs and outputs.
 * Inspired by OpenAI Agents SDK guardrails pattern.
 * 
 * @module orchestration/guardrails/base-guardrail
 * @version 3.9.0
 */

'use strict';

/**
 * Guardrail execution result
 * @typedef {Object} GuardrailResult
 * @property {boolean} passed - Whether the guardrail check passed
 * @property {string} guardrailName - Name of the guardrail that was executed
 * @property {string} [message] - Optional message describing the result
 * @property {Array<GuardrailViolation>} violations - List of violations found
 * @property {Object} [metadata] - Additional metadata from the check
 * @property {number} executionTimeMs - Time taken to execute the guardrail
 */

/**
 * Guardrail violation details
 * @typedef {Object} GuardrailViolation
 * @property {string} code - Violation code (e.g., 'PII_DETECTED', 'PROHIBITED_CONTENT')
 * @property {string} message - Human-readable description
 * @property {string} severity - 'error' | 'warning' | 'info'
 * @property {Object} [context] - Additional context about the violation
 */

/**
 * Guardrail configuration options
 * @typedef {Object} GuardrailConfig
 * @property {string} name - Unique name for the guardrail
 * @property {string} [description] - Description of what the guardrail checks
 * @property {boolean} [enabled=true] - Whether the guardrail is enabled
 * @property {boolean} [failFast=false] - Stop on first violation
 * @property {string} [severity='error'] - Default severity level
 * @property {Object} [options] - Guardrail-specific options
 */

/**
 * Tripwire exception - thrown when guardrail fails and tripwire is enabled
 * @class
 */
class GuardrailTripwireException extends Error {
  /**
   * @param {string} message - Error message
   * @param {GuardrailResult} result - The guardrail result that triggered the tripwire
   */
  constructor(message, result) {
    super(message);
    this.name = 'GuardrailTripwireException';
    this.result = result;
    this.violations = result.violations;
  }
}

/**
 * Base class for all guardrails
 * @abstract
 */
class BaseGuardrail {
  /**
   * @param {GuardrailConfig} config - Guardrail configuration
   */
  constructor(config) {
    if (new.target === BaseGuardrail) {
      throw new Error('BaseGuardrail is abstract and cannot be instantiated directly');
    }

    this.name = config.name || this.constructor.name;
    this.description = config.description || '';
    this.enabled = config.enabled !== false;
    this.failFast = config.failFast || false;
    this.defaultSeverity = config.severity || 'error';
    this.options = config.options || {};
    
    // Tripwire: if true, throws exception on failure instead of returning result
    this.tripwireEnabled = config.tripwireEnabled || false;
  }

  /**
   * Execute the guardrail check
   * @abstract
   * @param {*} input - Input to validate
   * @param {Object} [context] - Execution context
   * @returns {Promise<GuardrailResult>}
   */
  async check(input, context = {}) {
    throw new Error('Subclasses must implement check() method');
  }

  /**
   * Run the guardrail with timing and error handling
   * @param {*} input - Input to validate
   * @param {Object} [context] - Execution context
   * @returns {Promise<GuardrailResult>}
   */
  async run(input, context = {}) {
    if (!this.enabled) {
      return this.createResult(true, [], 'Guardrail is disabled');
    }

    const startTime = Date.now();
    
    try {
      const result = await this.check(input, context);
      result.executionTimeMs = Date.now() - startTime;
      result.guardrailName = this.name;
      
      // Handle tripwire
      if (this.tripwireEnabled && !result.passed) {
        throw new GuardrailTripwireException(
          `Guardrail '${this.name}' triggered tripwire: ${result.message || 'Validation failed'}`,
          result
        );
      }
      
      return result;
    } catch (error) {
      if (error instanceof GuardrailTripwireException) {
        throw error; // Re-throw tripwire exceptions
      }
      
      // Wrap unexpected errors
      return this.createResult(
        false,
        [{
          code: 'GUARDRAIL_ERROR',
          message: error.message,
          severity: 'error',
          context: { errorName: error.name, stack: error.stack }
        }],
        `Guardrail execution failed: ${error.message}`,
        Date.now() - startTime
      );
    }
  }

  /**
   * Create a standardized guardrail result
   * @protected
   * @param {boolean} passed - Whether the check passed
   * @param {Array<GuardrailViolation>} [violations=[]] - List of violations
   * @param {string} [message] - Optional message
   * @param {number} [executionTimeMs=0] - Execution time
   * @param {Object} [metadata] - Additional metadata
   * @returns {GuardrailResult}
   */
  createResult(passed, violations = [], message = undefined, executionTimeMs = 0, metadata = {}) {
    return {
      passed,
      guardrailName: this.name,
      message,
      violations,
      metadata,
      executionTimeMs
    };
  }

  /**
   * Create a violation object
   * @protected
   * @param {string} code - Violation code
   * @param {string} message - Human-readable message
   * @param {string} [severity] - Severity level
   * @param {Object} [context] - Additional context
   * @returns {GuardrailViolation}
   */
  createViolation(code, message, severity = null, context = {}) {
    return {
      code,
      message,
      severity: severity || this.defaultSeverity,
      context
    };
  }

  /**
   * Enable the guardrail
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable the guardrail
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Enable tripwire mode
   */
  enableTripwire() {
    this.tripwireEnabled = true;
  }

  /**
   * Disable tripwire mode
   */
  disableTripwire() {
    this.tripwireEnabled = false;
  }

  /**
   * Get guardrail info
   * @returns {Object}
   */
  getInfo() {
    return {
      name: this.name,
      description: this.description,
      enabled: this.enabled,
      failFast: this.failFast,
      tripwireEnabled: this.tripwireEnabled,
      defaultSeverity: this.defaultSeverity
    };
  }
}

/**
 * Guardrail chain for running multiple guardrails
 */
class GuardrailChain {
  /**
   * @param {Object} [options] - Chain options
   * @param {boolean} [options.parallel=false] - Run guardrails in parallel
   * @param {boolean} [options.stopOnFirstFailure=false] - Stop on first failure
   * @param {string} [options.name='GuardrailChain'] - Chain name
   */
  constructor(options = {}) {
    this.name = options.name || 'GuardrailChain';
    this.parallel = options.parallel || false;
    this.stopOnFirstFailure = options.stopOnFirstFailure || false;
    this.guardrails = [];
  }

  /**
   * Add a guardrail to the chain
   * @param {BaseGuardrail} guardrail - Guardrail to add
   * @returns {GuardrailChain} this for chaining
   */
  add(guardrail) {
    if (!(guardrail instanceof BaseGuardrail)) {
      throw new Error('Can only add BaseGuardrail instances to the chain');
    }
    this.guardrails.push(guardrail);
    return this;
  }

  /**
   * Add multiple guardrails to the chain
   * @param {Array<BaseGuardrail>} guardrails - Guardrails to add
   * @returns {GuardrailChain} this for chaining
   */
  addAll(guardrails) {
    guardrails.forEach(g => this.add(g));
    return this;
  }

  /**
   * Run all guardrails in the chain
   * @param {*} input - Input to validate
   * @param {Object} [context] - Execution context
   * @returns {Promise<Object>} Combined result
   */
  async run(input, context = {}) {
    const startTime = Date.now();
    const results = [];
    const allViolations = [];
    let overallPassed = true;

    if (this.parallel) {
      // Parallel execution with optional early termination
      const promises = this.guardrails.map(g => g.run(input, context));
      
      if (this.stopOnFirstFailure) {
        // Use Promise.race pattern for early termination
        const settledResults = await Promise.allSettled(promises);
        
        for (const settled of settledResults) {
          if (settled.status === 'fulfilled') {
            const result = settled.value;
            results.push(result);
            
            if (!result.passed) {
              overallPassed = false;
              allViolations.push(...result.violations);
            }
          } else {
            // Handle rejected promise (tripwire or error)
            throw settled.reason;
          }
        }
      } else {
        const resolvedResults = await Promise.all(promises);
        for (const result of resolvedResults) {
          results.push(result);
          if (!result.passed) {
            overallPassed = false;
            allViolations.push(...result.violations);
          }
        }
      }
    } else {
      // Sequential execution
      for (const guardrail of this.guardrails) {
        const result = await guardrail.run(input, context);
        results.push(result);
        
        if (!result.passed) {
          overallPassed = false;
          allViolations.push(...result.violations);
          
          if (this.stopOnFirstFailure) {
            break;
          }
        }
      }
    }

    return {
      passed: overallPassed,
      chainName: this.name,
      results,
      violations: allViolations,
      guardrailCount: this.guardrails.length,
      executedCount: results.length,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * Get list of guardrails in the chain
   * @returns {Array<Object>}
   */
  getGuardrails() {
    return this.guardrails.map(g => g.getInfo());
  }

  /**
   * Clear all guardrails from the chain
   */
  clear() {
    this.guardrails = [];
  }
}

module.exports = {
  BaseGuardrail,
  GuardrailChain,
  GuardrailTripwireException
};
