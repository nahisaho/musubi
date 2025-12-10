/**
 * @file planning-engine.js
 * @description Agentic planning engine for task decomposition and execution planning
 * @version 1.0.0
 */

'use strict';

const { EventEmitter } = require('events');

/**
 * Plan status types
 * @enum {string}
 */
const PLAN_STATUS = {
  DRAFT: 'draft',
  READY: 'ready',
  EXECUTING: 'executing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Task status types
 * @enum {string}
 */
const TASK_STATUS = {
  PENDING: 'pending',
  READY: 'ready',
  IN_PROGRESS: 'in-progress',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

/**
 * Task priority levels
 * @enum {number}
 */
const PRIORITY = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  OPTIONAL: 4
};

/**
 * @typedef {Object} Task
 * @property {string} id - Task identifier
 * @property {string} name - Task name
 * @property {string} description - Task description
 * @property {string} status - Task status
 * @property {number} priority - Priority level
 * @property {string[]} dependencies - Task IDs this depends on
 * @property {string[]} outputs - Expected outputs
 * @property {number} estimatedTime - Estimated time in ms
 * @property {number} [actualTime] - Actual time taken
 * @property {Object} [result] - Task result
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} Plan
 * @property {string} id - Plan identifier
 * @property {string} goal - High-level goal
 * @property {string} status - Plan status
 * @property {Task[]} tasks - Ordered list of tasks
 * @property {Object} context - Planning context
 * @property {number} createdAt - Creation timestamp
 * @property {number} [startedAt] - Execution start timestamp
 * @property {number} [completedAt] - Completion timestamp
 * @property {Object} metrics - Execution metrics
 */

/**
 * @typedef {Object} PlanningOptions
 * @property {number} [maxTasks=50] - Maximum tasks in a plan
 * @property {boolean} [parallelExecution=true] - Allow parallel task execution
 * @property {number} [maxParallel=4] - Maximum parallel tasks
 * @property {boolean} [adaptivePlanning=true] - Enable adaptive replanning
 * @property {number} [replanThreshold=0.3] - Threshold for triggering replan
 */

/**
 * Planning Engine class for task decomposition and execution planning
 * @extends EventEmitter
 */
class PlanningEngine extends EventEmitter {
  /**
   * Create planning engine
   * @param {PlanningOptions} [options={}] - Engine options
   */
  constructor(options = {}) {
    super();
    
    this.maxTasks = options.maxTasks ?? 50;
    this.parallelExecution = options.parallelExecution ?? true;
    this.maxParallel = options.maxParallel ?? 4;
    this.adaptivePlanning = options.adaptivePlanning ?? true;
    this.replanThreshold = options.replanThreshold ?? 0.3;
    
    // State
    this.plans = new Map();
    this.activePlan = null;
    this.taskCounter = 0;
  }
  
  /**
   * Create a plan from a goal
   * @param {string} goal - High-level goal description
   * @param {Object} [context={}] - Additional context
   * @returns {Promise<Plan>}
   */
  async createPlan(goal, context = {}) {
    const planId = this.generateId('plan');
    
    const plan = {
      id: planId,
      goal,
      status: PLAN_STATUS.DRAFT,
      tasks: [],
      context,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      metrics: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        skippedTasks: 0,
        totalEstimatedTime: 0,
        actualTime: 0
      }
    };
    
    this.emit('plan:creating', { planId, goal });
    
    // Decompose goal into tasks
    const tasks = await this.decomposeGoal(goal, context);
    plan.tasks = tasks;
    plan.metrics.totalTasks = tasks.length;
    plan.metrics.totalEstimatedTime = tasks.reduce((sum, t) => sum + t.estimatedTime, 0);
    
    // Optimize task order
    this.optimizeTaskOrder(plan);
    
    // Update status
    plan.status = PLAN_STATUS.READY;
    
    this.plans.set(planId, plan);
    this.emit('plan:created', { plan });
    
    return plan;
  }
  
  /**
   * Decompose goal into tasks
   * @private
   */
  async decomposeGoal(goal, _context) {
    const tasks = [];
    
    // Analyze goal for key components
    const components = this.analyzeGoal(goal);
    
    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      
      const task = {
        id: this.generateId('task'),
        name: component.name,
        description: component.description,
        status: TASK_STATUS.PENDING,
        priority: component.priority ?? PRIORITY.MEDIUM,
        dependencies: [],
        outputs: component.outputs || [],
        estimatedTime: component.estimatedTime || 5000,
        actualTime: null,
        result: null,
        metadata: {
          component: component.type,
          index: i
        }
      };
      
      // Add dependencies from previous tasks if sequential
      if (i > 0 && component.dependsOnPrevious !== false) {
        task.dependencies.push(tasks[i - 1].id);
      }
      
      tasks.push(task);
    }
    
    return tasks;
  }
  
  /**
   * Analyze goal to extract components
   * @private
   */
  analyzeGoal(goal) {
    const components = [];
    const goalLower = goal.toLowerCase();
    
    // Pattern matching for common goal structures
    const patterns = [
      { keyword: 'create', type: 'creation', priority: PRIORITY.HIGH },
      { keyword: 'build', type: 'construction', priority: PRIORITY.HIGH },
      { keyword: 'implement', type: 'implementation', priority: PRIORITY.HIGH },
      { keyword: 'fix', type: 'bugfix', priority: PRIORITY.CRITICAL },
      { keyword: 'test', type: 'testing', priority: PRIORITY.MEDIUM },
      { keyword: 'deploy', type: 'deployment', priority: PRIORITY.HIGH },
      { keyword: 'refactor', type: 'refactoring', priority: PRIORITY.MEDIUM },
      { keyword: 'document', type: 'documentation', priority: PRIORITY.LOW },
      { keyword: 'analyze', type: 'analysis', priority: PRIORITY.MEDIUM },
      { keyword: 'review', type: 'review', priority: PRIORITY.MEDIUM }
    ];
    
    // Match patterns
    for (const pattern of patterns) {
      if (goalLower.includes(pattern.keyword)) {
        components.push({
          name: `${pattern.keyword.charAt(0).toUpperCase() + pattern.keyword.slice(1)} phase`,
          description: `${pattern.type} task for: ${goal.substring(0, 50)}`,
          type: pattern.type,
          priority: pattern.priority,
          estimatedTime: this.estimateTime(pattern.type)
        });
      }
    }
    
    // If no patterns matched, create generic decomposition
    if (components.length === 0) {
      components.push(
        {
          name: 'Analysis',
          description: 'Analyze requirements and context',
          type: 'analysis',
          priority: PRIORITY.HIGH,
          estimatedTime: 3000
        },
        {
          name: 'Planning',
          description: 'Create detailed implementation plan',
          type: 'planning',
          priority: PRIORITY.HIGH,
          estimatedTime: 2000
        },
        {
          name: 'Execution',
          description: 'Execute the main task',
          type: 'execution',
          priority: PRIORITY.HIGH,
          estimatedTime: 10000
        },
        {
          name: 'Validation',
          description: 'Validate results and quality',
          type: 'validation',
          priority: PRIORITY.MEDIUM,
          estimatedTime: 3000
        }
      );
    }
    
    return components;
  }
  
  /**
   * Estimate time for task type
   * @private
   */
  estimateTime(type) {
    const estimates = {
      creation: 15000,
      construction: 20000,
      implementation: 25000,
      bugfix: 10000,
      testing: 8000,
      deployment: 12000,
      refactoring: 15000,
      documentation: 5000,
      analysis: 5000,
      review: 6000
    };
    
    return estimates[type] || 10000;
  }
  
  /**
   * Optimize task order based on dependencies and priorities
   * @private
   */
  optimizeTaskOrder(plan) {
    // Topological sort with priority consideration
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (taskId) => {
      if (visited.has(taskId)) return;
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected for task ${taskId}`);
      }
      
      visiting.add(taskId);
      
      const task = plan.tasks.find(t => t.id === taskId);
      if (task) {
        for (const depId of task.dependencies) {
          visit(depId);
        }
        visited.add(taskId);
        sorted.push(task);
      }
      
      visiting.delete(taskId);
    };
    
    // Sort by priority first, then visit
    const byPriority = [...plan.tasks].sort((a, b) => a.priority - b.priority);
    for (const task of byPriority) {
      visit(task.id);
    }
    
    plan.tasks = sorted;
    
    // Update ready status for tasks with no dependencies
    for (const task of plan.tasks) {
      if (task.dependencies.length === 0) {
        task.status = TASK_STATUS.READY;
      }
    }
  }
  
  /**
   * Execute a plan
   * @param {string} planId - Plan identifier
   * @param {Function} executor - Task executor function (task) => Promise<result>
   * @returns {Promise<Plan>}
   */
  async executePlan(planId, executor) {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    if (plan.status === PLAN_STATUS.EXECUTING) {
      throw new Error('Plan is already executing');
    }
    
    plan.status = PLAN_STATUS.EXECUTING;
    plan.startedAt = Date.now();
    this.activePlan = plan;
    
    this.emit('plan:executing', { planId });
    
    try {
      if (this.parallelExecution) {
        await this.executeParallel(plan, executor);
      } else {
        await this.executeSequential(plan, executor);
      }
      
      // Determine final status
      const hasFailures = plan.tasks.some(t => t.status === TASK_STATUS.FAILED);
      plan.status = hasFailures ? PLAN_STATUS.FAILED : PLAN_STATUS.COMPLETED;
      
    } catch (error) {
      plan.status = PLAN_STATUS.FAILED;
      this.emit('plan:error', { planId, error: error.message });
    }
    
    plan.completedAt = Date.now();
    plan.metrics.actualTime = plan.completedAt - plan.startedAt;
    this.activePlan = null;
    
    this.emit('plan:completed', { plan });
    
    return plan;
  }
  
  /**
   * Execute tasks sequentially
   * @private
   */
  async executeSequential(plan, executor) {
    for (const task of plan.tasks) {
      if (task.status === TASK_STATUS.SKIPPED) continue;
      
      // Check dependencies
      const blocked = task.dependencies.some(depId => {
        const dep = plan.tasks.find(t => t.id === depId);
        return dep && dep.status === TASK_STATUS.FAILED;
      });
      
      if (blocked) {
        task.status = TASK_STATUS.SKIPPED;
        plan.metrics.skippedTasks++;
        continue;
      }
      
      await this.executeTask(task, executor, plan);
    }
  }
  
  /**
   * Execute tasks in parallel where possible
   * @private
   */
  async executeParallel(plan, executor) {
    const completed = new Set();
    
    for (;;) {
      // Find tasks that are ready to execute
      const ready = plan.tasks.filter(task => {
        if (task.status !== TASK_STATUS.READY && task.status !== TASK_STATUS.PENDING) {
          return false;
        }
        // Check all dependencies are completed
        return task.dependencies.every(depId => completed.has(depId));
      });
      
      if (ready.length === 0) {
        // No more tasks ready - check if we're done
        const remaining = plan.tasks.filter(t => 
          t.status === TASK_STATUS.PENDING || 
          t.status === TASK_STATUS.READY ||
          t.status === TASK_STATUS.IN_PROGRESS
        );
        if (remaining.length === 0) break;
        
        // Check for blocked tasks (dependencies failed)
        for (const task of remaining) {
          const hasFailed = task.dependencies.some(depId => {
            const dep = plan.tasks.find(t => t.id === depId);
            return dep && dep.status === TASK_STATUS.FAILED;
          });
          if (hasFailed) {
            task.status = TASK_STATUS.SKIPPED;
            plan.metrics.skippedTasks++;
          }
        }
        break;
      }
      
      // Execute batch of ready tasks
      const batch = ready.slice(0, this.maxParallel);
      await Promise.all(batch.map(async (task) => {
        await this.executeTask(task, executor, plan);
        completed.add(task.id);
      }));
      
      // Mark newly ready tasks
      for (const task of plan.tasks) {
        if (task.status === TASK_STATUS.PENDING) {
          const allDepsComplete = task.dependencies.every(depId => completed.has(depId));
          if (allDepsComplete) {
            task.status = TASK_STATUS.READY;
          }
        }
      }
    }
  }
  
  /**
   * Execute a single task
   * @private
   */
  async executeTask(task, executor, plan) {
    task.status = TASK_STATUS.IN_PROGRESS;
    const startTime = Date.now();
    
    this.emit('task:start', { taskId: task.id, planId: plan.id, task });
    
    try {
      const result = await executor(task);
      task.result = result;
      task.status = TASK_STATUS.COMPLETED;
      plan.metrics.completedTasks++;
      
      this.emit('task:complete', { taskId: task.id, planId: plan.id, result });
      
      // Check for replanning
      if (this.adaptivePlanning) {
        await this.checkReplan(plan, task);
      }
      
    } catch (error) {
      task.result = { error: error.message };
      task.status = TASK_STATUS.FAILED;
      plan.metrics.failedTasks++;
      
      this.emit('task:error', { taskId: task.id, planId: plan.id, error: error.message });
    }
    
    task.actualTime = Date.now() - startTime;
  }
  
  /**
   * Check if replanning is needed
   * @private
   */
  async checkReplan(plan, completedTask) {
    // Calculate deviation from estimates
    if (!completedTask.actualTime || !completedTask.estimatedTime) return;
    
    const deviation = Math.abs(completedTask.actualTime - completedTask.estimatedTime) / completedTask.estimatedTime;
    
    if (deviation > this.replanThreshold) {
      this.emit('plan:replan-trigger', { 
        planId: plan.id, 
        taskId: completedTask.id, 
        deviation 
      });
      
      // Adjust estimates for remaining tasks
      const remaining = plan.tasks.filter(t => 
        t.status === TASK_STATUS.PENDING || t.status === TASK_STATUS.READY
      );
      
      for (const task of remaining) {
        if (task.metadata.component === completedTask.metadata.component) {
          // Adjust based on actual vs estimated ratio
          const ratio = completedTask.actualTime / completedTask.estimatedTime;
          task.estimatedTime = Math.round(task.estimatedTime * ratio);
        }
      }
    }
  }
  
  /**
   * Pause plan execution
   * @param {string} planId - Plan identifier
   */
  pausePlan(planId) {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    
    if (plan.status === PLAN_STATUS.EXECUTING) {
      plan.status = PLAN_STATUS.PAUSED;
      this.emit('plan:paused', { planId });
    }
  }
  
  /**
   * Resume plan execution
   * @param {string} planId - Plan identifier
   * @param {Function} executor - Task executor function
   * @returns {Promise<Plan>}
   */
  async resumePlan(planId, executor) {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    
    if (plan.status !== PLAN_STATUS.PAUSED) {
      throw new Error('Plan is not paused');
    }
    
    this.emit('plan:resuming', { planId });
    return this.executePlan(planId, executor);
  }
  
  /**
   * Cancel plan execution
   * @param {string} planId - Plan identifier
   */
  cancelPlan(planId) {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    
    plan.status = PLAN_STATUS.CANCELLED;
    plan.completedAt = Date.now();
    
    // Mark pending tasks as skipped
    for (const task of plan.tasks) {
      if (task.status === TASK_STATUS.PENDING || task.status === TASK_STATUS.READY) {
        task.status = TASK_STATUS.SKIPPED;
        plan.metrics.skippedTasks++;
      }
    }
    
    this.emit('plan:cancelled', { planId });
  }
  
  /**
   * Add task to existing plan
   * @param {string} planId - Plan identifier
   * @param {Object} taskDef - Task definition
   * @returns {Task}
   */
  addTask(planId, taskDef) {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    
    const task = {
      id: this.generateId('task'),
      name: taskDef.name,
      description: taskDef.description || '',
      status: TASK_STATUS.PENDING,
      priority: taskDef.priority ?? PRIORITY.MEDIUM,
      dependencies: taskDef.dependencies || [],
      outputs: taskDef.outputs || [],
      estimatedTime: taskDef.estimatedTime || 5000,
      actualTime: null,
      result: null,
      metadata: taskDef.metadata || {}
    };
    
    // Insert at appropriate position based on dependencies
    if (taskDef.after) {
      const afterIndex = plan.tasks.findIndex(t => t.id === taskDef.after);
      if (afterIndex >= 0) {
        task.dependencies.push(taskDef.after);
        plan.tasks.splice(afterIndex + 1, 0, task);
      } else {
        plan.tasks.push(task);
      }
    } else {
      plan.tasks.push(task);
    }
    
    plan.metrics.totalTasks++;
    plan.metrics.totalEstimatedTime += task.estimatedTime;
    
    this.emit('task:added', { planId, task });
    
    return task;
  }
  
  /**
   * Remove task from plan
   * @param {string} planId - Plan identifier
   * @param {string} taskId - Task identifier
   */
  removeTask(planId, taskId) {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    
    const index = plan.tasks.findIndex(t => t.id === taskId);
    if (index < 0) throw new Error(`Task ${taskId} not found`);
    
    const task = plan.tasks[index];
    
    // Remove from other tasks' dependencies
    for (const t of plan.tasks) {
      t.dependencies = t.dependencies.filter(d => d !== taskId);
    }
    
    plan.tasks.splice(index, 1);
    plan.metrics.totalTasks--;
    plan.metrics.totalEstimatedTime -= task.estimatedTime;
    
    this.emit('task:removed', { planId, taskId });
  }
  
  /**
   * Get plan by ID
   * @param {string} planId - Plan identifier
   * @returns {Plan|null}
   */
  getPlan(planId) {
    return this.plans.get(planId) || null;
  }
  
  /**
   * Get all plans
   * @returns {Plan[]}
   */
  getAllPlans() {
    return Array.from(this.plans.values());
  }
  
  /**
   * Get plan progress
   * @param {string} planId - Plan identifier
   * @returns {Object}
   */
  getProgress(planId) {
    const plan = this.plans.get(planId);
    if (!plan) return null;
    
    const total = plan.metrics.totalTasks;
    const completed = plan.metrics.completedTasks;
    const failed = plan.metrics.failedTasks;
    const skipped = plan.metrics.skippedTasks;
    const inProgress = plan.tasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length;
    const pending = total - completed - failed - skipped - inProgress;
    
    return {
      total,
      completed,
      failed,
      skipped,
      inProgress,
      pending,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      estimatedRemaining: plan.tasks
        .filter(t => t.status === TASK_STATUS.PENDING || t.status === TASK_STATUS.READY)
        .reduce((sum, t) => sum + t.estimatedTime, 0)
    };
  }
  
  /**
   * Get dependency graph
   * @param {string} planId - Plan identifier
   * @returns {Object}
   */
  getDependencyGraph(planId) {
    const plan = this.plans.get(planId);
    if (!plan) return null;
    
    const nodes = plan.tasks.map(t => ({
      id: t.id,
      name: t.name,
      status: t.status,
      priority: t.priority
    }));
    
    const edges = [];
    for (const task of plan.tasks) {
      for (const dep of task.dependencies) {
        edges.push({ from: dep, to: task.id });
      }
    }
    
    return { nodes, edges };
  }
  
  /**
   * Generate unique ID
   * @private
   */
  generateId(prefix) {
    return `${prefix}-${++this.taskCounter}-${Date.now().toString(36)}`;
  }
  
  /**
   * Clear all plans
   */
  clearPlans() {
    this.plans.clear();
    this.activePlan = null;
    this.taskCounter = 0;
  }
  
  /**
   * Export plan to readable format
   * @param {string} planId - Plan identifier
   * @returns {string}
   */
  exportPlan(planId) {
    const plan = this.plans.get(planId);
    if (!plan) return '';
    
    let output = `# Plan: ${plan.goal}\n\n`;
    output += `**ID:** ${plan.id}\n`;
    output += `**Status:** ${plan.status}\n`;
    output += `**Created:** ${new Date(plan.createdAt).toISOString()}\n\n`;
    
    output += `## Tasks (${plan.metrics.totalTasks})\n\n`;
    
    for (let i = 0; i < plan.tasks.length; i++) {
      const task = plan.tasks[i];
      const statusIcon = this.getStatusIcon(task.status);
      output += `${i + 1}. ${statusIcon} **${task.name}** [${task.status}]\n`;
      output += `   - ${task.description}\n`;
      if (task.dependencies.length > 0) {
        output += `   - Depends on: ${task.dependencies.join(', ')}\n`;
      }
      output += `\n`;
    }
    
    output += `## Metrics\n\n`;
    output += `- Completed: ${plan.metrics.completedTasks}\n`;
    output += `- Failed: ${plan.metrics.failedTasks}\n`;
    output += `- Skipped: ${plan.metrics.skippedTasks}\n`;
    if (plan.metrics.actualTime) {
      output += `- Total Time: ${plan.metrics.actualTime}ms\n`;
    }
    
    return output;
  }
  
  /**
   * Get status icon
   * @private
   */
  getStatusIcon(status) {
    const icons = {
      [TASK_STATUS.PENDING]: '⏳',
      [TASK_STATUS.READY]: '📋',
      [TASK_STATUS.IN_PROGRESS]: '🔄',
      [TASK_STATUS.BLOCKED]: '🚫',
      [TASK_STATUS.COMPLETED]: '✅',
      [TASK_STATUS.FAILED]: '❌',
      [TASK_STATUS.SKIPPED]: '⏭️'
    };
    return icons[status] || '•';
  }
}

/**
 * Create planning engine
 * @param {PlanningOptions} [options={}] - Engine options
 * @returns {PlanningEngine}
 */
function createPlanningEngine(options = {}) {
  return new PlanningEngine(options);
}

/**
 * Create plan from goal
 * @param {string} goal - Goal description
 * @param {Object} [options={}] - Planning options
 * @returns {Promise<Plan>}
 */
async function createPlan(goal, options = {}) {
  const engine = createPlanningEngine(options);
  return engine.createPlan(goal, options.context || {});
}

module.exports = {
  PlanningEngine,
  createPlanningEngine,
  createPlan,
  PLAN_STATUS,
  TASK_STATUS,
  PRIORITY
};
