/**
 * WorkflowExecutor - End-to-end workflow execution engine
 * Sprint 3.5: Advanced Workflows
 * 
 * Provides comprehensive workflow execution with:
 * - Step-by-step execution with state management
 * - Parallel and sequential step execution
 * - Conditional branching and loops
 * - Error handling and recovery
 * - Progress tracking and reporting
 */

const EventEmitter = require('events');

/**
 * Workflow step types
 */
const StepType = {
  SKILL: 'skill',
  TOOL: 'tool',
  CONDITION: 'condition',
  PARALLEL: 'parallel',
  LOOP: 'loop',
  CHECKPOINT: 'checkpoint',
  HUMAN_REVIEW: 'human-review'
};

/**
 * Execution states
 */
const ExecutionState = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  WAITING_REVIEW: 'waiting-review'
};

/**
 * Error recovery strategies
 */
const RecoveryStrategy = {
  RETRY: 'retry',
  SKIP: 'skip',
  FALLBACK: 'fallback',
  ROLLBACK: 'rollback',
  ABORT: 'abort',
  MANUAL: 'manual'
};

/**
 * Step execution result
 */
class StepResult {
  constructor(stepId, success, output = null, error = null, duration = 0) {
    this.stepId = stepId;
    this.success = success;
    this.output = output;
    this.error = error;
    this.duration = duration;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Workflow execution context
 */
class ExecutionContext {
  constructor(workflowId) {
    this.workflowId = workflowId;
    this.executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.state = ExecutionState.PENDING;
    this.variables = new Map();
    this.stepResults = new Map();
    this.currentStep = null;
    this.startTime = null;
    this.endTime = null;
    this.checkpoints = [];
    this.errors = [];
  }

  setVariable(name, value) {
    this.variables.set(name, value);
  }

  getVariable(name, defaultValue = null) {
    return this.variables.has(name) ? this.variables.get(name) : defaultValue;
  }

  addStepResult(stepId, result) {
    this.stepResults.set(stepId, result);
  }

  createCheckpoint(name) {
    this.checkpoints.push({
      name,
      timestamp: new Date().toISOString(),
      variables: new Map(this.variables),
      currentStep: this.currentStep
    });
  }

  restoreCheckpoint(name) {
    const checkpoint = this.checkpoints.find(cp => cp.name === name);
    if (checkpoint) {
      this.variables = new Map(checkpoint.variables);
      this.currentStep = checkpoint.currentStep;
      return true;
    }
    return false;
  }

  getDuration() {
    if (!this.startTime) return 0;
    const end = this.endTime || Date.now();
    return end - this.startTime;
  }
}

/**
 * Workflow definition
 */
class WorkflowDefinition {
  constructor(id, name, steps = [], options = {}) {
    this.id = id;
    this.name = name;
    this.description = options.description || '';
    this.version = options.version || '1.0.0';
    this.steps = steps;
    this.inputs = options.inputs || [];
    this.outputs = options.outputs || [];
    this.errorHandling = options.errorHandling || { strategy: RecoveryStrategy.ABORT };
    this.timeout = options.timeout || 0; // 0 = no timeout
    this.retryPolicy = options.retryPolicy || { maxRetries: 3, backoffMs: 1000 };
  }

  validate() {
    const errors = [];
    
    if (!this.id) {
      errors.push('Workflow ID is required');
    }
    
    if (!this.name) {
      errors.push('Workflow name is required');
    }
    
    if (!this.steps || this.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }

    // Validate each step
    const stepIds = new Set();
    for (const step of this.steps) {
      if (!step.id) {
        errors.push('Each step must have an ID');
      } else if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      } else {
        stepIds.add(step.id);
      }

      if (!step.type) {
        errors.push(`Step ${step.id} must have a type`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Main workflow executor
 */
class WorkflowExecutor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.skillRegistry = options.skillRegistry || null;
    this.toolDiscovery = options.toolDiscovery || null;
    this.mcpConnector = options.mcpConnector || null;
    this.executions = new Map();
    this.stepHandlers = new Map();
    
    // Register default step handlers
    this._registerDefaultHandlers();
  }

  /**
   * Register default step type handlers
   */
  _registerDefaultHandlers() {
    // Skill execution handler
    this.stepHandlers.set(StepType.SKILL, async (step, context) => {
      const { skillId, input } = step;
      
      if (!this.skillRegistry) {
        throw new Error('Skill registry not configured');
      }

      const skill = this.skillRegistry.getSkill(skillId);
      if (!skill) {
        throw new Error(`Skill not found: ${skillId}`);
      }

      // Resolve input variables
      const resolvedInput = this._resolveVariables(input, context);
      
      // Execute skill
      const result = await skill.execute(resolvedInput, context);
      
      // Store output in context
      if (step.outputVariable) {
        context.setVariable(step.outputVariable, result);
      }

      return result;
    });

    // Tool execution handler
    this.stepHandlers.set(StepType.TOOL, async (step, context) => {
      const { toolName, serverName, arguments: args } = step;
      
      if (!this.mcpConnector) {
        throw new Error('MCP connector not configured');
      }

      // Resolve arguments
      const resolvedArgs = this._resolveVariables(args, context);
      
      // Call tool
      const result = await this.mcpConnector.callTool(toolName, resolvedArgs, serverName);
      
      if (step.outputVariable) {
        context.setVariable(step.outputVariable, result);
      }

      return result;
    });

    // Condition handler
    this.stepHandlers.set(StepType.CONDITION, async (step, context) => {
      const { condition, thenSteps, elseSteps } = step;
      
      // Evaluate condition
      const conditionResult = this._evaluateCondition(condition, context);
      
      // Execute appropriate branch
      const stepsToExecute = conditionResult ? thenSteps : elseSteps;
      
      if (stepsToExecute && stepsToExecute.length > 0) {
        for (const subStep of stepsToExecute) {
          await this._executeStep(subStep, context);
        }
      }

      return conditionResult;
    });

    // Parallel execution handler
    this.stepHandlers.set(StepType.PARALLEL, async (step, context) => {
      const { steps, maxConcurrency = 5 } = step;
      
      const results = [];
      const executing = new Set();
      
      for (const subStep of steps) {
        if (executing.size >= maxConcurrency) {
          const completed = await Promise.race([...executing]);
          executing.delete(completed.promise);
          results.push(completed.result);
        }
        
        const promise = this._executeStep(subStep, context)
          .then(result => ({ promise, result }));
        executing.add(promise);
      }
      
      // Wait for remaining
      const remaining = await Promise.all([...executing]);
      results.push(...remaining.map(r => r.result));

      if (step.outputVariable) {
        context.setVariable(step.outputVariable, results);
      }

      return results;
    });

    // Loop handler
    this.stepHandlers.set(StepType.LOOP, async (step, context) => {
      const { items, itemVariable, indexVariable, steps: loopSteps, maxIterations = 1000 } = step;
      
      // Resolve items
      const resolvedItems = this._resolveVariables(items, context);
      
      if (!Array.isArray(resolvedItems)) {
        throw new Error('Loop items must be an array');
      }

      const results = [];
      let iteration = 0;
      
      for (const item of resolvedItems) {
        if (iteration >= maxIterations) {
          this.emit('warning', { message: `Loop reached max iterations: ${maxIterations}` });
          break;
        }
        
        context.setVariable(itemVariable || 'item', item);
        context.setVariable(indexVariable || 'index', iteration);
        
        for (const subStep of loopSteps) {
          const result = await this._executeStep(subStep, context);
          results.push(result);
        }
        
        iteration++;
      }

      if (step.outputVariable) {
        context.setVariable(step.outputVariable, results);
      }

      return results;
    });

    // Checkpoint handler
    this.stepHandlers.set(StepType.CHECKPOINT, async (step, context) => {
      const { name } = step;
      context.createCheckpoint(name);
      this.emit('checkpoint', { name, context });
      return { checkpointCreated: name };
    });

    // Human review handler
    this.stepHandlers.set(StepType.HUMAN_REVIEW, async (step, context) => {
      const { message, options = ['approve', 'reject'] } = step;
      
      context.state = ExecutionState.WAITING_REVIEW;
      this.emit('review-required', { 
        stepId: step.id,
        message: this._resolveVariables(message, context),
        options,
        context
      });
      
      // Wait for review (in real implementation, this would wait for external input)
      return { reviewRequested: true, message };
    });
  }

  /**
   * Register a custom step handler
   */
  registerStepHandler(type, handler) {
    this.stepHandlers.set(type, handler);
  }

  /**
   * Execute a workflow
   */
  async execute(workflow, initialVariables = {}) {
    // Validate workflow
    const validation = workflow.validate();
    if (!validation.valid) {
      throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
    }

    // Create execution context
    const context = new ExecutionContext(workflow.id);
    context.state = ExecutionState.RUNNING;
    context.startTime = Date.now();
    
    // Set initial variables
    for (const [key, value] of Object.entries(initialVariables)) {
      context.setVariable(key, value);
    }

    // Store execution
    this.executions.set(context.executionId, context);
    
    this.emit('execution-started', { 
      executionId: context.executionId, 
      workflowId: workflow.id 
    });

    try {
      // Execute steps
      for (const step of workflow.steps) {
        if (context.state === ExecutionState.CANCELLED) {
          break;
        }
        
        if (context.state === ExecutionState.PAUSED) {
          await this._waitForResume(context);
        }

        await this._executeStep(step, context, workflow);
      }

      context.state = ExecutionState.COMPLETED;
      context.endTime = Date.now();
      
      this.emit('execution-completed', {
        executionId: context.executionId,
        duration: context.getDuration(),
        results: Object.fromEntries(context.stepResults)
      });

    } catch (error) {
      context.state = ExecutionState.FAILED;
      context.endTime = Date.now();
      context.errors.push(error);
      
      this.emit('execution-failed', {
        executionId: context.executionId,
        error: error.message,
        step: context.currentStep
      });

      // Apply error handling strategy
      await this._handleExecutionError(error, context, workflow);
      
      throw error;
    }

    return {
      executionId: context.executionId,
      state: context.state,
      duration: context.getDuration(),
      outputs: this._collectOutputs(context, workflow.outputs),
      stepResults: Object.fromEntries(context.stepResults)
    };
  }

  /**
   * Execute a single step
   */
  async _executeStep(step, context, workflow = null) {
    context.currentStep = step.id;
    const startTime = Date.now();
    
    this.emit('step-started', { stepId: step.id, type: step.type });

    try {
      // Check condition if present
      if (step.when) {
        const shouldExecute = this._evaluateCondition(step.when, context);
        if (!shouldExecute) {
          this.emit('step-skipped', { stepId: step.id, reason: 'Condition not met' });
          return { skipped: true };
        }
      }

      // Get handler for step type
      const handler = this.stepHandlers.get(step.type);
      if (!handler) {
        throw new Error(`Unknown step type: ${step.type}`);
      }

      // Execute with retry logic
      const result = await this._executeWithRetry(
        () => handler(step, context),
        step.retry || (workflow?.retryPolicy),
        step.id
      );

      const duration = Date.now() - startTime;
      const stepResult = new StepResult(step.id, true, result, null, duration);
      context.addStepResult(step.id, stepResult);
      
      this.emit('step-completed', { stepId: step.id, duration, result });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const stepResult = new StepResult(step.id, false, null, error.message, duration);
      context.addStepResult(step.id, stepResult);
      
      this.emit('step-failed', { stepId: step.id, error: error.message, duration });

      // Apply step-level error handling
      if (step.onError) {
        return await this._handleStepError(error, step, context);
      }

      throw error;
    }
  }

  /**
   * Execute with retry logic
   */
  async _executeWithRetry(fn, retryPolicy, stepId) {
    const maxRetries = retryPolicy?.maxRetries || 0;
    const backoffMs = retryPolicy?.backoffMs || 1000;
    const backoffMultiplier = retryPolicy?.backoffMultiplier || 2;

    let lastError;
    let currentBackoff = backoffMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          this.emit('step-retry', { 
            stepId, 
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

  /**
   * Handle step-level error
   */
  async _handleStepError(error, step, context) {
    const errorConfig = step.onError;
    const strategy = errorConfig.strategy || RecoveryStrategy.ABORT;

    switch (strategy) {
      case RecoveryStrategy.SKIP:
        this.emit('step-error-skipped', { stepId: step.id, error: error.message });
        return { skipped: true, error: error.message };

      case RecoveryStrategy.FALLBACK:
        if (errorConfig.fallbackSteps) {
          for (const fallbackStep of errorConfig.fallbackSteps) {
            await this._executeStep(fallbackStep, context);
          }
        }
        return { fallback: true };

      case RecoveryStrategy.ROLLBACK:
        if (errorConfig.rollbackTo) {
          const restored = context.restoreCheckpoint(errorConfig.rollbackTo);
          if (restored) {
            this.emit('rollback', { stepId: step.id, checkpoint: errorConfig.rollbackTo });
          }
        }
        throw error;

      case RecoveryStrategy.MANUAL:
        context.state = ExecutionState.PAUSED;
        this.emit('manual-intervention-required', { stepId: step.id, error: error.message });
        return { waitingIntervention: true };

      default:
        throw error;
    }
  }

  /**
   * Handle execution-level error
   */
  async _handleExecutionError(error, context, workflow) {
    const strategy = workflow.errorHandling?.strategy || RecoveryStrategy.ABORT;

    if (strategy === RecoveryStrategy.ROLLBACK && workflow.errorHandling?.rollbackTo) {
      context.restoreCheckpoint(workflow.errorHandling.rollbackTo);
    }

    // Log error for analysis
    this.emit('error-logged', {
      executionId: context.executionId,
      error: error.message,
      step: context.currentStep,
      strategy
    });
  }

  /**
   * Resolve variables in a value
   */
  _resolveVariables(value, context) {
    if (typeof value === 'string') {
      // Replace ${variable} patterns
      return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
        const resolved = context.getVariable(varName);
        return resolved !== null ? String(resolved) : '';
      });
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this._resolveVariables(item, context));
    }
    
    if (typeof value === 'object' && value !== null) {
      // Check if it's a variable reference
      if (value.$var) {
        return context.getVariable(value.$var, value.default);
      }
      
      const resolved = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this._resolveVariables(val, context);
      }
      return resolved;
    }
    
    return value;
  }

  /**
   * Evaluate a condition expression
   */
  _evaluateCondition(condition, context) {
    if (typeof condition === 'boolean') {
      return condition;
    }

    if (typeof condition === 'object') {
      // Handle comparison operators
      if (condition.$eq) {
        const [left, right] = condition.$eq;
        return this._resolveVariables(left, context) === this._resolveVariables(right, context);
      }
      if (condition.$ne) {
        const [left, right] = condition.$ne;
        return this._resolveVariables(left, context) !== this._resolveVariables(right, context);
      }
      if (condition.$gt) {
        const [left, right] = condition.$gt;
        return this._resolveVariables(left, context) > this._resolveVariables(right, context);
      }
      if (condition.$lt) {
        const [left, right] = condition.$lt;
        return this._resolveVariables(left, context) < this._resolveVariables(right, context);
      }
      if (condition.$exists) {
        const varName = condition.$exists;
        return context.getVariable(varName) !== null;
      }
      if (condition.$and) {
        return condition.$and.every(c => this._evaluateCondition(c, context));
      }
      if (condition.$or) {
        return condition.$or.some(c => this._evaluateCondition(c, context));
      }
      if (condition.$not) {
        return !this._evaluateCondition(condition.$not, context);
      }
    }

    // String expression (simple variable truthy check)
    if (typeof condition === 'string') {
      const value = context.getVariable(condition);
      return Boolean(value);
    }

    return false;
  }

  /**
   * Collect workflow outputs
   */
  _collectOutputs(context, outputDefs) {
    const outputs = {};
    
    for (const outputDef of outputDefs) {
      const name = typeof outputDef === 'string' ? outputDef : outputDef.name;
      const source = typeof outputDef === 'string' ? outputDef : outputDef.from;
      outputs[name] = context.getVariable(source);
    }
    
    return outputs;
  }

  /**
   * Wait for execution to resume
   */
  async _waitForResume(context) {
    return new Promise(resolve => {
      const checkResume = () => {
        if (context.state === ExecutionState.RUNNING) {
          resolve();
        } else {
          setTimeout(checkResume, 100);
        }
      };
      checkResume();
    });
  }

  /**
   * Pause execution
   */
  pause(executionId) {
    const context = this.executions.get(executionId);
    if (context && context.state === ExecutionState.RUNNING) {
      context.state = ExecutionState.PAUSED;
      this.emit('execution-paused', { executionId });
      return true;
    }
    return false;
  }

  /**
   * Resume execution
   */
  resume(executionId) {
    const context = this.executions.get(executionId);
    if (context && context.state === ExecutionState.PAUSED) {
      context.state = ExecutionState.RUNNING;
      this.emit('execution-resumed', { executionId });
      return true;
    }
    return false;
  }

  /**
   * Cancel execution
   */
  cancel(executionId) {
    const context = this.executions.get(executionId);
    if (context && [ExecutionState.RUNNING, ExecutionState.PAUSED].includes(context.state)) {
      context.state = ExecutionState.CANCELLED;
      context.endTime = Date.now();
      this.emit('execution-cancelled', { executionId });
      return true;
    }
    return false;
  }

  /**
   * Get execution status
   */
  getStatus(executionId) {
    const context = this.executions.get(executionId);
    if (!context) {
      return null;
    }

    return {
      executionId: context.executionId,
      workflowId: context.workflowId,
      state: context.state,
      currentStep: context.currentStep,
      duration: context.getDuration(),
      stepsCompleted: context.stepResults.size,
      errors: context.errors.map(e => e.message),
      checkpoints: context.checkpoints.map(cp => cp.name)
    };
  }

  /**
   * Helper sleep function
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = {
  WorkflowExecutor,
  WorkflowDefinition,
  ExecutionContext,
  StepResult,
  StepType,
  ExecutionState,
  RecoveryStrategy
};
