/**
 * HandoffPattern - Agent delegation pattern
 * 
 * Enables conversation control transfer between agents.
 * Implements OpenAI Agents SDK-style handoff mechanism for MUSUBI.
 * 
 * @module orchestration/patterns/handoff
 * @version 1.0.0
 */

const { BasePattern } = require('../pattern-registry');
const { PatternType, ExecutionContext, _ExecutionStatus } = require('../orchestration-engine');

/**
 * Extended PatternType with HANDOFF
 */
const HandoffPatternType = {
  ...PatternType,
  HANDOFF: 'handoff',
  TRIAGE: 'triage'
};

/**
 * Handoff strategy options
 */
const HandoffStrategy = {
  FIRST_MATCH: 'first-match',     // Use first matching agent
  BEST_MATCH: 'best-match',       // Use best scoring agent
  ROUND_ROBIN: 'round-robin',     // Rotate through agents
  WEIGHTED: 'weighted'            // Use weighted selection
};

/**
 * Input filter presets for handoff
 */
const HandoffFilters = {
  /**
   * Remove all tool calls from history
   */
  removeAllTools: (history) => {
    return history.filter(msg => msg.type !== 'tool_call' && msg.type !== 'tool_result');
  },

  /**
   * Remove tool results only (keep calls)
   */
  removeToolResults: (history) => {
    return history.filter(msg => msg.type !== 'tool_result');
  },

  /**
   * Keep only user messages
   */
  userMessagesOnly: (history) => {
    return history.filter(msg => msg.role === 'user');
  },

  /**
   * Keep last N messages
   */
  lastN: (n) => (history) => {
    return history.slice(-n);
  },

  /**
   * Keep everything (no filter)
   */
  keepAll: (history) => history,

  /**
   * Summarize history to single message
   */
  summarize: (history) => {
    if (history.length === 0) return [];
    const summary = history.map(msg => 
      `[${msg.role || msg.type}]: ${msg.content?.substring(0, 100) || '...'}`
    ).join('\n');
    return [{
      role: 'system',
      content: `Previous conversation summary:\n${summary}`
    }];
  }
};

/**
 * Escalation data for handoff
 */
class EscalationData {
  constructor(options = {}) {
    this.reason = options.reason || '';
    this.priority = options.priority || 'normal';
    this.sourceAgent = options.sourceAgent || null;
    this.context = options.context || {};
    this.timestamp = new Date();
    this.metadata = options.metadata || {};
  }

  toJSON() {
    return {
      reason: this.reason,
      priority: this.priority,
      sourceAgent: this.sourceAgent,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata
    };
  }
}

/**
 * Handoff configuration
 */
class HandoffConfig {
  constructor(options = {}) {
    this.agent = options.agent;                    // Target agent
    this.toolNameOverride = options.toolNameOverride || null;
    this.inputType = options.inputType || EscalationData;
    this.inputFilter = options.inputFilter || HandoffFilters.keepAll;
    this.onHandoff = options.onHandoff || null;    // Callback when handoff occurs
    this.condition = options.condition || null;    // Condition function
    this.priority = options.priority || 0;         // Selection priority
  }
}

/**
 * Create a handoff configuration
 * @param {object|Agent} agentOrOptions - Agent or full options
 * @returns {HandoffConfig} Handoff configuration
 */
function handoff(agentOrOptions) {
  if (agentOrOptions.execute || agentOrOptions.name) {
    // Simple agent reference
    return new HandoffConfig({ agent: agentOrOptions });
  }
  return new HandoffConfig(agentOrOptions);
}

/**
 * HandoffPattern - Agent delegation execution pattern
 */
