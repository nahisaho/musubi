/**
 * @fileoverview Replanning Module Exports for MUSUBI
 * @module orchestration/replanning
 * @version 1.1.0
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

// v3.6.0+ Advanced Replanning Components
const { 
  ProactivePathOptimizer, 
  PathAnalyzer, 
  OptimizationStrategy 
} = require('./proactive-path-optimizer');
const { 
  GoalProgressTracker, 
  ProgressCalculator, 
  MilestoneManager, 
  DeviationDetector, 
  ProjectionEngine 
} = require('./goal-progress-tracker');
const { 
  AdaptiveGoalModifier, 
  ImpactAnalyzer, 
  ModificationStrategy, 
  ModificationHistoryManager,
  ModificationReason,
  ModificationType 
} = require('./adaptive-goal-modifier');

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
  validateConfig,

  // v3.6.0+ Proactive Path Optimization
  ProactivePathOptimizer,
  PathAnalyzer,
  OptimizationStrategy,

  // v3.6.0+ Goal Progress Tracking
  GoalProgressTracker,
  ProgressCalculator,
  MilestoneManager,
  DeviationDetector,
  ProjectionEngine,

  // v3.6.0+ Adaptive Goal Modification
  AdaptiveGoalModifier,
  ImpactAnalyzer,
  ModificationStrategy,
  ModificationHistoryManager,
  ModificationReason,
  ModificationType
};
