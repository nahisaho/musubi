/**
 * @fileoverview Plan Monitor for MUSUBI Replanning Engine
 * Monitors task execution and triggers replanning when needed
 * @module orchestration/replanning/plan-monitor
 * @version 1.0.0
 */

'use strict';

const EventEmitter = require('events');
const { ReplanTrigger } = require('./config');

/**
 * Plan Monitor - Watches task execution and detects replanning triggers
 */
class PlanMonitor extends EventEmitter {
  /**
   * Create a plan monitor
   * @param {Object} options - Monitor options
   * @param {Object} [options.config] - Trigger configuration
   */
  constructor(options = {}) {
    super();
    this.config = options.config || {};
    this.watchedContexts = new Map();
    this.failureCounts = new Map();
    this.timeouts = new Map();
    this.isWatching = false;
  }

  /**
   * Start watching a task execution context
   * @param {string} contextId - Unique context identifier
   * @param {Object} context - Execution context
   * @param {Object} context.plan - Current plan
   * @param {Array} context.tasks - List of tasks
   * @param {Object} [context.engine] - Orchestration engine reference
   * @returns {void}
   */
  watch(contextId, context) {
    if (this.watchedContexts.has(contextId)) {
      this.unwatch(contextId);
    }

    const watchContext = {
      ...context,
      startTime: Date.now(),
      taskResults: [],
      failureCount: 0,
      lastUpdate: Date.now()
    };

    this.watchedContexts.set(contextId, watchContext);
    this.failureCounts.set(contextId, 0);
    this.isWatching = true;

    // Set up timeout if configured
    const taskTimeout = this.config.triggers?.taskTimeout;
    if (taskTimeout) {
      this.setupTimeout(contextId, taskTimeout);
    }

    this.emit('watch:started', { contextId, context: watchContext });
  }

  /**
   * Stop watching a context
   * @param {string} contextId - Context identifier
   */
  unwatch(contextId) {
    this.watchedContexts.delete(contextId);
    this.failureCounts.delete(contextId);
    
    // Clear timeout
    const timeout = this.timeouts.get(contextId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(contextId);
    }

    if (this.watchedContexts.size === 0) {
      this.isWatching = false;
    }

    this.emit('watch:stopped', { contextId });
  }

  /**
   * Report task result and check for triggers
   * @param {string} contextId - Context identifier
   * @param {Object} result - Task result
   * @param {string} result.taskId - Task identifier
   * @param {string} result.status - Task status ('success', 'failed', 'timeout')
   * @param {*} [result.output] - Task output
   * @param {Error} [result.error] - Task error if failed
   * @returns {ReplanTriggerEvent|null} Trigger event if replanning needed
   */
  reportResult(contextId, result) {
    const context = this.watchedContexts.get(contextId);
    if (!context) {
      return null;
    }

    // Update context
    context.taskResults.push(result);
    context.lastUpdate = Date.now();

    // Reset timeout
    this.resetTimeout(contextId);

    // Check for triggers based on result
    const trigger = this.checkTriggers(contextId, result, context);
    
    if (trigger) {
      this.emit('trigger', trigger);
      return trigger;
    }

    return null;
  }

  /**
   * Report context change
   * @param {string} contextId - Context identifier
   * @param {Object} changes - Context changes
   * @returns {ReplanTriggerEvent|null} Trigger event if replanning needed
   */
  reportContextChange(contextId, changes) {
    const context = this.watchedContexts.get(contextId);
    if (!context) {
      return null;
    }

    const enabledTriggers = this.config.triggers?.enabled || [];
    if (!enabledTriggers.includes(ReplanTrigger.CONTEXT_CHANGED)) {
      return null;
    }

    const trigger = {
      type: ReplanTrigger.CONTEXT_CHANGED,
      contextId,
      timestamp: Date.now(),
      data: {
        changes,
        previousContext: { ...context },
        reason: 'Context or requirements changed'
      }
    };

    // Update context with changes
    Object.assign(context, changes);

    this.emit('trigger', trigger);
    return trigger;
  }

  /**
   * Request replanning manually
   * @param {string} contextId - Context identifier
   * @param {string} [reason] - Reason for request
   * @returns {ReplanTriggerEvent} Trigger event
   */
  requestReplan(contextId, reason = 'Human requested replanning') {
    const context = this.watchedContexts.get(contextId);

    const trigger = {
      type: ReplanTrigger.HUMAN_REQUEST,
      contextId,
      timestamp: Date.now(),
      data: {
        reason,
        context: context || null
      }
    };

    this.emit('trigger', trigger);
    return trigger;
  }

