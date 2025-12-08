/**
 * HumanInLoopPattern - Validation gates with human interaction
 * 
 * Enables human validation at key points in the workflow.
 * Supports approval gates, feedback collection, and decision points.
 */

const { BasePattern } = require('../pattern-registry');
const { PatternType, ExecutionContext, ExecutionStatus } = require('../orchestration-engine');

/**
 * Gate type
 */
const GateType = {
  APPROVAL: 'approval',         // Yes/No approval
  REVIEW: 'review',             // Review with feedback
  DECISION: 'decision',         // Multiple choice decision
  CONFIRMATION: 'confirmation'  // Simple confirmation
};

/**
 * Gate result
 */
const GateResult = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_CHANGES: 'needs-changes',
  TIMEOUT: 'timeout',
  SKIPPED: 'skipped'
};

/**
 * HumanInLoopPattern - Human validation gates
 */
class HumanInLoopPattern extends BasePattern {
  constructor(options = {}) {
    super({
      name: PatternType.HUMAN_IN_LOOP,
      type: PatternType.HUMAN_IN_LOOP,
      description: 'Enable human validation gates at key workflow points',
      version: '1.0.0',
      tags: ['validation', 'human', 'approval', 'gate'],
      useCases: [
        'Quality gates',
        'Approval workflows',
        'Decision points',
        'Review processes'
      ],
      complexity: 'medium',
      supportsParallel: false,
      requiresHuman: true
    });

    this.options = {
      timeout: options.timeout || 300000, // 5 minutes
      autoApproveOnTimeout: options.autoApproveOnTimeout || false,
      collectFeedback: options.collectFeedback || true,
      notifyOnGate: options.notifyOnGate || true,
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

    // Check for workflow definition
    if (!input.workflow || !Array.isArray(input.workflow)) {
      errors.push('HumanInLoop pattern requires input.workflow array');
    } else if (input.workflow.length === 0) {
      errors.push('HumanInLoop pattern requires at least one workflow step');
    } else {
      // Validate each step
      for (let i = 0; i < input.workflow.length; i++) {
        const step = input.workflow[i];
        
        if (!step.skill && !step.gate) {
          errors.push(`Workflow step ${i + 1} requires either skill or gate`);
        }
        
        if (step.skill && !engine.getSkill(step.skill)) {
          errors.push(`Unknown skill in workflow: ${step.skill}`);
        }
        
        if (step.gate && !Object.values(GateType).includes(step.gate)) {
          errors.push(`Invalid gate type: ${step.gate}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute human-in-loop pattern
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {Promise<object>} Execution result
   */
  async execute(context, engine) {
    const validation = this.validate(context, engine);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const { workflow, initialInput = {} } = context.input;
    const results = [];
    let currentInput = { ...initialInput };
    let aborted = false;

    engine.emit('humanInLoopStarted', {
      context,
      workflow: workflow.map(s => s.skill || s.gate),
      totalSteps: workflow.length
    });

    for (let i = 0; i < workflow.length && !aborted; i++) {
      const step = workflow[i];
      const stepNumber = i + 1;

      engine.emit('humanInLoopStepStarted', {
        context,
        step,
        stepNumber,
        totalSteps: workflow.length
      });

      try {
        let stepResult;

        if (step.skill) {
          // Execute skill
          stepResult = await this._executeSkillStep(
            step,
            currentInput,
            context,
            engine,
            stepNumber
          );
        } else if (step.gate) {
          // Execute gate
          stepResult = await this._executeGateStep(
            step,
            currentInput,
            context,
            engine,
            stepNumber
          );
        }

        results.push({
          step: stepNumber,
          type: step.skill ? 'skill' : 'gate',
          name: step.skill || step.gate,
          status: stepResult.status,
          result: stepResult
        });

        // Check if gate rejected
        if (step.gate && stepResult.result === GateResult.REJECTED) {
          aborted = true;
          engine.emit('humanInLoopAborted', {
            context,
            step,
            stepNumber,
            reason: 'Gate rejected'
          });
        } else if (step.gate && stepResult.result === GateResult.NEEDS_CHANGES) {
          // Could implement retry logic here
          if (step.retryOnNeededChanges) {
            // Go back to previous skill step
            const prevSkillIndex = this._findPreviousSkillIndex(workflow, i);
            if (prevSkillIndex >= 0) {
              i = prevSkillIndex - 1; // Will increment in loop
              currentInput = {
                ...currentInput,
                feedback: stepResult.feedback,
                needsChanges: true
              };
              continue;
            }
          }
        }

        // Update input for next step
        if (stepResult.output) {
          currentInput = { ...currentInput, ...stepResult.output };
        }

        engine.emit('humanInLoopStepCompleted', {
          context,
          step,
          stepNumber,
          result: stepResult
        });

      } catch (error) {
        results.push({
          step: stepNumber,
          type: step.skill ? 'skill' : 'gate',
          name: step.skill || step.gate,
          status: ExecutionStatus.FAILED,
          error: error.message
        });

        engine.emit('humanInLoopStepFailed', {
          context,
          step,
          stepNumber,
          error
        });

        if (!step.continueOnError) {
          aborted = true;
        }
      }
    }

    const summary = this._createSummary(results, aborted);

    engine.emit('humanInLoopCompleted', {
      context,
      results,
      summary,
      aborted
    });

    return {
      results,
      summary,
      aborted,
      finalOutput: currentInput
    };
  }

  /**
   * Execute a skill step
   * @private
   */
  async _executeSkillStep(step, input, parentContext, engine, stepNumber) {
    const stepContext = new ExecutionContext({
      task: `HIL Step ${stepNumber}: ${step.skill}`,
      skill: step.skill,
      input: { ...input, ...step.input },
      parentId: parentContext.id,
      metadata: {
        pattern: PatternType.HUMAN_IN_LOOP,
        stepNumber,
        stepType: 'skill'
      }
    });

    parentContext.children.push(stepContext);
    stepContext.start();

    const output = await engine.executeSkill(step.skill, stepContext.input, parentContext);
    stepContext.complete(output);

    return {
      status: ExecutionStatus.COMPLETED,
      output
    };
  }

  /**
   * Execute a gate step
   * @private
   */
  async _executeGateStep(step, input, parentContext, engine, stepNumber) {
    const stepContext = new ExecutionContext({
      task: `HIL Gate ${stepNumber}: ${step.gate}`,
      skill: null,
      input,
      parentId: parentContext.id,
      metadata: {
        pattern: PatternType.HUMAN_IN_LOOP,
        stepNumber,
        stepType: 'gate',
        gateType: step.gate
      }
    });

    parentContext.children.push(stepContext);
    stepContext.start();
    stepContext.waitForHuman();

    // Emit gate notification
    if (this.options.notifyOnGate) {
      engine.emit('humanInLoopGateReached', {
        context: parentContext,
        gate: step,
        stepNumber,
        input
      });
    }

    // Build gate question
    const question = this._buildGateQuestion(step, input);

    // Request human validation
    let response;
    try {
      response = await this._requestWithTimeout(
        () => engine.requestHumanValidation(stepContext, question),
        this.options.timeout
      );
    } catch (error) {
      if (error.message.includes('timeout')) {
        response = this.options.autoApproveOnTimeout
          ? { approved: true, feedback: 'Auto-approved on timeout' }
          : { approved: false, feedback: 'Timeout waiting for human response' };
        
        stepContext.complete({
          result: this.options.autoApproveOnTimeout 
            ? GateResult.APPROVED 
            : GateResult.TIMEOUT,
          feedback: response.feedback
        });

        return {
          status: ExecutionStatus.COMPLETED,
          result: this.options.autoApproveOnTimeout 
            ? GateResult.APPROVED 
            : GateResult.TIMEOUT,
          feedback: response.feedback
        };
      }
      throw error;
    }

    // Process response
    const gateResult = this._processGateResponse(step.gate, response);
    
    stepContext.complete({
      result: gateResult,
      feedback: response.feedback,
      response
    });

    return {
      status: ExecutionStatus.COMPLETED,
      result: gateResult,
      feedback: response.feedback,
      output: response.output
    };
  }

  /**
   * Request with timeout
   * @private
   */
  _requestWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Gate timeout after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Build gate question
   * @private
   */
  _buildGateQuestion(step, input) {
    const context = step.context || '';
    const prompt = step.prompt || this._getDefaultPrompt(step.gate);
    
    let question = prompt;
    if (context) {
      question = `${context}\n\n${prompt}`;
    }
    
    // Include relevant input data
    if (step.showInput && input) {
      question += `\n\nContext:\n${JSON.stringify(input, null, 2)}`;
    }
    
    return question;
  }

  /**
   * Get default prompt for gate type
   * @private
   */
  _getDefaultPrompt(gateType) {
    switch (gateType) {
      case GateType.APPROVAL:
        return 'Do you approve this to proceed? (yes/no)';
      case GateType.REVIEW:
        return 'Please review the above and provide feedback.';
      case GateType.DECISION:
        return 'Please make a decision.';
      case GateType.CONFIRMATION:
        return 'Please confirm to continue.';
      default:
        return 'Please respond.';
    }
  }

  /**
   * Process gate response
   * @private
   */
  _processGateResponse(gateType, response) {
    if (response.approved === true) {
      return GateResult.APPROVED;
    }
    
    if (response.approved === false) {
      if (response.needsChanges) {
        return GateResult.NEEDS_CHANGES;
      }
      return GateResult.REJECTED;
    }
    
    if (response.skipped) {
      return GateResult.SKIPPED;
    }
    
    // Default based on gate type
    switch (gateType) {
      case GateType.CONFIRMATION:
        return response.confirmed ? GateResult.APPROVED : GateResult.REJECTED;
      default:
        return GateResult.APPROVED; // Default to approved for review gates
    }
  }

  /**
   * Find previous skill index
   * @private
   */
  _findPreviousSkillIndex(workflow, currentIndex) {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (workflow[i].skill) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Create execution summary
   * @private
   */
  _createSummary(results, aborted) {
    const skillSteps = results.filter(r => r.type === 'skill');
    const gateSteps = results.filter(r => r.type === 'gate');
    
    const approvedGates = gateSteps.filter(r => 
      r.result?.result === GateResult.APPROVED
    ).length;
    
    const rejectedGates = gateSteps.filter(r => 
      r.result?.result === GateResult.REJECTED
    ).length;

    return {
      totalSteps: results.length,
      skillSteps: skillSteps.length,
      gateSteps: gateSteps.length,
      approvedGates,
      rejectedGates,
      aborted,
      completed: !aborted,
      gateApprovalRate: gateSteps.length > 0 
        ? (approvedGates / gateSteps.length * 100).toFixed(1) + '%' 
        : 'N/A'
    };
  }
}

/**
 * Create a human-in-loop pattern with custom options
 * @param {object} options - Pattern options
 * @returns {HumanInLoopPattern} HumanInLoop pattern instance
 */
function createHumanInLoopPattern(options = {}) {
  return new HumanInLoopPattern(options);
}

module.exports = {
  HumanInLoopPattern,
  GateType,
  GateResult,
  createHumanInLoopPattern
};
