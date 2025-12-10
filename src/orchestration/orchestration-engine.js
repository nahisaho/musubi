/**
 * OrchestrationEngine - Core engine for multi-skill orchestration
 * 
 * Implements ag2-inspired patterns for skill coordination:
 * - Auto: Automatic skill selection based on task
 * - Sequential: Linear skill execution
 * - Nested: Hierarchical skill delegation
 * - GroupChat: Multi-skill collaborative discussion
 * - Swarm: Parallel skill execution
 * - HumanInLoop: Validation gates
 * - Handoff: Agent delegation (v3.8.0)
 * - Triage: Request classification and routing (v3.8.0)
 */

const EventEmitter = require('events');

/**
 * Orchestration pattern types
 */
const PatternType = {
  AUTO: 'auto',
  SEQUENTIAL: 'sequential',
  NESTED: 'nested',
  GROUP_CHAT: 'group-chat',
  SWARM: 'swarm',
  HUMAN_IN_LOOP: 'human-in-loop',
  HANDOFF: 'handoff',
  TRIAGE: 'triage'
};

/**
 * Execution status
 */
const ExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  WAITING_FOR_HUMAN: 'waiting-for-human'
};

/**
 * Task priority levels
 */
const Priority = {
  P0: 0, // Critical - must complete first
  P1: 1, // High - important
  P2: 2, // Medium - nice to have
  P3: 3  // Low - future enhancement
};

/**
 * Execution context for a task
 */
class ExecutionContext {
  constructor(options = {}) {
    this.id = options.id || this._generateId();
    this.parentId = options.parentId || null;
    this.task = options.task || '';
    this.priority = options.priority ?? Priority.P1;
    this.status = ExecutionStatus.PENDING;
    this.skill = options.skill || null;
    this.input = options.input || {};
    this.output = null;
    this.error = null;
    this.children = [];
    this.metadata = options.metadata || {};
    this.startTime = null;
    this.endTime = null;
  }

