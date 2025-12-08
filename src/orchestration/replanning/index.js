/**
 * @fileoverview Replanning Module Exports for MUSUBI
 * @module orchestration/replanning
 * @version 1.0.0
 */

'use strict';

const { ReplanningEngine } = require('./replanning-engine');
const { PlanMonitor } = require('./plan-monitor');
const { PlanEvaluator } = require('./plan-evaluator');
const { AlternativeGenerator, ContextAnalyzer, ConfidenceScorer } = require('./alternative-generator');
const { ReplanHistory } = require('./replan-history');
const {
  ReplanTrigger,
  ReplanDecision,
  defaultReplanningConfig,
  mergeConfig,
  validateConfig
} = require('./config');

module.exports = {
  // Core Engine
  ReplanningEngine,
  
  // Components
  PlanMonitor,
  PlanEvaluator,
  AlternativeGenerator,
  ContextAnalyzer,
  ConfidenceScorer,
  ReplanHistory,
  
  // Configuration
  ReplanTrigger,
  ReplanDecision,
  defaultReplanningConfig,
  mergeConfig,
  validateConfig
};
