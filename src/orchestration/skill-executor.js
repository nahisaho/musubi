/**
 * Skill Executor - Execute skills with priority, retry, and guardrails
 * Sprint 3.2: Skill System Architecture
 * 
 * Features:
 * - P-label priority execution (P0-P3)
 * - Parallel and sequential execution
 * - Input/output validation
 * - Retry with exponential backoff
 * - Execution hooks
 * - Guardrail integration
 */

const EventEmitter = require('events');

/**
 * Execution status
 */
const ExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
  SKIPPED: 'skipped'
};

/**
 * Execution result
 */
class ExecutionResult {
  constructor(options = {}) {
    this.skillId = options.skillId || '';
    this.status = options.status || ExecutionStatus.PENDING;
    this.output = options.output || null;
    this.error = options.error || null;
    this.startTime = options.startTime || null;
    this.endTime = options.endTime || null;
    this.duration = options.duration || 0;
    this.attempts = options.attempts || 0;
    this.metadata = options.metadata || {};
  }

  get success() {
    return this.status === ExecutionStatus.COMPLETED;
  }

  toJSON() {
    return {
      skillId: this.skillId,
      status: this.status,
      success: this.success,
      output: this.output,
      error: this.error,
      duration: this.duration,
      attempts: this.attempts,
      metadata: this.metadata
    };
  }
}

/**
 * Execution context
 */
class ExecutionContext {
  constructor(options = {}) {
    this.executionId = options.executionId || this._generateId();
    this.skillId = options.skillId || '';
    this.input = options.input || {};
    this.variables = new Map(Object.entries(options.variables || {}));
    this.parentContext = options.parentContext || null;
    this.startTime = null;
    this.metadata = options.metadata || {};
  }

  _generateId() {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getVariable(name) {
    if (this.variables.has(name)) {
      return this.variables.get(name);
    }
    if (this.parentContext) {
      return this.parentContext.getVariable(name);
    }
    return null;
  }

  setVariable(name, value) {
    this.variables.set(name, value);
  }

  createChild(options = {}) {
    return new ExecutionContext({
      ...options,
      parentContext: this,
      variables: options.variables || {}
    });
  }
}

/**
 * Input/Output validator
 */
class IOValidator {
  constructor() {
    this.typeValidators = {
      string: (v) => typeof v === 'string',
      number: (v) => typeof v === 'number' && !isNaN(v),
      boolean: (v) => typeof v === 'boolean',
      array: (v) => Array.isArray(v),
      object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
      any: () => true
    };
  }

