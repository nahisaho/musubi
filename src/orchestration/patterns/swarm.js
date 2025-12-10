/**
 * SwarmPattern - Parallel skill execution pattern
 * 
 * Enables concurrent execution of multiple skills with
 * P-label task decomposition and dependency tracking.
 * 
 * v1.1.0: Added replanning support for dynamic task recovery
 */

const { BasePattern } = require('../pattern-registry');
const { PatternType, ExecutionContext, ExecutionStatus: _ExecutionStatus, Priority } = require('../orchestration-engine');

/**
 * P-label priority levels for parallel execution
 */
const PLabel = {
  P0: 'P0',  // Critical - must complete first (blocking)
  P1: 'P1',  // High priority - primary path
  P2: 'P2',  // Medium priority - secondary path  
  P3: 'P3'   // Low priority - can be deferred
};

/**
 * Execution strategy for swarm
 */
const SwarmStrategy = {
  ALL: 'all',           // Wait for all to complete
  FIRST: 'first',       // Return after first success
  MAJORITY: 'majority', // Return after majority complete
  QUORUM: 'quorum'      // Return after quorum achieved
};

/**
 * SwarmPattern - Parallel skill execution
 */
class SwarmPattern extends BasePattern {
  constructor(options = {}) {
    super({
      name: PatternType.SWARM,
      type: PatternType.SWARM,
      description: 'Execute multiple skills concurrently with dependency tracking',
      version: '1.1.0',
      tags: ['parallel', 'concurrent', 'swarm', 'distributed', 'replanning'],
      useCases: [
        'Parallel task execution',
        'Independent subtask processing',
        'Load distribution',
        'Multi-perspective analysis',
        'Dynamic task recovery with replanning'
      ],
      complexity: 'high',
      supportsParallel: true,
      supportsReplanning: true,
      requiresHuman: false
    });

    this.options = {
      strategy: options.strategy || SwarmStrategy.ALL,
      maxConcurrent: options.maxConcurrent || 10,
      timeout: options.timeout || 60000, // 60 seconds per task
      retryFailed: options.retryFailed || false,
      retryAttempts: options.retryAttempts || 3,
      quorumThreshold: options.quorumThreshold || 0.5,
      priorityOrder: options.priorityOrder || [PLabel.P0, PLabel.P1, PLabel.P2, PLabel.P3],
      // Replanning options
      enableReplanning: options.enableReplanning || false,
      replanningEngine: options.replanningEngine || null,
      fallbackSkill: options.fallbackSkill || null,
      ...options
    };
  }

