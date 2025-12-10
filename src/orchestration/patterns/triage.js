/**
 * TriagePattern - Request classification and routing pattern
 * 
 * Classifies incoming requests and routes them to specialized agents.
 * Implements intelligent routing based on intent detection and agent capabilities.
 * 
 * @module orchestration/patterns/triage
 * @version 1.0.0
 */

const { BasePattern } = require('../pattern-registry');
const { ExecutionContext, _ExecutionStatus } = require('../orchestration-engine');
const { 
  HandoffPattern, 
  HandoffPatternType, 
  HandoffConfig: _HandoffConfig, 
  EscalationData,
  handoff 
} = require('./handoff');

/**
 * Triage classification categories
 */
const TriageCategory = {
  BILLING: 'billing',
  SUPPORT: 'support',
  SALES: 'sales',
  TECHNICAL: 'technical',
  REFUND: 'refund',
  GENERAL: 'general',
  ESCALATION: 'escalation',
  UNKNOWN: 'unknown'
};

/**
 * Triage routing strategies
 */
const TriageStrategy = {
  KEYWORD: 'keyword',           // Keyword-based classification
  INTENT: 'intent',             // Intent detection
  CAPABILITY: 'capability',     // Match agent capabilities
  HYBRID: 'hybrid',             // Combine multiple strategies
  LLM: 'llm'                    // LLM-based classification
};

/**
 * Agent capability definition
 */
class AgentCapability {
  constructor(options = {}) {
    this.agent = options.agent;
    this.categories = options.categories || [];
    this.keywords = options.keywords || [];
    this.intents = options.intents || [];
    this.description = options.description || '';
    this.priority = options.priority || 0;
    this.maxConcurrent = options.maxConcurrent || 10;
    this.currentLoad = 0;
  }

  /**
   * Check if agent can handle given category
   */
  canHandle(category) {
    return this.categories.includes(category) || 
           this.categories.includes(TriageCategory.GENERAL);
  }

  /**
   * Check if agent matches any keywords
   */
  matchesKeywords(text) {
    const lowerText = text.toLowerCase();
    return this.keywords.some(kw => lowerText.includes(kw.toLowerCase()));
  }

  /**
   * Calculate match score for given input
   */
  calculateScore(input, category) {
    let score = 0;
    
    // Category match
    if (this.canHandle(category)) score += 10;
    
    // Keyword matches
    const keywordMatches = this.keywords.filter(kw => 
      input.toLowerCase().includes(kw.toLowerCase())
    ).length;
    score += keywordMatches * 2;
    
    // Priority bonus
    score += this.priority;
    
    // Load penalty (prefer less loaded agents)
    if (this.currentLoad >= this.maxConcurrent) {
      score -= 100; // Heavy penalty for overloaded agents
    } else {
      score -= (this.currentLoad / this.maxConcurrent) * 5;
    }
    
    return score;
  }

  toJSON() {
    return {
      agent: this.agent?.name || this.agent,
      categories: this.categories,
      keywords: this.keywords,
      intents: this.intents,
      description: this.description,
      priority: this.priority,
      maxConcurrent: this.maxConcurrent,
      currentLoad: this.currentLoad
    };
  }
}

/**
 * Triage classification result
 */
class TriageResult {
  constructor(options = {}) {
    this.category = options.category || TriageCategory.UNKNOWN;
    this.confidence = options.confidence || 0;
    this.keywords = options.keywords || [];
    this.intents = options.intents || [];
    this.selectedAgent = options.selectedAgent || null;
    this.alternativeAgents = options.alternativeAgents || [];
    this.reasoning = options.reasoning || '';
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      category: this.category,
      confidence: this.confidence,
      keywords: this.keywords,
      intents: this.intents,
      selectedAgent: this.selectedAgent?.name || this.selectedAgent,
      alternativeAgents: this.alternativeAgents.map(a => a.name || a),
      reasoning: this.reasoning,
      timestamp: this.timestamp.toISOString()
    };
  }
}

/**
 * Default keyword mappings for classification
 */
