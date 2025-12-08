/**
 * @fileoverview Default configuration for MUSUBI Replanning Engine
 * @module orchestration/replanning/config
 * @version 1.0.0
 */

'use strict';

/**
 * Replanning trigger types
 * @enum {string}
 */
const ReplanTrigger = {
  /** Task execution failed */
  TASK_FAILED: 'task-failed',
  
  /** Task execution timed out */
  TIMEOUT: 'timeout',
  
  /** Context or requirements changed */
  CONTEXT_CHANGED: 'context-changed',
  
  /** A more efficient path was discovered */
  BETTER_PATH_FOUND: 'better-path-found',
  
  /** Human operator requested replanning */
  HUMAN_REQUEST: 'human-request',
  
  /** Goal determined to be unreachable with current approach */
  GOAL_UNREACHABLE: 'goal-unreachable',
  
  /** Resource constraints changed */
  RESOURCE_CHANGED: 'resource-changed'
};

/**
 * Replanning decision types
 * @enum {string}
 */
const ReplanDecision = {
  /** Continue with current plan */
  CONTINUE: 'continue',
  
  /** Retry the failed task */
  RETRY: 'retry',
  
  /** Skip the failed task */
  SKIP: 'skip',
  
  /** Replace task with alternative */
  REPLACE: 'replace',
  
  /** Insert new tasks into plan */
  INSERT: 'insert',
  
  /** Remove tasks from plan */
  REMOVE: 'remove',
  
  /** Reorder remaining tasks */
  REORDER: 'reorder',
  
  /** Abort execution */
  ABORT: 'abort',
  
  /** Request human intervention */
  HUMAN_REVIEW: 'human-review'
};

/**
 * Default replanning configuration
 */
const defaultReplanningConfig = {
  /**
   * Enable replanning feature
   * @type {boolean}
   */
  enabled: true,

  /**
   * LLM provider configuration
   */
  llmProvider: {
    /**
     * Provider selection: 'auto', 'github-copilot', 'anthropic', 'openai'
     * @type {string}
     */
    provider: 'auto',
    
    /**
     * Model override (optional)
     * @type {string|null}
     */
    model: null,
    
    /**
     * Maximum tokens for LLM response
     * @type {number}
     */
    maxTokens: 2048,
    
    /**
     * Temperature for LLM generation
     * @type {number}
     */
    temperature: 0.7,
    
    /**
     * Timeout for LLM requests in milliseconds
     * @type {number}
     */
    timeout: 60000
  },

  /**
   * Trigger configuration
   */
  triggers: {
    /**
     * Enabled trigger types
     * @type {string[]}
     */
    enabled: [
      ReplanTrigger.TASK_FAILED,
      ReplanTrigger.TIMEOUT,
      ReplanTrigger.CONTEXT_CHANGED,
      ReplanTrigger.HUMAN_REQUEST
    ],
    
    /**
     * Number of consecutive failures before triggering replanning
     * @type {number}
     */
    failureThreshold: 2,
    
    /**
     * Task timeout in milliseconds
     * @type {number}
     */
    taskTimeout: 300000, // 5 minutes
    
    /**
     * Enable proactive better-path detection
     * @type {boolean}
     */
    enableBetterPathDetection: false
  },

  /**
   * Alternative generation configuration
   */
  alternatives: {
    /**
     * Maximum number of alternatives to generate
     * @type {number}
     */
    maxAlternatives: 3,
    
    /**
     * Minimum confidence score to accept an alternative (0.0 - 1.0)
     * @type {number}
     */
    minConfidence: 0.5,
    
    /**
     * Confidence threshold requiring human approval
     * @type {number}
     */
    humanApprovalThreshold: 0.7,
    
    /**
     * Include original task as fallback option
     * @type {boolean}
     */
    includeRetryOption: true,
    
    /**
     * Consider task dependencies when generating alternatives
     * @type {boolean}
     */
    respectDependencies: true
  },

  /**
   * Evaluation configuration
   */
  evaluation: {
    /**
     * Weight for LLM self-assessment in confidence score
     * @type {number}
     */
    llmWeight: 0.4,
    
    /**
     * Weight for historical success rate
     * @type {number}
     */
    historyWeight: 0.3,
    
    /**
     * Weight for resource availability
     * @type {number}
     */
    resourceWeight: 0.2,
    
    /**
     * Weight for complexity score
     * @type {number}
     */
    complexityWeight: 0.1
  },

  /**
   * History and audit configuration
   */
  history: {
    /**
     * Enable history tracking
     * @type {boolean}
     */
    enabled: true,
    
    /**
     * Maximum events to keep in memory
     * @type {number}
     */
    maxEvents: 1000,
    
    /**
     * Persist history to file system
     * @type {boolean}
     */
    persist: false,
    
    /**
     * History file path (relative to project root)
     * @type {string}
     */
    filePath: 'storage/replanning-history.json',
    
    /**
     * Export format for reports
     * @type {string}
     */
    exportFormat: 'markdown'
  },

  /**
   * Human-in-the-loop configuration
   */
  humanInLoop: {
    /**
     * Enable human-in-the-loop for low confidence alternatives
     * @type {boolean}
     */
    enabled: true,
    
    /**
     * Timeout for human response in milliseconds
     * @type {number}
     */
    timeout: 300000, // 5 minutes
    
    /**
     * Default action on timeout
     * @type {string}
     */
    defaultOnTimeout: 'abort',
    
    /**
     * Always require approval for these trigger types
     * @type {string[]}
     */
    alwaysApprove: [ReplanTrigger.GOAL_UNREACHABLE]
  },

  /**
   * Integration configuration
   */
  integration: {
    /**
     * Patterns to enable replanning for
     * @type {string[]}
     */
    enabledPatterns: ['swarm', 'sequential', 'workflow'],
    
    /**
     * Emit events for replanning actions
     * @type {boolean}
     */
    emitEvents: true,
    
    /**
     * Event prefix for replanning events
     * @type {string}
     */
    eventPrefix: 'replan'
  }
};

/**
 * Merge user configuration with defaults
 * @param {Object} userConfig - User-provided configuration
 * @returns {Object} Merged configuration
 */
function mergeConfig(userConfig = {}) {
  return deepMerge(defaultReplanningConfig, userConfig);
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 * @private
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Validate configuration
 * @param {Object} config - Configuration to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateConfig(config) {
  const errors = [];

  // Validate confidence thresholds
  if (config.alternatives?.minConfidence < 0 || config.alternatives?.minConfidence > 1) {
    errors.push('alternatives.minConfidence must be between 0 and 1');
  }
  
  if (config.alternatives?.humanApprovalThreshold < 0 || config.alternatives?.humanApprovalThreshold > 1) {
    errors.push('alternatives.humanApprovalThreshold must be between 0 and 1');
  }

  // Validate evaluation weights sum to 1
  const evaluation = config.evaluation || {};
  const weightSum = (evaluation.llmWeight || 0) + 
                   (evaluation.historyWeight || 0) + 
                   (evaluation.resourceWeight || 0) + 
                   (evaluation.complexityWeight || 0);
  
  if (Math.abs(weightSum - 1.0) > 0.01) {
    errors.push(`Evaluation weights must sum to 1.0, got ${weightSum}`);
  }

  // Validate trigger types
  const validTriggers = Object.values(ReplanTrigger);
  for (const trigger of config.triggers?.enabled || []) {
    if (!validTriggers.includes(trigger)) {
      errors.push(`Invalid trigger type: ${trigger}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  ReplanTrigger,
  ReplanDecision,
  defaultReplanningConfig,
  mergeConfig,
  validateConfig
};
