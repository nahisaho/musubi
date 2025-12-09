/**
 * @fileoverview Guardrails module exports
 * 
 * This module provides guardrail functionality for input/output validation
 * in the MUSUBI orchestration system.
 * 
 * @module orchestration/guardrails
 * @version 3.9.0
 */

'use strict';

const { BaseGuardrail, GuardrailChain, GuardrailTripwireException } = require('./base-guardrail');
const { InputGuardrail, createInputGuardrail } = require('./input-guardrail');
const { OutputGuardrail, createOutputGuardrail, SecretPatterns } = require('./output-guardrail');
const {
  SafetyCheckGuardrail,
  createSafetyCheckGuardrail,
  SafetyLevel,
  ConstitutionalMapping
} = require('./safety-check');
const {
  RuleType,
  SecurityPatterns,
  RuleBuilder,
  RuleRegistry,
  rules,
  CommonRuleSets,
  globalRuleRegistry
} = require('./guardrail-rules');

module.exports = {
  // Base classes
  BaseGuardrail,
  GuardrailChain,
  GuardrailTripwireException,

  // Input guardrails
  InputGuardrail,
  createInputGuardrail,

  // Output guardrails
  OutputGuardrail,
  createOutputGuardrail,
  SecretPatterns,

  // Safety check with constitutional integration
  SafetyCheckGuardrail,
  createSafetyCheckGuardrail,
  SafetyLevel,
  ConstitutionalMapping,

  // Rules DSL
  RuleType,
  SecurityPatterns,
  RuleBuilder,
  RuleRegistry,
  rules,
  CommonRuleSets,
  globalRuleRegistry
};