  _generateId() {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  start() {
    this.status = ExecutionStatus.RUNNING;
    this.startTime = new Date();
  }

  complete(output) {
    this.status = ExecutionStatus.COMPLETED;
    this.output = output;
    this.endTime = new Date();
  }

  fail(error) {
    this.status = ExecutionStatus.FAILED;
    this.error = error instanceof Error ? error.message : error;
    this.endTime = new Date();
  }

  cancel() {
    this.status = ExecutionStatus.CANCELLED;
    this.endTime = new Date();
  }

  waitForHuman() {
    this.status = ExecutionStatus.WAITING_FOR_HUMAN;
  }

  getDuration() {
    if (!this.startTime) return 0;
    const end = this.endTime || new Date();
    return end - this.startTime;
  }

  toJSON() {
    return {
      id: this.id,
      parentId: this.parentId,
      task: this.task,
      priority: this.priority,
      status: this.status,
      skill: this.skill,
      input: this.input,
      output: this.output,
      error: this.error,
      children: this.children.map(c => c.toJSON ? c.toJSON() : c),
      metadata: this.metadata,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.getDuration()
    };
  }
}

/**
 * OrchestrationEngine - Main orchestration engine
 */
class OrchestrationEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.patterns = new Map();
    this.skills = new Map();
    this.activeContexts = new Map();
    this.config = {
      maxConcurrent: options.maxConcurrent || 5,
      timeout: options.timeout || 300000, // 5 minutes default
      retryCount: options.retryCount || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };
    this.skillResolver = options.skillResolver || null;
    this.humanGate = options.humanGate || null;
  }

  /**
   * Register an orchestration pattern
   * @param {string} name - Pattern name
   * @param {object} pattern - Pattern implementation
   */
  registerPattern(name, pattern) {
    if (!pattern || typeof pattern.execute !== 'function') {
      throw new Error(`Pattern '${name}' must have an execute method`);
    }
    this.patterns.set(name, pattern);
    this.emit('patternRegistered', { name, pattern });
    return this;
  }

  /**
   * Get a registered pattern
   * @param {string} name - Pattern name
   * @returns {object|null} Pattern implementation
   */
  getPattern(name) {
    return this.patterns.get(name) || null;
  }

  /**
   * List all registered patterns
   * @returns {string[]} Pattern names
   */
  listPatterns() {
    return Array.from(this.patterns.keys());
  }

  /**
   * Register a skill for orchestration
   * @param {string} name - Skill name
   * @param {object} skill - Skill definition
   */
  registerSkill(name, skill) {
    if (!skill) {
      throw new Error(`Skill '${name}' cannot be null`);
    }
    this.skills.set(name, skill);
    this.emit('skillRegistered', { name, skill });
    return this;
  }

  /**
   * Get a registered skill
   * @param {string} name - Skill name
   * @returns {object|null} Skill definition
   */
  getSkill(name) {
    return this.skills.get(name) || null;
  }

  /**
   * List all registered skills
   * @returns {string[]} Skill names
   */
  listSkills() {
    return Array.from(this.skills.keys());
  }

  /**
   * Execute a task using the specified pattern
   * @param {string} patternName - Pattern to use
   * @param {object} options - Execution options
   * @returns {Promise<ExecutionContext>} Execution result
   */
  async execute(patternName, options = {}) {
    const pattern = this.patterns.get(patternName);
    if (!pattern) {
      throw new Error(`Unknown pattern: ${patternName}`);
    }

    const context = new ExecutionContext({
      task: options.task || '',
      priority: options.priority,
      skill: options.skill,
      input: options.input || {},
      metadata: {
        pattern: patternName,
        ...options.metadata
      }
    });

    this.activeContexts.set(context.id, context);
    this.emit('executionStarted', context);

    try {
      context.start();
      
      const result = await this._executeWithTimeout(
        () => pattern.execute(context, this),
        this.config.timeout
      );
      
      context.complete(result);
      this.emit('executionCompleted', context);
    } catch (error) {
      context.fail(error);
      this.emit('executionFailed', { context, error });
    } finally {
      this.activeContexts.delete(context.id);
    }

    return context;
  }

  /**
   * Execute with timeout
   * @private
   */
  async _executeWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeout}ms`));
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
   * Execute a skill directly
   * @param {string} skillName - Skill to execute
   * @param {object} input - Skill input
   * @param {ExecutionContext} parentContext - Parent context
   * @returns {Promise<any>} Skill output
   */
  async executeSkill(skillName, input, parentContext = null) {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error(`Unknown skill: ${skillName}`);
    }

    const context = new ExecutionContext({
      task: `Execute skill: ${skillName}`,
      skill: skillName,
      input,
      parentId: parentContext?.id,
      metadata: { directExecution: true }
    });

    if (parentContext) {
      parentContext.children.push(context);
    }

    this.emit('skillExecutionStarted', { skillName, context });

    try {
      context.start();
      
      let result;
      if (typeof skill.execute === 'function') {
        result = await skill.execute(input, this);
      } else if (typeof skill === 'function') {
        result = await skill(input, this);
      } else {
        throw new Error(`Skill '${skillName}' is not executable`);
      }
      
      context.complete(result);
      this.emit('skillExecutionCompleted', { skillName, context });
      return result;
    } catch (error) {
      context.fail(error);
      this.emit('skillExecutionFailed', { skillName, context, error });
      throw error;
    }
  }

  /**
   * Resolve the best skill for a task
   * @param {string} task - Task description
   * @returns {Promise<string|null>} Skill name
   */
  async resolveSkill(task) {
    if (this.skillResolver) {
      return this.skillResolver.resolve(task, this.listSkills());
    }
    
    // Default: return first matching skill based on keywords
    const taskLower = task.toLowerCase();
    for (const [name, skill] of this.skills) {
      const keywords = skill.keywords || [name];
      if (keywords.some(k => taskLower.includes(k.toLowerCase()))) {
        return name;
      }
    }
    
    return null;
  }

  /**
   * Request human validation
   * @param {ExecutionContext} context - Current context
   * @param {string} question - Question for human
   * @returns {Promise<any>} Human response
   */
  async requestHumanValidation(context, question) {
    context.waitForHuman();
    this.emit('humanValidationRequested', { context, question });
    
    if (this.humanGate) {
      return this.humanGate.request(question, context);
    }
    
    // Default: auto-approve
    return { approved: true, feedback: 'Auto-approved (no human gate configured)' };
  }

  /**
   * Get execution status
   * @returns {object} Status summary
   */
  getStatus() {
    const contexts = Array.from(this.activeContexts.values());
    return {
      activeExecutions: contexts.length,
      patterns: this.listPatterns(),
      skills: this.listSkills(),
      contexts: contexts.map(c => c.toJSON())
    };
  }

  /**
   * Cancel an execution
   * @param {string} contextId - Context ID to cancel
   */
  cancel(contextId) {
    const context = this.activeContexts.get(contextId);
    if (context) {
      context.cancel();
      this.activeContexts.delete(contextId);
      this.emit('executionCancelled', context);
    }
  }

  /**
   * Cancel all active executions
   */
  cancelAll() {
    for (const [_id, context] of this.activeContexts) {
      context.cancel();
      this.emit('executionCancelled', context);
    }
    this.activeContexts.clear();
  }
}

module.exports = {
  OrchestrationEngine,
  ExecutionContext,
  PatternType,
  ExecutionStatus,
  Priority
};
