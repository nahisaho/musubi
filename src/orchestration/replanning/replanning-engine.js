/**
 * @fileoverview Core Replanning Engine for MUSUBI
 * Provides dynamic task replanning capabilities
 * @module orchestration/replanning/replanning-engine
 * @version 1.0.0
 */

'use strict';

const EventEmitter = require('events');
const { ReplanTrigger, ReplanDecision, mergeConfig, defaultReplanningConfig } = require('./config');
const { PlanMonitor } = require('./plan-monitor');
const { PlanEvaluator } = require('./plan-evaluator');
const { AlternativeGenerator } = require('./alternative-generator');
const { ReplanHistory } = require('./replan-history');
const { createLLMProvider } = require('../../llm-providers');

/**
 * Replanning Engine - Core engine for dynamic task replanning
 */
class ReplanningEngine extends EventEmitter {
  /**
   * Create a replanning engine
   * @param {Object} [orchestrationEngine] - Reference to orchestration engine
   * @param {Object} [options={}] - Engine options
   */
  constructor(orchestrationEngine = null, options = {}) {
    super();
    
    this.engine = orchestrationEngine;
    this.config = mergeConfig(options.config || options);
    
    // Initialize components
    this.llmProvider = options.llmProvider || this.createLLMProvider();
    this.monitor = new PlanMonitor({ config: this.config });
    this.evaluator = new PlanEvaluator({ config: this.config.evaluation });
    this.generator = new AlternativeGenerator(this.llmProvider, {
      config: this.config.alternatives,
      scorerConfig: this.config.evaluation
    });
    this.history = new ReplanHistory({ config: this.config.history });
    
    // State
    this.currentPlan = null;
    this.planVersion = 0;
    this.isExecuting = false;
    this.executionContext = null;
    
    // Wire up monitor events
    this.setupMonitorEvents();
  }

  /**
   * Create LLM provider based on configuration
   * @returns {LLMProvider} LLM provider instance
   * @private
   */
  createLLMProvider() {
    try {
      const providerConfig = this.config.llmProvider || {};
      return createLLMProvider(providerConfig.provider || 'auto', providerConfig);
    } catch (error) {
      console.warn('Failed to create LLM provider:', error.message);
      // Return a mock provider that warns on use
      return {
        complete: async () => { 
          throw new Error('No LLM provider available for replanning'); 
        },
        completeJSON: async () => { 
          throw new Error('No LLM provider available for replanning'); 
        },
        isAvailable: async () => false
      };
    }
  }

  /**
   * Setup monitor event handlers
   * @private
   */
  setupMonitorEvents() {
    this.monitor.on('trigger', async (trigger) => {
      if (this.config.integration?.emitEvents) {
        this.emit(`${this.config.integration.eventPrefix}:trigger`, trigger);
      }
      
      // Handle the trigger
      try {
        await this.handleTrigger(trigger);
      } catch (error) {
        this.emit('error', error);
      }
    });
  }

  /**
   * Execute a plan with replanning support
   * @param {Object} plan - Execution plan
   * @param {Object} [options={}] - Execution options
   * @returns {Promise<ExecutionResult>} Execution result
   */
  async executeWithReplanning(plan, options = {}) {
    if (!this.config.enabled) {
      // Replanning disabled, delegate to engine
      return this.delegateToEngine(plan, options);
    }

    this.currentPlan = this.normalizePlan(plan);
    this.planVersion = 0;
    this.isExecuting = true;
    
    // Initialize execution context
    this.executionContext = {
      planId: this.currentPlan.id,
      startTime: Date.now(),
      completed: [],
      pending: [...(this.currentPlan.tasks || [])],
      failed: [],
      retries: 0
    };

    // Record initial snapshot
    this.history.recordSnapshot(
      this.currentPlan.id,
      this.currentPlan,
      'Initial plan'
    );

    // Start monitoring
    this.monitor.watch(this.currentPlan.id, {
      plan: this.currentPlan,
      tasks: this.currentPlan.tasks,
      ...this.executionContext
    });

    try {
      // Execute with replanning loop
      const result = await this.executeLoop(options);
      
      this.isExecuting = false;
      this.monitor.unwatch(this.currentPlan.id);
      
      return result;
    } catch (error) {
      this.isExecuting = false;
      this.monitor.unwatch(this.currentPlan.id);
      throw error;
    }
  }