  /**
   * Validate the execution context
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {object} Validation result
   */
  validate(context, engine) {
    const errors = [];
    const input = context.input;

    // Check for tasks
    if (!input.tasks || !Array.isArray(input.tasks)) {
      errors.push('Swarm pattern requires input.tasks array');
    } else if (input.tasks.length === 0) {
      errors.push('Swarm pattern requires at least one task');
    } else {
      // Validate each task
      for (let i = 0; i < input.tasks.length; i++) {
        const task = input.tasks[i];
        if (!task.skill) {
          errors.push(`Task ${i} requires a skill name`);
        } else if (!engine.getSkill(task.skill)) {
          errors.push(`Unknown skill: ${task.skill}`);
        }
      }
    }

    // Validate dependencies
    if (input.dependencies) {
      const taskIds = new Set(input.tasks.map(t => t.id || t.skill));
      for (const [taskId, deps] of Object.entries(input.dependencies)) {
        if (!taskIds.has(taskId)) {
          errors.push(`Dependency references unknown task: ${taskId}`);
        }
        for (const dep of deps) {
          if (!taskIds.has(dep)) {
            errors.push(`Dependency references unknown task: ${dep}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute swarm pattern
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {Promise<object>} Execution result
   */
  async execute(context, engine) {
    const validation = this.validate(context, engine);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const { tasks, dependencies = {}, sharedContext = {} } = context.input;
    const results = new Map();
    const completed = new Set();
    const failed = new Set();
    const pending = new Set(tasks.map(t => t.id || t.skill));

    engine.emit('swarmStarted', {
      context,
      totalTasks: tasks.length,
      strategy: this.options.strategy
    });

    const startTime = Date.now();

    try {
      // Sort tasks by priority
      const sortedTasks = this._sortByPriority(tasks);

      // Execute tasks respecting dependencies
      while (pending.size > 0) {
        // Find ready tasks (dependencies satisfied)
        const readyTasks = sortedTasks.filter(task => {
          const taskId = task.id || task.skill;
          if (!pending.has(taskId)) return false;
          
          const deps = dependencies[taskId] || [];
          return deps.every(dep => completed.has(dep));
        });

        if (readyTasks.length === 0 && pending.size > 0) {
          // Circular dependency or missing dependency
          throw new Error(`Cannot resolve dependencies for tasks: ${[...pending].join(', ')}`);
        }

        // Execute ready tasks in parallel (limited by maxConcurrent)
        const batch = readyTasks.slice(0, this.options.maxConcurrent);

        engine.emit('swarmBatchStarted', {
          context,
          batch: batch.map(t => t.id || t.skill),
          pending: pending.size
        });

        const batchResults = await Promise.allSettled(
          batch.map(task => this._executeTask(task, engine, context, sharedContext, results))
        );

        // Process results
        for (let i = 0; i < batch.length; i++) {
          const task = batch[i];
          const taskId = task.id || task.skill;
          const result = batchResults[i];

          pending.delete(taskId);

          if (result.status === 'fulfilled') {
            results.set(taskId, result.value);
            completed.add(taskId);

            engine.emit('swarmTaskCompleted', {
              context,
              taskId,
              result: result.value
            });
          } else {
            failed.add(taskId);
            results.set(taskId, { error: result.reason.message });

            engine.emit('swarmTaskFailed', {
              context,
              taskId,
              error: result.reason
            });

            // Try replanning if enabled
            if (this.options.enableReplanning && this.options.replanningEngine) {
              const alternative = await this._tryReplanning(
                task,
                result.reason,
                engine,
                context,
                sharedContext,
                results
              );
              
              if (alternative) {
                // Add alternative task to pending
                pending.add(alternative.id || alternative.skill);
                sortedTasks.push(alternative);
                failed.delete(taskId);
                
                engine.emit('swarmTaskReplanned', {
                  context,
                  originalTaskId: taskId,
                  alternativeTask: alternative
                });
                continue;
              }
            }

            // Retry logic (fallback if replanning not available or failed)
            if (this.options.retryFailed && task.retryCount < this.options.retryAttempts) {
              task.retryCount = (task.retryCount || 0) + 1;
              pending.add(taskId);
              failed.delete(taskId);
            } else if (this.options.fallbackSkill) {
              // Use fallback skill
              const fallbackTask = {
                ...task,
                skill: this.options.fallbackSkill,
                id: `${taskId}-fallback`,
                originalTaskId: taskId
              };
              pending.add(fallbackTask.id);
              sortedTasks.push(fallbackTask);
              failed.delete(taskId);
            }
          }
        }

        // Check early exit conditions
        if (this._shouldExit(completed, failed, tasks.length)) {
          break;
        }
      }

      const duration = Date.now() - startTime;
      const summary = this._createSummary(results, completed, failed, duration, tasks);

      engine.emit('swarmCompleted', {
        context,
        results: Object.fromEntries(results),
        summary
      });

      return {
        results: Object.fromEntries(results),
        completed: [...completed],
        failed: [...failed],
        summary
      };

    } catch (error) {
      engine.emit('swarmFailed', {
        context,
        results: Object.fromEntries(results),
        error
      });
      throw error;
    }
  }

  /**
   * Sort tasks by priority (P0 first)
   * @private
   */
  _sortByPriority(tasks) {
    const priorityOrder = this.options.priorityOrder;
    
    return [...tasks].sort((a, b) => {
      const aPriority = a.priority || PLabel.P2;
      const bPriority = b.priority || PLabel.P2;
      return priorityOrder.indexOf(aPriority) - priorityOrder.indexOf(bPriority);
    });
  }

  /**
   * Execute a single task
   * @private
   */
  async _executeTask(task, engine, parentContext, sharedContext, previousResults) {
    const taskId = task.id || task.skill;
    
    const stepContext = new ExecutionContext({
      task: `Swarm task: ${taskId}`,
      skill: task.skill,
      input: {
        ...sharedContext,
        ...task.input,
        previousResults: Object.fromEntries(previousResults)
      },
      parentId: parentContext.id,
      priority: this._mapPriority(task.priority),
      metadata: {
        pattern: PatternType.SWARM,
        taskId,
        priority: task.priority || PLabel.P2
      }
    });

    parentContext.children.push(stepContext);

    stepContext.start();

    try {
      const result = await Promise.race([
        engine.executeSkill(task.skill, stepContext.input, parentContext),
        this._timeout(this.options.timeout, taskId)
      ]);

      stepContext.complete(result);
      return result;

    } catch (error) {
      stepContext.fail(error);
      throw error;
    }
  }

  /**
   * Map P-label to internal priority
   * @private
   */
  _mapPriority(pLabel) {
    const mapping = {
      [PLabel.P0]: Priority.CRITICAL,
      [PLabel.P1]: Priority.HIGH,
      [PLabel.P2]: Priority.MEDIUM,
      [PLabel.P3]: Priority.LOW
    };
    return mapping[pLabel] || Priority.MEDIUM;
  }

  /**
   * Create timeout promise
   * @private
   */
  _timeout(ms, taskId) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Task ${taskId} timed out after ${ms}ms`)), ms);
    });
  }

