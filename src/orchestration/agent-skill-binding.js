/**
 * Agent-Skill Binding - Dynamic capability-based skill assignment
 * Sprint 3.3: Skill System Architecture
 * 
 * Features:
 * - Agent capability scoring
 * - Dynamic skill-agent matching
 * - Permission-based access control
 * - Skill affinity management
 * - Load balancing
 */

const EventEmitter = require('events');

/**
 * Agent status
 */
const AgentStatus = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance'
};

/**
 * Agent definition
 */
class AgentDefinition {
  constructor(options = {}) {
    this.id = options.id || '';
    this.name = options.name || '';
    this.description = options.description || '';
    this.capabilities = options.capabilities || [];
    this.permissions = options.permissions || [];
    this.maxConcurrentTasks = options.maxConcurrentTasks || 5;
    this.priority = options.priority || 'normal';
    this.tags = options.tags || [];
    this.metadata = options.metadata || {};
  }

  validate() {
    const errors = [];
    
    if (!this.id) {
      errors.push('Agent ID is required');
    }
    
    if (!this.name) {
      errors.push('Agent name is required');
    }
    
    if (!Array.isArray(this.capabilities)) {
      errors.push('Capabilities must be an array');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      capabilities: this.capabilities,
      permissions: this.permissions,
      maxConcurrentTasks: this.maxConcurrentTasks,
      priority: this.priority,
      tags: this.tags,
      metadata: this.metadata
    };
  }
}

/**
 * Binding record
 */
class BindingRecord {
  constructor(agentId, skillId, options = {}) {
    this.agentId = agentId;
    this.skillId = skillId;
    this.score = options.score || 0;
    this.affinity = options.affinity || 0;
    this.executionCount = options.executionCount || 0;
    this.successRate = options.successRate || 1.0;
    this.averageExecutionTime = options.averageExecutionTime || 0;
    this.lastExecutedAt = options.lastExecutedAt || null;
    this.createdAt = new Date().toISOString();
  }

  updateStats(success, executionTime) {
    this.executionCount++;
    const successWeight = success ? 1 : 0;
    this.successRate = (
      (this.successRate * (this.executionCount - 1) + successWeight) / 
      this.executionCount
    );
    this.averageExecutionTime = (
      (this.averageExecutionTime * (this.executionCount - 1) + executionTime) / 
      this.executionCount
    );
    this.lastExecutedAt = new Date().toISOString();
    
    // Update affinity based on performance
    this.affinity = this._calculateAffinity();
  }

  _calculateAffinity() {
    // Affinity increases with success rate and execution count
    const successFactor = this.successRate * 50;
    const experienceFactor = Math.min(this.executionCount / 10, 30);
    const recencyFactor = this.lastExecutedAt 
      ? Math.max(0, 20 - (Date.now() - new Date(this.lastExecutedAt).getTime()) / 86400000)
      : 0;
    
    return Math.round(successFactor + experienceFactor + recencyFactor);
  }

  toJSON() {
    return {
      agentId: this.agentId,
      skillId: this.skillId,
      score: this.score,
      affinity: this.affinity,
      executionCount: this.executionCount,
      successRate: this.successRate,
      averageExecutionTime: this.averageExecutionTime,
      lastExecutedAt: this.lastExecutedAt
    };
  }
}

/**
 * Capability matcher
 */
class CapabilityMatcher {
  constructor() {
    this.capabilityWeights = new Map();
    this.synonyms = new Map();
  }

  /**
   * Set weight for a capability (higher = more important)
   */
  setWeight(capability, weight) {
    this.capabilityWeights.set(capability, weight);
  }

  /**
   * Add synonym mapping
   */
  addSynonym(capability, synonym) {
    if (!this.synonyms.has(capability)) {
      this.synonyms.set(capability, new Set());
    }
    this.synonyms.get(capability).add(synonym);
  }

