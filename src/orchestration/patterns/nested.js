/**
 * NestedPattern - Hierarchical skill delegation pattern
 * 
 * Executes tasks by delegating to sub-skills in a hierarchical manner.
 * Each skill can spawn child tasks creating a tree-like execution structure.
 */

const { BasePattern } = require('../pattern-registry');
const { PatternType, ExecutionContext, ExecutionStatus } = require('../orchestration-engine');

/**
 * Nested execution mode
 */
const NestedMode = {
  DEPTH_FIRST: 'depth-first',
  BREADTH_FIRST: 'breadth-first'
};

/**
 * NestedPattern - Hierarchical task delegation
 */
class NestedPattern extends BasePattern {
  constructor(options = {}) {
    super({
      name: PatternType.NESTED,
      type: PatternType.NESTED,
      description: 'Execute tasks hierarchically, delegating to sub-skills',
      version: '1.0.0',
      tags: ['hierarchical', 'delegation', 'decomposition'],
      useCases: [
        'Complex task breakdown',
        'Hierarchical processing',
        'Multi-level delegation'
      ],
      complexity: 'high',
      supportsParallel: false,
      requiresHuman: false
    });

    this.options = {
      maxDepth: options.maxDepth || 5,
      mode: options.mode || NestedMode.DEPTH_FIRST,
      allowSelfDelegation: options.allowSelfDelegation || false,
      aggregateResults: options.aggregateResults || true,
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

    // Check for root skill or task
    if (!input.rootSkill && !input.task) {
      errors.push('Nested pattern requires input.rootSkill or input.task');
    }

    // Check root skill exists
    if (input.rootSkill && !engine.getSkill(input.rootSkill)) {
      errors.push(`Unknown root skill: ${input.rootSkill}`);
    }

    // Check delegation map if provided
    if (input.delegationMap) {
      for (const [parent, children] of Object.entries(input.delegationMap)) {
        if (!engine.getSkill(parent)) {
          errors.push(`Unknown skill in delegation map: ${parent}`);
        }
        for (const child of children) {
          if (!engine.getSkill(child)) {
            errors.push(`Unknown child skill: ${child}`);
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
   * Execute nested pattern
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {Promise<object>} Execution result
   */
  async execute(context, engine) {
    const validation = this.validate(context, engine);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const { rootSkill, task, delegationMap = {}, initialInput = {} } = context.input;
    
    engine.emit('nestedStarted', {
      context,
      rootSkill,
      delegationMap
    });

    // Determine root skill from task if not provided
    let actualRootSkill = rootSkill;
    if (!actualRootSkill && task) {
      actualRootSkill = await engine.resolveSkill(task);
      if (!actualRootSkill) {
        throw new Error(`Cannot resolve skill for task: ${task}`);
      }
    }

    const executionTree = {
      skill: actualRootSkill,
      children: [],
      output: null,
      status: ExecutionStatus.PENDING,
      depth: 0
    };

    try {
      await this._executeNode(
        executionTree,
        initialInput,
        delegationMap,
        context,
        engine,
        0
      );

      const aggregatedResult = this.options.aggregateResults
        ? this._aggregateResults(executionTree)
        : executionTree;

      engine.emit('nestedCompleted', {
        context,
        tree: executionTree,
        aggregatedResult
      });

      return {
        tree: executionTree,
        aggregatedResult,
        summary: this._createSummary(executionTree)
      };

    } catch (error) {
      engine.emit('nestedFailed', {
        context,
        tree: executionTree,
        error
      });
      throw error;
    }
  }

  /**
   * Execute a single node in the tree
   * @private
   */
  async _executeNode(node, input, delegationMap, parentContext, engine, depth) {
    if (depth >= this.options.maxDepth) {
      node.status = ExecutionStatus.FAILED;
      node.error = `Max depth (${this.options.maxDepth}) exceeded`;
      return;
    }

    const stepContext = new ExecutionContext({
      task: `Nested: ${node.skill} (depth: ${depth})`,
      skill: node.skill,
      input,
      parentId: parentContext.id,
      metadata: {
        pattern: PatternType.NESTED,
        depth,
        hasChildren: delegationMap[node.skill]?.length > 0
      }
    });

    parentContext.children.push(stepContext);

    engine.emit('nestedNodeStarted', {
      node,
      depth,
      stepContext
    });

    try {
      stepContext.start();
      node.status = ExecutionStatus.RUNNING;

      // Execute the skill
      const output = await engine.executeSkill(node.skill, input, parentContext);
      node.output = output;
      stepContext.complete(output);

      // Check for child skills to delegate to
      const childSkills = delegationMap[node.skill] || [];
      
      if (childSkills.length > 0) {
        for (const childSkill of childSkills) {
          // Skip self-delegation unless allowed
          if (!this.options.allowSelfDelegation && childSkill === node.skill) {
            continue;
          }

          const childNode = {
            skill: childSkill,
            children: [],
            output: null,
            status: ExecutionStatus.PENDING,
            depth: depth + 1
          };
          node.children.push(childNode);

          // Use parent output as child input
          await this._executeNode(
            childNode,
            output,
            delegationMap,
            parentContext,
            engine,
            depth + 1
          );
        }
      }

      node.status = ExecutionStatus.COMPLETED;

      engine.emit('nestedNodeCompleted', {
        node,
        depth,
        output
      });

    } catch (error) {
      node.status = ExecutionStatus.FAILED;
      node.error = error.message;
      stepContext.fail(error);

      engine.emit('nestedNodeFailed', {
        node,
        depth,
        error
      });

      throw error;
    }
  }

  /**
   * Aggregate results from tree
   * @private
   */
  _aggregateResults(node) {
    const result = {
      skill: node.skill,
      output: node.output,
      childOutputs: []
    };

    for (const child of node.children) {
      result.childOutputs.push(this._aggregateResults(child));
    }

    return result;
  }

  /**
   * Create execution summary
   * @private
   */
  _createSummary(tree) {
    let totalNodes = 0;
    let completed = 0;
    let failed = 0;
    let maxDepth = 0;

    const traverse = (node) => {
      totalNodes++;
      if (node.status === ExecutionStatus.COMPLETED) completed++;
      if (node.status === ExecutionStatus.FAILED) failed++;
      if (node.depth > maxDepth) maxDepth = node.depth;
      
      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(tree);

    return {
      totalNodes,
      completed,
      failed,
      maxDepth,
      successRate: totalNodes > 0 
        ? (completed / totalNodes * 100).toFixed(1) + '%' 
        : '0%'
    };
  }
}

/**
 * Create a nested pattern with custom options
 * @param {object} options - Pattern options
 * @returns {NestedPattern} Nested pattern instance
 */
function createNestedPattern(options = {}) {
  return new NestedPattern(options);
}

module.exports = {
  NestedPattern,
  NestedMode,
  createNestedPattern
};
