/**
 * SequentialPattern - Linear skill execution pattern
 * 
 * Executes skills in sequence, passing output from one skill
 * as input to the next. Supports error handling and recovery.
 */

const { BasePattern } = require('../pattern-registry');
const { PatternType, ExecutionContext, ExecutionStatus } = require('../orchestration-engine');

/**
 * Sequential execution options
 */
const SequentialOptions = {
  STOP_ON_ERROR: 'stop-on-error',
  CONTINUE_ON_ERROR: 'continue-on-error',
  RETRY_ON_ERROR: 'retry-on-error'
};

/**
 * SequentialPattern - Execute skills one after another
 */
class SequentialPattern extends BasePattern {
  constructor(options = {}) {
    super({
      name: PatternType.SEQUENTIAL,
      type: PatternType.SEQUENTIAL,
      description: 'Execute skills in sequence, passing output as input to next skill',
      version: '1.0.0',
      tags: ['linear', 'pipeline', 'workflow'],
      useCases: [
        'Step-by-step workflows',
        'Data transformation pipelines',
        'Dependent task chains'
      ],
      complexity: 'low',
      supportsParallel: false,
      requiresHuman: false
    });

    this.options = {
      errorHandling: options.errorHandling || SequentialOptions.STOP_ON_ERROR,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      transformOutput: options.transformOutput || ((output, context) => output),
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

    // Check for skills array
    if (!input.skills || !Array.isArray(input.skills)) {
      errors.push('Sequential pattern requires input.skills array');
    } else if (input.skills.length === 0) {
      errors.push('Sequential pattern requires at least one skill');
    } else {
      // Validate each skill exists
      for (const skillName of input.skills) {
        if (!engine.getSkill(skillName)) {
          errors.push(`Unknown skill: ${skillName}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute skills sequentially
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {Promise<object>} Execution result
   */
  async execute(context, engine) {
    const validation = this.validate(context, engine);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const { skills, initialInput = {} } = context.input;
    const results = [];
    let currentInput = { ...initialInput };
    let lastOutput = null;

    engine.emit('sequentialStarted', {
      context,
      skills,
      totalSteps: skills.length
    });

    for (let i = 0; i < skills.length; i++) {
      const skillName = skills[i];
      const stepContext = new ExecutionContext({
        task: `Step ${i + 1}: ${skillName}`,
        skill: skillName,
        input: currentInput,
        parentId: context.id,
        metadata: {
          stepIndex: i,
          totalSteps: skills.length,
          pattern: PatternType.SEQUENTIAL
        }
      });

      context.children.push(stepContext);

      engine.emit('sequentialStepStarted', {
        context,
        stepContext,
        stepIndex: i,
        skillName
      });

      try {
        stepContext.start();
        
        const output = await this._executeWithRetry(
          () => engine.executeSkill(skillName, currentInput, context),
          skillName,
          engine
        );

        stepContext.complete(output);
        lastOutput = output;
        
        // Transform output for next step
        currentInput = this.options.transformOutput(output, stepContext);
        
        results.push({
          step: i + 1,
          skill: skillName,
          status: ExecutionStatus.COMPLETED,
          output
        });

        engine.emit('sequentialStepCompleted', {
          context,
          stepContext,
          stepIndex: i,
          skillName,
          output
        });

      } catch (error) {
        stepContext.fail(error);

        results.push({
          step: i + 1,
          skill: skillName,
          status: ExecutionStatus.FAILED,
          error: error.message
        });

        engine.emit('sequentialStepFailed', {
          context,
          stepContext,
          stepIndex: i,
          skillName,
          error
        });

        // Handle error based on configuration
        if (this.options.errorHandling === SequentialOptions.STOP_ON_ERROR) {
          throw new Error(
            `Sequential execution failed at step ${i + 1} (${skillName}): ${error.message}`
          );
        }
        
        // Continue on error - use previous output as input
        engine.emit('sequentialContinuingAfterError', {
          context,
          stepIndex: i,
          skillName,
          error
        });
      }
    }

    const summary = this._createSummary(results, skills);

    engine.emit('sequentialCompleted', {
      context,
      results,
      summary
    });

    return {
      results,
      summary,
      finalOutput: lastOutput
    };
  }

  /**
   * Execute with retry
   * @private
   */
  async _executeWithRetry(fn, skillName, engine) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < this.options.maxRetries && 
            this.options.errorHandling === SequentialOptions.RETRY_ON_ERROR) {
          engine.emit('sequentialRetrying', {
            skillName,
            attempt,
            maxRetries: this.options.maxRetries,
            error
          });
          
          await this._delay(this.options.retryDelay * attempt);
        } else {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Delay helper
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create execution summary
   * @private
   */
  _createSummary(results, skills) {
    const completed = results.filter(r => r.status === ExecutionStatus.COMPLETED).length;
    const failed = results.filter(r => r.status === ExecutionStatus.FAILED).length;
    
    return {
      totalSteps: skills.length,
      completed,
      failed,
      successRate: skills.length > 0 ? (completed / skills.length * 100).toFixed(1) + '%' : '0%',
      allCompleted: completed === skills.length,
      hasFailed: failed > 0
    };
  }
}

/**
 * Create a sequential pattern with custom options
 * @param {object} options - Pattern options
 * @returns {SequentialPattern} Sequential pattern instance
 */
function createSequentialPattern(options = {}) {
  return new SequentialPattern(options);
}

module.exports = {
  SequentialPattern,
  SequentialOptions,
  createSequentialPattern
};