  /**
   * Calculate match score between agent capabilities and skill requirements
   */
  calculateScore(agentCapabilities, skillRequirements) {
    if (!skillRequirements || skillRequirements.length === 0) {
      return 100; // No requirements = full match
    }

    let totalWeight = 0;
    let matchedWeight = 0;

    for (const req of skillRequirements) {
      const weight = this.capabilityWeights.get(req) || 1;
      totalWeight += weight;

      if (this._hasCapability(agentCapabilities, req)) {
        matchedWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;
  }

  /**
   * Check if agent has capability (including synonyms)
   */
  _hasCapability(agentCapabilities, required) {
    if (agentCapabilities.includes(required)) {
      return true;
    }

    // Check synonyms
    for (const [cap, syns] of this.synonyms) {
      if (cap === required && agentCapabilities.some(ac => syns.has(ac))) {
        return true;
      }
      if (syns.has(required) && agentCapabilities.includes(cap)) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Main Agent-Skill Binding class
 */
class AgentSkillBinding extends EventEmitter {
  constructor(skillRegistry, options = {}) {
    super();
    this.skillRegistry = skillRegistry;
    this.agents = new Map();
    this.agentStatus = new Map();
    this.agentLoad = new Map();
    this.bindings = new Map(); // Map<agentId, Map<skillId, BindingRecord>>
    this.matcher = new CapabilityMatcher();
    
    // Options
    this.options = {
      autoBinding: options.autoBinding !== false,
      minMatchScore: options.minMatchScore || 50,
      enableLoadBalancing: options.enableLoadBalancing !== false,
      affinityWeight: options.affinityWeight || 0.3
    };

    // Listen to skill registry events
    if (this.skillRegistry) {
      this.skillRegistry.on('skill-registered', ({ skillId }) => {
        if (this.options.autoBinding) {
          this._autoBindSkill(skillId);
        }
      });
    }
  }

  /**
   * Register an agent
   */
  registerAgent(agentDef) {
    const agent = agentDef instanceof AgentDefinition 
      ? agentDef 
      : new AgentDefinition(agentDef);

    const validation = agent.validate();
    if (!validation.valid) {
      throw new Error(`Invalid agent: ${validation.errors.join(', ')}`);
    }

    if (this.agents.has(agent.id)) {
      throw new Error(`Agent '${agent.id}' already exists`);
    }

    this.agents.set(agent.id, agent);
    this.agentStatus.set(agent.id, AgentStatus.AVAILABLE);
    this.agentLoad.set(agent.id, 0);
    this.bindings.set(agent.id, new Map());

    // Auto-bind existing skills
    if (this.options.autoBinding && this.skillRegistry) {
      this._autoBindAgent(agent.id);
    }

    this.emit('agent-registered', { agentId: agent.id, agent });
    
    return agent;
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId) {
    if (!this.agents.has(agentId)) {
      return false;
    }

    this.agents.delete(agentId);
    this.agentStatus.delete(agentId);
    this.agentLoad.delete(agentId);
    this.bindings.delete(agentId);

    this.emit('agent-unregistered', { agentId });
    
    return true;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId) || null;
  }

  /**
   * Get all agents
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Update agent status
   */
  setAgentStatus(agentId, status) {
    if (!this.agents.has(agentId)) {
      return false;
    }

    const previousStatus = this.agentStatus.get(agentId);
    this.agentStatus.set(agentId, status);

    if (previousStatus !== status) {
      this.emit('agent-status-changed', { agentId, previousStatus, newStatus: status });
    }

    return true;
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentId) {
    return this.agentStatus.get(agentId) || null;
  }

  /**
   * Get available agents
   */
  getAvailableAgents() {
    return this.getAllAgents().filter(
      agent => this.agentStatus.get(agent.id) === AgentStatus.AVAILABLE
    );
  }

  /**
   * Create manual binding
   */
  bind(agentId, skillId, options = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`);
    }

    const skill = this.skillRegistry?.getSkill(skillId);
    if (!skill) {
      throw new Error(`Skill '${skillId}' not found`);
    }

    // Check permissions
    if (skill.permissions && skill.permissions.length > 0) {
      const hasPermission = skill.permissions.every(
        p => agent.permissions.includes(p)
      );
      if (!hasPermission) {
        throw new Error(`Agent '${agentId}' lacks required permissions for skill '${skillId}'`);
      }
    }

    // Calculate score
    const score = options.score || this.matcher.calculateScore(
      agent.capabilities,
      skill.tags // Use tags as capability requirements
    );

    const record = new BindingRecord(agentId, skillId, { score });
    this.bindings.get(agentId).set(skillId, record);

    this.emit('skill-bound', { agentId, skillId, score });

    return record;
  }

  /**
   * Remove binding
   */
  unbind(agentId, skillId) {
    const agentBindings = this.bindings.get(agentId);
    if (!agentBindings) {
      return false;
    }

    const removed = agentBindings.delete(skillId);
    if (removed) {
      this.emit('skill-unbound', { agentId, skillId });
    }

    return removed;
  }

  /**
   * Get binding
   */
  getBinding(agentId, skillId) {
    return this.bindings.get(agentId)?.get(skillId) || null;
  }

  /**
   * Get all bindings for an agent
   */
  getAgentBindings(agentId) {
    const bindings = this.bindings.get(agentId);
    return bindings ? Array.from(bindings.values()) : [];
  }

  /**
   * Find best agent for a skill
   */
  findBestAgentForSkill(skillId, _options = {}) {
    const skill = this.skillRegistry?.getSkill(skillId);
    if (!skill) {
      return null;
    }

    const candidates = [];

    for (const [agentId, agent] of this.agents) {
      // Check availability
      if (this.agentStatus.get(agentId) !== AgentStatus.AVAILABLE) {
        continue;
      }

      // Check load
      const load = this.agentLoad.get(agentId) || 0;
      if (load >= agent.maxConcurrentTasks) {
        continue;
      }

      // Check permissions
      if (skill.permissions && skill.permissions.length > 0) {
        const hasPermission = skill.permissions.every(
          p => agent.permissions.includes(p)
        );
        if (!hasPermission) {
          continue;
        }
      }

      // Get or calculate binding score
      let binding = this.bindings.get(agentId)?.get(skillId);
      if (!binding) {
        const score = this.matcher.calculateScore(agent.capabilities, skill.tags);
        if (score >= this.options.minMatchScore) {
          binding = new BindingRecord(agentId, skillId, { score });
        }
      }

      if (binding && binding.score >= this.options.minMatchScore) {
        // Calculate final score with affinity and load
        const loadPenalty = (load / agent.maxConcurrentTasks) * 20;
        const affinityBonus = binding.affinity * this.options.affinityWeight;
        const finalScore = binding.score + affinityBonus - loadPenalty;

        candidates.push({
          agent,
          binding,
          finalScore,
          load
        });
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by final score (descending)
    candidates.sort((a, b) => b.finalScore - a.finalScore);

    return candidates[0];
  }

  /**
   * Find all capable agents for a skill
   */
  findCapableAgents(skillId) {
    const skill = this.skillRegistry?.getSkill(skillId);
    if (!skill) {
      return [];
    }

    const capable = [];

    for (const [agentId, agent] of this.agents) {
      const score = this.matcher.calculateScore(agent.capabilities, skill.tags);
      if (score >= this.options.minMatchScore) {
        capable.push({
          agent,
          score,
          status: this.agentStatus.get(agentId),
          load: this.agentLoad.get(agentId) || 0
        });
      }
    }

    return capable.sort((a, b) => b.score - a.score);
  }

  /**
   * Acquire agent for task
   */
  acquireAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    const load = this.agentLoad.get(agentId) || 0;
    if (load >= agent.maxConcurrentTasks) {
      return false;
    }

    this.agentLoad.set(agentId, load + 1);

    if (load + 1 >= agent.maxConcurrentTasks) {
      this.setAgentStatus(agentId, AgentStatus.BUSY);
    }

    this.emit('agent-acquired', { agentId, currentLoad: load + 1 });
    
    return true;
  }

  /**
   * Release agent from task
   */
  releaseAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    const load = this.agentLoad.get(agentId) || 0;
    if (load <= 0) {
      return false;
    }

    this.agentLoad.set(agentId, load - 1);

    if (this.agentStatus.get(agentId) === AgentStatus.BUSY && load - 1 < agent.maxConcurrentTasks) {
      this.setAgentStatus(agentId, AgentStatus.AVAILABLE);
    }

    this.emit('agent-released', { agentId, currentLoad: load - 1 });
    
    return true;
  }

  /**
   * Record execution result
   */
  recordExecution(agentId, skillId, success, executionTime) {
    const binding = this.getBinding(agentId, skillId);
    if (binding) {
      binding.updateStats(success, executionTime);
      this.emit('execution-recorded', { agentId, skillId, success, executionTime });
    }
  }

  /**
   * Get agent load
   */
  getAgentLoad(agentId) {
    return this.agentLoad.get(agentId) || 0;
  }

  /**
   * Get capability matcher
   */
  getMatcher() {
    return this.matcher;
  }

  /**
   * Get summary
   */
  getSummary() {
    const statusCounts = {
      [AgentStatus.AVAILABLE]: 0,
      [AgentStatus.BUSY]: 0,
      [AgentStatus.OFFLINE]: 0,
      [AgentStatus.MAINTENANCE]: 0
    };

    let totalBindings = 0;
    let totalLoad = 0;

    for (const [agentId, status] of this.agentStatus) {
      statusCounts[status]++;
      totalBindings += (this.bindings.get(agentId)?.size || 0);
      totalLoad += (this.agentLoad.get(agentId) || 0);
    }

    return {
      totalAgents: this.agents.size,
      statusCounts,
      totalBindings,
      totalLoad,
      averageLoad: this.agents.size > 0 ? totalLoad / this.agents.size : 0
    };
  }

  /**
   * Clear all
   */
  clear() {
    this.agents.clear();
    this.agentStatus.clear();
    this.agentLoad.clear();
    this.bindings.clear();
    this.emit('cleared');
  }

  // Private methods

  _autoBindAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent || !this.skillRegistry) return;

    const skills = this.skillRegistry.getAllSkills();
    for (const skill of skills) {
      try {
        const score = this.matcher.calculateScore(agent.capabilities, skill.tags);
        if (score >= this.options.minMatchScore) {
          this.bind(agentId, skill.id, { score });
        }
      } catch (e) {
        // Ignore binding errors during auto-bind
      }
    }
  }

  _autoBindSkill(skillId) {
    const skill = this.skillRegistry?.getSkill(skillId);
    if (!skill) return;

    for (const [agentId, agent] of this.agents) {
      try {
        const score = this.matcher.calculateScore(agent.capabilities, skill.tags);
        if (score >= this.options.minMatchScore) {
          this.bind(agentId, skillId, { score });
        }
      } catch (e) {
        // Ignore binding errors during auto-bind
      }
    }
  }
}

module.exports = {
  AgentSkillBinding,
  AgentDefinition,
  BindingRecord,
  CapabilityMatcher,
  AgentStatus
};