  /**
   * Main execution loop with replanning
   * @param {Object} options - Execution options
   * @returns {Promise<ExecutionResult>}
   * @private
   */
  async executeLoop(options) {
    while (this.executionContext.pending.length > 0 && this.isExecuting) {
      const task = this.executionContext.pending.shift();
      
      try {
        // Execute task
        const result = await this.executeTask(task, options);
        
        // Record success
        this.executionContext.completed.push({
          ...task,
          result,
          duration: result.duration,
          completedAt: Date.now()
        });
        
        // Report to monitor
        this.monitor.reportResult(this.currentPlan.id, {
          taskId: task.id,
          status: 'success',
          output: result
        });
        
        // Record in evaluator
        this.evaluator.recordExecution(task.skill || task.name, {
          success: true,
          duration: result.duration
        });
        
      } catch (error) {
        // Record failure
        const failedTask = {
          ...task,
          error,
          failedAt: Date.now(),
          attempts: (task.attempts || 0) + 1
        };
        this.executionContext.failed.push(failedTask);
        
        // Report to monitor (may trigger replanning)
        const trigger = this.monitor.reportResult(this.currentPlan.id, {
          taskId: task.id,
          status: 'failed',
          error
        });
        
        // Record in evaluator
        this.evaluator.recordExecution(task.skill || task.name, {
          success: false,
          duration: Date.now() - (task.startTime || Date.now())
        });
        
        // If trigger was detected, wait for replanning to complete
        if (trigger) {
          // Replanning is handled by trigger event
          // Continue to next iteration
        }
      }
    }

    // Generate final result
    return this.generateResult();
  }