const DEFAULT_KEYWORD_MAPPINGS = {
  [TriageCategory.BILLING]: [
    'invoice', 'payment', 'charge', 'bill', 'subscription', 
    'pricing', 'cost', 'fee', 'receipt', 'transaction'
  ],
  [TriageCategory.REFUND]: [
    'refund', 'money back', 'return', 'cancel', 'cancelled',
    'reimbursement', 'credit', 'chargeback'
  ],
  [TriageCategory.SUPPORT]: [
    'help', 'issue', 'problem', 'not working', 'error', 'bug',
    'broken', 'fix', 'trouble', 'stuck', 'assistance'
  ],
  [TriageCategory.TECHNICAL]: [
    'api', 'code', 'integration', 'developer', 'sdk', 'documentation',
    'endpoint', 'authentication', 'token', 'webhook'
  ],
  [TriageCategory.SALES]: [
    'buy', 'purchase', 'pricing', 'plan', 'upgrade', 'enterprise',
    'demo', 'trial', 'quote', 'discount'
  ],
  [TriageCategory.ESCALATION]: [
    'manager', 'supervisor', 'escalate', 'complaint', 'urgent',
    'unacceptable', 'lawyer', 'legal', 'sue'
  ]
};

/**
 * TriagePattern - Request classification and agent routing
 */
class TriagePattern extends BasePattern {
  constructor(options = {}) {
    super({
      name: HandoffPatternType.TRIAGE,
      type: HandoffPatternType.TRIAGE,
      description: 'Classify incoming requests and route to specialized agents',
      version: '1.0.0',
      tags: ['triage', 'routing', 'classification', 'intent', 'multi-agent'],
      useCases: [
        'Customer service routing',
        'Intent-based agent selection',
        'Load-balanced request distribution',
        'Specialized agent dispatch',
        'Escalation handling'
      ],
      complexity: 'medium',
      supportsParallel: false,
      supportsReplanning: true,
      requiresHuman: false
    });

    this.options = {
      strategy: options.strategy || TriageStrategy.HYBRID,
      keywordMappings: options.keywordMappings || DEFAULT_KEYWORD_MAPPINGS,
      defaultCategory: options.defaultCategory || TriageCategory.GENERAL,
      confidenceThreshold: options.confidenceThreshold || 0.3,
      fallbackAgent: options.fallbackAgent || null,
      enableHandoff: options.enableHandoff !== false,
      maxRetries: options.maxRetries || 2,
      llmClassifier: options.llmClassifier || null, // Optional LLM for classification
      ...options
    };

    // Agent registry with capabilities
    this.agentRegistry = new Map();
    
    // Internal handoff pattern for delegation
    this.handoffPattern = new HandoffPattern({
      strategy: 'best-match',
      maxHandoffs: options.maxHandoffs || 5
    });

    // Classification history
    this.classificationHistory = [];
  }

  /**
   * Register an agent with its capabilities
   * @param {string|Agent} agent - Agent or agent name
   * @param {AgentCapability|object} capability - Agent capabilities
   * @returns {TriagePattern} This pattern for chaining
   */
  registerAgent(agent, capability) {
    const cap = capability instanceof AgentCapability 
      ? capability 
      : new AgentCapability({ agent, ...capability });
    
    const agentName = typeof agent === 'string' ? agent : agent.name;
    this.agentRegistry.set(agentName, cap);
    
    return this;
  }

  /**
   * Unregister an agent
   * @param {string|Agent} agent - Agent or agent name
   * @returns {boolean} True if agent was removed
   */
  unregisterAgent(agent) {
    const agentName = typeof agent === 'string' ? agent : agent.name;
    return this.agentRegistry.delete(agentName);
  }

  /**
   * Get all registered agents
   * @returns {Map} Agent registry
   */
  getRegisteredAgents() {
    return new Map(this.agentRegistry);
  }