  /**
   * Try to replan a failed task using ReplanningEngine
   * @param {Object} task - Failed task
   * @param {Error} error - Error that caused failure
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @param {ExecutionContext} context - Parent context
   * @param {Object} sharedContext - Shared context
   * @param {Map} previousResults - Previous results
   * @returns {Promise<Object|null>} Alternative task or null
   * @private
   */
  async _tryReplanning(task, error, engine, context, sharedContext, previousResults) {
    const replanningEngine = this.options.replanningEngine;
    
    try {
      // Create context for replanning
      const replanContext = {
        completed: [...previousResults.entries()].filter(([, v]) => !v.error).map(([id, result]) => ({
          id,
          result
        })),
        pending: [],
        failed: [{
          id: task.id || task.skill,
          ...task,
          error
        }],
        sharedContext
      };

      // Generate alternatives
      const alternatives = await replanningEngine.generator.generateAlternatives(
        { ...task, error },
        replanContext
      );

      if (alternatives.length > 0) {
        const best = alternatives[0];
        
        // Only use alternatives with sufficient confidence
        if (best.confidence >= (replanningEngine.config.alternatives?.minConfidence || 0.5)) {
          return {
            ...best.task,
            id: best.task.id || `${task.id || task.skill}-replan`,
            priority: task.priority,
            originalTaskId: task.id || task.skill,
            replanSource: 'llm',
            replanConfidence: best.confidence
          };
        }
      }
    } catch (replanError) {
      engine.emit('swarmReplanFailed', {
        context,
        taskId: task.id || task.skill,
        error: replanError
      });
    }

    return null;
  }

  /**
   * Check if swarm should exit early based on strategy
   * @private
   */
  _shouldExit(completed, failed, total) {
    switch (this.options.strategy) {
      case SwarmStrategy.FIRST:
        return completed.size >= 1;
      
      case SwarmStrategy.MAJORITY:
        return completed.size > total / 2;
      
      case SwarmStrategy.QUORUM:
        return completed.size >= total * this.options.quorumThreshold;
      
      case SwarmStrategy.ALL:
      default:
        return false; // Continue until all complete
    }
  }

  /**
   * Create execution summary
   * @private
   */
  _createSummary(results, completed, failed, duration, tasks) {
    const total = tasks.length;
    const successCount = completed.size;
    const failCount = failed.size;
    const pendingCount = total - successCount - failCount;

    // Count by priority
    const byPriority = {
      [PLabel.P0]: { total: 0, completed: 0, failed: 0 },
      [PLabel.P1]: { total: 0, completed: 0, failed: 0 },
      [PLabel.P2]: { total: 0, completed: 0, failed: 0 },
      [PLabel.P3]: { total: 0, completed: 0, failed: 0 }
    };

    for (const task of tasks) {
      const priority = task.priority || PLabel.P2;
      const taskId = task.id || task.skill;
      byPriority[priority].total++;
      if (completed.has(taskId)) byPriority[priority].completed++;
      if (failed.has(taskId)) byPriority[priority].failed++;
    }

    return {
      total,
      completed: successCount,
      failed: failCount,
      pending: pendingCount,
      duration,
      successRate: total > 0 ? (successCount / total * 100).toFixed(1) + '%' : '0%',
      strategy: this.options.strategy,
      byPriority
    };
  }
}

/**
 * Create a swarm pattern with custom options
 * @param {object} options - Pattern options
 * @returns {SwarmPattern} Swarm pattern instance
 */
function createSwarmPattern(options = {}) {
  return new SwarmPattern(options);
}

module.exports = {
  SwarmPattern,
  PLabel,
  SwarmStrategy,
  createSwarmPattern
};