class HandoffPattern extends BasePattern {
  constructor(options = {}) {
    super({
      name: HandoffPatternType.HANDOFF,
      type: HandoffPatternType.HANDOFF,
      description: 'Transfer conversation control between agents with context preservation',
      version: '1.0.0',
      tags: ['delegation', 'handoff', 'transfer', 'escalation', 'multi-agent'],
      useCases: [
        'Agent specialization delegation',
        'Escalation workflows',
        'Customer service routing',
        'Multi-expert consultation',
        'Fallback handling'
      ],
      complexity: 'medium',
      supportsParallel: false,
      supportsReplanning: true,
      requiresHuman: false
    });

    this.options = {
      strategy: options.strategy || HandoffStrategy.FIRST_MATCH,
      timeout: options.timeout || 30000,
      maxHandoffs: options.maxHandoffs || 10, // Prevent infinite loops
      preserveHistory: options.preserveHistory !== false,
      inputFilter: options.inputFilter || HandoffFilters.keepAll,
      onHandoff: options.onHandoff || null,
      onHandoffComplete: options.onHandoffComplete || null,
      ...options
    };

    // Track handoff chain
    this.handoffChain = [];
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

    // Check for source agent
    if (!input.sourceAgent) {
      errors.push('Handoff pattern requires input.sourceAgent');
    }

    // Check for target agents
    if (!input.targetAgents || !Array.isArray(input.targetAgents)) {
      errors.push('Handoff pattern requires input.targetAgents array');
    } else if (input.targetAgents.length === 0) {
      errors.push('Handoff pattern requires at least one target agent');
    } else {
      // Validate each target agent
      for (let i = 0; i < input.targetAgents.length; i++) {
        const target = input.targetAgents[i];
        const agent = target.agent || target;
        
        // Check if agent is a HandoffConfig or direct agent
        if (!agent) {
          errors.push(`Target agent ${i} is invalid`);
        } else if (typeof agent === 'string' && !engine.getSkill(agent)) {
          errors.push(`Unknown agent/skill: ${agent}`);
        }
      }
    }

    // Check for handoff loop prevention
    if (this.handoffChain.length >= this.options.maxHandoffs) {
      errors.push(`Maximum handoff limit (${this.options.maxHandoffs}) reached`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute handoff pattern
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {Promise<object>} Execution result
   */
  async execute(context, engine) {
    const validation = this.validate(context, engine);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const {
      sourceAgent,
      targetAgents,
      message,
      history = [],
      escalationData = null,
      sharedContext = {}
    } = context.input;

    const startTime = Date.now();

    // Emit handoff started event
    engine.emit('handoff:started', {
      context,
      sourceAgent: this._getAgentName(sourceAgent),
      targetAgents: targetAgents.map(t => this._getAgentName(t.agent || t)),
      escalationData
    });

    try {
      // Step 1: Select target agent
      engine.emit('handoff:selecting', {
        context,
        strategy: this.options.strategy,
        candidates: targetAgents.length
      });

      const selectedTarget = await this.selectTargetAgent(
        context,
        targetAgents,
        engine
      );

      if (!selectedTarget) {
        throw new Error('No suitable target agent found for handoff');
      }

      const selectedConfig = selectedTarget instanceof HandoffConfig 
        ? selectedTarget 
        : new HandoffConfig({ agent: selectedTarget });

      // Step 2: Apply input filter to history
      const inputFilter = selectedConfig.inputFilter || this.options.inputFilter;
      const filteredHistory = inputFilter(history);

      // Step 3: Create escalation data if not provided
      const escalation = escalationData || new EscalationData({
        reason: context.input.reason || 'Agent handoff',
        sourceAgent: this._getAgentName(sourceAgent),
        context: sharedContext
      });

      // Step 4: Execute onHandoff callback if provided
      if (selectedConfig.onHandoff) {
        await selectedConfig.onHandoff(context, escalation);
      }
      if (this.options.onHandoff) {
        await this.options.onHandoff(context, escalation, selectedConfig.agent);
      }

      // Step 5: Record handoff in chain
      this.handoffChain.push({
        from: this._getAgentName(sourceAgent),
        to: this._getAgentName(selectedConfig.agent),
        reason: escalation.reason,
        timestamp: new Date()
      });

      // Step 6: Perform handoff (execute target agent)
      const result = await this.performHandoff(
        sourceAgent,
        selectedConfig.agent,
        {
          message,
          history: filteredHistory,
          escalation,
          sharedContext
        },
        context,
        engine
      );

      // Step 7: Execute onHandoffComplete callback
      if (this.options.onHandoffComplete) {
        await this.options.onHandoffComplete(context, result, selectedConfig.agent);
      }

      const endTime = Date.now();

      // Emit handoff completed event
      engine.emit('handoff:completed', {
        context,
        sourceAgent: this._getAgentName(sourceAgent),
        targetAgent: this._getAgentName(selectedConfig.agent),
        result,
        duration: endTime - startTime,
        handoffChain: this.handoffChain
      });

      return {
        success: true,
        sourceAgent: this._getAgentName(sourceAgent),
        targetAgent: this._getAgentName(selectedConfig.agent),
        result,
        handoffChain: [...this.handoffChain],
        duration: endTime - startTime
      };

    } catch (error) {
      engine.emit('handoff:failed', {
        context,
        sourceAgent: this._getAgentName(sourceAgent),
        error: error.message,
        handoffChain: this.handoffChain
      });

      throw error;
    }
  }

  /**
   * Select target agent based on strategy
   * @param {ExecutionContext} context - Execution context
   * @param {Array} targetAgents - Available target agents
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {Promise<HandoffConfig|Agent>} Selected agent
   */
  async selectTargetAgent(context, targetAgents, engine) {
    const { _message, _history, _sharedContext } = context.input;

    switch (this.options.strategy) {
      case HandoffStrategy.FIRST_MATCH:
        return this._selectFirstMatch(targetAgents, context);

      case HandoffStrategy.BEST_MATCH:
        return this._selectBestMatch(targetAgents, context, engine);

      case HandoffStrategy.ROUND_ROBIN:
        return this._selectRoundRobin(targetAgents);

      case HandoffStrategy.WEIGHTED:
        return this._selectWeighted(targetAgents);

      default:
        return targetAgents[0];
    }
  }

  /**
   * Select first matching agent
   */
  async _selectFirstMatch(targetAgents, context) {
    for (const target of targetAgents) {
      const config = target instanceof HandoffConfig ? target : new HandoffConfig({ agent: target });
      
      if (config.condition) {
        const matches = await config.condition(context);
        if (matches) return config;
      } else {
        return config;
      }
    }
    return null;
  }

  /**
   * Select best matching agent based on scoring
   */
  async _selectBestMatch(targetAgents, context, _engine) {
    let bestScore = -1;
    let bestTarget = null;

    for (const target of targetAgents) {
      const config = target instanceof HandoffConfig ? target : new HandoffConfig({ agent: target });
      
      let score = config.priority || 0;

      // If condition function exists, use it for scoring
      if (config.condition) {
        const conditionResult = await config.condition(context);
        if (typeof conditionResult === 'number') {
          score = conditionResult;
        } else if (conditionResult === true) {
          score += 10;
        } else if (conditionResult === false) {
          continue;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestTarget = config;
      }
    }

    return bestTarget;
  }

  /**
   * Select agent using round-robin
   */
  _selectRoundRobin(targetAgents) {
    const index = this.handoffChain.length % targetAgents.length;
    const target = targetAgents[index];
    return target instanceof HandoffConfig ? target : new HandoffConfig({ agent: target });
  }

  /**
   * Select agent using weighted random selection
   */
  _selectWeighted(targetAgents) {
    const weights = targetAgents.map(t => {
      const config = t instanceof HandoffConfig ? t : new HandoffConfig({ agent: t });
      return config.priority || 1;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < targetAgents.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        const target = targetAgents[i];
        return target instanceof HandoffConfig ? target : new HandoffConfig({ agent: target });
      }
    }

    return targetAgents[0];
  }

  /**
   * Perform the actual handoff to target agent
   * @param {Agent|string} source - Source agent
   * @param {Agent|string} target - Target agent
   * @param {object} handoffData - Data to pass to target
   * @param {ExecutionContext} parentContext - Parent context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {Promise<object>} Execution result
   */
  async performHandoff(source, target, handoffData, parentContext, engine) {
    const targetName = this._getAgentName(target);
    
    // Create child context for target execution
    const childContext = new ExecutionContext({
      parentId: parentContext.id,
      task: `Handoff from ${this._getAgentName(source)} to ${targetName}`,
      skill: targetName,
      input: {
        message: handoffData.message,
        history: handoffData.history,
        escalation: handoffData.escalation?.toJSON?.() || handoffData.escalation,
        sharedContext: handoffData.sharedContext,
        isHandoff: true,
        sourceAgent: this._getAgentName(source)
      },
      metadata: {
        handoffChain: this.handoffChain,
        handoffDepth: this.handoffChain.length
      }
    });

    parentContext.children.push(childContext);

    // If target is an agent object with execute method
    if (typeof target === 'object' && typeof target.execute === 'function') {
      return await target.execute(childContext, engine);
    }

    // If target is a skill name
    if (typeof target === 'string' || typeof targetName === 'string') {
      const skill = engine.getSkill(targetName);
      if (skill) {
        return await engine.executeSkill(targetName, childContext);
      }
    }

    throw new Error(`Cannot execute target agent: ${targetName}`);
  }

  /**
   * Get agent name from various input types
   */
  _getAgentName(agent) {
    if (typeof agent === 'string') return agent;
    if (agent?.name) return agent.name;
    if (agent?.getName) return agent.getName();
    if (agent?.agent) return this._getAgentName(agent.agent);
    return 'unknown';
  }

  /**
   * Reset handoff chain (for new conversations)
   */
  resetChain() {
    this.handoffChain = [];
  }

  /**
   * Get current handoff chain
   */
  getHandoffChain() {
    return [...this.handoffChain];
  }
}

/**
 * Create a handoff pattern instance
 * @param {object} options - Pattern options
 * @returns {HandoffPattern} Handoff pattern instance
 */
function createHandoffPattern(options = {}) {
  return new HandoffPattern(options);
}

module.exports = {
  HandoffPattern,
  HandoffPatternType,
  HandoffStrategy,
  HandoffFilters,
  HandoffConfig,
  EscalationData,
  handoff,
  createHandoffPattern
};