  /**
   * Check for trigger conditions based on task result
   * @param {string} contextId - Context identifier
   * @param {Object} result - Task result
   * @param {Object} context - Execution context
   * @returns {ReplanTriggerEvent|null}
   * @private
   */
  checkTriggers(contextId, result, context) {
    const enabledTriggers = this.config.triggers?.enabled || [
      ReplanTrigger.TASK_FAILED,
      ReplanTrigger.TIMEOUT
    ];

    // Check for task failure
    if (result.status === 'failed' && enabledTriggers.includes(ReplanTrigger.TASK_FAILED)) {
      const failureCount = (this.failureCounts.get(contextId) || 0) + 1;
      this.failureCounts.set(contextId, failureCount);

      const threshold = this.config.triggers?.failureThreshold || 2;
      
      if (failureCount >= threshold) {
        return {
          type: ReplanTrigger.TASK_FAILED,
          contextId,
          timestamp: Date.now(),
          data: {
            taskId: result.taskId,
            error: result.error,
            failureCount,
            threshold,
            context: this.sanitizeContext(context)
          }
        };
      }
    }

    // Check for timeout
    if (result.status === 'timeout' && enabledTriggers.includes(ReplanTrigger.TIMEOUT)) {
      return {
        type: ReplanTrigger.TIMEOUT,
        contextId,
        timestamp: Date.now(),
        data: {
          taskId: result.taskId,
          elapsed: Date.now() - context.startTime,
          context: this.sanitizeContext(context)
        }
      };
    }

    // Check for goal unreachable (based on error analysis)
    if (result.status === 'failed' && 
        enabledTriggers.includes(ReplanTrigger.GOAL_UNREACHABLE) &&
        this.isGoalUnreachable(result)) {
      return {
        type: ReplanTrigger.GOAL_UNREACHABLE,
        contextId,
        timestamp: Date.now(),
        data: {
          taskId: result.taskId,
          error: result.error,
          reason: 'Goal determined to be unreachable',
          context: this.sanitizeContext(context)
        }
      };
    }

    return null;
  }

  /**
   * Check if the goal is unreachable based on error
   * @param {Object} result - Task result
   * @returns {boolean}
   * @private
   */
  isGoalUnreachable(result) {
    if (!result.error) return false;

    const unreachablePatterns = [
      /not found/i,
      /does not exist/i,
      /permission denied/i,
      /access denied/i,
      /unauthorized/i,
      /impossible/i,
      /cannot be completed/i
    ];

    const errorMessage = result.error.message || String(result.error);
    return unreachablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Setup timeout for a context
   * @param {string} contextId - Context identifier
   * @param {number} timeout - Timeout in milliseconds
   * @private
   */
  setupTimeout(contextId, timeout) {
    const timeoutHandle = setTimeout(() => {
      const context = this.watchedContexts.get(contextId);
      if (context) {
        const trigger = {
          type: ReplanTrigger.TIMEOUT,
          contextId,
          timestamp: Date.now(),
          data: {
            reason: 'Overall task timeout exceeded',
            elapsed: Date.now() - context.startTime,
            context: this.sanitizeContext(context)
          }
        };
        this.emit('trigger', trigger);
      }
    }, timeout);

    this.timeouts.set(contextId, timeoutHandle);
  }

  /**
   * Reset timeout for a context
   * @param {string} contextId - Context identifier
   * @private
   */
  resetTimeout(contextId) {
    const timeout = this.timeouts.get(contextId);
    if (timeout) {
      clearTimeout(timeout);
      const taskTimeout = this.config.triggers?.taskTimeout;
      if (taskTimeout) {
        this.setupTimeout(contextId, taskTimeout);
      }
    }
  }

  /**
   * Sanitize context for event emission
   * @param {Object} context - Execution context
   * @returns {Object} Sanitized context
   * @private
   */
  sanitizeContext(context) {
    // Remove circular references and large objects
    return {
      startTime: context.startTime,
      lastUpdate: context.lastUpdate,
      failureCount: context.failureCount,
      taskResultCount: context.taskResults?.length || 0,
      plan: context.plan ? {
        id: context.plan.id,
        version: context.plan.version,
        taskCount: context.plan.tasks?.length
      } : null
    };
  }

  /**
   * Get current monitoring stats
   * @returns {Object} Monitoring statistics
   */
  getStats() {
    const contexts = [];
    for (const [contextId, context] of this.watchedContexts) {
      contexts.push({
        contextId,
        startTime: context.startTime,
        lastUpdate: context.lastUpdate,
        failureCount: this.failureCounts.get(contextId) || 0,
        taskResultCount: context.taskResults?.length || 0
      });
    }

    return {
      isWatching: this.isWatching,
      activeContexts: this.watchedContexts.size,
      contexts
    };
  }

  /**
   * Clear all watched contexts
   */
  clear() {
    for (const contextId of this.watchedContexts.keys()) {
      this.unwatch(contextId);
    }
  }
}

/**
 * @typedef {Object} ReplanTriggerEvent
 * @property {string} type - Trigger type from ReplanTrigger enum
 * @property {string} contextId - Context identifier
 * @property {number} timestamp - Event timestamp
 * @property {Object} data - Trigger-specific data
 */

module.exports = { PlanMonitor };