  /**
   * Validate the execution context
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {object} Validation result
   */
  validate(context, _engine) {
    const errors = [];
    const input = context.input;

    // Check for message
    if (!input.message && !input.text && !input.query) {
      errors.push('Triage pattern requires input.message, input.text, or input.query');
    }

    // Check for registered agents or provided agents
    if (this.agentRegistry.size === 0 && !input.agents) {
      errors.push('Triage pattern requires registered agents or input.agents');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute triage pattern
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
      message,
      text,
      query,
      history = [],
      agents = [],
      sharedContext = {},
      enableHandoff
    } = context.input;

    // Override enableHandoff from input if provided
    const shouldHandoff = enableHandoff !== undefined 
      ? enableHandoff 
      : this.options.enableHandoff;

    // Auto-register agents from input if registry is empty
    if (this.agentRegistry.size === 0 && agents.length > 0) {
      for (const agent of agents) {
        this.registerAgent(agent, agent.capability);
      }
    }

    const inputText = message || text || query;
    const startTime = Date.now();

    // Emit triage started event
    engine.emit('triage:started', {
      context,
      inputText: inputText.substring(0, 100),
      strategy: this.options.strategy,
      registeredAgents: this.agentRegistry.size
    });

    try {
      // Step 1: Classify the request
      engine.emit('triage:classifying', {
        context,
        strategy: this.options.strategy
      });

      const classification = await this.classifyRequest(inputText, context);

      engine.emit('triage:classified', {
        context,
        classification: classification.toJSON()
      });

      // Step 2: Select best agent
      const selectedAgent = await this.selectAgent(
        classification,
        inputText,
        context,
        engine
      );

      if (!selectedAgent) {
        // Use fallback agent if available
        if (this.options.fallbackAgent) {
          classification.selectedAgent = this.options.fallbackAgent;
          classification.reasoning = 'Fallback agent selected - no suitable specialist found';
        } else {
          throw new Error('No suitable agent found for request classification');
        }
      } else {
        classification.selectedAgent = selectedAgent;
      }

      // Step 3: Record classification
      this.classificationHistory.push({
        timestamp: new Date(),
        input: inputText.substring(0, 200),
        classification: classification.toJSON()
      });

      // Step 4: Perform handoff if enabled
      let result;
      if (shouldHandoff && classification.selectedAgent) {
        engine.emit('triage:routing', {
          context,
          targetAgent: this._getAgentName(classification.selectedAgent)
        });

        result = await this.routeToAgent(
          classification,
          inputText,
          history,
          sharedContext,
          context,
          engine
        );
      } else {
        result = {
          action: 'classified',
          classification: classification.toJSON(),
          message: 'Request classified but handoff disabled'
        };
      }

      const endTime = Date.now();

      // Emit triage completed event
      engine.emit('triage:completed', {
        context,
        classification: classification.toJSON(),
        selectedAgent: this._getAgentName(classification.selectedAgent),
        duration: endTime - startTime
      });

      return {
        success: true,
        classification: classification.toJSON(),
        result,
        duration: endTime - startTime
      };

    } catch (error) {
      engine.emit('triage:failed', {
        context,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Classify the incoming request
   * @param {string} inputText - Input text to classify
   * @param {ExecutionContext} context - Execution context
   * @returns {Promise<TriageResult>} Classification result
   */
  async classifyRequest(inputText, context) {
    switch (this.options.strategy) {
      case TriageStrategy.KEYWORD:
        return this._classifyByKeyword(inputText);

      case TriageStrategy.INTENT:
        return this._classifyByIntent(inputText, context);

      case TriageStrategy.CAPABILITY:
        return this._classifyByCapability(inputText);

      case TriageStrategy.LLM:
        return await this._classifyByLLM(inputText, context);

      case TriageStrategy.HYBRID:
      default:
        return this._classifyHybrid(inputText, context);
    }
  }

  /**
   * Classify by keyword matching
   */
  _classifyByKeyword(inputText) {
    const lowerText = inputText.toLowerCase();
    const matches = {};
    const matchedKeywords = [];

    for (const [category, keywords] of Object.entries(this.options.keywordMappings)) {
      matches[category] = 0;
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matches[category]++;
          matchedKeywords.push({ category, keyword });
        }
      }
    }

    // Find best matching category
    let bestCategory = this.options.defaultCategory;
    let bestScore = 0;

    for (const [category, score] of Object.entries(matches)) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    // Calculate confidence based on keyword matches
    const _totalKeywords = Object.values(this.options.keywordMappings).flat().length;
    const confidence = Math.min(bestScore / 3, 1); // Max confidence after 3 matches

    return new TriageResult({
      category: bestCategory,
      confidence,
      keywords: matchedKeywords,
      reasoning: `Matched ${bestScore} keywords for category ${bestCategory}`
    });
  }

  /**
   * Classify by intent detection (simple pattern-based)
   */
  _classifyByIntent(inputText, _context) {
    const intents = [];
    const lowerText = inputText.toLowerCase();

    // Detect common intents
    if (lowerText.match(/\b(want|need|get|have)\s+(a\s+)?refund\b/)) {
      intents.push({ intent: 'request_refund', confidence: 0.9 });
    }
    if (lowerText.match(/\b(how|why|what|when|where)\b.*\?/)) {
      intents.push({ intent: 'ask_question', confidence: 0.7 });
    }
    if (lowerText.match(/\b(not\s+working|broken|error|issue|problem)\b/)) {
      intents.push({ intent: 'report_issue', confidence: 0.8 });
    }
    if (lowerText.match(/\b(buy|purchase|order|subscribe)\b/)) {
      intents.push({ intent: 'purchase', confidence: 0.85 });
    }
    if (lowerText.match(/\b(cancel|stop|end)\s+(my\s+)?(subscription|account|service)\b/)) {
      intents.push({ intent: 'cancel_subscription', confidence: 0.9 });
    }

    // Map intents to categories
    const intentToCategory = {
      'request_refund': TriageCategory.REFUND,
      'ask_question': TriageCategory.SUPPORT,
      'report_issue': TriageCategory.TECHNICAL,
      'purchase': TriageCategory.SALES,
      'cancel_subscription': TriageCategory.BILLING
    };

    if (intents.length > 0) {
      // Sort by confidence
      intents.sort((a, b) => b.confidence - a.confidence);
      const topIntent = intents[0];
      
      return new TriageResult({
        category: intentToCategory[topIntent.intent] || this.options.defaultCategory,
        confidence: topIntent.confidence,
        intents,
        reasoning: `Detected intent: ${topIntent.intent} with ${(topIntent.confidence * 100).toFixed(0)}% confidence`
      });
    }

    // Fall back to keyword classification
    return this._classifyByKeyword(inputText);
  }

  /**
   * Classify by matching against agent capabilities
   */
  _classifyByCapability(inputText) {
    let bestMatch = null;
    let bestScore = -1;

    for (const [_agentName, capability] of this.agentRegistry) {
      if (capability.matchesKeywords(inputText)) {
        const score = capability.calculateScore(inputText, null);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { agent: capability.agent, capability };
        }
      }
    }

    if (bestMatch) {
      const category = bestMatch.capability.categories[0] || this.options.defaultCategory;
      return new TriageResult({
        category,
        confidence: Math.min(bestScore / 20, 1),
        selectedAgent: bestMatch.agent,
        reasoning: `Best capability match: ${this._getAgentName(bestMatch.agent)} with score ${bestScore.toFixed(2)}`
      });
    }

    return new TriageResult({
      category: this.options.defaultCategory,
      confidence: 0,
      reasoning: 'No agent capability matches found'
    });
  }

  /**
   * Classify using LLM (if configured)
   */
  async _classifyByLLM(inputText, context) {
    if (!this.options.llmClassifier) {
      // Fall back to hybrid if no LLM configured
      return this._classifyHybrid(inputText, context);
    }

    try {
      const categories = Object.values(TriageCategory).join(', ');
      const prompt = `Classify the following customer request into one of these categories: ${categories}

Request: "${inputText}"

Respond with JSON: {"category": "<category>", "confidence": <0-1>, "reasoning": "<explanation>"}`;

      const response = await this.options.llmClassifier(prompt);
      const parsed = JSON.parse(response);

      return new TriageResult({
        category: parsed.category || this.options.defaultCategory,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'LLM classification'
      });
    } catch (error) {
      // Fall back to hybrid on LLM failure
      return this._classifyHybrid(inputText, context);
    }
  }

  /**
   * Hybrid classification combining multiple strategies
   */
  _classifyHybrid(inputText, context) {
    // Run keyword classification
    const keywordResult = this._classifyByKeyword(inputText);
    
    // Run intent classification
    const intentResult = this._classifyByIntent(inputText, context);
    
    // Run capability classification if agents registered
    const capabilityResult = this.agentRegistry.size > 0 
      ? this._classifyByCapability(inputText)
      : null;

    // Combine results with weighted voting
    const votes = {};
    
    // Keyword vote (weight: 1)
    votes[keywordResult.category] = (votes[keywordResult.category] || 0) + keywordResult.confidence;
    
    // Intent vote (weight: 1.5)
    votes[intentResult.category] = (votes[intentResult.category] || 0) + (intentResult.confidence * 1.5);
    
    // Capability vote (weight: 2) - more weight to direct agent matching
    if (capabilityResult && capabilityResult.category !== TriageCategory.UNKNOWN) {
      votes[capabilityResult.category] = (votes[capabilityResult.category] || 0) + (capabilityResult.confidence * 2);
    }

    // Find winning category
    let bestCategory = this.options.defaultCategory;
    let bestScore = 0;

    for (const [category, score] of Object.entries(votes)) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    // Normalize confidence
    const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
    const confidence = totalVotes > 0 ? bestScore / totalVotes : 0;

    return new TriageResult({
      category: bestCategory,
      confidence,
      keywords: keywordResult.keywords,
      intents: intentResult.intents,
      selectedAgent: capabilityResult?.selectedAgent,
      reasoning: `Hybrid classification: keyword=${keywordResult.category}, intent=${intentResult.category}, capability=${capabilityResult?.category || 'N/A'}`
    });
  }

  /**
   * Select the best agent for the classification
   * @param {TriageResult} classification - Classification result
   * @param {string} inputText - Original input text
   * @param {ExecutionContext} context - Execution context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {Promise<Agent|null>} Selected agent or null
   */
  async selectAgent(classification, inputText, _context, _engine) {
    // If classification already has selected agent, return it
    if (classification.selectedAgent) {
      return classification.selectedAgent;
    }

    const candidates = [];

    // Find agents that can handle this category
    for (const [_agentName, capability] of this.agentRegistry) {
      if (capability.canHandle(classification.category)) {
        const score = capability.calculateScore(inputText, classification.category);
        candidates.push({ agent: capability.agent, capability, score });
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Update classification with alternatives
    classification.alternativeAgents = candidates.slice(1).map(c => c.agent);

    return candidates[0].agent;
  }

  /**
   * Route request to selected agent via handoff
   * @param {TriageResult} classification - Classification result
   * @param {string} inputText - Original input text
   * @param {Array} history - Conversation history
   * @param {Object} sharedContext - Shared context
   * @param {ExecutionContext} parentContext - Parent context
   * @param {OrchestrationEngine} engine - Orchestration engine
   * @returns {Promise<object>} Handoff result
   */
  async routeToAgent(classification, inputText, history, sharedContext, parentContext, engine) {
    const escalation = new EscalationData({
      reason: `Triage: ${classification.category} (${(classification.confidence * 100).toFixed(0)}% confidence)`,
      priority: classification.confidence > 0.8 ? 'high' : 'normal',
      sourceAgent: 'triage-agent',
      context: {
        classification: classification.toJSON(),
        originalInput: inputText.substring(0, 500)
      }
    });

    // Create target agents list
    const targetAgents = [classification.selectedAgent];
    if (classification.alternativeAgents.length > 0) {
      targetAgents.push(...classification.alternativeAgents);
    }
    if (this.options.fallbackAgent) {
      targetAgents.push(this.options.fallbackAgent);
    }

    // Create handoff context
    const handoffContext = new ExecutionContext({
      parentId: parentContext.id,
      task: `Route ${classification.category} request to specialized agent`,
      input: {
        sourceAgent: 'triage-agent',
        targetAgents: targetAgents.map(agent => 
          handoff({
            agent,
            inputFilter: (h) => h // Keep all history for now
          })
        ),
        message: inputText,
        history,
        escalationData: escalation,
        sharedContext: {
          ...sharedContext,
          triageClassification: classification.toJSON()
        }
      },
      metadata: {
        triageCategory: classification.category,
        triageConfidence: classification.confidence
      }
    });

    parentContext.children.push(handoffContext);

    // Execute handoff
    return await this.handoffPattern.execute(handoffContext, engine);
  }

  /**
   * Get agent name from various input types
   */
  _getAgentName(agent) {
    if (typeof agent === 'string') return agent;
    if (agent?.name) return agent.name;
    if (agent?.getName) return agent.getName();
    return 'unknown';
  }

  /**
   * Get classification statistics
   */
  getStats() {
    const categoryStats = {};
    
    for (const record of this.classificationHistory) {
      const category = record.classification.category;
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    }

    return {
      totalClassifications: this.classificationHistory.length,
      registeredAgents: this.agentRegistry.size,
      categoryDistribution: categoryStats,
      averageConfidence: this.classificationHistory.length > 0
        ? this.classificationHistory.reduce((sum, r) => sum + r.classification.confidence, 0) / this.classificationHistory.length
        : 0
    };
  }

  /**
   * Clear classification history
  /**
   * Clear classification history
   */
  clearHistory() {
    this.classificationHistory = [];
  }
}

/**
 * Create a triage pattern instance
 * @param {object} options - Pattern options
 * @returns {TriagePattern} Triage pattern instance
 */
function createTriagePattern(options = {}) {
  return new TriagePattern(options);
}

module.exports = {
  TriagePattern,
  TriageCategory,
  TriageStrategy,
  AgentCapability,
  TriageResult,
  DEFAULT_KEYWORD_MAPPINGS,
  createTriagePattern
};