  validateInput(input, schema) {
    const errors = [];
    
    for (const field of schema) {
      const value = input[field.name];
      
      // Required check
      if (field.required && (value === undefined || value === null)) {
        errors.push(`Missing required input: ${field.name}`);
        continue;
      }
      
      // Type check
      if (value !== undefined && value !== null && field.type) {
        const validator = this.typeValidators[field.type];
        if (validator && !validator(value)) {
          errors.push(`Invalid type for ${field.name}: expected ${field.type}`);
        }
      }
      
      // Custom validation
      if (field.validate && value !== undefined) {
        try {
          const result = field.validate(value);
          if (result !== true && typeof result === 'string') {
            errors.push(result);
          }
        } catch (e) {
          errors.push(`Validation error for ${field.name}: ${e.message}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateOutput(output, schema) {
    const errors = [];
    
    for (const field of schema) {
      const value = output?.[field.name];
      
      if (field.required && (value === undefined || value === null)) {
        errors.push(`Missing required output: ${field.name}`);
      }
      
      if (value !== undefined && value !== null && field.type) {
        const validator = this.typeValidators[field.type];
        if (validator && !validator(value)) {
          errors.push(`Invalid output type for ${field.name}: expected ${field.type}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Main Skill Executor class
 */
class SkillExecutor extends EventEmitter {
  constructor(registry, options = {}) {
    super();
    this.registry = registry;
    this.validator = new IOValidator();
    this.guardrails = options.guardrails || [];
    this.activeExecutions = new Map();
    this.executionHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    
    // Hooks
    this.hooks = {
      beforeExecute: options.beforeExecute || [],
      afterExecute: options.afterExecute || [],
      onError: options.onError || []
    };
    
    // Options
    this.options = {
      defaultTimeout: options.defaultTimeout || 30000,
      maxConcurrent: options.maxConcurrent || 10,
      enableMetrics: options.enableMetrics !== false
    };
    
    this._concurrentCount = 0;
  }

  /**
   * Execute a single skill
   */
  async execute(skillId, input = {}, options = {}) {
    const skillEntry = this.registry.getSkillEntry(skillId);
    if (!skillEntry) {
      throw new Error(`Skill '${skillId}' not found`);
    }
    
    const { metadata, handler } = skillEntry;
    
    if (!handler) {
      throw new Error(`Skill '${skillId}' has no handler`);
    }
    
    // Create execution context
    const context = new ExecutionContext({
      skillId,
      input,
      variables: options.variables,
      metadata: options.metadata
    });
    
    // Create result
    const result = new ExecutionResult({
      skillId,
      status: ExecutionStatus.PENDING
    });
    
    // Track execution
    this.activeExecutions.set(context.executionId, { context, result, cancelled: false });
    
    try {
      // Check concurrency limit
      if (this._concurrentCount >= this.options.maxConcurrent) {
        await this._waitForSlot();
      }
      this._concurrentCount++;
      
      // Validate input
      const inputValidation = this.validator.validateInput(input, metadata.inputs);
      if (!inputValidation.valid) {
        throw new Error(`Input validation failed: ${inputValidation.errors.join(', ')}`);
      }
      
      // Run guardrails (pre-execution)
      await this._runGuardrails('pre', { skillId, input, context });
      
      // Run beforeExecute hooks
      for (const hook of this.hooks.beforeExecute) {
        await hook(context, metadata);
      }
      
      // Start execution
      result.status = ExecutionStatus.RUNNING;
      result.startTime = Date.now();
      context.startTime = result.startTime;
      
      this.emit('execution-started', { executionId: context.executionId, skillId });
      
      // Execute with retry
      const output = await this._executeWithRetry(
        handler,
        context,
        metadata.retryPolicy,
        options.timeout || metadata.timeout || this.options.defaultTimeout,
        result
      );
      
      // Validate output
      const outputValidation = this.validator.validateOutput(output, metadata.outputs);
      if (!outputValidation.valid) {
        throw new Error(`Output validation failed: ${outputValidation.errors.join(', ')}`);
      }
      
      // Run guardrails (post-execution)
      await this._runGuardrails('post', { skillId, input, output, context });
      
      // Complete
      result.status = ExecutionStatus.COMPLETED;
      result.output = output;
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      
      // Run afterExecute hooks
      for (const hook of this.hooks.afterExecute) {
        await hook(context, result);
      }
      
      // Record stats
      if (this.options.enableMetrics) {
        this.registry.recordExecution(skillId, true, result.duration);
      }
      
      this.emit('execution-completed', { 
        executionId: context.executionId, 
        skillId, 
        duration: result.duration 
      });
      
    } catch (error) {
      result.status = this.activeExecutions.get(context.executionId)?.cancelled 
        ? ExecutionStatus.CANCELLED 
        : ExecutionStatus.FAILED;
      result.error = error.message;
      result.endTime = Date.now();
      result.duration = result.startTime ? result.endTime - result.startTime : 0;
      
      // Run onError hooks
      for (const hook of this.hooks.onError) {
        await hook(error, context, result);
      }
      
      // Record stats
      if (this.options.enableMetrics) {
        this.registry.recordExecution(skillId, false, result.duration);
      }
      
      this.emit('execution-failed', { 
        executionId: context.executionId, 
        skillId, 
        error: error.message 
      });
      
    } finally {
      this._concurrentCount--;
      this.activeExecutions.delete(context.executionId);
      this._addToHistory(result);
    }
    
    return result;
  }

  /**
   * Execute multiple skills in parallel
   */
  async executeParallel(tasks, options = {}) {
    // Sort by priority
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });
    
    // Group by priority
    const priorityGroups = new Map();
    for (const task of sortedTasks) {
      const priority = task.priority || 'P2';
      if (!priorityGroups.has(priority)) {
        priorityGroups.set(priority, []);
      }
      priorityGroups.get(priority).push(task);
    }
    
    const results = new Map();
    
    // Execute P0 first (blocking)
    if (priorityGroups.has('P0')) {
      for (const task of priorityGroups.get('P0')) {
        const result = await this.execute(task.skillId, task.input, task.options);
        results.set(task.skillId, result);
        
        // P0 failure stops everything
        if (!result.success && options.failFast !== false) {
          return { results: Object.fromEntries(results), partial: true };
        }
      }
    }
    
    // Execute P1-P3 in parallel within each priority level
    for (const priority of ['P1', 'P2', 'P3']) {
      if (priorityGroups.has(priority)) {
        const groupTasks = priorityGroups.get(priority);
        const groupResults = await Promise.allSettled(
          groupTasks.map(task => 
            this.execute(task.skillId, task.input, task.options)
          )
        );
        
        groupTasks.forEach((task, index) => {
          const settled = groupResults[index];
          if (settled.status === 'fulfilled') {
            results.set(task.skillId, settled.value);
          } else {
            results.set(task.skillId, new ExecutionResult({
              skillId: task.skillId,
              status: ExecutionStatus.FAILED,
              error: settled.reason?.message || 'Unknown error'
            }));
          }
        });
      }
    }
    
    return {
      results: Object.fromEntries(results),
      partial: false,
      summary: this._summarizeResults(results)
    };
  }

  /**
   * Execute skills sequentially
   */
  async executeSequential(tasks, options = {}) {
    const results = [];
    
    for (const task of tasks) {
      const result = await this.execute(task.skillId, task.input, task.options);
      results.push(result);
      
      if (!result.success && options.stopOnError !== false) {
        break;
      }
    }
    
    return {
      results,
      completed: results.length === tasks.length,
      summary: this._summarizeResults(new Map(results.map(r => [r.skillId, r])))
    };
  }

  /**
   * Execute with dependency resolution
   */
  async executeWithDependencies(skillId, input = {}, options = {}) {
    const order = this.registry.resolveDependencies(skillId);
    const results = new Map();
    
    for (const depSkillId of order) {
      // Use output from dependencies as input
      const depInput = depSkillId === skillId 
        ? input 
        : this._mergeInputFromResults(results, depSkillId);
      
      const result = await this.execute(depSkillId, depInput, options);
      results.set(depSkillId, result);
      
      if (!result.success) {
        return {
          results: Object.fromEntries(results),
          failed: true,
          failedAt: depSkillId
        };
      }
    }
    
    return {
      results: Object.fromEntries(results),
      failed: false,
      finalResult: results.get(skillId)
    };
  }

  /**
   * Cancel an execution
   */
  cancel(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.cancelled = true;
      this.emit('execution-cancelled', { executionId });
      return true;
    }
    return false;
  }

  /**
   * Cancel all active executions
   */
  cancelAll() {
    for (const [executionId] of this.activeExecutions) {
      this.cancel(executionId);
    }
  }

  /**
   * Get active execution count
   */
  getActiveCount() {
    return this.activeExecutions.size;
  }

  /**
   * Get execution history
   */
  getHistory(limit = 100) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Add guardrail
   */
  addGuardrail(guardrail) {
    this.guardrails.push(guardrail);
  }

  /**
   * Add hook
   */
  addHook(event, handler) {
    if (this.hooks[event]) {
      this.hooks[event].push(handler);
    }
  }

  // Private methods

  async _executeWithRetry(handler, context, retryPolicy, timeout, result) {
    const maxRetries = retryPolicy?.maxRetries || 0;
    const backoffMs = retryPolicy?.backoffMs || 1000;
    const backoffMultiplier = retryPolicy?.backoffMultiplier || 2;
    
    let lastError;
    let currentBackoff = backoffMs;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      result.attempts = attempt + 1;
      
      // Check if cancelled
      const execution = this.activeExecutions.get(context.executionId);
      if (execution?.cancelled) {
        throw new Error('Execution cancelled');
      }
      
      try {
        // Execute with timeout
        const output = await this._executeWithTimeout(handler, context, timeout);
        return output;
      } catch (error) {
        lastError = error;
        
        // Check if retryable
        if (!this._isRetryable(error)) {
          throw error;
        }
        
        if (attempt < maxRetries) {
          this.emit('execution-retry', { 
            executionId: context.executionId, 
            skillId: context.skillId,
            attempt: attempt + 1,
            maxRetries,
            nextRetryMs: currentBackoff
          });
          
          await this._sleep(currentBackoff);
          currentBackoff *= backoffMultiplier;
        }
      }
    }
    
    throw lastError;
  }

  async _executeWithTimeout(handler, context, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeout}ms`));
      }, timeout);
      
      Promise.resolve(handler(context.input, context))
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  async _runGuardrails(phase, data) {
    for (const guardrail of this.guardrails) {
      if (guardrail.phase === phase || guardrail.phase === 'both') {
        const result = await guardrail.check(data);
        if (!result.passed) {
          throw new Error(`Guardrail '${guardrail.name}' failed: ${result.reason}`);
        }
      }
    }
  }

  _isRetryable(error) {
    const nonRetryable = [
      'Execution cancelled',
      'Input validation failed',
      'Output validation failed',
      'Guardrail'
    ];
    return !nonRetryable.some(msg => error.message.includes(msg));
  }

  async _waitForSlot() {
    while (this._concurrentCount >= this.options.maxConcurrent) {
      await this._sleep(100);
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _addToHistory(result) {
    this.executionHistory.push(result);
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift();
    }
  }

  _summarizeResults(resultsMap) {
    let success = 0;
    let failed = 0;
    let totalDuration = 0;
    
    for (const result of resultsMap.values()) {
      if (result.success) {
        success++;
      } else {
        failed++;
      }
      totalDuration += result.duration || 0;
    }
    
    return {
      total: resultsMap.size,
      success,
      failed,
      totalDuration,
      averageDuration: resultsMap.size > 0 ? totalDuration / resultsMap.size : 0
    };
  }

  _mergeInputFromResults(results, skillId) {
    // Simple merge - could be extended with explicit mappings
    const merged = {};
    for (const result of results.values()) {
      if (result.output && typeof result.output === 'object') {
        Object.assign(merged, result.output);
      }
    }
    return merged;
  }
}

module.exports = {
  SkillExecutor,
  ExecutionResult,
  ExecutionContext,
  ExecutionStatus,
  IOValidator
};