  /**
   * Execute a single task
   * @param {Object} task - Task to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Task result
   * @private
   */
  async executeTask(task, options) {
    task.startTime = Date.now();
    
    if (this.engine) {
      // Delegate to orchestration engine
      return this.engine.executeSkill(task.skill || task.name, task.parameters, options);
    }
    
    // Mock execution for testing
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      success: true,
      duration: Date.now() - task.startTime,
      output: `Executed ${task.skill || task.name}`
    };
  }

  /**
   * Handle a replanning trigger
   * @param {Object} trigger - Trigger event
   * @returns {Promise<void>}
   * @private
   */
  async handleTrigger(trigger) {
    const failedTask = this.executionContext.failed[this.executionContext.failed.length - 1];
    
    // Generate alternatives
    const alternatives = await this.generator.generateAlternatives(
      failedTask,
      this.executionContext
    );
    
    // Select best alternative or request human input
    const decision = await this.selectAlternative(alternatives, trigger);
    
    // Record the replan event
    const event = this.history.record({
      trigger: trigger.type,
      decision: decision.type,
      planId: this.currentPlan.id,
      failedTask: {
        id: failedTask.id,
        name: failedTask.name,
        skill: failedTask.skill,
        error: failedTask.error?.message
      },
      alternatives: alternatives.map(a => ({
        id: a.id,
        description: a.description,
        confidence: a.confidence
      })),
      selectedAlternative: decision.alternative ? {
        id: decision.alternative.id,
        description: decision.alternative.description,
        confidence: decision.alternative.confidence,
        reasoning: decision.alternative.reasoning
      } : null,
      context: {
        completedCount: this.executionContext.completed.length,
        pendingCount: this.executionContext.pending.length,
        failedCount: this.executionContext.failed.length
      }
    });
    
    // Apply the decision
    await this.applyDecision(decision, trigger);
    
    // Emit replan event
    this.emit('replan', { event, decision, alternatives });
  }

  /**
   * Select the best alternative or request human input
   * @param {Alternative[]} alternatives - Available alternatives
   * @param {Object} trigger - Trigger event
   * @returns {Promise<Decision>} Selected decision
   * @private
   */
  async selectAlternative(alternatives, trigger) {
    // Check if human approval is always required for this trigger
    const alwaysApprove = this.config.humanInLoop?.alwaysApprove || [];
    const requiresApproval = alwaysApprove.includes(trigger.type);
    
    if (alternatives.length === 0) {
      return {
        type: ReplanDecision.ABORT,
        alternative: null,
        reason: 'No viable alternatives found'
      };
    }
    
    const bestAlternative = alternatives[0];
    
    // Check if confidence is below threshold
    const threshold = this.config.alternatives?.humanApprovalThreshold || 0.7;
    if (requiresApproval || bestAlternative.confidence < threshold) {
      if (this.config.humanInLoop?.enabled) {
        return this.requestHumanApproval(alternatives, trigger);
      }
    }
    
    // Auto-select best alternative
    return {
      type: this.getDecisionType(bestAlternative),
      alternative: bestAlternative,
      reason: `Auto-selected with confidence ${bestAlternative.confidence}`
    };
  }

  /**
   * Get decision type based on alternative
   * @param {Alternative} alternative - Selected alternative
   * @returns {string} Decision type
   * @private
   */
  getDecisionType(alternative) {
    if (alternative.id === 'retry') {
      return ReplanDecision.RETRY;
    }
    if (alternative.source === 'skip') {
      return ReplanDecision.SKIP;
    }
    return ReplanDecision.REPLACE;
  }

  /**
   * Request human approval for alternatives
   * @param {Alternative[]} alternatives - Available alternatives
   * @param {Object} trigger - Trigger event
   * @returns {Promise<Decision>} Human decision
   * @private
   */
  async requestHumanApproval(alternatives, trigger) {
    return new Promise((resolve) => {
      const timeout = this.config.humanInLoop?.timeout || 300000;
      
      // Emit event for human review
      this.emit('replan:review-required', {
        trigger,
        alternatives,
        timeout,
        respond: (decision) => {
          resolve(decision);
        }
      });
      
      // Timeout handling
      setTimeout(() => {
        const defaultAction = this.config.humanInLoop?.defaultOnTimeout || 'abort';
        resolve({
          type: defaultAction === 'abort' ? ReplanDecision.ABORT : ReplanDecision.SKIP,
          alternative: null,
          reason: 'Human approval timeout'
        });
      }, timeout);
    });
  }

  /**
   * Apply the selected decision
   * @param {Decision} decision - Decision to apply
   * @param {Object} trigger - Original trigger
   * @private
   */
  async applyDecision(decision, trigger) {
    const planId = this.currentPlan.id;
    
    switch (decision.type) {
      case ReplanDecision.RETRY:
        // Add task back to pending
        const retryTask = {
          ...decision.alternative.task,
          attempts: (decision.alternative.task.attempts || 0) + 1
        };
        this.executionContext.pending.unshift(retryTask);
        this.executionContext.retries++;
        break;
        
      case ReplanDecision.REPLACE:
        // Add alternative task to pending
        this.executionContext.pending.unshift(decision.alternative.task);
        this.planVersion++;
        this.history.recordSnapshot(planId, this.currentPlan, 'Task replaced');
        break;
        
      case ReplanDecision.SKIP:
        // Do nothing, task is already removed from pending
        break;
        
      case ReplanDecision.INSERT:
        // Insert new tasks at appropriate position
        if (decision.tasks) {
          this.executionContext.pending.unshift(...decision.tasks);
          this.planVersion++;
        }
        break;
        
      case ReplanDecision.ABORT:
        // Stop execution
        this.isExecuting = false;
        break;
        
      case ReplanDecision.HUMAN_REVIEW:
        // Already handled
        break;
        
      default:
        console.warn(`Unknown decision type: ${decision.type}`);
    }
    
    // Update history with outcome
    const lastEvent = this.history.getEvents({ limit: 1, sort: 'desc' })[0];
    if (lastEvent) {
      lastEvent.outcome = {
        success: decision.type !== ReplanDecision.ABORT,
        applied: decision.type
      };
    }
  }

  /**
   * Generate final execution result
   * @returns {ExecutionResult} Final result
   * @private
   */
  generateResult() {
    const evaluation = this.evaluator.evaluate(
      this.currentPlan,
      this.executionContext
    );
    
    return {
      planId: this.currentPlan.id,
      planVersion: this.planVersion,
      status: this.executionContext.failed.length === 0 ? 'success' : 'partial',
      completed: this.executionContext.completed,
      failed: this.executionContext.failed,
      pending: this.executionContext.pending,
      evaluation,
      replanCount: this.planVersion,
      history: this.history.getMetrics(),
      duration: Date.now() - this.executionContext.startTime
    };
  }

  /**
   * Normalize plan structure
   * @param {Object} plan - Input plan
   * @returns {Object} Normalized plan
   * @private
   */
  normalizePlan(plan) {
    const normalizedTasks = (plan.tasks || []).map((task, index) => {
      const normalized = {
        ...task,
        id: task.id || `task-${index}`,
        name: task.name || task.skill,
        skill: task.skill || task.name,
        parameters: task.parameters || {},
        dependencies: task.dependencies || []
      };
      return normalized;
    });
    
    return {
      ...plan,
      id: plan.id || `plan-${Date.now()}`,
      version: plan.version || 1,
      tasks: normalizedTasks
    };
  }

  /**
   * Delegate execution to orchestration engine
   * @param {Object} plan - Plan to execute
   * @param {Object} options - Options
   * @returns {Promise<Object>} Result
   * @private
   */
  async delegateToEngine(plan, options) {
    if (!this.engine) {
      throw new Error('No orchestration engine available');
    }
    return this.engine.execute(plan.pattern || 'sequential', {
      ...options,
      tasks: plan.tasks
    });
  }

  /**
   * Manually trigger replanning
   * @param {string} [reason] - Reason for manual replan
   * @returns {Promise<void>}
   */
  async replan(reason = 'Manual replan request') {
    if (!this.isExecuting) {
      throw new Error('Cannot replan when not executing');
    }
    
    this.monitor.requestReplan(this.currentPlan.id, reason);
  }

  /**
   * Add a task to the current plan
   * @param {Object} task - Task to add
   * @param {string} [position='end'] - Position: 'start', 'end', or task ID
   */
  addTask(task, position = 'end') {
    if (!this.currentPlan) {
      throw new Error('No active plan');
    }
    
    const normalizedTask = {
      id: task.id || `task-${Date.now()}`,
      ...task
    };
    
    if (position === 'start') {
      this.executionContext.pending.unshift(normalizedTask);
    } else if (position === 'end') {
      this.executionContext.pending.push(normalizedTask);
    } else {
      // Insert after specific task
      const index = this.executionContext.pending.findIndex(t => t.id === position);
      if (index !== -1) {
        this.executionContext.pending.splice(index + 1, 0, normalizedTask);
      } else {
        this.executionContext.pending.push(normalizedTask);
      }
    }
    
    this.planVersion++;
    this.emit('plan:modified', { action: 'add', task: normalizedTask });
  }

  /**
   * Remove a task from the current plan
   * @param {string} taskId - Task ID to remove
   * @returns {boolean} Whether task was found and removed
   */
  removeTask(taskId) {
    if (!this.currentPlan) {
      throw new Error('No active plan');
    }
    
    const index = this.executionContext.pending.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const removed = this.executionContext.pending.splice(index, 1)[0];
      this.planVersion++;
      this.emit('plan:modified', { action: 'remove', task: removed });
      return true;
    }
    
    return false;
  }

  /**
   * Reorder tasks in the current plan
   * @param {string[]} taskIds - Ordered task IDs
   */
  reorderTasks(taskIds) {
    if (!this.currentPlan) {
      throw new Error('No active plan');
    }
    
    const taskMap = new Map(
      this.executionContext.pending.map(t => [t.id, t])
    );
    
    const reordered = [];
    for (const id of taskIds) {
      const task = taskMap.get(id);
      if (task) {
        reordered.push(task);
        taskMap.delete(id);
      }
    }
    
    // Add remaining tasks at end
    reordered.push(...taskMap.values());
    
    this.executionContext.pending = reordered;
    this.planVersion++;
    this.emit('plan:modified', { action: 'reorder', order: taskIds });
  }

  /**
   * Modify a task in the current plan
   * @param {string} taskId - Task ID to modify
   * @param {Object} updates - Updates to apply
   * @returns {boolean} Whether task was found and modified
   */
  modifyTask(taskId, updates) {
    if (!this.currentPlan) {
      throw new Error('No active plan');
    }
    
    const task = this.executionContext.pending.find(t => t.id === taskId);
    if (task) {
      Object.assign(task, updates);
      this.planVersion++;
      this.emit('plan:modified', { action: 'modify', taskId, updates });
      return true;
    }
    
    return false;
  }

  /**
   * Get plan history
   * @param {Object} [filter] - Filter options
   * @returns {Object} Plan history
   */
  getPlanHistory(filter) {
    return {
      events: this.history.getEvents(filter),
      metrics: this.history.getMetrics(),
      snapshots: this.currentPlan ? this.history.getSnapshots(this.currentPlan.id) : []
    };
  }

  /**
   * Get current plan state
   * @returns {Object|null} Current plan
   */
  getCurrentPlan() {
    if (!this.currentPlan) return null;
    
    return {
      ...this.currentPlan,
      version: this.planVersion,
      context: this.executionContext
    };
  }

  /**
   * Check if LLM provider is available
   * @returns {Promise<boolean>}
   */
  async isLLMAvailable() {
    return this.llmProvider.isAvailable();
  }

  /**
   * Export history report
   * @param {string} [format='markdown'] - Export format
   * @returns {string} Report content
   */
  exportHistory(format = 'markdown') {
    if (format === 'json') {
      return this.history.exportJSON();
    }
    return this.history.exportMarkdown();
  }
}

/**
 * @typedef {Object} ExecutionResult
 * @property {string} planId - Plan identifier
 * @property {number} planVersion - Final plan version
 * @property {string} status - Execution status
 * @property {Object[]} completed - Completed tasks
 * @property {Object[]} failed - Failed tasks
 * @property {Object[]} pending - Remaining pending tasks
 * @property {Object} evaluation - Plan evaluation
 * @property {number} replanCount - Number of replans
 * @property {Object} history - History metrics
 * @property {number} duration - Total duration in ms
 */

/**
 * @typedef {Object} Decision
 * @property {string} type - Decision type from ReplanDecision
 * @property {Object|null} alternative - Selected alternative
 * @property {string} reason - Reason for decision
 * @property {Object[]} [tasks] - Tasks for INSERT decision
 */

module.exports = { ReplanningEngine };
