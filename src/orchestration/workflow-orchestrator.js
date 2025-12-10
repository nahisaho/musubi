/**
 * WorkflowOrchestrator - Complex multi-pattern workflow execution
 * 
 * Enables end-to-end workflows combining multiple orchestration patterns
 * for complete SDD lifecycle (Research → Monitoring)
 */

const { PatternType, ExecutionContext, ExecutionStatus } = require('./orchestration-engine');

/**
 * Workflow step types
 */
const StepType = {
  SKILL: 'skill',           // Single skill execution
  PATTERN: 'pattern',       // Execute an orchestration pattern
  CONDITIONAL: 'conditional', // Branch based on condition
  PARALLEL: 'parallel',     // Parallel steps
  CHECKPOINT: 'checkpoint', // Save state checkpoint
  HUMAN_GATE: 'human-gate'  // Require human approval
};

/**
 * Workflow state
 */
const WorkflowState = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * WorkflowOrchestrator - Complex workflow coordination
 */
class WorkflowOrchestrator {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.options = {
      saveCheckpoints: options.saveCheckpoints || false,
      checkpointStorage: options.checkpointStorage || new Map(),
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      timeout: options.timeout || 300000, // 5 minutes default
      ...options
    };

    this.workflows = new Map();
    this.activeExecutions = new Map();
  }

  /**
   * Register a workflow definition
   * @param {string} name - Workflow name
   * @param {object} definition - Workflow definition
   */
  registerWorkflow(name, definition) {
    if (!definition.steps || !Array.isArray(definition.steps)) {
      throw new Error('Workflow must have steps array');
    }

    this.workflows.set(name, {
      name,
      description: definition.description || '',
      version: definition.version || '1.0.0',
      steps: definition.steps,
      inputs: definition.inputs || [],
      outputs: definition.outputs || [],
      onError: definition.onError || 'stop',
      metadata: definition.metadata || {}
    });

    return this;
  }

  /**
   * Get workflow definition
   * @param {string} name - Workflow name
   * @returns {object|null} Workflow definition
   */
  getWorkflow(name) {
    return this.workflows.get(name) || null;
  }

  /**
   * List all registered workflows
   * @returns {string[]} Workflow names
   */
  listWorkflows() {
    return [...this.workflows.keys()];
  }

  /**
   * Execute a workflow
   * @param {string} workflowName - Name of workflow to execute
   * @param {object} input - Initial input data
   * @param {object} options - Execution options
   * @returns {Promise<object>} Execution result
   */
  async execute(workflowName, input = {}, options = {}) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowName}`);
    }

    const executionId = this._generateId();
    const startTime = Date.now();
    
    const execution = {
      id: executionId,
      workflow: workflowName,
      state: WorkflowState.RUNNING,
      currentStep: 0,
      input,
      output: {},
      context: { ...input },
      stepResults: [],
      checkpoints: [],
      startTime,
      endTime: null,
      error: null
    };

    this.activeExecutions.set(executionId, execution);

    this.engine.emit('workflowStarted', {
      executionId,
      workflow: workflowName,
      input
    });

    try {
      // Execute each step
      for (let i = 0; i < workflow.steps.length; i++) {
        execution.currentStep = i;
        const step = workflow.steps[i];

        this.engine.emit('workflowStepStarted', {
          executionId,
          stepIndex: i,
          step: step.name || step.type,
          totalSteps: workflow.steps.length
        });

        const stepResult = await this._executeStep(step, execution, options);
        
        execution.stepResults.push({
          step: step.name || `step-${i}`,
          type: step.type,
          status: stepResult.status,
          output: stepResult.output,
          duration: stepResult.duration
        });

        // Merge step output into context
        if (stepResult.output) {
          execution.context = {
            ...execution.context,
            ...stepResult.output,
            [`step_${i}_result`]: stepResult.output
          };
        }

        this.engine.emit('workflowStepCompleted', {
          executionId,
          stepIndex: i,
          step: step.name || step.type,
          result: stepResult
        });

        // Handle step failure
        if (stepResult.status === ExecutionStatus.FAILED) {
          if (workflow.onError === 'stop') {
            throw new Error(`Step ${step.name || i} failed: ${stepResult.error}`);
          }
          // Continue on error
        }

        // Check if execution was cancelled or paused
        if (execution.state === WorkflowState.CANCELLED) {
          break;
        }
        if (execution.state === WorkflowState.PAUSED) {
          // Save checkpoint and wait
          await this._saveCheckpoint(execution);
          return {
            executionId,
            state: WorkflowState.PAUSED,
            resumeFrom: i + 1,
            context: execution.context
          };
        }
      }

      // Workflow completed
      execution.state = WorkflowState.COMPLETED;
      execution.endTime = Date.now();
      execution.output = this._extractOutputs(execution.context, workflow.outputs);

      const result = {
        executionId,
        workflow: workflowName,
        state: WorkflowState.COMPLETED,
        output: execution.output,
        stepResults: execution.stepResults,
        duration: execution.endTime - startTime,
        summary: this._createSummary(execution)
      };

      this.engine.emit('workflowCompleted', {
        executionId,
        result
      });

      return result;

    } catch (error) {
      execution.state = WorkflowState.FAILED;
      execution.endTime = Date.now();
      execution.error = error.message;

      this.engine.emit('workflowFailed', {
        executionId,
        error,
        stepResults: execution.stepResults
      });

      throw error;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute a single workflow step
   * @private
   */
  async _executeStep(step, execution, options) {
    const startTime = Date.now();

    try {
      let output;

      switch (step.type) {
        case StepType.SKILL:
          output = await this._executeSkillStep(step, execution);
          break;

        case StepType.PATTERN:
          output = await this._executePatternStep(step, execution);
          break;

        case StepType.CONDITIONAL:
          output = await this._executeConditionalStep(step, execution);
          break;

        case StepType.PARALLEL:
          output = await this._executeParallelStep(step, execution);
          break;

        case StepType.CHECKPOINT:
          output = await this._executeCheckpointStep(step, execution);
          break;

        case StepType.HUMAN_GATE:
          output = await this._executeHumanGateStep(step, execution, options);
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      return {
        status: ExecutionStatus.COMPLETED,
        output,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        status: ExecutionStatus.FAILED,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Execute skill step
   * @private
   */
  async _executeSkillStep(step, execution) {
    const input = this._resolveInput(step.input, execution.context);
    const skill = this.engine.getSkill(step.skill);
    
    if (!skill) {
      throw new Error(`Unknown skill: ${step.skill}`);
    }

    const parentContext = new ExecutionContext({
      task: `Workflow skill: ${step.skill}`,
      skill: step.skill,
      input
    });

    return await this.engine.executeSkill(step.skill, input, parentContext);
  }

  /**
   * Execute pattern step
   * @private
   */
  async _executePatternStep(step, execution) {
    const input = this._resolveInput(step.input, execution.context);
    
    const context = await this.engine.execute(step.pattern, {
      input: { ...input, ...step.config }
    });

    return context.output;
  }

  /**
   * Execute conditional step
   * @private
   */
  async _executeConditionalStep(step, execution) {
    const condition = this._evaluateCondition(step.condition, execution.context);
    
    const branchSteps = condition ? step.then : step.else;
    
    if (branchSteps && branchSteps.length > 0) {
      for (const branchStep of branchSteps) {
        const result = await this._executeStep(branchStep, execution, {});
        if (result.status === ExecutionStatus.FAILED) {
          throw new Error(`Conditional branch failed: ${result.error}`);
        }
      }
    }

    return { branch: condition ? 'then' : 'else' };
  }

  /**
   * Execute parallel step
   * @private
   */
  async _executeParallelStep(step, execution) {
    const results = await Promise.allSettled(
      step.steps.map(subStep => 
        this._executeStep(subStep, execution, {})
      )
    );

    const outputs = results.map((r, i) => ({
      step: step.steps[i].name || `parallel-${i}`,
      status: r.status === 'fulfilled' ? r.value.status : ExecutionStatus.FAILED,
      output: r.status === 'fulfilled' ? r.value.output : null,
      error: r.status === 'rejected' ? r.reason.message : null
    }));

    return { parallelResults: outputs };
  }

  /**
   * Execute checkpoint step
   * @private
   */
  async _executeCheckpointStep(step, execution) {
    const checkpoint = {
      id: this._generateId(),
      name: step.name || 'checkpoint',
      timestamp: Date.now(),
      context: { ...execution.context }
    };

    execution.checkpoints.push(checkpoint);

    if (this.options.saveCheckpoints) {
      this.options.checkpointStorage.set(checkpoint.id, checkpoint);
    }

    return { checkpointId: checkpoint.id };
  }

  /**
   * Execute human gate step
   * @private
   */
  async _executeHumanGateStep(step, execution, options) {
    if (!options.humanGate) {
      // Auto-approve if no human gate configured
      return { approved: true, autoApproved: true };
    }

    const question = this._resolveTemplate(step.question, execution.context);
    const response = await options.humanGate.request(question, execution.context);

    if (!response.approved) {
      throw new Error(`Human gate rejected: ${response.feedback || 'No reason provided'}`);
    }

    return response;
  }

  /**
   * Resolve input with context values
   * @private
   */
  _resolveInput(input, context) {
    if (!input) return context;
    if (typeof input === 'function') return input(context);
    
    const resolved = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Reference to context value
        const path = value.slice(1);
        resolved[key] = this._getValueByPath(context, path);
      } else {
        resolved[key] = value;
      }
    }
    return { ...context, ...resolved };
  }

  /**
   * Get value from object by dot path
   * @private
   */
  _getValueByPath(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  /**
   * Evaluate condition expression
   * @private
   */
  _evaluateCondition(condition, context) {
    if (typeof condition === 'function') {
      return condition(context);
    }
    if (typeof condition === 'string') {
      // Simple path check
      return !!this._getValueByPath(context, condition);
    }
    return !!condition;
  }

  /**
   * Resolve template string with context values
   * @private
   */
  _resolveTemplate(template, context) {
    if (typeof template !== 'string') return template;
    return template.replace(/\$\{([^}]+)\}/g, (_, path) => 
      this._getValueByPath(context, path) || ''
    );
  }

  /**
   * Extract specified outputs from context
   * @private
   */
  _extractOutputs(context, outputs) {
    if (!outputs || outputs.length === 0) return context;
    
    const result = {};
    for (const output of outputs) {
      result[output] = context[output];
    }
    return result;
  }

  /**
   * Create execution summary
   * @private
   */
  _createSummary(execution) {
    const completed = execution.stepResults.filter(s => s.status === ExecutionStatus.COMPLETED).length;
    const failed = execution.stepResults.filter(s => s.status === ExecutionStatus.FAILED).length;
    const total = execution.stepResults.length;

    return {
      totalSteps: total,
      completedSteps: completed,
      failedSteps: failed,
      successRate: total > 0 ? (completed / total * 100).toFixed(1) + '%' : '0%',
      duration: execution.endTime - execution.startTime,
      checkpoints: execution.checkpoints.length
    };
  }

  /**
   * Save checkpoint
   * @private
   */
  async _saveCheckpoint(execution) {
    if (this.options.saveCheckpoints) {
      const checkpoint = {
        id: this._generateId(),
        executionId: execution.id,
        workflow: execution.workflow,
        currentStep: execution.currentStep,
        context: execution.context,
        timestamp: Date.now()
      };
      this.options.checkpointStorage.set(checkpoint.id, checkpoint);
      return checkpoint;
    }
    return null;
  }

  /**
   * Resume workflow from checkpoint
   * @param {string} checkpointId - Checkpoint ID to resume from
   * @param {object} options - Execution options
   */
  async resumeFromCheckpoint(checkpointId, options = {}) {
    const checkpoint = this.options.checkpointStorage.get(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    const workflow = this.workflows.get(checkpoint.workflow);
    if (!workflow) {
      throw new Error(`Workflow not found: ${checkpoint.workflow}`);
    }

    // Resume execution from checkpoint
    const remainingSteps = workflow.steps.slice(checkpoint.currentStep);
    const resumedWorkflow = {
      ...workflow,
      steps: remainingSteps
    };

    // Temporarily register resumed workflow
    const tempName = `${checkpoint.workflow}_resumed_${checkpointId}`;
    this.registerWorkflow(tempName, resumedWorkflow);

    try {
      return await this.execute(tempName, checkpoint.context, options);
    } finally {
      this.workflows.delete(tempName);
    }
  }

  /**
   * Pause an active execution
   * @param {string} executionId - Execution ID to pause
   */
  pause(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (execution && execution.state === WorkflowState.RUNNING) {
      execution.state = WorkflowState.PAUSED;
      return true;
    }
    return false;
  }

  /**
   * Cancel an active execution
   * @param {string} executionId - Execution ID to cancel
   */
  cancel(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (execution && execution.state === WorkflowState.RUNNING) {
      execution.state = WorkflowState.CANCELLED;
      return true;
    }
    return false;
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Pre-defined SDD workflow templates
 */
const SDDWorkflowTemplates = {
  /**
   * Simple feature workflow: Requirements → Design → Tasks
   */
  SIMPLE_FEATURE: {
    name: 'simple-feature',
    description: 'Simple feature development workflow',
    steps: [
      {
        name: 'requirements',
        type: StepType.SKILL,
        skill: 'requirements-analyst',
        input: { feature: '$featureName' }
      },
      {
        name: 'design',
        type: StepType.SKILL,
        skill: 'software-architect',
        input: { requirements: '$step_0_result' }
      },
      {
        name: 'tasks',
        type: StepType.SKILL,
        skill: 'task-planner',
        input: { design: '$step_1_result' }
      }
    ],
    outputs: ['requirements', 'design', 'tasks']
  },

  /**
   * Full SDD lifecycle workflow
   */
  FULL_SDD: {
    name: 'full-sdd',
    description: 'Complete SDD lifecycle from research to deployment',
    steps: [
      {
        name: 'research',
        type: StepType.PATTERN,
        pattern: PatternType.AUTO,
        input: { task: 'Research: $featureName' }
      },
      {
        name: 'requirements',
        type: StepType.SKILL,
        skill: 'requirements-analyst'
      },
      {
        name: 'review-requirements',
        type: StepType.HUMAN_GATE,
        question: 'Please review the requirements for ${featureName}'
      },
      {
        name: 'design',
        type: StepType.PATTERN,
        pattern: PatternType.GROUP_CHAT,
        config: {
          participants: ['software-architect', 'security-reviewer', 'ux-designer'],
          topic: 'Design review'
        }
      },
      {
        name: 'implementation',
        type: StepType.PATTERN,
        pattern: PatternType.SEQUENTIAL,
        config: {
          skills: ['code-generator', 'test-engineer']
        }
      },
      {
        name: 'validation',
        type: StepType.PATTERN,
        pattern: PatternType.SWARM,
        config: {
          tasks: [
            { skill: 'code-reviewer' },
            { skill: 'security-reviewer' },
            { skill: 'accessibility-specialist' }
          ]
        }
      },
      {
        name: 'checkpoint',
        type: StepType.CHECKPOINT,
        checkpoint: 'pre-deployment'
      },
      {
        name: 'deploy-approval',
        type: StepType.HUMAN_GATE,
        question: 'Approve deployment for ${featureName}?'
      }
    ],
    outputs: ['requirements', 'design', 'code', 'tests', 'reviews']
  },

  /**
   * Code review workflow
   */
  CODE_REVIEW: {
    name: 'code-review',
    description: 'Multi-perspective code review',
    steps: [
      {
        name: 'parallel-review',
        type: StepType.PARALLEL,
        steps: [
          {
            type: StepType.SKILL,
            skill: 'code-reviewer',
            input: { focus: 'quality' }
          },
          {
            type: StepType.SKILL,
            skill: 'security-reviewer',
            input: { focus: 'security' }
          },
          {
            type: StepType.SKILL,
            skill: 'performance-engineer',
            input: { focus: 'performance' }
          }
        ]
      },
      {
        name: 'consolidate',
        type: StepType.SKILL,
        skill: 'documentation-writer',
        input: { reviews: '$parallelResults' }
      }
    ],
    outputs: ['reviews', 'summary']
  }
};

/**
 * Create a workflow orchestrator
 * @param {OrchestrationEngine} engine - Orchestration engine
 * @param {object} options - Options
 * @returns {WorkflowOrchestrator} Workflow orchestrator instance
 */
function createWorkflowOrchestrator(engine, options = {}) {
  return new WorkflowOrchestrator(engine, options);
}

module.exports = {
  WorkflowOrchestrator,
  StepType,
  WorkflowState,
  SDDWorkflowTemplates,
  createWorkflowOrchestrator
};
